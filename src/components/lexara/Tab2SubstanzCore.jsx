import { useState } from "react";
import TabArgumenteBeweisVerkettung from "./TabArgumenteBeweisVerkettung";
import TabZeitstrahl from "./TabZeitstrahl";
import SubTabBar from "./SubTabBar";

const SUB_TABS = ["⚖️ Argumente & Beweise", "📅 Zeitstrahl"];

export default function Tab2SubstanzCore({ caseId, caseData, onCountChange, kiMode, activeSub }) {
  const [sub, setSub] = useState(activeSub || 0);
  return (
    <div className="space-y-4">
      <SubTabBar tabs={SUB_TABS} active={sub} onChange={setSub} level="primary" />
      <div className={sub === 0 ? "" : "hidden"}><TabArgumenteBeweisVerkettung caseId={caseId} caseData={caseData} onCountChange={onCountChange} kiMode={kiMode} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabZeitstrahl caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
    </div>
  );
}