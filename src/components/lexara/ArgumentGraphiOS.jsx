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
 * Force-Directed Layout (Physik-Simulation)
 * Erzeugt mathematisch komplexes Netzwerk mit Repulsion & Attraction
 */
function computeForceLayout(nodes, edges, width, height, iterations = 50) {
  const positions = {};
  const velocity = {};
  const springLength = 150;
  const repulsion = 800;
  const damping = 0.85;

  // Initialize random positions
  nodes.forEach(n => {
    positions[n.id] = {
      x: width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: height / 2 + (Math.random() - 0.5) * height * 0.6
    };
    velocity[n.id] = { x: 0, y: 0 };
  });

  // Simulate forces
  for (let iter = 0; iter < iterations; iter++) {
    nodes.forEach(n1 => {
      let fx = 0, fy = 0;
      const p1 = positions[n1.id];

      // Repulsion from all nodes
      nodes.forEach(n2 => {
        if (n1.id === n2.id) return;
        const p2 = positions[n2.id];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
        const force = repulsion / (dist * dist);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      });

      // Attraction for connected nodes
      edges.forEach(e => {
        if (e.fromId === n1.id) {
          const p2 = positions[e.toId];
          if (!p2) return;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = (dist - springLength) * 0.05;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        } else if (e.toId === n1.id) {
          const p2 = positions[e.fromId];
          if (!p2) return;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = (dist - springLength) * 0.05;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
      });

      // Center gravity
      fx -= (p1.x - width / 2) * 0.01;
      fy -= (p1.y - height / 2) * 0.01;

      velocity[n1.id].x = (velocity[n1.id].x + fx) * damping;
      velocity[n1.id].y = (velocity[n1.id].y + fy) * damping;

      p1.x += velocity[n1.id].x;
      p1.y += velocity[n1.id].y;

      // Boundary constraints
      p1.x = Math.max(50, Math.min(width - 50, p1.x));
      p1.y = Math.max(50, Math.min(height - 50, p1.y));
    });
  }

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

  const positions = computeForceLayout(nodes, edges, dims.w, dims.h);

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
            <h2 className="font-bold text-gray-900 text-xl tracking-tight">⚙️ Argumentationsnetzwerk</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">Force-Directed Graph · {nodes.length} Knoten · {edges.length} Kanten</p>
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
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50/80 to-blue-50/40 border-b border-gray-200/50 flex flex-wrap gap-5">
            {Object.entries(COLORS).map(([type, { edge, label }]) => (
              <div key={type} className="flex items-center gap-3 text-xs">
                <div className="w-5 h-0.5 rounded-full shadow-sm" style={{ backgroundColor: edge, boxShadow: `0 0 8px ${edge}66` }} />
                <span className="text-gray-700 font-semibold tracking-tight">{label}</span>
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

                // Smooth cubic bezier curve
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const cp1x = from.x + dx * 0.35 + dy * 0.15;
                const cp1y = from.y + dy * 0.35 - dx * 0.15;
                const cp2x = to.x - dx * 0.35 - dy * 0.15;
                const cp2y = to.y - dy * 0.35 + dx * 0.15;
                const path = `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;

                const strokeW = 1.5 + (edge.intensitaet || 5) * 0.15;

                return (
                  <g key={i} opacity={isDimmed ? 0.2 : 1} style={{ transition: "opacity 200ms" }}>
                    {/* Outer glow */}
                    <path 
                      d={path} 
                      stroke={color} 
                      strokeWidth={strokeW + 6}
                      fill="none"
                      opacity="0.08"
                      style={{ filter: "blur(3px)", transition: "opacity 200ms" }}
                    />
                    {/* Mid glow */}
                    <path 
                      d={path} 
                      stroke={color} 
                      strokeWidth={strokeW + 3}
                      fill="none"
                      opacity="0.15"
                      style={{ transition: "opacity 200ms" }}
                    />
                    {/* Main edge with gradient */}
                    <path 
                      d={path} 
                      stroke={color} 
                      strokeWidth={strokeW}
                      fill="none"
                      markerEnd={`url(#arrow-${edge.type})`}
                      style={{ transition: "stroke-width 200ms", opacity: 0.85 }}
                    />
                    {/* Label badge with glow */}
                    <circle
                      cx={(from.x + to.x) / 2}
                      cy={(from.y + to.y) / 2}
                      r="18"
                      fill={color}
                      opacity="0.06"
                      style={{ filter: "blur(2px)" }}
                    />
                    <rect 
                      x={(from.x + to.x) / 2 - 38} 
                      y={(from.y + to.y) / 2 - 11}
                      width="76"
                      height="22"
                      rx="11"
                      fill={color}
                      opacity="0.1"
                      style={{ backdropFilter: "blur(8px)" }}
                    />
                    <rect 
                      x={(from.x + to.x) / 2 - 36} 
                      y={(from.y + to.y) / 2 - 9}
                      width="72"
                      height="18"
                      rx="9"
                      fill="white"
                      opacity="0.95"
                    />
                    {/* Label */}
                    <text 
                      x={(from.x + to.x) / 2} 
                      y={(from.y + to.y) / 2 + 1}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
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
                    opacity={isDimmed ? 0.25 : 1}
                    style={{ 
                      cursor: "pointer",
                      transition: "opacity 200ms",
                    }}
                    onClick={e => { e.stopPropagation(); setSelected(selected === node.id ? null : node.id); }}
                  >
                    {/* Outer halo glow */}
                    <circle 
                      r={radius + 14} 
                      fill={borderColor} 
                      opacity="0.04"
                      style={{ transition: "all 200ms", filter: "blur(4px)" }}
                    />
                    {/* Mid glow */}
                    <circle 
                      r={radius + 8} 
                      fill={borderColor} 
                      opacity="0.12"
                      style={{ transition: "all 200ms", filter: "blur(2px)" }}
                    />
                    {/* Main circle with enhanced depth */}
                    <circle 
                      r={radius} 
                      fill="white"
                      stroke={borderColor}
                      strokeWidth={isSelected ? 3 : 2}
                      opacity="0.98"
                      style={{ 
                        transition: "stroke-width 200ms",
                        backdropFilter: "blur(10px)",
                        boxShadow: `0 0 20px ${borderColor}33`
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
                    {/* Side indicator badge with background */}
                    <circle
                      r="14"
                      cy={-radius - 14}
                      fill={borderColor}
                      opacity="0.08"
                      style={{ backdropFilter: "blur(4px)" }}
                    />
                    <rect
                      x="-18"
                      y={-radius - 18}
                      width="36"
                      height="20"
                      rx="10"
                      fill={borderColor}
                      opacity="0.12"
                    />
                    <text 
                      textAnchor="middle"
                      y={-radius - 10}
                      fontSize="9"
                      fontWeight="800"
                      fill={borderColor}
                      style={{ pointerEvents: "none", userSelect: "none", letterSpacing: "0.5px" }}
                    >
                      {isEigen ? "OWN" : "OPP"}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Side panel on selection */}
          {selected && selectedEdges.length > 0 && (
            <div className="absolute top-6 right-6 bg-white/98 backdrop-blur-xl border border-gray-200 rounded-2xl shadow-2xl p-5 w-80 space-y-4 z-10">
              <div className="border-b border-gray-100 pb-3">
                <p className="text-sm font-bold text-gray-900 tracking-tight">{getTitle(selected)}</p>
                <p className="text-xs text-gray-500 mt-1.5 uppercase tracking-widest font-semibold">🔗 {selectedEdges.length} Verbindungen</p>
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
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Noch keine Argumente vorhanden</p>
              </div>
            </div>
          )}

          {/* Help text */}
           {nodes.length > 0 && edges.length === 0 && (
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-50/90 backdrop-blur-xl border border-blue-200 text-blue-700 text-xs rounded-2xl px-5 py-3 shadow-lg font-medium tracking-tight">
               ⚙️ Netzwerk wird aufgebaut... Verbindungen im Verkettungs-Tab hinzufügen
             </div>
           )}
        </div>
      </div>
    </div>
  );
}