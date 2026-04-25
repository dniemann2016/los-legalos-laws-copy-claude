import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, ArrowLeft, ArrowRight, Check, Target, BookOpen, ChevronDown, ChevronUp, Sparkles, Wand2, GitCompare, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EnterpriseShell from "@/components/strategos/EnterpriseShell";

const SZENARIO_TYPEN = {
  fusion_uebernahme: { label: "Fusion / Übernahme", icon: "🏢", color: "#007AFF" },
  patentverletzung: { label: "Patentverletzung", icon: "⚙️", color: "#FF9500" },
  steueroptimierung: { label: "Steueroptimierung", icon: "💰", color: "#34C759" },
  compliance_risiko: { label: "Compliance-Risiko", icon: "⚠️", color: "#FF3B30" },
  kartellrecht: { label: "Kartellrecht", icon: "🔗", color: "#5856D6" },
  arbeitsrecht: { label: "Arbeitsrecht", icon: "👥", color: "#AF52DE" },
  strafrecht: { label: "Strafrecht", icon: "⚖️", color: "#000" },
  vertragsbruch: { label: "Vertragsbruch", icon: "📄", color: "#8E8E93" },
  insolvenz: { label: "Insolvenz", icon: "📉", color: "#FF2D55" },
  markenrecht: { label: "Markenrecht", icon: "®️", color: "#00BCD4" },
  datenschutz: { label: "Datenschutz", icon: "🔒", color: "#4CAF50" },
  sonstiges: { label: "Sonstiges", icon: "📋", color: "#9E9E9E" },
};

const STEPS = [
  { id: 1, title: "Kontext", desc: "Unternehmen, Sachverhalt, Rechtsgebiete" },
  { id: 2, title: "Rechtsanalyse", desc: "KI-Tiefenanalyse pro Rechtsgebiet" },
  { id: 3, title: "Verträge", desc: "Klausel-Risiko, Szenarioprojektion" },
  { id: 4, title: "Patente", desc: "Schutzbereich, Freedom-to-Operate" },
  { id: 5, title: "Optionen", desc: "Von A nach C — Gegner-Antizipation" },
  { id: 6, title: "Quantitativ", desc: "EV, Monte Carlo, Bußgeld-Worst-Case" },
  { id: 7, title: "Umsetzung", desc: "Roadmap, Monitoring, LEXARA-Export" },
];

function ScenarioCard({ scenario, onClick }) {
  const typ = SZENARIO_TYPEN[scenario.szenario_typ] || SZENARIO_TYPEN.sonstiges;
  const progress = Math.round(((scenario.step_completed || 1) / 7) * 100);
  return (
    <div onClick={onClick} className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:shadow-lg hover:border-green-200 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: typ.color + "15" }}>{typ.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-400 font-medium uppercase">{typ.label}</p>
          <h3 className="text-sm font-semibold text-gray-900 truncate">{scenario.title}</h3>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] text-gray-400">{scenario.step_completed || 1}/7</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoopholeCard({ loophole, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono px-1.5 py-0.5 bg-gray-100 rounded">{loophole.gesetz} {loophole.paragraph}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${loophole.aktiv ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{loophole.aktiv ? "Aktiv" : "Geschlossen"}</span>
            {loophole.ki_generated && <span className="text-[9px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded">KI</span>}
          </div>
          <h4 className="text-sm font-semibold text-gray-800">{loophole.titel}</h4>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <p className="text-xs text-gray-600">{loophole.beschreibung}</p>
          <div className="flex gap-4 text-xs">
            <span className="text-gray-500">Potential: <strong className={loophole.nutzungspotential === "hoch" ? "text-green-600" : "text-gray-600"}>{loophole.nutzungspotential}</strong></span>
            <span className="text-gray-500">Risiko: <strong className={loophole.risiko_bei_nutzung === "hoch" ? "text-red-600" : "text-gray-600"}>{loophole.risiko_bei_nutzung}</strong></span>
          </div>
          {loophole.bekannte_faelle && <p className="text-xs text-gray-500"><strong>Präzedenzfälle:</strong> {loophole.bekannte_faelle}</p>}
          {onDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete(loophole.id); }} className="text-xs text-red-500 hover:text-red-700 mt-2">
              <Trash2 className="w-3 h-3 inline mr-1" /> Löschen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Strategos() {
  const [scenarios, setScenarios] = useState([]);
  const [loopholes, setLoopholes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeScenario, setActiveScenario] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [newScenario, setNewScenario] = useState({ title: "", szenario_typ: "sonstiges", rechtsgebiet: "" });
  const [view, setView] = useState("scenarios");
  const [compareIds, setCompareIds] = useState([]);
  const [mode, setMode] = useState("classic"); // "classic" | "enterprise"

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [sc, lh] = await Promise.all([
      base44.entities.StrategosScenario.list("-created_date"),
      base44.entities.LegalLoophole.list("-created_date"),
    ]);
    setScenarios(sc);
    setLoopholes(lh);
    setLoading(false);
  };

  const createScenario = async () => {
    if (!newScenario.title.trim()) return;
    const created = await base44.entities.StrategosScenario.create({ ...newScenario, status: "entwurf", step_completed: 1 });
    setNewScenario({ title: "", szenario_typ: "sonstiges", rechtsgebiet: "" });
    setShowCreate(false);
    loadData();
    setActiveScenario(created);
    setActiveStep(1);
  };

  const openScenario = (sc) => { setActiveScenario(sc); setActiveStep(sc.step_completed || 1); };

  const saveScenario = async (updates) => {
    const updated = await base44.entities.StrategosScenario.update(activeScenario.id, updates);
    setActiveScenario(prev => ({ ...prev, ...updates, ...updated }));
    return updated;
  };

  const deleteLoophole = async (id) => { await base44.entities.LegalLoophole.delete(id); loadData(); };

  const goNext = async () => {
    const updated = await base44.entities.StrategosScenario.update(activeScenario.id, {
      step_completed: Math.max(activeScenario.step_completed || 1, activeStep)
    });
    setActiveScenario(updated);
    setActiveStep(s => Math.min(7, s + 1));
  };

  if (activeScenario && mode === "enterprise") {
    return (
      <div className="min-h-screen" style={{ background: "#f0f0f0", fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}>
        <div className="sticky top-0 z-20" style={{ background: "rgba(246,246,246,0.97)", borderBottom: "1px solid rgba(0,0,0,0.1)", backdropFilter: "blur(20px)" }}>
          <div className="max-w-6xl mx-auto px-5 py-2.5 flex items-center gap-3">
            <button onClick={() => setActiveScenario(null)} className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-800">
              <ArrowLeft className="w-3 h-3" /> Zurück
            </button>
            <span className="text-gray-300">›</span>
            <span className="text-[11px] text-gray-600 font-semibold">{activeScenario.title}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: "rgba(0,0,0,0.04)", padding: 2, borderRadius: 10 }}>
              <button onClick={() => setMode("classic")} style={{ padding: "5px 12px", fontSize: 11, fontWeight: 600, background: mode === "classic" ? "#fff" : "transparent", color: mode === "classic" ? "#1a1a1a" : "#888", border: "none", borderRadius: 8, cursor: "pointer", boxShadow: mode === "classic" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Classic</button>
              <button onClick={() => setMode("enterprise")} style={{ padding: "5px 12px", fontSize: 11, fontWeight: 700, background: mode === "enterprise" ? "#007AFF" : "transparent", color: mode === "enterprise" ? "#fff" : "#888", border: "none", borderRadius: 8, cursor: "pointer", boxShadow: mode === "enterprise" ? "0 2px 8px rgba(0,122,255,0.3)" : "none", display: "flex", alignItems: "center", gap: 5 }}><Building2 style={{ width: 11, height: 11 }} /> Enterprise</button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-5 py-5">
          <EnterpriseShell
            scenario={activeScenario}
            onSave={async (updates) => {
              const updated = await base44.entities.StrategosScenario.update(activeScenario.id, updates);
              setActiveScenario(prev => ({ ...prev, ...updates, ...updated }));
              return updated;
            }}
          />
        </div>
      </div>
    );
  }

  if (activeScenario) {
    return (
      <div className="min-h-screen" style={{ background: "#f0f0f0", fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}>
        <div className="sticky top-0 z-20" style={{ background: "rgba(246,246,246,0.97)", borderBottom: "1px solid rgba(0,0,0,0.1)", backdropFilter: "blur(20px)" }}>
          <div className="max-w-5xl mx-auto px-5">
            <div className="flex items-center gap-2 py-2.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <button onClick={() => setActiveScenario(null)} className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-800">
                <ArrowLeft className="w-3 h-3" /> Zurück
              </button>
              <span className="text-gray-300">›</span>
              <span className="text-[11px] text-gray-600">{activeScenario.title}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <h1 className="text-[14px] font-semibold text-gray-900">{activeScenario.title}</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: (SZENARIO_TYPEN[activeScenario.szenario_typ]?.color || "#999") + "15", color: SZENARIO_TYPEN[activeScenario.szenario_typ]?.color || "#999" }}>
                  {SZENARIO_TYPEN[activeScenario.szenario_typ]?.label}
                </span>
                <div style={{ display: "flex", gap: 3, background: "rgba(0,0,0,0.04)", padding: 2, borderRadius: 9 }}>
                  <button onClick={() => setMode("classic")} style={{ padding: "4px 10px", fontSize: 10, fontWeight: 600, background: mode === "classic" ? "#fff" : "transparent", color: mode === "classic" ? "#1a1a1a" : "#888", border: "none", borderRadius: 7, cursor: "pointer", boxShadow: mode === "classic" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Classic</button>
                  <button onClick={() => setMode("enterprise")} style={{ padding: "4px 10px", fontSize: 10, fontWeight: 700, background: mode === "enterprise" ? "#007AFF" : "transparent", color: mode === "enterprise" ? "#fff" : "#888", border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Building2 style={{ width: 10, height: 10 }} /> Enterprise</button>
                </div>
              </div>
            </div>
            <div className="flex gap-0 overflow-x-auto" style={{ marginBottom: "-1px" }}>
              {STEPS.map(s => (
                <button key={s.id} onClick={() => setActiveStep(s.id)}
                  className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[11px] transition-all"
                  style={{ fontWeight: activeStep === s.id ? 600 : 400, color: activeStep === s.id ? "#1a1a1a" : "#888", borderBottom: activeStep === s.id ? "2px solid #34C759" : "2px solid transparent" }}>
                  {(activeScenario.step_completed || 1) >= s.id
                    ? <Check className="w-3 h-3 text-green-500" />
                    : <span className="w-3.5 h-3.5 rounded-full border text-[9px] flex items-center justify-center" style={{ borderColor: activeStep === s.id ? "#1a1a1a" : "#ccc", color: activeStep === s.id ? "#1a1a1a" : "#aaa" }}>{s.id}</span>}
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-5 py-5">
          <StepContent
            step={activeStep}
            scenario={activeScenario}
            onSave={saveScenario}
            loopholes={loopholes}
            onLoadData={loadData}
          />
          <div className="flex items-center justify-between mt-8 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
            <button onClick={() => setActiveStep(s => Math.max(1, s - 1))} disabled={activeStep === 1}
              className="flex items-center gap-1 text-[12px] font-medium text-gray-500 disabled:opacity-30">
              <ArrowLeft className="w-3.5 h-3.5" /> Zurück
            </button>
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: activeStep === i + 1 ? "#1a1a1a" : (activeScenario.step_completed || 1) >= i + 1 ? "#34C759" : "#ddd" }} />
              ))}
            </div>
            <button onClick={goNext} disabled={activeStep === 7}
              className="flex items-center gap-1 text-[12px] font-semibold text-gray-900 disabled:opacity-30">
              Weiter <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#f0f0f0", fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}>
      <div className="sticky top-0 z-20" style={{ background: "rgba(246,246,246,0.97)", borderBottom: "1px solid rgba(0,0,0,0.1)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-3">
          <div className="mr-auto">
            <p className="text-[14px] font-semibold text-gray-900">Strategos</p>
            <p className="text-[10px] text-gray-500">Präventive Entscheidungsintelligenz · Vertragsanalyse · Patente · Quantitative Risikoanalyse · LEXARA-Export</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView("scenarios")} className={`text-[11px] px-3 py-1 rounded-md transition-all ${view === "scenarios" ? "bg-white shadow-sm font-semibold text-gray-900" : "text-gray-500"}`}>Szenarien</button>
            <button onClick={() => setView("compare")} className={`text-[11px] px-3 py-1 rounded-md transition-all ${view === "compare" ? "bg-white shadow-sm font-semibold text-gray-900" : "text-gray-500"}`}>Vergleich</button>
            <button onClick={() => setView("loopholes")} className={`text-[11px] px-3 py-1 rounded-md transition-all ${view === "loopholes" ? "bg-white shadow-sm font-semibold text-gray-900" : "text-gray-500"}`}>Gesetzeslücken-DB</button>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-gray-900 text-white rounded-lg text-xs gap-1">
            <Plus className="w-3 h-3" /> Neu
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-5">
        {view === "scenarios" ? (
          loading ? (
            <div className="flex items-center justify-center py-20"><div className="w-5 h-5 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" /></div>
          ) : scenarios.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
              <Target className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">Noch keine Szenarien</p>
              <p className="text-xs text-gray-400 mt-1">Strategos analysiert geplante Handlungen — Verträge, Patente, Fusionen — bevor sie zu Konflikten werden</p>
              <Button size="sm" onClick={() => setShowCreate(true)} className="mt-4 bg-gray-900 text-white rounded-lg text-xs"><Plus className="w-3 h-3 mr-1" /> Szenario erstellen</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.map(sc => (
                <div key={sc.id} className="relative group">
                  <ScenarioCard scenario={sc} onClick={() => { openScenario(sc); setMode("classic"); }} />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={e => { e.stopPropagation(); openScenario(sc); setMode("enterprise"); }}
                      style={{ fontSize: 10, padding: "3px 8px", background: "#007AFF", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}
                      title="Enterprise-Modus öffnen">
                      <Building2 style={{ width: 10, height: 10 }} /> Enterprise
                    </button>
                    <button onClick={e => { e.stopPropagation(); setCompareIds(ids => ids.includes(sc.id) ? ids.filter(i => i !== sc.id) : ids.length < 2 ? [...ids, sc.id] : [ids[1], sc.id]); setView("compare"); }}
                      className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${compareIds.includes(sc.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-400 border-gray-200"}`}
                      title="Zum Vergleich hinzufügen">
                      <GitCompare className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : view === "compare" ? (
          <ScenarioCompare scenarios={scenarios} compareIds={compareIds} setCompareIds={setCompareIds} />
        ) : (
          <div className="space-y-3">
            {loopholes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">Keine Gesetzeslücken erfasst</p>
                <p className="text-xs text-gray-400 mt-1">Lücken werden beim Analysieren von Szenarien automatisch hinzugefügt</p>
              </div>
            ) : loopholes.map(lh => <LoopholeCard key={lh.id} loophole={lh} onDelete={deleteLoophole} />)}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Neues Szenario</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">Titel *</label>
                <input value={newScenario.title} onChange={e => setNewScenario({ ...newScenario, title: e.target.value })}
                  placeholder="z.B. Patent XY verletzen vs. lizenzieren" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Szenario-Typ</label>
                  <select value={newScenario.szenario_typ} onChange={e => setNewScenario({ ...newScenario, szenario_typ: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
                    {Object.entries(SZENARIO_TYPEN).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Rechtsgebiet</label>
                  <input value={newScenario.rechtsgebiet} onChange={e => setNewScenario({ ...newScenario, rechtsgebiet: e.target.value })}
                    placeholder="z.B. Patentrecht" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button onClick={createScenario} disabled={!newScenario.title.trim()} className="flex-1 bg-gray-900 text-white rounded-lg">Erstellen</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-lg">Abbrechen</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STEP CONTENT ────────────────────────────────────────────────────────────
function StepContent({ step, scenario, onSave, loopholes, onLoadData }) {
  const [form, setForm] = useState({});

  // Sync form whenever scenario data changes (e.g. after save/reload)
  useEffect(() => {
    setForm({
      ausgangslage: scenario.ausgangslage || "",
      fragestellung: scenario.fragestellung || "",
      option_a: scenario.option_a || {},
      option_b: scenario.option_b || {},
      option_c: scenario.option_c || {},
      finanzdaten: scenario.finanzdaten || {},
      gesetzesluecken: scenario.gesetzesluecken || [],
      empfehlung: scenario.empfehlung || "",
      notes: scenario.notes || "",
    });
  }, [scenario.id, scenario.updated_date]);

  const save = (updates) => { setForm(f => ({ ...f, ...updates })); onSave(updates); };

  // Merged scenario: combine DB scenario with current local form for KI calls
  const mergedScenario = { ...scenario, ...form };

  if (step === 1) return <Step1 form={form} setForm={setForm} save={save} />;
  if (step === 2) return <Step2 form={form} setForm={setForm} save={save} scenario={mergedScenario} />;
  if (step === 3) return <Step3 form={form} setForm={setForm} save={save} />;
  if (step === 4) return <Step4 form={form} setForm={setForm} save={save} scenario={mergedScenario} />;
  if (step === 5) return <Step5 form={form} setForm={setForm} save={save} scenario={mergedScenario} loopholes={loopholes} onLoadData={onLoadData} />;
  if (step === 6) return <Step6 scenario={mergedScenario} onSave={onSave} />;
  if (step === 7) return <Step7 form={form} setForm={setForm} save={save} />;
  return null;
}

// ── STEP 1: Sachverhalt ──────────────────────────────────────────────────────
function Step1({ form, setForm, save }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">Sachverhalt & Fragestellung</h3>
      <p className="text-xs text-gray-500">Beschreiben Sie den Sachverhalt ausführlich — die KI nutzt diese Angaben um Optionen, Risiken und Gesetzeslücken zu ermitteln.</p>
      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">Ausgangslage / Sachverhalt</label>
        <textarea value={form.ausgangslage} onChange={e => setForm(f => ({ ...f, ausgangslage: e.target.value }))}
          onBlur={() => save({ ausgangslage: form.ausgangslage })}
          placeholder="Beschreiben Sie die aktuelle Situation des Unternehmens / Mandanten ausführlich..." rows={6} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
      </div>
      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">Zentrale Fragestellung</label>
        <textarea value={form.fragestellung} onChange={e => setForm(f => ({ ...f, fragestellung: e.target.value }))}
          onBlur={() => save({ fragestellung: form.fragestellung })}
          placeholder="Was soll analysiert werden? z.B.: Lohnt es sich, das Patent zu verletzen statt zu lizenzieren?" rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
      </div>
      <div className="bg-green-50 border border-green-100 rounded-lg p-3">
        <p className="text-xs text-green-700"><strong>Hinweis:</strong> Nach dem Klick auf „Weiter" analysiert die KI automatisch Sachverhalt und Fragestellung und schlägt passende Handlungsoptionen, Risiken und Gesetzeslücken vor.</p>
      </div>
    </div>
  );
}

// ── STEP 2: Optionen (KI + manuell) ─────────────────────────────────────────
function Step2({ form, setForm, save, scenario }) {
  const [generating, setGenerating] = useState(false);
  const [kiOptionen, setKiOptionen] = useState(scenario.ki_analyse?.ki_optionen || null);
  const [extraOptions, setExtraOptions] = useState(scenario.ki_analyse?.extra_options || []);
  const [newOptionText, setNewOptionText] = useState("");
  const [addingExtra, setAddingExtra] = useState(false);

  const generateOptions = async () => {
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener Stratege, Unternehmensberater und Rechtsanwalt für Wirtschaftsrecht. Analysiere den folgenden Sachverhalt und erarbeite konkrete, praxistaugliche Handlungsoptionen für Unternehmen und Mandanten.

Szenario-Typ: ${SZENARIO_TYPEN[scenario.szenario_typ]?.label || scenario.szenario_typ}
Rechtsgebiet: ${scenario.rechtsgebiet || "Wirtschaftsrecht / Unternehmensrecht"}
Szenario-Titel: ${scenario.title || ""}
Ausgangslage: ${scenario.ausgangslage || "(Bitte basiere deine Analyse auf dem Szenario-Typ und -Titel)"}
Zentrale Fragestellung: ${scenario.fragestellung || "(Leite aus dem Szenario-Typ die relevante Fragestellung ab)"}
Nutzer-Hinweise: ${extraOptions.length > 0 ? extraOptions.map(o => o.text).join("; ") : "Keine weiteren Hinweise"}

Erstelle 3 differenzierte Handlungsoptionen mit konkreten, unternehmensbezogenen Empfehlungen:
- Option A: Der sichere, rechtlich einwandfreie Weg (konservativ, minimales Risiko)
- Option B: Der aggressive, risikoreiche Weg mit höherem Potential (maximiert Gewinn/Vorteil)
- Option C: Ein Hybrid / kreativer Mittelweg (balanciert Risiko und Potential)

Sei dabei KONKRET und PRAXISNAH — keine allgemeinen Aussagen, sondern spezifische Maßnahmen, Paragraphen, Fristen und Handlungsschritte für Unternehmen.`,
      response_json_schema: {
        type: "object",
        properties: {
          option_a: {
            type: "object",
            properties: {
              beschreibung: { type: "string" },
              kernstrategie: { type: "string" },
              erfolg_pct: { type: "number" },
              risiko_pct: { type: "number" },
              zeithorizont: { type: "string" },
              vorteile: { type: "array", items: { type: "string" } },
              nachteile: { type: "array", items: { type: "string" } }
            }
          },
          option_b: {
            type: "object",
            properties: {
              beschreibung: { type: "string" },
              kernstrategie: { type: "string" },
              erfolg_pct: { type: "number" },
              risiko_pct: { type: "number" },
              zeithorizont: { type: "string" },
              vorteile: { type: "array", items: { type: "string" } },
              nachteile: { type: "array", items: { type: "string" } }
            }
          },
          option_c: {
            type: "object",
            properties: {
              beschreibung: { type: "string" },
              kernstrategie: { type: "string" },
              erfolg_pct: { type: "number" },
              risiko_pct: { type: "number" },
              zeithorizont: { type: "string" },
              vorteile: { type: "array", items: { type: "string" } },
              nachteile: { type: "array", items: { type: "string" } }
            }
          },
          begruendung: { type: "string" }
        }
      }
    });

    setKiOptionen(result);
    // Merge KI suggestions into form
    const mergedA = { ...form.option_a, ...result.option_a };
    const mergedB = { ...form.option_b, ...result.option_b };
    const mergedC = { ...form.option_c, ...result.option_c };
    setForm(f => ({ ...f, option_a: mergedA, option_b: mergedB, option_c: mergedC }));

    // Save KI options in ki_analyse for training context
    await save({
      option_a: mergedA, option_b: mergedB, option_c: mergedC,
      ki_analyse: { ...(scenario.ki_analyse || {}), ki_optionen: result, extra_options: extraOptions }
    });
    setGenerating(false);
  };

  const addExtraOption = async () => {
    if (!newOptionText.trim()) return;
    const updated = [...extraOptions, { text: newOptionText, timestamp: new Date().toISOString() }];
    setExtraOptions(updated);
    setNewOptionText("");
    setAddingExtra(false);
    // Save extra options as training data
    await save({ ki_analyse: { ...(scenario.ki_analyse || {}), extra_options: updated, ki_optionen: kiOptionen } });
  };

  return (
    <div className="space-y-4">
      {/* KI Generate Button */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">KI-Optionsanalyse</h3>
          <p className="text-xs text-gray-500 mt-0.5">Die KI analysiert Sachverhalt und Fragestellung und ermittelt optimale Handlungsoptionen.</p>
          {kiOptionen?.begruendung && <p className="text-xs text-green-700 mt-2 bg-green-50 rounded-lg p-2">{kiOptionen.begruendung}</p>}
        </div>
        <Button size="sm" onClick={generateOptions} disabled={generating}
          className="flex-shrink-0 bg-violet-600 text-white rounded-lg text-xs gap-1">
          <Wand2 className="w-3 h-3" /> {generating ? "Analysiere..." : kiOptionen ? "Neu generieren" : "KI-Optionen ermitteln"}
        </Button>
      </div>

      {/* Eigene zusätzliche Optionshinweise */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-xs font-semibold text-gray-700">Eigene Optionshinweise für die KI</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Geben Sie der KI zusätzliche Ideen oder Einschränkungen mit — diese fließen in die Analyse ein.</p>
          </div>
          <button onClick={() => setAddingExtra(!addingExtra)} className="text-xs text-violet-600 hover:text-violet-800 font-medium">+ Hinweis</button>
        </div>
        {extraOptions.length > 0 && (
          <div className="space-y-1 mb-3">
            {extraOptions.map((o, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-violet-500 font-bold flex-shrink-0">→</span>
                <span>{o.text}</span>
                <button onClick={() => { const u = extraOptions.filter((_, j) => j !== i); setExtraOptions(u); save({ ki_analyse: { ...(scenario.ki_analyse || {}), extra_options: u } }); }} className="ml-auto text-gray-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
        {addingExtra && (
          <div className="flex gap-2">
            <input value={newOptionText} onChange={e => setNewOptionText(e.target.value)} onKeyDown={e => e.key === "Enter" && addExtraOption()}
              placeholder="z.B. Außergerichtliche Einigung bevorzugt, max. 500k€ Budget..." className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg" autoFocus />
            <Button size="sm" onClick={addExtraOption} className="bg-gray-900 text-white rounded-lg text-xs">Hinzufügen</Button>
          </div>
        )}
      </div>

      {/* Option Cards */}
      {[["option_a", "Option A: Legaler Weg", "#34C759"],
        ["option_b", "Option B: Aggressiver Weg", "#FF9500"],
        ["option_c", "Option C: Hybrid / Alternativ", "#007AFF"]].map(([key, title, color]) => (
        <div key={key} className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            {form[key]?.beschreibung && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-auto">KI-Vorschlag vorhanden</span>}
          </div>
          {form[key]?.kernstrategie && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-[10px] text-gray-500 uppercase font-semibold mb-1">KI-Kernstrategie</p>
              <p className="text-xs text-gray-700">{form[key].kernstrategie}</p>
              {form[key].vorteile?.length > 0 && <p className="text-[10px] text-green-600 mt-1">+ {form[key].vorteile.join(" · ")}</p>}
              {form[key].nachteile?.length > 0 && <p className="text-[10px] text-red-500 mt-0.5">– {form[key].nachteile.join(" · ")}</p>}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase block mb-1">Beschreibung (manuell anpassen)</label>
              <textarea value={form[key]?.beschreibung || ""} onChange={e => setForm(f => ({ ...f, [key]: { ...f[key], beschreibung: e.target.value } }))}
                onBlur={() => save({ [key]: form[key] })} placeholder="Was beinhaltet diese Option?" rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">Erfolg %</label>
                <input type="number" value={form[key]?.erfolg_pct || ""}
                  onChange={e => setForm(f => ({ ...f, [key]: { ...f[key], erfolg_pct: e.target.value } }))}
                  onBlur={() => save({ [key]: form[key] })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">Risiko %</label>
                <input type="number" value={form[key]?.risiko_pct || ""}
                  onChange={e => setForm(f => ({ ...f, [key]: { ...f[key], risiko_pct: e.target.value } }))}
                  onBlur={() => save({ [key]: form[key] })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">Zeithorizont</label>
                <input value={form[key]?.zeithorizont || ""}
                  onChange={e => setForm(f => ({ ...f, [key]: { ...f[key], zeithorizont: e.target.value } }))}
                  onBlur={() => save({ [key]: form[key] })} placeholder="z.B. 2 Jahre" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── STEP 3: Finanzen ─────────────────────────────────────────────────────────
function Step3({ form, setForm, save }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">Kosten-Nutzen-Analyse</h3>
      <div className="grid grid-cols-2 gap-4">
        {[["kosten_legal", "Kosten Option A (legal) €"],
          ["kosten_aggressiv", "Kosten Option B (aggressiv) €"],
          ["erwarteter_gewinn", "Erwarteter Gewinn (Best Case) €"],
          ["potentielle_strafe", "Potentielle Strafe / Sanktion €"],
          ["reputationsschaden", "Geschätzter Reputationsschaden €"],
          ["zeitkosten", "Zeitkosten / Opportunitätskosten €"]].map(([key, label]) => (
          <div key={key}>
            <label className="text-[10px] text-gray-500 uppercase block mb-1">{label}</label>
            <input type="number" value={form.finanzdaten?.[key] || ""}
              onChange={e => setForm(f => ({ ...f, finanzdaten: { ...f.finanzdaten, [key]: Number(e.target.value) } }))}
              onBlur={() => save({ finanzdaten: form.finanzdaten })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
          </div>
        ))}
      </div>
      {form.finanzdaten?.erwarteter_gewinn && form.finanzdaten?.potentielle_strafe && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-2">Schnellberechnung:</p>
          <p className="text-sm text-gray-800">
            ROI (aggressiv): <strong>{(((form.finanzdaten.erwarteter_gewinn - form.finanzdaten.potentielle_strafe) / Math.max(1, form.finanzdaten.kosten_aggressiv || 1)) * 100).toFixed(0)}%</strong>
          </p>
        </div>
      )}
    </div>
  );
}

// ── STEP 4: Risiken (KI + manuell) ──────────────────────────────────────────
function Step4({ form, setForm, save, scenario }) {
  const [generating, setGenerating] = useState(false);
  const [kiRisiken, setKiRisiken] = useState(scenario.ki_analyse?.ki_risiken || null);
  const [manualRisk, setManualRisk] = useState({ titel: "", beschreibung: "", wahrscheinlichkeit: "mittel", auswirkung: "mittel", gegenmassnahme: "" });
  const [addingManual, setAddingManual] = useState(false);
  const manualRisiken = scenario.ki_analyse?.manual_risiken || [];

  const generateRisiken = async () => {
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein Risiko-Experte, Senior-Anwalt und Unternehmensberater. Analysiere die folgenden Handlungsoptionen umfassend auf rechtliche, wirtschaftliche, steuerliche und reputationsbezogene Risiken für Unternehmen.

Szenario-Typ: ${SZENARIO_TYPEN[scenario.szenario_typ]?.label || "Unternehmensrecht"}
Szenario-Titel: ${scenario.title || ""}
Rechtsgebiet: ${scenario.rechtsgebiet || "Wirtschaftsrecht"}
Sachverhalt: ${scenario.ausgangslage || "(Basiere auf Szenario-Typ und -Titel)"}
Fragestellung: ${scenario.fragestellung || ""}
Option A: ${JSON.stringify(scenario.option_a || { beschreibung: "Konservativer Weg" })}
Option B: ${JSON.stringify(scenario.option_b || { beschreibung: "Aggressiver Weg" })}
Option C: ${JSON.stringify(scenario.option_c || { beschreibung: "Hybrid-Weg" })}

${manualRisiken.length > 0 ? `Bereits manuell erfasste Risiken (zwingend berücksichtigen): ${manualRisiken.map(r => r.titel).join(", ")}` : ""}

Identifiziere 6-8 konkrete Risiken: rechtliche Haftung, Bußgelder, Strafverfolgung, Vertragsstrafen, Reputationsschäden, steuerliche Konsequenzen, Wettbewerbsrecht, Datenschutz (DSGVO), Insolvenzrisiko. Sei spezifisch mit Paragraphen und Normen.`,
      response_json_schema: {
        type: "object",
        properties: {
          risiken: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                beschreibung: { type: "string" },
                betrifft_option: { type: "string" },
                wahrscheinlichkeit: { type: "string" },
                auswirkung: { type: "string" },
                gegenmassnahme: { type: "string" }
              }
            }
          },
          risiko_gesamt: { type: "string" }
        }
      }
    });

    setKiRisiken(result);
    await save({ ki_analyse: { ...(scenario.ki_analyse || {}), ki_risiken: result, manual_risiken: manualRisiken } });
    setGenerating(false);
  };

  const addManualRisk = async () => {
    if (!manualRisk.titel.trim()) return;
    const updated = [...manualRisiken, { ...manualRisk, manuell: true, timestamp: new Date().toISOString() }];
    await save({ ki_analyse: { ...(scenario.ki_analyse || {}), manual_risiken: updated, ki_risiken: kiRisiken } });
    setManualRisk({ titel: "", beschreibung: "", wahrscheinlichkeit: "mittel", auswirkung: "mittel", gegenmassnahme: "" });
    setAddingManual(false);
  };

  const riskColor = (level) => level === "hoch" || level === "kritisch" ? "text-red-600 bg-red-50 border-red-100" : level === "mittel" ? "text-amber-600 bg-amber-50 border-amber-100" : "text-green-600 bg-green-50 border-green-100";

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">KI-Risikoanalyse</h3>
          <p className="text-xs text-gray-500 mt-0.5">Die KI bewertet alle Optionen auf rechtliche, wirtschaftliche und reputationsbezogene Risiken.</p>
          {kiRisiken?.risiko_gesamt && <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded-lg p-2">Gesamtrisiko: {kiRisiken.risiko_gesamt}</p>}
        </div>
        <Button size="sm" onClick={generateRisiken} disabled={generating}
          className="flex-shrink-0 bg-violet-600 text-white rounded-lg text-xs gap-1">
          <Wand2 className="w-3 h-3" /> {generating ? "Analysiere..." : kiRisiken ? "Neu analysieren" : "Risiken ermitteln"}
        </Button>
      </div>

      {kiRisiken?.risiken?.map((r, i) => (
        <div key={i} className={`rounded-xl border p-4 ${riskColor(r.wahrscheinlichkeit)}`}>
          <div className="flex items-start justify-between mb-1">
            <p className="text-sm font-semibold">{r.titel}</p>
            <div className="flex gap-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/70 font-medium">W: {r.wahrscheinlichkeit}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/70 font-medium">A: {r.auswirkung}</span>
              {r.betrifft_option && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/70 font-medium">Option {r.betrifft_option}</span>}
            </div>
          </div>
          <p className="text-xs opacity-80">{r.beschreibung}</p>
          {r.gegenmassnahme && <p className="text-[10px] mt-1 font-medium">Gegenmassnahme: {r.gegenmassnahme}</p>}
        </div>
      ))}

      {/* Manuelle Risiken */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-xs font-semibold text-gray-700">Manuelle Risiken ergänzen</h4>
            <p className="text-[10px] text-gray-400">Eigene Einschätzungen fließen in die KI-Analyse ein.</p>
          </div>
          <button onClick={() => setAddingManual(!addingManual)} className="text-xs text-violet-600 hover:text-violet-800 font-medium">+ Risiko</button>
        </div>
        {manualRisiken.map((r, i) => (
          <div key={i} className="border border-amber-100 bg-amber-50 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-800">{r.titel}</p>
              <span className="text-[9px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">Manuell</span>
            </div>
            {r.beschreibung && <p className="text-[11px] text-amber-700 mt-0.5">{r.beschreibung}</p>}
          </div>
        ))}
        {addingManual && (
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <input value={manualRisk.titel} onChange={e => setManualRisk(r => ({ ...r, titel: e.target.value }))}
              placeholder="Risikotitel *" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
            <textarea value={manualRisk.beschreibung} onChange={e => setManualRisk(r => ({ ...r, beschreibung: e.target.value }))}
              placeholder="Beschreibung..." rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
            <input value={manualRisk.gegenmassnahme} onChange={e => setManualRisk(r => ({ ...r, gegenmassnahme: e.target.value }))}
              placeholder="Gegenmassnahme..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              <select value={manualRisk.wahrscheinlichkeit} onChange={e => setManualRisk(r => ({ ...r, wahrscheinlichkeit: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
                <option value="gering">Wahrscheinlichkeit: Gering</option>
                <option value="mittel">Wahrscheinlichkeit: Mittel</option>
                <option value="hoch">Wahrscheinlichkeit: Hoch</option>
              </select>
              <select value={manualRisk.auswirkung} onChange={e => setManualRisk(r => ({ ...r, auswirkung: e.target.value }))}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
                <option value="gering">Auswirkung: Gering</option>
                <option value="mittel">Auswirkung: Mittel</option>
                <option value="hoch">Auswirkung: Hoch</option>
                <option value="kritisch">Auswirkung: Kritisch</option>
              </select>
            </div>
            <Button size="sm" onClick={addManualRisk} disabled={!manualRisk.titel.trim()} className="w-full bg-gray-900 text-white rounded-lg text-xs">
              Risiko speichern (trainiert die KI)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── STEP 5: Gesetzeslücken (KI + manuell) ───────────────────────────────────
function Step5({ form, setForm, save, scenario, loopholes, onLoadData }) {
  const [generating, setGenerating] = useState(false);
  const scenarioLoopholes = loopholes.filter(l => l.scenario_id === scenario.id);
  const kiLuecken = scenario.gesetzesluecken || [];

  const generateLoopholes = async () => {
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein Top-Experte für Gesetzeslücken, rechtliche Graubereiche und steuerliche Optimierungsmöglichkeiten für Unternehmen. Analysiere den Sachverhalt auf konkret ausnutzbare Lücken im deutschen/europäischen Recht.

Szenario-Typ: ${SZENARIO_TYPEN[scenario.szenario_typ]?.label || "Unternehmensrecht"}
Szenario-Titel: ${scenario.title || ""}
Rechtsgebiet: ${scenario.rechtsgebiet || "Wirtschafts-/Steuerrecht"}
Sachverhalt: ${scenario.ausgangslage || "(Basiere auf Szenario-Typ und -Titel)"}
Fragestellung: ${scenario.fragestellung || ""}
Handlungsoptionen: ${JSON.stringify({ a: scenario.option_a?.beschreibung || "Konservativ", b: scenario.option_b?.beschreibung || "Aggressiv", c: scenario.option_c?.beschreibung || "Hybrid" })}

${scenarioLoopholes.length > 0 ? `Bereits erfasste Lücken (NICHT duplizieren, ergänzen): ${scenarioLoopholes.map(l => l.titel).join(", ")}` : ""}

Identifiziere 4-6 KONKRETE Gesetzeslücken oder Graubereiche — mit spezifischen Paragraphen (BGB, HGB, AktG, GmbHG, AO, UStG, KStG, GewStG, UWG, GWB, DSGVO etc.). Denke an: Steueroasen-Strukturen, Gestaltungsmissbrauch-Grenzen, Holdingstrukturen, Lizenzgestaltung, Verrechnungspreise, Umwandlungsrecht, Insolvenzverschleppung-Grenzen, Kartellrechtliche Grauzonen.`,
      response_json_schema: {
        type: "object",
        properties: {
          luecken: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gesetz: { type: "string" },
                paragraph: { type: "string" },
                titel: { type: "string" },
                beschreibung: { type: "string" },
                nutzungspotential: { type: "string" },
                risiko_bei_nutzung: { type: "string" },
                bekannte_faelle: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Save KI loopholes to LegalLoophole entity
    if (result.luecken?.length > 0) {
      await Promise.all(result.luecken.map(l => base44.entities.LegalLoophole.create({
        ...l,
        scenario_id: scenario.id,
        jurisdiction: "DACH",
        aktiv: true,
        ki_generated: true,
        rechtsgebiet: scenario.rechtsgebiet || "",
      })));
      onLoadData();
    }
    // Also store simplified version in scenario
    await save({ gesetzesluecken: result.luecken || [] });
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">KI-Gesetzeslückenanalyse</h3>
          <p className="text-xs text-gray-500 mt-0.5">Die KI durchsucht das relevante Recht auf ausnutzbare Lücken und Graubereiche.</p>
        </div>
        <Button size="sm" onClick={generateLoopholes} disabled={generating}
          className="flex-shrink-0 bg-violet-600 text-white rounded-lg text-xs gap-1">
          <Wand2 className="w-3 h-3" /> {generating ? "Analysiere..." : scenarioLoopholes.length > 0 ? "Weitere finden" : "Lücken ermitteln"}
        </Button>
      </div>

      {scenarioLoopholes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600">{scenarioLoopholes.length} Lücken für dieses Szenario:</p>
          {scenarioLoopholes.map(lh => <LoopholeCard key={lh.id} loophole={lh} />)}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-1">Lücke manuell hinzufügen</h4>
        <p className="text-[10px] text-gray-400 mb-3">Manuell erfasste Lücken trainieren die KI und fließen in zukünftige Analysen ein.</p>
        <LoopholeForm scenarioId={scenario.id} onSave={onLoadData} />
      </div>
    </div>
  );
}

// ── STEP 6: KI-Gesamtanalyse ─────────────────────────────────────────────────
function Step6({ scenario, onSave }) {
  const [analysing, setAnalysing] = useState(false);
  const ki = scenario.ki_analyse;

  const runAnalysis = async () => {
    setAnalysing(true);
    const manualRisiken = ki?.manual_risiken || [];
    const extraOptions = ki?.extra_options || [];

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein strategischer Senior-Partner, Unternehmensberater und Rechtsberater auf höchstem Niveau. Führe eine vollständige, schonungslose Gesamtanalyse für das Unternehmen durch.

SZENARIO: ${scenario.title}
Typ: ${SZENARIO_TYPEN[scenario.szenario_typ]?.label || "Unternehmensrecht"}
Rechtsgebiet: ${scenario.rechtsgebiet || "Wirtschafts- und Unternehmensrecht"}
Ausgangslage: ${scenario.ausgangslage || "(Leite aus Szenario-Typ und -Titel ab)"}
Fragestellung: ${scenario.fragestellung || "(Leite aus Szenario-Typ und -Titel ab)"}

Option A (Konservativ): ${JSON.stringify(scenario.option_a || {})}
Option B (Aggressiv): ${JSON.stringify(scenario.option_b || {})}
Option C (Hybrid): ${JSON.stringify(scenario.option_c || {})}

${extraOptions.length > 0 ? `Besondere Nutzer-Anforderungen (zwingend beachten): ${extraOptions.map(o => o.text).join("; ")}` : ""}

Finanzdaten des Unternehmens: ${JSON.stringify(scenario.finanzdaten || {})}
Identifizierte Gesetzeslücken: ${JSON.stringify((scenario.gesetzesluecken || []).map(l => ({ gesetz: l.gesetz, titel: l.titel })))}
${manualRisiken.length > 0 ? `Manuell erfasste Risiken (BESONDERS gewichten als Trainings-Input): ${JSON.stringify(manualRisiken)}` : ""}
${(scenario.ki_analyse?.ki_risiken?.risiken || []).length > 0 ? `KI-Risikoanalyse-Ergebnisse: ${JSON.stringify(scenario.ki_analyse.ki_risiken.risiken.map(r => ({ titel: r.titel, wahrscheinlichkeit: r.wahrscheinlichkeit, auswirkung: r.auswirkung })))}` : ""}

DEINE AUFGABE (vollständig und konkret):
1. Bewerte JEDE Option präzise: Erfolgswahrscheinlichkeit %, Risiko %, ROI %, Erwartungswert in €
2. Berechne realistische Best/Worst/Expected Case Szenarien in € (falls keine Finanzdaten: schätze typische Werte für diesen Szenario-Typ)
3. Berücksichtige ALLE manuellen Ergänzungen als trainingswürdig gewichtete Inputs
4. Gib eine KLARE, unmissverständliche Handlungsempfehlung mit konkreten nächsten Schritten
5. Identifiziere kritische Zeitfaktoren und Deadlines`,
      response_json_schema: {
        type: "object",
        properties: {
          option_bewertungen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                option: { type: "string" },
                name: { type: "string" },
                erfolg_pct: { type: "number" },
                risiko_pct: { type: "number" },
                roi_pct: { type: "number" },
                ev_eur: { type: "number" },
                einschaetzung: { type: "string" }
              }
            }
          },
          erwartungswert_gesamt: {
            type: "object",
            properties: {
              best_case_eur: { type: "number" },
              expected_eur: { type: "number" },
              worst_case_eur: { type: "number" }
            }
          },
          empfehlung: {
            type: "object",
            properties: {
              option: { type: "string" },
              begruendung: { type: "string" },
              naechste_schritte: { type: "array", items: { type: "string" } }
            }
          },
          warnungen: { type: "array", items: { type: "string" } },
          zeitlicher_faktor: { type: "string" }
        }
      }
    });

    await onSave({
      ki_analyse: { ...(ki || {}), ...result, ki_optionen: ki?.ki_optionen, ki_risiken: ki?.ki_risiken, manual_risiken: manualRisiken, extra_options: extraOptions },
      step_completed: Math.max(scenario.step_completed || 1, 6)
    });
    setAnalysing(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">KI-Gesamtanalyse</h3>
            <p className="text-xs text-gray-500 mt-0.5">Alle manuellen Ergänzungen aus den vorherigen Schritten fließen als Trainingsdaten ein.</p>
          </div>
          <Button size="sm" onClick={runAnalysis} disabled={analysing}
            className="bg-violet-600 text-white rounded-lg text-xs gap-1">
            <Sparkles className="w-3 h-3" /> {analysing ? "Analysiere…" : ki?.option_bewertungen ? "Neu analysieren" : "Analyse starten"}
          </Button>
        </div>

        {ki?.option_bewertungen ? (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Optionsbewertung</p>
              <div className="space-y-2">
                {ki.option_bewertungen.map((o, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800">Option {o.option}: {o.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">{o.erfolg_pct}% Erfolg</span>
                    </div>
                    <p className="text-xs text-gray-600">{o.einschaetzung || o.einschätzung}</p>
                    <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
                      <span>Risiko: {o.risiko_pct}%</span>
                      <span>ROI: {o.roi_pct}%</span>
                      {o.ev_eur && <span>EV: {o.ev_eur.toLocaleString()}€</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {ki.erwartungswert_gesamt && (
              <div className="grid grid-cols-3 gap-3">
                {[["Best Case", ki.erwartungswert_gesamt.best_case_eur, "text-green-700 bg-green-50"],
                  ["Expected", ki.erwartungswert_gesamt.expected_eur, "text-blue-700 bg-blue-50"],
                  ["Worst Case", ki.erwartungswert_gesamt.worst_case_eur, "text-red-700 bg-red-50"]].map(([l, v, cls]) => (
                  <div key={l} className={`rounded-lg p-3 ${cls}`}>
                    <p className="text-[10px] font-semibold uppercase">{l}</p>
                    <p className="text-sm font-bold mt-1">{v?.toLocaleString()}€</p>
                  </div>
                ))}
              </div>
            )}
            {ki.empfehlung && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                <p className="text-xs font-semibold text-green-800 mb-1">Empfehlung: Option {ki.empfehlung.option}</p>
                <p className="text-sm text-green-700 mb-2">{ki.empfehlung.begruendung}</p>
                {ki.empfehlung.naechste_schritte?.map((s, i) => <p key={i} className="text-xs text-green-600">→ {s}</p>)}
              </div>
            )}
            {ki.warnungen?.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-amber-800 uppercase mb-1">Warnungen</p>
                {ki.warnungen.map((w, i) => <p key={i} className="text-xs text-amber-700">• {w}</p>)}
              </div>
            )}
            {ki.zeitlicher_faktor && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Zeitlicher Faktor</p>
                <p className="text-xs text-gray-700">{ki.zeitlicher_faktor}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">Starten Sie die KI-Analyse für eine umfassende Bewertung aller Optionen, Risiken und Gesetzeslücken.</p>
        )}
      </div>
    </div>
  );
}

// ── STEP 7: Empfehlung ───────────────────────────────────────────────────────
function Step7({ form, setForm, save }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Abschlussempfehlung</h3>
        <div>
          <label className="text-[10px] text-gray-500 uppercase block mb-1">Ihre finale Empfehlung</label>
          <textarea value={form.empfehlung} onChange={e => setForm(f => ({ ...f, empfehlung: e.target.value }))}
            onBlur={() => save({ empfehlung: form.empfehlung })}
            placeholder="Fassen Sie Ihre finale Empfehlung zusammen..." rows={4} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase block mb-1">Notizen</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            onBlur={() => save({ notes: form.notes })}
            placeholder="Zusätzliche Notizen..." rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
        </div>
      </div>
      <Button onClick={() => save({ status: "ergebnis", step_completed: 7 })} className="w-full bg-green-600 text-white rounded-lg">
        <Check className="w-4 h-4 mr-2" /> Analyse abschließen
      </Button>
    </div>
  );
}

// ── SCENARIO COMPARE ─────────────────────────────────────────────────────────
function ScenarioCompare({ scenarios, compareIds, setCompareIds }) {
  const [kiLearning, setKiLearning] = useState(null);
  const [loadingKI, setLoadingKI] = useState(false);

  const completed = scenarios.filter(s => s.status === "ergebnis" || (s.step_completed || 0) >= 6);
  const scA = scenarios.find(s => s.id === compareIds[0]) || null;
  const scB = scenarios.find(s => s.id === compareIds[1]) || null;

  const runKILearning = async () => {
    if (!scA || !scB) return;
    setLoadingKI(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein lernender Strategieberater. Vergleiche zwei abgeschlossene Szenarien und leite daraus Lernerkenntnisse für zukünftige Strategien ab.

SZENARIO 1: ${scA.title}
Typ: ${SZENARIO_TYPEN[scA.szenario_typ]?.label}
Ausgangslage: ${scA.ausgangslage || "–"}
Gewählte Empfehlung: ${scA.empfehlung || scA.ki_analyse?.empfehlung?.begruendung || "–"}
Option A Erfolg: ${scA.option_a?.erfolg_pct || "?"}%  |  Option B: ${scA.option_b?.erfolg_pct || "?"}%  |  Option C: ${scA.option_c?.erfolg_pct || "?"}%
KI-Empfehlung war: Option ${scA.ki_analyse?.empfehlung?.option || "?"}
Ergebnis/Abschluss: ${scA.status}

SZENARIO 2: ${scB.title}
Typ: ${SZENARIO_TYPEN[scB.szenario_typ]?.label}
Ausgangslage: ${scB.ausgangslage || "–"}
Gewählte Empfehlung: ${scB.empfehlung || scB.ki_analyse?.empfehlung?.begruendung || "–"}
Option A Erfolg: ${scB.option_a?.erfolg_pct || "?"}%  |  Option B: ${scB.option_b?.erfolg_pct || "?"}%  |  Option C: ${scB.option_c?.erfolg_pct || "?"}%
KI-Empfehlung war: Option ${scB.ki_analyse?.empfehlung?.option || "?"}
Ergebnis/Abschluss: ${scB.status}

Leite daraus ab:
1. Welche Strategiemuster haben funktioniert?
2. Was hätte besser gemacht werden können?
3. Wie sollen Erfolgswahrscheinlichkeiten bei ähnlichen Szenarien in Zukunft gewichtet werden?
4. Konkrete Lernregeln für den Nutzer`,
      response_json_schema: {
        type: "object",
        properties: {
          muster_die_funktionierten: { type: "array", items: { type: "string" } },
          verbesserungspotenzial: { type: "array", items: { type: "string" } },
          gewichtungshinweise: { type: "array", items: { type: "string" } },
          lernregeln: { type: "array", items: { type: "string" } },
          fazit: { type: "string" }
        }
      },
      model: "claude_sonnet_4_6"
    });
    setKiLearning(result);
    setLoadingKI(false);
  };

  const CompareCol = ({ sc, label }) => {
    if (!sc) return (
      <div className="flex-1 bg-white rounded-xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-2 min-h-48">
        <p className="text-xs font-semibold text-gray-400">{label}</p>
        <p className="text-[10px] text-gray-300 text-center">Szenario auswählen</p>
        <div className="mt-2 space-y-1 w-full max-h-48 overflow-y-auto">
          {completed.map(s => (
            <button key={s.id} onClick={() => setCompareIds(ids => label === "Szenario A" ? [s.id, ids[1] || null] : [ids[0] || null, s.id])}
              className="w-full text-left px-3 py-2 text-xs rounded-lg bg-gray-50 hover:bg-gray-100 transition-all text-gray-600 truncate">
              {SZENARIO_TYPEN[s.szenario_typ]?.icon} {s.title}
            </button>
          ))}
        </div>
      </div>
    );

    const ki = sc.ki_analyse;
    const typ = SZENARIO_TYPEN[sc.szenario_typ] || SZENARIO_TYPEN.sonstiges;

    return (
      <div className="flex-1 bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-semibold">{label}</p>
            <h3 className="text-sm font-semibold text-gray-900 mt-0.5">{sc.title}</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: typ.color + "15", color: typ.color }}>{typ.icon} {typ.label}</span>
          </div>
          <button onClick={() => setCompareIds(ids => label === "Szenario A" ? [null, ids[1]] : [ids[0], null])} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
        </div>

        {/* Optionen */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Handlungsoptionen</p>
          {[["option_a", "A", "#34C759"], ["option_b", "B", "#FF9500"], ["option_c", "C", "#007AFF"]].map(([key, lbl, color]) => sc[key]?.beschreibung ? (
            <div key={key} className="flex items-start gap-2 mb-2">
              <div className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ background: color }}>
                <span className="text-[8px] text-white font-bold">{lbl}</span>
              </div>
              <div>
                <p className="text-xs text-gray-700 line-clamp-2">{sc[key].beschreibung}</p>
                {sc[key].erfolg_pct && <p className="text-[10px] text-gray-400 mt-0.5">{sc[key].erfolg_pct}% Erfolg · {sc[key].risiko_pct}% Risiko</p>}
              </div>
            </div>
          ) : null)}
        </div>

        {/* KI Empfehlung */}
        {ki?.empfehlung && (
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-green-700 uppercase mb-1">KI empfahl Option {ki.empfehlung.option}</p>
            <p className="text-xs text-green-700 line-clamp-3">{ki.empfehlung.begruendung}</p>
          </div>
        )}

        {/* Erwartungswerte */}
        {ki?.erwartungswert_gesamt && (
          <div className="grid grid-cols-3 gap-1">
            {[["Best", ki.erwartungswert_gesamt.best_case_eur, "text-green-600"],
              ["EV", ki.erwartungswert_gesamt.expected_eur, "text-blue-600"],
              ["Worst", ki.erwartungswert_gesamt.worst_case_eur, "text-red-500"]].map(([l, v, cls]) => (
              <div key={l} className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-[9px] text-gray-400 uppercase">{l}</p>
                <p className={`text-xs font-bold ${cls}`}>{v ? (v / 1000).toFixed(0) + "k€" : "–"}</p>
              </div>
            ))}
          </div>
        )}

        {/* Abschlussstatus */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-400">Status: <span className="font-semibold text-gray-600">{sc.status}</span></p>
          {sc.empfehlung && <p className="text-xs text-gray-600 mt-1 line-clamp-2 italic">"{sc.empfehlung}"</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex-1 flex gap-4">
          <CompareCol sc={scA} label="Szenario A" />
          <CompareCol sc={scB} label="Szenario B" />
        </div>
      </div>

      {scA && scB && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">KI-Lernanalyse</h3>
              <p className="text-xs text-gray-500 mt-0.5">Was können wir aus diesen zwei Szenarien lernen? Wie sollen Erfolgswahrscheinlichkeiten zukünftig gewichtet werden?</p>
            </div>
            <Button size="sm" onClick={runKILearning} disabled={loadingKI} className="bg-violet-600 text-white rounded-lg text-xs gap-1">
              <Sparkles className="w-3 h-3" /> {loadingKI ? "Lerne..." : kiLearning ? "Neu analysieren" : "Lernanalyse starten"}
            </Button>
          </div>

          {kiLearning ? (
            <div className="space-y-4">
              {[
                ["Strategiemuster die funktionierten", kiLearning.muster_die_funktionierten, "bg-green-50 border-green-100 text-green-800"],
                ["Verbesserungspotenzial", kiLearning.verbesserungspotenzial, "bg-amber-50 border-amber-100 text-amber-800"],
                ["Gewichtungshinweise für zukünftige Prognosen", kiLearning.gewichtungshinweise, "bg-blue-50 border-blue-100 text-blue-800"],
                ["Lernregeln", kiLearning.lernregeln, "bg-violet-50 border-violet-100 text-violet-800"],
              ].map(([title, items, cls]) => items?.length > 0 && (
                <div key={title} className={`rounded-lg border p-3 ${cls}`}>
                  <p className="text-[10px] font-bold uppercase mb-2">{title}</p>
                  {items.map((item, i) => <p key={i} className="text-xs mb-1">→ {item}</p>)}
                </div>
              ))}
              {kiLearning.fazit && (
                <div className="bg-gray-900 text-white rounded-lg p-4">
                  <p className="text-[10px] font-bold uppercase mb-1 text-gray-400">Fazit</p>
                  <p className="text-sm">{kiLearning.fazit}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Starten Sie die Lernanalyse um aus beiden Szenarien strategische Erkenntnisse zu gewinnen.</p>
          )}
        </div>
      )}

      {completed.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <GitCompare className="w-8 h-8 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">Noch keine abgeschlossenen Szenarien</p>
          <p className="text-xs text-gray-400 mt-1">Schließen Sie mindestens zwei Szenarien ab, um sie vergleichen zu können.</p>
        </div>
      )}
    </div>
  );
}

// ── LOOPHOLE FORM ────────────────────────────────────────────────────────────
function LoopholeForm({ scenarioId, onSave }) {
  const [form, setForm] = useState({ gesetz: "", paragraph: "", titel: "", beschreibung: "", nutzungspotential: "mittel", risiko_bei_nutzung: "mittel", jurisdiction: "DACH", aktiv: true });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.gesetz.trim() || !form.titel.trim()) return;
    setSaving(true);
    await base44.entities.LegalLoophole.create({ ...form, scenario_id: scenarioId, ki_generated: false });
    setForm({ gesetz: "", paragraph: "", titel: "", beschreibung: "", nutzungspotential: "mittel", risiko_bei_nutzung: "mittel", jurisdiction: "DACH", aktiv: true });
    setSaving(false);
    onSave();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <input value={form.gesetz} onChange={e => setForm(f => ({ ...f, gesetz: e.target.value }))} placeholder="Gesetz (z.B. BGB)" className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
        <input value={form.paragraph} onChange={e => setForm(f => ({ ...f, paragraph: e.target.value }))} placeholder="§ / Section" className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
        <select value={form.jurisdiction} onChange={e => setForm(f => ({ ...f, jurisdiction: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option value="DACH">DACH</option>
          <option value="US">US</option>
          <option value="EU">EU</option>
          <option value="International">International</option>
        </select>
      </div>
      <input value={form.titel} onChange={e => setForm(f => ({ ...f, titel: e.target.value }))} placeholder="Kurzbezeichnung der Lücke" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
      <textarea value={form.beschreibung} onChange={e => setForm(f => ({ ...f, beschreibung: e.target.value }))} placeholder="Beschreibung und Nutzungsmöglichkeit..." rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
      <div className="grid grid-cols-2 gap-3">
        <select value={form.nutzungspotential} onChange={e => setForm(f => ({ ...f, nutzungspotential: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option value="hoch">Potential: Hoch</option>
          <option value="mittel">Potential: Mittel</option>
          <option value="niedrig">Potential: Niedrig</option>
          <option value="theoretisch">Potential: Theoretisch</option>
        </select>
        <select value={form.risiko_bei_nutzung} onChange={e => setForm(f => ({ ...f, risiko_bei_nutzung: e.target.value }))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option value="gering">Risiko: Gering</option>
          <option value="mittel">Risiko: Mittel</option>
          <option value="hoch">Risiko: Hoch</option>
          <option value="existenzbedrohend">Risiko: Existenzbedrohend</option>
        </select>
      </div>
      <Button onClick={submit} disabled={!form.gesetz.trim() || !form.titel.trim() || saving} className="w-full bg-gray-900 text-white rounded-lg text-xs">
        {saving ? "Speichere..." : "Gesetzeslücke hinzufügen (trainiert die KI)"}
      </Button>
    </div>
  );
}