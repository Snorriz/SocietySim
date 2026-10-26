import { useEffect, useRef, useState, useCallback } from 'react';
import { SimulationEngine, ForceLayout, Agent } from './engine';
import { SimulationReport } from './narrative';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SimulationEngine>(new SimulationEngine());
  const layoutRef = useRef<ForceLayout>(new ForceLayout());
  const animFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [, forceUpdate] = useState(0);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(5);
  const [agentCount] = useState(12);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [showToM, setShowToM] = useState(false);
  const [showNarrative, setShowNarrative] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [narrativePrompt, setNarrativePrompt] = useState('');
  const [report, setReport] = useState<SimulationReport | null>(null);

  const runningRef = useRef(running);
  const speedRef = useRef(speed);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const initSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const w = Math.max(rect.width, 400);
    const h = Math.max(rect.height, 300);
    canvas.width = w;
    canvas.height = h;
    setCanvasSize({ width: w, height: h });
    engineRef.current.initialize(agentCount, w, h);
    setSelectedAgentId(null);
    setReport(null);
  }, [agentCount]);

  useEffect(() => {
    initSimulation();
  }, [initSimulation]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const container = canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    const layout = layoutRef.current;
    let frameCount = 0;

    const render = (timestamp: number) => {
      if (runningRef.current) {
        const tickInterval = 1000 / speedRef.current;
        if (timestamp - lastTickRef.current >= tickInterval) {
          engine.tick_update();
          lastTickRef.current = timestamp;
          frameCount++;
          if (frameCount % 10 === 0) {
            forceUpdate(n => n + 1);
          }
        }
      }

      const edges = engine.getEdges();
      layout.update(engine.agents, edges, canvasSize.width, canvasSize.height);
      drawGraph(engine);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [canvasSize]);

  const drawGraph = (engine: SimulationEngine) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid(ctx, canvas.width, canvas.height);

    const edges = engine.getEdges();
    for (const edge of edges) {
      const source = engine.agents.find(a => a.id === edge.sourceId);
      const target = engine.agents.find(a => a.id === edge.targetId);
      if (!source || !target) continue;

      const alpha = Math.min(Math.abs(edge.trust) * 0.8 + 0.08, 0.85);
      const lineWidth = Math.abs(edge.trust) * 2.5 + 0.3;

      if (edge.trust > 0) {
        ctx.strokeStyle = `rgba(0, 255, 150, ${alpha})`;
      } else {
        ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
      }
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }

    for (const agent of engine.agents) {
      drawAgent(ctx, agent, engine);
    }

    drawScanlines(ctx, canvas.width, canvas.height);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = 'rgba(0, 255, 200, 0.025)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  };

  const drawScanlines = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }
  };

  const drawAgent = (ctx: CanvasRenderingContext2D, agent: Agent, engine: SimulationEngine) => {
    const faction = engine.factions.find(f => f.memberIds.includes(agent.id));
    let color = '#888888';
    if (faction) {
      color = faction.color;
    }

    const radius = 10 + agent.state.energy * 5;
    const glow = agent.state.stress * 12;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = glow + 4;

    ctx.beginPath();
    ctx.arc(agent.x, agent.y, radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(agent.x, agent.y, 0, agent.x, agent.y, radius);
    gradient.addColorStop(0, color + 'dd');
    gradient.addColorStop(0.6, color + '66');
    gradient.addColorStop(1, color + '11');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = agent.id === selectedAgentId ? '#ffffff' : color + 'aa';
    ctx.lineWidth = agent.id === selectedAgentId ? 2.5 : 1.2;
    ctx.beginPath();
    ctx.arc(agent.x, agent.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${agent.id}`, agent.x, agent.y);

    ctx.fillStyle = color + 'bb';
    ctx.font = '8px monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillText(agent.name, agent.x, agent.y - radius - 3);

    if (agent.state.stress > 0.7) {
      const pulseAlpha = (agent.state.stress - 0.7) * 2.5;
      const pulseSize = radius + 3 + Math.sin(engine.tick * 0.3) * 2;
      ctx.strokeStyle = `rgba(255, 50, 50, ${pulseAlpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, pulseSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const engine = engineRef.current;
    let found = false;
    for (const agent of engine.agents) {
      const dx = agent.x - x;
      const dy = agent.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 18) {
        agent.selected = true;
        setSelectedAgentId(agent.id);
        found = true;
      } else {
        agent.selected = false;
      }
    }
    if (!found) {
      setSelectedAgentId(null);
    }
    forceUpdate(n => n + 1);
  };

  const dragRef = useRef<{ agentId: number; offsetX: number; offsetY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const engine = engineRef.current;
    for (const agent of engine.agents) {
      const dx = agent.x - x;
      const dy = agent.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 18) {
        dragRef.current = { agentId: agent.id, offsetX: dx, offsetY: dy };
        break;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const agent = engineRef.current.agents.find(a => a.id === dragRef.current!.agentId);
    if (agent) {
      agent.x = clamp(x + dragRef.current.offsetX, 20, canvas.width - 20);
      agent.y = clamp(y + dragRef.current.offsetY, 20, canvas.height - 20);
      agent.vx = 0;
      agent.vy = 0;
    }
  };

  const handleMouseUp = () => {
    dragRef.current = null;
  };

  const handleNarrativeSubmit = () => {
    if (!narrativePrompt.trim()) return;
    const engine = engineRef.current;
    const prompt = engine.narrativeSandbox.parsePrompt(narrativePrompt, engine);
    engine.narrativeSandbox.executePrompt(prompt, engine);
    setNarrativePrompt('');
    forceUpdate(n => n + 1);
  };

  const handleGenerateReport = () => {
    const engine = engineRef.current;
    const report = engine.generateReport();
    setReport(report);
    setShowReport(true);
  };

  const engine = engineRef.current;
  const selectedAgent = selectedAgentId !== null ? engine.agents.find(a => a.id === selectedAgentId) || null : null;

  return (
    <div className="w-full h-screen flex flex-col bg-[#0a0a0f] text-green-300 font-mono overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#0d0d15] border-b border-green-900/50 flex-shrink-0 flex-wrap">
        <div className="text-cyan-400 font-bold text-sm tracking-wider mr-4 whitespace-nowrap">
          ◈ SOCIAL PHYSICS ENGINE v2.0
        </div>
        <button
          onClick={() => setRunning(!running)}
          className={`px-3 py-1 text-xs border rounded transition-colors ${running ? 'border-red-500/70 text-red-400 hover:bg-red-500/20' : 'border-green-500/70 text-green-400 hover:bg-green-500/20'}`}
        >
          {running ? '■ PAUSE' : '▶ PLAY'}
        </button>
        <div className="flex items-center gap-1 ml-2">
          <span className="text-[10px] text-gray-500">SPD:</span>
          {[1, 5, 20].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 text-xs border rounded transition-colors ${speed === s ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
            >
              {s}x
            </button>
          ))}
        </div>
        <div className="ml-4 text-[11px] text-gray-400 whitespace-nowrap">
          T:<span className="text-cyan-300">{engine.tick}</span>
          {' '}N:<span className="text-cyan-300">{engine.agents.length}</span>
          {' '}F:<span className="text-cyan-300">{engine.factions.length}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowToM(!showToM)}
            className={`px-2 py-1 text-xs border rounded transition-colors ${showToM ? 'border-purple-500 text-purple-400 bg-purple-500/10' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
          >
            🧠 ToM
          </button>
          <button
            onClick={() => setShowNarrative(!showNarrative)}
            className={`px-2 py-1 text-xs border rounded transition-colors ${showNarrative ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
          >
            📖 NARRATIVA
          </button>
          <button
            onClick={handleGenerateReport}
            className="px-2 py-1 text-xs border border-blue-700 text-blue-400 rounded hover:bg-blue-500/10 transition-colors"
          >
            📊 REPORT
          </button>
          <button
            onClick={() => { engine.addAgent(canvasSize.width, canvasSize.height); forceUpdate(n => n + 1); }}
            className="px-2 py-1 text-xs border border-green-700 text-green-400 rounded hover:bg-green-500/10 transition-colors"
          >
            + AGENT
          </button>
          {selectedAgentId !== null && (
            <button
              onClick={() => { engine.removeAgent(selectedAgentId); setSelectedAgentId(null); forceUpdate(n => n + 1); }}
              className="px-2 py-1 text-xs border border-red-700 text-red-400 rounded hover:bg-red-500/10 transition-colors"
            >
              ✕ REMOVE
            </button>
          )}
          <button
            onClick={initSimulation}
            className="px-2 py-1 text-xs border border-yellow-700 text-yellow-400 rounded hover:bg-yellow-500/10 transition-colors"
          >
            ↻ RESET
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Canvas Area */}
        <div className="flex-1 relative min-w-0">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full cursor-crosshair block"
          />
          {/* Event Injection Toolbar */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-4 py-2 bg-[#0d0d15]/95 border-t border-green-900/50">
            <span className="text-[10px] text-gray-500 mr-1">INJECT:</span>
            <button
              onClick={() => {
                const agents = engine.agents;
                if (agents.length > 1) {
                  const victim = agents[Math.floor(Math.random() * agents.length)];
                  engine.injectBetrayal(victim.id);
                  forceUpdate(n => n + 1);
                }
              }}
              className="px-3 py-1 text-xs border border-red-800 text-red-400 rounded hover:bg-red-500/20 transition-colors"
            >
              ⚡ BETRAYAL
            </button>
            <button
              onClick={() => {
                const agents = engine.agents;
                if (agents.length > 1) {
                  const helper = agents[Math.floor(Math.random() * agents.length)];
                  engine.injectAltruism(helper.id);
                  forceUpdate(n => n + 1);
                }
              }}
              className="px-3 py-1 text-xs border border-cyan-800 text-cyan-400 rounded hover:bg-cyan-500/20 transition-colors"
            >
              ✦ ALTRUISM
            </button>
            <button
              onClick={() => {
                const agents = engine.agents;
                if (agents.length > 0) {
                  const target = agents[Math.floor(Math.random() * agents.length)];
                  engine.injectRumor(target.id);
                  forceUpdate(n => n + 1);
                }
              }}
              className="px-3 py-1 text-xs border border-purple-800 text-purple-400 rounded hover:bg-purple-500/20 transition-colors"
            >
              ◉ RUMOR
            </button>
            <div className="ml-auto text-[10px] text-gray-600 hidden md:block">
              Click node to inspect • Drag to move
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 lg:w-80 bg-[#0d0d15] border-l border-green-900/50 flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-3 py-2 border-b border-green-900/50 text-[10px] text-cyan-400 font-bold tracking-wider flex-shrink-0">
            ◈ AGENT INSPECTOR
          </div>

          {selectedAgent ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              <AgentInspector agentId={selectedAgent.id} engine={engine} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-[10px] p-4 text-center min-h-0">
              Click on an agent node to inspect their cognitive state, memories, and trust network.
            </div>
          )}

          {/* Faction Overview */}
          <div className="border-t border-green-900/30 px-3 py-2 flex-shrink-0">
            <div className="text-[10px] text-yellow-500 font-bold tracking-wider mb-1">FACTIONS</div>
            <div className="flex flex-wrap gap-1">
              {engine.factions.map(f => (
                <span key={f.id} className="text-[9px] px-1.5 py-0.5 rounded border" style={{ borderColor: f.color + '66', color: f.color, backgroundColor: f.color + '11' }}>
                  {f.name}({f.memberIds.length})
                </span>
              ))}
              {engine.factions.length === 0 && <span className="text-[9px] text-gray-600">Detecting...</span>}
            </div>
          </div>

          {/* Event Feed */}
          <div className="border-t border-green-900/50 flex flex-col flex-shrink-0" style={{ height: '35%' }}>
            <div className="px-3 py-1.5 border-b border-green-900/30 text-[10px] text-yellow-500 font-bold tracking-wider flex-shrink-0">
              ◈ EVENT CONSOLE
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-px min-h-0">
              {engine.events.slice(0, 80).map((evt, i) => (
                <div key={i} className="text-[9px] leading-relaxed">
                  <span className="text-gray-600">[{evt.tick}]</span>{' '}
                  <span className={
                    evt.type === 'BETRAYAL' ? 'text-red-400' :
                    evt.type === 'ALTRUISM' ? 'text-cyan-400' :
                    evt.type === 'RUMOR' ? 'text-purple-400' :
                    evt.type === 'GOSSIP' ? 'text-green-500/80' :
                    evt.type === 'NARRATIVE' ? 'text-yellow-400' :
                    'text-yellow-400'
                  }>
                    {evt.type}
                  </span>{' '}
                  <span className="text-gray-400">{evt.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Theory of Mind Panel */}
      {showToM && (
        <div className="fixed top-16 left-4 w-96 h-96 bg-[#0d0d15] border border-purple-900/50 rounded-lg shadow-2xl z-50 flex flex-col">
          <div className="px-3 py-2 border-b border-purple-900/50 text-[10px] text-purple-400 font-bold tracking-wider flex-shrink-0 flex justify-between items-center">
            <span>🧠 THEORY OF MIND - Multi-Level Reasoning</span>
            <button onClick={() => setShowToM(false)} className="text-gray-500 hover:text-white">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="text-[9px] text-gray-400 mb-2">
              Recent mental state inferences:
            </div>
            {engine.tomEngine.getRecentThoughts(15).map((thought, i) => (
              <div key={i} className="text-[9px] bg-purple-500/5 border border-purple-900/30 rounded p-2">
                <div className="text-purple-400 font-bold">Level {thought.level} | Confidence: {thought.confidence.toFixed(2)}</div>
                <div className="text-gray-300 mt-1">{thought.content}</div>
                <div className="text-gray-600 text-[8px] mt-1">[T{thought.timestamp}]</div>
              </div>
            ))}
            {engine.tomEngine.getRecentThoughts(1).length === 0 && (
              <div className="text-[9px] text-gray-600 italic">No mental state inferences yet. Let the simulation run...</div>
            )}
          </div>
        </div>
      )}

      {/* Narrative Sandbox Panel */}
      {showNarrative && (
        <div className="fixed top-16 left-4 w-[500px] h-[500px] bg-[#0d0d15] border border-yellow-900/50 rounded-lg shadow-2xl z-50 flex flex-col">
          <div className="px-3 py-2 border-b border-yellow-900/50 text-[10px] text-yellow-400 font-bold tracking-wider flex-shrink-0 flex justify-between items-center">
            <span>📖 NARRATIVE SANDBOX - Generative Storytelling</span>
            <button onClick={() => setShowNarrative(false)} className="text-gray-500 hover:text-white">✕</button>
          </div>
          <div className="p-3 border-b border-yellow-900/30 flex-shrink-0">
            <div className="text-[9px] text-gray-400 mb-2">
              Describe a narrative event (Italian or English):
            </div>
            <textarea
              value={narrativePrompt}
              onChange={(e) => setNarrativePrompt(e.target.value)}
              placeholder="Es: 'Agent_3 tradisce Agent_7' o 'Una crisi colpisce la comunità'"
              className="w-full h-20 bg-black/30 border border-yellow-900/30 rounded p-2 text-[10px] text-yellow-300 placeholder-gray-600 resize-none"
            />
            <button
              onClick={handleNarrativeSubmit}
              className="mt-2 px-4 py-1.5 text-xs border border-yellow-700 text-yellow-400 rounded hover:bg-yellow-500/20 transition-colors"
            >
              ▶ EXECUTE NARRATIVE
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="text-[9px] text-gray-400 mb-2">
              Active narrative arcs:
            </div>
            {engine.narrativeSandbox.getActiveArcs().map((arc, i) => (
              <div key={i} className="text-[9px] bg-yellow-500/5 border border-yellow-900/30 rounded p-2">
                <div className="text-yellow-400 font-bold">{arc.initiation.description}</div>
                <div className="text-gray-400 mt-1">
                  Affected: {arc.initiation.affectedAgents.map(id => `A${id}`).join(', ')}
                </div>
                <div className="text-gray-500 mt-1">
                  Consequences: {arc.consequences.length} scheduled
                </div>
                {arc.resolution && (
                  <div className="text-green-400 mt-1 italic">Resolved: {arc.resolution}</div>
                )}
              </div>
            ))}
            {engine.narrativeSandbox.getActiveArcs().length === 0 && (
              <div className="text-[9px] text-gray-600 italic">No active narrative arcs. Create one above!</div>
            )}
            <div className="text-[9px] text-gray-400 mt-4 mb-2">
              Narrative log:
            </div>
            {engine.narrativeSandbox.getNarrativeLog().slice(0, 10).map((log, i) => (
              <div key={i} className="text-[8px] text-gray-500">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Report Panel */}
      {showReport && report && (
        <div className="fixed top-16 left-4 w-[700px] h-[600px] bg-[#0d0d15] border border-blue-900/50 rounded-lg shadow-2xl z-50 flex flex-col">
          <div className="px-3 py-2 border-b border-blue-900/50 text-[10px] text-blue-400 font-bold tracking-wider flex-shrink-0 flex justify-between items-center">
            <span>📊 SIMULATION REPORT - Post-Analysis</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const text = engine.reportGenerator.formatReportText(report);
                  navigator.clipboard.writeText(text);
                }}
                className="text-[9px] px-2 py-0.5 border border-blue-700 text-blue-400 rounded hover:bg-blue-500/20"
              >
                📋 COPY
              </button>
              <button onClick={() => setShowReport(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="text-[10px] text-gray-400">
              Generated: {new Date(report.timestamp).toLocaleString()} | Duration: {report.totalTicks} ticks | Agents: {report.agentCount}
            </div>
            
            <div className="bg-blue-500/5 border border-blue-900/30 rounded p-3">
              <div className="text-[10px] text-blue-400 font-bold mb-2">EXECUTIVE SUMMARY</div>
              <div className="text-[9px] text-gray-300 whitespace-pre-line">{report.summary}</div>
            </div>

            {report.sections.map((section, i) => (
              <div key={i} className="bg-gray-500/5 border border-gray-900/30 rounded p-3">
                <div className="text-[10px] text-cyan-400 font-bold mb-2">{section.title}</div>
                <div className="space-y-1">
                  {section.content.map((line, j) => (
                    <div key={j} className="text-[9px] text-gray-300">{line}</div>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(section.metrics).map(([key, value]) => (
                    <div key={key} className="text-[8px] bg-black/30 px-2 py-1 rounded">
                      <span className="text-gray-500">{key}:</span>{' '}
                      <span className="text-cyan-300">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {report.suggestions.length > 0 && (
              <div className="bg-green-500/5 border border-green-900/30 rounded p-3">
                <div className="text-[10px] text-green-400 font-bold mb-2">RECOMMENDATIONS</div>
                <div className="space-y-1">
                  {report.suggestions.map((suggestion, i) => (
                    <div key={i} className="text-[9px] text-gray-300">{suggestion}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentInspector({ agentId, engine }: { agentId: number; engine: SimulationEngine }) {
  const agent = engine.agents.find(a => a.id === agentId);
  if (!agent) return <div className="text-red-400 text-xs">Agent not found</div>;

  const faction = engine.factions.find(f => f.memberIds.includes(agent.id));
  const beliefs = Array.from(agent.beliefs.values());
  const topTrusted = beliefs.filter(b => b.trust > 0).sort((a, b) => b.trust - a.trust).slice(0, 5);
  const topDistrusted = beliefs.filter(b => b.trust < 0).sort((a, b) => a.trust - b.trust).slice(0, 5);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: faction?.color || '#555', borderColor: faction?.color || '#555' }}></div>
        <span className="text-sm font-bold text-white">{agent.name}</span>
        {faction && (
          <span className="text-[9px] px-1.5 py-0.5 rounded border" style={{ borderColor: faction.color + '66', color: faction.color }}>
            {faction.name}
          </span>
        )}
      </div>

      {/* OCEAN Profile */}
      <div className="space-y-1">
        <div className="text-[9px] text-cyan-500 font-bold tracking-wider">OCEAN PROFILE</div>
        <BarRow label="O" sublabel="pen" value={agent.ocean.openness} color="#00ccff" />
        <BarRow label="C" sublabel="on" value={agent.ocean.conscientiousness} color="#00ff88" />
        <BarRow label="E" sublabel="xt" value={agent.ocean.extraversion} color="#ffcc00" />
        <BarRow label="A" sublabel="gr" value={agent.ocean.agreeableness} color="#ff66aa" />
        <BarRow label="N" sublabel="eu" value={agent.ocean.neuroticism} color="#ff4444" />
      </div>

      {/* State */}
      <div className="space-y-1">
        <div className="text-[9px] text-cyan-500 font-bold tracking-wider">INTERNAL STATE</div>
        <BarRow label="⚡" sublabel="nrg" value={agent.state.energy} color="#00ff88" />
        <BarRow label="☠" sublabel="str" value={agent.state.stress} color="#ff4444" />
        <BarRow label="💬" sublabel="soc" value={agent.state.socialDrive} color="#00ccff" />
      </div>

      {/* Memories */}
      <div className="space-y-1">
        <div className="text-[9px] text-cyan-500 font-bold tracking-wider">
          MEMORY GRAPH ({agent.memories.length} nodes)
        </div>
        <div className="max-h-20 overflow-y-auto space-y-px bg-black/30 rounded p-1">
          {agent.memories.slice(-10).reverse().map((mem, i) => (
            <div key={i} className="text-[8px] text-gray-400 flex items-center gap-1">
              <span className={
                mem.actionType === 'betrayal' ? 'text-red-400' :
                mem.actionType === 'altruism' ? 'text-cyan-400' :
                mem.actionType === 'rumor' ? 'text-purple-400' : 'text-gray-600'
              }>
                {mem.actionType === 'betrayal' ? '⚡' : mem.actionType === 'altruism' ? '✦' : mem.actionType === 'rumor' ? '◉' : '·'}
              </span>
              <span>A{mem.subjectAgentId}</span>
              <span className="text-gray-600">c:{mem.certainty.toFixed(2)}</span>
              <span className="text-gray-600">v:{mem.emotionalValence.toFixed(1)}</span>
              <span className="text-gray-700">×{mem.transmissionCount}</span>
            </div>
          ))}
          {agent.memories.length === 0 && <div className="text-[8px] text-gray-600 italic">No memories</div>}
        </div>
      </div>

      {/* Trust Network */}
      <div className="space-y-1">
        <div className="text-[9px] text-green-500 font-bold tracking-wider">TRUSTED ({topTrusted.length})</div>
        {topTrusted.map((b, i) => (
          <div key={i} className="flex items-center gap-1 text-[9px]">
            <span className="text-green-400 w-8">→A{b.agentId}</span>
            <div className="flex-1 h-1.5 bg-gray-800 rounded overflow-hidden">
              <div className="h-full bg-green-500 rounded" style={{ width: `${b.trust * 100}%` }}></div>
            </div>
            <span className="text-gray-500 w-7 text-right">{b.trust.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="text-[9px] text-red-500 font-bold tracking-wider">DISTRUSTED ({topDistrusted.length})</div>
        {topDistrusted.map((b, i) => (
          <div key={i} className="flex items-center gap-1 text-[9px]">
            <span className="text-red-400 w-8">→A{b.agentId}</span>
            <div className="flex-1 h-1.5 bg-gray-800 rounded overflow-hidden">
              <div className="h-full bg-red-500 rounded" style={{ width: `${Math.abs(b.trust) * 100}%` }}></div>
            </div>
            <span className="text-gray-500 w-7 text-right">{b.trust.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function BarRow({ label, sublabel, value, color }: { label: string; sublabel: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] w-3" style={{ color }}>{label}</span>
      <span className="text-[7px] text-gray-600 w-4">{sublabel}</span>
      <div className="flex-1 h-1.5 bg-gray-800/80 rounded overflow-hidden">
        <div className="h-full rounded transition-all duration-500" style={{ width: `${value * 100}%`, backgroundColor: color + 'cc' }}></div>
      </div>
      <span className="text-[8px] text-gray-500 w-7 text-right">{value.toFixed(2)}</span>
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export default App;
