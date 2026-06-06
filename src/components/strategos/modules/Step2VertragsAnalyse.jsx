import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileUp, Sparkles, Trash2, Scale, Shield, FileSearch } from "lucide-react";
import { AppleCard, AppleButton, AppleField, AppleTextarea, SF } from "../AppleCard";
import VisualisierungsPanel from "./VisualisierungsPanel";
import KlauselCard from "./KlauselCard";

export default function Step2VertragsAnalyse({ scenario, onSave }) {
  const ctx = scenario.unternehmenskontext || {};
  const [docs, setDocs] = useState((scenario.unternehmenskontext || {}).dokumente || []);
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [result, setResult] = useState(scenario.ki_analyse?.vertrags_analyse || null);
  const [manuelleNotiz, setManuelleNotiz] = useState(scenario.ki_analyse?.vertrags_notiz || "");

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const up = [];
      for (const f of files) {
        const r = await base44.integrations.Core.UploadFile({ file: f });
        up.push({ name: f.name, url: r.file_url, type: f.name.split(".").pop().toLowerCase(), uploaded_at: new Date().toISOString() });
      }
      const n = [...docs, ...up];
      setDocs(n);
      await onSave({ unternehmenskontext: { ...ctx, dokumente: n } });
    } catch (err) {
      console.error("Upload fehlgeschlagen:", err?.message || err);
      alert("Upload fehlgeschlagen: " + (err?.message || "Bitte nochmals versuchen."));
    }
    setUploading(false);
  };

  const analyseVertrag = async () => {
    setAnalysing(true);
    const doc = selectedDoc || docs[0];
    let r;
    try {
    r = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein Senior-Anwalt einer internationalen Großkanzlei spezialisiert auf Vertragsrecht, AGB-Recht und internationale Vertragsgestaltung. Analysiere diesen Vertrag / dieses Dokument auf drei Dimensionen:

UNTERNEHMENSKONTEXT:
Unternehmen: ${ctx.unternehmen_name || "—"} (${ctx.rechtsform || "—"}, ${ctx.branche || "—"})
Umsatz: ${ctx.umsatz ? (ctx.umsatz/1000000).toFixed(1) + "Mio. " + (ctx.waehrung || "EUR") : "—"}
Gegenpartei: ${ctx.gegner_name || "—"} (${ctx.gegner_rolle || "—"})
Sachverhalt: ${ctx.sachverhalt_lang || "—"}
Dokument: ${doc ? doc.name : "manuell beschrieben"}
Zusätzliche Notizen: ${manuelleNotiz || "—"}

ANALYSEDIMENSIONEN:
1. RISIKOKLASSIFIKATION jeder Klausel: Identifiziere 8-15 wichtige Klauseln. Pro Klausel: klausel_typ, kurzbeschreibung, risiko_stufe(kritisch/hoch/mittel/niedrig/positiv), norm (§ BGB / § HGB / AGB-Recht / etc.), rechtliche_mechanik (wie wirkt sie im Vertragsgefüge?), szenarien (3 Zeithorizonte: kurzfristig bis 6M, mittelfristig 2-5J, langfristig), verhandlungsempfehlung, alternativ_formulierung (wenn nicht unterzeichnet), durchsetzbar (boolean), durchsetzbarkeit.

2. SZENARIOPROJEKTION: Best/Base/Worst Case in 12M, 36M, 5+ Jahren.

3. VERHANDLUNGSPOSITION: Wenn noch nicht unterzeichnet — Priorisierung der Verhandlungspunkte.

Berücksichtige zwingend:
WICHTIGE ANFORDERUNGEN:
- Zeige ALLE relevanten Handlungsoptionen pro Klausel auf (legal und — falls vorhanden — illegal, letztere KLAR als ILLEGAL kennzeichnen)
- Für JEDE Klausel: juristische Vorteile UND Nachteile
- Für JEDES Szenario: konkrete empfohlene_reaktion wenn es eintritt, chancen, risiken
- Keine feste Anzahl Klauseln — so viele wie sinnvoll (8-18)

- §§ 133, 157 BGB (Auslegung nach obj. Empfängerhorizont)
- §§ 305-310 BGB (AGB-Kontrolle)
- §§ 305c BGB (überraschende Klauseln)
- Change-of-Control-Klauseln: mittelbarer Kontrollwechsel
- MAC-Klauseln: enge Auslegung durch BGH
- Wettbewerbsverbote: § 138 BGB, max. 2 Jahre
- Earn-out: Treuepflicht Käufer, Manipulationsrisiko
- Schiedsklauseln: §§ 1029 ff. ZPO, NYK 1958
- Geheimhaltung: § 2 GeschGehG, angemessene Schutzmaßnahmen`,
      response_json_schema: {
        type: "object",
        properties: {
          dokument_typ: { type: "string" },
          parteien: { type: "array", items: { type: "string" } },
          gesamtbewertung: { type: "string" },
          gesamtrisiko: { type: "string" },
          klauseln: { type: "array", items: { type: "object", properties: {
            klausel_typ: { type: "string" },
            kurzbeschreibung: { type: "string" },
            risiko_stufe: { type: "string" },
            norm: { type: "string" },
            rechtliche_mechanik: { type: "string" },
            szenarien: { type: "array", items: { type: "object", properties: {
              horizont: { type: "string" },
              beschreibung: { type: "string" },
              eintrittsbedingung: { type: "string" },
              empfohlene_reaktion: { type: "string" },
              chancen: { type: "string" },
              risiken: { type: "string" }
            }}},
            juristische_vorteile: { type: "array", items: { type: "string" } },
            juristische_nachteile: { type: "array", items: { type: "string" } },
            illegale_umgehung: { type: "string" },
            verhandlungsempfehlung: { type: "string" },
            alternativ_formulierung: { type: "string" },
            durchsetzbar: { type: "boolean" },
            durchsetzbarkeit: { type: "string" }
          }}},
          szenarien_projektion: { type: "object", properties: {
            best_case: { type: "string" },
            base_case: { type: "string" },
            worst_case: { type: "string" }
          }},
          verhandlungs_prioritaeten: { type: "array", items: { type: "object", properties: {
            prioritaet: { type: "number" },
            klausel: { type: "string" },
            massnahme: { type: "string" }
          }}},
          kritische_fristen: { type: "array", items: { type: "object", properties: {
            beschreibung: { type: "string" },
            datum: { type: "string" },
            rechtsfolge: { type: "string" }
          }}}
        }
      },
      file_urls: doc ? [doc.url] : undefined,
      model: "claude_sonnet_4_6"
    });
    setResult(r);
    await onSave({ ki_analyse: { ...(scenario.ki_analyse || {}), vertrags_analyse: r, vertrags_notiz: manuelleNotiz } });
    } catch (err) {
      console.error("Vertragsanalyse fehlgeschlagen:", err?.message || err);
      alert("Analyse fehlgeschlagen: " + (err?.message || "Netzwerkfehler. Bitte erneut versuchen."));
    }
    setAnalysing(false);
  };

  const stats = result?.klauseln ? {
    kritisch: result.klauseln.filter(k => k.risiko_stufe === "kritisch").length,
    hoch: result.klauseln.filter(k => k.risiko_stufe === "hoch").length,
    mittel: result.klauseln.filter(k => k.risiko_stufe === "mittel").length,
    positiv: result.klauseln.filter(k => ["niedrig","positiv"].includes(k.risiko_stufe)).length,
  } : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, ...SF }}>
      <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#0A84FF", letterSpacing: "0.15em", textTransform: "uppercase" }}>Schritt 2 · Strategos</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", marginTop: 4 }}>Vertrags- & Dokumentenanalyse</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Klausel-Risikoklassifikation · Szenarioprojektion · Verhandlungsposition</p>
      </div>

      {/* Dokument-Upload */}
      <AppleCard title="A · Dokument hochladen" accentColor="#0A84FF" action={
        <label style={{ cursor: "pointer" }}>
          <input type="file" multiple accept=".pdf,.docx,.doc,.txt" onChange={handleUpload} style={{ display: "none" }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", fontSize: 12, fontWeight: 600, background: "#0A84FF", color: "#fff", borderRadius: 10, boxShadow: "0 2px 8px rgba(10,132,255,0.3)", cursor: "pointer" }}>
            <Upload style={{ width: 12, height: 12 }} /> {uploading ? "Lädt…" : "Hochladen"}
          </span>
        </label>
      }>
        {docs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 16px", color: "#bbb" }}>
            <FileSearch style={{ width: 28, height: 28, margin: "0 auto 8px", opacity: 0.4 }} />
            <p style={{ fontSize: 12 }}>Vertrag, Term Sheet, Kooperationsvereinbarung, Patent, Behördenschreiben hochladen</p>
            <p style={{ fontSize: 11, marginTop: 4, color: "#ccc" }}>PDF / DOCX / TXT — oder Sachverhalt manuell beschreiben</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {docs.map((d, i) => (
              <div key={i} onClick={() => setSelectedDoc(d)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: selectedDoc?.url === d.url ? "rgba(10,132,255,0.1)" : "rgba(0,0,0,0.03)", border: `1px solid ${selectedDoc?.url === d.url ? "rgba(10,132,255,0.35)" : "rgba(0,0,0,0.07)"}`, borderRadius: 10, cursor: "pointer" }}>
                <FileUp style={{ width: 13, height: 13, color: "#0A84FF", flexShrink: 0 }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</p>
                {selectedDoc?.url === d.url && <span style={{ fontSize: 10, color: "#0A84FF", fontWeight: 700 }}>Ausgewählt</span>}
                <button onClick={e => { e.stopPropagation(); const n = docs.filter((_, j) => j !== i); setDocs(n); onSave({ unternehmenskontext: { ...ctx, dokumente: n } }); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc" }}><Trash2 style={{ width: 12, height: 12 }} /></button>
              </div>
            ))}
          </div>
        )}
      </AppleCard>

      {/* Manuelle Beschreibung */}
      <AppleCard title="B · Manuelle Beschreibung / Klauseln" accentColor="#636366">
        <AppleField label="Beschreibung der Klauseln oder des Vertragsinhalts (optional, ergänzt Dokument)">
          <AppleTextarea rows={4} value={manuelleNotiz} onChange={e => setManuelleNotiz(e.target.value)}
            onBlur={() => onSave({ ki_analyse: { ...(scenario.ki_analyse || {}), vertrags_notiz: manuelleNotiz } })}
            placeholder="z.B. Vertrag enthält eine Change-of-Control-Klausel mit 30-Tage-Kündigungsrecht. Earn-out über 3 Jahre an EBITDA gekoppelt. Wettbewerbsverbot 3 Jahre nach Beendigung ohne Karenzentschädigung..." />
        </AppleField>
      </AppleCard>

      {/* Analyse starten */}
      <AppleCard accentColor="#0A84FF">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>KI-Vertragsanalyse</p>
            <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
              {docs.length > 0 ? `${docs.length} Dokument(e) · ` : "Kein Dokument — "}
              Klausel-Risikoklassifikation · Szenarioprojektion · Verhandlungsposition
            </p>
          </div>
          <AppleButton onClick={analyseVertrag} disabled={analysing} variant="primary" icon={Sparkles}>
            {analysing ? "Analysiert…" : result ? "Neu analysieren" : "Jetzt analysieren"}
          </AppleButton>
        </div>
      </AppleCard>

      {/* Ergebnis */}
      {result && (
        <>
          {/* Gesamtübersicht */}
          <AppleCard title="Analyse-Ergebnis" accentColor={stats?.kritisch > 0 ? "#B81C3A" : "#1DB954"}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
              <div>
                {result.dokument_typ && <p style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Dokument: <strong>{result.dokument_typ}</strong>{result.parteien?.length > 0 ? ` · ${result.parteien.join(" vs. ")}` : ""}</p>}
                <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.5 }}>{result.gesamtbewertung}</p>
              </div>
              {stats && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, minWidth: 160 }}>
                  {[["Kritisch", stats.kritisch, "#B81C3A"], ["Hoch", stats.hoch, "#FF9500"], ["Mittel", stats.mittel, "#0A84FF"], ["Positiv", stats.positiv, "#1DB954"]].map(([l, v, c]) => (
                    <div key={l} style={{ padding: "8px 10px", background: `${c}10`, borderRadius: 10, textAlign: "center" }}>
                      <p style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</p>
                      <p style={{ fontSize: 9, color: c, fontWeight: 700, textTransform: "uppercase" }}>{l}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AppleCard>

          {/* Klauseln */}
          {result.klauseln?.length > 0 && (
            <AppleCard title={`Klausel-Analyse (${result.klauseln.length})`} accentColor="#B81C3A">
              {result.klauseln
                .sort((a, b) => ["kritisch","hoch","mittel","niedrig","positiv"].indexOf(a.risiko_stufe) - ["kritisch","hoch","mittel","niedrig","positiv"].indexOf(b.risiko_stufe))
                .map((k, i) => <KlauselCard key={i} k={k} idx={i} />)}
            </AppleCard>
          )}

          {/* Szenario-Projektion */}
          {result.szenarien_projektion && (
            <AppleCard title="Szenario-Projektion" accentColor="#0A84FF">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[["Best Case", result.szenarien_projektion.best_case, "#1DB954"], ["Base Case", result.szenarien_projektion.base_case, "#0A84FF"], ["Worst Case", result.szenarien_projektion.worst_case, "#B81C3A"]].map(([l, v, c]) => v && (
                  <div key={l} style={{ padding: "10px 13px", background: `${c}08`, border: `1px solid ${c}20`, borderRadius: 11 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: c, textTransform: "uppercase", marginBottom: 4 }}>{l}</p>
                    <p style={{ fontSize: 12, color: "#333" }}>{v}</p>
                  </div>
                ))}
              </div>
            </AppleCard>
          )}

          {/* Verhandlungsprioritäten */}
          {result.verhandlungs_prioritaeten?.length > 0 && (
            <AppleCard title="Verhandlungsprioritäten (vor Unterzeichnung)" accentColor="#1DB954">
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {result.verhandlungs_prioritaeten.sort((a,b) => a.prioritaet - b.prioritaet).map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 11px", background: "rgba(0,0,0,0.025)", borderRadius: 9 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: i === 0 ? "#B81C3A" : i === 1 ? "#FF9500" : "#0A84FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>{p.prioritaet}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{p.klausel}</p>
                      <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{p.massnahme}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AppleCard>
          )}

          {/* Kritische Fristen */}
          {result.kritische_fristen?.length > 0 && (
            <AppleCard title="Kritische Fristen" accentColor="#FF9500">
              {result.kritische_fristen.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "8px 11px", background: "rgba(255,149,0,0.06)", borderRadius: 9, marginBottom: 6 }}>
                  <Scale style={{ width: 14, height: 14, color: "#FF9500", flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{f.beschreibung}</p>
                    {f.datum && <p style={{ fontSize: 11, color: "#FF9500", fontWeight: 700, marginTop: 2 }}>📅 {f.datum}</p>}
                    {f.rechtsfolge && <p style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{f.rechtsfolge}</p>}
                  </div>
                </div>
              ))}
            </AppleCard>
          )}

          {/* ── VISUALISIERUNGSSYSTEM (6 Formate aus Konzeptpapier) ── */}
          <VisualisierungsPanel result={result} scenario={scenario} />
        </>
      )}
    </div>
  );
}