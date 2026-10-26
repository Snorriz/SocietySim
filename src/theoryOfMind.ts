// ============================================================
// THEORY OF MIND MODULE
// Multi-level reasoning: "A thinks that B believes that C is untrustworthy"
// ============================================================

import { Agent, BeliefEntry } from './engine';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export interface MentalState {
  agentId: number;
  beliefs: Map<number, number>; // targetId -> trust level
  intentions: Map<number, string>; // targetId -> perceived intention
  knowledge: Set<string>; // what this agent knows
}

export interface ToMThought {
  level: number; // 0 = direct belief, 1 = "A thinks B thinks...", 2 = "A thinks B thinks C thinks..."
  subjectId: number; // who is thinking
  objectId: number; // who they're thinking about
  content: string; // the mental content
  confidence: number; // how confident in this inference
  timestamp: number;
}

export class TheoryOfMindEngine {
  mentalStates: Map<number, MentalState>;
  thoughtHistory: ToMThought[];
  maxThoughtHistory: number;

  constructor() {
    this.mentalStates = new Map();
    this.thoughtHistory = [];
    this.maxThoughtHistory = 100;
  }

  initializeMentalState(agentId: number): MentalState {
    const state: MentalState = {
      agentId,
      beliefs: new Map(),
      intentions: new Map(),
      knowledge: new Set(),
    };
    this.mentalStates.set(agentId, state);
    return state;
  }

  getMentalState(agentId: number): MentalState {
    if (!this.mentalStates.has(agentId)) {
      return this.initializeMentalState(agentId);
    }
    return this.mentalStates.get(agentId)!;
  }

  /**
   * Level 0: Direct belief about someone
   */
  getDirectBelief(agentId: number, targetId: number, agents: Agent[]): number {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return 0;
    return agent.getBeliefAbout(targetId).trust;
  }

  /**
   * Level 1: "What does A think B believes about C?"
   * A infers B's belief based on A's model of B's personality and observations
   */
  inferSecondOrderBelief(
    thinkerId: number,
    targetId: number,
    objectId: number,
    agents: Agent[],
    tick: number
  ): ToMThought | null {
    const thinker = agents.find(a => a.id === thinkerId);
    const target = agents.find(a => a.id === targetId);
    if (!thinker || !target) return null;

    // Thinker's openness affects ability to model others
    const opennessFactor = thinker.ocean.openness;
    
    // Thinker's belief about target's personality
    const targetBelief = thinker.getBeliefAbout(targetId);
    
    // Infer what target believes about object
    // Based on: target's actual beliefs + thinker's model of target's personality
    const actualBelief = target.getBeliefAbout(objectId).trust;
    
    // Personality-based adjustment
    // If target is neurotic, thinker assumes target has more extreme beliefs
    const neuroticismAdjustment = (targetBelief.perceivedNeuroticism - 0.5) * 0.3;
    
    // If target is agreeable, thinker assumes target has more positive beliefs
    const agreeablenessAdjustment = (targetBelief.perceivedAgreeableness - 0.5) * 0.2;
    
    const inferredBelief = clamp(
      actualBelief + neuroticismAdjustment + agreeablenessAdjustment,
      -1, 1
    );

    // Confidence based on thinker's openness and how well they know target
    const confidence = opennessFactor * 0.6 + Math.abs(targetBelief.trust) * 0.4;

    const thought: ToMThought = {
      level: 1,
      subjectId: thinkerId,
      objectId: targetId,
      content: `A${thinkerId} thinks A${targetId} believes A${objectId} has trust=${inferredBelief.toFixed(2)}`,
      confidence,
      timestamp: tick,
    };

    this.thoughtHistory.push(thought);
    if (this.thoughtHistory.length > this.maxThoughtHistory) {
      this.thoughtHistory.shift();
    }

    return thought;
  }

  /**
   * Level 2: "What does A think B thinks C believes about D?"
   * Recursive inference with exponential confidence decay
   */
  inferThirdOrderBelief(
    thinkerId: number,
    level1TargetId: number,
    level2TargetId: number,
    objectId: number,
    agents: Agent[],
    tick: number
  ): ToMThought | null {
    const thinker = agents.find(a => a.id === thinkerId);
    if (!thinker) return null;

    // Only agents with high openness can do level 2 reasoning
    if (thinker.ocean.openness < 0.6) return null;

    // Get level 1 inference
    const level1Thought = this.inferSecondOrderBelief(
      thinkerId, level1TargetId, level2TargetId, agents, tick
    );
    if (!level1Thought) return null;

    // Now infer what level1Target thinks about level2Target's belief
    const level2Thought = this.inferSecondOrderBelief(
      level1TargetId, level2TargetId, objectId, agents, tick
    );
    if (!level2Thought) return null;

    // Combine with confidence decay
    const combinedConfidence = level1Thought.confidence * level2Thought.confidence * 0.7;

    const thought: ToMThought = {
      level: 2,
      subjectId: thinkerId,
      objectId: level1TargetId,
      content: `A${thinkerId} thinks A${level1TargetId} thinks A${level2TargetId} believes A${objectId} has trust=${level2Thought.content.split('trust=')[1]}`,
      confidence: combinedConfidence,
      timestamp: tick,
    };

    this.thoughtHistory.push(thought);
    if (this.thoughtHistory.length > this.maxThoughtHistory) {
      this.thoughtHistory.shift();
    }

    return thought;
  }

  /**
   * Strategic deception: Agent deliberately misleads others
   */
  planDeception(
    deceiverId: number,
    targetId: number,
    falseBeliefContent: string,
    agents: Agent[],
    tick: number
  ): boolean {
    const deceiver = agents.find(a => a.id === deceiverId);
    const target = agents.find(a => a.id === targetId);
    if (!deceiver || !target) return false;

    // Low agreeableness + high openness = more likely to deceive
    const deceptionProbability = 
      (1 - deceiver.ocean.agreeableness) * 0.4 + 
      deceiver.ocean.openness * 0.3 +
      deceiver.ocean.conscientiousness * 0.1; // Low conscientiousness = less moral restraint

    if (Math.random() > deceptionProbability) return false;

    // Record the deception attempt
    const thought: ToMThought = {
      level: 1,
      subjectId: deceiverId,
      objectId: targetId,
      content: `A${deceiverId} plans to deceive A${targetId}: "${falseBeliefContent}"`,
      confidence: 1.0,
      timestamp: tick,
    };

    this.thoughtHistory.push(thought);
    if (this.thoughtHistory.length > this.maxThoughtHistory) {
      this.thoughtHistory.shift();
    }

    return true;
  }

  /**
   * Detect if an agent is being deceptive based on inconsistencies
   */
  detectDeception(
    detectorId: number,
    suspectedDeceiverId: number,
    agents: Agent[],
    tick: number
  ): boolean {
    const detector = agents.find(a => a.id === detectorId);
    if (!detector) return false;

    // Check for inconsistencies in suspected deceiver's recent statements
    const deceiver = agents.find(a => a.id === suspectedDeceiverId);
    if (!deceiver) return false;

    // Look for contradictory memories
    const recentMemories = deceiver.memories.slice(-10);
    const contradictions = this.findContradictions(recentMemories);

    // High conscientiousness detector is better at spotting lies
    const detectionAbility = detector.ocean.conscientiousness * 0.6 + 
                            detector.ocean.openness * 0.3;

    const detected = contradictions > 0 && Math.random() < detectionAbility * 0.5;

    if (detected) {
      const thought: ToMThought = {
        level: 1,
        subjectId: detectorId,
        objectId: suspectedDeceiverId,
        content: `A${detectorId} suspects A${suspectedDeceiverId} is being deceptive (${contradictions} contradictions found)`,
        confidence: detectionAbility * 0.7,
        timestamp: tick,
      };

      this.thoughtHistory.push(thought);
      if (this.thoughtHistory.length > this.maxThoughtHistory) {
        this.thoughtHistory.shift();
      }
    }

    return detected;
  }

  findContradictions(memories: any[]): number {
    let contradictions = 0;
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        if (
          memories[i].subjectAgentId === memories[j].subjectAgentId &&
          memories[i].actionType !== memories[j].actionType &&
          Math.abs(memories[i].emotionalValence - memories[j].emotionalValence) > 1.0
        ) {
          contradictions++;
        }
      }
    }
    return contradictions;
  }

  /**
   * Update mental states based on new observations
   */
  updateMentalStates(agents: Agent[], tick: number): void {
    for (const agent of agents) {
      const state = this.getMentalState(agent.id);
      
      // Update beliefs based on agent's actual beliefs
      for (const [targetId, belief] of agent.beliefs) {
        state.beliefs.set(targetId, belief.trust);
      }

      // Infer intentions based on recent actions
      const recentMemories = agent.memories.slice(-5);
      for (const mem of recentMemories) {
        if (mem.actionType === 'betrayal') {
          state.intentions.set(mem.subjectAgentId, 'hostile');
        } else if (mem.actionType === 'altruism') {
          state.intentions.set(mem.subjectAgentId, 'cooperative');
        }
      }

      // Update knowledge
      for (const mem of agent.memories) {
        state.knowledge.add(`A${mem.subjectAgentId}:${mem.actionType}`);
      }
    }
  }

  getRecentThoughts(limit: number = 10): ToMThought[] {
    return this.thoughtHistory.slice(-limit).reverse();
  }
}
