import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileUp, Sparkles, Trash2, AlertTriangle, CheckCircle, MinusCircle, Scale, Shield, FileSearch, BarChart3 } from "lucide-react";
import { AppleCard, AppleButton, ApplePill, AppleField, AppleTextarea, SF } from "../AppleCard";
import KlauselHeatmap from "../visualisierung/KlauselHeatmap";
import WirkungsBaum from "../visualisierung/WirkungsBaum";
import ZeitachseSzenarien from "../visualisierung/ZeitachseSzenarien";
import OptionenCards from "../visualisierung/OptionenCards";
import ChancenRisikoQuadrant from "../visualisierung/ChancenRisikoQuadrant";
import KlauselVergleich from "../visualisierung/KlauselVergleich";
import Viz3DPanel from "../visualisierung/Viz3DPanel";

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
  { id: "heatmap",   label: "01 · Heatmap",       icon: "🔥", desc: "Wo liegt das Risiko?" },
  { id: "wirkung",   label: "02 · Wirkungsbaum",  icon: "🌳", desc: "Wie wirkt die Klausel?" },
  { id: "zeitachse", label: "03 · Zeitachse",     icon: "⏱", desc: "Wann wird sie scharf?" },
  { id: "optionen",  label: "04 · Optionen",      icon: "⚖️", desc: "Was kann ich tun?" },
  { id: "quadrant",  label: "05 · Quadrant",      icon: "📊", desc: "Gesamtportfolio?" },
  { id: "vergleich", label: "10 · Vorher/Nachher", icon: "✏️", desc: "Wie neu formulieren?" },
];

// KI-Prompts pro Visualisierungsformat
const VIZ_PROMPTS = {
  heatmap: (klauseln, klausel, ctx) => ({
    prompt: `Du bist ein Senior-Vertragsrechtler. Analysiere die folgenden Klauseln speziell für eine Risiko-Heatmap-Darstellung. Vergib für jede Klausel einen präzisen Risiko-Score (0-10), begründe die Einstufung und priorisiere nach Handlungsbedarf für das Unternehmen.

Unternehmenskontext: ${ctx.unternehmen_name || "—"} (${ctx.branche || "—"})
Klauseln: ${klauseln.map(k => `${k.klausel_typ} [${k.risiko_stufe}]: ${k.kurzbeschreibung}`).join("\n")}

Erstelle für JEDE Klausel eine Heatmap-Bewertung: exakter Score, Hauptrisiko in einem Satz, sofortiger Handlungsbedarf (ja/nein) und Priorität (1=höchste).`,
    response_json_schema: {
      type: "object",
      properties: {
        bewertungen: { type: "array", items: { type: "object", properties: {
          klausel_typ: { type: "string" },
          score: { type: "number" },
          hauptrisiko: { type: "string" },
          sofortiger_handlungsbedarf: { type: "boolean" },
          prioritaet: { type: "number" },
          ki_hinweis: { type: "string" }
        }}},
        gesamt_heatmap_fazit: { type: "string" },
        top3_kritische_klauseln: { type: "array", items: { type: "string" } }
      }
    }
  }),

  wirkung: (klauseln, klausel, ctx) => ({
    prompt: `Du bist Unternehmensberater und Vertragsrechtler. Analysiere die Klausel "${klausel?.klausel_typ}" speziell für einen Wirkungsbaum: Wie wirkt diese Klausel konkret ins Unternehmen hinein? Welche Abteilungen, Prozesse, Finanzen und strategischen Ziele sind betroffen?

Klausel: ${klausel?.klausel_typ}
Beschreibung: ${klausel?.kurzbeschreibung}
Mechanik: ${klausel?.rechtliche_mechanik || "—"}
Unternehmen: ${ctx.unternehmen_name || "—"} (${ctx.branche || "—"}, Umsatz ${ctx.umsatz ? (ctx.umsatz/1e6).toFixed(1)+"Mio. EUR" : "unbekannt"})

Erstelle konkrete Wirkungspfade mit quantifizierten Auswirkungen (in EUR wo möglich).`,
    response_json_schema: {
      type: "object",
      properties: {
        wirkungspfade: { type: "array", items: { type: "object", properties: {
          bereich: { type: "string" },
          beschreibung: { type: "string" },
          finanzieller_einfluss_eur: { type: "number" },
          zeitrahmen: { type: "string" },
          positiv: { type: "boolean" },
          betroffene_abteilungen: { type: "array", items: { type: "string" } }
        }}},
        gesamteinfluss_eur: { type: "number" },
        kritischster_pfad: { type: "string" },
        empfehlung: { type: "string" }
      }
    }
  }),

  zeitachse: (klauseln, klausel, ctx) => ({
    prompt: `Du bist ein strategischer Rechtsberater. Analysiere die Klausel "${klausel?.klausel_typ}" speziell für eine Zeitachse: Wann und unter welchen Bedingungen wird diese Klausel scharf? Welche konkreten Trigger-Ereignisse gibt es in welchem Zeitraum?

Klausel: ${klausel?.klausel_typ} [${klausel?.risiko_stufe}]
Beschreibung: ${klausel?.kurzbeschreibung}
Vorhandene Szenarien: ${JSON.stringify(klausel?.szenarien || [])}
Kontext: ${ctx.sachverhalt_lang?.slice(0, 200) || "—"}

Erstelle eine präzise Zeitachsen-Analyse mit konkreten Meilensteinen, Wahrscheinlichkeiten und Frühwarnsignalen.`,
    response_json_schema: {
      type: "object",
      properties: {
        meilensteine: { type: "array", items: { type: "object", properties: {
          zeitpunkt: { type: "string" },
          ereignis: { type: "string" },
          trigger: { type: "string" },
          wahrscheinlichkeit_pct: { type: "number" },
          handlungsfenster_tage: { type: "number" },
          kritisch: { type: "boolean" }
        }}},
        fruehwarnsignale: { type: "array", items: { type: "string" } },
        kritischer_zeitpunkt: { type: "string" },
        empfohlene_ueberwachung: { type: "string" }
      }
    }
  }),

  optionen: (klauseln, klausel, ctx) => ({
    prompt: `Du bist ein strategischer Verhandlungsexperte und Senior-Anwalt. Analysiere die Klausel "${klausel?.klausel_typ}" und erarbeite alle konkreten Handlungsoptionen — von der einfachsten Akzeptanz bis zum Klauselangriff. Jede Option soll realistisch, mit Kosten, Wahrscheinlichkeit und strategischem Wert bewertet sein.

Klausel: ${klausel?.klausel_typ} [Risiko: ${klausel?.risiko_stufe}]
${klausel?.kurzbeschreibung}
Verhandlungsempfehlung bisher: ${klausel?.verhandlungsempfehlung || "—"}
Durchsetzbar: ${klausel?.durchsetzbar ? "Ja" : "Nein"} — ${klausel?.durchsetzbarkeit || "—"}
Unternehmen: ${ctx.unternehmen_name || "—"} (Gegenpartei: ${ctx.gegner_name || "—"})

Erstelle 4-6 differenzierte Optionen von konservativ bis aggressiv.`,
    response_json_schema: {
      type: "object",
      properties: {
        optionen: { type: "array", items: { type: "object", properties: {
          id: { type: "string" },
          titel: { type: "string" },
          beschreibung: { type: "string" },
          vorgehen: { type: "string" },
          kosten_eur: { type: "number" },
          kosten_label: { type: "string" },
          wahrscheinlichkeit_pct: { type: "number" },
          strategischer_wert: { type: "string" },
          zeitaufwand: { type: "string" },
          empfohlen: { type: "boolean" },
          risiken: { type: "array", items: { type: "string" } }
        }}},
        beste_option_begruendung: { type: "string" },
        verhandlungsstrategie: { type: "string" }
      }
    }
  }),

  quadrant: (klauseln, klausel, ctx) => ({
    prompt: `Du bist ein Portfolio-Risikostratege. Analysiere ALLE Klauseln dieses Vertrags für eine Chancen-Risiken-Portfolio-Analyse. Positioniere jede Klausel im Quadrant nach Eintrittswahrscheinlichkeit und Wirkungstiefe.

Unternehmen: ${ctx.unternehmen_name || "—"} (${ctx.branche || "—"})
Alle Klauseln:
${klauseln.map(k => `- ${k.klausel_typ} [${k.risiko_stufe}]: ${k.kurzbeschreibung?.slice(0, 80)}`).join("\n")}

Gib für jede Klausel: genaue Koordinaten (x=Wahrscheinlichkeit 0-100, y=Wirkungstiefe 0-10), Quadrant-Kategorie und strategische Einordnung. Leite daraus Portfolio-Empfehlungen ab.`,
    response_json_schema: {
      type: "object",
      properties: {
        portfolio: { type: "array", items: { type: "object", properties: {
          klausel_typ: { type: "string" },
          x_wahrscheinlichkeit: { type: "number" },
          y_wirkungstiefe: { type: "number" },
          quadrant: { type: "string" },
          strategische_einordnung: { type: "string" },
          sofortmassnahme: { type: "string" }
        }}},
        portfolio_fazit: { type: "string" },
        top_prioritaet: { type: "string" },
        gesamtrisiko_score: { type: "number" }
      }
    }
  }),

  vergleich: (klauseln, klausel, ctx) => ({
    prompt: `Du bist ein Vertragsformulierungsexperte und Senior-Anwalt für Vertragsrecht. Erstelle für die Klausel "${klausel?.klausel_typ}" eine professionelle Vorher-Nachher-Analyse: IST-Formulierung mit allen Risiken, und optimierte SOLL-Formulierung die die Risiken minimiert aber wirtschaftlich realistisch ist.

IST-Klausel: ${klausel?.klausel_typ}
Beschreibung: ${klausel?.kurzbeschreibung}
Risiko: ${klausel?.risiko_stufe}
Bisherige Nachteile: ${(klausel?.juristische_nachteile || []).join("; ")}
Bisherige Verhandlungsempfehlung: ${klausel?.verhandlungsempfehlung || "—"}
Bisherige Alternativformulierung: ${klausel?.alternativ_formulierung || "—"}
Gegenpartei: ${ctx.gegner_name || "—"} (${ctx.gegner_rolle || "—"})

Erstelle eine vollständige, juristisch präzise Neuformulierung mit Begründung und Verhandlungsstrategie.`,
    response_json_schema: {
      type: "object",
      properties: {
        ist_formulierung: { type: "string" },
        ist_probleme: { type: "array", items: { type: "string" } },
        soll_formulierung: { type: "string" },
        soll_vorteile: { type: "array", items: { type: "string" } },
        risiko_reduktion_pct: { type: "number" },
        verhandlungsargument: { type: "string" },
        gegner_einwand: { type: "string" },
        kompromiss_formulierung: { type: "string" },
        rechtliche_grundlage: { type: "string" }
      }
    }
  }),
};

function KlauselSelector({ sorted, selectedIdx, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>Klausel auswählen</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {sorted.map((k, i) => {
          const color = { kritisch: "#B81C3A", hoch: "#FF9500", mittel: "#0A84FF", niedrig: "#1DB954", positiv: "#1DB954" }[k.risiko_stufe] || "#888";
          return (
            <button key={i} onClick={() => onChange(i)}
              style={{
                padding: "4px 10px", borderRadius: 7, border: `1px solid ${selectedIdx === i ? color : "rgba(0,0,0,0.1)"}`,
                background: selectedIdx === i ? `${color}12` : "transparent",
                fontSize: 10, fontWeight: selectedIdx === i ? 700 : 400,
                color: selectedIdx === i ? color : "#555", cursor: "pointer",
              }}>
              {k.klausel_typ?.slice(0, 22) || `#${i + 1}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VizKIPanel({ tabId, kiResult, loading, onAnalyse }) {
  const labels = {
    heatmap:   { title: "KI-Heatmap-Analyse", color: "#B81C3A" },
    wirkung:   { title: "KI-Wirkungsbaum-Analyse", color: "#5856D6" },
    zeitachse: { title: "KI-Zeitachsen-Analyse", color: "#FF9500" },
    optionen:  { title: "KI-Optionen-Analyse", color: "#1DB954" },
    quadrant:  { title: "KI-Quadrant-Portfolio-Analyse", color: "#0A84FF" },
    vergleich: { title: "KI-Vorher/Nachher-Analyse", color: "#FF2D55" },
  };
  const { title, color } = labels[tabId] || { title: "KI-Analyse", color: "#5856D6" };

  return (
    <div style={{ background: "#fff", border: `1px solid ${color}25`, borderRadius: 13, overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${color}15`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{title}</p>
          <p style={{ fontSize: 10, color: "#888", marginTop: 1 }}>Dedizierte KI-Analyse für diese Visualisierung</p>
        </div>
        <div onClick={loading ? undefined : onAnalyse}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 13px", fontSize: 11, fontWeight: 700, background: loading ? "rgba(0,0,0,0.06)" : color, color: loading ? "#aaa" : "#fff", border: `1px solid ${loading ? "rgba(0,0,0,0.1)" : color}`, borderRadius: 9, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s", userSelect: "none", flexShrink: 0 }}>
          <Sparkles style={{ width: 12, height: 12, color: loading ? "#aaa" : "#fff" }} />
          {loading ? "Analysiert…" : kiResult ? "Neu analysieren" : "KI analysieren"}
        </div>
      </div>

      {kiResult && (
        <div style={{ padding: "12px 14px" }}>
          {/* Heatmap result */}
          {tabId === "heatmap" && kiResult.bewertungen && (
            <div>
              {kiResult.gesamt_heatmap_fazit && <p style={{ fontSize: 12, color: "#333", lineHeight: 1.5, marginBottom: 10, padding: "8px 11px", background: `${color}08`, borderRadius: 9 }}>{kiResult.gesamt_heatmap_fazit}</p>}
              {kiResult.top3_kritische_klauseln?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#B81C3A", textTransform: "uppercase", marginBottom: 5 }}>Top 3 kritischste Klauseln</p>
                  {kiResult.top3_kritische_klauseln.map((k, i) => <p key={i} style={{ fontSize: 11, color: "#333", marginBottom: 3 }}>{i+1}. {k}</p>)}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {kiResult.bewertungen?.sort((a,b) => b.score - a.score).map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(0,0,0,0.025)", borderRadius: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: b.score >= 8 ? "#B81C3A" : b.score >= 6 ? "#FF9500" : b.score >= 4 ? "#0A84FF" : "#1DB954", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>{b.score?.toFixed(1)}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{b.klausel_typ}</p>
                      <p style={{ fontSize: 10, color: "#666" }}>{b.hauptrisiko}</p>
                    </div>
                    {b.sofortiger_handlungsbedarf && <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: "#B81C3A", padding: "2px 7px", borderRadius: 5 }}>SOFORT</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wirkungsbaum result */}
          {tabId === "wirkung" && kiResult.wirkungspfade && (
            <div>
              {kiResult.kritischster_pfad && <p style={{ fontSize: 12, color: "#333", marginBottom: 10, padding: "8px 11px", background: `${color}08`, borderRadius: 9 }}>⚡ {kiResult.kritischster_pfad}</p>}
              {kiResult.gesamteinfluss_eur && <p style={{ fontSize: 13, fontWeight: 800, color: color, marginBottom: 8 }}>Gesamteinfluss: {kiResult.gesamteinfluss_eur > 0 ? "+" : ""}{kiResult.gesamteinfluss_eur?.toLocaleString()} EUR</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {kiResult.wirkungspfade.map((p, i) => (
                  <div key={i} style={{ padding: "8px 11px", background: p.positiv ? "rgba(29,185,84,0.06)" : "rgba(184,28,58,0.06)", border: `1px solid ${p.positiv ? "rgba(29,185,84,0.2)" : "rgba(184,28,58,0.2)"}`, borderRadius: 9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{p.bereich}</p>
                      {p.finanzieller_einfluss_eur && <span style={{ fontSize: 11, fontWeight: 800, color: p.positiv ? "#1DB954" : "#B81C3A" }}>{p.finanzieller_einfluss_eur > 0 ? "+" : ""}{p.finanzieller_einfluss_eur?.toLocaleString()} €</span>}
                    </div>
                    <p style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{p.beschreibung}</p>
                    {p.betroffene_abteilungen?.length > 0 && <p style={{ fontSize: 9, color: "#888", marginTop: 3 }}>Betroffene Bereiche: {p.betroffene_abteilungen.join(", ")}</p>}
                  </div>
                ))}
              </div>
              {kiResult.empfehlung && <p style={{ fontSize: 11, color: "#1a1a1a", marginTop: 10, padding: "8px 11px", background: "rgba(29,185,84,0.07)", borderRadius: 9, borderLeft: "3px solid #1DB954" }}>{kiResult.empfehlung}</p>}
            </div>
          )}

          {/* Zeitachse result */}
          {tabId === "zeitachse" && kiResult.meilensteine && (
            <div>
              {kiResult.kritischer_zeitpunkt && <p style={{ fontSize: 12, color: "#FF9500", fontWeight: 700, marginBottom: 10 }}>⏰ Kritischer Zeitpunkt: {kiResult.kritischer_zeitpunkt}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {kiResult.meilensteine.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 11px", background: m.kritisch ? "rgba(184,28,58,0.06)" : "rgba(0,0,0,0.025)", border: `1px solid ${m.kritisch ? "rgba(184,28,58,0.2)" : "rgba(0,0,0,0.06)"}`, borderRadius: 9 }}>
                    <div style={{ textAlign: "center", minWidth: 52, flexShrink: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: m.kritisch ? "#B81C3A" : "#555" }}>{m.zeitpunkt}</p>
                      <p style={{ fontSize: 9, color: "#888" }}>{m.wahrscheinlichkeit_pct}%</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{m.ereignis}</p>
                      {m.trigger && <p style={{ fontSize: 10, color: "#666" }}>Trigger: {m.trigger}</p>}
                      {m.handlungsfenster_tage && <p style={{ fontSize: 9, color: "#0A84FF" }}>Handlungsfenster: {m.handlungsfenster_tage} Tage</p>}
                    </div>
                  </div>
                ))}
              </div>
              {kiResult.fruehwarnsignale?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#FF9500", textTransform: "uppercase", marginBottom: 5 }}>Frühwarnsignale</p>
                  {kiResult.fruehwarnsignale.map((s, i) => <p key={i} style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>⚠ {s}</p>)}
                </div>
              )}
            </div>
          )}

          {/* Optionen result */}
          {tabId === "optionen" && kiResult.optionen && (
            <div>
              {kiResult.beste_option_begruendung && <p style={{ fontSize: 12, color: "#333", marginBottom: 10, padding: "8px 11px", background: `${color}08`, borderRadius: 9 }}>{kiResult.beste_option_begruendung}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                {kiResult.optionen.map((opt, i) => (
                  <div key={i} style={{ border: `2px solid ${opt.empfohlen ? color : color + "30"}`, borderRadius: 11, overflow: "hidden", background: opt.empfohlen ? `${color}07` : "#fafafa", position: "relative" }}>
                    {opt.empfohlen && <div style={{ position: "absolute", top: 0, right: 0, background: color, padding: "2px 8px", borderBottomLeftRadius: 8 }}><p style={{ fontSize: 8, fontWeight: 800, color: "#fff" }}>EMPFOHLEN</p></div>}
                    <div style={{ background: opt.empfohlen ? color : color + "18", padding: "9px 12px" }}>
                      <p style={{ fontSize: 13, fontWeight: 900, color: opt.empfohlen ? "#fff" : color }}>{opt.id}</p>
                      <p style={{ fontSize: 11, fontWeight: 700, color: opt.empfohlen ? "#fff" : color }}>{opt.titel}</p>
                    </div>
                    <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                      <p style={{ fontSize: 10, color: "#555", lineHeight: 1.3 }}>{opt.beschreibung}</p>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div><p style={{ fontSize: 9, color: "#aaa" }}>Erfolg</p><p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a" }}>{opt.wahrscheinlichkeit_pct}%</p></div>
                        <div><p style={{ fontSize: 9, color: "#aaa" }}>Kosten</p><p style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>{opt.kosten_label || (opt.kosten_eur ? opt.kosten_eur?.toLocaleString()+"€" : "—")}</p></div>
                        <div><p style={{ fontSize: 9, color: "#aaa" }}>Wert</p><p style={{ fontSize: 11, fontWeight: 700, color: opt.strategischer_wert === "hoch" ? "#1DB954" : opt.strategischer_wert === "niedrig" ? "#B81C3A" : "#0A84FF" }}>{opt.strategischer_wert}</p></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {kiResult.verhandlungsstrategie && <p style={{ fontSize: 11, color: "#333", marginTop: 10, padding: "8px 11px", background: "rgba(29,185,84,0.07)", borderRadius: 9, borderLeft: "3px solid #1DB954" }}>Verhandlungsstrategie: {kiResult.verhandlungsstrategie}</p>}
            </div>
          )}

          {/* Quadrant result */}
          {tabId === "quadrant" && kiResult.portfolio && (
            <div>
              {kiResult.portfolio_fazit && <p style={{ fontSize: 12, color: "#333", marginBottom: 10, padding: "8px 11px", background: `${color}08`, borderRadius: 9 }}>{kiResult.portfolio_fazit}</p>}
              {kiResult.gesamtrisiko_score && <p style={{ fontSize: 13, fontWeight: 800, color: kiResult.gesamtrisiko_score >= 7 ? "#B81C3A" : kiResult.gesamtrisiko_score >= 5 ? "#FF9500" : "#1DB954", marginBottom: 8 }}>Gesamtrisiko-Score: {kiResult.gesamtrisiko_score}/10</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {kiResult.portfolio.sort((a,b) => (b.y_wirkungstiefe * b.x_wahrscheinlichkeit/100) - (a.y_wirkungstiefe * a.x_wahrscheinlichkeit/100)).map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "7px 10px", background: "rgba(0,0,0,0.025)", borderRadius: 8 }}>
                    <div style={{ minWidth: 60, flexShrink: 0 }}>
                      <p style={{ fontSize: 9, color: "#888" }}>W:{p.x_wahrscheinlichkeit}% / T:{p.y_wirkungstiefe}</p>
                      <p style={{ fontSize: 9, fontWeight: 700, color: color }}>{p.quadrant}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{p.klausel_typ}</p>
                      <p style={{ fontSize: 10, color: "#555" }}>{p.strategische_einordnung}</p>
                      {p.sofortmassnahme && <p style={{ fontSize: 10, color: color, marginTop: 2 }}>→ {p.sofortmassnahme}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {kiResult.top_prioritaet && <p style={{ fontSize: 11, color: "#B81C3A", fontWeight: 700, marginTop: 8 }}>🎯 Top-Priorität: {kiResult.top_prioritaet}</p>}
            </div>
          )}

          {/* Vergleich result */}
          {tabId === "vergleich" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {kiResult.risiko_reduktion_pct && <p style={{ fontSize: 13, fontWeight: 800, color: "#1DB954" }}>Risikoreduktion durch SOLL-Formulierung: -{kiResult.risiko_reduktion_pct}%</p>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ border: "2px solid rgba(184,28,58,0.35)", borderRadius: 11, overflow: "hidden" }}>
                  <div style={{ background: "#B81C3A", padding: "8px 12px" }}><p style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>IST-FORMULIERUNG</p></div>
                  <div style={{ padding: "10px 12px" }}>
                    <p style={{ fontSize: 11, color: "#333", fontStyle: "italic", lineHeight: 1.5 }}>„{kiResult.ist_formulierung}"</p>
                    {kiResult.ist_probleme?.map((p, i) => <p key={i} style={{ fontSize: 10, color: "#B81C3A", marginTop: 4 }}>■ {p}</p>)}
                  </div>
                </div>
                <div style={{ border: "2px solid rgba(29,185,84,0.35)", borderRadius: 11, overflow: "hidden" }}>
                  <div style={{ background: "#1DB954", padding: "8px 12px" }}><p style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>SOLL-FORMULIERUNG</p></div>
                  <div style={{ padding: "10px 12px" }}>
                    <p style={{ fontSize: 11, color: "#333", fontStyle: "italic", lineHeight: 1.5 }}>„{kiResult.soll_formulierung}"</p>
                    {kiResult.soll_vorteile?.map((v, i) => <p key={i} style={{ fontSize: 10, color: "#1DB954", marginTop: 4 }}>■ {v}</p>)}
                  </div>
                </div>
              </div>
              {kiResult.kompromiss_formulierung && (
                <div style={{ padding: "9px 12px", background: "rgba(10,132,255,0.07)", border: "1px solid rgba(10,132,255,0.2)", borderRadius: 9 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#0A84FF", textTransform: "uppercase", marginBottom: 3 }}>Kompromissformulierung</p>
                  <p style={{ fontSize: 11, color: "#333", fontStyle: "italic" }}>„{kiResult.kompromiss_formulierung}"</p>
                </div>
              )}
              {kiResult.verhandlungsargument && <p style={{ fontSize: 11, color: "#333", padding: "8px 11px", background: "rgba(29,185,84,0.07)", borderRadius: 9, borderLeft: "3px solid #1DB954" }}>Verhandlungsargument: {kiResult.verhandlungsargument}</p>}
              {kiResult.gegner_einwand && <p style={{ fontSize: 11, color: "#666", padding: "8px 11px", background: "rgba(184,28,58,0.05)", borderRadius: 9, borderLeft: "3px solid #B81C3A" }}>Gegner-Einwand: {kiResult.gegner_einwand}</p>}
              {kiResult.rechtliche_grundlage && <p style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Rechtliche Grundlage: {kiResult.rechtliche_grundlage}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VisualisierungsPanel({ result, scenario }) {
  const [activeTab, setActiveTab] = useState("heatmap");
  const [selectedKlauselIdx, setSelectedKlauselIdx] = useState(0);
  const [kiResults, setKiResults] = useState({});
  const [kiLoading, setKiLoading] = useState({});
  const resultRef = useRef(null);

  // Refs für stabile Werte in async Callbacks
  const sortedRef = useRef([]);
  const selectedKlauselIdxRef = useRef(0);
  const ctxRef = useRef({});

  if (!result?.klauseln?.length) return null;

  const ctx = scenario?.unternehmenskontext || {};
  const sorted = [...result.klauseln].sort((a, b) =>
    ["kritisch","hoch","mittel","niedrig","positiv"].indexOf(a.risiko_stufe) -
    ["kritisch","hoch","mittel","niedrig","positiv"].indexOf(b.risiko_stufe)
  );
  const selectedKlausel = sorted[selectedKlauselIdx] || sorted[0];

  // Refs aktuell halten
  sortedRef.current = sorted;
  selectedKlauselIdxRef.current = selectedKlauselIdx;
  ctxRef.current = ctx;

  const runVizAnalysis = async (tabId) => {
    // Aktuelle Werte aus Refs lesen — kein Closure-Bug
    const currentSorted = sortedRef.current;
    const currentKlausel = currentSorted[selectedKlauselIdxRef.current] || currentSorted[0];
    const currentCtx = ctxRef.current;

    if (!currentSorted.length) {
      alert("Keine Klauseln vorhanden. Bitte zuerst Vertragsanalyse durchführen.");
      return;
    }

    setKiLoading(prev => ({ ...prev, [tabId]: true }));
    try {
      const promptConfig = VIZ_PROMPTS[tabId](currentSorted, currentKlausel, currentCtx);
      const r = await base44.integrations.Core.InvokeLLM({
        ...promptConfig,
        model: "claude_sonnet_4_6",
      });
      setKiResults(prev => ({ ...prev, [tabId]: r }));
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      console.error(`KI-Analyse [${tabId}] fehlgeschlagen:`, err?.message);
      alert(`Analyse fehlgeschlagen: ${err?.message || "Netzwerkfehler"}`);
    }
    setKiLoading(prev => ({ ...prev, [tabId]: false }));
  };

  const needsKlausel = ["wirkung", "zeitachse", "optionen", "vergleich"].includes(activeTab);

  return (
    <div style={{ background: "#fafafa", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, overflow: "hidden", marginTop: 2 }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <BarChart3 style={{ width: 14, height: 14, color: "#5856D6" }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>Visualisierungssystem — 6 gesonderte KI-Analysen</p>
          <span style={{ fontSize: 9, color: "#888", marginLeft: "auto" }}>Jede Ansicht hat eigene KI-Analyse</span>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {VIZ_TABS.map(t => (
            <div key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                padding: "5px 11px", borderRadius: 8, cursor: "pointer",
                fontSize: 10, fontWeight: activeTab === t.id ? 700 : 500,
                background: activeTab === t.id ? "#5856D6" : "rgba(0,0,0,0.05)",
                color: activeTab === t.id ? "#fff" : "#555",
                border: activeTab === t.id ? "1px solid #5856D6" : "1px solid transparent",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 4, userSelect: "none",
              }}>
              <span>{t.icon}</span>{t.label}
              {kiResults[t.id] && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1DB954", flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "14px 16px" }}>
        {/* Klausel-Selektor für Detail-Ansichten */}
        {needsKlausel && (
          <KlauselSelector sorted={sorted} selectedIdx={selectedKlauselIdx} onChange={setSelectedKlauselIdx} />
        )}

        {/* KI-Analyse Panel für aktiven Tab */}
        <div ref={resultRef}>
          <VizKIPanel
            tabId={activeTab}
            kiResult={kiResults[activeTab]}
            loading={!!kiLoading[activeTab]}
            onAnalyse={() => runVizAnalysis(activeTab)}
          />
        </div>

        {/* Visualisierung — kiResult wird für KI-angereicherte Darstellung übergeben */}
        {activeTab === "heatmap"   && <KlauselHeatmap klauseln={sorted} onSelect={idx => { setSelectedKlauselIdx(idx); setActiveTab("wirkung"); }} selectedIdx={selectedKlauselIdx} kiResult={kiResults["heatmap"]} />}
        {activeTab === "wirkung"   && <WirkungsBaum klausel={selectedKlausel} kiResult={kiResults["wirkung"]} />}
        {activeTab === "zeitachse" && <ZeitachseSzenarien klausel={selectedKlausel} kiResult={kiResults["zeitachse"]} />}
        {activeTab === "optionen"  && <OptionenCards klausel={selectedKlausel} kiResult={kiResults["optionen"]} />}
        {activeTab === "quadrant"  && <ChancenRisikoQuadrant klauseln={sorted} kiResult={kiResults["quadrant"]} />}
        {activeTab === "vergleich" && <KlauselVergleich klausel={selectedKlausel} kiResult={kiResults["vergleich"]} />}
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
    // Dokument-URLs aus Schritt 0 als Fallback nutzen
    const step0Docs = (scenario.ki_kontext?.docs || []).filter(d => d.url && d.status === "done");
    const fileUrls = doc ? [doc.url] : step0Docs.map(d => d.url).slice(0, 3);
    const kiBriefing = scenario.ki_kontext?.ki_briefing;
    const notiz = manuelleNotizRef.current;

    let r;
    try {
    r = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein Senior-Anwalt einer internationalen Großkanzlei spezialisiert auf Vertragsrecht, AGB-Recht und internationale Vertragsgestaltung. Analysiere diesen Vertrag / dieses Dokument auf drei Dimensionen:

UNTERNEHMENSKONTEXT:
Unternehmen: ${ctx.unternehmen_name || "—"} (${ctx.rechtsform || "—"}, ${ctx.branche || "—"})
Umsatz: ${ctx.umsatz ? (ctx.umsatz/1000000).toFixed(1) + "Mio. " + (ctx.waehrung || "EUR") : "—"}
Gegenpartei: ${ctx.gegner_name || "—"} (${ctx.gegner_rolle || "—"})
Sachverhalt: ${ctx.sachverhalt_lang || "—"}
Dokument: ${doc ? doc.name : step0Docs.length > 0 ? step0Docs.map(d => d.name).join(", ") + " (Schritt 0)" : "manuell"}
${kiBriefing ? `\nKI-BASIS-BRIEFING (Schritt 0):\n${String(kiBriefing).slice(0, 500)}\n` : ""}Zusätzliche Notizen: ${notiz || "—"}

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
      file_urls: fileUrls.length > 0 ? fileUrls : undefined,
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
              {docs.length > 0
                ? `${docs.length} Dokument(e) · `
                : (scenario.ki_kontext?.docs || []).filter(d => d.status === "done").length > 0
                  ? `${(scenario.ki_kontext.docs).filter(d => d.status === "done").length} Dok. aus Schritt 0 · `
                  : "Kein Dokument — "}
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

          {/* ── 3D-VISUALISIERUNGSSYSTEM (aus Konzeptpapier Q2/2026) ── */}
          <Viz3DPanel result={result} scenario={scenario} />
        </>
      )}
    </div>
  );
}