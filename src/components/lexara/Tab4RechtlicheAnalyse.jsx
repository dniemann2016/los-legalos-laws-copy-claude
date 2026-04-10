import { useState } from "react";
import ComplianceChecker from "./ComplianceChecker";
import TabAnalyse from "./TabAnalyse";
import PraezedenzfallSuche from "./PraezedenzfallSuche";

const SUB_TABS = ["✅ Compliance-Prüfung", "📊 Kostenanalyse & Rechtsprechung", "🔍 Präzedenzfälle"];

export default function Tab4RechtlicheAnalyse({ caseId, caseData, onUpdate, kiMode }) {
  const [sub, setSub] = useState(0);
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-100">
        {SUB_TABS.map((label, i) => (
          <button key={i} onClick={() => setSub(i)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${sub === i ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className={sub === 0 ? "" : "hidden"}><ComplianceChecker caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabAnalyse caseId={caseId} caseData={caseData} onUpdate={onUpdate} kiMode={kiMode} /></div>
      <div className={sub === 2 ? "" : "hidden"}><PraezedenzfallSuche caseId={caseId} caseData={caseData} /></div>
    </div>
  );
}