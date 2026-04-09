import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, ArrowRight } from "lucide-react";
import { computePrognose } from "@/lib/legalAlgorithms";

export default function JudgeComparisonModal({ isOpen, onClose, currentJudgeName, caseId, caseData, args, evidence, deadlines, persons }) {
  const [selectedJudge, setSelectedJudge] = useState(null);
  const [judges, setJudges] = useState([]);
  const [basePrognose, setBasePrognose] = useState(null);
  const [altPrognose, setAltPrognose] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    base44.entities.JudgeProfile.filter({}).then(j => setJudges(j));
    const base = computePrognose({ args, evidence, deadlines, persons, caseData });
    setBasePrognose(base);
  }, [isOpen]);

  useEffect(() => {
    if (!selectedJudge || !basePrognose) return;
    const modified = { ...caseData, richter_name: selectedJudge.name, richter_klaeger_rate: selectedJudge.klaeger_rate };
    const alt = computePrognose({ args, evidence, deadlines, persons, caseData: modified });
    setAltPrognose(alt);
  }, [selectedJudge]);

  if (!isOpen) return null;

  const diff = altPrognose ? altPrognose.score - basePrognose.score : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-sm font-semibold text-gray-800">Richterwechsel – Prognose-Vergleich</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Current Judge */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 mb-2">AKTUELLER RICHTER</p>
            <p className="text-sm font-semibold text-gray-800 mb-3">{currentJudgeName || "Nicht bestimmt"}</p>
            {basePrognose && (
              <div className="flex items-end gap-3">
                <div className="text-3xl font-bold text-gray-900">{basePrognose.score}%</div>
                <div className="text-xs text-gray-500">Erfolgsaussicht</div>
              </div>
            )}
          </div>

          {/* Judge Selection */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">ALTERNATIVE RICHTER</p>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {judges.filter(j => j.name !== currentJudgeName).map(j => (
                <button
                  key={j.id}
                  onClick={() => setSelectedJudge(j)}
                  className={`text-left p-3 border rounded-lg transition-all ${
                    selectedJudge?.id === j.id
                      ? "bg-blue-50 border-blue-300"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{j.name}</p>
                      <p className="text-[10px] text-gray-500">{j.gericht} · {j.rechtsgebiet}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-600">{j.klaeger_rate || "?"}% Kläger</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Comparison */}
          {altPrognose && selectedJudge && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-center flex-1">
                  <p className="text-[10px] text-gray-500 mb-1">JETZT</p>
                  <p className="text-2xl font-bold text-gray-800">{basePrognose.score}%</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 mx-2" />
                <div className="text-center flex-1">
                  <p className="text-[10px] text-blue-600 mb-1">MIT {selectedJudge.name.split(" ")[0].toUpperCase()}</p>
                  <p className="text-2xl font-bold text-blue-700">{altPrognose.score}%</p>
                </div>
              </div>
              <p className={`text-xs font-semibold text-center ${
                diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500"
              }`}>
                {diff > 0 ? "✅" : diff < 0 ? "⚠️" : "➡️"} {diff > 0 ? "+" : ""}{diff.toFixed(1)}% 
                {Math.abs(diff) < 2 ? " (minimal)" : Math.abs(diff) < 5 ? " (moderat)" : " (signifikant)"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}