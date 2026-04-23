import { useState } from "react";
import Tab10Abschluss from "./Tab10Abschluss";
import TabKIProtokoll from "./TabKIProtokoll";
import TabZeitstrahl from "./TabZeitstrahl";

const SUB_TABS = [
  "🏁 Abschluss & Monte Carlo",
  "📋 KI-Protokoll",
  "📅 Zeitstrahl (Gesamt)",
];

export default function TabAbschlussProtokoll({ caseId, caseData, kiMode, activeSub }) {
  const [sub, setSub] = useState(activeSub || 0);
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-100 overflow-x-auto">
        {SUB_TABS.map((label, i) => (
          <button key={i} onClick={() => setSub(i)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${sub === i ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className={sub === 0 ? "" : "hidden"}><Tab10Abschluss caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabKIProtokoll caseId={caseId} caseData={caseData} /></div>
      <div className={sub === 2 ? "" : "hidden"}><TabZeitstrahl caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
    </div>
  );
}