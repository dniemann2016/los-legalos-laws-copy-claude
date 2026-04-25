import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Sparkles, FileUp, Trash2, CheckCircle, Loader, ChevronRight, Brain } from "lucide-react";
import { SF } from "./AppleCard";

// ─────────────────────────────────────────────────────────────────────────────
// Step 0 — Dokumenten-Intelligenz & KI-Basis-Briefing
// Nimmt beliebige Dokumente entgegen, analysiert sie mit KI und befüllt
// automatisch alle leeren Felder im Szenario (unternehmenskontext, ausgangslage,
// fragestellung, szenario_typ, rechtsgebiet, ki_kontext als shared KI-Basis).
// ─────────────────────────────────────────────────────────────────────────────

const ACCEPTED = ".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.xlsx,.csv,.eml,.msg";

function FileRow({ doc, onRemove }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 11,
      padding: "10px 14px",
      background: doc.status === "done" ? "rgba(29,185,84,0.06)" : "rgba(88,86,214,0.05)",
      border: `1px solid ${doc.status === "done" ? "rgba(29,185,84,0.2)" : "rgba(88,86,214,0.15)"}`,
      borderRadius: 12, marginBottom: 6,
    }}>
      <FileUp style={{ width: 15, height: 15, color: doc.status === "done" ? "#1DB954" : "#5856D6", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</p>
        {doc.status === "done" && doc.summary && (
          <p style={{ fontSize: 10, color: "#5856D6", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.summary}</p>
        )}
        {doc.status === "uploading" && <p style={{ fontSize: 10, color: "#888", marginTop: 1 }}>Lädt hoch…</p>}
        {doc.status === "analyzing" && <p style={{ fontSize: 10, color: "#FF9500", marginTop: 1 }}>KI analysiert…</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {doc.status === "done" && <CheckCircle style={{ width: 14, height: 14, color: "#1DB954" }} />}
        {(doc.status === "uploading" || doc.status === "analyzing") && (
          <Loader style={{ width: 14, height: 14, color: "#888", animation: "spin 1s linear infinite" }} />
        )}
        <button onClick={() => onRemove(doc.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 2 }}>
          <Trash2 style={{ width: 12, height: 12 }} />
        </button>
      </div>
    </div>
  );
}

function FieldRow({ label, value, filled }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <div style={{ width: 120, flexShrink: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>{label}</p>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, color: filled ? "#1a1a1a" : "#bbb" }}>{value}</p>
      </div>
      {filled && <CheckCircle style={{ width: 13, height: 13, color: "#1DB954", flexShrink: 0, marginTop: 1 }} />}
    </div>
  );
}

export default function Step0DocIntelligenz({ scenario, onSave, onProceed }) {
  const [docs, setDocs] = useState(scenario.ki_kontext?.docs || []);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(scenario.ki_kontext?.analyse || null);
  const [done, setDone] = useState(!!scenario.ki_kontext?.analyse);
  const inputRef = useRef();

  const ctx = scenario.unternehmenskontext || {};

  // ── Upload & sofort-Analyse ──────────────────────────────────────────────
  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);

    const newDocs = [];
    for (const f of files) {
      const tempId = Math.random().toString(36).slice(2);
      const pending = { id: tempId, name: f.name, status: "uploading", url: null, summary: null };
      setDocs(prev => [...prev, pending]);

      const r = await base44.integrations.Core.UploadFile({ file: f });
      const uploaded = { ...pending, url: r.file_url, status: "analyzing" };
      setDocs(prev => prev.map(d => d.id === tempId ? uploaded : d));

      newDocs.push(uploaded);
    }

    setUploading(false);

    // Kurz-Zusammenfassung pro Dokument
    const summarized = [];
    for (const doc of newDocs) {
      const s = await base44.integrations.Core.InvokeLLM({
        prompt: `Fasse dieses Dokument in max. 1 Satz zusammen: Name des Dokuments, Typ, worum geht es?`,
        file_urls: [doc.url],
        response_json_schema: { type: "object", properties: { summary: { type: "string" }, doc_typ: { type: "string" } } }
      });
      const done = { ...doc, status: "done", summary: s.summary || doc.name, doc_typ: s.doc_typ };
      setDocs(prev => prev.map(d => d.id === doc.id ? done : d));
      summarized.push(done);
    }

    // Persist docs
    const allDocs = [...docs.filter(d => !newDocs.find(n => n.id === d.id)), ...summarized];
    setDocs(allDocs);
    await onSave({ ki_kontext: { ...(scenario.ki_kontext || {}), docs: allDocs } });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const removeDoc = async (id) => {
    const updated = docs.filter(d => d.id !== id);
    setDocs(updated);
    await onSave({ ki_kontext: { ...(scenario.ki_kontext || {}), docs: updated } });
    if (updated.length === 0) { setResult(null); setDone(false); }
  };

  // ── Haupt-KI-Analyse ────────────────────────────────────────────────────
  const runAnalysis = async () => {
    if (!docs.length) return;
    setAnalyzing(true);

    const fileUrls = docs.filter(d => d.url).map(d => d.url);
    const docList = docs.map(d => `${d.name}${d.summary ? ` (${d.summary})` : ""}`).join("\n");

    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist der intelligenteste strategische Assistent einer Großkanzlei. Du erhältst ein oder mehrere Dokumente und extrahierst daraus alle relevanten Informationen für eine vollständige strategische Unternehmensanalyse.

Dokumente:
${docList}

DEINE AUFGABE:
Extrahiere aus den Dokumenten präzise die folgenden Felder — falls eine Information NICHT aus dem Dokument entnehmbar ist, lasse das Feld leer (kein Raten!).

1. UNTERNEHMENSKONTEXT:
   - unternehmen_name: Name des Unternehmens/Mandanten
   - rechtsform: GmbH, AG, etc.
   - branche: Branche
   - umsatz: Jahresumsatz als Zahl (nur wenn konkret erwähnt)
   - mitarbeiter: Anzahl Mitarbeiter (nur wenn konkret erwähnt)
   - hauptsitz_land, hauptsitz_stadt
   - gegner_name: Name der Gegenpartei
   - gegner_rolle: kunde/lieferant/wettbewerber/behoerde/investor/mitarbeiter
   - sachverhalt_lang: Vollständige Beschreibung des Sachverhalts aus dem Dokument (AUSFÜHRLICH — alle Details)
   - zeitkritikalitaet: 1-10 (wie dringend ist die Situation?)

2. SZENARIO:
   - szenario_typ: fusion_uebernahme/patentverletzung/steueroptimierung/compliance_risiko/kartellrecht/arbeitsrecht/strafrecht/vertragsbruch/insolvenz/markenrecht/datenschutz/sonstiges
   - rechtsgebiet: Hauptrechtsgebiet (Freitext)
   - fragestellung: Was ist die zentrale strategische Frage aus diesem Dokument?
   - ausgangslage: Kurze Zusammenfassung der Ausgangslage

3. KI-BASIS-BRIEFING (wird an ALLE nachfolgenden KI-Module weitergegeben):
   - ki_briefing: Ausführliches strategisches Briefing (mind. 300 Wörter) das alle nachfolgenden KI-Analysen informiert. Enthält: Parteien, Sachverhalt, rechtliche Kernpunkte, bekannte Zahlen/Fristen/Paragraphen, Ziel des Mandanten, besondere Risiken, zeitkritische Faktoren.
   - empfohlene_rechtsgebiete: Array der relevanten Rechtsgebiete-Keys aus dieser Liste: [patentrecht, urheberrecht, markenrecht, kartellrecht_gwb, eu_wettbewerbsrecht, vertragsrecht_buergerliches_recht, handelsrecht, gesellschaftsrecht, arbeitsrecht, steuerrecht, steuerstrafrecht, datenschutz_dsgvo, compliance_ordnungswidrigkeiten, strafrecht_wirtschaftsstrafrecht, insolvenzrecht, vergaberecht, regulierungsrecht, internationales_privatrecht, schiedsverfahren]
   - schluessel_fakten: Array von konkreten Fakten aus dem Dokument (Zahlen, Daten, Paragraphen, Namen)
   - zeitachse: Array von Ereignissen mit datum und beschreibung (chronologisch)
   - parteien: Array von Parteien mit name und rolle
   - kritische_fristen: Array von Fristen mit datum und beschreibung
   - gesamtrisiko_einschaetzung: 1-10

Extrahiere NUR was explizit aus dem Dokument hervorgeht. Kein Raten, keine Erfindungen.`,
      file_urls: fileUrls,
      response_json_schema: {
        type: "object",
        properties: {
          unternehmen_name: { type: "string" },
          rechtsform: { type: "string" },
          branche: { type: "string" },
          umsatz: { type: "number" },
          mitarbeiter: { type: "number" },
          hauptsitz_land: { type: "string" },
          hauptsitz_stadt: { type: "string" },
          gegner_name: { type: "string" },
          gegner_rolle: { type: "string" },
          sachverhalt_lang: { type: "string" },
          zeitkritikalitaet: { type: "number" },
          szenario_typ: { type: "string" },
          rechtsgebiet: { type: "string" },
          fragestellung: { type: "string" },
          ausgangslage: { type: "string" },
          ki_briefing: { type: "string" },
          empfohlene_rechtsgebiete: { type: "array", items: { type: "string" } },
          schluessel_fakten: { type: "array", items: { type: "string" } },
          zeitachse: { type: "array", items: { type: "object", properties: { datum: { type: "string" }, beschreibung: { type: "string" } } } },
          parteien: { type: "array", items: { type: "object", properties: { name: { type: "string" }, rolle: { type: "string" } } } },
          kritische_fristen: { type: "array", items: { type: "object", properties: { datum: { type: "string" }, beschreibung: { type: "string" } } } },
          gesamtrisiko_einschaetzung: { type: "number" },
        }
      },
      model: "claude_sonnet_4_6"
    });

    setResult(r);

    // ── Felder automatisch befüllen (nur wenn leer) ──────────────────────
    const newCtx = { ...ctx };
    if (r.unternehmen_name && !ctx.unternehmen_name) newCtx.unternehmen_name = r.unternehmen_name;
    if (r.rechtsform && !ctx.rechtsform) newCtx.rechtsform = r.rechtsform;
    if (r.branche && !ctx.branche) newCtx.branche = r.branche;
    if (r.umsatz && !ctx.umsatz) newCtx.umsatz = r.umsatz;
    if (r.mitarbeiter && !ctx.mitarbeiter) newCtx.mitarbeiter = r.mitarbeiter;
    if (r.hauptsitz_land && !ctx.hauptsitz_land) newCtx.hauptsitz_land = r.hauptsitz_land;
    if (r.hauptsitz_stadt && !ctx.hauptsitz_stadt) newCtx.hauptsitz_stadt = r.hauptsitz_stadt;
    if (r.gegner_name && !ctx.gegner_name) newCtx.gegner_name = r.gegner_name;
    if (r.gegner_rolle && !ctx.gegner_rolle) newCtx.gegner_rolle = r.gegner_rolle;
    if (r.sachverhalt_lang && !ctx.sachverhalt_lang) newCtx.sachverhalt_lang = r.sachverhalt_lang;
    if (r.zeitkritikalitaet && !ctx.zeitkritikalitaet) newCtx.zeitkritikalitaet = r.zeitkritikalitaet;
    if (r.empfohlene_rechtsgebiete?.length) newCtx.rechtsgebiete = r.empfohlene_rechtsgebiete;

    // Dokumente aus der Analyse ebenfalls in unternehmenskontext übernehmen
    newCtx.dokumente = docs.filter(d => d.url).map(d => ({ name: d.name, url: d.url, type: d.doc_typ || d.name.split(".").pop(), uploaded_at: new Date().toISOString() }));

    const patch = {
      unternehmenskontext: newCtx,
      ki_kontext: {
        docs,
        analyse: r,
        ki_briefing: r.ki_briefing,
        schluessel_fakten: r.schluessel_fakten,
        zeitachse: r.zeitachse,
        parteien: r.parteien,
        kritische_fristen: r.kritische_fristen,
      },
    };

    // Szenario-Felder befüllen
    if (r.szenario_typ && !scenario.szenario_typ) patch.szenario_typ = r.szenario_typ;
    if (r.rechtsgebiet && !scenario.rechtsgebiet) patch.rechtsgebiet = r.rechtsgebiet;
    if (r.fragestellung && !scenario.fragestellung) patch.fragestellung = r.fragestellung;
    if (r.ausgangslage && !scenario.ausgangslage) patch.ausgangslage = r.ausgangslage;

    await onSave(patch);
    setDone(true);
    setAnalyzing(false);
  };

  const riskColor = (v) => v >= 8 ? "#FF3B30" : v >= 5 ? "#FF9500" : "#34C759";
  const readyDocs = docs.filter(d => d.status === "done");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, ...SF }}>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", background: "linear-gradient(135deg, #5856D6, #0A84FF)", borderRadius: 30, marginBottom: 12 }}>
          <Brain style={{ width: 14, height: 14, color: "#fff" }} />
          <p style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.12em", textTransform: "uppercase" }}>Strategos · Dokumenten-Intelligenz</p>
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.6px", marginTop: 2 }}>Dokumente hochladen & KI briefen</h2>
        <p style={{ fontSize: 13, color: "#888", marginTop: 6, maxWidth: 480, margin: "6px auto 0" }}>
          Laden Sie alle relevanten Unterlagen hoch. Die KI extrahiert alle Informationen und versorgt automatisch jeden nachfolgenden Analyse-Schritt mit dem nötigen Kontext.
        </p>
      </div>

      {/* Drop-Zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: "2px dashed rgba(88,86,214,0.35)",
          borderRadius: 18,
          padding: "32px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: "rgba(88,86,214,0.03)",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(88,86,214,0.07)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(88,86,214,0.03)"}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} onChange={e => handleFiles(Array.from(e.target.files))} style={{ display: "none" }} />
        <Upload style={{ width: 32, height: 32, color: "#5856D6", margin: "0 auto 10px", opacity: 0.7 }} />
        <p style={{ fontSize: 13, fontWeight: 700, color: "#5856D6" }}>Dateien hierher ziehen oder klicken</p>
        <p style={{ fontSize: 11, color: "#aaa", marginTop: 5 }}>PDF · DOCX · TXT · JPG · PNG · XLSX · EML — beliebig viele</p>
      </div>

      {/* Dateiliste */}
      {docs.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.88)", borderRadius: 18, border: "1px solid rgba(0,0,0,0.06)", padding: "16px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {docs.length} Dokument{docs.length !== 1 ? "e" : ""} · {readyDocs.length} bereit
            </p>
            {readyDocs.length > 0 && !done && (
              <button onClick={runAnalysis} disabled={analyzing} style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "9px 18px", fontSize: 12, fontWeight: 700,
                background: analyzing ? "#ccc" : "linear-gradient(135deg, #5856D6, #0A84FF)",
                color: "#fff", border: "none", borderRadius: 10, cursor: analyzing ? "not-allowed" : "pointer",
                boxShadow: analyzing ? "none" : "0 3px 12px rgba(88,86,214,0.4)",
              }}>
                {analyzing ? <><Loader style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> KI analysiert…</> : <><Sparkles style={{ width: 13, height: 13 }} /> Jetzt KI-Analyse starten</>}
              </button>
            )}
            {done && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#1DB954" }}>
                <CheckCircle style={{ width: 13, height: 13 }} /> Analyse abgeschlossen
              </span>
            )}
          </div>
          {docs.map(d => <FileRow key={d.id} doc={d} onRemove={removeDoc} />)}
          {done && readyDocs.length > 0 && (
            <button onClick={runAnalysis} disabled={analyzing} style={{
              marginTop: 8, width: "100%", padding: "7px", fontSize: 11, fontWeight: 600,
              background: "rgba(88,86,214,0.07)", color: "#5856D6", border: "1px solid rgba(88,86,214,0.2)",
              borderRadius: 9, cursor: "pointer",
            }}>
              ↺ Neu analysieren (weitere Dokumente hinzugefügt)
            </button>
          )}
        </div>
      )}

      {/* Ergebnis */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Risiko-Badge & Überblick */}
          <div style={{ background: "rgba(255,255,255,0.88)", borderRadius: 18, border: "1px solid rgba(0,0,0,0.06)", padding: "18px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.07em" }}>KI-Analyse · Ergebnis</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginTop: 4 }}>
                  {result.unternehmen_name || scenario.title} {result.rechtsform ? `(${result.rechtsform})` : ""}
                </p>
                {result.gegner_name && <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>vs. {result.gegner_name}{result.gegner_rolle ? ` · ${result.gegner_rolle}` : ""}</p>}
              </div>
              {result.gesamtrisiko_einschaetzung && (
                <div style={{ textAlign: "center", padding: "12px 18px", background: `${riskColor(result.gesamtrisiko_einschaetzung)}12`, border: `1px solid ${riskColor(result.gesamtrisiko_einschaetzung)}30`, borderRadius: 14 }}>
                  <p style={{ fontSize: 26, fontWeight: 800, color: riskColor(result.gesamtrisiko_einschaetzung) }}>{result.gesamtrisiko_einschaetzung}/10</p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: riskColor(result.gesamtrisiko_einschaetzung), textTransform: "uppercase" }}>Gesamtrisiko</p>
                </div>
              )}
            </div>

            {/* Automatisch befüllte Felder */}
            <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Automatisch extrahiert & befüllt</p>
            <FieldRow label="Unternehmen" value={result.unternehmen_name} filled={!!result.unternehmen_name} />
            <FieldRow label="Branche" value={result.branche} filled={!!result.branche} />
            <FieldRow label="Hauptsitz" value={[result.hauptsitz_stadt, result.hauptsitz_land].filter(Boolean).join(", ")} filled={!!(result.hauptsitz_stadt || result.hauptsitz_land)} />
            <FieldRow label="Umsatz" value={result.umsatz ? `${result.umsatz.toLocaleString()} ${ctx.waehrung || "€"}` : null} filled={!!result.umsatz} />
            <FieldRow label="Gegenpartei" value={result.gegner_name} filled={!!result.gegner_name} />
            <FieldRow label="Szenario-Typ" value={result.szenario_typ} filled={!!result.szenario_typ} />
            <FieldRow label="Rechtsgebiet" value={result.rechtsgebiet} filled={!!result.rechtsgebiet} />
            <FieldRow label="Zeitkritikalität" value={result.zeitkritikalitaet ? `${result.zeitkritikalitaet}/10` : null} filled={!!result.zeitkritikalitaet} />
          </div>

          {/* KI-Briefing */}
          {result.ki_briefing && (
            <div style={{ background: "linear-gradient(135deg, rgba(88,86,214,0.06), rgba(10,132,255,0.04))", borderRadius: 18, border: "1px solid rgba(88,86,214,0.15)", padding: "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Brain style={{ width: 16, height: 16, color: "#5856D6" }} />
                <p style={{ fontSize: 11, fontWeight: 700, color: "#5856D6", textTransform: "uppercase", letterSpacing: "0.07em" }}>KI-Basis-Briefing (an alle nachfolgenden Module)</p>
              </div>
              <p style={{ fontSize: 12, color: "#333", lineHeight: 1.7 }}>{result.ki_briefing}</p>
            </div>
          )}

          {/* Schlüsselfakten */}
          {result.schluessel_fakten?.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.88)", borderRadius: 18, border: "1px solid rgba(0,0,0,0.06)", padding: "16px 22px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Schlüssel-Fakten aus Dokumenten</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {result.schluessel_fakten.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 13, color: "#0A84FF", flexShrink: 0, marginTop: 1 }}>→</span>
                    <p style={{ fontSize: 12, color: "#333" }}>{f}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zeitachse + Fristen nebeneinander */}
          {(result.zeitachse?.length > 0 || result.kritische_fristen?.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {result.zeitachse?.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.88)", borderRadius: 18, border: "1px solid rgba(0,0,0,0.06)", padding: "16px 20px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Zeitachse</p>
                  {result.zeitachse.map((e, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0A84FF", flexShrink: 0, marginTop: 5 }} />
                      <div>
                        {e.datum && <p style={{ fontSize: 10, fontWeight: 700, color: "#0A84FF" }}>{e.datum}</p>}
                        <p style={{ fontSize: 11, color: "#333" }}>{e.beschreibung}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {result.kritische_fristen?.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.88)", borderRadius: 18, border: "1px solid rgba(255,59,48,0.15)", padding: "16px 20px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#FF3B30", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Kritische Fristen</p>
                  {result.kritische_fristen.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FF3B30", flexShrink: 0, marginTop: 5 }} />
                      <div>
                        {f.datum && <p style={{ fontSize: 10, fontWeight: 700, color: "#FF3B30" }}>{f.datum}</p>}
                        <p style={{ fontSize: 11, color: "#333" }}>{f.beschreibung}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Parteien */}
          {result.parteien?.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.88)", borderRadius: 18, border: "1px solid rgba(0,0,0,0.06)", padding: "16px 22px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Beteiligte Parteien</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.parteien.map((p, i) => (
                  <div key={i} style={{ padding: "7px 13px", background: "rgba(10,132,255,0.07)", border: "1px solid rgba(10,132,255,0.15)", borderRadius: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#0A84FF" }}>{p.name}</p>
                    {p.rolle && <p style={{ fontSize: 10, color: "#888" }}>{p.rolle}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empfohlene Rechtsgebiete */}
          {result.empfohlene_rechtsgebiete?.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.88)", borderRadius: 18, border: "1px solid rgba(52,199,89,0.2)", padding: "16px 22px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#34C759", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Empfohlene Rechtsgebiete (in Schritt 1 vorausgewählt)</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {result.empfohlene_rechtsgebiete.map((rg, i) => (
                  <span key={i} style={{ padding: "5px 11px", background: "rgba(52,199,89,0.1)", border: "1px solid rgba(52,199,89,0.25)", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "#1DB954" }}>
                    {rg}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sachverhalt */}
          {result.sachverhalt_lang && (
            <div style={{ background: "rgba(255,255,255,0.88)", borderRadius: 18, border: "1px solid rgba(0,0,0,0.06)", padding: "16px 22px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Extrahierter Sachverhalt</p>
              <p style={{ fontSize: 12, color: "#333", lineHeight: 1.7 }}>{result.sachverhalt_lang}</p>
            </div>
          )}

          {/* Weiter-Button */}
          <button onClick={onProceed} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "16px 20px",
            background: "linear-gradient(135deg, #1DB954, #34C759)",
            color: "#fff", border: "none", borderRadius: 14, cursor: "pointer", fontWeight: 700, fontSize: 14,
            boxShadow: "0 4px 20px rgba(29,185,84,0.35)",
          }}>
            Zu Schritt 1 — KI hat alle Infos <ChevronRight style={{ width: 18, height: 18 }} />
          </button>
        </div>
      )}

      {/* Leerzustand ohne Dokumente */}
      {docs.length === 0 && (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <p style={{ fontSize: 12, color: "#aaa" }}>Keine Dokumente? Kein Problem — Sie können Strategos auch vollständig manuell befüllen.</p>
          <button onClick={onProceed} style={{
            marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 22px", fontSize: 12, fontWeight: 600,
            background: "rgba(0,0,0,0.06)", color: "#555", border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 10, cursor: "pointer",
          }}>
            Manuell starten — Schritt 1 <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}