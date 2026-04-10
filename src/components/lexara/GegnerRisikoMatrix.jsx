import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUADRANTS = [
  { x: 0, y: 0, w: "50%", h: "50%", color: "#fef9c3", label: "Beobachten", labelColor: "#713f12" },
  { x: "50%", y: 0, w: "50%", h: "50%", color: "#fef3c7", label: "Vorbereiten", labelColor: "#92400e" },
  { x: 0, y: "50%", w: "50%", h: "50%", color: "#dcfce7", label: "Gering", labelColor: "#166534" },
  { x: "50%", y: "50%", w: "50%", h: "50%", color: "#fee2e2", label: "KRITISCH", labelColor: "#991b1b" },
];

const TYPE_COLORS = {
  gegner: "#dc2626",
  eigen: "#16a34a",
  risiko: "#d97706",
};

export default function GegnerRisikoMatrix({ caseId, caseData }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [error, setError] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const [args, deadlines] = await Promise.all([
        base44.entities.Argument.filter({ case_id: caseId }),
        base44.entities.Deadline.filter({ case_id: caseId }),
      ]);
      const gegnerArgs = args.filter(a => a.side === "gegner");
      const eigenArgs = args.filter(a => a.side === "eigen");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist Prozessanwalt. Bewerte folgende Argumente und Risiken für eine 2x2-Risikomatrix.
        
Fall: ${caseData?.fallname || ""} | Rechtsgebiet: ${caseData?.rechtsgebiet || ""}
Streitwert: ${caseData?.streitwert || "unbekannt"} EUR

Bewerte jedes Item auf zwei Achsen (0–100):
- eintrittswahrscheinlichkeit: Wie wahrscheinlich ist, dass dieses Argument/Risiko den Fall entscheidend beeinflusst?
- finanzieller_schaden: Wie groß wäre der finanzielle Schaden wenn dieses Risiko eintritt? (0=minimal, 100=katastrophal)

GEGNER-ARGUMENTE (einordnen als Risiken für uns):
${gegnerArgs.map((a, i) => `${i+1}. "${a.title}" (Stärke: ${a.strength || 5}/10): ${a.description || ""}`).join("\n")}

EIGENE SCHWACHSTELLEN (falls Gegenargumente fehlen):
${eigenArgs.filter(a => (a.strength || 5) < 5).map((a, i) => `${i+1}. "${a.title}" (schwach: ${a.strength}/10)`).join("\n")}

VERSÄUMTE FRISTEN:
${deadlines.filter(d => d.status === "versaeumt").map(d => `- ${d.title}`).join("\n") || "Keine"}

Gib für jedes Item zurück: id (index), name (Kurzname max 25 Zeichen), eintrittswahrscheinlichkeit (0-100), finanzieller_schaden (0-100), typ (gegner/eigen/frist), empfehlung (1 Satz Gegenmaßnahme).`,
        response_json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  eintrittswahrscheinlichkeit: { type: "number" },
                  finanzieller_schaden: { type: "number" },
                  typ: { type: "string" },
                  empfehlung: { type: "string" },
                  original_title: { type: "string" }
                }
              }
            }
          }
        }
      });
      setItems(result.items || []);
      setAnalyzed(true);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const SIZE = 400;
  const PAD = 40;
  const PLOT = SIZE - PAD * 2;

  const toSvgX = (val) => PAD + (val / 100) * PLOT;
  const toSvgY = (val) => PAD + ((100 - val) / 100) * PLOT;

  const criticalItems = items.filter(i => i.eintrittswahrscheinlichkeit >= 50 && i.finanzieller_schaden >= 50);
  const watchItems = items.filter(i => i.eintrittswahrscheinlichkeit >= 50 && i.finanzieller_schaden < 50);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">⚠️ Risikomatrix — Gegenargumente & Prozessrisiken</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Eintrittswahrscheinlichkeit vs. finanzieller Schaden — KI-gestützte Einordnung</p>
          </div>
          <Button size="sm" onClick={runAnalysis} disabled={loading} className="bg-gray-900 text-white text-xs gap-1.5">
            {loading ? <><RefreshCw className="w-3 h-3 animate-spin" /> Analysiere...</> : analyzed ? <><RefreshCw className="w-3 h-3" /> Neu analysieren</> : "🎯 Matrix erstellen"}
          </Button>
        </div>

        {!analyzed && !loading && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
            Klicke auf "Matrix erstellen" um alle Gegenargumente automatisch einzuordnen
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16 text-xs text-gray-400 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> KI bewertet alle Risiken…
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">⚠️ {error}</div>}

        {analyzed && !loading && items.length > 0 && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* SVG Matrix */}
            <div className="relative flex-shrink-0">
              <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full">
                {/* Quadrant backgrounds */}
                <rect x={PAD} y={PAD} width={PLOT/2} height={PLOT/2} fill="#fef3c7" opacity="0.6" />
                <rect x={PAD + PLOT/2} y={PAD} width={PLOT/2} height={PLOT/2} fill="#fee2e2" opacity="0.7" />
                <rect x={PAD} y={PAD + PLOT/2} width={PLOT/2} height={PLOT/2} fill="#dcfce7" opacity="0.6" />
                <rect x={PAD + PLOT/2} y={PAD + PLOT/2} width={PLOT/2} height={PLOT/2} fill="#fef9c3" opacity="0.6" />

                {/* Quadrant labels */}
                <text x={PAD + PLOT/4} y={PAD + 14} textAnchor="middle" fontSize="9" fill="#92400e" fontWeight="600">Vorbereiten</text>
                <text x={PAD + PLOT*3/4} y={PAD + 14} textAnchor="middle" fontSize="9" fill="#991b1b" fontWeight="700">⚡ KRITISCH</text>
                <text x={PAD + PLOT/4} y={PAD + PLOT/2 + 14} textAnchor="middle" fontSize="9" fill="#166534" fontWeight="600">Gering</text>
                <text x={PAD + PLOT*3/4} y={PAD + PLOT/2 + 14} textAnchor="middle" fontSize="9" fill="#713f12" fontWeight="600">Beobachten</text>

                {/* Grid lines */}
                <line x1={PAD + PLOT/2} y1={PAD} x2={PAD + PLOT/2} y2={PAD + PLOT} stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="4,3" />
                <line x1={PAD} y1={PAD + PLOT/2} x2={PAD + PLOT} y2={PAD + PLOT/2} stroke="#d1d5db" strokeWidth="1.5" strokeDasharray="4,3" />

                {/* Border */}
                <rect x={PAD} y={PAD} width={PLOT} height={PLOT} fill="none" stroke="#9ca3af" strokeWidth="1.5" />

                {/* Axis labels */}
                <text x={PAD + PLOT/2} y={SIZE - 6} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="600">
                  Eintrittswahrscheinlichkeit →
                </text>
                <text x={12} y={PAD + PLOT/2} textAnchor="middle" fontSize="10" fill="#6b7280" fontWeight="600"
                  transform={`rotate(-90, 12, ${PAD + PLOT/2})`}>
                  Finanzieller Schaden →
                </text>
                <text x={PAD - 4} y={PAD + 4} textAnchor="end" fontSize="8" fill="#9ca3af">Hoch</text>
                <text x={PAD - 4} y={PAD + PLOT + 4} textAnchor="end" fontSize="8" fill="#9ca3af">Niedrig</text>
                <text x={PAD} y={PAD + PLOT + 14} textAnchor="start" fontSize="8" fill="#9ca3af">Niedrig</text>
                <text x={PAD + PLOT} y={PAD + PLOT + 14} textAnchor="end" fontSize="8" fill="#9ca3af">Hoch</text>

                {/* Data points */}
                {items.map((item, i) => {
                  const cx = toSvgX(item.eintrittswahrscheinlichkeit);
                  const cy = toSvgY(item.finanzieller_schaden);
                  const color = TYPE_COLORS[item.typ] || "#6b7280";
                  const isCritical = item.eintrittswahrscheinlichkeit >= 50 && item.finanzieller_schaden >= 50;
                  return (
                    <g key={i} onMouseEnter={() => setTooltip(item)} onMouseLeave={() => setTooltip(null)} style={{ cursor: "pointer" }}>
                      {isCritical && <circle cx={cx} cy={cy} r="14" fill={color} opacity="0.15" />}
                      <circle cx={cx} cy={cy} r="8" fill={color} opacity="0.85" />
                      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="700">{i + 1}</text>
                    </g>
                  );
                })}
              </svg>

              {/* Legend */}
              <div className="flex gap-4 mt-2 justify-center">
                {[["gegner", "#dc2626", "Gegner-Arg."], ["eigen", "#16a34a", "Eigene Schwächen"], ["frist", "#d97706", "Fristen"]].map(([t, c, l]) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: c }} />
                    <span className="text-[10px] text-gray-500">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Item list */}
            <div className="flex-1 space-y-2 min-w-0">
              {/* Critical first */}
              {criticalItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-red-700 mb-2">🚨 Kritische Risiken — sofort handeln ({criticalItems.length})</p>
                  {criticalItems.map((item, i) => (
                    <div key={i} className="text-xs text-red-700 mb-1">
                      <span className="font-semibold">{item.name}</span>: {item.empfehlung}
                    </div>
                  ))}
                </div>
              )}
              {items.map((item, i) => {
                const color = TYPE_COLORS[item.typ] || "#6b7280";
                const isCritical = item.eintrittswahrscheinlichkeit >= 50 && item.finanzieller_schaden >= 50;
                return (
                  <div key={i} className={`border rounded-xl p-3 transition-all ${isCritical ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5"
                        style={{ background: color }}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{item.original_title || item.name}</p>
                        <div className="flex gap-3 mt-1">
                          <div className="flex-1">
                            <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                              <span>Wahrscheinlichkeit</span><span>{item.eintrittswahrscheinlichkeit}%</span>
                            </div>
                            <div className="h-1 bg-gray-100 rounded-full"><div className="h-full rounded-full bg-amber-500" style={{ width: `${item.eintrittswahrscheinlichkeit}%` }} /></div>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                              <span>Fin. Schaden</span><span>{item.finanzieller_schaden}%</span>
                            </div>
                            <div className="h-1 bg-gray-100 rounded-full"><div className="h-full rounded-full bg-red-500" style={{ width: `${item.finanzieller_schaden}%` }} /></div>
                          </div>
                        </div>
                        {item.empfehlung && (
                          <p className="text-[10px] text-green-700 mt-1.5 bg-green-50 rounded px-2 py-1">→ {item.empfehlung}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tooltip */}
        {tooltip && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-xl px-4 py-2.5 shadow-xl z-50 max-w-sm">
            <p className="font-bold">{tooltip.original_title || tooltip.name}</p>
            <p className="text-gray-300 mt-1">{tooltip.empfehlung}</p>
          </div>
        )}
      </div>
    </div>
  );
}