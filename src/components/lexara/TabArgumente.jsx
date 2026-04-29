import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Upload, X, RefreshCw, Trash2, ChevronDown, ChevronUp, Sparkles, Pencil, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKIProtokoll } from "@/hooks/useKIProtokoll";

function ScoreBar({ value, max = 10, color = "bg-green-500" }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${((value || 0) / max) * 100}%` }} />
    </div>
  );
}

function ArgCard({ arg, onDelete, onSave, onKiWeight }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: arg.title, description: arg.description || "", side: arg.side || "eigen", type: arg.type || "Rechtsargument", strength: arg.strength || 5, zeitpunkt: arg.zeitpunkt || "", anmerkungen: arg.anmerkungen || "", paragraphs: arg.paragraphs || [] });
  const [newPara, setNewPara] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [kiWeighting, setKiWeighting] = useState(false);

  const discrepancy = arg.ki_strength !== undefined && arg.ki_strength !== null
    ? Math.abs((arg.strength || 5) - arg.ki_strength)
    : 0;
  const hasDiscrepancy = discrepancy >= 2;

  const save = async () => {
    await base44.entities.Argument.update(arg.id, { ...form, zeitpunkt: form.zeitpunkt || null, anmerkungen: form.anmerkungen || null });
    setEditing(false);
    onSave();
  };

  const addParagraph = () => {
    if (!newPara.trim()) return;
    setForm(f => ({ ...f, paragraphs: [...(f.paragraphs || []), newPara.trim()] }));
    setNewPara("");
  };

  const removeParagraph = (i) => {
    setForm(f => ({ ...f, paragraphs: (f.paragraphs || []).filter((_, j) => j !== i) }));
  };

  const kiWeight = async () => {
    setKiWeighting(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener Rechtsanwalt. Bewerte die Stärke dieses Rechtsarguments im deutschen Zivilprozess.\nArgument: "${arg.title}"\nBeschreibung: "${arg.description || ""}"\nTyp: ${arg.type || "Rechtsargument"}, Seite: ${arg.side || "eigen"}\n\nGib eine Stärke (0-10) UND eine kurze juristische Begründung (2-3 Sätze) zurück.`,
      response_json_schema: {
        type: "object",
        properties: {
          staerke: { type: "number", minimum: 0, maximum: 10 },
          begruendung: { type: "string" }
        }
      }
    });
    if (result && result.staerke !== undefined) {
      await base44.entities.Argument.update(arg.id, {
        ki_strength: Math.min(10, Math.max(0, result.staerke)),
        ki_reasoning: result.begruendung || ""
      });
      onSave();
    }
    setKiWeighting(false);
  };

  const analyzeDiscrepancy = async () => {
    setAnalyzing(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Analysiere die Diskrepanz zwischen manueller und KI-Bewertung dieses Rechtsarguments:\n\nArgument: "${arg.title}"\nBeschreibung: "${arg.description || ""}"\nManuelle Stärke: ${arg.strength || 5}/10\nKI-Stärke: ${arg.ki_strength}/10\nDiskrepanz: ${discrepancy.toFixed(1)} Punkte\n\nErkläre warum die Bewertungen abweichen und mache 3 konkrete Verbesserungsvorschläge, um das Argument zu stärken.`,
      response_json_schema: {
        type: "object",
        properties: {
          erklaerung: { type: "string" },
          vorschlaege: { type: "array", items: { type: "string" } }
        }
      }
    });
    setAnalysis(res);
    setAnalyzing(false);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-all">
      {editing ? (
        <div className="space-y-2">
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Titel *" />
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Beschreibung" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Zeitpunkt der Argumentation</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white" value={form.zeitpunkt} onChange={e => setForm({ ...form, zeitpunkt: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Anmerkungen (Risiken / Vorteile)</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white" placeholder="z.B. Beweis fehlt noch, starkes Argument..." value={form.anmerkungen} onChange={e => setForm({ ...form, anmerkungen: e.target.value })} />
            </div>
          </div>
          {/* Paragraphen im Edit-Modus */}
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Paragraphen / Normen</label>
            <div className="flex gap-1 mb-1 flex-wrap">
              {(form.paragraphs || []).map((p, i) => (
                <span key={i} className="flex items-center gap-1 text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">
                  {p}
                  <button onClick={() => removeParagraph(i)} className="text-blue-400 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white" placeholder="z.B. § 280 BGB" value={newPara} onChange={e => setNewPara(e.target.value)} onKeyDown={e => e.key === "Enter" && addParagraph()} />
              <button onClick={addParagraph} className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+</button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white" value={form.side} onChange={e => setForm({ ...form, side: e.target.value })}>
              <option value="eigen">Eigen</option><option value="gegner">Gegner</option>
            </select>
            <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option>Rechtsargument</option><option>Tatsachenargument</option><option>Widerspruch</option><option>Druckmittel</option>
            </select>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Stärke:</span>
              <input type="number" min={0} max={10} step={0.5} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-16 bg-white" value={form.strength} onChange={e => setForm({ ...form, strength: +e.target.value })} />
            </div>
            <Button size="sm" onClick={save} className="bg-gray-900 text-white rounded-lg text-xs gap-1"><Check className="w-3 h-3" /> Speichern</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="rounded-lg text-xs">Abbrechen</Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${arg.side === "eigen" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
                  {arg.side === "eigen" ? "Eigen" : "Gegner"}
                </span>
                {arg.type && <span className="text-[10px] text-gray-400">{arg.type}</span>}
                {hasDiscrepancy && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> Δ {discrepancy.toFixed(1)}
                  </span>
                )}
              </div>
              <h4 className="font-medium text-gray-900 text-sm">{arg.title}</h4>
              {arg.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{arg.description}</p>}
              <div className="flex flex-wrap gap-3 mt-1">
                {arg.zeitpunkt && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">🗓 {new Date(arg.zeitpunkt).toLocaleDateString("de-DE")}</span>
                )}
                {arg.anmerkungen && (
                  <span className="text-[10px] text-amber-600 flex items-center gap-1">📝 {arg.anmerkungen}</span>
                )}
              </div>

              {/* Score comparison */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 w-20 flex-shrink-0">Manuell</span>
                  <div className="flex-1"><ScoreBar value={arg.strength || 5} color="bg-blue-500" /></div>
                  <span className="text-xs font-semibold text-blue-600 w-8 text-right">{arg.strength || 5}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 w-20 flex-shrink-0">KI-Stärke</span>
                  <div className="flex-1">
                    {arg.ki_strength !== undefined && arg.ki_strength !== null
                      ? <ScoreBar value={arg.ki_strength} color="bg-violet-500" />
                      : <div className="w-full h-1.5 bg-gray-100 rounded-full" />}
                  </div>
                  <span className="text-xs font-semibold text-violet-600 w-8 text-right">
                    {arg.ki_strength !== undefined && arg.ki_strength !== null ? arg.ki_strength : "–"}
                  </span>
                </div>
              </div>

              {(arg.paragraphs && arg.paragraphs.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {arg.paragraphs.map((p, i) => (
                    <span key={i} className="text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">{p}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <button onClick={kiWeight} disabled={kiWeighting}
                  className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-800 border border-violet-200 rounded px-1.5 py-0.5 disabled:opacity-40">
                  {kiWeighting ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                  KI bewerten
                </button>
                {hasDiscrepancy && (
                  <button onClick={analyzeDiscrepancy} disabled={analyzing}
                    className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-800 border border-amber-200 rounded px-1.5 py-0.5 disabled:opacity-40">
                    {analyzing ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                    Diskrepanz analysieren
                  </button>
                )}
              </div>

              {analysis && (
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-amber-800">{analysis.erklaerung}</p>
                  {(analysis.vorschlaege || []).map((v, i) => (
                    <div key={i} className="flex gap-2 text-xs text-gray-700">
                      <span className="text-amber-500 font-bold flex-shrink-0">{i + 1}.</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setEditing(true)} className="text-gray-300 hover:text-blue-500 p-1"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => onDelete(arg.id)} className="text-gray-300 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TabArgumente({ caseId, caseData, onCountChange }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newArg, setNewArg] = useState({ title: "", description: "", side: "eigen", strength: 5, type: "Rechtsargument", zeitpunkt: "", anmerkungen: "" });
  const [extractError, setExtractError] = useState(null);
  const [batchRating, setBatchRating] = useState(false);
  const [kiGenerating, setKiGenerating] = useState(false);
  const [kiGenResult, setKiGenResult] = useState(null);
  const { logKI } = useKIProtokoll(caseId);
  const [showExtraction, setShowExtraction] = useState(false);
  const [extractMode, setExtractMode] = useState("ki");
  const [dsgvo, setDsgvo] = useState(false);
  const [files, setFiles] = useState([]);
  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { loadAll(); }, [caseId]);

  const loadAll = async (notify = false) => {
    const [args, evs] = await Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId })
    ]);
    setArgs(args);
    setEvidence(evs);
    if (notify) onCountChange && onCountChange();
  };

  const load = loadAll;

  const handleExtract = async () => {
    if (extractMode === "ki" && !dsgvo) { setExtractError("Bitte DSGVO-Hinweis akzeptieren"); return; }
    if (!files.length && !text.trim()) { setExtractError("Dokument oder Text erforderlich"); return; }
    setExtracting(true);
    setExtractError(null);
    try {
      let fileUrls = [];
      if (files.length > 0) {
        const uploads = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f })));
        fileUrls = uploads.map(r => r.file_url);
      }
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist ein erfahrener Rechtsanwalt. Analysiere diese Dokumente gründlich und extrahiere:
1. EIGENE ARGUMENTE (welche Vertragsklauseln unterstützen unsere Position?)
2. GEGENSEITE-ARGUMENTE (was könnte der Gegner argumentieren?)
3. BEWEISE (konkrete Klauseln, Unterschriften, Daten aus dem Vertrag - dies sind die Belege!)
4. Für JEDES Argument: Welche Beweise aus Punkt 3 unterstützen es?

Fallkontext: ${caseData?.fallname || ""} | ${caseData?.rechtsgebiet || ""}
Rechtsfrage: ${caseData?.zentrale_rechtsfrage || ""}
${!fileUrls.length ? "TEXT: " + text : ""}`,
        file_urls: fileUrls.length ? fileUrls : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            zusammenfassung: { type: "string" },
            beweise: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titel: { type: "string" },
                  beschreibung: { type: "string" },
                  typ: { type: "string", enum: ["Klausel", "Unterschrift", "Daten", "Dokument", "Sonstiges"] },
                  gewicht: { type: "number", minimum: 1, maximum: 10 }
                },
                required: ["titel"]
              }
            },
            eigene_argumente: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titel: { type: "string" },
                  beschreibung: { type: "string" },
                  typ: { type: "string" },
                  staerke: { type: "number" },
                  verlinkte_beweise: { type: "array", items: { type: "string" }, description: "Titel der Beweise die dieses Argument stützen" },
                  paragraphen: { type: "array", items: { type: "string" } }
                },
                required: ["titel"]
              }
            },
            gegenseite_argumente: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titel: { type: "string" },
                  beschreibung: { type: "string" },
                  typ: { type: "string" },
                  staerke: { type: "number" },
                  verlinkte_beweise: { type: "array", items: { type: "string" } }
                },
                required: ["titel"]
              }
            },
            widersprueche: { type: "array", items: { type: "object", properties: { titel: { type: "string" }, staerke: { type: "number" } }, required: ["titel"] } },
            relevante_paragraphen: { type: "array", items: { type: "string" } }
          },
          required: ["beweise", "eigene_argumente"]
        }
      });
      if (!result) { setExtractError("KI-Analyse fehlgeschlagen. Bitte erneut versuchen."); setExtracting(false); return; }
      setExtracted(result);

      // Protokollieren
      await logKI({
        kiName: "Argument-Extraktion",
        eingabe: text || `Dokumente: ${files.map(f => f.name).join(", ")}`,
        ausgabe: result,
        dokumente: files.map(f => f.name),
        modell: "standard"
      });

      setFiles([]);
      setText("");
    } catch (error) {
      setExtractError("Fehler bei der Analyse: " + (error?.message || "Unbekannter Fehler"));
    } finally {
      setExtracting(false);
    }
  }

  const takeAll = async () => {
    if (!extracted) return;
    const all = [...(extracted.eigene_argumente || []).map(a => ({ ...a, side: "eigen" })), ...(extracted.gegenseite_argumente || []).map(a => ({ ...a, side: "gegner" }))];
    
    // Erstelle Beweise aus dem Dokument
    const evidenceMap = {};
    if (extracted.beweise && Array.isArray(extracted.beweise)) {
      for (const ev of extracted.beweise) {
        const evEntity = await base44.entities.Evidence.create({
          case_id: caseId,
          title: ev.titel || "Beweis",
          description: ev.beschreibung || "",
          type: ev.typ || "Dokument",
          source: "Vertrag",
          weight: ev.gewicht || 5
        });
        if (evEntity?.id) {
          evidenceMap[ev.titel] = evEntity.id;
        }
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    // Erstelle Argumente und verlinke Beweise
    for (const a of all) {
      const linkedEvidenceIds = (a.verlinkte_beweise || []).map(eb => evidenceMap[eb]).filter(Boolean);
      await base44.entities.Argument.create({
        case_id: caseId,
        title: a.titel,
        description: a.beschreibung || "",
        side: a.side,
        strength: a.staerke || 5,
        type: "Rechtsargument",
        paragraphs: a.paragraphen || [],
        evidence_ids: linkedEvidenceIds
      });
      await new Promise(r => setTimeout(r, 500));
    }
    setExtracted(null);
    loadAll(true);
  };

  const take = async (a, side) => {
    await base44.entities.Argument.create({
      case_id: caseId,
      title: a.titel,
      description: a.beschreibung || "",
      side,
      strength: a.staerke || 5,
      type: "Rechtsargument",
      paragraphs: a.paragraphen || [],
    });
    loadAll(true);
  };

  const rateBatch = async () => {
    if (args.length === 0) return;
    setBatchRating(true);
    try {
      const prompt = `Du bist ein erfahrener Rechtsanwalt. Bewerte die Stärke dieser Argumente und gib für JEDES eine kurze Begründung (1-2 Sätze).

Fall: ${caseData?.fallname || ""}
Rechtsgebiet: ${caseData?.rechtsgebiet || ""}
Zentrale Frage: ${caseData?.zentrale_rechtsfrage || ""}

${args.map((a, i) => `${i + 1}. [${a.side === "eigen" ? "EIGEN" : "GEGNER"}] ${a.title}\nBeschreibung: ${a.description || "-"}\nVerknüpfte Beweise: ${a.evidence_ids && a.evidence_ids.length > 0 ? evidence.filter(e => a.evidence_ids.includes(e.id)).map(e => e.title).join(", ") : "-"}`).join("\n\n")}

Gib für jedes Argument ein JSON mit Stärke (0-10) und Begründung (unter Berücksichtigung der Beweise).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            bewertungen: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer" },
                  staerke: { type: "number", minimum: 0, maximum: 10 },
                  begruendung: { type: "string" }
                },
                required: ["index", "staerke", "begruendung"]
              }
            }
          },
          required: ["bewertungen"]
        },
        model: "gemini_3_flash"
      });

      // Update alle Argumente
      if (result && result.bewertungen) {
        for (const bew of result.bewertungen) {
          if (args[bew.index]) {
            await base44.entities.Argument.update(args[bew.index].id, {
              ki_strength: Math.min(10, Math.max(0, bew.staerke)),
              ki_reasoning: bew.begruendung
            });
          }
        }
      }
      await loadAll(true);

      // Protokollieren
      await logKI({
        kiName: "Argument-Batch-Bewertung",
        eingabe: `Bewertung von ${args.length} Argumenten für Fall: ${caseData?.fallname || caseId}`,
        ausgabe: result,
        modell: "gemini_3_flash"
      });
    } catch (error) {
      console.error("Batch-Bewertung fehler:", error);
      setExtractError("Fehler bei Batch-Bewertung");
    } finally {
      setBatchRating(false);
    }
  };

  const generateKiArgumente = async () => {
    setKiGenerating(true);
    setKiGenResult(null);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener Rechtsanwalt. Führe eine UMFASSENDE juristische Gesamtanalyse durch für folgenden Fall:

WICHTIG — VALIDIERUNG & DUPLIKAT-ERKENNUNG:
- Prüfe alle generierten Argumente/Beweise auf Duplikate und Überschneidungen
- Erkenne wenn etwas logisch falsch, widersprüchlich oder fehl am Platz ist
- Benachrichtige wenn Qualitätsprobleme gefunden werden (vor der Rückgabe)

Fall: ${caseData?.fallname || ""}
Rechtsgebiet: ${caseData?.rechtsgebiet || ""}
Zentrale Rechtsfrage: ${caseData?.zentrale_rechtsfrage || ""}
Prozessziel: ${caseData?.prozessziel || ""}
Instanz: ${caseData?.instanz || ""}
Gericht: ${caseData?.gericht || ""}

AUFGABE 1 — DIREKT FALLRELEVANTE PARAGRAPHEN (ALS BEWEISE):
Identifiziere ALLE Paragraphen die DIREKT und UNMITTELBAR mit dem Kern des Falls zu tun haben — mindestens 20-30 §§ sofern diese als Beweise geeignet sind, ansonsten auch weniger, aber wenn vorhanden dann 20-30 §.
NICHT aufnehmen: generische Backup-Normen, theoretisch anwendbare aber tangentiale Bestimmungen, oder Normen die nur als sekundäre Optionen relevant sind (z.B. bei Straffall: Schadensersatz-Normen sind keine Kern-Beweise, sondern nur Folge-Optionen).
Ziel: Umfassend ALLE fallentscheidenden Paragraphen sammeln, nicht nur die Top 5. Für jede Norm: Paragraph, Gesetz, Kurztitel, kurze direkte Relevanz (1-2 Sätze).

AUFGABE 2 — EIGENE ARGUMENTE:
Generiere MINDESTENS 50-100 starke eigene Argumente basierend auf den identifizierten Normen und Beweisen — sofern tauglich als Beweise, sonst weniger. Für jedes: Titel, Beschreibung (2-3 Sätze), Stärke 1-10.

AUFGABE 3 — GEGNERARGUMENTE:
Generiere MINDESTENS 30-50 zu erwartende Gegenargumente — sofern tauglich als Beweise, sonst weniger. Für jedes: Titel, Beschreibung (2-3 Sätze), Stärke 1-10.

AUFGABE 4 — ALLE POTENZIELLEN BEWEISE (umfassend — mindestens 50):
Identifiziere ALLE möglichen Beweise für diesen Fall — mindestens 50 wenn vorhanden, sonst weniger:
- Dokumente (Verträge, Briefe, E-Mails, Rechnungen, Notarakte, Abrechnungen, etc.)
- Personen/Zeugen (wer kann aussagen und zu was?)
- Gegenstände/physische Beweise
- Daten, Aufzeichnungen, Protokolle, Zeitstempel
- Gutachten, Sachverständigenbefunde
- Rechtsnormen & Gerichtsentscheidungen (als Beweise)
- Verhaltensmuster, Zugeständnisse, Parteiverhalten
- Negative Beweise (fehlende Handlungen, unterlassene Mitteilungen)
Für JEDEN Beweis: Titel, Typ, ausführliche Beschreibung, geschätztes Gewicht (1-10).

AUFGABE 5 — ARGUMENTE DIE SELBST BEWEISE SIND:
Identifiziere Argumente/Positionen die gleichzeitig als Beweismittel fungieren (z.B. Zugeständnisse, dokumentierte Aussagen, Parteiverhalten). Titel, Beschreibung, Gewicht.

WICHTIG: Falls Fallkontext unvollständig: gib leere Arrays zurück + Grund in "keine_argumente_begruendung".`,
      response_json_schema: {
        type: "object",
        properties: {
          alle_relevanten_paragraphen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                paragraph: { type: "string" },
                gesetz: { type: "string" },
                titel: { type: "string" },
                relevanz: { type: "string" }
              }
            }
          },
          eigene_argumente: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                beschreibung: { type: "string" },
                staerke: { type: "number" }
              }
            }
          },
          gegner_argumente: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                beschreibung: { type: "string" },
                staerke: { type: "number" }
              }
            }
          },
          alle_potenziellen_beweise: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                typ: { type: "string" },
                beschreibung: { type: "string" },
                gewicht: { type: "number", minimum: 1, maximum: 10 }
              }
            }
          },
          argumente_als_beweise: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                beschreibung: { type: "string" },
                gewicht: { type: "number", minimum: 1, maximum: 10 }
              }
            }
          },
          keine_argumente_begruendung: { type: "string" }
        }
      }
    });
    setKiGenResult(result);
    setKiGenerating(false);
  };

  const takeKiArg = async (a, side) => {
    if (!a.titel || !a.titel.trim()) return;
    await base44.entities.Argument.create({
      case_id: caseId,
      title: a.titel.trim(),
      description: a.beschreibung || "",
      side,
      strength: a.staerke || 5,
      type: "Rechtsargument",
      paragraphs: a.paragraphen || [],
      evidence_ids: []
    });
    loadAll(true);
  };

  const takeAllKiArgumente = async () => {
    if (!kiGenResult) return;
    const all = [
      ...(kiGenResult.eigene_argumente || []).map(a => ({ ...a, side: "eigen" })),
      ...(kiGenResult.gegner_argumente || []).map(a => ({ ...a, side: "gegner" }))
    ].filter(a => a.titel && a.titel.trim());
    
    for (const a of all) {
      await base44.entities.Argument.create({
        case_id: caseId,
        title: a.titel.trim(),
        description: a.beschreibung || "",
        side: a.side,
        strength: a.staerke || 5,
        type: "Rechtsargument",
        paragraphs: a.paragraphen || [],
        evidence_ids: []
      });
      await new Promise(r => setTimeout(r, 500));
    }
    setKiGenResult(null);
    loadAll(true);
  };

  const addManual = async () => {
    if (!newArg.title.trim()) return;
    await base44.entities.Argument.create({ case_id: caseId, ...newArg });
    setNewArg({ title: "", description: "", side: "eigen", strength: 5, type: "Rechtsargument" });
    setShowAdd(false);
    load(true);
  };

  const del = async (id) => { await base44.entities.Argument.delete(id); load(true); };
  const filtered = args.filter(a => filter === "all" || a.side === filter);

  const linkedEvidenceForArg = (argId) => {
    const arg = args.find(a => a.id === argId);
    if (!arg || !arg.evidence_ids) return [];
    return evidence.filter(e => arg.evidence_ids.includes(e.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {[["all", "Alle"], ["eigen", "Eigene"], ["gegner", "Gegner"]].map(([f, l]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs border transition-all ${filter === f ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>{l}</button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={rateBatch} disabled={batchRating || args.length === 0} className="bg-violet-600 text-white rounded-xl text-xs gap-1">
            {batchRating ? "Bewerte..." : "⭐ Alle bewerten"}
          </Button>
          <Button size="sm" onClick={generateKiArgumente} disabled={kiGenerating} className="bg-emerald-700 text-white rounded-xl text-xs gap-1">
            {kiGenerating ? <><RefreshCw className="w-3 h-3 animate-spin" /> KI generiert…</> : <><Sparkles className="w-3 h-3" /> Von KI hinzufügen</>}
          </Button>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-gray-900 text-white rounded-xl text-xs gap-1">
            <Plus className="w-3 h-3" /> Argument
          </Button>
        </div>
      </div>

      {kiGenResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-900">✨ KI-generierte Argumente</p>
            <div className="flex gap-2">
              {((kiGenResult.eigene_argumente || []).length > 0 || (kiGenResult.gegner_argumente || []).length > 0) && (
                <Button size="sm" onClick={takeAllKiArgumente} className="bg-emerald-700 text-white text-xs gap-1">
                  <Check className="w-3 h-3" /> Alle übernehmen
                </Button>
              )}
              <button onClick={() => setKiGenResult(null)} className="text-emerald-500 hover:text-emerald-700 text-xs">Verwerfen</button>
            </div>
          </div>
          {kiGenResult.keine_argumente_begruendung && (kiGenResult.eigene_argumente || []).length === 0 && (kiGenResult.gegner_argumente || []).length === 0 && (
           <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
             <p className="text-xs text-amber-800">⚠️ {kiGenResult.keine_argumente_begruendung}</p>
           </div>
          )}
          {(kiGenResult.alle_relevanten_paragraphen || []).length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-purple-900 mb-2">⚖️ Alle relevanten Rechtsnormen ({kiGenResult.alle_relevanten_paragraphen.length})</p>
              <div className="grid grid-cols-2 gap-2">
                {kiGenResult.alle_relevanten_paragraphen.map((para, i) => (
                  <div key={i} className="text-[10px] bg-white rounded px-2 py-1.5 border border-purple-100">
                    <p className="font-mono font-semibold text-purple-700">{para.paragraph} {para.gesetz}</p>
                    {para.titel && <p className="text-gray-800 text-[9px] mt-0.5">{para.titel}</p>}
                    {para.relevanz && <p className="text-gray-600 text-[9px] mt-0.5">{para.relevanz}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {(kiGenResult.alle_potenziellen_beweise || []).length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-900 mb-2">📋 Alle potenziellen Beweise ({kiGenResult.alle_potenziellen_beweise.length})</p>
              <div className="grid grid-cols-2 gap-2">
                {kiGenResult.alle_potenziellen_beweise.map((bew, i) => (
                  <div key={i} className="text-[10px] bg-white rounded px-2 py-1.5 border border-blue-100">
                    <p className="font-semibold text-gray-800">{bew.titel}</p>
                    <p className="text-gray-600 mt-0.5">{bew.typ} · Gewicht {bew.gewicht}/10</p>
                    {bew.beschreibung && <p className="text-gray-500 text-[9px] mt-0.5 line-clamp-2">{bew.beschreibung}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {(kiGenResult.argumente_als_beweise || []).length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-900 mb-2">🎯 Argumente die selbst Beweise sind ({kiGenResult.argumente_als_beweise.length})</p>
              <div className="grid grid-cols-2 gap-2">
                {kiGenResult.argumente_als_beweise.map((arg, i) => (
                  <div key={i} className="text-[10px] bg-white rounded px-2 py-1.5 border border-green-100">
                    <p className="font-semibold text-gray-800">{arg.titel}</p>
                    <p className="text-gray-600 mt-0.5">Gewicht {arg.gewicht}/10</p>
                    {arg.beschreibung && <p className="text-gray-500 text-[9px] mt-0.5 line-clamp-2">{arg.beschreibung}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {[["EIGENE ARGUMENTE", kiGenResult.eigene_argumente || [], "eigen"], ["GEGNERARGUMENTE", kiGenResult.gegner_argumente || [], "gegner"]].map(([label, items, side]) => (
              <div key={side}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label} · {items.length}</p>
                {items.map((a, i) => (
                  <div key={i} className="mb-2 bg-white rounded-lg border border-gray-100 p-2 text-xs">
                    <div className="flex items-start gap-1">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{a.titel}</p>
                        {a.beschreibung && <p className="text-gray-500 mt-0.5 text-[10px]">{a.beschreibung}</p>}
                        {(a.paragraphen || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {a.paragraphen.map((p, pi) => (
                              <span key={pi} className="text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">{p}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-gray-400">{a.staerke}/10</span>
                        <button onClick={() => takeKiArg(a, side)} className="text-[9px] border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50 whitespace-nowrap">Übernehmen</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Titel *" value={newArg.title} onChange={e => setNewArg({ ...newArg, title: e.target.value })} />
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Beschreibung" rows={2} value={newArg.description} onChange={e => setNewArg({ ...newArg, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Zeitpunkt der Argumentation</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white" value={newArg.zeitpunkt} onChange={e => setNewArg({ ...newArg, zeitpunkt: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Anmerkungen (Risiken / Vorteile)</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white" placeholder="z.B. Beweis fehlt noch..." value={newArg.anmerkungen} onChange={e => setNewArg({ ...newArg, anmerkungen: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={newArg.side} onChange={e => setNewArg({ ...newArg, side: e.target.value })}>
              <option value="eigen">Eigen</option><option value="gegner">Gegner</option>
            </select>
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={newArg.type} onChange={e => setNewArg({ ...newArg, type: e.target.value })}>
              <option>Rechtsargument</option><option>Tatsachenargument</option><option>Widerspruch</option><option>Druckmittel</option>
            </select>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Stärke:</span>
              <input type="number" min={0} max={10} step={0.5} className="border border-gray-200 rounded-lg px-2 py-2 text-xs w-16 bg-white" value={newArg.strength} onChange={e => setNewArg({ ...newArg, strength: +e.target.value })} />
            </div>
            <Button size="sm" onClick={addManual} className="bg-gray-900 text-white rounded-lg text-xs">Hinzufügen</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="rounded-lg text-xs">Abbrechen</Button>
          </div>
        </div>
      )}

      {/* Extraction */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <button onClick={() => setShowExtraction(!showExtraction)}
          className="w-full px-4 py-3 flex items-center gap-2 text-sm font-medium hover:bg-gray-50">
          <span>👑 Argument-Extraktion</span>
          <span className="ml-auto text-gray-400 text-xs">Dokumente & Texte analysieren</span>
          {showExtraction ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showExtraction && (
          <div className="p-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-400">Modus:</span>
              {[["algo", "🔧 Algorithmus"], ["ki", "👑 KI"]].map(([m, l]) => (
                <button key={m} onClick={() => setExtractMode(m)} className={`px-3 py-1 rounded-lg ${extractMode === m ? "bg-gray-100 font-medium" : "text-gray-400"}`}>{l}</button>
              ))}
            </div>
            {extractMode === "ki" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                <p className="font-medium">🔒 DSGVO-Hinweis (Art. 13, 28 DSGVO)</p>
                <ul className="space-y-0.5 text-gray-600">
                  <li>• Dokumente werden <strong>ausschließlich zur Analyse</strong> verarbeitet und <strong>sofort nach Extraktion gelöscht</strong></li>
                  <li>• Es erfolgt <strong>keine dauerhafte Speicherung</strong> der Originaldokumente</li>
                  <li>• <strong>Keine Weitergabe</strong> an Dritte – Daten werden nicht für KI-Training verwendet</li>
                </ul>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={dsgvo} onChange={e => setDsgvo(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <span className="text-blue-600 font-medium">Ich habe den DSGVO-Hinweis gelesen und stimme der Verarbeitung zu</span>
                </label>
                <p className="text-amber-600">⚠️ KI-Vorschläge – müssen juristisch geprüft werden</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.csv,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff" multiple className="hidden" onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
            <div>
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                <Upload className="w-4 h-4" /> Dokumente hochladen <span className="text-gray-400 text-xs">PDF, DOCX, TXT, CSV, JPG, PNG · mehrere möglich</span>
              </button>
              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      📄 {f.name} ({Math.round(f.size / 1024)}KB)
                      <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[70px]" placeholder="Oder Text manuell einfügen..." value={text} onChange={e => setText(e.target.value)} />
            <Button onClick={handleExtract} disabled={extracting} className="w-full bg-blue-600 text-white hover:bg-blue-700 gap-2 text-sm">
              {extracting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analysiere...</> : "🔄 Analysieren"}
            </Button>
            {extractError && <p className="text-xs text-red-500 mt-2">⚠️ {extractError}</p>}
            {extracted && (
              <div className="space-y-4 mt-2">
                {extracted.zusammenfassung && <p className="text-xs text-gray-600 italic border-l-2 border-gray-300 pl-3">{extracted.zusammenfassung}</p>}
                <div className="flex justify-end">
                  <Button size="sm" onClick={takeAll} className="bg-green-700 text-white hover:bg-green-800 text-xs">✓ Alle übernehmen</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[["EIGENE ARGUMENTE", extracted.eigene_argumente || [], "eigen"], ["GEGENSEITE", extracted.gegenseite_argumente || [], "gegner"]].map(([label, items, side]) => (
                    <div key={side}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label} · {items.length}</p>
                      {items.map((a, i) => (
                        <div key={i} className="mb-2 text-xs">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-medium text-gray-800 flex-1">{a.titel}</span>
                            <span className="text-gray-400">{a.staerke || 5}/10</span>
                            <button onClick={() => take(a, side)} className="text-[10px] border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50">Übernehmen</button>
                          </div>
                          {a.typ && <p className="text-gray-400">{a.typ}</p>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(arg => {
          const linkedEv = linkedEvidenceForArg(arg.id);
          return (
            <div key={arg.id}>
              <ArgCard arg={arg} onDelete={del} onSave={() => loadAll()} onKiWeight={arg} />
              {arg.ki_reasoning && (
                <div className="ml-0 mt-2 bg-violet-50 border border-violet-100 rounded-lg p-3 text-xs">
                  <p className="font-semibold text-violet-900 mb-1">KI-Begründung (Stärke {arg.ki_strength}/10):</p>
                  <p className="text-violet-700">{arg.ki_reasoning}</p>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-10">
            Noch keine Argumente. Fügen Sie manuell hinzu oder extrahieren Sie aus einem Dokument.
          </div>
        )}
      </div>
    </div>
  );
}