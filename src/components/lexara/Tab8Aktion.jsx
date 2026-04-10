import { useState } from "react";
import TabVerhandlung from "./TabVerhandlung";
import TabSchriftsatz from "./TabSchriftsatz";

const SUB_TABS = ["🤝 Verhandlungsführung", "📝 Schriftsatz-Generator"];

export default function Tab8Aktion({ caseId, caseData, kiMode }) {
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
      {sub === 0 && <TabVerhandlung caseId={caseId} caseData={caseData} kiMode={kiMode} />}
      {sub === 1 && <TabSchriftsatz caseId={caseId} caseData={caseData} kiMode={kiMode} />}
    </div>
  );
}