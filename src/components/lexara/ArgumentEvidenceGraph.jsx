import { useState, useRef, useEffect, useCallback } from "react";

const NODE_R = 28;
const COLORS = {
  eigen: { fill: "#16a34a", stroke: "#14532d", text: "#fff", light: "#dcfce7" },
  gegner: { fill: "#dc2626", stroke: "#7f1d1d", text: "#fff", light: "#fee2e2" },
  evidence: { fill: "#2563eb", stroke: "#1e3a8a", text: "#fff", light: "#dbeafe" },
};

function layout(eigenArgs, gegnerArgs, evidence) {
  const nodes = [];
  const links = [];

  // Place eigen args on left arc, gegner on right arc
  const placeArc = (list, cx, cy, r, color) => {
    list.forEach((arg, i) => {
      const angle = (Math.PI / (list.length + 1)) * (i + 1) - Math.PI / 2;
      nodes.push({
        id: arg.id,
        label: arg.title?.slice(0, 18) || "?",
        fullLabel: arg.title || "?",
        type: "argument",
        side: arg.side,
        strength: arg.strength || 5,
        color,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    });
  };

  placeArc(eigenArgs, 220, 300, 160, COLORS.eigen);
  placeArc(gegnerArgs, 580, 300, 160, COLORS.gegner);

  // Place evidence nodes near their parent argument
  const argMap = {};
  nodes.forEach((n) => (argMap[n.id] = n));

  evidence.forEach((ev, i) => {
    const parent = argMap[ev.argument_id];
    if (!parent) return;
    const angle = (Math.PI * 2 * i) / Math.max(evidence.length, 1);
    const ex = parent.x + Math.cos(angle) * 70;
    const ey = parent.y + Math.sin(angle) * 70;
    nodes.push({
      id: `ev_${ev.id}`,
      label: ev.title?.slice(0, 14) || "Beweis",
      fullLabel: ev.title || "Beweis",
      type: "evidence",
      weight: ev.weight || 5,
      color: COLORS.evidence,
      x: ex,
      y: ey,
    });
    links.push({ source: parent.id, target: `ev_${ev.id}`, weight: ev.weight || 5 });
  });

  // Cross-links: arguments with same paragraph or connected via evidence
  eigenArgs.forEach((ea) => {
    gegnerArgs.forEach((ga) => {
      if (ea.is_contradiction || ga.is_contradiction) {
        links.push({ source: ea.id, target: ga.id, weight: 3, contradiction: true });
      }
    });
  });

  return { nodes, links };
}

export default function ArgumentEvidenceGraph({ args, evidence }) {
  const svgRef = useRef(null);
  const [positions, setPositions] = useState({});
  const [dragging, setDragging] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const eigenArgs = args.filter((a) => a.side === "eigen");
  const gegnerArgs = args.filter((a) => a.side === "gegner");
  const { nodes, links } = layout(eigenArgs, gegnerArgs, evidence);

  // Init positions
  useEffect(() => {
    const pos = {};
    nodes.forEach((n) => { pos[n.id] = { x: n.x, y: n.y }; });
    setPositions(pos);
  }, [args, evidence]);

  const getPos = (id) => positions[id] || { x: 0, y: 0 };

  const onMouseDown = useCallback((e, id) => {
    e.preventDefault();
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    const pos = positions[id] || { x: 0, y: 0 };
    setDragging(id);
    setOffset({ x: svgP.x - pos.x, y: svgP.y - pos.y });
  }, [positions]);

  const onMouseMove = useCallback((e) => {
    if (!dragging) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    setPositions((prev) => ({ ...prev, [dragging]: { x: svgP.x - offset.x, y: svgP.y - offset.y } }));
  }, [dragging, offset]);

  const onMouseUp = useCallback(() => setDragging(null), []);

  if (nodes.length === 0) return (
    <div className="text-center py-8 text-sm text-gray-400">Keine Argumente vorhanden — füge Argumente & Beweise hinzu.</div>
  );

  const svgW = 800, svgH = 600;

  return (
    <div className="relative bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white">
        <span className="text-xs font-semibold text-gray-600">🔗 Argument-Beweis-Graph (ziehbar)</span>
        <div className="flex items-center gap-4 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> Eigene Argumente</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> Gegner-Argumente</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> Beweise</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1 border-t-2 border-dashed border-red-400 inline-block" /> Widerspruch</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${svgW} ${svgH}`}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: dragging ? "grabbing" : "default" }}
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
          </marker>
          <marker id="arrow-red" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#f87171" />
          </marker>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="1" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Links */}
        {links.map((link, i) => {
          const s = getPos(link.source), t = getPos(link.target);
          const isContradiction = link.contradiction;
          const strokeW = Math.max(1, (link.weight / 10) * 4);
          return (
            <line
              key={i}
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={isContradiction ? "#f87171" : "#94a3b8"}
              strokeWidth={isContradiction ? 2 : strokeW}
              strokeDasharray={isContradiction ? "6 4" : undefined}
              markerEnd={isContradiction ? "url(#arrow-red)" : "url(#arrow)"}
              opacity={0.7}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = getPos(node.id);
          const isArg = node.type === "argument";
          const r = isArg ? NODE_R + (node.strength || 5) * 1.5 : 18;
          const isHovered = hovered === node.id;
          const c = node.color;
          return (
            <g
              key={node.id}
              transform={`translate(${pos.x},${pos.y})`}
              onMouseDown={(e) => onMouseDown(e, node.id)}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "grab" }}
            >
              <circle
                r={r}
                fill={c.fill}
                stroke={c.stroke}
                strokeWidth={isHovered ? 3 : 1.5}
                filter="url(#shadow)"
                opacity={isHovered ? 1 : 0.92}
              />
              {/* Strength ring for arguments */}
              {isArg && (
                <circle
                  r={r + 5}
                  fill="none"
                  stroke={c.fill}
                  strokeWidth={2}
                  strokeDasharray={`${(node.strength / 10) * (2 * Math.PI * (r + 5))} 999`}
                  opacity={0.4}
                  transform="rotate(-90)"
                />
              )}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill={c.text}
                fontSize={isArg ? 9 : 8}
                fontWeight={isArg ? "700" : "500"}
                style={{ userSelect: "none", pointerEvents: "none" }}
              >
                {node.label}
              </text>
              {isArg && (
                <text
                  y={r + 12}
                  textAnchor="middle"
                  fill="#374151"
                  fontSize={8}
                  style={{ userSelect: "none", pointerEvents: "none" }}
                >
                  {node.strength}/10
                </text>
              )}
              {/* Tooltip on hover */}
              {isHovered && (
                <g>
                  <rect x={r + 6} y={-20} width={Math.min(node.fullLabel.length * 6 + 12, 200)} height={36} rx={6} fill="#1f2937" opacity={0.92} />
                  <text x={r + 12} y={-5} fill="#fff" fontSize={9} fontWeight="600" style={{ userSelect: "none", pointerEvents: "none" }}>
                    {node.fullLabel.slice(0, 28)}
                  </text>
                  {isArg && (
                    <text x={r + 12} y={9} fill="#9ca3af" fontSize={8} style={{ userSelect: "none", pointerEvents: "none" }}>
                      Stärke: {node.strength}/10 · {node.side === "eigen" ? "Eigene Seite" : "Gegenseite"}
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}

        {/* Labels: section headers */}
        <text x={120} y={30} fontSize={11} fill="#16a34a" fontWeight="700" opacity={0.7}>EIGENE ARGUMENTE</text>
        <text x={480} y={30} fontSize={11} fill="#dc2626" fontWeight="700" opacity={0.7}>GEGNER-ARGUMENTE</text>
      </svg>

      <div className="px-4 py-2 border-t border-gray-100 bg-white flex items-center gap-4 text-[10px] text-gray-400">
        <span>💡 Knoten ziehen zum Neuanordnen</span>
        <span>· Linienstärke = Beweisstärke</span>
        <span>· Knotengröße = Argumentstärke</span>
        <span>· Gestrichelte Linie = Widerspruch</span>
      </div>
    </div>
  );
}