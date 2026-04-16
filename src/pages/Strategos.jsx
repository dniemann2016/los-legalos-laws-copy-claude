import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Trash2, ArrowLeft, ArrowRight, Check, Target, TrendingUp, AlertTriangle, Scale, FileText, Sparkles, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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
  { id: 1, title: "Sachverhalt", desc: "Ausgangslage und zentrale Fragestellung definieren" },
  { id: 2, title: "Optionen", desc: "Handlungsalternativen identifizieren (legal, aggressiv, hybrid)" },
  { id: 3, title: "Finanzen", desc: "Kosten-Nutzen-Analyse für jede Option" },
  { id: 4, title: "Risiken", desc: "Rechtliche und wirtschaftliche Risiken bewerten" },
  { id: 5, title: "Gesetzeslücken", desc: "Ausnutzbare Lücken und Graubereiche identifizieren" },
  { id: 6, title: "KI-Analyse", desc: "Umfassende strategische Analyse durch KI" },
  { id: 7, title: "Empfehlung", desc: "Abschlussempfehlung und Handlungsplan" },
];

function ScenarioCard({ scenario, onClick }) {
  const typ = SZENARIO_TYPEN[scenario.szenario_typ] || SZENARIO_TYPEN.sonstiges;
  const progress = Math.round(((scenario.step_completed || 1) / 7) * 100);

  return (
    <div onClick={onClick} className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:shadow-lg hover:border-green-200 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: typ.color + "15" }}>
          {typ.icon}
        </div>
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
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${loophole.aktiv ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {loophole.aktiv ? "Aktiv" : "Geschlossen"}
            </span>
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
            <button onClick={(e) => { e.stopPropagation(); onDelete(loophole.id); }} className="text-xs text-red-500 hover:text-red-700 mt-2">
              <Trash2 className="w-3 h-3 inline mr-1" /> Löschen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Strategos() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState([]);
  const [loopholes, setLoopholes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeScenario, setActiveScenario] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [newScenario, setNewScenario] = useState({ title: "", szenario_typ: "sonstiges", rechtsgebiet: "" });
  const [view, setView] = useState("scenarios"); // scenarios | loopholes
  const [analysing, setAnalysing] = useState(false);

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

  const openScenario = (sc) => {
    setActiveScenario(sc);
    setActiveStep(sc.step_completed || 1);
  };

  const saveScenario = async (updates) => {
    const updated = await base44.entities.StrategosScenario.update(activeScenario.id, updates);
    setActiveScenario(updated);
    loadData();
  };

  const deleteLoophole = async (id) => {
    await base44.entities.LegalLoophole.delete(id);
    loadData();
  };

  const runKIAnalysis = async () => {
    setAnalysing(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist ein strategischer Rechtsberater auf Senior-Partner-Niveau. Analysiere dieses Szenario vollständig und liefere eine tiefgreifende strategische Analyse.

SZENARIO:
Titel: ${activeScenario.title}
Typ: ${SZENARIO_TYPEN[activeScenario.szenario_typ]?.label || activeScenario.szenario_typ}
Rechtsgebiet: ${activeScenario.rechtsgebiet || "nicht angegeben"}

Ausgangslage: ${activeScenario.ausgangslage || "nicht angegeben"}
Fragestellung: ${activeScenario.fragestellung || "nicht angegeben"}

Option A (legal): ${JSON.stringify(activeScenario.option_a || {})}
Option B (aggressiv): ${JSON.stringify(activeScenario.option_b || {})}
Option C (hybrid): ${JSON.stringify(activeScenario.option_c || {})}

Finanzdaten: ${JSON.stringify(activeScenario.finanzdaten || {})}
Gesetzeslücken: ${JSON.stringify(activeScenario.gesetzesluecken || [])}

DEINE AUFGABE:
1. Bewerte jede Option systematisch (Erfolgswahrscheinlichkeit, Risiko, ROI)
2. Identifiziere weitere Gesetzeslücken und Graubereiche
3. Berechne Erwartungswerte (EV) für jede Option
4. Erstelle Best/Worst/Expected Case Szenarien
5. Gib eine klare Empfehlung mit Begründung

JSON-Format:
{
  "option_bewertungen": [
    {"option": "A", "name": "...", "erfolg_pct": 75, "risiko_pct": 20, "roi_pct": 150, "ev_eur": 500000, "einschätzung": "..."}
  ],
  "erwartungswert_gesamt": {"best_case_eur": 0, "expected_eur": 0, "worst_case_eur": 0},
  "weitere_gesetzesluecken": [{"gesetz": "...", "paragraph": "...", "luecke": "...", "ausnutzbar": true, "risiko": "mittel"}],
  "risiko_matrix": [{"risiko": "...", "wahrscheinlichkeit": "hoch", "auswirkung": "mittel", "gegenmassnahme": "..."}],
  "zeitlicher_faktor": "...",
  "empfehlung": {"option": "A/B/C", "begründung": "...", "nächste_schritte": ["..."]},
  "warnungen": ["..."]
}`,
        model: "claude_sonnet_4_6"
      });

      let parsed;
      try {
        const match = (typeof res === "string" ? res : JSON.stringify(res)).match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : res);
      } catch {
        parsed = { error: "Analyse konnte nicht geparst werden" };
      }

      await saveScenario({ ki_analyse: parsed, step_completed: Math.max(activeScenario.step_completed || 1, 6) });
      setActiveStep(6);
    } catch (err) {
      console.error(err);
    }
    setAnalysing(false);
  };

  if (activeScenario) {
    return (
      <div className="min-h-screen" style={{ background: "#f0f0f0", fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}>
        {/* Toolbar */}
        <div className="sticky top-0 z-20" style={{ background: "rgba(246,246,246,0.97)", borderBottom: "1px solid rgba(0,0,0,0.1)", backdropFilter: "blur(20px)" }}>
          <div className="max-w-5xl mx-auto px-5">
            <div className="flex items-center gap-2 py-2.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <button onClick={() => setActiveScenario(null)} className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-800">
                <ArrowLeft className="w-3 h-3" /> Zurück
              </button>
              <span className="text-gray-300">›</span>
              <span className="text-[11px] text-gray-600">{activeScenario.title}</span>
            </div>
            <div className="flex items-center justify-between py-2 gap-3">
              <h1 className="text-[14px] font-semibold text-gray-900">{activeScenario.title}</h1>
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: (SZENARIO_TYPEN[activeScenario.szenario_typ]?.color || "#999") + "15", color: SZENARIO_TYPEN[activeScenario.szenario_typ]?.color || "#999" }}>
                {SZENARIO_TYPEN[activeScenario.szenario_typ]?.label || activeScenario.szenario_typ}
              </span>
            </div>
            <div className="flex gap-0 overflow-x-auto pb-0" style={{ marginBottom: "-1px" }}>
              {STEPS.map(s => (
                <button key={s.id} onClick={() => setActiveStep(s.id)}
                  className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[11px] transition-all"
                  style={{
                    fontWeight: activeStep === s.id ? 600 : 400,
                    color: activeStep === s.id ? "#1a1a1a" : "#888",
                    borderBottom: activeStep === s.id ? "2px solid #34C759" : "2px solid transparent",
                  }}>
                  {(activeScenario.step_completed || 1) >= s.id ? <Check className="w-3 h-3 text-green-500" /> : <span className="w-3.5 h-3.5 rounded-full border text-[9px] flex items-center justify-center" style={{ borderColor: activeStep === s.id ? "#1a1a1a" : "#ccc", color: activeStep === s.id ? "#1a1a1a" : "#aaa" }}>{s.id}</span>}
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
            onAnalyse={runKIAnalysis}
            analysing={analysing}
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
            <button onClick={() => { saveScenario({ step_completed: Math.max(activeScenario.step_completed || 1, activeStep) }); setActiveStep(s => Math.min(7, s + 1)); }} disabled={activeStep === 7}
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
      {/* Toolbar */}
      <div className="sticky top-0 z-20" style={{ background: "rgba(246,246,246,0.97)", borderBottom: "1px solid rgba(0,0,0,0.1)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-3">
          <div className="mr-auto">
            <p className="text-[14px] font-semibold text-gray-900">Strategos</p>
            <p className="text-[10px] text-gray-500">Szenario-Prognose & Gesetzeslücken-Analyse</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView("scenarios")} className={`text-[11px] px-3 py-1 rounded-md transition-all ${view === "scenarios" ? "bg-white shadow-sm font-semibold text-gray-900" : "text-gray-500"}`}>
              Szenarien
            </button>
            <button onClick={() => setView("loopholes")} className={`text-[11px] px-3 py-1 rounded-md transition-all ${view === "loopholes" ? "bg-white shadow-sm font-semibold text-gray-900" : "text-gray-500"}`}>
              Gesetzeslücken-DB
            </button>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-gray-900 text-white rounded-lg text-xs gap-1">
            <Plus className="w-3 h-3" /> Neu
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-5">
        {view === "scenarios" ? (
          loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin" />
            </div>
          ) : scenarios.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
              <Target className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">Noch keine Szenarien</p>
              <p className="text-xs text-gray-400 mt-1">Erstellen Sie Ihr erstes Szenario zur Analyse</p>
              <Button size="sm" onClick={() => setShowCreate(true)} className="mt-4 bg-gray-900 text-white rounded-lg text-xs">
                <Plus className="w-3 h-3 mr-1" /> Szenario erstellen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.map(sc => <ScenarioCard key={sc.id} scenario={sc} onClick={() => openScenario(sc)} />)}
            </div>
          )
        ) : (
          <div className="space-y-3">
            {loopholes.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">Keine Gesetzeslücken erfasst</p>
                <p className="text-xs text-gray-400 mt-1">Lücken werden beim Analysieren von Szenarien automatisch hinzugefügt</p>
              </div>
            ) : (
              loopholes.map(lh => <LoopholeCard key={lh.id} loophole={lh} onDelete={deleteLoophole} />)
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
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

function StepContent({ step, scenario, onSave, onAnalyse, analysing, loopholes, onLoadData }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    setForm({
      ausgangslage: scenario.ausgangslage || "",
      fragestellung: scenario.fragestellung || "",
      option_a: scenario.option_a || {},
      option_b: scenario.option_b || {},
      option_c: scenario.option_c || {},
      finanzdaten: scenario.finanzdaten || {},
      empfehlung: scenario.empfehlung || "",
      notes: scenario.notes || "",
    });
  }, [scenario]);

  const save = (updates) => {
    setForm({ ...form, ...updates });
    onSave(updates);
  };

  if (step === 1) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Sachverhalt & Fragestellung</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-gray-500 uppercase block mb-1">Ausgangslage / Sachverhalt</label>
              <textarea value={form.ausgangslage} onChange={e => setForm({ ...form, ausgangslage: e.target.value })} onBlur={() => save({ ausgangslage: form.ausgangslage })}
                placeholder="Beschreiben Sie die aktuelle Situation des Unternehmens / Mandanten..." rows={5} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase block mb-1">Zentrale Fragestellung</label>
              <textarea value={form.fragestellung} onChange={e => setForm({ ...form, fragestellung: e.target.value })} onBlur={() => save({ fragestellung: form.fragestellung })}
                placeholder="Was genau soll analysiert werden? z.B.: Lohnt es sich, das Patent zu verletzen statt zu lizenzieren?" rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-4">
        {[["option_a", "Option A: Legaler Weg", "Der konservative, rechtlich einwandfreie Ansatz", "#34C759"],
          ["option_b", "Option B: Aggressiver Weg", "Risikoreicherer Ansatz mit höherem Potenzial", "#FF9500"],
          ["option_c", "Option C: Hybrid / Alternativ", "Kompromiss oder kreativer Mittelweg", "#007AFF"]].map(([key, title, desc, color]) => (
          <div key={key} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">{desc}</p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">Beschreibung</label>
                <textarea value={form[key]?.beschreibung || ""} onChange={e => setForm({ ...form, [key]: { ...form[key], beschreibung: e.target.value } })}
                  onBlur={() => save({ [key]: form[key] })} placeholder="Was beinhaltet diese Option?" rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Erfolgswahrsch. %</label>
                  <input type="number" value={form[key]?.erfolg_pct || ""} onChange={e => setForm({ ...form, [key]: { ...form[key], erfolg_pct: e.target.value } })}
                    onBlur={() => save({ [key]: form[key] })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Risiko %</label>
                  <input type="number" value={form[key]?.risiko_pct || ""} onChange={e => setForm({ ...form, [key]: { ...form[key], risiko_pct: e.target.value } })}
                    onBlur={() => save({ [key]: form[key] })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">Zeithorizont</label>
                  <input value={form[key]?.zeithorizont || ""} onChange={e => setForm({ ...form, [key]: { ...form[key], zeithorizont: e.target.value } })}
                    onBlur={() => save({ [key]: form[key] })} placeholder="z.B. 2 Jahre" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (step === 3) {
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
              <input type="number" value={form.finanzdaten?.[key] || ""} onChange={e => setForm({ ...form, finanzdaten: { ...form.finanzdaten, [key]: Number(e.target.value) } })}
                onBlur={() => save({ finanzdaten: form.finanzdaten })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
            </div>
          ))}
        </div>
        {form.finanzdaten?.erwarteter_gewinn && form.finanzdaten?.potentielle_strafe && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">Schnellberechnung:</p>
            <p className="text-sm text-gray-800">
              ROI (aggressiv): <strong>{(((form.finanzdaten.erwarteter_gewinn - form.finanzdaten.potentielle_strafe) / (form.finanzdaten.kosten_aggressiv || 1)) * 100).toFixed(0)}%</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              = (Gewinn {form.finanzdaten.erwarteter_gewinn?.toLocaleString()}€ - Strafe {form.finanzdaten.potentielle_strafe?.toLocaleString()}€) / Kosten {form.finanzdaten.kosten_aggressiv?.toLocaleString()}€
            </p>
          </div>
        )}
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Risikobewertung</h3>
        <p className="text-xs text-gray-500">Identifizieren Sie die wichtigsten rechtlichen und wirtschaftlichen Risiken.</p>
        <div className="space-y-3">
          {[["risiko_strafrecht", "Strafrechtliches Risiko", "Gefängnisstrafe, Bußgelder, Vorstrafen"],
            ["risiko_zivilrecht", "Zivilrechtliches Risiko", "Schadensersatz, Unterlassung, Vertragsstrafe"],
            ["risiko_reputation", "Reputationsrisiko", "Öffentliche Wahrnehmung, Medienberichte"],
            ["risiko_regulatorisch", "Regulatorisches Risiko", "Behördliche Maßnahmen, Lizenzentzug"]].map(([key, title, desc]) => (
            <div key={key} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{title}</p>
                  <p className="text-[10px] text-gray-400">{desc}</p>
                </div>
                <select value={form.finanzdaten?.[key] || "mittel"} onChange={e => { const fd = { ...form.finanzdaten, [key]: e.target.value }; setForm({ ...form, finanzdaten: fd }); save({ finanzdaten: fd }); }}
                  className="text-xs px-2 py-1 border border-gray-200 rounded bg-white">
                  <option value="gering">Gering</option>
                  <option value="mittel">Mittel</option>
                  <option value="hoch">Hoch</option>
                  <option value="kritisch">Kritisch</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === 5) {
    const scenarioLoopholes = loopholes.filter(l => l.scenario_id === scenario.id);
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Gesetzeslücken & Graubereiche</h3>
          <p className="text-xs text-gray-500 mb-4">Identifizieren Sie ausnutzbare Lücken im relevanten Recht.</p>
          <LoopholeForm scenarioId={scenario.id} onSave={onLoadData} />
        </div>
        {scenarioLoopholes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600">{scenarioLoopholes.length} Lücken für dieses Szenario:</p>
            {scenarioLoopholes.map(lh => <LoopholeCard key={lh.id} loophole={lh} />)}
          </div>
        )}
      </div>
    );
  }

  if (step === 6) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">KI-Analyse</h3>
            <Button size="sm" onClick={onAnalyse} disabled={analysing} className="bg-violet-600 text-white rounded-lg text-xs gap-1">
              <Sparkles className="w-3 h-3" /> {analysing ? "Analysiere..." : "Analyse starten"}
            </Button>
          </div>
          {scenario.ki_analyse ? (
            <div className="space-y-4">
              {scenario.ki_analyse.option_bewertungen && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Optionsbewertung</p>
                  <div className="space-y-2">
                    {scenario.ki_analyse.option_bewertungen.map((o, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-800">Option {o.option}: {o.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">{o.erfolg_pct}% Erfolg</span>
                        </div>
                        <p className="text-xs text-gray-600">{o.einschätzung}</p>
                        <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
                          <span>Risiko: {o.risiko_pct}%</span>
                          <span>ROI: {o.roi_pct}%</span>
                          <span>EV: {o.ev_eur?.toLocaleString()}€</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {scenario.ki_analyse.empfehlung && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                  <p className="text-xs font-semibold text-green-800 mb-1">Empfehlung: Option {scenario.ki_analyse.empfehlung.option}</p>
                  <p className="text-sm text-green-700">{scenario.ki_analyse.empfehlung.begründung}</p>
                </div>
              )}
              {scenario.ki_analyse.warnungen?.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-amber-800 uppercase mb-1">Warnungen</p>
                  {scenario.ki_analyse.warnungen.map((w, i) => <p key={i} className="text-xs text-amber-700">• {w}</p>)}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Starten Sie die KI-Analyse für eine umfassende Bewertung.</p>
          )}
        </div>
      </div>
    );
  }

  if (step === 7) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Abschlussempfehlung</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-gray-500 uppercase block mb-1">Ihre Empfehlung</label>
              <textarea value={form.empfehlung} onChange={e => setForm({ ...form, empfehlung: e.target.value })} onBlur={() => save({ empfehlung: form.empfehlung })}
                placeholder="Fassen Sie Ihre finale Empfehlung zusammen..." rows={4} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase block mb-1">Notizen</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} onBlur={() => save({ notes: form.notes })}
                placeholder="Zusätzliche Notizen..." rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
            </div>
          </div>
        </div>
        <Button onClick={() => save({ status: "ergebnis", step_completed: 7 })} className="w-full bg-green-600 text-white rounded-lg">
          <Check className="w-4 h-4 mr-2" /> Analyse abschließen
        </Button>
      </div>
    );
  }

  return null;
}

function LoopholeForm({ scenarioId, onSave }) {
  const [form, setForm] = useState({ gesetz: "", paragraph: "", titel: "", beschreibung: "", nutzungspotential: "mittel", risiko_bei_nutzung: "mittel", jurisdiction: "DACH", aktiv: true });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.gesetz.trim() || !form.titel.trim()) return;
    setSaving(true);
    await base44.entities.LegalLoophole.create({ ...form, scenario_id: scenarioId });
    setForm({ gesetz: "", paragraph: "", titel: "", beschreibung: "", nutzungspotential: "mittel", risiko_bei_nutzung: "mittel", jurisdiction: "DACH", aktiv: true });
    setSaving(false);
    onSave();
  };

  return (
    <div className="space-y-3 border-t border-gray-100 pt-4 mt-4">
      <div className="grid grid-cols-3 gap-3">
        <input value={form.gesetz} onChange={e => setForm({ ...form, gesetz: e.target.value })} placeholder="Gesetz (z.B. BGB, HGB)" className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
        <input value={form.paragraph} onChange={e => setForm({ ...form, paragraph: e.target.value })} placeholder="§ / Section" className="px-3 py-2 text-sm border border-gray-200 rounded-lg" />
        <select value={form.jurisdiction} onChange={e => setForm({ ...form, jurisdiction: e.target.value })} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option value="DACH">DACH</option>
          <option value="US">US</option>
          <option value="EU">EU</option>
          <option value="International">International</option>
        </select>
      </div>
      <input value={form.titel} onChange={e => setForm({ ...form, titel: e.target.value })} placeholder="Kurzbezeichnung der Lücke" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
      <textarea value={form.beschreibung} onChange={e => setForm({ ...form, beschreibung: e.target.value })} placeholder="Beschreibung der Lücke und wie sie ausgenutzt werden kann..." rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
      <div className="grid grid-cols-2 gap-3">
        <select value={form.nutzungspotential} onChange={e => setForm({ ...form, nutzungspotential: e.target.value })} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option value="hoch">Nutzungspotential: Hoch</option>
          <option value="mittel">Nutzungspotential: Mittel</option>
          <option value="niedrig">Nutzungspotential: Niedrig</option>
          <option value="theoretisch">Nutzungspotential: Theoretisch</option>
        </select>
        <select value={form.risiko_bei_nutzung} onChange={e => setForm({ ...form, risiko_bei_nutzung: e.target.value })} className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
          <option value="gering">Risiko: Gering</option>
          <option value="mittel">Risiko: Mittel</option>
          <option value="hoch">Risiko: Hoch</option>
          <option value="existenzbedrohend">Risiko: Existenzbedrohend</option>
        </select>
      </div>
      <Button onClick={submit} disabled={!form.gesetz.trim() || !form.titel.trim() || saving} className="w-full bg-gray-900 text-white rounded-lg text-xs">
        {saving ? "Speichere..." : "Gesetzeslücke hinzufügen"}
      </Button>
    </div>
  );
}