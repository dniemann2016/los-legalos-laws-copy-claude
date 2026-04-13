import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, Info, X, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const CONN_COLOR = {
  "stützt":      { stroke: "#22c55e", label: "stützt",      prob: +0.15 },
  "verstärkt":   { stroke: "#16a34a", label: "verstärkt",   prob: +0.20 },
  "kausal":      { stroke: "#3b82f6", label: "kausal",      prob: +0.12 },
  "entkräftet":  { stroke: "#ef4444", label: "entkräftet",  prob: -0.18 },
  "schwächt":    { stroke: "#f97316", label: "schwächt",    prob: -0.10 },
  "widerspricht":{ stroke: "#f59e0b", label: "widerspricht",prob: -0.15 },
  "schließt aus":{ stroke: "#6b7280", label: "schließt aus",prob: -0.25 },
};

function getProbColor(p) {
  if (p > 0.1) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (p < -0.1) return "text-red-500 bg-red-50 border-red-200";
  return "text-slate-500 bg-slate-50 border-slate-200";
}

// Map argument + deadline to a canvas X position based on date
function toX(dateStr, minMs, maxMs, w) {
  const ms = new Date(dateStr).getTime();
  if (maxMs === minMs) return w / 2;
  return ((ms - minMs) / (maxMs - minMs)) * (w - 80) + 40;
}
function toY(strength, h) {
  // strength 0-10, y inverted (top = high)
  return h - 40 - ((strength / 10) * (h - 80));
}

export default function ArgumentZeitstrahlChart({ caseId, args, deadlines = [], connections = [] }) {
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ w: 700, h: 380 });
  const [tooltip, setTooltip] = useState(null);
  const [selected, setSelected] = useState(null);
  const [kiLoading, setKiLoading] = useState(false);
  const [kiResult, setKiResult] = useState(null);
  const [showKiPanel, setShowKiPanel] = useState(false);

  useEffect(() => {
    const observe = () => {
      if (svgRef.current) {
        const w = svgRef.current.parentElement?.clientWidth || 700;
        setDims({ w: Math.max(w, 400), h: 380 });
      }
    };
    observe();
    window.addEventListener("resize", observe);
    return () => window.removeEventListener("resize", observe);
  }, []);

  if (args.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        Noch keine Argumente mit Zeitbezug vorhanden.
      </div>
    );
  }

  // Gather all dates for scale
  const allDates = [
    ...args.map(a => new Date(a.created_date).getTime()),
    ...deadlines.map(d => new Date(d.due_date).getTime()),
  ].filter(Boolean);
  const minMs = Math.min(...allDates);
  const maxMs = Math.max(...allDates);
  // Pad by 5%
  const range = maxMs - minMs || 1000 * 60 * 60 * 24 * 30;
  const padMs = range * 0.08;
  const scaleMin = minMs - padMs;
  const scaleMax = maxMs + padMs;

  const { w, h } = dims;

  const getPos = (a) => ({
    x: toX(a.created_date, scaleMin, scaleMax, w),
    y: toY(a.strength || a.ki_strength || 5, h),
  });

  // Build connection arcs
  const arcPaths = connections.map((conn) => {
    const from = args.find(a => a.id === conn.fromId);
    const to = args.find(a => a.id === conn.toId);
    if (!from || !to) return null;
    const p1 = getPos(from);
    const p2 = getPos(to);
    const mx = (p1.x + p2.x) / 2;
    const my = Math.min(p1.y, p2.y) - 30;
    return { conn, p1, p2, mx, my };
  }).filter(Boolean);

  // Ticker labels for x-axis (4-6 ticks)
  const ticks = 5;
  const xTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const ms = scaleMin + ((scaleMax - scaleMin) * i) / ticks;
    return { ms, x: toX(ms, scaleMin, scaleMax, w) };
  });

  const yTicks = [0, 2, 4, 6, 8, 10];

  // Calculate naive prognosis impact
  const naivePrognoseImpact = connections.reduce((sum, c) => {
    const base = CONN_COLOR[c.type]?.prob || 0;
    const scaled = base * ((c.intensitaet || 5) / 5);
    return sum + scaled;
  }, 0);

  // KI analysis
  const runKiAnalysis = async () => {
    if (args.length < 1) return;
    setKiLoading(true);
    setKiResult(null);
    const argDesc = args.map(a => `[${a.side === "eigen" ? "EIGEN" : "GEGNER"}] "${a.title}" | Stärke: ${a.strength || 5}/10 | Datum: ${format(new Date(a.created_date), "dd.MM.yyyy")}`).join("\n");
    const dlDesc = deadlines.length > 0 ? deadlines.map(d => `Frist: "${d.title}" | Datum: ${format(new Date(d.due_date), "dd.MM.yyyy")} | Status: ${d.status}`).join("\n") : "Keine Fristen";
    const connDesc = connections.length > 0 ? connections.map(c => {
      const f = args.find(a => a.id === c.fromId)?.title || c.fromId;
      const t = args.find(a => a.id === c.toId)?.title || c.toId;
      return `"${f}" ${c.type} "${t}" (Intensität ${c.intensitaet || 5}/10)`;
    }).join("\n") : "Keine Verbindungen";

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein KI-gestützter Rechtsanalyst. Analysiere die folgenden Argumente, Verbindungen und Fristen eines Rechtsstreits.\n\nARGUMENTE (chronologisch):\n${argDesc}\n\nVERBINDUNGEN:\n${connDesc}\n\nFRISTEN:\n${dlDesc}\n\nAufgabe:\n1. Berechne für jede Verbindung eine Wahrscheinlichkeit (0-100%), wie stark dieses Argument das andere tatsächlich beeinflusst.\n2. Berechne die Gesamtprognose-Auswirkung aller Argumente zusammen (-30% bis +30%).\n3. Identifiziere kritische zeitliche Abhängigkeiten (Fristen die Argumente beeinflussen).\n4. Gib eine strategische Handlungsempfehlung.\n\nSei präzise und verwende Wahrscheinlichkeitswerte.`,
      model: "claude_sonnet_4_6",
      response_json_schema: {
        type: "object",
        properties: {
          verbindungen_analyse: {
            type: "array",
            items: {
              type: "object",
              properties: {
                von_titel: { type: "string" },
                nach_titel: { type: "string" },
                typ: { type: "string" },
                einfluss_wahrscheinlichkeit: { type: "number" },
                erklaerung: { type: "string" }
              }
            }
          },
          prognose_delta: { type: "number" },
          prognose_erklaerung: { type: "string" },
          kritische_fristen: { type: "array", items: { type: "string" } },
          staerkste_argument: { type: "string" },
          schwaechste_stelle: { type: "string" },
          handlungsempfehlung: { type: "string" }
        }
      }
    });
    setKiResult(res);
    setKiLoading(false);
    setShowKiPanel(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs font-bold text-slate-700">📊 Argument-Zeitstrahl</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Y = Argumentstärke · X = Zeitpunkt · Verbindungen = Einfluss</p>
        </div>
        <button onClick={runKiAnalysis} disabled={kiLoading || args.length === 0}
          className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-2 rounded-xl hover:bg-violet-700 disabled:opacity-40 transition-colors font-semibold">
          {kiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {kiLoading ? "KI analysiert…" : "KI-Wahrscheinlichkeitsanalyse"}
        </button>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div ref={svgRef} className="w-full">
          <svg width={w} height={h} className="w-full" style={{ height: h }}>
            {/* Grid lines */}
            {yTicks.map(v => {
              const y = toY(v, h);
              return (
                <g key={v}>
                  <line x1={40} x2={w - 20} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
                  <text x={34} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{v}</text>
                </g>
              );
            })}
            {/* Y-axis label */}
            <text x={12} y={h / 2} fontSize={9} fill="#94a3b8" transform={`rotate(-90, 12, ${h / 2})`} textAnchor="middle">Stärke</text>

            {/* X-axis */}
            <line x1={40} x2={w - 20} y1={h - 40} y2={h - 40} stroke="#e2e8f0" strokeWidth={1} />
            {xTicks.map((t, i) => (
              <g key={i}>
                <line x1={t.x} x2={t.x} y1={h - 44} y2={h - 36} stroke="#cbd5e1" strokeWidth={1} />
                <text x={t.x} y={h - 24} textAnchor="middle" fontSize={9} fill="#94a3b8">
                  {format(new Date(t.ms), "dd.MM.yy")}
                </text>
              </g>
            ))}

            {/* Deadline markers */}
            {deadlines.map((d, i) => {
              const x = toX(new Date(d.due_date).getTime(), scaleMin, scaleMax, w);
              const color = d.status === "versaeumt" ? "#ef4444" : d.status === "erledigt" ? "#22c55e" : "#f97316";
              return (
                <g key={`dl-${i}`}>
                  <line x1={x} x2={x} y1={40} y2={h - 40} stroke={color} strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
                  <rect x={x - 20} y={24} width={40} height={14} rx={4} fill={color} opacity={0.15} />
                  <text x={x} y={34} textAnchor="middle" fontSize={8} fill={color} fontWeight="600">
                    {d.title?.slice(0, 8)}…
                  </text>
                </g>
              );
            })}

            {/* Connection arcs */}
            {arcPaths.map((arc, i) => {
              const col = CONN_COLOR[arc.conn.type] || { stroke: "#94a3b8" };
              const intensity = (arc.conn.intensitaet || 5) / 10;
              const prob = arc.conn.ki_wahrscheinlichkeit;
              return (
                <g key={`arc-${i}`}>
                  <path
                    d={`M ${arc.p1.x} ${arc.p1.y} Q ${arc.mx} ${arc.my} ${arc.p2.x} ${arc.p2.y}`}
                    fill="none" stroke={col.stroke} strokeWidth={1 + intensity * 2}
                    strokeOpacity={0.4 + intensity * 0.4} strokeDasharray={arc.conn.type === "schließt aus" ? "6,3" : undefined}
                  />
                  {/* midpoint label */}
                  <text x={arc.mx} y={arc.my - 4} textAnchor="middle" fontSize={8} fill={col.stroke} fontWeight="600">
                    {arc.conn.type}{prob != null ? ` (${Math.round(prob)}%)` : ""}
                  </text>
                </g>
              );
            })}

            {/* Argument nodes */}
            {args.map((a) => {
              const pos = getPos(a);
              const isEigen = a.side === "eigen";
              const fill = isEigen ? "#3b82f6" : "#ef4444";
              const r = 7 + (a.strength || 5) * 0.8;
              const isSel = selected?.id === a.id;
              return (
                <g key={a.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelected(selected?.id === a.id ? null : a)}
                  onMouseEnter={(e) => setTooltip({ a, x: pos.x, y: pos.y })}
                  onMouseLeave={() => setTooltip(null)}>
                  <circle cx={pos.x} cy={pos.y} r={r + 3} fill={fill} opacity={isSel ? 0.2 : 0.08} />
                  <circle cx={pos.x} cy={pos.y} r={r} fill={fill} opacity={0.9}
                    stroke={isSel ? "#1e40af" : "white"} strokeWidth={isSel ? 2.5 : 1.5} />
                  <text x={pos.x} y={pos.y + 3} textAnchor="middle" fontSize={8} fill="white" fontWeight="bold">
                    {a.strength || 5}
                  </text>
                  {/* Label below */}
                  <text x={pos.x} y={pos.y + r + 12} textAnchor="middle" fontSize={9} fill="#334155" fontWeight="500"
                    style={{ pointerEvents: "none" }}>
                    {(a.title || "").slice(0, 18)}{a.title?.length > 18 ? "…" : ""}
                  </text>
                </g>
              );
            })}

            {/* Tooltip */}
            {tooltip && (() => {
              const tx = Math.min(tooltip.x + 10, w - 190);
              const ty = Math.max(tooltip.y - 50, 10);
              const a = tooltip.a;
              return (
                <g>
                  <rect x={tx} y={ty} width={185} height={62} rx={6} fill="white" stroke="#e2e8f0" strokeWidth={1} filter="url(#shadow)" />
                  <text x={tx + 8} y={ty + 14} fontSize={10} fill={a.side === "eigen" ? "#2563eb" : "#dc2626"} fontWeight="700">
                    {a.side === "eigen" ? "⚖ EIGEN" : "⚔ GEGNER"}
                  </text>
                  <text x={tx + 8} y={ty + 27} fontSize={9} fill="#334155">{(a.title || "").slice(0, 30)}</text>
                  <text x={tx + 8} y={ty + 40} fontSize={9} fill="#64748b">Stärke: {a.strength || 5}/10</text>
                  <text x={tx + 8} y={ty + 52} fontSize={9} fill="#94a3b8">{format(new Date(a.created_date), "dd.MM.yyyy")}</text>
                </g>
              );
            })()}

            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
              </filter>
            </defs>
          </svg>
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-slate-50 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500 opacity-90" /><span className="text-[10px] text-slate-500">Eigene Argumente</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500 opacity-90" /><span className="text-[10px] text-slate-500">Gegnerargumente</span></div>
          <div className="flex items-center gap-1.5"><div className="w-8 h-0.5 bg-orange-400 opacity-60 border-dashed border" style={{ borderStyle: "dashed" }} /><span className="text-[10px] text-slate-500">Frist</span></div>
          <div className="flex items-center gap-1.5"><span className="text-[10px] text-slate-400 italic">Knotengröße = Argumentstärke</span></div>
          {connections.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5 text-[10px]">
              <TrendingUp className="w-3 h-3 text-slate-400" />
              <span className="text-slate-400">Naive Prognose-Δ:</span>
              <span className={`font-bold ${naivePrognoseImpact > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {naivePrognoseImpact > 0 ? "+" : ""}{Math.round(naivePrognoseImpact * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Selected argument detail */}
      {selected && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${selected.side === "eigen" ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}>
                {selected.side === "eigen" ? "⚖ EIGENES ARGUMENT" : "⚔ GEGENARGUMENT"}
              </div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">{selected.title}</h4>
              {selected.description && <p className="text-xs text-slate-500 mb-2">{selected.description}</p>}
              <div className="flex gap-3 text-xs text-slate-400">
                <span>Stärke: <strong className="text-slate-700">{selected.strength || 5}/10</strong></span>
                <span>Eingetragen: <strong className="text-slate-700">{format(new Date(selected.created_date), "dd.MM.yyyy")}</strong></span>
                {selected.type && <span>Typ: <strong className="text-slate-700">{selected.type}</strong></span>}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-300 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          {/* Connections from/to this argument */}
          {(() => {
            const related = connections.filter(c => c.fromId === selected.id || c.toId === selected.id);
            if (!related.length) return <p className="text-[10px] text-slate-300 mt-3">Keine Verbindungen zu diesem Argument.</p>;
            return (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verbindungen</p>
                {related.map((c, i) => {
                  const isFrom = c.fromId === selected.id;
                  const other = args.find(a => a.id === (isFrom ? c.toId : c.fromId));
                  const col = CONN_COLOR[c.type] || { prob: 0 };
                  const prob = c.ki_wahrscheinlichkeit;
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">{isFrom ? "→" : "←"}</span>
                      <span className="font-medium text-slate-700">{other?.title?.slice(0, 30) || "?"}</span>
                      <span className={`text-[10px] px-2 py-0.5 border rounded-full font-semibold ${getProbColor(col.prob)}`}>
                        {c.type}{prob != null ? ` · ${Math.round(prob)}%` : ""}
                      </span>
                      {c.intensitaet && <span className="text-[10px] text-slate-300">Intensität: {c.intensitaet}/10</span>}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* KI Panel */}
      {showKiPanel && kiResult && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <p className="text-sm font-bold text-violet-800">KI-Wahrscheinlichkeitsanalyse</p>
            </div>
            <button onClick={() => setShowKiPanel(false)} className="text-violet-300 hover:text-violet-600"><X className="w-4 h-4" /></button>
          </div>

          {/* Prognose Delta */}
          <div className={`rounded-xl p-3 border ${(kiResult.prognose_delta || 0) > 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <p className={`text-sm font-bold ${(kiResult.prognose_delta || 0) > 0 ? "text-emerald-700" : "text-red-700"}`}>
              KI-Prognose-Auswirkung: {kiResult.prognose_delta > 0 ? "+" : ""}{kiResult.prognose_delta}%
            </p>
            {kiResult.prognose_erklaerung && <p className="text-xs mt-1 text-slate-600">{kiResult.prognose_erklaerung}</p>}
          </div>

          {/* Verbindungen */}
          {kiResult.verbindungen_analyse?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Einfluss-Wahrscheinlichkeiten</p>
              {kiResult.verbindungen_analyse.map((v, i) => (
                <div key={i} className="bg-white rounded-xl border border-violet-100 p-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-slate-700">{v.von_titel}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${CONN_COLOR[v.typ] ? getProbColor(CONN_COLOR[v.typ].prob) : "text-slate-500 bg-slate-50 border-slate-200"}`}>{v.typ}</span>
                    <span className="text-slate-400 text-xs">→</span>
                    <span className="text-xs font-semibold text-slate-700">{v.nach_titel}</span>
                    <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full border ${v.einfluss_wahrscheinlichkeit >= 60 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : v.einfluss_wahrscheinlichkeit >= 35 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                      {v.einfluss_wahrscheinlichkeit}%
                    </span>
                  </div>
                  {v.erklaerung && <p className="text-[10px] text-slate-500 italic">{v.erklaerung}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Kritische Fristen */}
          {kiResult.kritische_fristen?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-2">Kritische Fristen</p>
              <div className="space-y-1">
                {kiResult.kritische_fristen.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                    <span className="text-orange-500 mt-0.5">⏰</span>{f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stärken & Schwächen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {kiResult.staerkste_argument && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-[10px] font-bold text-emerald-600 mb-1">💪 Stärkstes Argument</p>
                <p className="text-xs text-emerald-800">{kiResult.staerkste_argument}</p>
              </div>
            )}
            {kiResult.schwaechste_stelle && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-[10px] font-bold text-red-600 mb-1">⚠ Schwächste Stelle</p>
                <p className="text-xs text-red-800">{kiResult.schwaechste_stelle}</p>
              </div>
            )}
          </div>

          {kiResult.handlungsempfehlung && (
            <div className="bg-violet-900 text-white rounded-xl p-4">
              <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest mb-1">Strategische Empfehlung</p>
              <p className="text-xs leading-relaxed">{kiResult.handlungsempfehlung}</p>
            </div>
          )}

          <p className="text-[10px] text-violet-400 text-center">Analyse via Claude Sonnet · Nur zur Orientierung, kein Rechtsgutachten</p>
        </div>
      )}
    </div>
  );
}