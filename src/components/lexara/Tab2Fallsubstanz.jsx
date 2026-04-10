import { useState } from "react";
import TabArgumenteBeweisVerkettung from "./TabArgumenteBeweisVerkettung";
import TabPersonen from "./TabPersonen";
import TabFristen from "./TabFristen";

const SUB_TABS = ["⚖️ Argumente & Beweise", "👥 Personen", "⏰ Fristen"];

export default function Tab2Fallsubstanz({ caseId, caseData, onCountChange, kiMode }) {
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
      <div className={sub === 0 ? "" : "hidden"}><TabArgumenteBeweisVerkettung caseId={caseId} caseData={caseData} onCountChange={onCountChange} kiMode={kiMode} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabPersonen caseId={caseId} onCountChange={onCountChange} kiMode={kiMode} /></div>
      <div className={sub === 2 ? "" : "hidden"}><TabFristen caseId={caseId} onCountChange={onCountChange} /></div>
    </div>
  );
}