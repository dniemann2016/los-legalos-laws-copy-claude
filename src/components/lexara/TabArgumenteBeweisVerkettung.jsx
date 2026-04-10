import { useState, useEffect } from "react";
import TabArgumente from "./TabArgumente";
import TabBeweise from "./TabBeweise";
import TabVerkettung from "./TabVerkettung";
import PraezedenzfallSuche from "./PraezedenzfallSuche";

export default function TabArgumenteBeweisVerkettung({ caseId, caseData, onCountChange }) {
  const [activeSubTab, setActiveSubTab] = useState("argumente");

  return (
    <div className="space-y-4">
      {/* Sub-Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-100">
        <button
          onClick={() => setActiveSubTab("argumente")}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-all ${
            activeSubTab === "argumente"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Argumente
        </button>
        <button
          onClick={() => setActiveSubTab("beweise")}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-all ${
            activeSubTab === "beweise"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Beweise
        </button>
        <button
          onClick={() => setActiveSubTab("verkettung")}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-all ${
            activeSubTab === "verkettung"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Verkettung
        </button>
        <button
          onClick={() => setActiveSubTab("praezedenz")}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-all ${
            activeSubTab === "praezedenz"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          🔍 Präzedenzfälle
        </button>
      </div>

      {/* Content */}
      {activeSubTab === "argumente" && <TabArgumente caseId={caseId} caseData={caseData} onCountChange={onCountChange} />}
      {activeSubTab === "beweise" && <TabBeweise caseId={caseId} />}
      {activeSubTab === "verkettung" && <TabVerkettung caseId={caseId} />}
      {activeSubTab === "praezedenz" && <PraezedenzfallSuche caseId={caseId} caseData={caseData} onImport={onCountChange} />}
    </div>
  );
}