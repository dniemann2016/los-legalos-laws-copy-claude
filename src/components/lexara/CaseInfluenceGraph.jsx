import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Network, Clock, Zap, Filter, X } from "lucide-react";

const GraphView = ({ args, evidence, deadlines, persons }) => {
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("network"); // network, timeline, sankey
  const [filterType, setFilterType] = useState("all");

  const nodes = useMemo(() => {
    const items = [];
    args.forEach((a) =>
      items.push({
        id: a.id,
        label: a.title,
        type: "argument",
        strength: a.ki_strength || a.strength || 5,
        color: a.side === "eigen" ? "#3b82f6" : "#ef4444",
      })
    );
    evidence.forEach((e) =>
      items.push({
        id: e.id,
        label: e.title,
        type: "evidence",
        strength: e.ki_weight || e.weight || 5,
        color: "#10b981",
      })
    );
    deadlines.forEach((d) =>
      items.push({
        id: d.id,
        label: d.title,
        type: "deadline",
        strength: 7,
        color: "#f59e0b",
        date: d.due_date,
      })
    );
    persons.forEach((p) =>
      items.push({
        id: p.id,
        label: p.name,
        type: "person",
        strength: p.glaubwuerdigkeit || 5,
        color: "#a855f7",
      })
    );
    return items;
  }, [args, evidence, deadlines, persons]);

  const edges = useMemo(() => {
    const links = [];
    args.forEach((a) => {
      if (a.evidence_ids && a.evidence_ids.length > 0) {
        a.evidence_ids.forEach((eid) => {
          links.push({
            source: eid,
            target: a.id,
            weight: a.ki_strength || a.strength || 5,
            type: "supports",
          });
        });
      }
    });
    return links;
  }, [args]);

  const filteredNodes =
    filterType === "all"
      ? nodes
      : nodes.filter((n) => n.type === filterType);
  const filteredEdges =
    filterType === "all"
      ? edges
      : edges.filter(
          (e) =>
            filteredNodes.some((n) => n.id === e.source) &&
            filteredNodes.some((n) => n.id === e.target)
        );

  const getNodeSize = (node) => {
    const base = 30;
    return base + (node.strength || 5) * 2;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap bg-white p-3 rounded-lg border border-gray-200">
        <button
          onClick={() => setView("network")}
          className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-medium transition-all ${
            view === "network"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Network className="w-4 h-4" /> Netzwerk
        </button>
        <button
          onClick={() => setView("timeline")}
          className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-medium transition-all ${
            view === "timeline"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Clock className="w-4 h-4" /> Zeitachse
        </button>
        <button
          onClick={() => setView("sankey")}
          className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-medium transition-all ${
            view === "sankey"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Zap className="w-4 h-4" /> Flow
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1"
          >
            <option value="all">Alle Typen</option>
            <option value="argument">Nur Argumente</option>
            <option value="evidence">Nur Beweise</option>
            <option value="deadline">Nur Fristen</option>
            <option value="person">Nur Personen</option>
          </select>
        </div>
      </div>

      {view === "network" && (
        <NetworkView
          nodes={filteredNodes}
          edges={filteredEdges}
          selected={selected}
          setSelected={setSelected}
          getNodeSize={getNodeSize}
        />
      )}

      {view === "timeline" && (
        <TimelineView nodes={filteredNodes} edges={filteredEdges} />
      )}

      {view === "sankey" && (
        <SankeyView
          args={args}
          evidence={evidence}
          deadlines={deadlines}
          selected={selected}
          setSelected={setSelected}
        />
      )}

      {selected && (
        <DetailsPanel
          node={nodes.find((n) => n.id === selected)}
          edges={edges.filter((e) => e.source === selected || e.target === selected)}
          allNodes={nodes}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

function NetworkView({ nodes, edges, selected, setSelected, getNodeSize }) {
  const svgWidth = 800;
  const svgHeight = 500;

  // Einfaches Force-Layout
  const positions = useMemo(() => {
    const pos = {};
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const radius = 150;
      pos[n.id] = {
        x: svgWidth / 2 + radius * Math.cos(angle),
        y: svgHeight / 2 + radius * Math.sin(angle),
      };
    });
    return pos;
  }, [nodes]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3 text-gray-900">🕸️ Abhängigkeitsnetzwerk</h3>
      <svg
        width="100%"
        height={svgHeight}
        className="border border-gray-100 rounded bg-gradient-to-br from-gray-50 to-white"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      >
        {/* Kanten */}
        {edges.map((edge, i) => {
          const from = positions[edge.source];
          const to = positions[edge.target];
          if (!from || !to) return null;
          const width = Math.max(1, (edge.weight / 10) * 4);
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#d1d5db"
              strokeWidth={width}
              opacity={0.6}
            />
          );
        })}

        {/* Knoten */}
        {nodes.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;
          const size = getNodeSize(node);
          const isSelected = selected === node.id;
          return (
            <g key={node.id} onClick={() => setSelected(node.id)} style={{ cursor: "pointer" }}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={size}
                fill={node.color}
                opacity={isSelected ? 1 : 0.7}
                stroke={isSelected ? "#000" : "none"}
                strokeWidth={3}
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight="bold"
                fill="white"
                pointerEvents="none"
              >
                {node.label.substring(0, 12)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex gap-2 flex-wrap">
        {nodes.map((n) => (
          <span
            key={n.id}
            onClick={() => setSelected(n.id)}
            className={`text-xs px-2 py-1 rounded cursor-pointer transition-all ${
              selected === n.id ? "ring-2 ring-gray-900" : ""
            }`}
            style={{
              backgroundColor: n.color + "20",
              color: n.color,
              border: `1px solid ${n.color}`,
            }}
          >
            {n.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TimelineView({ nodes, edges }) {
  const datedNodes = nodes.filter((n) => n.date);
  const sorted = [...datedNodes].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3 text-gray-900">📅 Chronologische Zeitachse</h3>
      <div className="space-y-2">
        {sorted.length === 0 ? (
          <p className="text-xs text-gray-500">Keine datierten Einträge</p>
        ) : (
          sorted.map((node) => (
            <div
              key={node.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: node.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900">{node.label}</p>
                <p className="text-[10px] text-gray-500">
                  {new Date(node.date).toLocaleDateString("de-DE")}
                </p>
              </div>
              <span
                className="text-xs font-bold px-2 py-1 rounded"
                style={{
                  backgroundColor: node.color + "20",
                  color: node.color,
                }}
              >
                {node.type}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SankeyView({ args, evidence, deadlines, selected, setSelected }) {
  const totalStrength = args.reduce((sum, a) => sum + (a.ki_strength || a.strength || 5), 0) || 1;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3 text-gray-900">⚡ Wirkungsfluss (Argument → Frist → Ergebnis)</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <p className="font-bold text-gray-700 mb-2">🔵 ARGUMENTE</p>
            {args.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelected(a.id)}
                className="text-[10px] text-gray-600 hover:text-blue-600 cursor-pointer truncate mb-1"
                title={a.title}
              >
                {a.title.substring(0, 20)}
              </div>
            ))}
          </div>

          <div>
            <p className="font-bold text-gray-700 mb-2">🟢 BEWEISE</p>
            {evidence.map((e) => (
              <div
                key={e.id}
                onClick={() => setSelected(e.id)}
                className="text-[10px] text-gray-600 hover:text-green-600 cursor-pointer truncate mb-1"
                title={e.title}
              >
                {e.title.substring(0, 20)}
              </div>
            ))}
          </div>

          <div>
            <p className="font-bold text-gray-700 mb-2">🟠 FRISTEN</p>
            {deadlines.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelected(d.id)}
                className="text-[10px] text-gray-600 hover:text-amber-600 cursor-pointer truncate mb-1"
                title={d.title}
              >
                {d.title.substring(0, 20)}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded p-3 text-xs text-gray-600">
          <p className="font-semibold text-gray-700 mb-1">📊 Stärke-Analyse:</p>
          <div className="space-y-1">
            {args.map((a) => {
              const pct = ((a.ki_strength || a.strength || 5) / totalStrength) * 100;
              return (
                <div key={a.id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="truncate">{a.title.substring(0, 25)}</span>
                    <span className="font-bold">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailsPanel({ node, edges, allNodes, onClose }) {
  const relatedNodes = edges.map((e) => {
    const otherId = e.source === node.id ? e.target : e.source;
    return allNodes.find((n) => n.id === otherId);
  });

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-900 rounded-lg p-4 w-80 shadow-lg z-50">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Knoten-Details</p>
          <h3 className="text-sm font-bold text-gray-900">{node.label}</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 mb-3">
        <div>
          <p className="text-xs font-semibold text-gray-600">Typ</p>
          <span
            className="text-xs px-2 py-1 rounded inline-block"
            style={{
              backgroundColor: node.color + "20",
              color: node.color,
            }}
          >
            {node.type}
          </span>
        </div>

        {node.strength && (
          <div>
            <p className="text-xs font-semibold text-gray-600">Stärke/Gewicht</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${(node.strength / 10) * 100}%`,
                  backgroundColor: node.color,
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{node.strength}/10</p>
          </div>
        )}

        {relatedNodes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Verbundene Knoten ({relatedNodes.length})</p>
            <div className="space-y-1">
              {relatedNodes.map((n) => (
                <div key={n?.id} className="text-xs p-1 bg-gray-50 rounded border border-gray-100">
                  {n?.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        className="w-full px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-gray-800"
      >
        Schließen
      </button>
    </div>
  );
}

export default function CaseInfluenceGraph({ caseId }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
      base44.entities.Deadline.filter({ case_id: caseId }),
      base44.entities.Person.filter({ case_id: caseId }),
    ]).then(([a, e, d, p]) => {
      setArgs(a);
      setEvidence(e);
      setDeadlines(d);
      setPersons(p);
      setLoading(false);
    });
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (args.length === 0 && evidence.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500 text-sm">
        Keine Daten zum Visualisieren. Fügen Sie zunächst Argumente, Beweise oder Fristen hinzu.
      </div>
    );
  }

  return <GraphView args={args} evidence={evidence} deadlines={deadlines} persons={persons} />;
}