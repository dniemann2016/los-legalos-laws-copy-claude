import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2, X, Check, AlertCircle, FileText, Image, Film, File, ChevronDown, ChevronUp, RefreshCw, Info, MapPin, ArrowRight } from "lucide-react";

const FILE_ACCEPT = "*/*"; // all types

function fileIcon(type) {
  if (!type) return <File className="w-4 h-4" style={{ color: "#aaa" }} />;
  if (type.startsWith("image/")) return <Image className="w-4 h-4" style={{ color: "#007AFF" }} />;
  if (type.startsWith("video/")) return <Film className="w-4 h-4" style={{ color: "#FF9500" }} />;
  if (type.includes("pdf")) return <FileText className="w-4 h-4" style={{ color: "#FF3B30" }} />;
  if (type.includes("word") || type.includes("document")) return <FileText className="w-4 h-4" style={{ color: "#007AFF" }} />;
  return <File className="w-4 h-4" style={{ color: "#aaa" }} />;
}

const STEP_LABELS = [
  "Fallerfassung (Basisdaten)",
  "Fallsubstanz (Argumente & Beweise)",
  "Gegneranalyse",
  "Rechtliche Analyse",
  "Strategie",
  "Risiko",
  "Simulation",
  "Aktion / Schriftsätze",
  "Cockpit",
  "Abschluss",
  "KI-Protokoll",
];

// ── KI EXPLANATION PANEL ─────────────────────────────────────────────────────

const KI_STEPS_EXPLANATION = [
  {
    schritt: "Schritt 1 — Fallerfassung (Basisdaten)",
    tab: "Tab 1 › Basisdaten",
    felder: ["Gericht", "Aktenzeichen", "Rechtsgebiet", "Instanz", "Prozessziel", "Zentrale Rechtsfrage", "Streitwert"],
    beschreibung: "Die KI liest Kopfdaten aus dem Dokument (Briefkopf, Urteilsrubrum, Aktenzeichen) und befüllt die Basisdaten automatisch — aber nur wenn das Feld noch leer ist.",
    color: "#34C759",
  },
  {
    schritt: "Schritt 2 — Fallsubstanz › Argumente & Beweise",
    tab: "Tab 2 › Argumente & Beweise",
    felder: [
      "Argumente (eigene Seite & Gegner) → Stärke, Typ, Beschreibung",
      "Beweise → Titel, Typ, Gewicht, Quelle (Dokumentname)",
    ],
    beschreibung: "Für jedes erkannte Argument wird ein Eintrag unter 'Argumente' erstellt (Seite: eigen/gegner). Für jeden Beweis wird ein Eintrag unter 'Beweise' erstellt mit Verweis auf das Quelldokument. Die Beweise sind dabei NOCH NICHT automatisch einem Argument zugeordnet — dies kann manuell oder per Verkettung erfolgen.",
    color: "#007AFF",
  },
  {
    schritt: "Schritt 2 — Fallsubstanz › Personen",
    tab: "Tab 2 › Personen",
    felder: ["Name", "Rolle (Richter, Zeuge, Partei…)", "Organisation"],
    beschreibung: "Alle im Dokument genannten Personen werden extrahiert und unter 'Personen' gespeichert.",
    color: "#5856D6",
  },
  {
    schritt: "Schritt 2 — Fallsubstanz › Fristen",
    tab: "Tab 2 › Fristen",
    felder: ["Titel", "Fristtyp", "Fälligkeitsdatum", "Seite: Eigene", "Status: offen"],
    beschreibung: "Erkannte Fristen und Deadlines werden unter 'Fristen' angelegt. Datum wird aus dem Dokument extrahiert.",
    color: "#FF9500",
  },
  {
    schritt: "Schritt 2 — Fallsubstanz › Zeitstrahl",
    tab: "Tab 2 › Dokumentenanalyse / Zeitstrahl",
    felder: ["Chronologische Ereignisse", "Vertragspunkte mit Fälligkeitsdaten"],
    beschreibung: "Kann aus den Dokumenten separat per KI generiert werden (Button 'Aus Dokumenten generieren' im Zeitstrahl).",
    color: "#FF6B35",
  },
  {
    schritt: "Schritt 1–10 — Informationslücken",
    tab: "Alle Tabs (Hinweise)",
    felder: ["Fehlende Basisdaten", "Fehlende Argumente", "Fehlende Beweise", "Fehlende Gegnerinfos"],
    beschreibung: "Die KI analysiert alle 11 Schritte und weist auf fehlende Informationen hin — direkt nach der Analyse sichtbar als orangener Hinweisblock.",
    color: "#FF3B30",
  },
];

function KIExplanationPanel() {
  const [open, setOpen] = useState(false);
  const [detailStep, setDetailStep] = useState(null);

  return (
    <div className="rounded-xl border" style={{ borderColor: "rgba(0,122,255,0.2)", background: "rgba(0,122,255,0.03)" }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
        <Info className="w-4 h-4 flex-shrink-0" style={{ color: "#007AFF" }} />
        <div className="flex-1">
          <p className="text-xs font-semibold" style={{ color: "#007AFF" }}>Was macht die KI-Analyse genau?</p>
          <p className="text-[10px]" style={{ color: "#888" }}>Welche Daten werden wo abgespeichert — Schritt für Schritt erklärt</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: "#aaa" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#aaa" }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <p className="text-[11px] pt-3" style={{ color: "#555" }}>
            Wenn Sie ein Dokument analysieren lassen, durchläuft die KI folgende Schritte automatisch:
          </p>

          {/* Process flow */}
          <div className="flex items-center gap-1 text-[10px] text-gray-500 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-gray-100">📄 Dokument</span>
            <ArrowRight style={{ width: 10, height: 10 }} />
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600">Text extrahieren</span>
            <ArrowRight style={{ width: 10, height: 10 }} />
            <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-600">KI analysiert</span>
            <ArrowRight style={{ width: 10, height: 10 }} />
            <span className="px-2 py-0.5 rounded bg-green-50 text-green-600">Daten verteilen</span>
          </div>

          {/* Step cards */}
          <div className="space-y-2">
            {KI_STEPS_EXPLANATION.map((step, i) => (
              <div key={i}
                className="rounded-lg border cursor-pointer transition-all"
                style={{ borderColor: detailStep === i ? step.color + "50" : "rgba(0,0,0,0.08)", background: detailStep === i ? step.color + "06" : "#fff" }}
                onClick={() => setDetailStep(detailStep === i ? null : i)}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: step.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-700">{step.schritt}</p>
                    <p className="text-[10px]" style={{ color: "#aaa" }}><MapPin style={{ width: 9, height: 9, display: "inline", marginRight: 2 }} />{step.tab}</p>
                  </div>
                  {detailStep === i ? <ChevronUp style={{ width: 12, height: 12, color: "#aaa", flexShrink: 0 }} /> : <ChevronDown style={{ width: 12, height: 12, color: "#aaa", flexShrink: 0 }} />}
                </div>

                {detailStep === i && (
                  <div className="px-3 pb-3 space-y-2" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <p className="text-[11px] text-gray-600 pt-2">{step.beschreibung}</p>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#aaa" }}>Gespeicherte Felder</p>
                      <div className="flex flex-wrap gap-1">
                        {step.felder.map((f, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded"
                            style={{ background: step.color + "12", color: step.color, border: `1px solid ${step.color}25` }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Important note */}
          <div className="rounded-lg p-3" style={{ background: "rgba(255,149,0,0.07)", border: "1px solid rgba(255,149,0,0.2)" }}>
            <p className="text-[10px] font-semibold text-amber-700 mb-1">⚠ Wichtige Hinweise</p>
            <ul className="space-y-0.5 text-[10px] text-amber-700">
              <li>• Basisdaten werden nur befüllt wenn das Feld noch <strong>leer</strong> ist (kein Überschreiben)</li>
              <li>• Beweise werden dem Dokument als Quelle zugeordnet, aber <strong>nicht automatisch einem Argument</strong> — Verknüpfung unter Tab 2 › Verkettung</li>
              <li>• Bei Fotos/Videos: KI analysiert Bildinhalt, Personen, Ort und Beweiswert</li>
              <li>• Alle KI-Ergebnisse können manuell bearbeitet/korrigiert werden</li>
              <li>• Im KI-Protokoll (Tab 11) werden alle Analyse-Schritte protokolliert</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function DocResultStep({ num, label, color, items = [], details = [], note }) {
  const [open, setOpen] = useState(false);
  const hasContent = items.length > 0 || details.length > 0;
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${hasContent ? color + "30" : "rgba(0,0,0,0.06)"}`, background: hasContent ? color + "05" : "transparent" }}>
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => hasContent && setOpen(o => !o)}>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: hasContent ? color : "#ddd", color: "#fff", minWidth: 20, textAlign: "center" }}>{num}</span>
        <span className="text-[11px] font-semibold flex-1" style={{ color: hasContent ? "#1a1a1a" : "#ccc" }}>{label}</span>
        {hasContent ? (
          <>
            <span className="text-[10px]" style={{ color: color }}>{items[0]?.slice(0, 50)}{items[0]?.length > 50 ? "…" : ""}</span>
            {open ? <ChevronUp style={{ width: 11, height: 11, color: "#aaa", flexShrink: 0 }} /> : <ChevronDown style={{ width: 11, height: 11, color: "#aaa", flexShrink: 0 }} />}
          </>
        ) : (
          <span className="text-[10px]" style={{ color: "#ccc" }}>Keine Infos aus diesem Dokument</span>
        )}
      </div>
      {open && hasContent && (
        <div className="px-3 pb-2.5 space-y-1" style={{ borderTop: `1px solid ${color}20` }}>
          {items.slice(1).map((item, i) => <p key={i} className="text-[11px]" style={{ color: "#555" }}>{item}</p>)}
          {details.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {details.slice(0, 8).map((d, i) => <p key={i} className="text-[10px]" style={{ color: "#777" }}>{d}</p>)}
              {details.length > 8 && <p className="text-[10px]" style={{ color: "#aaa" }}>+ {details.length - 8} weitere…</p>}
            </div>
          )}
          {note && <p className="text-[9px] mt-1.5 font-medium" style={{ color: color + "aa" }}>{note}</p>}
        </div>
      )}
    </div>
  );
}

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

function DocCard({ doc, analyzing, ocr_status, onAnalyze, onDelete, result }) {
  const [open, setOpen] = useState(false);
  const isAnalyzing = analyzing === doc.id;
  const analyzed = !!result && !result.error;
  const hasError = result?.error;

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
              {ocr_status === "extracting" ? "Extrahiere…" : "KI analysiert…"}
            </span>
          ) : analyzed ? (
            <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-all"
              style={{ background: "rgba(52,199,89,0.08)", color: "#1a7f37", border: "1px solid rgba(52,199,89,0.2)" }}>
              <Check className="w-3 h-3" /> Analysiert
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          ) : hasError ? (
            <button onClick={() => onAnalyze(doc)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded" style={{ background: "rgba(255,59,48,0.08)", color: "#c0392b", border: "1px solid rgba(255,59,48,0.2)" }}>
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          ) : (
            <button onClick={() => onAnalyze(doc)} className="text-[11px] px-2 py-1 rounded transition-all"
              style={{ background: "rgba(0,0,0,0.05)", color: "#555", border: "1px solid rgba(0,0,0,0.1)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}>
              Analysieren
            </button>
          )}
          {doc.file_url && (
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
              className="text-[11px] px-2 py-1 rounded transition-all"
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

          {/* All 10 steps */}
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#aaa" }}>Eingetragene Informationen pro Schritt</p>
          <div className="space-y-1.5">
            <DocResultStep num={1} label="Fallerfassung — Basisdaten" color="#34C759"
              items={[
                result.basisdaten?.gericht && `Gericht: ${result.basisdaten.gericht}`,
                result.basisdaten?.aktenzeichen && `AZ: ${result.basisdaten.aktenzeichen}`,
                result.basisdaten?.rechtsgebiet && `Rechtsgebiet: ${result.basisdaten.rechtsgebiet}`,
                result.basisdaten?.prozessziel && `Prozessziel: ${result.basisdaten.prozessziel}`,
                result.basisdaten?.instanz && `Instanz: ${result.basisdaten.instanz}`,
                result.streitwert && `Streitwert: ${result.streitwert.toLocaleString()} €`,
              ].filter(Boolean)}
              note="→ Tab 1 Basisdaten" />

            <DocResultStep num={2} label="Fallsubstanz" color="#007AFF"
              items={[
                result.argumente?.length && `${result.argumente.length} Argumente (${result.argumente.filter(a=>a.seite==="eigen").length} eigene, ${result.argumente.filter(a=>a.seite==="gegner").length} Gegner)`,
                result.beweise?.length && `${result.beweise.length} Beweise`,
                result.fristen?.length && `${result.fristen.length} Fristen`,
                result.personen?.length && `${result.personen.length} Personen`,
              ].filter(Boolean)}
              details={[
                ...(result.argumente||[]).map(a=>`${a.seite==="gegner"?"⚔":"✓"} ${a.titel}`),
                ...(result.beweise||[]).map(b=>`📎 ${b.titel}`),
                ...(result.fristen||[]).map(f=>`📅 ${f.titel} (${f.datum})`),
                ...(result.personen||[]).map(p=>`👤 ${p.name} — ${p.rolle}`),
              ]}
              note="→ Tab 2 Argumente, Beweise, Fristen, Personen" />

            <DocResultStep num={3} label="Gegneranalyse" color="#FF3B30"
              items={[
                result.schritt3_gegneranalyse?.zusammenfassung,
                result.schritt3_gegneranalyse?.taktiken?.length && `${result.schritt3_gegneranalyse.taktiken.length} Taktiken erkannt`,
                result.schritt3_gegneranalyse?.schwachstellen?.length && `${result.schritt3_gegneranalyse.schwachstellen.length} Schwachstellen`,
              ].filter(Boolean)}
              details={[
                ...(result.schritt3_gegneranalyse?.taktiken||[]).map(t=>`⚔ ${t}`),
                ...(result.schritt3_gegneranalyse?.schwachstellen||[]).map(s=>`⚠ ${s}`),
              ]}
              note="→ Tab 3 Gegner-Profil" />

            <DocResultStep num={4} label="Rechtliche Analyse" color="#FF9500"
              items={[
                result.schritt4_rechtliche_analyse?.zusammenfassung,
                result.schritt4_rechtliche_analyse?.relevante_paragrafen?.length && `${result.schritt4_rechtliche_analyse.relevante_paragrafen.length} Paragrafen`,
                result.schritt4_rechtliche_analyse?.praezedenzfaelle?.length && `${result.schritt4_rechtliche_analyse.praezedenzfaelle.length} Präzedenzfälle`,
              ].filter(Boolean)}
              details={[
                ...(result.schritt4_rechtliche_analyse?.relevante_paragrafen||[]).map(p=>`§ ${p}`),
                ...(result.schritt4_rechtliche_analyse?.praezedenzfaelle||[]).map(p=>`⚖ ${p}`),
                ...(result.schritt4_rechtliche_analyse?.compliance_risiken||[]).map(r=>`⚠ ${r}`),
              ]}
              note="→ Tab 4 Rechtliche Analyse" />

            <DocResultStep num={5} label="Strategie" color="#5856D6"
              items={[
                result.schritt5_strategie?.zusammenfassung,
                result.schritt5_strategie?.empfohlene_strategie,
              ].filter(Boolean)}
              details={[
                ...(result.schritt5_strategie?.staerken||[]).map(s=>`+ ${s}`),
                ...(result.schritt5_strategie?.schwaechen||[]).map(s=>`– ${s}`),
              ]}
              note="→ Tab 5 Strategie & Notizen" />

            <DocResultStep num={6} label="Risiko" color="#FF2D55"
              items={[
                result.schritt6_risiko?.zusammenfassung,
                result.schritt6_risiko?.risiko_level && `Risiko-Level: ${result.schritt6_risiko.risiko_level}`,
              ].filter(Boolean)}
              details={(result.schritt6_risiko?.risiken||[]).map(r=>`⚠ ${r}`)}
              note="→ Tab 6 Risikoanalyse" />

            <DocResultStep num={7} label="Simulation" color="#AF52DE"
              items={[
                result.schritt7_simulation?.zusammenfassung,
                result.schritt7_simulation?.vergleichswert_eur && `Vergleichswert: ${result.schritt7_simulation.vergleichswert_eur.toLocaleString()} €`,
                result.schritt7_simulation?.prognose_einfluss,
              ].filter(Boolean)}
              note="→ Tab 7 Simulation" />

            <DocResultStep num={8} label="Aktion / Schriftsätze" color="#FF9500"
              items={[result.schritt8_aktion?.zusammenfassung].filter(Boolean)}
              details={[
                ...(result.schritt8_aktion?.naechste_schritte||[]).map(s=>`→ ${s}`),
                ...(result.schritt8_aktion?.erforderliche_dokumente||[]).map(d=>`📄 ${d}`),
              ]}
              note="→ Tab 8 Aktion" />

            <DocResultStep num={9} label="Cockpit" color="#00BCD4"
              items={[
                result.schritt9_cockpit?.zusammenfassung,
                result.schritt9_cockpit?.prognose_delta_pct != null && `Prognose-Einfluss: ${result.schritt9_cockpit.prognose_delta_pct > 0 ? "+" : ""}${result.schritt9_cockpit.prognose_delta_pct}%`,
              ].filter(Boolean)}
              note="→ Tab 9 Cockpit" />

            <DocResultStep num={10} label="Abschluss" color="#34C759"
              items={[
                result.schritt10_abschluss?.zusammenfassung,
                result.schritt10_abschluss?.vergleichsempfehlung,
                result.schritt10_abschluss?.prozessziel_erreichbar != null && `Prozessziel erreichbar: ${result.schritt10_abschluss.prozessziel_erreichbar ? "Ja" : "Unklar"}`,
              ].filter(Boolean)}
              note="→ Tab 10 Abschluss" />
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

export default function TabDokumenteAnalyse({ caseId, caseData, onDataImport }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(null);
  const [ocrStatus, setOcrStatus] = useState({});
  const [results, setResults] = useState({});
  const [pendingFiles, setPendingFiles] = useState([]); // { file, name, uploading }
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
    // upload
    setPendingFiles(prev => prev.map(p => p.id === pending.id ? { ...p, uploading: true } : p));
    const uploadRes = await base44.integrations.Core.UploadFile({ file: pending.file });
    const newDoc = await base44.entities.Document.create({
      case_id: caseId,
      title: pending.name,
      file_url: uploadRes.file_url,
      file_type: pending.file.type,
      description: "",
    });
    setPendingFiles(prev => prev.filter(p => p.id !== pending.id));
    await loadDocs();
    await analyzeDocument(newDoc);
  };

  const uploadAllPending = async () => {
    for (const p of pendingFiles) {
      await uploadAndAnalyze(p);
    }
  };

  const analyzeDocument = async (doc) => {
    setAnalyzing(doc.id);
    try {
      // Extract text for docs/PDFs
      let ocrText = "";
      const isExtractable = doc.file_type?.includes("pdf") || doc.file_type?.includes("word") ||
        doc.file_type?.includes("document") || doc.file_type?.includes("text") ||
        doc.file_url?.toLowerCase().match(/\.(pdf|docx|xlsx|csv|txt|pages|numbers)$/);

      if (isExtractable && doc.file_url) {
        setOcrStatus(prev => ({ ...prev, [doc.id]: "extracting" }));
        try {
          const ocrResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: doc.file_url,
            json_schema: { type: "object", properties: { volltext: { type: "string" } } }
          });
          if (ocrResult.status === "success" && ocrResult.output?.volltext) {
            ocrText = ocrResult.output.volltext;
          }
        } catch {}
        setOcrStatus(prev => ({ ...prev, [doc.id]: "done" }));
      }

      const isImage = doc.file_type?.startsWith("image/");
      const isVideo = doc.file_type?.startsWith("video/");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist ein erfahrener Rechtsanwalt auf Senior-Partner-Niveau. Analysiere diese Datei VOLLSTÄNDIG und SYSTEMATISCH für den Fall "${caseData?.fallname || ""}" (Rechtsgebiet: ${caseData?.rechtsgebiet || ""}, Zentrale Rechtsfrage: ${caseData?.zentrale_rechtsfrage || ""}, Prozessziel: ${caseData?.prozessziel || ""}, Gericht: ${caseData?.gericht || ""}).

${ocrText ? `VOLLSTÄNDIGER DOKUMENTTEXT:\n${ocrText.slice(0, 14000)}` : ""}
${isImage ? "WICHTIG: Dies ist ein Foto/Bild. Analysiere: Bildinhalt, erkennbare Personen, Ort, Datum, Beweisrelevanz, visuelle Details die juristisch relevant sein könnten." : ""}
${isVideo ? "WICHTIG: Dies ist ein Video. Analysiere den möglichen Inhalt, Personen, Orte und Beweiswert auf juristische Relevanz." : ""}

DEINE AUFGABE: Befülle ALLE folgenden Bereiche so vollständig wie möglich. Extrahiere ALLES was du aus dem Dokument ableiten kannst. Schreibe für jede Kategorie eine klare Zusammenfassung was konkret aus diesem Dokument entnommen wurde.

=== SCHRITT 1: FALLERFASSUNG (BASISDATEN) ===
Extrahiere: Gericht, Aktenzeichen, Rechtsgebiet, Instanz, Prozessziel, Zentrale Rechtsfrage, Streitwert.

=== SCHRITT 2: FALLSUBSTANZ ===
- Argumente der eigenen Seite (was spricht FÜR unseren Mandanten)
- Argumente der Gegenseite (was spricht GEGEN unseren Mandanten)  
- Beweise: Dokumente, Zeugen, Fotos, Verträge, Schriftstücke die als Beweis dienen
- Fristen und Deadlines mit konkreten Daten
- Beteiligte Personen (Richter, Zeugen, Parteien, Anwälte)

=== SCHRITT 3: GEGNERANALYSE ===
Analysiere: Gegnerische Strategie, erkannte Taktiken, Argumentation der Gegenseite, Schwachstellen des Gegners, Verhalten und Reaktionen der Gegenseite, Gegner-Profil.

=== SCHRITT 4: RECHTLICHE ANALYSE ===
Identifiziere: Relevante Paragrafen, Gesetze, Präzedenzfälle die erwähnt werden, Streitwert, Compliance-Risiken, rechtliche Grundlage der Ansprüche.

=== SCHRITT 5: STRATEGIE ===
Ableitung aus dem Dokument: Empfohlene Prozessstrategie, Verhandlungsposition, Stärken und Schwächen unserer Position, strategische Optionen.

=== SCHRITT 6: RISIKO ===
Identifiziere: Risiken aus dem Dokument, potenzielle Gefahren für unseren Mandanten, Beweisprobleme, Risiken der Gegenseite.

=== SCHRITT 7: SIMULATION ===
Was ergibt das Dokument für Verhandlungsszenarien? Welche Vergleichsmöglichkeiten ergeben sich? Welches Verhandlungsergebnis ist wahrscheinlich?

=== SCHRITT 8: AKTION / SCHRIFTSÄTZE ===
Welche Handlungen sind aufgrund dieses Dokuments erforderlich? Einzureichende Dokumente, nächste Schritte, Antwortfristen.

=== SCHRITT 9: COCKPIT (GESAMTÜBERBLICK) ===
Wie verändert dieses Dokument den Gesamtüberblick des Falls? Prognose-Einfluss positiv/negativ?

=== SCHRITT 10: ABSCHLUSS ===
Wie beeinflusst dieses Dokument das Prozessziel? Prognose-Einfluss auf Erfolgswahrscheinlichkeit? Vergleichswert?

Schreibe bei JEDEM Schritt was konkret aus dem Dokument gewonnen wurde. Wenn nichts vorhanden: leeres Array / leerer String.
Gib NUR valides JSON zurück.`,
        file_urls: doc.file_url ? [doc.file_url] : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            zusammenfassung: { type: "string" },
            basisdaten: {
              type: "object",
              properties: {
                gericht: { type: "string" },
                aktenzeichen: { type: "string" },
                rechtsgebiet: { type: "string" },
                prozessziel: { type: "string" },
                zentrale_rechtsfrage: { type: "string" },
                instanz: { type: "string" },
              }
            },
            streitwert: { type: "number" },
            argumente: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titel: { type: "string" },
                  beschreibung: { type: "string" },
                  seite: { type: "string", enum: ["eigen", "gegner"] },
                  staerke: { type: "number" },
                }
              }
            },
            beweise: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titel: { type: "string" },
                  beschreibung: { type: "string" },
                  typ: { type: "string" },
                  gewicht: { type: "number" },
                }
              }
            },
            fristen: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titel: { type: "string" },
                  datum: { type: "string" },
                  fristtyp: { type: "string" },
                }
              }
            },
            personen: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  rolle: { type: "string" },
                  organisation: { type: "string" },
                }
              }
            },
            schritt3_gegneranalyse: {
              type: "object",
              properties: {
                zusammenfassung: { type: "string" },
                taktiken: { type: "array", items: { type: "string" } },
                schwachstellen: { type: "array", items: { type: "string" } },
                gegner_profil: { type: "string" },
              }
            },
            schritt4_rechtliche_analyse: {
              type: "object",
              properties: {
                zusammenfassung: { type: "string" },
                relevante_paragrafen: { type: "array", items: { type: "string" } },
                praezedenzfaelle: { type: "array", items: { type: "string" } },
                compliance_risiken: { type: "array", items: { type: "string" } },
              }
            },
            schritt5_strategie: {
              type: "object",
              properties: {
                zusammenfassung: { type: "string" },
                empfohlene_strategie: { type: "string" },
                staerken: { type: "array", items: { type: "string" } },
                schwaechen: { type: "array", items: { type: "string" } },
              }
            },
            schritt6_risiko: {
              type: "object",
              properties: {
                zusammenfassung: { type: "string" },
                risiken: { type: "array", items: { type: "string" } },
                risiko_level: { type: "string" },
              }
            },
            schritt7_simulation: {
              type: "object",
              properties: {
                zusammenfassung: { type: "string" },
                vergleichswert_eur: { type: "number" },
                prognose_einfluss: { type: "string" },
              }
            },
            schritt8_aktion: {
              type: "object",
              properties: {
                zusammenfassung: { type: "string" },
                naechste_schritte: { type: "array", items: { type: "string" } },
                erforderliche_dokumente: { type: "array", items: { type: "string" } },
              }
            },
            schritt9_cockpit: {
              type: "object",
              properties: {
                zusammenfassung: { type: "string" },
                prognose_einfluss_positiv: { type: "boolean" },
                prognose_delta_pct: { type: "number" },
              }
            },
            schritt10_abschluss: {
              type: "object",
              properties: {
                zusammenfassung: { type: "string" },
                prozessziel_erreichbar: { type: "boolean" },
                vergleichsempfehlung: { type: "string" },
              }
            },
            informationsluecken: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  schritt: { type: "string" },
                  hinweis: { type: "string" },
                }
              }
            }
          }
        },
        model: "claude_sonnet_4_6"
      });

      // Save doc analysis
      await base44.entities.Document.update(doc.id, {
        ai_summary: result.zusammenfassung || "",
        ai_raw: result,
      });

      // Auto-fill Case basisdaten (Schritt 1) — nur wenn Feld leer
      const bd = result.basisdaten || {};
      const caseUpdate = {};
      if (bd.gericht && !caseData?.gericht) caseUpdate.gericht = bd.gericht;
      if (bd.aktenzeichen && !caseData?.aktenzeichen) caseUpdate.aktenzeichen = bd.aktenzeichen;
      if (bd.rechtsgebiet && !caseData?.rechtsgebiet) caseUpdate.rechtsgebiet = bd.rechtsgebiet;
      if (bd.prozessziel && !caseData?.prozessziel) caseUpdate.prozessziel = bd.prozessziel;
      if (bd.zentrale_rechtsfrage && !caseData?.zentrale_rechtsfrage) caseUpdate.zentrale_rechtsfrage = bd.zentrale_rechtsfrage;
      if (bd.instanz && !caseData?.instanz) caseUpdate.instanz = bd.instanz;
      if (result.streitwert && !caseData?.streitwert) caseUpdate.streitwert = result.streitwert;

      // Schritt 3: Gegneranalyse — befülle gegner_profil
      const g3 = result.schritt3_gegneranalyse;
      if (g3?.zusammenfassung && !caseData?.gegner_profil?.ki_zusammenfassung) {
        caseUpdate.gegner_profil = {
          ...(caseData?.gegner_profil || {}),
          ki_zusammenfassung: g3.zusammenfassung,
          taktiken: g3.taktiken || [],
          schwachstellen: g3.schwachstellen || [],
          profil_text: g3.gegner_profil || "",
        };
      }

      // Schritt 5/6/7/9/10: Notizen & KI-Berater-Result ergänzen
      const notizTeile = [];
      if (result.schritt5_strategie?.empfohlene_strategie) notizTeile.push(`[Strategie aus Dok. "${doc.title}"]: ${result.schritt5_strategie.empfohlene_strategie}`);
      if (result.schritt6_risiko?.zusammenfassung) notizTeile.push(`[Risiko aus Dok. "${doc.title}"]: ${result.schritt6_risiko.zusammenfassung}`);
      if (notizTeile.length > 0) {
        caseUpdate.notes = [(caseData?.notes || ""), ...notizTeile].filter(Boolean).join("\n\n");
      }

      // KI-Berater-Result erweitern
      const existingKi = caseData?.ki_berater_result || {};
      const newKiData = {};
      if (result.schritt7_simulation?.prognose_einfluss) newKiData.simulation_hinweis = result.schritt7_simulation.prognose_einfluss;
      if (result.schritt9_cockpit?.prognose_delta_pct) newKiData.prognose_delta = (existingKi.prognose_delta || 0) + result.schritt9_cockpit.prognose_delta_pct;
      if (result.schritt10_abschluss?.vergleichsempfehlung) newKiData.vergleichsempfehlung = result.schritt10_abschluss.vergleichsempfehlung;
      if (Object.keys(newKiData).length > 0) {
        caseUpdate.ki_berater_result = { ...existingKi, ...newKiData };
      }

      if (Object.keys(caseUpdate).length > 0) {
        await base44.entities.Case.update(caseId, caseUpdate);
      }

      // Schritt 2: Argumente, Beweise, Fristen, Personen anlegen
      for (const arg of result.argumente || []) {
        await base44.entities.Argument.create({
          case_id: caseId, title: arg.titel,
          description: `${arg.beschreibung}\n[KI aus: ${doc.title}]`,
          side: arg.seite || "eigen", strength: arg.staerke || 5, type: "Rechtsargument",
        });
      }
      for (const bew of result.beweise || []) {
        await base44.entities.Evidence.create({
          case_id: caseId, title: bew.titel,
          description: `${bew.beschreibung}\n[KI aus: ${doc.title}]`,
          type: bew.typ, weight: bew.gewicht || 5, source: doc.title,
        });
      }
      for (const frist of result.fristen || []) {
        await base44.entities.Deadline.create({
          case_id: caseId, title: frist.titel, frist_type: frist.fristtyp,
          due_date: frist.datum, side: "Eigene", status: "offen",
        });
      }
      for (const person of result.personen || []) {
        await base44.entities.Person.create({
          case_id: caseId, name: person.name, role: person.rolle, organization: person.organisation,
        });
      }

      setResults(prev => ({ ...prev, [doc.id]: result }));
      onDataImport && onDataImport();
    } catch (error) {
      setResults(prev => ({ ...prev, [doc.id]: { error: error.message } }));
    }
    setAnalyzing(null);
  };

  const analyzeAll = async () => {
    setAnalyzingAll(true);
    for (const doc of docs) {
      if (!results[doc.id]) await analyzeDocument(doc);
    }
    setAnalyzingAll(false);
  };

  const deleteDoc = async (id) => {
    await base44.entities.Document.delete(id);
    loadDocs();
  };

  const sf = { fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" };

  return (
    <div className="space-y-4" style={sf}>
      {/* Drop zone + queue */}
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
          transition: "all 0.15s",
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
                <button onClick={e => { e.stopPropagation(); setPendingFiles([]); }}
                  style={{ color: "#aaa", padding: 2 }}>
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
                <button onClick={e => { e.stopPropagation(); setPendingFiles(prev => prev.filter(x => x.id !== p.id)); }}
                  style={{ color: "#ccc" }}>
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
            {docs.some(d => !results[d.id]) && (
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

      {/* Step coverage legend */}
      <div className="rounded-lg p-3" style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#aaa" }}>11 Analyse-Schritte</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {STEP_LABELS.map((label, i) => {
            const covered = docs.some(d => {
              const r = results[d.id] || d.ai_raw;
              if (!r) return false;
              if (i === 0) return !!(r.basisdaten?.gericht || r.basisdaten?.aktenzeichen || r.basisdaten?.rechtsgebiet);
              if (i === 1) return !!(r.argumente?.length || r.beweise?.length || r.personen?.length || r.fristen?.length);
              if (i === 2) return !!(r.schritt3_gegneranalyse?.zusammenfassung || r.argumente?.some(a => a.seite === "gegner"));
              if (i === 3) return !!(r.schritt4_rechtliche_analyse?.zusammenfassung || r.basisdaten?.rechtsgebiet || r.streitwert);
              if (i === 4) return !!(r.schritt5_strategie?.zusammenfassung);
              if (i === 5) return !!(r.schritt6_risiko?.zusammenfassung);
              if (i === 6) return !!(r.schritt7_simulation?.zusammenfassung);
              if (i === 7) return !!(r.schritt8_aktion?.zusammenfassung);
              if (i === 8) return !!(r.schritt9_cockpit?.zusammenfassung);
              if (i === 9) return !!(r.schritt10_abschluss?.zusammenfassung);
              return !!(r.zusammenfassung);
            });
            return (
              <div key={i} className="flex items-center gap-1.5 py-0.5">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: covered ? "#34C759" : "#ddd", flexShrink: 0 }} />
                <span className="text-[10px]" style={{ color: covered ? "#1a7f37" : "#bbb" }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}