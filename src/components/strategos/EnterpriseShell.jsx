import { useState } from "react";
import { SF } from "./AppleCard";
import Step0DocIntelligenz from "./Step0DocIntelligenz";
import Step1Kontext from "./modules/Step1Kontext";
import Step2Situation from "./modules/Step2Situation";
import Step2VertragsAnalyse from "./modules/Step2VertragsAnalyse";
import Step3PatentAnalyse from "./modules/Step3PatentAnalyse";
import Step4HandlungsOptionen from "./modules/Step4HandlungsOptionen";
import Step5QuantitativeAnalyse from "./modules/Step5QuantitativeAnalyse";
import Step6UmsetzungsPlan from "./modules/Step6UmsetzungsPlan";
import { Brain, Share2, BookOpen } from "lucide-react";
import NotionExportTab from "./NotionExportTab";
import RechtlicheEinschaetzungenTab from "./RechtlicheEinschaetzungenTab";

const STEPS = [
  { num: 0,  label: "Dokumente & KI-Briefing", sub: "Upload · Extraktion · Automatisch befüllen",    color: "#5856D6" },
  { num: 1,  label: "Kontext & Situation",      sub: "Unternehmen · Sachverhalt · Rechtsgebiete",    color: "#0A84FF" },
  { num: 2,  label: "Rechtsgebiet-Analyse",     sub: "KI-Tiefenanalyse pro Rechtsgebiet",            color: "#FF9500" },
  { num: 3,  label: "Vertragsanalyse",          sub: "Klausel-Risiko · Szenarioprojektion",          color: "#0A84FF" },
  { num: 4,  label: "Patentanalyse",            sub: "Schutzbereich · FTO · Strategische Optionen",  color: "#FF9500" },
  { num: 5,  label: "Handlungsoptionen",        sub: "Von A nach C · Gegner-Antizipation",           color: "#1DB954" },
  { num: 6,  label: "Quantitative Analyse",     sub: "EV · Monte Carlo · Bußgeld-Worst-Case",        color: "#5856D6" },
  { num: 7,  label: "Umsetzungsplan",           sub: "Roadmap · Monitoring · LEXARA-Export",         color: "#AF52DE" },
];

function Stepper({ current, onSelect, scenario }) {
  const ctx = scenario.unternehmenskontext || {};
  const sit = scenario.situationsanalyse || {};
  const ki  = scenario.ki_analyse || {};

  const doneMap = {
    0: !!(scenario.ki_kontext?.analyse),
    1: Object.keys(ctx).length > 3,
    2: (sit.module?.length || 0) > 0,
    3: !!ki.vertrags_analyse,
    4: !!ki.patent_analyse,
    5: !!ki.handlungsoptionen,
    6: !!ki.quant_analyse,
    7: !!ki.umsetzungsplan,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 16 }}>
      {STEPS.map(s => {
        const active = current === s.num;
        const done   = doneMap[s.num];
        return (
          <button key={s.num} onClick={() => onSelect(s.num)}
            style={{
              display: "flex", alignItems: "center", gap: 11,
              padding: "9px 13px", borderRadius: 11,
              background: active ? `${s.color}12` : "transparent",
              border: active ? `1px solid ${s.color}30` : "1px solid transparent",
              cursor: "pointer", textAlign: "left",
              transition: "all 0.15s",
              fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif",
            }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              background: done ? s.color : active ? `${s.color}20` : "rgba(0,0,0,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {done ? (
                <svg width={13} height={13} viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, color: active ? s.color : "#aaa" }}>{s.num}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11.5, fontWeight: active ? 700 : 500, color: active ? s.color : done ? "#333" : "#888", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</p>
              <p style={{ fontSize: 9.5, color: "#aaa", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.sub}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function EnterpriseShell({ scenario, onSave }) {
  const [step, setStep] = useState(scenario.enterprise_step ?? 0);
  const [showExport, setShowExport] = useState(false);
  const [showEinschaetzungen, setShowEinschaetzungen] = useState(false);

  const handleSave = async (patch) => {
    const updated = { ...scenario, ...patch };
    await onSave(updated);
  };

  const handleStepSave = async (patch) => {
    await handleSave({ ...patch, enterprise_step: step });
  };

  const currentStep = STEPS.find(s => s.num === step);

  return (
    <div style={{ display: "flex", gap: 20, minHeight: 600, fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 228, flexShrink: 0 }}>
        <div style={{ padding: "12px 13px 8px", marginBottom: 4 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>Strategos Enterprise</p>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a1a", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scenario.title || "Neues Szenario"}</p>
          <p style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>
            {(scenario.unternehmenskontext?.rechtsgebiete || []).length > 0
              ? `${(scenario.unternehmenskontext.rechtsgebiete).length} Rechtsgebiet(e)`
              : "Präventive Entscheidungsintelligenz"}
          </p>
        </div>

        <Stepper current={step} onSelect={(n) => { setStep(n); handleSave({ enterprise_step: n }); }} scenario={scenario} />

        {/* Navigation */}
        <div style={{ display: "flex", gap: 5, padding: "0 2px" }}>
          {step > 0 && (
            <button onClick={() => { const n = step - 1; setStep(n); handleSave({ enterprise_step: n }); }}
              style={{ flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 600, background: "rgba(0,0,0,0.05)", color: "#555", border: "none", borderRadius: 9, cursor: "pointer" }}>
              ← Zurück
            </button>
          )}
          {step < STEPS.length && (
            <button onClick={() => { const n = step + 1; setStep(n); handleSave({ enterprise_step: n }); }}
              style={{ flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 700, background: currentStep?.color || "#0A84FF", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", boxShadow: `0 2px 8px ${currentStep?.color || "#0A84FF"}40` }}>
              Weiter →
            </button>
          )}
          {step === STEPS.length && (
            <button onClick={() => { setStep(1); handleSave({ enterprise_step: 1 }); }}
              style={{ flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 700, background: "#1DB954", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer" }}>
              ↺ Neu starten
            </button>
          )}
        </div>

        {/* Rechtliche Einschätzungen Button */}
        <button onClick={() => { setShowEinschaetzungen(!showEinschaetzungen); if (!showEinschaetzungen) setShowExport(false); }}
          style={{
            width: "100%", marginTop: 10, padding: "8px 0",
            fontSize: 11, fontWeight: 700,
            background: showEinschaetzungen ? "#5856D6" : "rgba(0,0,0,0.05)",
            color: showEinschaetzungen ? "#fff" : "#555",
            border: "none", borderRadius: 9, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.15s"
          }}>
          <BookOpen size={12} /> {showEinschaetzungen ? "← Zurück zur Analyse" : "Rechtliche Einschätzungen"}
        </button>

        {/* Notion Export Button */}
        <button onClick={() => { setShowExport(!showExport); if (!showExport) setShowEinschaetzungen(false); }}
          style={{
            width: "100%", marginTop: 10, padding: "8px 0",
            fontSize: 11, fontWeight: 700,
            background: showExport ? "#000" : "rgba(0,0,0,0.05)",
            color: showExport ? "#fff" : "#555",
            border: "none", borderRadius: 9, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.15s"
          }}>
          <Share2 size={12} /> {showExport ? "← Zurück zur Analyse" : "Notion-Export / Übersicht"}
        </button>

        {/* Kurzinfo */}
        <div style={{ marginTop: 14, padding: "10px 13px", background: "rgba(0,0,0,0.03)", borderRadius: 10 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>Dieser Schritt</p>
          <p style={{ fontSize: 11, fontWeight: 700, color: currentStep?.color || "#1a1a1a" }}>{currentStep?.label}</p>
          <p style={{ fontSize: 10, color: "#aaa", marginTop: 2, lineHeight: 1.4 }}>{currentStep?.sub}</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {showEinschaetzungen ? (
          <RechtlicheEinschaetzungenTab scenario={scenario} />
        ) : showExport ? (
          <NotionExportTab scenario={scenario} />
        ) : (
          <>
            {step === 0 && <Step0DocIntelligenz scenario={scenario} onSave={handleStepSave} onProceed={() => { setStep(1); handleSave({ enterprise_step: 1 }); }} />}
            {step === 1 && <Step1Kontext scenario={scenario} onSave={handleStepSave} />}
            {step === 2 && <Step2Situation scenario={scenario} onSave={handleStepSave} />}
            {step === 3 && <Step2VertragsAnalyse scenario={scenario} onSave={handleStepSave} />}
            {step === 4 && <Step3PatentAnalyse scenario={scenario} onSave={handleStepSave} />}
            {step === 5 && <Step4HandlungsOptionen scenario={scenario} onSave={handleStepSave} />}
            {step === 6 && <Step5QuantitativeAnalyse scenario={scenario} onSave={handleStepSave} />}
            {step === 7 && <Step6UmsetzungsPlan scenario={scenario} onSave={handleStepSave} />}
          </>
        )}
      </div>
    </div>
  );
}