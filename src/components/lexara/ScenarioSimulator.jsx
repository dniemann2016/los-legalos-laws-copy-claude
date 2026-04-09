import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap } from "lucide-react";
import { computePrognose } from "@/lib/legalAlgorithms";

export default function ScenarioSimulator({ caseId, caseData }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [persons, setPersons] = useState([]);
  
  const [loaded, setLoaded] = useState(false);
  
  // Scenario parameters (0-100 sliders)
  const [ownArgsBoost, setOwnArgsBoost] = useState(0);
  const [opponentArgsReduction, setOpponentArgsReduction] = useState(0);
  const [evidenceBoost, setEvidenceBoost] = useState(0);
  const [deadlinePenalty, setDeadlinePenalty] = useState(0);
  
  const [basePrognose, setBasePrognose] = useState(null);
  const [scenarioPrognose, setScenarioPrognose] = useState(null);

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
      const base = computePrognose({ args: a, evidence: e, deadlines: d, persons: p, caseData });
      setBasePrognose(base);
      setLoaded(true);
    });
  }, [caseId]);

  // Simuliere Szenario
  useEffect(() => {
    if (!loaded || !basePrognose) return;
    
    // Modifiziere Argumente & Beweise für Simulation
    const modifiedArgs = args.map(a => {
      if (a.side === "eigen") {
        return { ...a, strength: Math.min(10, (a.strength || 5) * (1 + ownArgsBoost / 100)) };
      } else {
        return { ...a, strength: Math.max(0, (a.strength || 5) * (1 - opponentArgsReduction / 100)) };
      }
    });
    
    const modifiedEvidence = evidence.map(e => ({
      ...e,
      weight: Math.min(10, (e.weight || 5) * (1 + evidenceBoost / 100))
    }));
    
    const modifiedDeadlines = deadlines.map(d => {
      if (d.status === "versaeumt") {
        return { ...d, prognoseabzug: Math.max(0, parseFloat(d.prognoseabzug || 5) * (1 - deadlinePenalty / 100)) };
      }
      return d;
    });
    
    const scenario = computePrognose({
      args: modifiedArgs,
      evidence: modifiedEvidence,
      deadlines: modifiedDeadlines,
      persons,
      caseData
    });
    
    setScenarioPrognose(scenario);
  }, [ownArgsBoost, opponentArgsReduction, evidenceBoost, deadlinePenalty, loaded]);

  if (!loaded || !basePrognose) {
    return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>;
  }

  const diff = scenarioPrognose ? scenarioPrognose.score - basePrognose.score : 0;
  const diffColor = diff > 2 ? "text-green-600" : diff < -2 ? "text-red-600" : "text-gray-400";

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-800">Szenario-Simulator: Was-wäre-wenn?</h3>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Eigene Argumente stärken</label>
              <span className="text-xs font-bold text-gray-800">{ownArgsBoost}%</span>
            </div>
            <input type="range" min="0" max="100" value={ownArgsBoost} onChange={e => setOwnArgsBoost(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Gegnerargumente abschwächen</label>
              <span className="text-xs font-bold text-gray-800">{opponentArgsReduction}%</span>
            </div>
            <input type="range" min="0" max="100" value={opponentArgsReduction} onChange={e => setOpponentArgsReduction(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Beweise stärken</label>
              <span className="text-xs font-bold text-gray-800">{evidenceBoost}%</span>
            </div>
            <input type="range" min="0" max="100" value={evidenceBoost} onChange={e => setEvidenceBoost(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Fristversäumnisse mindern</label>
              <span className="text-xs font-bold text-gray-800">{deadlinePenalty}%</span>
            </div>
            <input type="range" min="0" max="100" value={deadlinePenalty} onChange={e => setDeadlinePenalty(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 text-white rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">BASELINE</p>
          <p className="text-3xl font-bold">{basePrognose.score}%</p>
        </div>
        <div className={`bg-white border rounded-xl p-4 text-center ${diff > 0 ? "border-green-200" : diff < 0 ? "border-red-200" : "border-gray-200"}`}>
          <p className="text-xs text-gray-400 mb-1">SZENARIO</p>
          <p className="text-3xl font-bold text-gray-800">{scenarioPrognose?.score}%</p>
          <p className={`text-xs font-bold mt-1 ${diffColor}`}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}%</p>
        </div>
      </div>

      {/* Interpretation */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
        <p className="text-xs text-blue-700">
          {Math.abs(diff) < 1 ? "Szenario hat minimalen Einfluss" : diff > 5 ? "🎯 Dieses Szenario würde den Fall erheblich verbessern!" : diff < -5 ? "⚠️ Dieses Szenario würde den Fall erheblich verschlechtern!" : "Moderater Einfluss auf Erfolgsaussichten"}
        </p>
      </div>
    </div>
  );
}