import { useState, useEffect, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

const EDGE_COLORS = {
  "stützt": "#16a34a",
  "entkräftet": "#ef4444",
  "schließt aus": "#6b7280",
  "kausal": "#3b82f6",
  "widerspricht": "#f97316",
  "schwächt": "#d97706",
  "verstärkt": "#059669",
};

const EDGE_LABELS = {
  "stützt": "stützt",
  "entkräftet": "entkräftet",
  "schließt aus": "schließt aus",
  "kausal": "kausal",
  "widerspricht": "widerspricht",
  "schwächt": "schwächt",
  "verstärkt": "verstärkt",
};

function useForceLayout(nodes, edges, width, height) {
  const [positions, setPositions] = useState({});
  const animRef = useRef(null);
  const posRef = useRef({});
  const velRef = useRef({});

  const initPositions = useCallback(() => {
    const pos = {};
    const vel = {};
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      const r = Math.min(width, height) * 0.3;
      pos[n.id] = { x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle) };
      vel[n.id] = { x: 0, y: 0 };
    });
    posRef.current = pos;
    velRef.current = vel;
    setPositions({ ...pos });
  }, [nodes, width, height]);

  useEffect(() => {
    if (nodes.length === 0) return;
    initPositions();
  }, [nodes.length, width, height]);

  useEffect(() => {
    if (nodes.length === 0) return;
    let running = true;

    const tick = () => {
      if (!running) return;
      const pos = posRef.current;
      const vel = velRef.current;
      const ids = nodes.map(n => n.id);

      // Repulsion
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = pos[ids[i]], b = pos[ids[j]];
          if (!a || !b) continue;
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 8000 / (dist * dist);
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          vel[ids[i]].x += fx; vel[ids[i]].y += fy;
          vel[ids[j]].x -= fx; vel[ids[j]].y -= fy;
        }
      }

      // Attraction (edges)
      edges.forEach(e => {
        const a = pos[e.fromId], b = pos[e.toId];
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const ideal = 180;
        const force = (dist - ideal) * 0.04;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        vel[e.fromId].x += fx; vel[e.fromId].y += fy;
        vel[e.toId].x -= fx; vel[e.toId].y -= fy;
      });

      // Center gravity
      ids.forEach(id => {
        if (!pos[id]) return;
        vel[id].x += (width / 2 - pos[id].x) * 0.01;
        vel[id].y += (height / 2 - pos[id].y) * 0.01;
      });

      // Apply + dampen
      ids.forEach(id => {
        if (!pos[id] || !vel[id]) return;
        vel[id].x *= 0.8; vel[id].y *= 0.8;
        pos[id].x = Math.max(60, Math.min(width - 60, pos[id].x + vel[id].x));
        pos[id].y = Math.max(50, Math.min(height - 50, pos[id].y + vel[id].y));
      });

      setPositions({ ...pos });
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    // Stop after 3s to save CPU
    const stopTimer = setTimeout(() => { running = false; }, 3000);
    return () => { running = false; cancelAnimationFrame(animRef.current); clearTimeout(stopTimer); };
  }, [nodes.length, edges.length, width, height]);

  return { positions, reinit: initPositions };
}

export default function ArgumentGraph({ args, onClose }) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 520 });
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(null);
  const posRef2 = useRef({});

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
      if (c.targetId) edges.push({ fromId: a.id, toId: c.targetId, type: c.type || "stützt", explanation: c.explanation || "", intensitaet: c.intensitaet ?? 5 });
    });
  });

  const { positions, reinit } = useForceLayout(nodes, edges, dims.w, dims.h);

  // Drag
  const handleMouseDown = (e, id) => {
    e.preventDefault();
    setDragging(id);
  };
  const handleMouseMove = useCallback((e) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    posRef2.current[dragging] = { x, y };
    // manually update positions ref (bypass force)
    positions[dragging] = { x, y };
  }, [dragging, zoom, positions]);
  const handleMouseUp = () => setDragging(null);

  const selectedEdges = selected ? edges.filter(e => e.fromId === selected || e.toId === selected) : [];
  const connectedIds = new Set(selectedEdges.flatMap(e => [e.fromId, e.toId]));

  const getTitle = (id) => { const n = nodes.find(x => x.id === id); return n ? (n.title.length > 30 ? n.title.slice(0, 30) + "…" : n.title) : ""; };

  // Arrow marker IDs per type
  const markerTypes = [...new Set(edges.map(e => e.type))];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col" style={{ height: "90vh" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-base">🕸️ Argumentationsgraph</h2>
            <p className="text-xs text-gray-400">{nodes.length} Argumente · {edges.length} Verbindungen</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 mr-4">
              {Object.entries(EDGE_COLORS).slice(0, 5).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1">
                  <div className="w-5 h-0.5 rounded" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-gray-500">{type}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={reinit} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Neu anordnen"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Graph */}
        <div ref={containerRef} className="flex-1 overflow-hidden relative bg-gray-50 rounded-b-2xl"
          onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <svg width="100%" height="100%" style={{ cursor: dragging ? "grabbing" : "default" }}>
            <defs>
              {markerTypes.map(type => (
                <marker key={type} id={`arrow-${type.replace(/\s/g, "_")}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill={EDGE_COLORS[type] || "#9ca3af"} />
                </marker>
              ))}
            </defs>

            <g transform={`scale(${zoom})`} style={{ transformOrigin: "center center" }}>
              {/* Edges */}
              {edges.map((edge, i) => {
                const from = positions[edge.fromId];
                const to = positions[edge.toId];
                if (!from || !to) return null;
                const color = EDGE_COLORS[edge.type] || "#9ca3af";
                const isHighlighted = selected && selectedEdges.includes(edge);
                const isDimmed = selected && !isHighlighted;
                const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
                const dx = to.x - from.x, dy = to.y - from.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                // shorten to node radius
                const nr = 36;
                const sx = from.x + (dx / len) * nr, sy = from.y + (dy / len) * nr;
                const ex = to.x - (dx / len) * nr, ey = to.y - (dy / len) * nr;
                const strokeW = Math.max(1, (edge.intensitaet || 5) * 0.4);
                return (
                  <g key={i} opacity={isDimmed ? 0.15 : 1}>
                    <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={strokeW}
                      strokeDasharray={edge.type === "schließt aus" ? "5,4" : undefined}
                      markerEnd={`url(#arrow-${edge.type.replace(/\s/g, "_")})`} />
                    <text x={mx} y={my - 6} textAnchor="middle" fontSize={9} fill={color} fontWeight="600"
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                      {EDGE_LABELS[edge.type] || edge.type}
                      {edge.intensitaet ? ` (${edge.intensitaet})` : ""}
                    </text>
                    {edge.explanation && (
                      <text x={mx} y={my + 6} textAnchor="middle" fontSize={8} fill="#9ca3af"
                        style={{ pointerEvents: "none", userSelect: "none" }}>
                        {edge.explanation.slice(0, 30)}
                      </text>
                    )}
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
                const fillColor = isEigen ? "#dbeafe" : "#fee2e2";
                const borderColor = isSelected ? "#1f2937" : (isEigen ? "#3b82f6" : "#ef4444");
                const r = 36 + Math.round(node.strength) * 1.5;
                return (
                  <g key={node.id} transform={`translate(${pos.x},${pos.y})`}
                    style={{ cursor: "grab" }} opacity={isDimmed ? 0.2 : 1}
                    onMouseDown={e => handleMouseDown(e, node.id)}
                    onClick={e => { e.stopPropagation(); setSelected(selected === node.id ? null : node.id); }}>
                    <circle r={r} fill={fillColor} stroke={borderColor} strokeWidth={isSelected ? 3 : 1.5} />
                    {/* Strength ring */}
                    <circle r={r} fill="none" stroke={borderColor} strokeWidth={2} strokeOpacity={0.3}
                      strokeDasharray={`${(node.strength / 10) * 2 * Math.PI * r} ${2 * Math.PI * r}`}
                      transform="rotate(-90)" />
                    <text textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight="600"
                      fill={isEigen ? "#1d4ed8" : "#b91c1c"}
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                      {node.title.length > 16 ? node.title.slice(0, 16) + "…" : node.title}
                    </text>
                    <text y={13} textAnchor="middle" dominantBaseline="central" fontSize={8}
                      fill={isEigen ? "#93c5fd" : "#fca5a5"}
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                      M:{node.strength}
                    </text>
                    {node.ki_strength !== null && node.ki_strength !== undefined && (
                      <text y={24} textAnchor="middle" dominantBaseline="central" fontSize={8}
                        fill="#a78bfa"
                        style={{ pointerEvents: "none", userSelect: "none" }}>
                        KI:{node.ki_strength}
                      </text>
                    )}
                    <text y={-r - 6} textAnchor="middle" fontSize={8} fontWeight="700"
                      fill={isEigen ? "#3b82f6" : "#ef4444"}
                      style={{ pointerEvents: "none", userSelect: "none" }}>
                      {isEigen ? "▲ Eigen" : "▼ Gegner"}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Side panel on selection */}
          {selected && selectedEdges.length > 0 && (
            <div className="absolute top-4 right-4 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-64 space-y-2 z-10">
              <p className="text-xs font-bold text-gray-700">{getTitle(selected)}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">{selectedEdges.length} Verbindungen</p>
              {selectedEdges.map((e, i) => {
                const color = EDGE_COLORS[e.type] || "#9ca3af";
                const isFrom = e.fromId === selected;
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-gray-500">{isFrom ? "→" : "←"}</span>
                    <span className="font-medium text-gray-700 truncate">{getTitle(isFrom ? e.toId : e.fromId)}</span>
                    <span className="text-gray-400 whitespace-nowrap">{e.type}</span>
                  </div>
                );
              })}
            </div>
          )}

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              Keine Argumente vorhanden.
            </div>
          )}
          {nodes.length > 0 && edges.length === 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg px-4 py-2">
              Noch keine Verbindungen — füge sie im Verkettungs-Tab hinzu.
            </div>
          )}
          <div className="absolute bottom-3 left-3 text-[10px] text-gray-400">Knoten ziehen · Klicken zum Hervorheben · 🔄 für neue Anordnung</div>
        </div>
      </div>
    </div>
  );
}