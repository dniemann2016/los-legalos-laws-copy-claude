import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, RefreshCw, Target, AlertTriangle, TrendingUp, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Gegner-Strategie Dashboard
 * - Analysiert gegnerische Argumente & Fristen
 * - Erstellt Gegen-Schachzug-Matrix (Gegner-Arg vs. Eigener-Beweis)
 * - KI-gestützte taktische Empfehlungen
 * - Integration mit Prozess-Zeitachse
 */

function EffectivenessMatrix({ gegnerArgs, evidence, matrix }) {
  if (!matrix || matrix.length === 0) {
    return <div className="text-center text-gray-400 py-8">Führe KI-Analyse durch für Matrix</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left p-2 font-semibold text-gray-700">Gegner-Argument</th>
            {evidence.map(e => (
              <th key={e.id} className="p-2 font-semibold text-center text-gray-700 max-w-[120px]">
                <div className="text-[10px] truncate" title={e.title}>{e.title}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gegnerArgs.map(arg => (
            <tr key={arg.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="p-2 font-medium text-gray-800 max-w-[150px] truncate" title={arg.title}>
                {arg.title}
              </td>
              {evidence.map(ev => {
                const cell = matrix.find(m => m.gegner_arg_id === arg.id && m.evidence_id === ev.id);
                const score = cell?.effectiveness_score || 0;
                const color = score > 7 ? "bg-green-100 text-green-800" :
                            score > 4 ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800";

                return (
                  <td key={`${arg.id}-${ev.id}`} className={`p-2 text-center font-bold ${color} rounded`}>
                    {score.toFixed(1)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CounterMoveCard({ move, caseData }) {
  const iconMap = {
    "konter": <Target className="w-4 h-4 text-blue-600" />,
    "neutralisierung": <Lock className="w-4 h-4 text-purple-600" />,
    "verschiebung": <TrendingUp className="w-4 h-4 text-green-600" />,
    "eskalation": <AlertTriangle className="w-4 h-4 text-red-600" />,
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {iconMap[move.typ] || <Target className="w-4 h-4 text-gray-600" />}
          <h4 className="font-bold text-gray-900">{move.titel}</h4>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          move.typ === "konter" ? "bg-blue-100 text-blue-700" :
          move.typ === "neutralisierung" ? "bg-purple-100 text-purple-700" :
          move.typ === "verschiebung" ? "bg-green-100 text-green-700" :
          "bg-red-100 text-red-700"
        }`}>
          {move.typ.toUpperCase()}
        </span>
      </div>

      <p className="text-sm text-gray-700">{move.beschreibung}</p>

      {move.gegner_arg && (
        <div className="bg-red-50 border-l-2 border-red-400 pl-3 py-2 rounded-r">
          <p className="text-xs font-semibold text-red-700">🎯 Ziel: {move.gegner_arg}</p>
        </div>
      )}

      {move.unsere_strategie && (
        <div className="bg-green-50 border-l-2 border-green-400 pl-3 py-2 rounded-r">
          <p className="text-xs font-semibold text-green-700">💡 Unsere Strategie: {move.unsere_strategie}</p>
        </div>
      )}

      {move.timing && (
        <div className="bg-blue-50 border-l-2 border-blue-400 pl-3 py-2 rounded-r">
          <p className="text-xs font-semibold text-blue-700">⏱️ Timing: {move.timing}</p>
        </div>
      )}

      {move.erfolgsaussicht && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full" style={{width: `${move.erfolgsaussicht}%`}} />
          </div>
          <span className="text-xs font-bold text-gray-700">{move.erfolgsaussicht}%</span>
        </div>
      )}
    </div>
  );
}

export default function OpponentStrategyDashboard({ caseId, caseData }) {
  const [gegnerArgs, setGegnerArgs] = useState([]);
  const [eigenArgs, setEigenArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [matrix, setMatrix] = useState([]);
  const [counterMoves, setCounterMoves] = useState([]);
  const [threatAnalysis, setThreatAnalysis] = useState(null);

  useEffect(() => {
    load();
  }, [caseId]);

  const load = async () => {
    const [args, ev, deadl] = await Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
      base44.entities.Deadline.filter({ case_id: caseId }),
    ]);

    setGegnerArgs(args.filter(a => a.side === "gegner"));
    setEigenArgs(args.filter(a => a.side === "eigen"));
    setEvidence(ev);
    setDeadlines(deadl);
    setLoaded(true);
  };

  const runKIAnalysis = async () => {
    setAnalyzing(true);

    // 1. Gegner-Argumente & Fristen Analyse
    const gegnerArgTexts = gegnerArgs.map(a => `"${a.title}" (Stärke: ${a.strength}/10)`).join(", ");
    const eigeneArgTexts = eigenArgs.map(a => `"${a.title}" (Stärke: ${a.strength}/10)`).join(", ");
    const evidenceTexts = evidence.map(e => `"${e.title}" (Gewicht: ${e.weight}/10)`).join(", ");
    const deadlineTexts = deadlines.map(d => `${d.title} (${d.due_date})`).join(", ");

    const analysisPrompt = `Du bist erfahrener Rechtsanwalt und Prozessstratege. Analysiere die Gegner-Strategie:

FALL: ${caseData?.fallname || ""}
Gegner-Argumente: ${gegnerArgTexts || "keine"}
Unsere Argumente: ${eigeneArgTexts || "keine"}
Unsere Beweise: ${evidenceTexts || "keine"}
Fristen: ${deadlineTexts || "keine"}

AUFGABEN:
1. Erstelle eine Matrix: Für jedes Gegner-Argument bewerte (0-10), wie effektiv jeder unserer Beweise es widerlegt.
2. Identifiziere 5-7 spezifische Gegenschachzüge (Konter, Neutralisierung, Verschiebung, Eskalation).
3. Gib Threat-Analyse: Welches Gegner-Argument ist am gefährlichsten?

Antworte als JSON mit:
{
  "effectiveness_matrix": [
    {"gegner_arg_title": "...", "evidence_title": "...", "score": 7.5, "reasoning": "..."}
  ],
  "counter_moves": [
    {"typ": "konter|neutralisierung|verschiebung|eskalation", "titel": "...", "beschreibung": "...", "gegner_arg": "...", "unsere_strategie": "...", "timing": "...", "erfolgsaussicht": 75}
  ],
  "hauptbedrohung": {"argument": "...", "grund": "...", "severity": "hoch|mittel|niedrig"},
  "top_beweise_ranking": [{"evidence": "...", "gegen_wen": "...", "impact": "hoch|mittel"}]
}`;

    const res = await base44.integrations.Core.InvokeLLM({
      model: "gpt_5",
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          effectiveness_matrix: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gegner_arg_title: { type: "string" },
                evidence_title: { type: "string" },
                score: { type: "number" },
                reasoning: { type: "string" }
              }
            }
          },
          counter_moves: {
            type: "array",
            items: {
              type: "object",
              properties: {
                typ: { type: "string" },
                titel: { type: "string" },
                beschreibung: { type: "string" },
                gegner_arg: { type: "string" },
                unsere_strategie: { type: "string" },
                timing: { type: "string" },
                erfolgsaussicht: { type: "number" }
              }
            }
          },
          hauptbedrohung: {
            type: "object",
            properties: {
              argument: { type: "string" },
              grund: { type: "string" },
              severity: { type: "string" }
            }
          },
          top_beweise_ranking: {
            type: "array",
            items: {
              type: "object",
              properties: {
                evidence: { type: "string" },
                gegen_wen: { type: "string" },
                impact: { type: "string" }
              }
            }
          }
        }
      }
    });

    if (res) {
      // Matrix mit IDs aufbauen
      const matrixWithIds = (res.effectiveness_matrix || []).map(m => {
        const gArg = gegnerArgs.find(a => a.title.includes(m.gegner_arg_title.slice(0, 10)));
        const ev = evidence.find(e => e.title.includes(m.evidence_title.slice(0, 10)));
        return {
          gegner_arg_id: gArg?.id,
          evidence_id: ev?.id,
          effectiveness_score: m.score,
          reasoning: m.reasoning
        };
      });

      setMatrix(matrixWithIds);
      setCounterMoves(res.counter_moves || []);
      setThreatAnalysis(res.hauptbedrohung);
    }

    setAnalyzing(false);
  };

  if (!loaded) return <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">🥊 Gegner-Strategie Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">KI-gestützte Gegen-Schachzug-Matrix & taktische Analyse</p>
          </div>
          <Button
            onClick={runKIAnalysis}
            disabled={analyzing}
            size="lg"
            className="gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl"
          >
            {analyzing ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Analysiere...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> KI-Analyse starten</>
            )}
          </Button>
        </div>
      </div>

      {/* Threat Analysis */}
      {threatAnalysis && (
        <div className="bg-red-50 border-l-4 border-red-600 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-900">⚠️ Hauptbedrohung erkannt</h3>
              <p className="text-sm text-red-800 mt-1"><strong>{threatAnalysis.argument}</strong></p>
              <p className="text-xs text-red-700 mt-1">{threatAnalysis.grund}</p>
              <div className="mt-2 inline-block">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  threatAnalysis.severity === "hoch" ? "bg-red-600 text-white" :
                  threatAnalysis.severity === "mittel" ? "bg-orange-500 text-white" :
                  "bg-yellow-500 text-white"
                }`}>
                  {threatAnalysis.severity?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Effectiveness Matrix */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Effektivitäts-Matrix</h3>
        <p className="text-xs text-gray-500 mb-4">Score 0-10: Wie effektiv widerlegt jeder Beweis das Gegner-Argument</p>
        <EffectivenessMatrix gegnerArgs={gegnerArgs} evidence={evidence} matrix={matrix} />
      </div>

      {/* Counter Moves */}
      {counterMoves.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">🎯 Gegen-Schachzüge</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {counterMoves.map((move, idx) => (
              <CounterMoveCard key={idx} move={move} caseData={caseData} />
            ))}
          </div>
        </div>
      )}

      {/* Beweise Ranking */}
      {threatAnalysis && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🏆 Top Beweise (nach Wirkung)</h3>
          <div className="space-y-2">
            {evidence
              .sort((a, b) => (b.weight || 0) - (a.weight || 0))
              .slice(0, 5)
              .map((ev, idx) => (
                <div key={ev.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-400 w-6 text-center">#{idx + 1}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{ev.title}</p>
                    <p className="text-xs text-gray-500">Gewicht: {ev.weight || 5}/10</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {ev.weight || 5}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Integration Hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
        <p className="text-xs text-blue-700 font-semibold">
          💡 Gehe zum Tab "Prozess-Zeitachse" um zu sehen, wann diese Gegen-Schachzüge optimal einzusetzen sind
        </p>
      </div>
    </div>
  );
}