import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Loader2 } from "lucide-react";

const RISK_ZONES = [
  { x: [0, 50], y: [0, 33], color: "bg-green-100", label: "Niedrig" },
  { x: [50, 100], y: [0, 33], color: "bg-yellow-100", label: "Mittel-Niedrig" },
  { x: [0, 50], y: [33, 67], color: "bg-yellow-100", label: "Mittel-Niedrig" },
  { x: [50, 100], y: [33, 67], color: "bg-orange-100", label: "Mittel" },
  { x: [0, 50], y: [67, 100], color: "bg-orange-100", label: "Mittel-Hoch" },
  { x: [50, 100], y: [67, 100], color: "bg-red-100", label: "Hoch" },
];

function RiskZoneGrid({ width, height }) {
  return (
    <svg width={width} height={height} className="absolute inset-0">
      {RISK_ZONES.map((zone, i) => (
        <rect
          key={i}
          x={(zone.x[0] / 100) * width}
          y={height - (zone.y[1] / 100) * height}
          width={((zone.x[1] - zone.x[0]) / 100) * width}
          height={((zone.y[1] - zone.y[0]) / 100) * height}
          className={zone.color}
          opacity={0.3}
        />
      ))}
      {/* Grid lines */}
      <line x1={width / 2} y1={0} x2={width / 2} y2={height} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4" />
      <line x1={0} y1={height / 3} x2={width} y2={height / 3} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4" />
      <line x1={0} y1={(2 * height) / 3} x2={width} y2={(2 * height) / 3} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4" />
    </svg>
  );
}

export default function RiskMatrix({ caseId, caseData }) {
  const [args, setArgs] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const matrixWidth = 600;
  const matrixHeight = 450;
  const padding = 60;
  const innerWidth = matrixWidth - 2 * padding;
  const innerHeight = matrixHeight - 2 * padding;

  useEffect(() => {
    loadArguments();
  }, [caseId]);

  const loadArguments = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Argument.filter({ case_id: caseId });
      setArgs(data);
    } catch (err) {
      setError("Fehler beim Laden der Argumente");
    } finally {
      setLoading(false);
    }
  };

  const analyzeRisks = async () => {
    if (args.length === 0) return;
    setAnalyzing(true);
    setError(null);

    try {
      const prompt = `Du bist ein erfahrener Rechtsanwalt. Bewerte JEDES der folgenden Argumente auf zwei Skalen (0-100):
1. Eintrittswahrscheinlichkeit: Wie wahrscheinlich ist es, dass dieses Argument der Richter akzeptiert? (0=unmöglich, 100=sicher)
2. Auswirkung: Wie wichtig ist dieses Argument für das Fallendergebnis? (0=unwichtig, 100=entscheidend)

Fall: ${caseData?.fallname || ""}
Rechtsgebiet: ${caseData?.rechtsgebiet || ""}
Zentrale Frage: ${caseData?.zentrale_rechtsfrage || ""}

${args.map((a, i) => `${i + 1}. [${a.side === "eigen" ? "EIGEN" : "GEGNER"}] "${a.title}"\nBeschreibung: ${a.description || "-"}\nStärke: ${a.strength || 5}/10`).join("\n\n")}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            bewertungen: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer" },
                  eintrittswahrscheinlichkeit: { type: "integer", minimum: 0, maximum: 100 },
                  auswirkung: { type: "integer", minimum: 0, maximum: 100 },
                  begruendung: { type: "string" },
                },
                required: ["index", "eintrittswahrscheinlichkeit", "auswirkung"],
              },
            },
          },
          required: ["bewertungen"],
        },
        model: "gemini_3_flash",
      });

      const ratingMap = {};
      if (result?.bewertungen) {
        result.bewertungen.forEach((b) => {
          if (args[b.index]) {
            ratingMap[args[b.index].id] = {
              eintrittswahrscheinlichkeit: b.eintrittswahrscheinlichkeit,
              auswirkung: b.auswirkung,
              begruendung: b.begruendung,
            };
          }
        });
      }
      setRatings(ratingMap);
    } catch (err) {
      setError("Fehler bei der Risikoanalyse: " + (err?.message || "Unbekannter Fehler"));
    } finally {
      setAnalyzing(false);
    }
  };

  const getRiskColor = (prob, impact) => {
    const risk = (prob / 100) * (impact / 100);
    if (risk >= 0.5) return "bg-red-500";
    if (risk >= 0.25) return "bg-orange-500";
    if (risk >= 0.1) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getAxisLabel = (value, axis) => {
    if (axis === "x") {
      if (value === 0) return "Unmöglich";
      if (value === 50) return "Wahrscheinlich";
      if (value === 100) return "Sicher";
    } else {
      if (value === 0) return "Unwichtig";
      if (value === 50) return "Mittel";
      if (value === 100) return "Entscheidend";
    }
    return value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (args.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
        Keine Argumente vorhanden. Bitte fügen Sie zunächst Argumente hinzu.
      </div>
    );
  }

  const hasRatings = Object.keys(ratings).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">📊 Risikomatrix</h3>
          <p className="text-xs text-gray-500 mt-1">Eintrittswahrscheinlichkeit vs. Auswirkung</p>
        </div>
        <button
          onClick={analyzeRisks}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Analysiere...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" /> {hasRatings ? "Neu analysieren" : "Analysieren"}
            </>
          )}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      {!hasRatings && !analyzing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          Klicken Sie auf "Analysieren", um die KI-Bewertung zu starten.
        </div>
      )}

      {hasRatings && (
        <>
          {/* Matrix */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div style={{ width: matrixWidth, height: matrixHeight }} className="relative mx-auto">
              {/* Grid */}
              <RiskZoneGrid width={innerWidth} height={innerHeight} />

              {/* SVG Container */}
              <svg width={matrixWidth} height={matrixHeight} className="relative z-10">
                {/* Axes */}
                <line x1={padding} y1={matrixHeight - padding} x2={matrixWidth - padding} y2={matrixHeight - padding} stroke="#1f2937" strokeWidth={2} />
                <line x1={padding} y1={padding} x2={padding} y2={matrixHeight - padding} stroke="#1f2937" strokeWidth={2} />

                {/* Axis labels */}
                <text x={matrixWidth / 2} y={matrixHeight - 5} textAnchor="middle" className="text-xs font-semibold fill-gray-900">
                  Eintrittswahrscheinlichkeit →
                </text>
                <text
                  x={20}
                  y={matrixHeight / 2}
                  textAnchor="middle"
                  transform={`rotate(-90, 20, ${matrixHeight / 2})`}
                  className="text-xs font-semibold fill-gray-900"
                >
                  ↑ Auswirkung
                </text>

                {/* Data points */}
                {args.map((arg) => {
                  const rating = ratings[arg.id];
                  if (!rating) return null;

                  const x = padding + (rating.eintrittswahrscheinlichkeit / 100) * innerWidth;
                  const y = matrixHeight - padding - (rating.auswirkung / 100) * innerHeight;

                  return (
                    <g key={arg.id}>
                      <circle
                        cx={x}
                        cy={y}
                        r={6}
                        className={`${getRiskColor(rating.eintrittswahrscheinlichkeit, rating.auswirkung)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                        strokeWidth={2}
                        stroke="white"
                      />
                      <title>
                        {arg.title} (W: {rating.eintrittswahrscheinlichkeit}%, A: {rating.auswirkung}%)
                      </title>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex gap-4 flex-wrap justify-center text-xs">
              {[
                ["bg-green-500", "Niedrig"],
                ["bg-yellow-500", "Mittel"],
                ["bg-orange-500", "Hoch"],
                ["bg-red-500", "Kritisch"],
              ].map(([color, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {args.map((arg) => {
              const rating = ratings[arg.id];
              if (!rating) return null;

              const riskScore = ((rating.eintrittswahrscheinlichkeit / 100) * (rating.auswirkung / 100) * 100).toFixed(0);
              const riskLevel =
                riskScore >= 50 ? "Kritisch" : riskScore >= 25 ? "Hoch" : riskScore >= 10 ? "Mittel" : "Niedrig";

              return (
                <div key={arg.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm text-gray-900 flex-1">{arg.title}</h4>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        riskLevel === "Kritisch"
                          ? "bg-red-100 text-red-700"
                          : riskLevel === "Hoch"
                            ? "bg-orange-100 text-orange-700"
                            : riskLevel === "Mittel"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                      }`}
                    >
                      {riskLevel}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Eintrittswahrscheinlichkeit</span>
                        <span className="font-semibold text-gray-900">{rating.eintrittswahrscheinlichkeit}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${rating.eintrittswahrscheinlichkeit}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Auswirkung</span>
                        <span className="font-semibold text-gray-900">{rating.auswirkung}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${rating.auswirkung}%` }} />
                      </div>
                    </div>
                  </div>

                  {rating.begruendung && (
                    <p className="text-xs text-gray-600 italic border-l-2 border-gray-300 pl-2">{rating.begruendung}</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}