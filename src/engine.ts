// ============================================================
// COGNITIVE AGENT & SOCIAL PHYSICS ENGINE
// ============================================================

// --- Utility Functions ---
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function randomGaussian(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// --- Types ---
export interface OceanProfile {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface AgentState {
  energy: number;
  stress: number;
  socialDrive: number;
}

export interface MemoryNode {
  id: string;
  timestamp: number;
  subjectAgentId: number;
  actionType: 'betrayal' | 'altruism' | 'neutral' | 'rumor';
  truthValue: number;
  emotionalValence: number;
  certainty: number;
  transmissionCount: number;
}

export interface BeliefEntry {
  agentId: number;
  trust: number;
  perceivedOpenness: number;
  perceivedAgreeableness: number;
  perceivedNeuroticism: number;
}

export interface Faction {
  id: number;
  name: string;
  memberIds: number[];
  color: string;
  centroidBeliefs: Map<number, number>;
}

export interface SimEvent {
  tick: number;
  type: string;
  message: string;
}

export interface GraphEdge {
  sourceId: number;
  targetId: number;
  trust: number;
}

// --- Agent Class ---
export class Agent {
  id: number;
  name: string;
  ocean: OceanProfile;
  state: AgentState;
  memories: MemoryNode[];
  beliefs: Map<number, BeliefEntry>;
  factionId: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  selected: boolean;
  interactionCooldown: number;

  constructor(id: number, x: number, y: number) {
    this.id = id;
    this.name = `Agent_${id}`;
    this.ocean = {
      openness: clamp(0.5 + randomGaussian() * 0.2, 0, 1),
      conscientiousness: clamp(0.5 + randomGaussian() * 0.2, 0, 1),
      extraversion: clamp(0.5 + randomGaussian() * 0.2, 0, 1),
      agreeableness: clamp(0.5 + randomGaussian() * 0.2, 0, 1),
      neuroticism: clamp(0.5 + randomGaussian() * 0.2, 0, 1),
    };
    this.state = {
      energy: randomInRange(0.5, 1.0),
      stress: randomInRange(0.0, 0.3),
      socialDrive: randomInRange(0.3, 0.8),
    };
    this.memories = [];
    this.beliefs = new Map();
    this.factionId = -1;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.selected = false;
    this.interactionCooldown = 0;
  }

  getMemoryCertaintyDecay(): number {
    return 0.95 - this.ocean.neuroticism * 0.05;
  }

  getGossipProbability(): number {
    return this.ocean.extraversion * 0.7 + this.state.socialDrive * 0.3;
  }

  getDistortionFactor(): number {
    const lowAgreeableness = (1 - this.ocean.agreeableness) * 0.5;
    const highNeuroticism = this.ocean.neuroticism * 0.5;
    return lowAgreeableness + highNeuroticism;
  }

  addMemory(mem: MemoryNode): void {
    this.memories.push(mem);
    if (this.memories.length > 50) {
      this.memories.sort((a, b) => b.certainty - a.certainty);
      this.memories = this.memories.slice(0, 50);
    }
  }

  getBeliefAbout(agentId: number): BeliefEntry {
    if (!this.beliefs.has(agentId)) {
      this.beliefs.set(agentId, {
        agentId,
        trust: 0.0,
        perceivedOpenness: 0.5,
        perceivedAgreeableness: 0.5,
        perceivedNeuroticism: 0.5,
      });
    }
    return this.beliefs.get(agentId)!;
  }

  updateTrust(targetId: number, delta: number): void {
    const belief = this.getBeliefAbout(targetId);
    belief.trust = clamp(belief.trust + delta, -1.0, 1.0);
  }

  assimilateMemory(mem: MemoryNode, speakerTrust: number): void {
    if (speakerTrust < -0.5) {
      const inverted = { ...mem };
      inverted.emotionalValence = -mem.emotionalValence;
      inverted.truthValue = 1 - mem.truthValue;
      inverted.certainty = mem.certainty * 0.5;
      inverted.id = `mem_${this.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      this.addMemory(inverted);
    } else if (speakerTrust > 0.0) {
      const weight = clamp((speakerTrust + 1) / 2, 0.1, 1.0);
      const assimilated = { ...mem };
      assimilated.certainty = mem.certainty * weight;
      assimilated.id = `mem_${this.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      this.addMemory(assimilated);
    }
  }
}

// --- Simulation Engine ---
export class SimulationEngine {
  agents: Agent[];
  factions: Faction[];
  tick: number;
  events: SimEvent[];
  maxEvents: number;
  running: boolean;
  speedMultiplier: number;
  lastTickTime: number;
  tickInterval: number;
  proximityRadius: number;
  factionColors: string[];
  factionNames: string[];
  nextAgentId: number;

  constructor() {
    this.agents = [];
    this.factions = [];
    this.tick = 0;
    this.events = [];
    this.maxEvents = 200;
    this.running = false;
    this.speedMultiplier = 1;
    this.lastTickTime = 0;
    this.tickInterval = 1000;
    this.proximityRadius = 120;
    this.nextAgentId = 0;
    this.factionColors = [
      '#00ffcc', '#ff00aa', '#ffaa00', '#00aaff',
      '#ff5500', '#aa00ff', '#00ff55', '#ff0055'
    ];
    this.factionNames = [
      'ALPHA', 'BETA', 'GAMMA', 'DELTA',
      'EPSILON', 'ZETA', 'ETA', 'THETA'
    ];
  }

  initialize(count: number, width: number, height: number): void {
    this.agents = [];
    this.factions = [];
    this.tick = 0;
    this.events = [];
    this.nextAgentId = 0;

    for (let i = 0; i < count; i++) {
      const x = randomInRange(80, width - 80);
      const y = randomInRange(80, height - 80);
      const agent = new Agent(this.nextAgentId++, x, y);
      this.agents.push(agent);
    }

    for (const agent of this.agents) {
      for (const other of this.agents) {
        if (agent.id !== other.id) {
          agent.beliefs.set(other.id, {
            agentId: other.id,
            trust: randomInRange(-0.2, 0.3),
            perceivedOpenness: other.ocean.openness + randomGaussian() * 0.1,
            perceivedAgreeableness: other.ocean.agreeableness + randomGaussian() * 0.1,
            perceivedNeuroticism: other.ocean.neuroticism + randomGaussian() * 0.1,
          });
        }
      }
    }

    this.addEvent('SYSTEM', `Simulation initialized with ${count} agents`);
  }

  addAgent(width: number, height: number): void {
    const x = randomInRange(80, width - 80);
    const y = randomInRange(80, height - 80);
    const agent = new Agent(this.nextAgentId++, x, y);

    for (const existing of this.agents) {
      agent.beliefs.set(existing.id, {
        agentId: existing.id,
        trust: randomInRange(-0.1, 0.2),
        perceivedOpenness: existing.ocean.openness + randomGaussian() * 0.15,
        perceivedAgreeableness: existing.ocean.agreeableness + randomGaussian() * 0.15,
        perceivedNeuroticism: existing.ocean.neuroticism + randomGaussian() * 0.15,
      });
      existing.beliefs.set(agent.id, {
        agentId: agent.id,
        trust: randomInRange(-0.1, 0.2),
        perceivedOpenness: agent.ocean.openness + randomGaussian() * 0.15,
        perceivedAgreeableness: agent.ocean.agreeableness + randomGaussian() * 0.15,
        perceivedNeuroticism: agent.ocean.neuroticism + randomGaussian() * 0.15,
      });
    }

    this.agents.push(agent);
    this.addEvent('SYSTEM', `New agent ${agent.name} joined the simulation`);
  }

  removeAgent(id: number): void {
    const idx = this.agents.findIndex(a => a.id === id);
    if (idx >= 0) {
      const removed = this.agents[idx];
      this.agents.splice(idx, 1);
      for (const agent of this.agents) {
        agent.beliefs.delete(id);
      }
      this.addEvent('SYSTEM', `Agent ${removed.name} removed from simulation`);
    }
  }

  addEvent(type: string, message: string): void {
    this.events.unshift({ tick: this.tick, type, message });
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }
  }

  tick_update(): void {
    this.tick++;
    this.updateAgentStates();
    this.processInteractions();
    this.decayMemories();
    if (this.tick % 10 === 0) {
      this.detectFactions();
    }
  }

  updateAgentStates(): void {
    for (const agent of this.agents) {
      agent.state.energy = clamp(agent.state.energy - 0.002 + agent.ocean.conscientiousness * 0.003, 0, 1);
      agent.state.stress = clamp(agent.state.stress + agent.ocean.neuroticism * 0.005 - agent.ocean.conscientiousness * 0.003, 0, 1);
      agent.state.socialDrive = clamp(
        agent.state.socialDrive + (1 - agent.ocean.extraversion) * -0.005 + agent.ocean.extraversion * 0.008,
        0, 1
      );
      if (agent.interactionCooldown > 0) agent.interactionCooldown--;
    }
  }

  processInteractions(): void {
    const processed = new Set<string>();
    for (let i = 0; i < this.agents.length; i++) {
      for (let j = i + 1; j < this.agents.length; j++) {
        const a = this.agents[i];
        const b = this.agents[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.proximityRadius) {
          const key = `${a.id}-${b.id}`;
          if (!processed.has(key) && a.interactionCooldown <= 0 && b.interactionCooldown <= 0) {
            processed.add(key);
            this.handleInteraction(a, b);
            a.interactionCooldown = 5;
            b.interactionCooldown = 5;
          }
        }
      }
    }
  }

  handleInteraction(a: Agent, b: Agent): void {
    const probA = a.getGossipProbability();
    const probB = b.getGossipProbability();

    if (Math.random() < probA && a.memories.length > 0) {
      this.gossipExchange(a, b);
    } else if (Math.random() < probB && b.memories.length > 0) {
      this.gossipExchange(b, a);
    } else {
      const trustDelta = (a.ocean.agreeableness + b.ocean.agreeableness) * 0.01 - 0.005;
      a.updateTrust(b.id, trustDelta);
      b.updateTrust(a.id, trustDelta);
    }
  }

  gossipExchange(speaker: Agent, listener: Agent): void {
    const relevantMemories = speaker.memories.filter(m =>
      m.actionType !== 'neutral' || Math.random() < 0.2
    );
    if (relevantMemories.length === 0) return;

    const mem = relevantMemories[Math.floor(Math.random() * relevantMemories.length)];
    const distortion = speaker.getDistortionFactor();

    const transmitted: MemoryNode = {
      id: `mem_${listener.id}_${this.tick}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: this.tick,
      subjectAgentId: mem.subjectAgentId,
      actionType: mem.actionType,
      truthValue: clamp(mem.truthValue + (Math.random() - 0.5) * distortion * 0.4, 0, 1),
      emotionalValence: clamp(
        mem.emotionalValence + (Math.random() - 0.5) * distortion * 0.6,
        -1, 1
      ),
      certainty: mem.certainty * (0.85 - distortion * 0.15),
      transmissionCount: mem.transmissionCount + 1,
    };

    if (distortion > 0.6 && Math.random() < distortion * 0.3) {
      const otherAgents = this.agents.filter(ag => ag.id !== speaker.id && ag.id !== listener.id);
      if (otherAgents.length > 0) {
        const target = speaker.beliefs.get(transmitted.subjectAgentId);
        if (target && target.trust < -0.3) {
          const enemies = otherAgents.filter(ag => {
            const bel = speaker.beliefs.get(ag.id);
            return bel && bel.trust < -0.2;
          });
          if (enemies.length > 0) {
            transmitted.subjectAgentId = enemies[Math.floor(Math.random() * enemies.length)].id;
          }
        }
      }
    }

    const speakerTrust = listener.getBeliefAbout(speaker.id).trust;
    listener.assimilateMemory(transmitted, speakerTrust);

    const trustUpdate = transmitted.emotionalValence > 0 ? 0.02 : -0.01;
    listener.updateTrust(transmitted.subjectAgentId, trustUpdate);

    this.addEvent('GOSSIP',
      `${speaker.name} → ${listener.name}: ${transmitted.actionType} re: Agent_${transmitted.subjectAgentId} [Cert: ${transmitted.certainty.toFixed(2)}, Val: ${transmitted.emotionalValence.toFixed(2)}]`
    );
  }

  decayMemories(): void {
    for (const agent of this.agents) {
      for (const mem of agent.memories) {
        const decayRate = 0.998 - agent.ocean.neuroticism * 0.002;
        mem.certainty *= decayRate;
      }
      agent.memories = agent.memories.filter(m => m.certainty > 0.05);
    }
  }

  detectFactions(): void {
    if (this.agents.length < 3) return;

    const n = this.agents.length;
    const trustMatrix: number[][] = [];

    for (let i = 0; i < n; i++) {
      trustMatrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          trustMatrix[i][j] = 1.0;
        } else {
          const a = this.agents[i];
          const b = this.agents[j];
          const ab = a.getBeliefAbout(b.id).trust;
          const ba = b.getBeliefAbout(a.id).trust;
          trustMatrix[i][j] = (ab + ba) / 2;
        }
      }
    }

    const labels = this.labelPropagationClustering(trustMatrix, n);
    const factionMap = new Map<number, number[]>();

    for (let i = 0; i < n; i++) {
      const label = labels[i];
      if (!factionMap.has(label)) factionMap.set(label, []);
      factionMap.get(label)!.push(i);
    }

    this.factions = [];
    let fIdx = 0;
    for (const [label, members] of factionMap) {
      if (members.length >= 1) {
        const faction: Faction = {
          id: label,
          name: this.factionNames[fIdx % this.factionNames.length],
          memberIds: members.map(i => this.agents[i].id),
          color: this.factionColors[fIdx % this.factionColors.length],
          centroidBeliefs: new Map(),
        };
        this.factions.push(faction);
        for (const mIdx of members) {
          this.agents[mIdx].factionId = label;
        }
        fIdx++;
      }
    }
  }

  labelPropagationClustering(matrix: number[][], n: number): number[] {
    const labels: number[] = Array.from({ length: n }, (_, i) => i);
    const threshold = 0.1;

    for (let iter = 0; iter < 20; iter++) {
      let changed = false;
      const order = Array.from({ length: n }, (_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }

      for (const i of order) {
        const labelWeights = new Map<number, number>();
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const w = matrix[i][j];
          if (w > threshold) {
            const l = labels[j];
            labelWeights.set(l, (labelWeights.get(l) || 0) + w);
          }
        }

        if (labelWeights.size > 0) {
          let maxW = -Infinity;
          let maxL = labels[i];
          for (const [l, w] of labelWeights) {
            if (w > maxW) {
              maxW = w;
              maxL = l;
            }
          }
          if (maxL !== labels[i]) {
            labels[i] = maxL;
            changed = true;
          }
        }
      }
      if (!changed) break;
    }

    const remap = new Map<number, number>();
    let nextId = 0;
    for (let i = 0; i < n; i++) {
      if (!remap.has(labels[i])) {
        remap.set(labels[i], nextId++);
      }
      labels[i] = remap.get(labels[i])!;
    }
    return labels;
  }

  injectBetrayal(victimId: number): void {
    const others = this.agents.filter(a => a.id !== victimId);
    if (others.length === 0) return;
    const perpetrator = others[Math.floor(Math.random() * others.length)];

    const mem: MemoryNode = {
      id: `mem_betrayal_${this.tick}`,
      timestamp: this.tick,
      subjectAgentId: perpetrator.id,
      actionType: 'betrayal',
      truthValue: 1.0,
      emotionalValence: -0.8,
      certainty: 1.0,
      transmissionCount: 0,
    };

    const observers = this.agents.filter(a => {
      if (a.id === perpetrator.id || a.id === victimId) return false;
      const dx = a.x - perpetrator.x;
      const dy = a.y - perpetrator.y;
      return Math.sqrt(dx * dx + dy * dy) < this.proximityRadius * 1.5;
    });

    const victimAgent = this.agents.find(a => a.id === victimId)!;
    victimAgent.addMemory({ ...mem });
    victimAgent.updateTrust(perpetrator.id, -0.4);

    for (const obs of observers) {
      if (Math.random() < 0.7) {
        obs.addMemory({ ...mem, id: `mem_${obs.id}_${this.tick}_${Math.random().toString(36).slice(2, 6)}` });
        obs.updateTrust(perpetrator.id, -0.15);
      }
    }

    this.addEvent('BETRAYAL', `${perpetrator.name} betrayed ${this.agents.find(a => a.id === victimId)?.name}! ${observers.length} observers witnessed it.`);
  }

  injectAltruism(helperId: number): void {
    const others = this.agents.filter(a => a.id !== helperId);
    if (others.length === 0) return;
    const beneficiary = others[Math.floor(Math.random() * others.length)];

    const mem: MemoryNode = {
      id: `mem_altruism_${this.tick}`,
      timestamp: this.tick,
      subjectAgentId: helperId,
      actionType: 'altruism',
      truthValue: 1.0,
      emotionalValence: 0.8,
      certainty: 1.0,
      transmissionCount: 0,
    };

    beneficiary.addMemory({ ...mem });
    beneficiary.updateTrust(helperId, 0.3);

    const helperAgent = this.agents.find(a => a.id === helperId)!;
    const observers = this.agents.filter(a => {
      if (a.id === helperId || a.id === beneficiary.id) return false;
      const dx = a.x - helperAgent.x;
      const dy = a.y - helperAgent.y;
      return Math.sqrt(dx * dx + dy * dy) < this.proximityRadius * 1.5;
    });

    for (const obs of observers) {
      if (Math.random() < 0.6) {
        obs.addMemory({ ...mem, id: `mem_${obs.id}_${this.tick}_${Math.random().toString(36).slice(2, 6)}` });
        obs.updateTrust(helperId, 0.1);
      }
    }

    this.addEvent('ALTRUISM', `${this.agents.find(a => a.id === helperId)?.name} helped ${beneficiary.name}!`);
  }

  injectRumor(targetId: number): void {
    const agent = this.agents.find(a => a.id === targetId);
    if (!agent) return;

    const others = this.agents.filter(a => a.id !== targetId);
    if (others.length === 0) return;
    const falseTarget = others[Math.floor(Math.random() * others.length)];

    const mem: MemoryNode = {
      id: `mem_rumor_${this.tick}`,
      timestamp: this.tick,
      subjectAgentId: falseTarget.id,
      actionType: 'rumor',
      truthValue: 0.2,
      emotionalValence: -0.6,
      certainty: 0.7,
      transmissionCount: 0,
    };

    agent.addMemory(mem);
    agent.updateTrust(falseTarget.id, -0.2);
    this.addEvent('RUMOR', `False rumor injected into ${agent.name} about ${falseTarget.name}`);
  }

  getEdges(): GraphEdge[] {
    const edges: GraphEdge[] = [];
    for (const agent of this.agents) {
      for (const [targetId, belief] of agent.beliefs) {
        if (Math.abs(belief.trust) > 0.05) {
          const reverse = this.agents.find(a => a.id === targetId);
          if (reverse) {
            const reverseBelief = reverse.getBeliefAbout(agent.id);
            const avgTrust = (belief.trust + reverseBelief.trust) / 2;
            if (agent.id < targetId) {
              edges.push({ sourceId: agent.id, targetId, trust: avgTrust });
            }
          }
        }
      }
    }
    return edges;
  }
}

// --- Force-Directed Layout ---
export class ForceLayout {
  repulsion: number;
  attraction: number;
  damping: number;
  centerGravity: number;

  constructor() {
    this.repulsion = 5000;
    this.attraction = 0.005;
    this.damping = 0.85;
    this.centerGravity = 0.01;
  }

  update(agents: Agent[], edges: GraphEdge[], width: number, height: number): void {
    const cx = width / 2;
    const cy = height / 2;

    for (const agent of agents) {
      let fx = 0, fy = 0;

      for (const other of agents) {
        if (agent.id === other.id) continue;
        const dx = agent.x - other.x;
        const dy = agent.y - other.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        const force = this.repulsion / distSq;
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      fx += (cx - agent.x) * this.centerGravity;
      fy += (cy - agent.y) * this.centerGravity;

      agent.vx = (agent.vx + fx) * this.damping;
      agent.vy = (agent.vy + fy) * this.damping;
    }

    for (const edge of edges) {
      const source = agents.find(a => a.id === edge.sourceId);
      const target = agents.find(a => a.id === edge.targetId);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const idealDist = 150;
      const force = (dist - idealDist) * this.attraction * (1 + Math.abs(edge.trust));

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    for (const agent of agents) {
      agent.x += agent.vx;
      agent.y += agent.vy;
      agent.x = clamp(agent.x, 30, width - 30);
      agent.y = clamp(agent.y, 30, height - 30);
    }
  }
}
