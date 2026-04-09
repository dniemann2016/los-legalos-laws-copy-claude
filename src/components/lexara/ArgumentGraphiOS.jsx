import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronDown, Zap } from "lucide-react";

const COLORS = {
  "stützt": { edge: "#10B981", bg: "#D1FAE5", label: "stützt", impact: "+" },
  "entkräftet": { edge: "#EF4444", bg: "#FEE2E2", label: "entkräftet", impact: "−" },
  "verstärkt": { edge: "#8B5CF6", bg: "#F3E8FF", label: "verstärkt", impact: "↑" },
  "schwächt": { edge: "#F59E0B", bg: "#FEF3C7", label: "schwächt", impact: "↓" },
  "widerspricht": { edge: "#EC4899", bg: "#FCE7F3", label: "widerspricht", impact: "≠" },
  "schließt aus": { edge: "#06B6D4", bg: "#CFFAFE", label: "schließt aus", impact: "✗" },
  "kausal": { edge: "#3B82F6", bg: "#DBEAFE", label: "kausal", impact: "→" },
};

/**
 * Sankey-ähnliches Diagramm-Layout
 * Eigene Argumente links, Gegner rechts, klare Verbindungen dazwischen
 */
function computeSankeyLayout(nodes, edges, width, height) {
  const positions = {};
  const eigenArgs = nodes.filter(n => n.side === "eigen").sort((a, b) => a.title.localeCompare(b.title));
  const gegnerArgs = nodes.filter(n => n.side === "gegner").sort((a, b) => a.title.localeCompare(b.title));

  const leftX = 80;
  const rightX = width - 80;
  const topY = 60;
  const spacing = Math.max(70, (height - 120) / Math.max(eigenArgs.length, gegnerArgs.length));

  // Left side (eigen)
  eigenArgs.forEach((node, idx) => {
    positions[node.id] = {
      x: leftX,
      y: topY + idx * spacing
    };
  });

  // Right side (gegner)
  gegnerArgs.forEach((node, idx) => {
    positions[node.id] = {
      x: rightX,
      y: topY + idx * spacing
    };
  });

  return positions;
}

export default function ArgumentGraphiOS({ args, onClose }) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 520 });
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setDims({ w: r.width || 800, h: 520 });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Build nodes and edges
  const nodes = args.map(a => ({ id: a.id, title: a.title, side: a.side, strength: a.strength || 5 }));
  const edges = [];
  args.forEach(a => {
    (a.connections || []).forEach(c => {
      if (c.targetId) edges.push({ 
        fromId: a.id, 
        toId: c.targetId, 
        type: c.type || "stützt", 
        explanation: c.explanation || "", 
        intensitaet: c.intensitaet ?? 5 
      });
    });
  });

  const positions = computeSankeyLayout(nodes, edges, dims.w, dims.h);

  const selectedEdges = selected ? edges.filter(e => e.fromId === selected || e.toId === selected) : [];
  const connectedIds = new Set(selectedEdges.flatMap(e => [e.fromId, e.toId]));

  const getTitle = (id) => {
    const n = nodes.find(x => x.id === id);
    return n ? (n.title.length > 30 ? n.title.slice(0, 30) + "…" : n.title) : "";
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col border border-white/20" 
        style={{ height: "90vh" }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header – Apple-Style */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100/50">
          <div>
            <h2 className="font-bold text-gray-900 text-xl tracking-tight">📊 Argumentationsnetzwerk</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Sankey-Diagramm · {nodes.length} Argumente · {edges.length} Verbindungen</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowLegend(!showLegend)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
              title="Legende"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="px-6 py-4 bg-white border-b border-gray-200 flex flex-wrap gap-6">
            {Object.entries(COLORS).map(([type, { edge, impact, label }]) => (
              <div key={type} className="flex items-center gap-3 text-xs">
                <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold" style={{ borderColor: edge, color: edge }}>
                  {impact}
                </div>
                <span className="text-gray-700 font-semibold">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Canvas */}
        <div 
          ref={containerRef} 
          className="flex-1 overflow-hidden relative bg-gradient-to-br from-gray-50 via-white to-gray-50"
        >
          <svg width="100%" height="100%" style={{ cursor: "default" }}>
            <defs>
              {Object.entries(COLORS).map(([type, { edge }]) => (
                <defs key={type}>
                  <marker 
                    id={`arrow-${type}`} 
                    markerWidth="10" 
                    markerHeight="10" 
                    refX="8" 
                    refY="4" 
                    orient="auto"
                  >
                    <path d="M0,0 L0,8 L10,4 z" fill={edge} />
                  </marker>
                </defs>
              ))}
            </defs>

            <g style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
              {/* Edges */}
              {edges.map((edge, i) => {
                const from = positions[edge.fromId];
                const to = positions[edge.toId];
                if (!from || !to) return null;

                const color = COLORS[edge.type]?.edge || "#9ca3af";
                const isHighlighted = selected && selectedEdges.includes(edge);
                const isDimmed = selected && !isHighlighted;

                // Smooth quadratic bezier für Sankey-Look
                const midX = (from.x + to.x) / 2;
                const path = `M ${from.x} ${from.y} Q ${midX} ${from.y}, ${midX} ${(from.y + to.y) / 2} T ${to.x} ${to.y}`;

                const strokeW = 0.5 + (edge.intensitaet || 5) * 0.08;

                return (
                  <g key={i} opacity={isDimmed ? 0.15 : 0.7} style={{ transition: "opacity 200ms" }}>
                    {/* Background glow */}
                    <path 
                      d={path} 
                      stroke={color} 
                      strokeWidth={strokeW + 8}
                      fill="none"
                      opacity="0.08"
                      style={{ filter: "blur(2px)" }}
                    />
                    {/* Main edge */}
                    <path 
                      d={path} 
                      stroke={color} 
                      strokeWidth={strokeW}
                      fill="none"
                      style={{ opacity: 0.65 }}
                    />
                    {/* Impact badge */}
                    <circle
                      cx={(from.x + to.x) / 2}
                      cy={(from.y + to.y) / 2}
                      r="16"
                      fill="white"
                      stroke={color}
                      strokeWidth="2"
                      opacity="0.98"
                    />
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="12"
                      fontWeight="800"
                      fill={color}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {COLORS[edge.type]?.impact}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map(node => {
                const pos = positions[node.id];
                if (!pos) return null;

                const isSelected = selected === node.id;
                const isDimmed = selected && !connectedIds.has(node.id);
                const isEigen = node.side === "eigen";

                // Color scheme
                const bgGradient = isEigen 
                  ? "from-blue-50 to-cyan-50" 
                  : "from-red-50 to-orange-50";
                const borderColor = isSelected 
                  ? (isEigen ? "#0084FF" : "#FF3B30") 
                  : (isEigen ? "#34C759" : "#FF9500");
                const textColor = isEigen ? "#0084FF" : "#FF3B30";

                const radius = 42 + (node.strength || 5) * 2;

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${pos.x},${pos.y})`}
                    opacity={isDimmed ? 0.3 : 1}
                    style={{ 
                      cursor: "pointer",
                      transition: "opacity 200ms",
                    }}
                    onClick={e => { e.stopPropagation(); setSelected(selected === node.id ? null : node.id); }}
                  >
                    {/* Shadow */}
                    <circle 
                      r={radius} 
                      fill="black"
                      opacity="0.04"
                      style={{ filter: "blur(3px)", transition: "all 200ms" }}
                    />
                    {/* Main card */}
                    <rect
                      x={-radius}
                      y={-radius}
                      width={radius * 2}
                      height={radius * 2}
                      rx="16"
                      fill="white"
                      stroke={isSelected ? borderColor : borderColor}
                      strokeWidth={isSelected ? 2.5 : 2}
                      opacity="0.99"
                      style={{
                        transition: "stroke-width 200ms, filter 200ms",
                        filter: isSelected ? `drop-shadow(0 0 12px ${borderColor}44)` : "drop-shadow(0 2px 6px rgba(0,0,0,0.06))"
                      }}
                    />
                    {/* Strength bar */}
                    <rect
                      x={-radius + 4}
                      y={radius - 6}
                      width={(radius * 2 - 8) * (node.strength || 5) / 10}
                      height="4"
                      rx="2"
                      fill={borderColor}
                      opacity="0.6"
                      style={{ transition: "all 200ms" }}
                    />
                    {/* Title */}
                    <text 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                      y="-4"
                      fontSize="12"
                      fontWeight="700"
                      fill={textColor}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.title.length > 14 ? node.title.slice(0, 14) + "…" : node.title}
                    </text>
                    {/* Strength */}
                    <text 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                      y="10"
                      fontSize="10"
                      fontWeight="600"
                      fill={borderColor}
                      opacity="0.8"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.strength}/10
                    </text>
                    {/* Badge */}
                    <rect
                      x={-26}
                      y={-radius - 18}
                      width="52"
                      height="24"
                      rx="12"
                      fill={borderColor}
                      opacity="0.15"
                    />
                    <rect
                      x={-24}
                      y={-radius - 16}
                      width="48"
                      height="20"
                      rx="10"
                      fill={borderColor}
                      opacity="0.6"
                    />
                    <text 
                      textAnchor="middle"
                      y={-radius - 6}
                      fontSize="8"
                      fontWeight="900"
                      fill="white"
                      style={{ pointerEvents: "none", userSelect: "none", letterSpacing: "0.3px" }}
                    >
                      {isEigen ? "EIGENE" : "GEGNER"}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Side panel on selection */}
          {selected && selectedEdges.length > 0 && (
            <div className="absolute top-6 right-6 bg-white/99 backdrop-blur-xl border border-gray-300 rounded-2xl shadow-xl p-5 w-80 space-y-4 z-10">
              <div className="pb-3">
                <p className="text-sm font-bold text-gray-900">{getTitle(selected)}</p>
                <div className="h-2 w-full bg-gray-100 rounded-full mt-2">
                  <div className="h-full bg-gray-800 rounded-full" style={{width: `${(nodes.find(n => n.id === selected)?.strength || 5) * 10}%`}} />
                </div>
                <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest font-semibold">→ {selectedEdges.length} Auswirkungen</p>
              </div>
              <div className="space-y-2.5">
                {selectedEdges.map((e, i) => {
                   const color = COLORS[e.type]?.edge || "#9ca3af";
                   const isFrom = e.fromId === selected;
                   return (
                     <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                       <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}66` }} />
                       <div className="flex-1 min-w-0 flex items-center gap-1">
                         <span className="font-bold text-gray-400 text-[10px]">{isFrom ? "→" : "←"}</span>
                         <span className="font-semibold text-gray-800 truncate">{getTitle(isFrom ? e.toId : e.fromId)}</span>
                       </div>
                       <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded-md whitespace-nowrap">{e.type}</span>
                     </div>
                   );
                   })}
                   </div>
                   </div>
                   )}

                   {/* Empty state */}
                   {nodes.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center">
                       <div className="text-center">
                         <Zap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                         <p className="text-sm font-semibold text-gray-500">Keine Argumente vorhanden</p>
                       </div>
                     </div>
                   )}

          {/* Help text */}
           {nodes.length > 0 && edges.length === 0 && (
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-50/95 backdrop-blur-xl border border-blue-300 text-blue-800 text-xs rounded-2xl px-5 py-3 shadow-lg font-semibold tracking-tight">
               💡 Verbindungen im Verkettungs-Tab hinzufügen um Netzwerk zu sehen
             </div>
           )}
        </div>
      </div>
    </div>
  );
}