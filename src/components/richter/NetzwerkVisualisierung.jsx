import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, ZoomIn, ZoomOut, Maximize2, Brain } from "lucide-react";

const KAT_COLOR = {
  Richter: "#1a3560",
  Anwalt: "#3b82f6",
  Kanzlei: "#8b5cf6",
  Zeuge: "#f59e0b",
  Sachverstaendiger: "#10b981",
  Partei: "#ef4444",
  Sonstiges: "#94a3b8",
};
const KAT_ICONS = { Richter: "⚖️", Anwalt: "👔", Kanzlei: "🏛️", Zeuge: "👁️", Sachverstaendiger: "🔬", Partei: "🏢", Sonstiges: "📋" };

function useForceLayout(nodes, edges, width, height) {
  const [positions, setPositions] = useState({});
  const animRef = useRef(null);
  const posRef = useRef({});
  const velRef = useRef({});

  useEffect(() => {
    if (!nodes.length) return;
    // Initialize positions in a circle
    const init = {};
    const vel = {};
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const r = Math.min(width, height) * 0.3;
      init[n.id] = { x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle) };
      vel[n.id] = { x: 0, y: 0 };
    });
    posRef.current = init;
    velRef.current = vel;

    let iter = 0;
    const simulate = () => {
      if (iter++ > 300) return;
      const pos = posRef.current;
      const vel = velRef.current;
      const newPos = {};

      nodes.forEach(n => {
        let fx = 0, fy = 0;
        const cx = width / 2, cy = height / 2;
        // Center gravity
        fx += (cx - pos[n.id].x) * 0.01;
        fy += (cy - pos[n.id].y) * 0.01;

        // Repulsion between all nodes
        nodes.forEach(m => {
          if (m.id === n.id) return;
          const dx = pos[n.id].x - pos[m.id].x;
          const dy = pos[n.id].y - pos[m.id].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const repulse = 2000 / (dist * dist);
          fx += (dx / dist) * repulse;
          fy += (dy / dist) * repulse;
        });

        // Attraction along edges
        edges.forEach(e => {
          const other = e.source === n.id ? e.target : e.target === n.id ? e.source : null;
          if (!other || !pos[other]) return;
          const dx = pos[other].x - pos[n.id].x;
          const dy = pos[other].y - pos[n.id].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const idealDist = 120 + (e.weight || 1) * 10;
          const spring = (dist - idealDist) * 0.03;
          fx += (dx / dist) * spring;
          fy += (dy / dist) * spring;
        });

        vel[n.id].x = (vel[n.id].x + fx) * 0.7;
        vel[n.id].y = (vel[n.id].y + fy) * 0.7;
        newPos[n.id] = {
          x: Math.max(40, Math.min(width - 40, pos[n.id].x + vel[n.id].x)),
          y: Math.max(40, Math.min(height - 40, pos[n.id].y + vel[n.id].y)),
        };
      });

      posRef.current = newPos;
      if (iter % 10 === 0) setPositions({ ...newPos });
      animRef.current = requestAnimationFrame(simulate);
    };

    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes.length, edges.length, width, height]);

  return positions;
}

export default function NetzwerkVisualisierung({ profiles, cases }) {
  const [aiResult, setAiResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showAI, setShowAI] = useState(false);

  const W = 700, H = 500;

  // Build graph: nodes = profiles, edges = shared cases or experience mentions
  const nodes = profiles.map(p => ({
    id: p.id,
    label: p.name,
    kategorie: p.kategorie || "Richter",
    klaeger_rate: p.klaeger_rate,
    vergleich_rate: p.vergleich_rate,
    erfahrungen: p.erfahrungen || [],
  }));

  // Build edges from cases: if a case links richter_name to profiles
  const edgeMap = {};
  const addEdge = (a, b, weight = 1, label = "") => {
    const key = [a, b].sort().join("__");
    if (!edgeMap[key]) edgeMap[key] = { source: a, target: b, weight: 0, labels: [] };
    edgeMap[key].weight += weight;
    if (label) edgeMap[key].labels.push(label);
  };

  // Link via shared cases
  cases.forEach(c => {
    const richter = profiles.find(p => p.name === c.richter_name);
    if (!richter) return;
    // Link all other profiles mentioned in this case context (by erfahrungen)
    profiles.forEach(p => {
      if (p.id === richter.id) return;
      const expTexts = (p.erfahrungen || []).map(e => (e.text || "") + " " + (e.fall_kontext || "")).join(" ").toLowerCase();
      if (expTexts.includes(richter.name.toLowerCase())) {
        addEdge(richter.id, p.id, 2, c.fallname);
      }
    });
  });

  // Link via same gericht/institution
  profiles.forEach((a, i) => {
    profiles.slice(i + 1).forEach(b => {
      if (a.gericht && b.gericht && a.gericht === b.gericht) {
        addEdge(a.id, b.id, 1, a.gericht);
      }
    });
  });

  const edges = Object.values(edgeMap);
  const positions = useForceLayout(nodes, edges, W, H);

  const runAI = async () => {
    setAnalyzing(true);
    setShowAI(true);

    const richterList = profiles.filter(p => (p.kategorie || "Richter") === "Richter");
    const anwaeltList = profiles.filter(p => p.kategorie === "Anwalt" || p.kategorie === "Kanzlei");

    const caseContext = cases.map(c => `Fall: "${c.fallname}" | Richter: ${c.richter_name || "?"} | Rechtsgebiet: ${c.rechtsgebiet || "?"} | Prognose: ${c.prognose || "?"}% | Status: ${c.status || "?"}`).join("\n");

    const profileContext = profiles.map(p =>
      `${p.kategorie || "Richter"}: ${p.name} | Klägerquote: ${p.klaeger_rate || "?"}% | Vergleichsrate: ${p.vergleich_rate || "?"}% | Erfahrungen: ${(p.erfahrungen || []).length} | ${(p.erfahrungen || []).map(e => e.text).join("; ").slice(0, 200)}`
    ).join("\n");

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein juristischer Netzwerkanalyst. Analysiere die Verbindungen zwischen Richtern und Anwälten/Kanzleien basierend auf dokumentierten Fällen und Erfahrungen.

PROFILE (${profiles.length} Akteure):
${profileContext}

FÄLLE (${cases.length}):
${caseContext}

AUFGABEN:
1. Identifiziere welche Anwälte/Kanzleien häufig vor welchen Richtern auftreten
2. Analysiere bei welchen Richtern welche Anwälte besonders erfolgreich/erfolglos sind (Gewinn/Verlust-Muster)
3. Erkenne taktisch wichtige Netzwerkknoten (Akteure mit vielen Verbindungen)
4. Gib konkrete Handlungsempfehlungen: z.B. "Vermeide Anwalt X vor Richter Y" oder "Kombiniere Kanzlei A mit Richter B"
5. Identifiziere potenzielle Interessenkonflikte oder problematische Konstellationen`,
      response_json_schema: {
        type: "object",
        properties: {
          verbindungen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                richter: { type: "string" },
                akteur: { type: "string" },
                typ: { type: "string" },
                erfolgsrate: { type: "string" },
                muster: { type: "string" },
                empfehlung: { type: "string" }
              }
            }
          },
          schluesselspieler: { type: "array", items: { type: "string" } },
          risikokonstellationen: { type: "array", items: { type: "string" } },
          taktische_empfehlungen: { type: "array", items: { type: "string" } },
          netzwerk_fazit: { type: "string" }
        }
      },
      model: "claude_sonnet_4_6"
    });

    setAiResult(res);
    setAnalyzing(false);
  };

  const selectedNode = selected ? nodes.find(n => n.id === selected) : null;
  const selectedEdges = selected ? edges.filter(e => e.source === selected || e.target === selected) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Taktisches Akteursnetzwerk</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">{nodes.length} Akteure · {edges.length} Verbindungen · Klick auf Knoten für Details</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 2))} className="p-1.5 text-slate-400 hover:text-slate-700 border border-slate-200 rounded-lg">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="p-1.5 text-slate-400 hover:text-slate-700 border border-slate-200 rounded-lg">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setZoom(1)} className="p-1.5 text-slate-400 hover:text-slate-700 border border-slate-200 rounded-lg">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <Button onClick={runAI} disabled={analyzing} size="sm" className="bg-[#1a3560] text-white text-xs gap-1.5 h-8">
            {analyzing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analysiere...</> : <><Brain className="w-3.5 h-3.5" /> KI-Netzwerkanalyse</>}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(KAT_COLOR).map(([k, col]) => (
          <div key={k} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: col }} />
            <span className="text-[10px] text-slate-500">{KAT_ICONS[k]} {k}</span>
          </div>
        ))}
      </div>

      {/* SVG Network */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden relative">
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
            Keine Profile vorhanden. Legen Sie Akteure unter Prozessbeteiligte an.
          </div>
        ) : (
          <div style={{ overflow: "hidden" }}>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s" }}>
              {/* Edges */}
              {edges.map((e, i) => {
                const s = positions[e.source];
                const t = positions[e.target];
                if (!s || !t) return null;
                const isHighlighted = selected && (e.source === selected || e.target === selected);
                return (
                  <g key={i}>
                    <line
                      x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                      stroke={isHighlighted ? "#1a3560" : "#e2e8f0"}
                      strokeWidth={isHighlighted ? Math.min(e.weight * 1.5, 4) : Math.min(e.weight, 2)}
                      strokeOpacity={isHighlighted ? 1 : 0.6}
                    />
                    {isHighlighted && e.weight > 1 && (
                      <text
                        x={(s.x + t.x) / 2} y={(s.y + t.y) / 2}
                        textAnchor="middle" fontSize="9" fill="#64748b"
                        dy="-3"
                      >
                        {e.weight}x
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map(n => {
                const pos = positions[n.id];
                if (!pos) return null;
                const color = KAT_COLOR[n.kategorie] || KAT_COLOR.Sonstiges;
                const isSelected = selected === n.id;
                const isConnected = selected && selectedEdges.some(e => e.source === n.id || e.target === n.id);
                const radius = n.kategorie === "Richter" ? 18 : 14;
                const opacity = selected && !isSelected && !isConnected ? 0.3 : 1;

                return (
                  <g key={n.id} style={{ cursor: "pointer", opacity }}
                    onClick={() => setSelected(selected === n.id ? null : n.id)}>
                    <circle
                      cx={pos.x} cy={pos.y} r={radius + (isSelected ? 4 : 0)}
                      fill={color} fillOpacity={isSelected ? 1 : 0.85}
                      stroke={isSelected ? "#fff" : "none"}
                      strokeWidth={isSelected ? 3 : 0}
                      style={{ filter: isSelected ? "drop-shadow(0 0 6px rgba(26,53,96,0.5))" : "none" }}
                    />
                    {n.kategorie === "Richter" && n.klaeger_rate && (
                      <circle
                        cx={pos.x} cy={pos.y} r={radius + (isSelected ? 4 : 0) + 4}
                        fill="none"
                        stroke={n.klaeger_rate >= 55 ? "#16a34a" : n.klaeger_rate >= 40 ? "#d97706" : "#dc2626"}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        opacity={0.6}
                      />
                    )}
                    <text x={pos.x} y={pos.y + (radius + 14)} textAnchor="middle" fontSize="10" fill="#334155" fontWeight={isSelected ? "700" : "500"}>
                      {n.label.length > 12 ? n.label.slice(0, 12) + "…" : n.label}
                    </text>
                    {n.klaeger_rate !== undefined && (
                      <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="700">
                        {n.klaeger_rate}%
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Selected node details */}
      {selectedNode && (
        <div className="bg-white rounded-xl border border-[#1a3560]/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{KAT_ICONS[selectedNode.kategorie] || "📋"}</span>
            <div>
              <p className="text-sm font-bold text-slate-900">{selectedNode.label}</p>
              <p className="text-[10px] text-slate-400">{selectedNode.kategorie}</p>
            </div>
            {selectedNode.klaeger_rate && (
              <div className="ml-auto text-right">
                <p className="text-xs font-bold text-slate-900">{selectedNode.klaeger_rate}% Klägerquote</p>
                {selectedNode.vergleich_rate && <p className="text-[10px] text-violet-600">{selectedNode.vergleich_rate}% Vergleichsrate</p>}
              </div>
            )}
          </div>
          {selectedEdges.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Verbunden mit {selectedEdges.length} Akteuren</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedEdges.map((e, i) => {
                  const otherId = e.source === selectedNode.id ? e.target : e.source;
                  const other = nodes.find(n => n.id === otherId);
                  if (!other) return null;
                  return (
                    <button key={i} onClick={() => setSelected(otherId)}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border border-slate-200 hover:border-[#1a3560] transition-colors">
                      <div className="w-2 h-2 rounded-full" style={{ background: KAT_COLOR[other.kategorie] || "#94a3b8" }} />
                      {other.label}
                      {e.weight > 1 && <span className="text-slate-400">·{e.weight}x</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Analysis Results */}
      {showAI && (
        <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#1a3560]" /> KI-Netzwerkanalyse
          </h3>

          {analyzing && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
              <RefreshCw className="w-4 h-4 animate-spin" /> Analysiere Netzwerkdynamiken...
            </div>
          )}

          {aiResult && !analyzing && (
            <>
              {/* Verbindungsmatrix */}
              {(aiResult.verbindungen || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Richter-Akteur Verbindungen</p>
                  <div className="space-y-2">
                    {aiResult.verbindungen.map((v, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold text-[#1a3560]">⚖️ {v.richter}</span>
                          <span className="text-[10px] text-slate-400">↔</span>
                          <span className="text-xs font-semibold text-slate-700">👔 {v.akteur}</span>
                          {v.erfolgsrate && (
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ml-auto ${
                              v.erfolgsrate.includes("hoch") || v.erfolgsrate.includes("gut") ? "bg-green-100 text-green-700" :
                              v.erfolgsrate.includes("niedrig") || v.erfolgsrate.includes("schlecht") ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>{v.erfolgsrate}</span>
                          )}
                        </div>
                        {v.muster && <p className="text-[10px] text-slate-600">{v.muster}</p>}
                        {v.empfehlung && <p className="text-[10px] text-[#1a3560] font-medium mt-1">→ {v.empfehlung}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schlüsselspieler */}
              {(aiResult.schluesselspieler || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Schlüsselspieler im Netzwerk</p>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.schluesselspieler.map((s, i) => (
                      <span key={i} className="text-xs bg-[#1a3560] text-white rounded-full px-3 py-1">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Risiken */}
              {(aiResult.risikokonstellationen || []).length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-2">⚠️ Risikokonstellationen</p>
                  <ul className="space-y-1">
                    {aiResult.risikokonstellationen.map((r, i) => (
                      <li key={i} className="text-xs text-red-800">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Taktische Empfehlungen */}
              {(aiResult.taktische_empfehlungen || []).length > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-2">✅ Taktische Empfehlungen</p>
                  <ul className="space-y-1.5">
                    {aiResult.taktische_empfehlungen.map((r, i) => (
                      <li key={i} className="text-xs text-green-800">✓ {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Fazit */}
              {aiResult.netzwerk_fazit && (
                <div className="bg-[#1a3560] text-white rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-blue-200 uppercase tracking-wider mb-1">Netzwerk-Fazit</p>
                  <p className="text-sm leading-relaxed">{aiResult.netzwerk_fazit}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}