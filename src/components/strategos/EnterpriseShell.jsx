import { useState } from "react";
import { SF } from "./AppleCard";
import Step1Kontext from "./modules/Step1Kontext";
import Step2Situation from "./modules/Step2Situation";
import Step3Matrix from "./modules/Step3Matrix";
import Step4Aktionsplan from "./modules/Step4Aktionsplan";
import Step5Empfehlung from "./modules/Step5Empfehlung";
import Step6LexaraSync from "./modules/Step6LexaraSync";

const STEPS = [
  { num: 1, label: "Eingabe & Kontext", sub: "Unternehmen, Sachverhalt, Rechtsgebiete", color: "#007AFF" },
  { num: 2, label: "Situationsanalyse", sub: "KI-Analyse pro Rechtsgebiet", color: "#FF9500" },
  { num: 3, label: "Szenario-Matrix", sub: "Handlungsoptionen & Gegner-Reaktion", color: "#5856D6" },
  { num: 4, label: "Handlungsoptionen", sub: "Konkreter Aktionsplan", color: "#34C759" },
  { num: 5, label: "Strategos-Empfehlung", sub: "Sun Tzu · Machiavelli · Harvard", color: "#AF52DE" },
  { num: 6, label: "LEXARA-Sync", sub: "Synchronisation & Executive Summary", color: "#007AFF" },
];

function Stepper({ current, onSelect, scenario }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 20 }}>
      {STEPS.map(s => {
        const active = current === s.num;
        const ctx = scenario.unternehmenskontext || {};
        const sit = scenario.situationsanalyse || {};
        const mat = scenario.szenario_matrix || {};
        const act = scenario.aktionsplan || {};
        const emp = scenario.strategos_empfehlung || {};
        const sync = scenario.lexara_sync || {};
        const doneMap = {
          1: Object.keys(ctx).length > 3,
          2: (sit.module?.length || 0) > 0,
          3: (mat.szenarien?.length || 0) > 0,
          4: (act.massnahmen?.length || 0) > 0,
          5: Object.keys(emp).length > 0,
          6: !!sync.letzter_sync,
        };
        const done = doneMap[s.num];
        return (
          <button key={s.num} onClick={() => onSelect(s.num)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, background: active ? `${s.color}12` : "transparent", border: active ? `1px solid ${s.color}30` : "1px solid transparent", cursor: "pointer", textAlign: "left", transition: "all 0.15s", ...SF }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: done ? s.color : active ? `${s.color}20` : "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {done ? (
                <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: active ? s.color : "#aaa" }}>{s.num}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? s.color : done ? "#333" : "#888", lineHeight: 1.2 }}>{s.label}</p>
              <p style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>{s.sub}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function EnterpriseShell({ scenario, onSave }) {
  const [step, setStep] = useState(scenario.enterprise_step || 1);

  const handleSave = async (patch) => {
    const updated = { ...scenario, ...patch };
    await onSave(updated);
  };

  const handleStepSave = async (patch) => {
    await handleSave({ ...patch, enterprise_step: step });
  };

  const currentStep = STEPS.find(s => s.num === step);

  return (
    <div style={{ display: "flex", gap: 20, minHeight: 600, ...SF }}>
      {/* Sidebar Stepper */}
      <div style={{ width: 240, flexShrink: 0 }}>
        <div style={{ padding: "14px 14px 10px", marginBottom: 6 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>Enterprise-Analyse</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginTop: 2 }}>{scenario.title || "Neues Szenario"}</p>
        </div>
        <Stepper current={step} onSelect={(n) => { setStep(n); handleSave({ enterprise_step: n }); }} scenario={scenario} />

        {/* Navigation */}
        <div style={{ display: "flex", gap: 6, padding: "0 4px" }}>
          {step > 1 && (
            <button onClick={() => { const n = step - 1; setStep(n); handleSave({ enterprise_step: n }); }} style={{ flex: 1, padding: "9px 0", fontSize: 12, fontWeight: 600, background: "rgba(0,0,0,0.05)", color: "#555", border: "none", borderRadius: 10, cursor: "pointer" }}>← Zurück</button>
          )}
          {step < 6 && (
            <button onClick={() => { const n = step + 1; setStep(n); handleSave({ enterprise_step: n }); }} style={{ flex: 1, padding: "9px 0", fontSize: 12, fontWeight: 700, background: currentStep?.color || "#007AFF", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", boxShadow: `0 2px 8px ${currentStep?.color || "#007AFF"}40` }}>Weiter →</button>
          )}
          {step === 6 && (
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: "9px 0", fontSize: 12, fontWeight: 700, background: "#34C759", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer" }}>↺ Neu</button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {step === 1 && <Step1Kontext scenario={scenario} onSave={handleStepSave} />}
        {step === 2 && <Step2Situation scenario={scenario} onSave={handleStepSave} />}
        {step === 3 && <Step3Matrix scenario={scenario} onSave={handleStepSave} />}
        {step === 4 && <Step4Aktionsplan scenario={scenario} onSave={handleStepSave} />}
        {step === 5 && <Step5Empfehlung scenario={scenario} onSave={handleStepSave} />}
        {step === 6 && <Step6LexaraSync scenario={scenario} onSave={handleStepSave} />}
      </div>
    </div>
  );
}