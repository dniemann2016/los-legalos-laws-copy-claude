import { useState } from "react";
import TabVerhandlungssimulation from "./TabVerhandlungssimulation";
import TabGesamtbewertung from "./TabGesamtbewertung";

const SUB_TABS = ["🎭 Verhandlungssimulation", "🏆 Gesamtbewertung & Prognose"];

export default function Tab7Simulation({ caseId, caseData, kiMode }) {
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
      <div className={sub === 0 ? "" : "hidden"}><TabVerhandlungssimulation caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabGesamtbewertung caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
    </div>
  );
}