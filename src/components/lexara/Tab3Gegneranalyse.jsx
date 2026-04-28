import { useState } from "react";
import TabKIBerater from "./TabKIBerater";
import GegnerVerhaltenDashboard from "./GegnerVerhaltenDashboard";
import GegnerRisikoMatrix from "./GegnerRisikoMatrix";
import GegnerProfilSimulation from "./GegnerProfilSimulation";

const SUB_TABS = ["🎯 Profil & Simulation", "🧠 KI-Berater", "📊 Verhaltenstracking", "⚠️ Risikomatrix"];

export default function Tab3Gegneranalyse({ caseId, caseData, onUpdate, kiMode, activeSub = 0 }) {
  return (
    <div className="space-y-4">
      <div className={activeSub === 0 ? "" : "hidden"}><GegnerProfilSimulation caseId={caseId} caseData={caseData} onUpdate={onUpdate} /></div>
      <div className={activeSub === 1 ? "" : "hidden"}><TabKIBerater caseId={caseId} caseData={caseData} onUpdate={onUpdate} kiMode={kiMode} /></div>
      <div className={activeSub === 2 ? "" : "hidden"}><GegnerVerhaltenDashboard caseId={caseId} caseData={caseData} /></div>
      <div className={activeSub === 3 ? "" : "hidden"}><GegnerRisikoMatrix caseId={caseId} caseData={caseData} /></div>
    </div>
  );
}