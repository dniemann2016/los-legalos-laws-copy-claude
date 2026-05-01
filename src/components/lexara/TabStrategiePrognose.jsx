import { useState } from "react";
import TabStrategie from "./TabStrategie";
import TabRisiko from "./TabRisiko";
import RiskMatrix from "./RiskMatrix";
import SubTabBar from "./SubTabBar";

const SUB_TABS = [
  "🎯 Strategie & Prognose",
  "🔀 Was-wäre-wenn",
  "📉 Monte Carlo & Risiko",
  "⚠️ KI-Risikomatrix",
];

export default function TabStrategiePrognose({ caseId, caseData, onUpdate, kiMode, activeSub }) {
  const [sub, setSub] = useState(activeSub || 0);
  return (
    <div className="space-y-4">
      <SubTabBar tabs={SUB_TABS} active={sub} onChange={setSub} level="primary" />
      <div className={sub === 0 ? "" : "hidden"}><TabStrategie caseId={caseId} caseData={caseData} onUpdate={onUpdate} kiMode={kiMode} activeSub={0} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabStrategie caseId={caseId} caseData={caseData} onUpdate={onUpdate} kiMode={kiMode} activeSub={1} /></div>
      <div className={sub === 2 ? "" : "hidden"}><TabRisiko caseId={caseId} caseData={caseData} onUpdate={onUpdate} kiMode={kiMode} /></div>
      <div className={sub === 3 ? "" : "hidden"}><RiskMatrix caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
    </div>
  );
}