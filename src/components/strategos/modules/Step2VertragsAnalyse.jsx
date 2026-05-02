import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileUp, Sparkles, Trash2, AlertTriangle, CheckCircle, MinusCircle, Scale, Shield, FileSearch, BarChart3 } from "lucide-react";
import { AppleCard, AppleButton, ApplePill, AppleField, AppleTextarea, SF } from "../AppleCard";
import KlauselHeatmap from "../visualisierung/KlauselHeatmap";
import WirkungsBaum from "../visualisierung/WirkungsBaum";
import ZeitachseSzenarien from "../visualisierung/ZeitachseSzenarien";
import OptionenCards from "../visualisierung/OptionenCards";
import ChancenRisikoQuadrant from "../visualisierung/ChancenRisikoQuadrant";
import KlauselVergleich from "../visualisierung/KlauselVergleich";

const RISIKO_FARBEN = {
  kritisch: { bg: "rgba(184,28,58,0.08)", border: "rgba(184,28,58,0.25)", text: "#B81C3A", icon: AlertTriangle },
  hoch:     { bg: "rgba(255,149,0,0.08)", border: "rgba(255,149,0,0.25)", text: "#FF9500", icon: AlertTriangle },
  mittel:   { bg: "rgba(10,132,255,0.06)", border: "rgba(10,132,255,0.2)", text: "#0A84FF", icon: MinusCircle },
  niedrig:  { bg: "rgba(29,185,84,0.07)", border: "rgba(29,185,84,0.2)", text: "#1DB954", icon: CheckCircle },
  positiv:  { bg: "rgba(29,185,84,0.07)", border: "rgba(29,185,84,0.2)", text: "#1DB954", icon: CheckCircle },
};

function KlauselCard({ k, idx }) {
  const [open, setOpen] = useState(false);
  const cfg = RISIKO_FARBEN[k.risiko_stufe] || RISIKO_FARBEN.mittel;
  const Icon = cfg.icon;
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 8 }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "11px 14px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Icon style={{ width: 15, height: 15, color: cfg.text, flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{k.klausel_typ || `Klausel ${idx + 1}`}</span>
            <ApplePill color={cfg.text}>{k.risiko_stufe || "mittel"}</ApplePill>
            {k.norm && <span style={{ fontSize: 10, fontFamily: "monospace", color: "#666", background: "rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: 5 }}>{k.norm}</span>}
          </div>
          <p style={{ fontSize: 11, color: "#555", marginTop: 4, lineHeight: 1.4 }}>{k.kurzbeschreibung}</p>
        </div>
        <span style={{ fontSize: 14, color: "#bbb", flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "0 14px 13px", borderTop: `1px solid ${cfg.border}` }}>
          {k.rechtliche_mechanik && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 4 }}>Rechtliche Mechanik</p>
              <p style={{ fontSize: 12, color: "#333", lineHeight: 1.5 }}>{k.rechtliche_mechanik}</p>
            </div>
          )}
          {(k.juristische_vorteile?.length > 0 || k.juristische_nachteile?.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              {k.juristische_vorteile?.length > 0 && (
                <div style={{ padding: "7px 10px", background: "rgba(29,185,84,0.07)", borderRadius: 8 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#1DB954", textTransform: "uppercase", marginBottom: 4 }}>Juristische Vorteile</p>
                  {k.juristische_vorteile.map((v, i) => <p key={i} style={{ fontSize: 10, color: "#333", marginBottom: 2 }}>+ {v}</p>)}
                </div>
              )}
              {k.juristische_nachteile?.length > 0 && (
                <div style={{ padding: "7px 10px", background: "rgba(184,28,58,0.07)", borderRadius: 8 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#B81C3A", textTransform: "uppercase", marginBottom: 4 }}>Juristische Nachteile</p>
                  {k.juristische_nachteile.map((v, i) => <p key={i} style={{ fontSize: 10, color: "#333", marginBottom: 2 }}>− {v}</p>)}
                </div>
              )}
            </div>
          )}
          {k.illegale_umgehung && (
            <div style={{ marginTop: 10, padding: "9px 12px", background: "rgba(184,28,58,0.08)", border: "2px solid rgba(184,28,58,0.4)", borderRadius: 9 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "#B81C3A", textTransform: "uppercase", marginBottom: 4 }}>⚠ ILLEGALE UMGEHUNGSMÖGLICHKEIT — NUR ZUR INFORMATION</p>
              <p style={{ fontSize: 11, color: "#B81C3A" }}>{k.illegale_umgehung}</p>
            </div>
          )}
          {k.szenarien?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 5 }}>Szenario-Projektionen & Reaktionsempfehlungen</p>
              {k.szenarien.map((s, i) => (
                <div key={i} style={{ padding: "7px 10px", background: "rgba(0,0,0,0.03)", borderRadius: 8, marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.horizont === "kurzfristig" ? "#FF3B30" : s.horizont === "mittelfristig" ? "#FF9500" : "#34C759", textTransform: "uppercase" }}>{s.horizont}</span>
                    {s.eintrittsbedingung && <span style={{ fontSize: 10, color: "#888" }}>→ wenn: {s.eintrittsbedingung}</span>}
                  </div>
                  <p style={{ fontSize: 11, color: "#333", marginBottom: s.empfohlene_reaktion ? 4 : 0 }}>{s.beschreibung}</p>
                  {s.empfohlene_reaktion && (
                    <div style={{ padding: "4px 8px", background: "rgba(29,185,84,0.08)", borderRadius: 6, borderLeft: "2px solid #1DB954" }}>
                      <p style={{ fontSize: 10, color: "#1DB954", fontWeight: 600 }}>Empfohlene Reaktion: {s.empfohlene_reaktion}</p>
                    </div>
                  )}
                  {s.chancen && <p style={{ fontSize: 10, color: "#1DB954", marginTop: 3 }}>+ {s.chancen}</p>}
                  {s.risiken && <p style={{ fontSize: 10, color: "#B81C3A", marginTop: 2 }}>− {s.risiken}</p>}
                </div>
              ))}
            </div>
          )}
          {k.verhandlungsempfehlung && (
            <div style={{ marginTop: 10, padding: "8px 11px", background: "rgba(29,185,84,0.08)", borderRadius: 9, borderLeft: "3px solid #1DB954" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#1DB954", textTransform: "uppercase", marginBottom: 3 }}>Verhandlungsempfehlung</p>
              <p style={{ fontSize: 11, color: "#333" }}>{k.verhandlungsempfehlung}</p>
              {k.alternativ_formulierung && (
                <div style={{ marginTop: 6, padding: "6px 9px", background: "rgba(255,255,255,0.7)", borderRadius: 7, fontFamily: "monospace", fontSize: 11, color: "#1DB954" }}>
                  📝 {k.alternativ_formulierung}
                </div>
              )}
            </div>
          )}
          {k.durchsetzbarkeit && (
            <p style={{ fontSize: 10, marginTop: 8, color: "#888" }}>⚖ Durchsetzbarkeit: <strong style={{ color: k.durchsetzbar ? "#1DB954" : "#FF3B30" }}>{k.durchsetzbar ? "Durchsetzbar" : "Angreifbar"}</strong> — {k.durchsetzbarkeit}</p>
          )}
        </div>
      )}
    </div>
  );
}

const VIZ_TABS = [
  { id: "heatmap",   label: "01 · Heatmap",     desc: "Wo hinschauen?" },
  { id: "wirkung",   label: "02 · Wirkungsbaum", desc: "Was passiert?" },
  { id: "zeitachse", label: "03 · Zeitachse",    desc: "Wann relevant?" },
  { id: "optionen",  label: "04 · Optionen",     desc: "Was tun?" },
  { id: "quadrant",  label: "05 · Quadrant",     desc: "Gesamtbild?" },
  { id: "vergleich", label: "10 · Vorher/Nachher", desc: "Wie formulieren?" },
];

function VisualisierungsPanel({ result }) {
  const [activeTab, setActiveTab] = useState("heatmap");
  const [selectedKlauselIdx, setSelectedKlauselIdx] = useState(0);

  if (!result?.klauseln?.length) return null;

  const sorted = [...result.klauseln].sort((a, b) =>
    ["kritisch","hoch","mittel","niedrig","positiv"].indexOf(a.risiko_stufe) -
    ["kritisch","hoch","mittel","niedrig","positiv"].indexOf(b.risiko_stufe)
  );
  const selectedKlausel = sorted[selectedKlauselIdx] || sorted[0];

  return (
    <div style={{ background: "#fafafa", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, overflow: "hidden", marginTop: 2 }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <BarChart3 style={{ width: 14, height: 14, color: "#5856D6" }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>Visualisierungssystem — Strategos Vertragsanalyse</p>
          <span style={{ fontSize: 9, color: "#888", marginLeft: "auto" }}>Konzept nach PDF · 6 Formate</span>
        </div>
        {/* Tab-Bar */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {VIZ_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                padding: "5px 11px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 10, fontWeight: activeTab === t.id ? 700 : 500,
                background: activeTab === t.id ? "#5856D6" : "rgba(0,0,0,0.05)",
                color: activeTab === t.id ? "#fff" : "#555",
                transition: "all 0.15s",
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "14px 16px" }}>
        {/* Klausel-Selektor für Detail-Ansichten */}
        {["wirkung", "zeitachse", "optionen", "vergleich"].includes(activeTab) && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>Klausel auswählen</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {sorted.map((k, i) => {
                const color = { kritisch: "#B81C3A", hoch: "#FF9500", mittel: "#0A84FF", niedrig: "#1DB954", positiv: "#1DB954" }[k.risiko_stufe] || "#888";
                return (
                  <button key={i} onClick={() => setSelectedKlauselIdx(i)}
                    style={{
                      padding: "4px 10px", borderRadius: 7, border: `1px solid ${selectedKlauselIdx === i ? color : "rgba(0,0,0,0.1)"}`,
                      background: selectedKlauselIdx === i ? `${color}12` : "transparent",
                      fontSize: 10, fontWeight: selectedKlauselIdx === i ? 700 : 400,
                      color: selectedKlauselIdx === i ? color : "#555", cursor: "pointer",
                    }}>
                    {k.klausel_typ?.slice(0, 22) || `#${i + 1}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "heatmap"   && <KlauselHeatmap klauseln={sorted} onSelect={idx => { setSelectedKlauselIdx(idx); setActiveTab("wirkung"); }} selectedIdx={selectedKlauselIdx} />}
        {activeTab === "wirkung"   && <WirkungsBaum klausel={selectedKlausel} />}
        {activeTab === "zeitachse" && <ZeitachseSzenarien klausel={selectedKlausel} />}
        {activeTab === "optionen"  && <OptionenCards klausel={selectedKlausel} />}
        {activeTab === "quadrant"  && <ChancenRisikoQuadrant klauseln={sorted} />}
        {activeTab === "vergleich" && <KlauselVergleich klausel={selectedKlausel} />}
      </div>
    </div>
  );
}

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
    const up = [];
    for (const f of files) {
      const r = await base44.integrations.Core.UploadFile({ file: f });
      up.push({ name: f.name, url: r.file_url, type: f.name.split(".").pop().toLowerCase(), uploaded_at: new Date().toISOString() });
    }
    const n = [...docs, ...up];
    setDocs(n);
    await onSave({ unternehmenskontext: { ...ctx, dokumente: n } });
    setUploading(false);
  };

  const analyseVertrag = async () => {
    setAnalysing(true);
    const doc = selectedDoc || docs[0];
    const r = await base44.integrations.Core.InvokeLLM({
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
          <VisualisierungsPanel result={result} />
        </>
      )}
    </div>
  );
}