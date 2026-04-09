import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronDown, Zap } from "lucide-react";

const COLORS = {
  "stützt": { edge: "#34C759", label: "stützt" },
  "entkräftet": { edge: "#FF3B30", label: "entkräftet" },
  "verstärkt": { edge: "#07C757", label: "verstärkt" },
  "schwächt": { edge: "#FF9500", label: "schwächt" },
  "widerspricht": { edge: "#FF2D55", label: "widerspricht" },
  "schließt aus": { edge: "#5AC8FA", label: "schließt aus" },
  "kausal": { edge: "#4F9CF9", label: "kausal" },
};

/**
 * Hierarchisches Tree-Layout à la Mindnode/iOS
 * Eigene Argumente oben, Gegner unten, zentrale Frage in der Mitte
 */
function computeTreeLayout(nodes, edges, width, height) {
  const positions = {};
  if (nodes.length === 0) return positions;

  // Separate by side
  const eigenArgs = nodes.filter(n => n.side === "eigen");
  const gegnerArgs = nodes.filter(n => n.side === "gegner");

  const centerX = width / 2;
  const topY = 60;
  const bottomY = height - 60;
  const gapX = Math.max(120, (width - 100) / Math.max(eigenArgs.length, gegnerArgs.length));

  // Layout eigen (top, arc)
  eigenArgs.forEach((node, idx) => {
    const x = centerX - ((eigenArgs.length - 1) * gapX) / 2 + idx * gapX;
    const y = topY;
    positions[node.id] = { x, y };
  });

  // Layout gegner (bottom, arc)
  gegnerArgs.forEach((node, idx) => {
    const x = centerX - ((gegnerArgs.length - 1) * gapX) / 2 + idx * gapX;
    const y = bottomY;
    positions[node.id] = { x, y };
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

  const positions = computeTreeLayout(nodes, edges, dims.w, dims.h);

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
            <h2 className="font-semibold text-gray-900 text-lg">Argumentationsnetzwerk</h2>
            <p className="text-xs text-gray-500 mt-0.5">{nodes.length} Punkte · {edges.length} Verbindungen</p>
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
          <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100/50 flex flex-wrap gap-4">
            {Object.entries(COLORS).map(([type, { edge, label }]) => (
              <div key={type} className="flex items-center gap-2 text-xs">
                <div className="w-4 h-1 rounded-full" style={{ backgroundColor: edge }} />
                <span className="text-gray-600">{label}</span>
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

                // Curve path (quadratic bezier)
                const mx = (from.x + to.x) / 2;
                const my = (from.y + to.y) / 2 + 40;
                const path = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;

                const strokeW = 1.5 + (edge.intensitaet || 5) * 0.15;

                return (
                  <g key={i} opacity={isDimmed ? 0.2 : 1} style={{ transition: "opacity 200ms" }}>
                    {/* Shadow/blur effect */}
                    <path 
                      d={path} 
                      stroke={color} 
                      strokeWidth={strokeW + 3}
                      fill="none"
                      opacity="0.1"
                      style={{ filter: "blur(2px)" }}
                    />
                    {/* Main edge */}
                    <path 
                      d={path} 
                      stroke={color} 
                      strokeWidth={strokeW}
                      fill="none"
                      markerEnd={`url(#arrow-${edge.type})`}
                      style={{ transition: "stroke-width 200ms" }}
                    />
                    {/* Label background */}
                    <rect 
                      x={(from.x + to.x) / 2 - 35} 
                      y={(from.y + to.y) / 2 - 20}
                      width="70"
                      height="16"
                      rx="8"
                      fill="white"
                      opacity="0.9"
                    />
                    {/* Label */}
                    <text 
                      x={(from.x + to.x) / 2} 
                      y={(from.y + to.y) / 2 - 11}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill={color}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {COLORS[edge.type]?.label}
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
                    {/* Glow effect */}
                    <circle 
                      r={radius + 8} 
                      fill={borderColor} 
                      opacity="0.08"
                      style={{ transition: "all 200ms" }}
                    />
                    {/* Main circle */}
                    <circle 
                      r={radius} 
                      fill="white"
                      stroke={borderColor}
                      strokeWidth={isSelected ? 2.5 : 2}
                      opacity="0.95"
                      style={{ 
                        transition: "stroke-width 200ms",
                        backdropFilter: "blur(10px)"
                      }}
                    />
                    {/* Strength indicator ring */}
                    {node.strength && (
                      <circle 
                        r={radius} 
                        fill="none"
                        stroke={borderColor}
                        strokeWidth="1.5"
                        opacity="0.3"
                        strokeDasharray={`${(node.strength / 10) * 2 * Math.PI * radius} ${2 * Math.PI * radius}`}
                        transform="rotate(-90)"
                        style={{ transition: "all 200ms" }}
                      />
                    )}
                    {/* Title */}
                    <text 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                      y="-6"
                      fontSize="13"
                      fontWeight="600"
                      fill={textColor}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.title.length > 16 ? node.title.slice(0, 16) + "…" : node.title}
                    </text>
                    {/* Strength indicator */}
                    <text 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                      y="8"
                      fontSize="11"
                      fontWeight="500"
                      fill={borderColor}
                      opacity="0.7"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.strength}/10
                    </text>
                    {/* Side indicator badge */}
                    <text 
                      textAnchor="middle"
                      y={-radius - 12}
                      fontSize="10"
                      fontWeight="700"
                      fill={textColor}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {isEigen ? "👤 Eigen" : "⚖️ Gegner"}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Side panel on selection */}
          {selected && selectedEdges.length > 0 && (
            <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-5 w-72 space-y-3 z-10">
              <div>
                <p className="text-sm font-semibold text-gray-900">{getTitle(selected)}</p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{selectedEdges.length} Verbindungen</p>
              </div>
              <div className="bg-gray-50/50 rounded-lg p-3 space-y-2">
                {selectedEdges.map((e, i) => {
                  const color = COLORS[e.type]?.edge || "#9ca3af";
                  const isFrom = e.fromId === selected;
                  return (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-600">{isFrom ? "→" : "←"}</span>
                        {" "}
                        <span className="font-medium text-gray-800 truncate">{getTitle(isFrom ? e.toId : e.fromId)}</span>
                        {" "}
                        <span className="text-gray-500 text-[11px]">({e.type})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Noch keine Argumente vorhanden</p>
              </div>
            </div>
          )}

          {/* Help text */}
          {nodes.length > 0 && edges.length === 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-50/80 backdrop-blur-sm border border-blue-100 text-blue-700 text-xs rounded-xl px-4 py-2">
              💡 Füge Verbindungen im Verkettungs-Tab hinzu
            </div>
          )}
        </div>
      </div>
    </div>
  );
}