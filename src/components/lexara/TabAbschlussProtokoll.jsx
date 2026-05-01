import { useState, useEffect } from "react";
import Tab10Abschluss from "./Tab10Abschluss";
import TabKIProtokoll from "./TabKIProtokoll";
import TabZeitstrahl from "./TabZeitstrahl";
import TabPrognoseVergleich from "./TabPrognoseVergleich";
import RiskMatrix from "./RiskMatrix";
import TabRisiko from "./TabRisiko";
import SubTabBar from "./SubTabBar";

const SUB_TABS = [
  "🏁 Abschluss",
  "📋 KI-Protokoll",
  "📅 Zeitstrahl",
  "📊 Prognose-Vergleich",
  "⚠️ Risiko",
];

export default function TabAbschlussProtokoll({ caseId, caseData, kiMode, activeSub }) {
  const [sub, setSub] = useState(activeSub || 0);
  useEffect(() => { setSub(activeSub || 0); }, [activeSub]);
  return (
    <div className="space-y-4">
      <SubTabBar tabs={SUB_TABS} active={sub} onChange={setSub} level="primary" />
      <div className={sub === 0 ? "" : "hidden"}><Tab10Abschluss caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabKIProtokoll caseId={caseId} caseData={caseData} /></div>
      <div className={sub === 2 ? "" : "hidden"}><TabZeitstrahl caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      <div className={sub === 3 ? "" : "hidden"}><TabPrognoseVergleich caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      {sub === 4 && (
        <div className="space-y-6">
          <TabRisiko caseId={caseId} caseData={caseData} onUpdate={() => {}} kiMode={kiMode} />
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">⚠️ KI-Risikomatrix (Argument-Ebene)</h3>
            <RiskMatrix caseId={caseId} caseData={caseData} kiMode={kiMode} />
          </div>
        </div>
      )}
    </div>
  );
}