import { useState } from "react";
import TabVerhandlungssimulation from "./TabVerhandlungssimulation";
import TabGesamtbewertung from "./TabGesamtbewertung";
import TabCockpit from "./TabCockpit";
import CaseInfluenceGraph from "./CaseInfluenceGraph";
import SubstanzDiagramme from "./SubstanzDiagramme";

const SUB_TABS = [
  "🎭 Verhandlungssimulation",
  "🏆 Gesamtbewertung & Prognose",
  "🎛️ Fall-Cockpit",
  "🕸️ Fallanalyse-Netzwerk",
  "📊 Stärken-Analyse",
];

export default function TabSimulationCockpit({ caseId, caseData, kiMode, activeSub }) {
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
      <div className={sub === 0 ? "" : "hidden"}><TabVerhandlungssimulation caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabGesamtbewertung caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      <div className={sub === 2 ? "" : "hidden"}><TabCockpit caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      <div className={sub === 3 ? "" : "hidden"}><CaseInfluenceGraph caseId={caseId} /></div>
      <div className={sub === 4 ? "" : "hidden"}><SubstanzDiagramme caseId={caseId} /></div>
    </div>
  );
}