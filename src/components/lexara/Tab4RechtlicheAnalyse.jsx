import { useState } from "react";
import ComplianceChecker from "./ComplianceChecker";
import TabAnalyse from "./TabAnalyse";
import PraezedenzfallSuche from "./PraezedenzfallSuche";
import SubTabBar from "./SubTabBar";

const SUB_TABS = ["✅ Compliance-Prüfung", "📊 Kostenanalyse & Rspr.", "🔍 Präzedenzfälle"];

export default function Tab4RechtlicheAnalyse({ caseId, caseData, onUpdate, kiMode }) {
  const [sub, setSub] = useState(0);
  return (
    <div className="space-y-4">
      <SubTabBar tabs={SUB_TABS} active={sub} onChange={setSub} level="primary" />
      <div className={sub === 0 ? "" : "hidden"}><ComplianceChecker caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabAnalyse caseId={caseId} caseData={caseData} onUpdate={onUpdate} kiMode={kiMode} /></div>
      <div className={sub === 2 ? "" : "hidden"}><PraezedenzfallSuche caseId={caseId} caseData={caseData} /></div>
    </div>
  );
}