import { useState } from "react";
import TabKIBerater from "./TabKIBerater";
import GegnerVerhaltenDashboard from "./GegnerVerhaltenDashboard";
import GegnerRisikoMatrix from "./GegnerRisikoMatrix";

const SUB_TABS = ["🧠 KI-Berater & Profil", "📊 Verhaltenstracking", "⚠️ Risikomatrix"];

export default function Tab3Gegneranalyse({ caseId, caseData, onUpdate, kiMode }) {
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
      {sub === 0 && <TabKIBerater caseId={caseId} caseData={caseData} onUpdate={onUpdate} kiMode={kiMode} />}
      {sub === 1 && <GegnerVerhaltenDashboard caseId={caseId} caseData={caseData} />}
      {sub === 2 && <GegnerRisikoMatrix caseId={caseId} caseData={caseData} />}
    </div>
  );
}