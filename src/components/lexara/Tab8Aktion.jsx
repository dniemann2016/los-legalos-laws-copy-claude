import { useState } from "react";
import TabVerhandlung from "./TabVerhandlung";
import TabSchriftsatz from "./TabSchriftsatz";
import ArgumentationskettenVisualisierung from "./ArgumentationskettenVisualisierung";
import SubTabBar from "./SubTabBar";

const SUB_TABS = ["🤝 Verhandlungsführung", "📝 Schriftsatz-Generator", "🔗 Argumentketten & Lücken"];

export default function Tab8Aktion({ caseId, caseData, kiMode }) {
  const [sub, setSub] = useState(0);
  return (
    <div className="space-y-4">
      <SubTabBar tabs={SUB_TABS} active={sub} onChange={setSub} level="primary" />
      <div className={sub === 0 ? "" : "hidden"}><TabVerhandlung caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      <div className={sub === 1 ? "" : "hidden"}><TabSchriftsatz caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
      {sub === 2 && <ArgumentationskettenVisualisierung caseId={caseId} />}
    </div>
  );
}