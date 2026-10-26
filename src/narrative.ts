// ============================================================
// NARRATIVE SANDBOX & REPORT GENERATOR
// ============================================================

import { Agent, SimulationEngine, SimEvent, Faction, MemoryNode } from './engine';

// ============================================================
// NARRATIVE SANDBOX - Generative Storytelling from User Prompts
// ============================================================

export interface NarrativePrompt {
  text: string;
  type: 'betrayal' | 'alliance' | 'rumor' | 'crisis' | 'discovery' | 'custom';
  actors?: number[];
  intensity?: number;
}

export interface NarrativeConsequence {
  tick: number;
  description: string;
  affectedAgents: number[];
  rippleEffects: string[];
  cascadeLevel: number;
}

export interface NarrativeArc {
  prompt: NarrativePrompt;
  initiation: NarrativeConsequence;
  consequences: NarrativeConsequence[];
  resolution: string | null;
  startedTick: number;
}

export class NarrativeSandbox {
  activeArcs: NarrativeArc[];
  completedArcs: NarrativeArc[];
  narrativeLog: string[];
  maxActiveArcs: number;

  constructor() {
    this.activeArcs = [];
    this.completedArcs = [];
    this.narrativeLog = [];
    this.maxActiveArcs = 5;
  }

  /**
   * Parse user prompt and generate initial narrative event
   */
  parsePrompt(promptText: string, engine: SimulationEngine): NarrativePrompt {
    const text = promptText.toLowerCase();
    let type: NarrativePrompt['type'] = 'custom';
    let actors: number[] = [];
    let intensity = 0.7;

    // Detect type from keywords
    if (text.includes('tradiment') || text.includes('betray') || text.includes('rub') || text.includes('ingann')) {
      type = 'betrayal';
      intensity = 0.9;
    } else if (text.includes('allea') || text.includes('alliance') || text.includes('amic') || text.includes('aiut')) {
      type = 'alliance';
      intensity = 0.6;
    } else if (text.includes('rumor') || text.includes('pettegolezzo') || text.includes('fals') || text.includes('bugia')) {
      type = 'rumor';
      intensity = 0.7;
    } else if (text.includes('crisi') || text.includes('crisis') || text.includes('disastr') || text.includes('emergenza')) {
      type = 'crisis';
      intensity = 0.95;
    } else if (text.includes('scopert') || text.includes('discover') || text.includes('segret') || text.includes('verità')) {
      type = 'discovery';
      intensity = 0.8;
    }

    // Extract agent IDs from prompt
    const agentMatches = text.match(/(?:agent|agt|a)[_\s]*(\d+)/gi);
    if (agentMatches) {
      for (const match of agentMatches) {
        const id = parseInt(match.match(/\d+/)![0]);
        if (engine.agents.find(a => a.id === id)) {
          actors.push(id);
        }
      }
    }

    // If no actors specified, pick random ones
    if (actors.length === 0) {
      const shuffled = [...engine.agents].sort(() => Math.random() - 0.5);
      actors = shuffled.slice(0, Math.min(3, shuffled.length)).map(a => a.id);
    }

    return { text: promptText, type, actors, intensity };
  }

  /**
   * Execute the narrative prompt and generate consequences
   */
  executePrompt(prompt: NarrativePrompt, engine: SimulationEngine): NarrativeArc {
    const arc: NarrativeArc = {
      prompt,
      initiation: this.generateInitiation(prompt, engine),
      consequences: [],
      resolution: null,
      startedTick: engine.tick,
    };

    // Apply immediate effects
    this.applyInitiation(arc.initiation, engine);

    // Schedule cascading consequences
    this.scheduleConsequences(arc, engine);

    this.activeArcs.push(arc);
    this.narrativeLog.push(`[T${engine.tick}] NARRATIVE: ${arc.initiation.description}`);

    return arc;
  }

  generateInitiation(prompt: NarrativePrompt, engine: SimulationEngine): NarrativeConsequence {
    const actors = prompt.actors || [];
    const actorNames = actors.map(id => `Agent_${id}`).join(', ');
    let description = '';
    let rippleEffects: string[] = [];

    switch (prompt.type) {
      case 'betrayal':
        description = `Un atto di tradimento scuote la rete: ${actorNames} sono coinvolti in un conflitto di interessi. La fiducia vacilla.`;
        rippleEffects = [
          'Gli osservatori iniziano a prendere le parti',
          'Si formano coalizioni difensive',
          'Il pettegolezzo si diffonde rapidamente',
        ];
        break;
      case 'alliance':
        description = `Un'alleanza inaspettata emerge tra ${actorNames}. Gli equilibri di potere si spostano.`;
        rippleEffects = [
          'Agenti esclusi si sentono minacciati',
          'Nuove opportunità di cooperazione emergono',
          "La rete si polarizza attorno all'alleanza",
        ];
        break;
      case 'rumor':
        description = `Un rumor pericoloso inizia a circolare riguardo a ${actorNames}. La verità si mescola alla finzione.`;
        rippleEffects = [
          'La certezza delle informazioni diminuisce',
          'Alcuni agenti credono, altri dubitano',
          'Si creano fazioni basate sulla credulità',
        ];
        break;
      case 'crisis':
        description = `Una crisi colpisce la comunità. ${actorNames} devono affrontare risorse limitate e decisioni difficili.`;
        rippleEffects = [
          'Lo stress collettivo aumenta',
          'Emergono leader naturali',
          'I più vulnerabili cercano protezione',
        ];
        break;
      case 'discovery':
        description = `Una verità nascosta viene alla luce riguardo a ${actorNames}. Le percezioni cambiano radicalmente.`;
        rippleEffects = [
          'Le certezze crollano',
          'Le alleanze si ridefiniscono',
          'Nuovi sospetti emergono',
        ];
        break;
      default:
        description = `Un evento imprevisto coinvolge ${actorNames}. Le conseguenze si propagano nella rete.`;
        rippleEffects = [
          'L\'incertezza aumenta',
          'Gli agenti ricalibrano le loro strategie',
        ];
    }

    return {
      tick: engine.tick,
      description,
      affectedAgents: actors,
      rippleEffects,
      cascadeLevel: 0,
    };
  }

  applyInitiation(consequence: NarrativeConsequence, engine: SimulationEngine): void {
    const actors = consequence.affectedAgents;
    const intensity = 0.8;

    switch (consequence.rippleEffects.length > 0 ? consequence.rippleEffects[0].includes('tradimento') ? 'betrayal' : 'neutral' : 'neutral') {
      default:
        // Apply effects to actors
        for (let i = 0; i < actors.length; i++) {
          const actor = engine.agents.find(a => a.id === actors[i]);
          if (!actor) continue;

          // Create memories for all involved
          for (let j = 0; j < actors.length; j++) {
            if (i === j) continue;
            const other = actors[j];
            const mem: MemoryNode = {
              id: `narr_${engine.tick}_${i}_${j}`,
              timestamp: engine.tick,
              subjectAgentId: other,
              actionType: 'neutral',
              truthValue: 0.7,
              emotionalValence: (Math.random() - 0.5) * intensity,
              certainty: 0.9,
              transmissionCount: 0,
            };
            actor.addMemory(mem);
          }

          // Increase stress for all involved
          actor.state.stress = Math.min(1, actor.state.stress + 0.2 * intensity);
        }

        // Observers also form memories
        const observers = engine.agents.filter(a => !actors.includes(a.id));
        for (const obs of observers) {
          if (Math.random() < 0.5) {
            const targetActor = actors[Math.floor(Math.random() * actors.length)];
            const mem: MemoryNode = {
              id: `narr_obs_${engine.tick}_${obs.id}`,
              timestamp: engine.tick,
              subjectAgentId: targetActor,
              actionType: 'neutral',
              truthValue: 0.5,
              emotionalValence: (Math.random() - 0.5) * 0.5,
              certainty: 0.6,
              transmissionCount: 0,
            };
            obs.addMemory(mem);
          }
        }
    }
  }

  scheduleConsequences(arc: NarrativeArc, engine: SimulationEngine): void {
    // Generate 2-4 cascading consequences
    const numConsequences = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numConsequences; i++) {
      const delay = (i + 1) * 10 + Math.floor(Math.random() * 20);
      const consequence = this.generateCascadeConsequence(arc, i + 1, engine);
      arc.consequences.push(consequence);
    }
  }

  generateCascadeConsequence(arc: NarrativeArc, level: number, engine: SimulationEngine): NarrativeConsequence {
    const affectedAgents: number[] = [];
    
    // Expand affected agents based on cascade level
    const directAffected = arc.initiation.affectedAgents;
    for (const agentId of directAffected) {
      const agent = engine.agents.find(a => a.id === agentId);
      if (!agent) continue;
      
      // Add agents that this agent trusts/distrusts
      for (const [targetId, belief] of agent.beliefs) {
        if (Math.abs(belief.trust) > 0.3 / level && Math.random() < 0.4) {
          if (!affectedAgents.includes(targetId)) {
            affectedAgents.push(targetId);
          }
        }
      }
    }

    const descriptions = [
      `Le conseguenze si propagano: ${affectedAgents.length} agenti vengono influenzati indirettamente.`,
      `Il pettegolezzo raggiunge nuovi orecchi. La narrazione si distorce.`,
      `Nuove alleanze si formano in risposta all'evento.`,
      `La polarizzazione aumenta. Gli estremi si rafforzano.`,
      `Un agente chiave cambia posizione, alterando gli equilibri.`,
    ];

    return {
      tick: engine.tick + level * 15,
      description: descriptions[Math.min(level - 1, descriptions.length - 1)],
      affectedAgents,
      rippleEffects: [`Cascade level ${level}`, `${affectedAgents.length} agents affected`],
      cascadeLevel: level,
    };
  }

  /**
   * Process cascading consequences each tick
   */
  update(engine: SimulationEngine): string[] {
    const newEvents: string[] = [];

    for (const arc of this.activeArcs) {
      for (const consequence of arc.consequences) {
        if (consequence.tick === engine.tick && consequence.cascadeLevel > 0) {
          // Apply cascade effect
          this.applyCascade(consequence, engine);
          newEvents.push(`[T${engine.tick}] CASCADE L${consequence.cascadeLevel}: ${consequence.description}`);
          this.narrativeLog.push(`[T${engine.tick}] CASCADE L${consequence.cascadeLevel}: ${consequence.description}`);
        }
      }

      // Check if arc should resolve
      const ticksSinceStart = engine.tick - arc.startedTick;
      if (ticksSinceStart > 100 && arc.consequences.every(c => c.tick <= engine.tick)) {
        arc.resolution = this.generateResolution(arc, engine);
        this.completedArcs.push(arc);
        newEvents.push(`[T${engine.tick}] NARRATIVE RESOLVED: ${arc.resolution}`);
        this.narrativeLog.push(`[T${engine.tick}] RESOLUTION: ${arc.resolution}`);
      }
    }

    // Remove completed arcs from active
    this.activeArcs = this.activeArcs.filter(arc => !arc.resolution);

    return newEvents;
  }

  applyCascade(consequence: NarrativeConsequence, engine: SimulationEngine): void {
    for (const agentId of consequence.affectedAgents) {
      const agent = engine.agents.find(a => a.id === agentId);
      if (!agent) continue;

      // Subtle state changes
      agent.state.stress = Math.min(1, agent.state.stress + 0.05);
      agent.state.socialDrive = Math.min(1, agent.state.socialDrive + 0.03);

      // Form new memories about affected agents
      const otherAffected = consequence.affectedAgents.filter(id => id !== agentId);
      if (otherAffected.length > 0) {
        const target = otherAffected[Math.floor(Math.random() * otherAffected.length)];
        const mem: MemoryNode = {
          id: `cascade_${engine.tick}_${agentId}`,
          timestamp: engine.tick,
          subjectAgentId: target,
          actionType: 'neutral',
          truthValue: 0.5 - consequence.cascadeLevel * 0.1,
          emotionalValence: (Math.random() - 0.5) * 0.4,
          certainty: 0.5 - consequence.cascadeLevel * 0.1,
          transmissionCount: consequence.cascadeLevel,
        };
        agent.addMemory(mem);
      }
    }
  }

  generateResolution(arc: NarrativeArc, engine: SimulationEngine): string {
    const affectedAgents = arc.initiation.affectedAgents;
    const avgTrustChange = affectedAgents.reduce((sum, id) => {
      const agent = engine.agents.find(a => a.id === id);
      if (!agent) return sum;
      const avgTrust = Array.from(agent.beliefs.values())
        .reduce((s, b) => s + b.trust, 0) / Math.max(1, agent.beliefs.size);
      return sum + avgTrust;
    }, 0) / Math.max(1, affectedAgents.length);

    if (avgTrustChange > 0.2) {
      return 'La crisi ha rafforzato i legami. La comunità emerge più coesa.';
    } else if (avgTrustChange < -0.2) {
      return 'La frattura si approfondisce. Le fazioni si consolidano attorno a posizioni opposte.';
    } else {
      return 'L\'equilibrio si ristabilisce, ma le cicatrici rimangono nella memoria collettiva.';
    }
  }

  getActiveArcs(): NarrativeArc[] {
    return this.activeArcs;
  }

  getNarrativeLog(): string[] {
    return [...this.narrativeLog].reverse();
  }
}

// ============================================================
// REPORT GENERATOR - Post-Simulation Analysis
// ============================================================

export interface ReportSection {
  title: string;
  content: string[];
  metrics: Record<string, number | string>;
}

export interface SimulationReport {
  timestamp: number;
  totalTicks: number;
  agentCount: number;
  sections: ReportSection[];
  criticalEvents: SimEvent[];
  suggestions: string[];
  summary: string;
}

export class ReportGenerator {
  constructor() {}

  generateReport(engine: SimulationEngine): SimulationReport {
    const sections: ReportSection[] = [];
    
    sections.push(this.generateNetworkAnalysis(engine));
    sections.push(this.generateFactionAnalysis(engine));
    sections.push(this.generateInformationFlowAnalysis(engine));
    sections.push(this.generatePsychologicalProfile(engine));
    sections.push(this.generateCriticalEventsAnalysis(engine));

    const criticalEvents = this.identifyCriticalEvents(engine);
    const suggestions = this.generateSuggestions(engine);
    const summary = this.generateSummary(engine, sections);

    return {
      timestamp: Date.now(),
      totalTicks: engine.tick,
      agentCount: engine.agents.length,
      sections,
      criticalEvents,
      suggestions,
      summary,
    };
  }

  generateNetworkAnalysis(engine: SimulationEngine): ReportSection {
    const agents = engine.agents;
    const edges = engine.getEdges();

    // Calculate metrics
    const avgTrust = edges.reduce((sum, e) => sum + e.trust, 0) / Math.max(1, edges.length);
    const positiveEdges = edges.filter(e => e.trust > 0).length;
    const negativeEdges = edges.filter(e => e.trust < 0).length;
    const density = edges.length / Math.max(1, (agents.length * (agents.length - 1)) / 2);

    // Find most connected agent (highest degree centrality)
    const degreeMap = new Map<number, number>();
    for (const edge of edges) {
      degreeMap.set(edge.sourceId, (degreeMap.get(edge.sourceId) || 0) + 1);
      degreeMap.set(edge.targetId, (degreeMap.get(edge.targetId) || 0) + 1);
    }
    let maxDegree = 0;
    let centralAgent = 0;
    for (const [id, degree] of degreeMap) {
      if (degree > maxDegree) {
        maxDegree = degree;
        centralAgent = id;
      }
    }

    // Find bridge agents (betweenness approximation)
    const bridgeAgents: number[] = [];
    for (const agent of agents) {
      const connections = edges.filter(e => e.sourceId === agent.id || e.targetId === agent.id);
      const crossFaction = connections.filter(e => {
        const otherId = e.sourceId === agent.id ? e.targetId : e.sourceId;
        const other = agents.find(a => a.id === otherId);
        return other && other.factionId !== agent.factionId;
      });
      if (crossFaction.length >= 2) {
        bridgeAgents.push(agent.id);
      }
    }

    return {
      title: '📊 ANALISI DELLA RETE',
      content: [
        `La rete comprende ${agents.length} agenti con ${edges.length} connessioni attive.`,
        `Densità della rete: ${(density * 100).toFixed(1)}% - ${density > 0.5 ? 'ALTAMENTE CONNESSA' : density > 0.2 ? 'MODERATAMENTE CONNESSA' : 'SPARSA'}`,
        `Fiducia media: ${avgTrust.toFixed(3)} (${avgTrust > 0.2 ? 'POSITIVA' : avgTrust < -0.1 ? 'NEGATIVA' : 'NEUTRA'})`,
        `Connessioni positive: ${positiveEdges} | negative: ${negativeEdges}`,
        centralAgent >= 0 ? `Agente più centrale: Agent_${centralAgent} (grado: ${maxDegree})` : 'Nessun agente centrale identificato',
        bridgeAgents.length > 0 ? `Agenti ponte (broker di informazione): ${bridgeAgents.map(id => `A${id}`).join(', ')}` : 'Nessun agente ponte identificato',
      ],
      metrics: {
        'Densità': `${(density * 100).toFixed(1)}%`,
        'Fiducia Media': avgTrust.toFixed(3),
        'Archi Positivi': positiveEdges,
        'Archi Negativi': negativeEdges,
        'Agente Centrale': `A${centralAgent}`,
        'Broker': bridgeAgents.length,
      },
    };
  }

  generateFactionAnalysis(engine: SimulationEngine): ReportSection {
    const factions = engine.factions;
    const content: string[] = [];

    if (factions.length === 0) {
      content.push('Nessuna fazione distinta identificata. La rete è frammentata o omogenea.');
    } else {
      content.push(`${factions.length} fazioni identificate attraverso clustering basato sulla fiducia.`);
      
      // Find largest faction
      const largest = factions.reduce((max, f) => f.memberIds.length > max.memberIds.length ? f : max, factions[0]);
      content.push(`Fazione dominante: ${largest.name} con ${largest.memberIds.length} membri (${(largest.memberIds.length / engine.agents.length * 100).toFixed(0)}%)`);

      // Check for polarization
      const factionSizes = factions.map(f => f.memberIds.length).sort((a, b) => b - a);
      if (factionSizes.length >= 2 && factionSizes[0] + factionSizes[1] >= engine.agents.length * 0.7) {
        content.push('⚠️ POLARIZZAZIONE RILEVATA: Due fazioni dominanti controllano la maggioranza della rete.');
      }

      // Faction details
      for (const faction of factions) {
        const avgTrust = this.calculateFactionCohesion(faction, engine);
        content.push(`${faction.name}: ${faction.memberIds.length} membri, coesione interna: ${avgTrust.toFixed(2)}`);
      }
    }

    return {
      title: '🏛️ ANALISI DELLE FAZIONI',
      content,
      metrics: {
        'Fazioni': factions.length,
        'Fazione Max': factions.length > 0 ? `${factions.reduce((max, f) => f.memberIds.length > max.memberIds.length ? f : max, factions[0]).name}` : 'N/A',
        'Polarizzazione': factions.length >= 2 ? 'ALTA' : 'BASSA',
      },
    };
  }

  calculateFactionCohesion(faction: Faction, engine: SimulationEngine): number {
    let totalTrust = 0;
    let count = 0;
    for (const memberId of faction.memberIds) {
      const agent = engine.agents.find(a => a.id === memberId);
      if (!agent) continue;
      for (const otherId of faction.memberIds) {
        if (otherId === memberId) continue;
        totalTrust += agent.getBeliefAbout(otherId).trust;
        count++;
      }
    }
    return count > 0 ? totalTrust / count : 0;
  }

  generateInformationFlowAnalysis(engine: SimulationEngine): ReportSection {
    const content: string[] = [];
    
    // Count memory transmissions
    let totalMemories = 0;
    let totalTransmissions = 0;
    let highCertaintyMemories = 0;
    let distortedMemories = 0;

    for (const agent of engine.agents) {
      totalMemories += agent.memories.length;
      for (const mem of agent.memories) {
        totalTransmissions += mem.transmissionCount;
        if (mem.certainty > 0.7) highCertaintyMemories++;
        if (mem.transmissionCount > 2 && Math.abs(mem.emotionalValence) > 0.5) distortedMemories++;
      }
    }

    const avgMemories = totalMemories / Math.max(1, engine.agents.length);
    const avgTransmissions = totalTransmissions / Math.max(1, totalMemories);

    content.push(`Totale memorie nella rete: ${totalMemories} (media: ${avgMemories.toFixed(1)} per agente)`);
    content.push(`Media trasmissioni per memoria: ${avgTransmissions.toFixed(2)}`);
    content.push(`Memorie ad alta certezza (>0.7): ${highCertaintyMemories} (${(highCertaintyMemories / Math.max(1, totalMemories) * 100).toFixed(0)}%)`);
    
    if (distortedMemories > 0) {
      content.push(`⚠️ Memorie potenzialmente distorte dopo multiple trasmissioni: ${distortedMemories}`);
    }

    // Identify information hubs
    const memoryHubs = engine.agents
      .map(a => ({ id: a.id, count: a.memories.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    content.push(`Hub di informazione: ${memoryHubs.map(h => `A${h.id}(${h.count})`).join(', ')}`);

    return {
      title: '📡 FLUSSO INFORMATIVO',
      content,
      metrics: {
        'Memorie Totali': totalMemories,
        'Media/Agente': avgMemories.toFixed(1),
        'Alta Certezza': `${highCertaintyMemories}`,
        'Distorte': distortedMemories,
      },
    };
  }

  generatePsychologicalProfile(engine: SimulationEngine): ReportSection {
    const content: string[] = [];
    const agents = engine.agents;

    // Average OCEAN
    const avgOcean = {
      openness: agents.reduce((s, a) => s + a.ocean.openness, 0) / agents.length,
      conscientiousness: agents.reduce((s, a) => s + a.ocean.conscientiousness, 0) / agents.length,
      extraversion: agents.reduce((s, a) => s + a.ocean.extraversion, 0) / agents.length,
      agreeableness: agents.reduce((s, a) => s + a.ocean.agreeableness, 0) / agents.length,
      neuroticism: agents.reduce((s, a) => s + a.ocean.neuroticism, 0) / agents.length,
    };

    content.push(`Profilo OCEAN medio della popolazione:`);
    content.push(`  Apertura: ${avgOcean.openness.toFixed(2)} | Coscienziosità: ${avgOcean.conscientiousness.toFixed(2)}`);
    content.push(`  Estroversione: ${avgOcean.extraversion.toFixed(2)} | Gradevolezza: ${avgOcean.agreeableness.toFixed(2)}`);
    content.push(`  Nevroticismo: ${avgOcean.neuroticism.toFixed(2)}`);

    // Average state
    const avgStress = agents.reduce((s, a) => s + a.state.stress, 0) / agents.length;
    const avgEnergy = agents.reduce((s, a) => s + a.state.energy, 0) / agents.length;

    content.push(`Stress medio: ${avgStress.toFixed(2)} ${avgStress > 0.6 ? '⚠️ ELEVATO' : ''}`);
    content.push(`Energia media: ${avgEnergy.toFixed(2)}`);

    // Find outliers
    const mostNeurotic = agents.reduce((max, a) => a.ocean.neuroticism > max.ocean.neuroticism ? a : max, agents[0]);
    const mostStressed = agents.reduce((max, a) => a.state.stress > max.state.stress ? a : max, agents[0]);

    content.push(`Agente più nevrotico: Agent_${mostNeurotic.id} (${mostNeurotic.ocean.neuroticism.toFixed(2)})`);
    content.push(`Agente più stressato: Agent_${mostStressed.id} (${mostStressed.state.stress.toFixed(2)})`);

    return {
      title: '🧠 PROFILO PSICOLOGICO COLLETTIVO',
      content,
      metrics: {
        'Stress Medio': avgStress.toFixed(2),
        'Energia Media': avgEnergy.toFixed(2),
        'Apertura Media': avgOcean.openness.toFixed(2),
        'Nevroticismo Medio': avgOcean.neuroticism.toFixed(2),
      },
    };
  }

  generateCriticalEventsAnalysis(engine: SimulationEngine): ReportSection {
    const criticalEvents = this.identifyCriticalEvents(engine);
    const content: string[] = [];

    if (criticalEvents.length === 0) {
      content.push('Nessun evento critico identificato nella simulazione.');
    } else {
      content.push(`${criticalEvents.length} eventi critici identificati:`);
      for (const evt of criticalEvents.slice(0, 5)) {
        content.push(`  [T${evt.tick}] ${evt.type}: ${evt.message}`);
      }
    }

    // Count event types
    const betrayals = engine.events.filter(e => e.type === 'BETRAYAL').length;
    const altruism = engine.events.filter(e => e.type === 'ALTRUISM').length;
    const rumors = engine.events.filter(e => e.type === 'RUMOR').length;
    const gossips = engine.events.filter(e => e.type === 'GOSSIP').length;

    content.push(`Totale eventi: Betragioni=${betrayals}, Altruismo=${altruism}, Rumor=${rumors}, Gossip=${gossips}`);

    return {
      title: '⚡ EVENTI CRITICI',
      content,
      metrics: {
        'Betragioni': betrayals,
        'Altruismo': altruism,
        'Rumor': rumors,
        'Gossip': gossips,
        'Eventi Critici': criticalEvents.length,
      },
    };
  }

  identifyCriticalEvents(engine: SimulationEngine): SimEvent[] {
    // Critical events: betrayals, rumors, faction changes
    return engine.events.filter(e => 
      e.type === 'BETRAYAL' || e.type === 'RUMOR'
    ).slice(0, 10);
  }

  generateSuggestions(engine: SimulationEngine): string[] {
    const suggestions: string[] = [];
    const edges = engine.getEdges();
    const factions = engine.factions;
    const avgTrust = edges.reduce((s, e) => s + e.trust, 0) / Math.max(1, edges.length);

    // Check for polarization
    if (factions.length >= 2) {
      const sizes = factions.map(f => f.memberIds.length).sort((a, b) => b - a);
      if (sizes[0] + (sizes[1] || 0) >= engine.agents.length * 0.7) {
        suggestions.push('🔧 INTRODURRE UN MEDIATORE: La polarizzazione è elevata. Un agente con alta gradevolezza potrebbe facilitare il dialogo tra fazioni.');
      }
    }

    // Check for trust deficit
    if (avgTrust < -0.1) {
      suggestions.push('🔧 INIETTARE ALTRUISMO: La fiducia media è negativa. Eventi positivi mirati potrebbero invertire la tendenza.');
    }

    // Check for information distortion
    let distortedCount = 0;
    for (const agent of engine.agents) {
      for (const mem of agent.memories) {
        if (mem.transmissionCount > 2) distortedCount++;
      }
    }
    if (distortedCount > engine.agents.length * 2) {
      suggestions.push('🔧 FACT-CHECKING: Molte memorie distorte rilevate. Introdurre agenti con alta coscienziosità come verificatori.');
    }

    // Check for isolated agents
    const isolated = engine.agents.filter(a => {
      const connections = edges.filter(e => e.sourceId === a.id || e.targetId === a.id);
      return connections.length === 0;
    });
    if (isolated.length > 0) {
      suggestions.push(`🔧 INTEGRAZIONE: ${isolated.length} agenti isolati rilevati. Facilitare connessioni per evitare echo chambers.`);
    }

    // Check for high stress
    const avgStress = engine.agents.reduce((s, a) => s + a.state.stress, 0) / engine.agents.length;
    if (avgStress > 0.6) {
      suggestions.push('🔧 RIDUZIONE STRESS: Lo stress collettivo è elevato. Considerare eventi di cooperazione per alleviare la tensione.');
    }

    if (suggestions.length === 0) {
      suggestions.push('✅ La rete sembra equilibrata. Continuare la simulazione per osservare l\'evoluzione naturale.');
    }

    return suggestions;
  }

  generateSummary(engine: SimulationEngine, sections: ReportSection[]): string {
    const networkSection = sections.find(s => s.title.includes('RETE'));
    const factionSection = sections.find(s => s.title.includes('FAZIONI'));
    const psychSection = sections.find(s => s.title.includes('PSICOLOGICO'));

    let summary = `SIMULAZIONE COMPLETATA — ${engine.tick} tick, ${engine.agents.length} agenti.\n\n`;

    if (networkSection) {
      summary += `RETE: ${networkSection.content[1]}\n`;
    }
    if (factionSection) {
      summary += `FAZIONI: ${factionSection.content[0]}\n`;
    }
    if (psychSection) {
      summary += `PSICOLOGIA: Stress medio ${psychSection.metrics['Stress Medio']}\n`;
    }

    return summary;
  }

  /**
   * Format report as readable text
   */
  formatReportText(report: SimulationReport): string {
    let text = '═'.repeat(60) + '\n';
    text += '  COGNITIVE AGENT ENGINE — REPORT DI SIMULAZIONE\n';
    text += '═'.repeat(60) + '\n\n';
    text += `Data: ${new Date(report.timestamp).toLocaleString()}\n`;
    text += `Durata: ${report.totalTicks} tick | Agenti: ${report.agentCount}\n\n`;

    text += '─── SINTESI ESECUTIVA ───\n';
    text += report.summary + '\n\n';

    for (const section of report.sections) {
      text += `─── ${section.title} ───\n`;
      for (const line of section.content) {
        text += `  ${line}\n`;
      }
      text += '  Metriche: ';
      text += Object.entries(section.metrics).map(([k, v]) => `${k}=${v}`).join(' | ');
      text += '\n\n';
    }

    if (report.criticalEvents.length > 0) {
      text += '─── EVENTI CRITICI ───\n';
      for (const evt of report.criticalEvents) {
        text += `  [T${evt.tick}] ${evt.type}: ${evt.message}\n`;
      }
      text += '\n';
    }

    text += '─── RACCOMANDAZIONI ───\n';
    for (const suggestion of report.suggestions) {
      text += `  ${suggestion}\n`;
    }

    text += '\n' + '═'.repeat(60) + '\n';
    text += '  END OF REPORT\n';
    text += '═'.repeat(60) + '\n';

    return text;
  }
}
