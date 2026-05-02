import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, ArrowLeft, GitCompare, Building2, Target, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
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

function ScenarioCard({ scenario, onClick }) {
  const typ = SZENARIO_TYPEN[scenario.szenario_typ] || SZENARIO_TYPEN.sonstiges;
  const step = scenario.enterprise_step ?? 0;
  const totalSteps = 7;
  const progress = Math.round((step / totalSteps) * 100);

  return (
    <div onClick={onClick} className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: typ.color + "15" }}>{typ.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-400 font-medium uppercase">{typ.label}</p>
          <h3 className="text-sm font-semibold text-gray-900 truncate">{scenario.title}</h3>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: typ.color }} />
            </div>
            <span className="text-[10px] text-gray-400">Schritt {step}/{totalSteps}</span>
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
  const [showCreate, setShowCreate] = useState(false);
  const [newScenario, setNewScenario] = useState({ title: "", szenario_typ: "sonstiges", rechtsgebiet: "" });
  const [view, setView] = useState("scenarios");

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
    const created = await base44.entities.StrategosScenario.create({
      ...newScenario,
      status: "entwurf",
      step_completed: 1,
      enterprise_step: 0,
    });
    setNewScenario({ title: "", szenario_typ: "sonstiges", rechtsgebiet: "" });
    setShowCreate(false);
    loadData();
    setActiveScenario(created);
  };

  const deleteLoophole = async (id) => { await base44.entities.LegalLoophole.delete(id); loadData(); };

  // ── Szenario-Detail: Enterprise direkt ──────────────────────────────────────
  if (activeScenario) {
    return (
      <div className="min-h-screen" style={{ background: "#f0f0f0", fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif" }}>
        {/* Topbar */}
        <div className="sticky top-0 z-20" style={{ background: "rgba(246,246,246,0.97)", borderBottom: "1px solid rgba(0,0,0,0.1)", backdropFilter: "blur(20px)" }}>
          <div className="max-w-6xl mx-auto px-5 py-2.5 flex items-center gap-3">
            <button onClick={() => { setActiveScenario(null); loadData(); }}
              className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-800">
              <ArrowLeft className="w-3 h-3" /> Zurück
            </button>
            <span className="text-gray-300">›</span>
            <span className="text-[11px] text-gray-600 font-semibold truncate max-w-xs">{activeScenario.title}</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold" style={{ background: (SZENARIO_TYPEN[activeScenario.szenario_typ]?.color || "#999") + "15", color: SZENARIO_TYPEN[activeScenario.szenario_typ]?.color || "#999" }}>
                {SZENARIO_TYPEN[activeScenario.szenario_typ]?.icon} {SZENARIO_TYPEN[activeScenario.szenario_typ]?.label}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: "#007AFF15", color: "#007AFF" }}>
                <Building2 className="w-2.5 h-2.5 inline mr-1" />Enterprise
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
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

  // ── Übersicht ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "#f0f0f0", fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif" }}>
      {/* Topbar */}
      <div className="sticky top-0 z-20" style={{ background: "rgba(246,246,246,0.97)", borderBottom: "1px solid rgba(0,0,0,0.1)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-3">
          <div className="mr-auto">
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-semibold text-gray-900">Strategos</p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#007AFF15", color: "#007AFF" }}>Enterprise</span>
            </div>
            <p className="text-[10px] text-gray-500">Präventive Entscheidungsintelligenz · Vertragsanalyse · Patente · Quantitative Risikoanalyse</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView("scenarios")} className={`text-[11px] px-3 py-1 rounded-md transition-all ${view === "scenarios" ? "bg-white shadow-sm font-semibold text-gray-900" : "text-gray-500"}`}>Szenarien</button>
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
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : scenarios.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
              <Target className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">Noch keine Szenarien</p>
              <p className="text-xs text-gray-400 mt-1">Strategos analysiert geplante Handlungen — Verträge, Patente, Fusionen — bevor sie zu Konflikten werden</p>
              <Button size="sm" onClick={() => setShowCreate(true)} className="mt-4 bg-gray-900 text-white rounded-lg text-xs">
                <Plus className="w-3 h-3 mr-1" /> Szenario erstellen
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.map(sc => (
                <ScenarioCard key={sc.id} scenario={sc} onClick={() => setActiveScenario(sc)} />
              ))}
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
            ) : loopholes.map(lh => <LoopholeCard key={lh.id} loophole={lh} onDelete={deleteLoophole} />)}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
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