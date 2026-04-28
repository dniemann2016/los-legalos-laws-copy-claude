import { useState } from "react";
import TabKIBerater from "./TabKIBerater";
import GegnerVerhaltenDashboard from "./GegnerVerhaltenDashboard";
import GegnerRisikoMatrix from "./GegnerRisikoMatrix";
import GegnerProfilSimulation from "./GegnerProfilSimulation";

const SUB_TABS = ["🎯 Profil & Simulation", "🧠 KI-Berater", "📊 Verhaltenstracking", "⚠️ Risikomatrix"];

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
      <div className={sub === 0 ? "" : "hidden"}><GegnerProfilSimulation caseId={caseId} caseData={caseData} onUpdate={onUpdate} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabKIBerater caseId={caseId} caseData={caseData} onUpdate={onUpdate} kiMode={kiMode} /></div>
      <div className={sub === 2 ? "" : "hidden"}><GegnerVerhaltenDashboard caseId={caseId} caseData={caseData} /></div>
      <div className={sub === 3 ? "" : "hidden"}><GegnerRisikoMatrix caseId={caseId} caseData={caseData} /></div>
    </div>
  );
}