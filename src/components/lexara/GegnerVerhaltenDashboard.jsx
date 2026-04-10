import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportGegnerVerhaltenPDF } from "@/functions/exportGegnerVerhaltenPDF";

const TYP_LABELS = {
  versaeumte_frist: { label: "Versäumte Frist", color: "bg-red-100 text-red-700", icon: "⏰" },
  vergleichsreaktion: { label: "Vergleichsreaktion", color: "bg-blue-100 text-blue-700", icon: "🤝" },
  taktik: { label: "Taktik", color: "bg-purple-100 text-purple-700", icon: "♟️" },
  prozessverhalten: { label: "Prozessverhalten", color: "bg-amber-100 text-amber-700", icon: "⚖️" },
  sonstiges: { label: "Sonstiges", color: "bg-gray-100 text-gray-600", icon: "📋" },
};

const REAKTION_LABELS = {
  abgelehnt: { label: "Abgelehnt", color: "text-red-600", icon: <XCircle className="w-3.5 h-3.5" /> },
  angenommen: { label: "Angenommen", color: "text-green-600", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ignoriert: { label: "Ignoriert", color: "text-gray-500", icon: <Clock className="w-3.5 h-3.5" /> },
  verzoegert: { label: "Verzögert", color: "text-amber-600", icon: <Clock className="w-3.5 h-3.5" /> },
  gegenvorschlag: { label: "Gegenvorschlag", color: "text-blue-600", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  keine_reaktion: { label: "Keine Reaktion", color: "text-gray-400", icon: <Clock className="w-3.5 h-3.5" /> },
};

const PATTERN_LABELS = {
  verzoegerungstaktik: "🐢 Verzögerung",
  druckmittel: "💢 Druckmittel",
  konzessionsbereit: "✅ Konzessionsbereit",
  konfrontativ: "⚔️ Konfrontativ",
  kooperativ: "🤝 Kooperativ",
  unberechenbar: "❓ Unberechenbar",
};

const EMPTY_FORM = {
  typ: "versaeumte_frist", datum: "", titel: "", beschreibung: "",
  reaktion: "", unser_angebot: "", gegner_angebot: "", verzoegerung_tage: "",
  ergebnis: "", pattern_tag: "", auswirkung_prognose: 0
};

export default function GegnerVerhaltenDashboard({ caseId, caseData }) {
  const [exporting, setExporting] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingPattern, setAnalyzingPattern] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.GegnerVerhalten.filter({ case_id: caseId }, "-datum");
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [caseId]);

  const save = async () => {
    setSaving(true);
    await base44.entities.GegnerVerhalten.create({
      ...form,
      case_id: caseId,
      unser_angebot: form.unser_angebot ? Number(form.unser_angebot) : undefined,
      gegner_angebot: form.gegner_angebot ? Number(form.gegner_angebot) : undefined,
      verzoegerung_tage: form.verzoegerung_tage ? Number(form.verzoegerung_tage) : undefined,
      auswirkung_prognose: Number(form.auswirkung_prognose) || 0,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
    setSaving(false);
  };

  const remove = async (id) => {
    await base44.entities.GegnerVerhalten.delete(id);
    load();
  };

  const analyzePatterns = async () => {
    if (entries.length < 2) return;
    setAnalyzingPattern(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analysiere das historische Verhalten der Gegenseite in diesem Rechtsstreit und erkenne Muster.

Fall: ${caseData?.fallname || ""}
Rechtsgebiet: ${caseData?.rechtsgebiet || ""}

PROTOKOLLIERTE VERHALTENSEINTRÄGE (${entries.length}):
${entries.map(e => `- [${e.datum || "?"}] ${TYP_LABELS[e.typ]?.label}: "${e.titel}" | Reaktion: ${e.reaktion || "–"} | Muster: ${e.pattern_tag || "–"} | ${e.beschreibung || ""}`).join("\n")}

Analysiere:
1. Welche klaren Verhaltensmuster zeigt die Gegenseite?
2. Wie reagiert sie typischerweise auf Vergleichsangebote?
3. Welche Verzögerungstaktiken werden eingesetzt?
4. Was ist die prognostizierte Strategie der Gegenseite für die nächste Phase?
5. Wie sollten wir diese Muster für unsere Verhandlungsstrategie nutzen?
6. Wie beeinflusst dieses Verhalten die Erfolgswahrscheinlichkeit?`,
      response_json_schema: {
        type: "object",
        properties: {
          hauptmuster: { type: "array", items: { type: "string" } },
          vergleichsstrategie: { type: "string" },
          verzoegerungsmuster: { type: "string" },
          prognose_einfluss: { type: "string" },
          empfehlung: { type: "string" },
          naechste_phase: { type: "string" },
          verhandlungstipp: { type: "string" }
        }
      }
    });
    setAiAnalysis(result);
    setAnalyzingPattern(false);
  };

  // Stats
  const versaeumtCount = entries.filter(e => e.typ === "versaeumte_frist").length;
  const vergleichAbgelehnt = entries.filter(e => e.typ === "vergleichsreaktion" && e.reaktion === "abgelehnt").length;
  const vergleichAngenommen = entries.filter(e => e.typ === "vergleichsreaktion" && e.reaktion === "angenommen").length;
  const dominantPattern = entries.reduce((acc, e) => {
    if (e.pattern_tag) acc[e.pattern_tag] = (acc[e.pattern_tag] || 0) + 1;
    return acc;
  }, {});
  const topPattern = Object.entries(dominantPattern).sort((a, b) => b[1] - a[1])[0];

  if (loading) return <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Versäumte Fristen", versaeumtCount, "bg-red-50 border-red-100 text-red-700", "⏰"],
          ["Vergleiche abgelehnt", vergleichAbgelehnt, "bg-amber-50 border-amber-100 text-amber-700", "❌"],
          ["Vergleiche angenommen", vergleichAngenommen, "bg-green-50 border-green-100 text-green-700", "✅"],
          ["Dominantes Muster", topPattern ? PATTERN_LABELS[topPattern[0]] : "—", "bg-purple-50 border-purple-100 text-purple-700", "🎭"],
        ].map(([label, val, cls, icon]) => (
          <div key={label} className={`border rounded-xl p-3 ${cls}`}>
            <div className="text-lg font-bold">{typeof val === "number" ? val : ""}{typeof val === "string" ? val : ""}</div>
            <div className="text-[10px] font-medium mt-0.5 opacity-80">{icon} {label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-gray-900 text-white text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Verhalten erfassen
        </Button>
        {entries.length >= 2 && (
          <Button size="sm" variant="outline" onClick={analyzePatterns} disabled={analyzingPattern} className="text-xs gap-1.5">
            {analyzingPattern ? "Analysiere..." : "🧠 Muster-Analyse"}
          </Button>
        )}
        {entries.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              setExporting(true);
              try {
                const res = await exportGegnerVerhaltenPDF({ caseId });
                const blob = new Blob([res.data || res], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Gegner-Verhaltensanalyse_${caseId}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error("PDF-Export fehlgeschlagen:", err);
              }
              setExporting(false);
            }}
            disabled={exporting}
            className="text-xs gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> {exporting ? "PDF wird generiert..." : "PDF-Bericht"}
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h4 className="text-sm font-bold text-gray-900">Neues Verhalten erfassen</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Typ</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                value={form.typ} onChange={e => setForm(f => ({ ...f, typ: e.target.value }))}>
                {Object.entries(TYP_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Datum</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Kurztitel *</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                placeholder="z.B. 'Frist zur Klagebegründung versäumt'"
                value={form.titel} onChange={e => setForm(f => ({ ...f, titel: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Beschreibung</label>
              <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs" rows={2}
                placeholder="Details zum Verhalten der Gegenseite..."
                value={form.beschreibung} onChange={e => setForm(f => ({ ...f, beschreibung: e.target.value }))} />
            </div>
            {form.typ === "vergleichsreaktion" && (
              <>
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Reaktion</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                    value={form.reaktion} onChange={e => setForm(f => ({ ...f, reaktion: e.target.value }))}>
                    <option value="">— wählen —</option>
                    {Object.entries(REAKTION_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Unser Angebot (€)</label>
                  <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                    value={form.unser_angebot} onChange={e => setForm(f => ({ ...f, unser_angebot: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Gegner-Gegenangebot (€)</label>
                  <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                    value={form.gegner_angebot} onChange={e => setForm(f => ({ ...f, gegner_angebot: e.target.value }))} />
                </div>
              </>
            )}
            {form.typ === "versaeumte_frist" && (
              <div>
                <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Verzögerung (Tage)</label>
                <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                  value={form.verzoegerung_tage} onChange={e => setForm(f => ({ ...f, verzoegerung_tage: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Muster-Tag</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                value={form.pattern_tag} onChange={e => setForm(f => ({ ...f, pattern_tag: e.target.value }))}>
                <option value="">— optional —</option>
                {Object.entries(PATTERN_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Auswirkung Prognose (%)</label>
              <input type="number" min={-30} max={30} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                value={form.auswirkung_prognose} onChange={e => setForm(f => ({ ...f, auswirkung_prognose: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">Ergebnis</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                placeholder="z.B. 'Fristverlängerung gewährt' oder 'Verhandlung vertagt'"
                value={form.ergebnis} onChange={e => setForm(f => ({ ...f, ergebnis: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={save} disabled={saving || !form.titel} className="bg-gray-900 text-white text-xs">
              {saving ? "Speichern..." : "Speichern"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)} className="text-xs">Abbrechen</Button>
          </div>
        </div>
      )}

      {/* AI Pattern Analysis */}
      {aiAnalysis && (
        <div className="bg-white rounded-2xl border border-purple-100 p-5 space-y-4">
          <h4 className="text-sm font-bold text-purple-900 flex items-center gap-2">🧠 KI-Muster-Analyse</h4>
          {aiAnalysis.hauptmuster?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Erkannte Hauptmuster</p>
              <div className="flex flex-wrap gap-2">
                {aiAnalysis.hauptmuster.map((m, i) => (
                  <span key={i} className="text-xs bg-purple-100 text-purple-800 rounded-full px-3 py-1">{m}</span>
                ))}
              </div>
            </div>
          )}
          {[
            ["🤝 Vergleichsstrategie der Gegenseite", aiAnalysis.vergleichsstrategie, "amber"],
            ["🐢 Verzögerungsmuster", aiAnalysis.verzoegerungsmuster, "red"],
            ["📈 Einfluss auf Prognose", aiAnalysis.prognose_einfluss, "blue"],
            ["🔮 Nächste Phase", aiAnalysis.naechste_phase, "slate"],
          ].map(([label, val, c]) => val && (
            <div key={label}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-xs text-gray-700 bg-${c}-50 border border-${c}-100 rounded-xl px-3 py-2`}>{val}</p>
            </div>
          ))}
          {aiAnalysis.verhandlungstipp && (
            <div className="bg-green-900 text-white rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-green-300">✅ Verhandlungstipp</p>
              <p className="text-sm">{aiAnalysis.verhandlungstipp}</p>
            </div>
          )}
        </div>
      )}

      {/* Entries list */}
      <div className="space-y-2">
        {entries.length === 0 && (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 text-center text-xs text-gray-400">
            Noch keine Verhaltenseinträge — erfasse das erste Verhalten der Gegenseite
          </div>
        )}
        {entries.map(entry => {
          const typ = TYP_LABELS[entry.typ] || TYP_LABELS.sonstiges;
          const reaktion = REAKTION_LABELS[entry.reaktion];
          return (
            <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">{typ.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-semibold ${typ.color}`}>{typ.label}</span>
                      {entry.pattern_tag && <span className="text-[9px] px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold">{PATTERN_LABELS[entry.pattern_tag]}</span>}
                      {entry.datum && <span className="text-[9px] text-gray-400">{entry.datum}</span>}
                    </div>
                    <p className="text-xs font-semibold text-gray-800">{entry.titel}</p>
                    {entry.beschreibung && <p className="text-[10px] text-gray-500 mt-0.5">{entry.beschreibung}</p>}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {reaktion && (
                        <div className={`flex items-center gap-1 text-[10px] font-medium ${reaktion.color}`}>
                          {reaktion.icon} {reaktion.label}
                        </div>
                      )}
                      {entry.unser_angebot && <span className="text-[10px] text-gray-500">Unser: {entry.unser_angebot.toLocaleString("de")} €</span>}
                      {entry.gegner_angebot && <span className="text-[10px] text-gray-500">Gegner: {entry.gegner_angebot.toLocaleString("de")} €</span>}
                      {entry.verzoegerung_tage && <span className="text-[10px] text-red-600">+{entry.verzoegerung_tage} Tage</span>}
                      {entry.auswirkung_prognose !== 0 && entry.auswirkung_prognose && (
                        <span className={`text-[10px] font-semibold ${entry.auswirkung_prognose > 0 ? "text-green-600" : "text-red-600"}`}>
                          {entry.auswirkung_prognose > 0 ? "+" : ""}{entry.auswirkung_prognose}% Prognose
                        </span>
                      )}
                    </div>
                    {entry.ergebnis && <p className="text-[10px] text-gray-500 mt-1 italic">Ergebnis: {entry.ergebnis}</p>}
                  </div>
                </div>
                <button onClick={() => remove(entry.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}