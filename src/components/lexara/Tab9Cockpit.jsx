import { useState } from "react";
import TabCockpit from "./TabCockpit";
import CaseInfluenceGraph from "./CaseInfluenceGraph";

const SUB_TABS = ["🎛️ Fall-Cockpit", "🕸️ Fallanalyse-Netzwerk"];

export default function Tab9Cockpit({ caseId, caseData, kiMode }) {
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
      {sub === 0 && <TabCockpit caseId={caseId} caseData={caseData} kiMode={kiMode} />}
      {sub === 1 && <CaseInfluenceGraph caseId={caseId} />}
    </div>
  );
}