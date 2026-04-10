import { useState } from "react";
import TabBasisdaten from "./TabBasisdaten";
import TabDokumenteAnalyse from "./TabDokumenteAnalyse";

const SUB_TABS = ["📋 Basisdaten", "📄 Dokumente & KI-Analyse"];

export default function Tab1Fallerfassung({ caseId, caseData, onUpdate, onDataImport, kiMode }) {
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
      <div className={sub === 0 ? "" : "hidden"}><TabBasisdaten caseId={caseId} caseData={caseData} onUpdate={onUpdate} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabDokumenteAnalyse caseId={caseId} caseData={caseData} onDataImport={onDataImport} kiMode={kiMode} /></div>
    </div>
  );
}