import { useState } from "react";
import TabBasisdaten from "./TabBasisdaten";
import TabDokumenteAnalyse from "./TabDokumenteAnalyse";
import SubTabBar from "./SubTabBar";

const SUB_TABS = ["📋 Basisdaten", "📄 Dokumente & KI-Analyse"];

export default function Tab1Fallerfassung({ caseId, caseData, onUpdate, onDataImport, kiMode }) {
  const [sub, setSub] = useState(0);
  return (
    <div className="space-y-4">
      <SubTabBar tabs={SUB_TABS} active={sub} onChange={setSub} level="primary" />
      <div className={sub === 0 ? "" : "hidden"}><TabBasisdaten caseId={caseId} caseData={caseData} onUpdate={onUpdate} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabDokumenteAnalyse caseId={caseId} caseData={caseData} onDataImport={onDataImport} kiMode={kiMode} /></div>
    </div>
  );
}