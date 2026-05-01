import { useState } from "react";
import TabVerhandlungssimulation from "./TabVerhandlungssimulation";
import TabGesamtbewertung from "./TabGesamtbewertung";
import TabCockpit from "./TabCockpit";
import CaseInfluenceGraph from "./CaseInfluenceGraph";
import SubstanzDiagramme from "./SubstanzDiagramme";
import SubTabBar from "./SubTabBar";

const SUB_TABS = [
  "🎭 Verhandlung",
  "🏆 Gesamtbewertung",
  "🎛️ Cockpit",
  "🕸️ Netzwerk",
  "📊 Stärken-Analyse",
];

export default function TabSimulationCockpit({ caseId, caseData, kiMode, activeSub }) {
  const [sub, setSub] = useState(activeSub || 0);
  return (
    <div className="space-y-4">
      <SubTabBar tabs={SUB_TABS} active={sub} onChange={setSub} level="primary" />
      <div className={sub === 0 ? "" : "hidden"}><TabVerhandlungssimulation caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabGesamtbewertung caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      <div className={sub === 2 ? "" : "hidden"}><TabCockpit caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      <div className={sub === 3 ? "" : "hidden"}><CaseInfluenceGraph caseId={caseId} /></div>
      <div className={sub === 4 ? "" : "hidden"}><SubstanzDiagramme caseId={caseId} /></div>
    </div>
  );
}