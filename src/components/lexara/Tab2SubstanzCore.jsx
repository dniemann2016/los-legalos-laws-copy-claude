import { useState } from "react";
import TabArgumenteBeweisVerkettung from "./TabArgumenteBeweisVerkettung";
import TabZeitstrahl from "./TabZeitstrahl";

const SUB_TABS = [
  "⚖️ Argumente & Beweise",
  "📅 Dokumentenanalyse / Zeitstrahl",
];

export default function Tab2SubstanzCore({ caseId, caseData, onCountChange, kiMode, activeSub }) {
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
      <div className={sub === 0 ? "" : "hidden"}><TabArgumenteBeweisVerkettung caseId={caseId} caseData={caseData} onCountChange={onCountChange} kiMode={kiMode} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabZeitstrahl caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
    </div>
  );
}