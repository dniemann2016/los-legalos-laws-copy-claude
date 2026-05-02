import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { uploadFile } from "@/lib/kiProvider";
import { Upload, Loader2, X, Check, AlertCircle, FileText, Image, Film, File, ChevronDown, ChevronUp, RefreshCw, Info, ArrowRight } from "lucide-react";

const FILE_ACCEPT = "*/*";

// ── STEP MAPPING: was wird wo in Lexara eingetragen ─────────────────────────
const STEP_MAP = [
  {
    num: 1, label: "Fallerfassung — Basisdaten", color: "#34C759",
    wo: "Tab 1 › Basisdaten",
    felder: ["Gericht", "Aktenzeichen", "Rechtsgebiet", "Instanz", "Prozessziel", "Zentrale Rechtsfrage", "Streitwert"],
    hinweis: "Nur wenn Feld noch leer — kein Überschreiben",
    getItems: r => [
      r?.basisdaten?.gericht && `Gericht: ${r.basisdaten.gericht}`,
      r?.basisdaten?.aktenzeichen && `AZ: ${r.basisdaten.aktenzeichen}`,
      r?.basisdaten?.rechtsgebiet && `Rechtsgebiet: ${r.basisdaten.rechtsgebiet}`,
      r?.basisdaten?.prozessziel && `Prozessziel: ${r.basisdaten.prozessziel}`,
      r?.basisdaten?.instanz && `Instanz: ${r.basisdaten.instanz}`,
      r?.streitwert && `Streitwert: ${Number(r.streitwert).toLocaleString()} €`,
    ].filter(Boolean),
    isCovered: r => !!(r?.basisdaten?.gericht || r?.basisdaten?.aktenzeichen || r?.basisdaten?.rechtsgebiet || r?.streitwert),
  },
  {
    num: 2, label: "Fallsubstanz", color: "#007AFF",
    wo: "Tab 2 › Argumente, Beweise, Fristen, Personen",
    felder: ["Argumente (eigen/gegner)", "Beweise → Quelle = Dokument", "Fristen mit Datum", "Beteiligte Personen"],
    hinweis: "Beweise werden dem Dokument als Quelle zugeordnet, aber nicht automatisch Argumenten verknüpft (→ Tab 2 › Verkettung)",
    getItems: r => {
      const args = r?.argumente || [];
      const bew = r?.beweise || [];
      const fri = r?.fristen || [];
      const per = r?.personen || [];
      if (!args.length && !bew.length && !fri.length && !per.length) return [];
      return [
        args.length && `${args.length} Argumente (${args.filter(a => a.seite === "eigen").length} eigene, ${args.filter(a => a.seite === "gegner").length} Gegner)`,
        bew.length && `${bew.length} Beweise`,
        fri.length && `${fri.length} Fristen`,
        per.length && `${per.length} Personen`,
      ].filter(Boolean);
    },
    getDetails: r => [
      ...(r?.argumente || []).map(a => `${a.seite === "gegner" ? "⚔" : "✓"} ${a.titel}`),
      ...(r?.beweise || []).map(b => `📎 ${b.titel}`),
      ...(r?.fristen || []).map(f => `📅 ${f.titel}${f.datum ? ` (${f.datum})` : ""}`),
      ...(r?.personen || []).map(p => `👤 ${p.name}${p.rolle ? ` — ${p.rolle}` : ""}`),
    ],
    isCovered: r => !!(r?.argumente?.length || r?.beweise?.length || r?.personen?.length || r?.fristen?.length),
  },
  {
    num: 3, label: "Gegneranalyse", color: "#FF3B30",
    wo: "Tab 3 › Gegner-Profil (Feld: gegner_profil)",
    felder: ["Gegner-Strategie / Profil", "Erkannte Taktiken", "Schwachstellen des Gegners"],
    hinweis: "Wird in Case.gegner_profil gespeichert und unter Tab 3 sichtbar",
    getItems: r => {
      const g = r?.schritt3_gegneranalyse;
      if (!g?.zusammenfassung) return [];
      return [
        g.zusammenfassung,
        g.taktiken?.length && `${g.taktiken.length} Taktiken erkannt`,
        g.schwachstellen?.length && `${g.schwachstellen.length} Schwachstellen`,
      ].filter(Boolean);
    },
    getDetails: r => [
      ...(r?.schritt3_gegneranalyse?.taktiken || []).map(t => `⚔ ${t}`),
      ...(r?.schritt3_gegneranalyse?.schwachstellen || []).map(s => `⚠ ${s}`),
    ],
    isCovered: r => !!(r?.schritt3_gegneranalyse?.zusammenfassung || r?.argumente?.some(a => a.seite === "gegner")),
  },
  {
    num: 4, label: "Rechtliche Analyse", color: "#FF9500",
    wo: "Tab 4 › Compliance, Streitwert, Präzedenzfälle",
    felder: ["Relevante Paragrafen / Gesetze", "Präzedenzfälle", "Compliance-Risiken", "Streitwert"],
    hinweis: "Informiert Tab 4 inhaltlich; Streitwert wird in Basisdaten gespeichert",
    getItems: r => {
      const g = r?.schritt4_rechtliche_analyse;
      return [
        g?.zusammenfassung,
        g?.relevante_paragrafen?.length && `${g.relevante_paragrafen.length} Paragrafen`,
        g?.praezedenzfaelle?.length && `${g.praezedenzfaelle.length} Präzedenzfälle`,
        g?.compliance_risiken?.length && `${g.compliance_risiken.length} Compliance-Risiken`,
      ].filter(Boolean);
    },
    getDetails: r => [
      ...(r?.schritt4_rechtliche_analyse?.relevante_paragrafen || []).map(p => `§ ${p}`),
      ...(r?.schritt4_rechtliche_analyse?.praezedenzfaelle || []).map(p => `⚖ ${p}`),
      ...(r?.schritt4_rechtliche_analyse?.compliance_risiken || []).map(c => `⚠ ${c}`),
    ],
    isCovered: r => !!(r?.schritt4_rechtliche_analyse?.zusammenfassung || r?.streitwert),
  },
  {
    num: 5, label: "Strategie", color: "#5856D6",
    wo: "Tab 5 › Fallnotizen (Case.notes)",
    felder: ["Empfohlene Prozessstrategie", "Stärken unserer Position", "Schwächen / Risiken"],
    hinweis: "Strategie-Erkenntnisse werden als Notiz zu Case.notes hinzugefügt",
    getItems: r => {
      const g = r?.schritt5_strategie;
      return [
        g?.empfohlene_strategie,
        g?.staerken?.length && `${g.staerken.length} Stärken identifiziert`,
        g?.schwaechen?.length && `${g.schwaechen.length} Schwächen identifiziert`,
      ].filter(Boolean);
    },
    getDetails: r => [
      ...(r?.schritt5_strategie?.staerken || []).map(s => `+ ${s}`),
      ...(r?.schritt5_strategie?.schwaechen || []).map(s => `– ${s}`),
    ],
    isCovered: r => !!(r?.schritt5_strategie?.empfohlene_strategie || r?.schritt5_strategie?.zusammenfassung),
  },
  {
    num: 6, label: "Risiko", color: "#FF2D55",
    wo: "Tab 6 › Risikoanalyse (Case.notes + ki_berater_result)",
    felder: ["Risiko-Level (gering/mittel/hoch)", "Konkrete Risiken", "Beweisprobleme"],
    hinweis: "Risiko-Zusammenfassung wird in Fallnotizen ergänzt",
    getItems: r => {
      const g = r?.schritt6_risiko;
      return [
        g?.risiko_level && `Risiko-Level: ${g.risiko_level}`,
        g?.zusammenfassung,
        g?.risiken?.length && `${g.risiken.length} Risiken erkannt`,
      ].filter(Boolean);
    },
    getDetails: r => (r?.schritt6_risiko?.risiken || []).map(ri => `⚠ ${ri}`),
    isCovered: r => !!(r?.schritt6_risiko?.zusammenfassung),
  },
  {
    num: 7, label: "Simulation", color: "#AF52DE",
    wo: "Tab 7 › Verhandlungssimulation (Case.ki_berater_result)",
    felder: ["Vergleichswert in €", "Prognose-Einfluss", "Verhandlungsszenarien"],
    hinweis: "Vergleichswert & Prognosehinweis werden in ki_berater_result gespeichert",
    getItems: r => {
      const g = r?.schritt7_simulation;
      return [
        g?.prognose_einfluss,
        g?.vergleichswert_eur && `Vergleichswert: ${Number(g.vergleichswert_eur).toLocaleString()} €`,
        g?.zusammenfassung,
      ].filter(Boolean);
    },
    getDetails: () => [],
    isCovered: r => !!(r?.schritt7_simulation?.zusammenfassung || r?.schritt7_simulation?.prognose_einfluss),
  },
  {
    num: 8, label: "Aktion / Schriftsätze", color: "#FF6B35",
    wo: "Tab 8 › Verhandlungsführung, Schriftsatz-Generator",
    felder: ["Nächste Handlungsschritte", "Einzureichende Dokumente", "Antwortfristen"],
    hinweis: "Handlungsempfehlungen werden als Notiz und in ki_berater_result ergänzt",
    getItems: r => {
      const g = r?.schritt8_aktion;
      return [
        g?.zusammenfassung,
        g?.naechste_schritte?.length && `${g.naechste_schritte.length} nächste Schritte`,
        g?.erforderliche_dokumente?.length && `${g.erforderliche_dokumente.length} einzureichende Dokumente`,
      ].filter(Boolean);
    },
    getDetails: r => [
      ...(r?.schritt8_aktion?.naechste_schritte || []).map(s => `→ ${s}`),
      ...(r?.schritt8_aktion?.erforderliche_dokumente || []).map(d => `📄 ${d}`),
    ],
    isCovered: r => !!(r?.schritt8_aktion?.zusammenfassung),
  },
  {
    num: 9, label: "Cockpit", color: "#00BCD4",
    wo: "Tab 9 › Fall-Cockpit (Case.ki_berater_result.prognose_delta)",
    felder: ["Prognose-Delta (%)", "Gesamteinfluss des Dokuments"],
    hinweis: "Prognose-Delta wird in ki_berater_result gespeichert und im Cockpit sichtbar",
    getItems: r => {
      const g = r?.schritt9_cockpit;
      const delta = g?.prognose_delta_pct;
      return [
        g?.zusammenfassung,
        delta != null && `Prognose-Einfluss: ${delta > 0 ? "+" : ""}${delta}%`,
      ].filter(Boolean);
    },
    getDetails: () => [],
    isCovered: r => !!(r?.schritt9_cockpit?.zusammenfassung),
  },
  {
    num: 10, label: "Abschluss", color: "#34C759",
    wo: "Tab 10 › Abschluss (Case.ki_berater_result.vergleichsempfehlung)",
    felder: ["Prozessziel erreichbar?", "Vergleichsempfehlung"],
    hinweis: "Vergleichsempfehlung wird in ki_berater_result gespeichert",
    getItems: r => {
      const g = r?.schritt10_abschluss;
      return [
        g?.zusammenfassung,
        g?.vergleichsempfehlung,
        g?.prozessziel_erreichbar != null && `Prozessziel erreichbar: ${g.prozessziel_erreichbar ? "✓ Ja" : "⚠ Unklar"}`,
      ].filter(Boolean);
    },
    getDetails: () => [],
    isCovered: r => !!(r?.schritt10_abschluss?.zusammenfassung),
  },
];

// ── HELPERS ──────────────────────────────────────────────────────────────────
function fileIcon(type) {
  if (!type) return <File className="w-4 h-4" style={{ color: "#aaa" }} />;
  if (type.startsWith("image/")) return <Image className="w-4 h-4" style={{ color: "#007AFF" }} />;
  if (type.startsWith("video/")) return <Film className="w-4 h-4" style={{ color: "#FF9500" }} />;
  if (type.includes("pdf")) return <FileText className="w-4 h-4" style={{ color: "#FF3B30" }} />;
  if (type.includes("word") || type.includes("document")) return <FileText className="w-4 h-4" style={{ color: "#007AFF" }} />;
  return <File className="w-4 h-4" style={{ color: "#aaa" }} />;
}

// ── KI EXPLANATION PANEL ─────────────────────────────────────────────────────
function KIExplanationPanel() {
  const [open, setOpen] = useState(false);
  const [detailStep, setDetailStep] = useState(null);

  return (
    <div className="rounded-xl border" style={{ borderColor: "rgba(0,122,255,0.2)", background: "rgba(0,122,255,0.03)" }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
        <Info className="w-4 h-4 flex-shrink-0" style={{ color: "#007AFF" }} />
        <div className="flex-1">
          <p className="text-xs font-semibold" style={{ color: "#007AFF" }}>Was macht die KI-Analyse genau?</p>
          <p className="text-[10px]" style={{ color: "#888" }}>Welche Daten aus diesem Dokument werden in welchem Schritt eingetragen</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: "#aaa" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#aaa" }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-1 text-[10px] text-gray-500 flex-wrap pt-3">
            <span className="px-2 py-0.5 rounded bg-gray-100">📄 Dokument</span>
            <ArrowRight style={{ width: 10, height: 10 }} />
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600">Text extrahieren</span>
            <ArrowRight style={{ width: 10, height: 10 }} />
            <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-600">KI analysiert alle 10 Schritte</span>
            <ArrowRight style={{ width: 10, height: 10 }} />
            <span className="px-2 py-0.5 rounded bg-green-50 text-green-600">Daten in Lexara eintragen</span>
          </div>

          <div className="space-y-1.5">
            {STEP_MAP.map((step, i) => (
              <div key={i} className="rounded-lg border cursor-pointer transition-all"
                style={{ borderColor: detailStep === i ? step.color + "40" : "rgba(0,0,0,0.07)", background: detailStep === i ? step.color + "06" : "#fff" }}
                onClick={() => setDetailStep(detailStep === i ? null : i)}>
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: step.color, minWidth: 18, textAlign: "center" }}>{step.num}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-700">{step.label}</p>
                    <p className="text-[9px] font-mono" style={{ color: "#aaa" }}>→ {step.wo}</p>
                  </div>
                  {detailStep === i ? <ChevronUp style={{ width: 11, height: 11, color: "#aaa" }} /> : <ChevronDown style={{ width: 11, height: 11, color: "#aaa" }} />}
                </div>
                {detailStep === i && (
                  <div className="px-3 pb-3 space-y-2" style={{ borderTop: `1px solid ${step.color}20` }}>
                    <div className="flex flex-wrap gap-1 pt-2">
                      {step.felder.map((f, j) => (
                        <span key={j} className="text-[10px] px-2 py-0.5 rounded"
                          style={{ background: step.color + "12", color: step.color, border: `1px solid ${step.color}25` }}>{f}</span>
                      ))}
                    </div>
                    <p className="text-[10px]" style={{ color: "#888" }}>ℹ {step.hinweis}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── DOC RESULT STEP ───────────────────────────────────────────────────────────
function DocResultStep({ step, result }) {
  const [open, setOpen] = useState(false);
  const items = step.getItems(result);
  const details = step.getDetails ? step.getDetails(result) : [];
  const hasContent = items.length > 0;

  return (
    <div className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${hasContent ? step.color + "35" : "rgba(0,0,0,0.06)"}`, background: hasContent ? step.color + "05" : "transparent" }}>
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => hasContent && setOpen(o => !o)}>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0"
          style={{ background: hasContent ? step.color : "#ddd", minWidth: 18, textAlign: "center" }}>{step.num}</span>
        <span className="text-[11px] font-semibold flex-1 min-w-0 truncate" style={{ color: hasContent ? "#1a1a1a" : "#ccc" }}>{step.label}</span>
        {hasContent ? (
          <>
            <span className="text-[10px] max-w-[160px] truncate flex-shrink-0" style={{ color: step.color }}>{items[0]}</span>
            {open ? <ChevronUp style={{ width: 11, height: 11, color: "#aaa", flexShrink: 0 }} /> : <ChevronDown style={{ width: 11, height: 11, color: "#aaa", flexShrink: 0 }} />}
          </>
        ) : (
          <span className="text-[10px] flex-shrink-0" style={{ color: "#ccc" }}>—</span>
        )}
      </div>

      {open && hasContent && (
        <div className="px-3 pb-2.5" style={{ borderTop: `1px solid ${step.color}20` }}>
          <p className="text-[9px] font-mono mt-2 mb-1.5" style={{ color: step.color + "aa" }}>→ {step.wo}</p>
          <div className="space-y-0.5 mb-1.5">
            {items.map((item, i) => <p key={i} className="text-[11px]" style={{ color: "#444" }}>• {item}</p>)}
          </div>
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

// ── GAP BADGE ─────────────────────────────────────────────────────────────────
function GapBadge({ gaps }) {
  if (!gaps || gaps.length === 0) return null;
  return (
    <div className="mt-3 rounded-lg p-3" style={{ background: "rgba(255,149,0,0.07)", border: "1px solid rgba(255,149,0,0.2)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#a05f00" }}>Informationslücken — KI-Hinweise</p>
      <ul className="space-y-1">
        {gaps.map((g, i) => (
          <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "#7a4800" }}>
            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "#FF9500" }} />
            <span><strong>{g.schritt}:</strong> {g.hinweis}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── DOC CARD ──────────────────────────────────────────────────────────────────
function DocCard({ doc, analyzing, ocr_status, onAnalyze, onDelete, result }) {
  const [open, setOpen] = useState(false);
  const isAnalyzing = analyzing === doc.id;
  const analyzed = !!result && !result.error;
  const hasError = result?.error;

  const coveredCount = analyzed ? STEP_MAP.filter(s => s.isCovered(result)).length : 0;

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, overflow: "hidden" }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0">{fileIcon(doc.file_type)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: "#1a1a1a" }}>{doc.title}</p>
          <p className="text-[10px] truncate" style={{ color: "#aaa" }}>{doc.file_type || "Unbekannter Typ"}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isAnalyzing ? (
            <span className="flex items-center gap-1 text-[11px] px-2 py-1 rounded" style={{ background: "rgba(52,199,89,0.1)", color: "#1a7f37" }}>
              <Loader2 className="w-3 h-3 animate-spin" />
              {"KI analysiert…"}
            </span>
          ) : analyzed ? (
            <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-all"
              style={{ background: "rgba(52,199,89,0.08)", color: "#1a7f37", border: "1px solid rgba(52,199,89,0.2)" }}>
              <Check className="w-3 h-3" />
              {coveredCount}/10 Schritte
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          ) : hasError ? (
            <button onClick={() => onAnalyze(doc)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded"
              style={{ background: "rgba(255,59,48,0.08)", color: "#c0392b", border: "1px solid rgba(255,59,48,0.2)" }}>
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          ) : (
            <button onClick={() => onAnalyze(doc)} className="text-[11px] px-2 py-1 rounded transition-all"
              style={{ background: "rgba(0,0,0,0.05)", color: "#555", border: "1px solid rgba(0,0,0,0.1)" }}>
              Analysieren
            </button>
          )}
          {doc.file_url && (
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
              className="text-[11px] px-2 py-1 rounded"
              style={{ background: "rgba(0,122,255,0.07)", color: "#007AFF", border: "1px solid rgba(0,122,255,0.15)" }}>
              Öffnen
            </a>
          )}
          <button onClick={() => onDelete(doc.id)} style={{ color: "#aaa", padding: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = "#FF3B30"}
            onMouseLeave={e => e.currentTarget.style.color = "#aaa"}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {open && analyzed && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "#fafafa", padding: "12px 16px" }}>
          {doc.ai_summary && (
            <p className="text-xs mb-3" style={{ color: "#444", lineHeight: 1.6, borderLeft: "3px solid #34C759", paddingLeft: 10 }}>{doc.ai_summary}</p>
          )}

          {/* Step progress bar */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-0.5 flex-1">
              {STEP_MAP.map(s => (
                <div key={s.num} className="flex-1 h-1.5 rounded-full" style={{ background: s.isCovered(result) ? s.color : "#e5e5e5" }} title={`Schritt ${s.num}: ${s.label}`} />
              ))}
            </div>
            <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: "#555" }}>{coveredCount}/10</span>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#aaa" }}>Eingetragene Informationen pro Schritt</p>
          <div className="space-y-1.5">
            {STEP_MAP.map(step => (
              <DocResultStep key={step.num} step={step} result={result} />
            ))}
          </div>

          <GapBadge gaps={result.informationsluecken} />
          <p className="text-[10px] mt-3" style={{ color: "#aaa" }}>
            Alle extrahierten Daten wurden automatisch in die entsprechenden Tabs übernommen. Manuelle Korrekturen jederzeit möglich.
          </p>
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

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function TabDokumenteAnalyse({ caseId, caseData, onDataImport }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(null);
  const [ocrStatus, setOcrStatus] = useState({});
  const [results, setResults] = useState({});
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
    const newPending = Array.from(files).map(f => ({ file: f, name: f.name, id: Math.random().toString(36).slice(2) }));
    setPendingFiles(prev => [...prev, ...newPending]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const uploadAndAnalyze = async (pending) => {
    setPendingFiles(prev => prev.map(p => p.id === pending.id ? { ...p, uploading: true } : p));
    const uploadRes = await uploadFile({ file: pending.file });
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

  const analyzeDocument = async (doc, retryCount = 0) => {
    setAnalyzing(doc.id);
    setOcrStatus(prev => ({ ...prev, [doc.id]: "analyzing" }));
    try {
      const response = await base44.functions.invoke("analyzeDocument", {
        docId: doc.id,
        caseId,
      });
      const { result, stats } = response.data;
      console.log("Analyse abgeschlossen:", stats);
      setResults(prev => ({ ...prev, [doc.id]: result }));
      onDataImport && onDataImport();
    } catch (error) {
      const msg = error.response?.data?.error || error.message || "";
      const isRateLimit = msg.toLowerCase().includes("rate limit") || error.response?.status === 429;
      if (isRateLimit && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 3000; // 3s, 6s, 12s
        console.log(`Rate limit — retry ${retryCount + 1}/3 in ${delay / 1000}s`);
        await new Promise(r => setTimeout(r, delay));
        setAnalyzing(null);
        return analyzeDocument(doc, retryCount + 1);
      }
      setResults(prev => ({ ...prev, [doc.id]: { error: isRateLimit ? "Rate-Limit erreicht — bitte kurz warten und erneut versuchen." : msg } }));
    }
    setOcrStatus(prev => ({ ...prev, [doc.id]: "done" }));
    setAnalyzing(null);
  };

  const analyzeAll = async () => {
    setAnalyzingAll(true);
    for (const doc of docs) {
      if (!results[doc.id] && !doc.ai_raw) await analyzeDocument(doc);
    }
    setAnalyzingAll(false);
  };

  const deleteDoc = async (id) => {
    await base44.entities.Document.delete(id);
    loadDocs();
  };

  // Overall coverage across all docs
  const allCoverage = STEP_MAP.map(s => ({
    ...s,
    covered: docs.some(d => {
      const r = results[d.id] || d.ai_raw;
      return r && s.isCovered(r);
    })
  }));

  return (
    <div className="space-y-4" style={{ fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !pendingFiles.length && fileRef.current?.click()}
        className="cursor-pointer transition-all"
        style={{
          border: `2px dashed ${dragOver ? "#34C759" : "rgba(0,0,0,0.12)"}`,
          borderRadius: 10,
          background: dragOver ? "rgba(52,199,89,0.05)" : "rgba(0,0,0,0.02)",
          padding: pendingFiles.length ? "12px 16px" : "28px 16px",
          textAlign: pendingFiles.length ? "left" : "center",
        }}
      >
        {pendingFiles.length === 0 ? (
          <>
            <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: "#bbb" }} />
            <p className="text-sm font-medium" style={{ color: "#555" }}>Dateien hier ablegen oder klicken</p>
            <p className="text-xs mt-1" style={{ color: "#aaa" }}>PDF, Word, Pages, Numbers, JPEG, PNG, MP4, MOV — alle Formate</p>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: "#555" }}>{pendingFiles.length} Datei(en) bereit</p>
              <div className="flex gap-2">
                <button onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="text-[11px] px-2.5 py-1 rounded" style={{ background: "rgba(0,0,0,0.06)", color: "#555" }}>
                  + Weitere
                </button>
                <button onClick={e => { e.stopPropagation(); uploadAllPending(); }}
                  className="text-[11px] px-3 py-1 rounded font-semibold" style={{ background: "#34C759", color: "#fff" }}>
                  Alle hochladen & analysieren
                </button>
                <button onClick={e => { e.stopPropagation(); setPendingFiles([]); }} style={{ color: "#aaa", padding: 2 }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {pendingFiles.map(p => (
              <div key={p.id} className="flex items-center gap-2 py-1" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                {fileIcon(p.file.type)}
                <span className="text-xs flex-1 truncate" style={{ color: "#333" }}>{p.name}</span>
                <span className="text-[10px]" style={{ color: "#aaa" }}>{Math.round(p.file.size / 1024)} KB</span>
                {p.uploading && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#34C759" }} />}
                <button onClick={e => { e.stopPropagation(); setPendingFiles(prev => prev.filter(x => x.id !== p.id)); }} style={{ color: "#ccc" }}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept={FILE_ACCEPT} multiple className="hidden"
        onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }} />

      {/* KI Explanation */}
      <KIExplanationPanel />

      {/* Docs list */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(0,0,0,0.1)", borderTopColor: "#34C759" }} />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8" style={{ color: "#bbb" }}>
          <p className="text-sm">Noch keine Dokumente hochgeladen</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[11px]" style={{ color: "#aaa" }}>{docs.length} Dokument(e)</p>
            {docs.some(d => !results[d.id] && !d.ai_raw) && (
              <button onClick={analyzeAll} disabled={analyzingAll}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded transition-all"
                style={{ background: "rgba(52,199,89,0.1)", color: "#1a7f37", border: "1px solid rgba(52,199,89,0.25)" }}>
                {analyzingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Alle analysieren
              </button>
            )}
          </div>
          <div className="space-y-2">
            {docs.map(doc => (
              <DocCard
                key={doc.id}
                doc={doc}
                analyzing={analyzing}
                ocr_status={ocrStatus[doc.id]}
                onAnalyze={analyzeDocument}
                onDelete={deleteDoc}
                result={results[doc.id] || (doc.ai_raw ? { ...doc.ai_raw, informationsluecken: doc.ai_raw.informationsluecken || [] } : null)}
              />
            ))}
          </div>
        </>
      )}

      {/* Overall step coverage across ALL docs */}
      {docs.length > 0 && (
        <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#aaa" }}>
            Gesamtabdeckung — {allCoverage.filter(s => s.covered).length}/10 Schritte aus Dokumenten befüllt
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {allCoverage.map(s => (
              <div key={s.num} className="flex items-center gap-1.5 py-0.5">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.covered ? s.color : "#ddd", flexShrink: 0 }} />
                <span className="text-[10px]" style={{ color: s.covered ? "#1a1a1a" : "#bbb" }}>
                  <strong>{s.num}.</strong> {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}