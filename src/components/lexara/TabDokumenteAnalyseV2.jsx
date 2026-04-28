import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2, X, Check, AlertCircle, FileText, Image, Film, File, ChevronDown, ChevronUp, RefreshCw, Info, ArrowRight, Zap, Clock, Database } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TabDokumenteAnalyseV2 — optimierte Pipeline (nutzt analyzeDocumentV2)
// NEU: Streaming-Fortschritt, Caching-Anzeige, Performance-Log
// UNVERÄNDERT: alle UI-Strukturen, STEP_MAP, DocResultStep etc. aus V1
// ─────────────────────────────────────────────────────────────────────────────

const FILE_ACCEPT = "*/*";

const STEP_MAP = [
  { num: 1, label: "Fallerfassung — Basisdaten", color: "#34C759", wo: "Tab 1 › Basisdaten", felder: ["Gericht", "Aktenzeichen", "Rechtsgebiet", "Instanz", "Prozessziel", "Zentrale Rechtsfrage", "Streitwert"], hinweis: "Nur wenn Feld noch leer — kein Überschreiben", getItems: r => [r?.basisdaten?.gericht && `Gericht: ${r.basisdaten.gericht}`, r?.basisdaten?.aktenzeichen && `AZ: ${r.basisdaten.aktenzeichen}`, r?.basisdaten?.rechtsgebiet && `Rechtsgebiet: ${r.basisdaten.rechtsgebiet}`, r?.basisdaten?.prozessziel && `Prozessziel: ${r.basisdaten.prozessziel}`, r?.streitwert && `Streitwert: ${Number(r.streitwert).toLocaleString()} €`].filter(Boolean), isCovered: r => !!(r?.basisdaten?.gericht || r?.basisdaten?.aktenzeichen || r?.streitwert) },
  { num: 2, label: "Fallsubstanz", color: "#007AFF", wo: "Tab 2 › Argumente, Beweise, Fristen, Personen", felder: ["Argumente", "Beweise", "Fristen", "Personen"], hinweis: "Beweise werden dem Dokument als Quelle zugeordnet", getItems: r => { const args = r?.argumente || [], bew = r?.beweise || [], fri = r?.fristen || [], per = r?.personen || []; if (!args.length && !bew.length && !fri.length && !per.length) return []; return [args.length && `${args.length} Argumente`, bew.length && `${bew.length} Beweise`, fri.length && `${fri.length} Fristen`, per.length && `${per.length} Personen`].filter(Boolean); }, getDetails: r => [...(r?.argumente || []).map(a => `${a.seite === "gegner" ? "⚔" : "✓"} ${a.titel}`), ...(r?.beweise || []).map(b => `📎 ${b.titel}`), ...(r?.fristen || []).map(f => `📅 ${f.titel}${f.datum ? ` (${f.datum})` : ""}`), ...(r?.personen || []).map(p => `👤 ${p.name}${p.rolle ? ` — ${p.rolle}` : ""}`)], isCovered: r => !!(r?.argumente?.length || r?.beweise?.length || r?.personen?.length || r?.fristen?.length) },
  { num: 3, label: "Gegneranalyse", color: "#FF3B30", wo: "Tab 3 › Gegner-Profil", felder: ["Gegner-Strategie", "Taktiken", "Schwachstellen"], hinweis: "Wird in Case.gegner_profil gespeichert", getItems: r => { const g = r?.schritt3_gegneranalyse; if (!g?.zusammenfassung) return []; return [g.zusammenfassung, g.taktiken?.length && `${g.taktiken.length} Taktiken`, g.schwachstellen?.length && `${g.schwachstellen.length} Schwachstellen`].filter(Boolean); }, getDetails: r => [...(r?.schritt3_gegneranalyse?.taktiken || []).map(t => `⚔ ${t}`), ...(r?.schritt3_gegneranalyse?.schwachstellen || []).map(s => `⚠ ${s}`)], isCovered: r => !!(r?.schritt3_gegneranalyse?.zusammenfassung) },
  { num: 4, label: "Rechtliche Analyse", color: "#FF9500", wo: "Tab 4 › Compliance, Streitwert", felder: ["Paragrafen", "Präzedenzfälle", "Compliance-Risiken"], hinweis: "Informiert Tab 4 inhaltlich", getItems: r => { const g = r?.schritt4_rechtliche_analyse; return [g?.zusammenfassung, g?.relevante_paragrafen?.length && `${g.relevante_paragrafen.length} Paragrafen`, g?.praezedenzfaelle?.length && `${g.praezedenzfaelle.length} Präzedenzfälle`].filter(Boolean); }, getDetails: r => [...(r?.schritt4_rechtliche_analyse?.relevante_paragrafen || []).map(p => `§ ${p}`), ...(r?.schritt4_rechtliche_analyse?.praezedenzfaelle || []).map(p => `⚖ ${p}`)], isCovered: r => !!(r?.schritt4_rechtliche_analyse?.zusammenfassung) },
  { num: 5, label: "Strategie", color: "#5856D6", wo: "Tab 5 › Fallnotizen", felder: ["Prozessstrategie", "Stärken", "Schwächen"], hinweis: "Strategie-Erkenntnisse als Notiz", getItems: r => { const g = r?.schritt5_strategie; return [g?.empfohlene_strategie, g?.staerken?.length && `${g.staerken.length} Stärken`, g?.schwaechen?.length && `${g.schwaechen.length} Schwächen`].filter(Boolean); }, getDetails: r => [...(r?.schritt5_strategie?.staerken || []).map(s => `+ ${s}`), ...(r?.schritt5_strategie?.schwaechen || []).map(s => `– ${s}`)], isCovered: r => !!(r?.schritt5_strategie?.empfohlene_strategie) },
  { num: 6, label: "Risiko", color: "#FF2D55", wo: "Tab 6 › Risikoanalyse", felder: ["Risiko-Level", "Risiken", "Beweisprobleme"], hinweis: "Risiko-Zusammenfassung in Fallnotizen", getItems: r => { const g = r?.schritt6_risiko; return [g?.risiko_level && `Risiko-Level: ${g.risiko_level}`, g?.zusammenfassung, g?.risiken?.length && `${g.risiken.length} Risiken`].filter(Boolean); }, getDetails: r => (r?.schritt6_risiko?.risiken || []).map(ri => `⚠ ${ri}`), isCovered: r => !!(r?.schritt6_risiko?.zusammenfassung) },
  { num: 7, label: "Simulation", color: "#AF52DE", wo: "Tab 7 › Verhandlungssimulation", felder: ["Vergleichswert", "Prognose-Einfluss"], hinweis: "Vergleichswert in ki_berater_result", getItems: r => { const g = r?.schritt7_simulation; return [g?.prognose_einfluss, g?.vergleichswert_eur && `Vergleichswert: ${Number(g.vergleichswert_eur).toLocaleString()} €`].filter(Boolean); }, getDetails: () => [], isCovered: r => !!(r?.schritt7_simulation?.zusammenfassung) },
  { num: 8, label: "Aktion", color: "#FF6B35", wo: "Tab 8 › Verhandlungsführung", felder: ["Nächste Schritte", "Dokumente"], hinweis: "Handlungsempfehlungen in ki_berater_result", getItems: r => { const g = r?.schritt8_aktion; return [g?.zusammenfassung, g?.naechste_schritte?.length && `${g.naechste_schritte.length} nächste Schritte`].filter(Boolean); }, getDetails: r => (r?.schritt8_aktion?.naechste_schritte || []).map(s => `→ ${s}`), isCovered: r => !!(r?.schritt8_aktion?.zusammenfassung) },
  { num: 9, label: "Cockpit", color: "#00BCD4", wo: "Tab 9 › Fall-Cockpit", felder: ["Prognose-Delta"], hinweis: "Prognose-Delta in ki_berater_result", getItems: r => { const g = r?.schritt9_cockpit; const delta = g?.prognose_delta_pct; return [g?.zusammenfassung, delta != null && `Prognose-Einfluss: ${delta > 0 ? "+" : ""}${delta}%`].filter(Boolean); }, getDetails: () => [], isCovered: r => !!(r?.schritt9_cockpit?.zusammenfassung) },
  { num: 10, label: "Abschluss", color: "#34C759", wo: "Tab 10 › Abschluss", felder: ["Prozessziel erreichbar?", "Vergleichsempfehlung"], hinweis: "Vergleichsempfehlung in ki_berater_result", getItems: r => { const g = r?.schritt10_abschluss; return [g?.zusammenfassung, g?.vergleichsempfehlung, g?.prozessziel_erreichbar != null && `Prozessziel: ${g.prozessziel_erreichbar ? "✓ Ja" : "⚠ Unklar"}`].filter(Boolean); }, getDetails: () => [], isCovered: r => !!(r?.schritt10_abschluss?.zusammenfassung) },
];

function fileIcon(type) {
  if (!type) return <File className="w-4 h-4" style={{ color: "#aaa" }} />;
  if (type.startsWith("image/")) return <Image className="w-4 h-4" style={{ color: "#007AFF" }} />;
  if (type.startsWith("video/")) return <Film className="w-4 h-4" style={{ color: "#FF9500" }} />;
  if (type.includes("pdf")) return <FileText className="w-4 h-4" style={{ color: "#FF3B30" }} />;
  return <File className="w-4 h-4" style={{ color: "#aaa" }} />;
}

// ── Streaming-Fortschrittsanzeige während Analyse ────────────────────────────
function AnalysisProgress({ phase }) {
  const phases = [
    { id: "ocr", label: "Text extrahieren", icon: "📄", model: "ExtractFile" },
    { id: "structure", label: "Struktur-Extraktion", icon: "🔍", model: "gpt_5_mini (schnell)" },
    { id: "parallel", label: "Parallele Tiefenanalyse (7 Jobs gleichzeitig)", icon: "⚡", model: "claude_sonnet_4_6" },
    { id: "save", label: "Daten speichern", icon: "💾", model: "DB" },
  ];
  const idx = phases.findIndex(p => p.id === phase);

  return (
    <div style={{ padding: "12px 14px", background: "rgba(52,199,89,0.04)", border: "1px solid rgba(52,199,89,0.2)", borderRadius: 10 }}>
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-3.5 h-3.5" style={{ color: "#34C759" }} />
        <span className="text-[11px] font-semibold" style={{ color: "#1a7f37" }}>V2-Pipeline aktiv</span>
      </div>
      <div className="space-y-1.5">
        {phases.map((p, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div key={p.id} className="flex items-center gap-2.5">
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: done ? "#34C759" : active ? "#007AFF" : "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {done ? <Check style={{ width: 10, height: 10, color: "#fff" }} /> :
                  active ? <Loader2 style={{ width: 10, height: 10, color: "#fff", animation: "spin 1s linear infinite" }} /> :
                  <span style={{ fontSize: 8, color: "#bbb" }}>{i + 1}</span>}
              </div>
              <div className="flex-1">
                <span className="text-[11px]" style={{ color: done ? "#34C759" : active ? "#007AFF" : "#ccc", fontWeight: active ? 600 : 400 }}>{p.label}</span>
                {active && <span className="text-[9px] ml-2 font-mono" style={{ color: "#007AFF" }}>{p.model}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Performance-Badge ─────────────────────────────────────────────────────────
function PerfBadge({ stats }) {
  const [open, setOpen] = useState(false);
  if (!stats) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-[10px]" style={{ color: "#aaa" }}>
        <Clock className="w-3 h-3" />
        {stats.total_ms ? `${(stats.total_ms / 1000).toFixed(1)}s Gesamtzeit` : ""}
        {stats.cache_hit && <span style={{ color: "#007AFF", marginLeft: 4 }}><Database className="w-3 h-3 inline" /> Cache genutzt</span>}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && stats.perf_log && (
        <div style={{ marginTop: 6, padding: "8px 10px", background: "rgba(0,0,0,0.03)", borderRadius: 8, fontFamily: "monospace" }}>
          <p className="text-[9px] font-bold uppercase mb-1.5" style={{ color: "#888" }}>Performance-Log</p>
          {Object.entries(stats.perf_log).map(([step, data]) => (
            <div key={step} className="flex items-center justify-between text-[10px] py-0.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <span style={{ color: "#555" }}>{step}</span>
              <span style={{ color: "#0A84FF" }}>{data.model}</span>
              <span style={{ color: "#34C759" }}>{data.ms}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DocResultStep (identisch zu V1) ──────────────────────────────────────────
function DocResultStep({ step, result }) {
  const [open, setOpen] = useState(false);
  const items = step.getItems(result);
  const details = step.getDetails ? step.getDetails(result) : [];
  const hasContent = items.length > 0;
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${hasContent ? step.color + "35" : "rgba(0,0,0,0.06)"}`, background: hasContent ? step.color + "05" : "transparent" }}>
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => hasContent && setOpen(o => !o)}>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0" style={{ background: hasContent ? step.color : "#ddd", minWidth: 18, textAlign: "center" }}>{step.num}</span>
        <span className="text-[11px] font-semibold flex-1 min-w-0 truncate" style={{ color: hasContent ? "#1a1a1a" : "#ccc" }}>{step.label}</span>
        {hasContent ? (
          <><span className="text-[10px] max-w-[160px] truncate flex-shrink-0" style={{ color: step.color }}>{items[0]}</span>
          {open ? <ChevronUp style={{ width: 11, height: 11, color: "#aaa", flexShrink: 0 }} /> : <ChevronDown style={{ width: 11, height: 11, color: "#aaa", flexShrink: 0 }} />}</>
        ) : <span className="text-[10px] flex-shrink-0" style={{ color: "#ccc" }}>—</span>}
      </div>
      {open && hasContent && (
        <div className="px-3 pb-2.5" style={{ borderTop: `1px solid ${step.color}20` }}>
          <p className="text-[9px] font-mono mt-2 mb-1.5" style={{ color: step.color + "aa" }}>→ {step.wo}</p>
          <div className="space-y-0.5 mb-1.5">{items.map((item, i) => <p key={i} className="text-[11px]" style={{ color: "#444" }}>• {item}</p>)}</div>
          {details.length > 0 && (
            <div className="space-y-0.5 mt-1.5 pt-1.5" style={{ borderTop: `1px solid ${step.color}15` }}>
              {details.slice(0, 10).map((d, i) => <p key={i} className="text-[10px]" style={{ color: "#777" }}>{d}</p>)}
              {details.length > 10 && <p className="text-[10px]" style={{ color: "#aaa" }}>+ {details.length - 10} weitere…</p>}
            </div>
          )}
          {step.hinweis && <p className="text-[9px] mt-1.5 italic" style={{ color: "#bbb" }}>ℹ {step.hinweis}</p>}
        </div>
      )}
    </div>
  );
}

// ── DocCard V2 ────────────────────────────────────────────────────────────────
function DocCard({ doc, analyzing, onAnalyze, onDelete, result, stats }) {
  const [open, setOpen] = useState(false);
  const isAnalyzing = analyzing === doc.id;
  const analyzed = !!result && !result.error;
  const hasError = result?.error;
  const coveredCount = analyzed ? STEP_MAP.filter(s => s.isCovered(result)).length : 0;
  const phase = isAnalyzing ? analyzing === doc.id && "parallel" : null;

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, overflow: "hidden" }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0">{fileIcon(doc.file_type)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: "#1a1a1a" }}>{doc.title}</p>
          <div className="flex items-center gap-2">
            <p className="text-[10px] truncate" style={{ color: "#aaa" }}>{doc.file_type || "Unbekannter Typ"}</p>
            {result?.structured_json && (
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,122,255,0.08)", color: "#007AFF" }}>
                <Database className="w-2.5 h-2.5 inline mr-0.5" />Cache
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isAnalyzing ? (
            <span className="flex items-center gap-1 text-[11px] px-2 py-1 rounded" style={{ background: "rgba(52,199,89,0.1)", color: "#1a7f37" }}>
              <Loader2 className="w-3 h-3 animate-spin" /> V2 analysiert…
            </span>
          ) : analyzed ? (
            <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded" style={{ background: "rgba(52,199,89,0.08)", color: "#1a7f37", border: "1px solid rgba(52,199,89,0.2)" }}>
              <Check className="w-3 h-3" />{coveredCount}/10 Schritte
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          ) : hasError ? (
            <button onClick={() => onAnalyze(doc)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded" style={{ background: "rgba(255,59,48,0.08)", color: "#c0392b", border: "1px solid rgba(255,59,48,0.2)" }}>
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          ) : (
            <button onClick={() => onAnalyze(doc)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded" style={{ background: "rgba(0,0,0,0.05)", color: "#555", border: "1px solid rgba(0,0,0,0.1)" }}>
              <Zap className="w-3 h-3" /> V2 analysieren
            </button>
          )}
          {doc.file_url && (
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-[11px] px-2 py-1 rounded" style={{ background: "rgba(0,122,255,0.07)", color: "#007AFF", border: "1px solid rgba(0,122,255,0.15)" }}>Öffnen</a>
          )}
          {analyzed && (
            <button onClick={() => onAnalyze(doc, true)} title="Neu verarbeiten (Cache ignorieren)" className="text-[11px] px-2 py-1 rounded" style={{ background: "rgba(0,0,0,0.04)", color: "#888", border: "1px solid rgba(0,0,0,0.1)" }}>
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          <button onClick={() => onDelete(doc.id)} style={{ color: "#aaa", padding: 4 }} onMouseEnter={e => e.currentTarget.style.color = "#FF3B30"} onMouseLeave={e => e.currentTarget.style.color = "#aaa"}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isAnalyzing && <div className="px-4 pb-3"><AnalysisProgress phase="parallel" /></div>}

      {open && analyzed && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "#fafafa", padding: "12px 16px" }}>
          {doc.ai_summary && <p className="text-xs mb-3" style={{ color: "#444", lineHeight: 1.6, borderLeft: "3px solid #34C759", paddingLeft: 10 }}>{doc.ai_summary}</p>}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-0.5 flex-1">
              {STEP_MAP.map(s => <div key={s.num} className="flex-1 h-1.5 rounded-full" style={{ background: s.isCovered(result) ? s.color : "#e5e5e5" }} />)}
            </div>
            <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: "#555" }}>{coveredCount}/10</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#aaa" }}>Eingetragene Informationen pro Schritt</p>
          <div className="space-y-1.5">
            {STEP_MAP.map(step => <DocResultStep key={step.num} step={step} result={result} />)}
          </div>
          {result.informationsluecken?.length > 0 && (
            <div className="mt-3 rounded-lg p-3" style={{ background: "rgba(255,149,0,0.07)", border: "1px solid rgba(255,149,0,0.2)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#a05f00" }}>Informationslücken</p>
              {result.informationsluecken.map((g, i) => (
                <p key={i} className="text-xs flex items-start gap-1.5" style={{ color: "#7a4800" }}>
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "#FF9500" }} />
                  <span><strong>{g.schritt}:</strong> {g.hinweis}</span>
                </p>
              ))}
            </div>
          )}
          <PerfBadge stats={stats} />
        </div>
      )}

      {hasError && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "rgba(255,59,48,0.04)", padding: "10px 16px" }}>
          <p className="text-xs flex items-center gap-2" style={{ color: "#c0392b" }}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {result.error}
          </p>
        </div>
      )}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function TabDokumenteAnalyseV2({ caseId, caseData, onDataImport }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(null);
  const [results, setResults] = useState({});
  const [statsMap, setStatsMap] = useState({});
  const [pendingFiles, setPendingFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const fileRef = useRef(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    const data = await base44.entities.Document.filter({ case_id: caseId });
    setDocs(data);
    setLoading(false);
  }, [caseId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const addFiles = (files) => {
    setPendingFiles(prev => [...prev, ...Array.from(files).map(f => ({ file: f, name: f.name, id: Math.random().toString(36).slice(2) }))]);
  };

  const uploadAndAnalyze = async (pending) => {
    setPendingFiles(prev => prev.map(p => p.id === pending.id ? { ...p, uploading: true } : p));
    const uploadRes = await base44.integrations.Core.UploadFile({ file: pending.file });
    const newDoc = await base44.entities.Document.create({
      case_id: caseId, title: pending.name,
      file_url: uploadRes.file_url, file_type: pending.file.type, description: "",
    });
    setPendingFiles(prev => prev.filter(p => p.id !== pending.id));
    await loadDocs();
    await analyzeDocument(newDoc);
  };

  const uploadAllPending = async () => {
    for (const p of pendingFiles) await uploadAndAnalyze(p);
  };

  const analyzeDocument = async (doc, forceReprocess = false) => {
    setAnalyzing(doc.id);
    try {
      const response = await base44.functions.invoke("analyzeDocumentV2", { docId: doc.id, caseId, forceReprocess });
      const { result, stats } = response.data;
      setResults(prev => ({ ...prev, [doc.id]: result }));
      setStatsMap(prev => ({ ...prev, [doc.id]: stats }));
      onDataImport && onDataImport();
    } catch (error) {
      setResults(prev => ({ ...prev, [doc.id]: { error: error.response?.data?.error || error.message } }));
    }
    setAnalyzing(null);
  };

  const analyzeAll = async () => {
    setAnalyzingAll(true);
    // Parallele Analyse aller nicht-analysierten Dokumente
    await Promise.allSettled(
      docs.filter(d => !results[d.id] && !d.ai_raw).map(d => analyzeDocument(d))
    );
    setAnalyzingAll(false);
  };

  const deleteDoc = async (id) => { await base44.entities.Document.delete(id); loadDocs(); };

  const allCoverage = STEP_MAP.map(s => ({
    ...s,
    covered: docs.some(d => { const r = results[d.id] || d.ai_raw; return r && s.isCovered(r); })
  }));

  return (
    <div className="space-y-4" style={{ fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}>
      {/* V2 Badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(52,199,89,0.06)", border: "1px solid rgba(52,199,89,0.2)" }}>
        <Zap className="w-3.5 h-3.5" style={{ color: "#34C759" }} />
        <p className="text-[11px] font-semibold" style={{ color: "#1a7f37" }}>Dokument-Pipeline V2 — einmalige Extraktion · parallele Analyse · Caching · Modellabstufung</p>
      </div>

      {/* Drop zone */}
      <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }} onClick={() => !pendingFiles.length && fileRef.current?.click()} className="cursor-pointer transition-all" style={{ border: `2px dashed ${dragOver ? "#34C759" : "rgba(0,0,0,0.12)"}`, borderRadius: 10, background: dragOver ? "rgba(52,199,89,0.05)" : "rgba(0,0,0,0.02)", padding: pendingFiles.length ? "12px 16px" : "28px 16px", textAlign: pendingFiles.length ? "left" : "center" }}>
        {pendingFiles.length === 0 ? (
          <><Upload className="w-6 h-6 mx-auto mb-2" style={{ color: "#bbb" }} />
          <p className="text-sm font-medium" style={{ color: "#555" }}>Dateien hier ablegen oder klicken</p>
          <p className="text-xs mt-1" style={{ color: "#aaa" }}>PDF, Word, Pages, JPEG, PNG, MP4 — alle Formate · 80+ Seiten in ~5 Min.</p></>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: "#555" }}>{pendingFiles.length} Datei(en) bereit</p>
              <div className="flex gap-2">
                <button onClick={e => { e.stopPropagation(); fileRef.current?.click(); }} className="text-[11px] px-2.5 py-1 rounded" style={{ background: "rgba(0,0,0,0.06)", color: "#555" }}>+ Weitere</button>
                <button onClick={e => { e.stopPropagation(); uploadAllPending(); }} className="text-[11px] px-3 py-1 rounded font-semibold" style={{ background: "#34C759", color: "#fff" }}>Alle hochladen & analysieren</button>
                <button onClick={e => { e.stopPropagation(); setPendingFiles([]); }} style={{ color: "#aaa", padding: 2 }}><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            {pendingFiles.map(p => (
              <div key={p.id} className="flex items-center gap-2 py-1" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                {fileIcon(p.file.type)}
                <span className="text-xs flex-1 truncate" style={{ color: "#333" }}>{p.name}</span>
                <span className="text-[10px]" style={{ color: "#aaa" }}>{Math.round(p.file.size / 1024)} KB</span>
                {p.uploading && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#34C759" }} />}
                <button onClick={e => { e.stopPropagation(); setPendingFiles(prev => prev.filter(x => x.id !== p.id)); }} style={{ color: "#ccc" }}><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept={FILE_ACCEPT} multiple className="hidden" onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }} />

      {/* Docs list */}
      {loading ? (
        <div className="flex items-center justify-center py-10"><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(0,0,0,0.1)", borderTopColor: "#34C759" }} /></div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8" style={{ color: "#bbb" }}><p className="text-sm">Noch keine Dokumente hochgeladen</p></div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[11px]" style={{ color: "#aaa" }}>{docs.length} Dokument(e)</p>
            {docs.some(d => !results[d.id] && !d.ai_raw) && (
              <button onClick={analyzeAll} disabled={analyzingAll} className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded" style={{ background: "rgba(52,199,89,0.1)", color: "#1a7f37", border: "1px solid rgba(52,199,89,0.25)" }}>
                {analyzingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Alle parallel analysieren
              </button>
            )}
          </div>
          <div className="space-y-2">
            {docs.map(doc => (
              <DocCard key={doc.id} doc={doc} analyzing={analyzing} onAnalyze={analyzeDocument} onDelete={deleteDoc}
                result={results[doc.id] || (doc.ai_raw && !doc.ai_raw.structured_json === undefined ? doc.ai_raw : doc.ai_raw)}
                stats={statsMap[doc.id]} />
            ))}
          </div>
        </>
      )}

      {/* Gesamtabdeckung */}
      {docs.length > 0 && (
        <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#aaa" }}>Gesamtabdeckung — {allCoverage.filter(s => s.covered).length}/10 Schritte befüllt</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {allCoverage.map(s => (
              <div key={s.num} className="flex items-center gap-1.5 py-0.5">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.covered ? s.color : "#ddd", flexShrink: 0 }} />
                <span className="text-[10px]" style={{ color: s.covered ? "#1a1a1a" : "#bbb" }}><strong>{s.num}.</strong> {s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}