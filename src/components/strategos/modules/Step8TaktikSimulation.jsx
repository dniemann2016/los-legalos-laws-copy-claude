/**
 * Step 8 — Taktik-Simulation
 *
 * Wähle für ein Szenario verschiedene gegnerische Reaktionsmuster aus
 * und berechne dynamisch die Erfolgswahrscheinlichkeit deiner Strategie.
 *
 * Berücksichtigt alle vorhandenen Strategos-Ergebnisse:
 *  - unternehmenskontext   (Sachverhalt, Gegner, Zeitkritikalität)
 *  - situationsanalyse     (Gesamtrisiko, Quantifizierung)
 *  - ki_analyse            (Handlungsoptionen, Vertragsanalyse, Quant-Analyse, Umsetzungsplan)
 *  - szenario_matrix       (Szenarien aus Schritt 3)
 *  - strategos_empfehlung  (Hauptstrategie)
 */

import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, RotateCcw, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from "recharts";
import TaktikVergleich from "./TaktikVergleich";
import TaktikZeitstrahl from "./TaktikZeitstrahl";

// ─── Reaktionsmuster-Bibliothek ────────────────────────────────────────────────
const REAKTIONSMUSTER = [
  {
    id: "eskalation",
    label: "Eskalation",
    icon: "⚡",
    color: "#B81C3A",
    beschreibung: "Gegner eskaliert sofort rechtlich oder öffentlich",
    modifier: -18,
    tags: ["aggressiv", "offensiv"],
    gegenmassnahme: "Deeskalierende Kommunikation + schnelle Beweissicherung vorbereiten",
  },
  {
    id: "verzoegerung",
    label: "Verzögerungstaktik",
    icon: "🐢",
    color: "#FF9500",
    beschreibung: "Gegner verschleppt Verfahren systematisch",
    modifier: -9,
    tags: ["passiv", "defensiv"],
    gegenmassnahme: "Fristen rigoros überwachen, § 888 ZPO-Zwangsmittel prüfen",
  },
  {
    id: "vergleich",
    label: "Vergleichsangebot",
    icon: "🤝",
    color: "#1DB954",
    beschreibung: "Gegner signalisiert Verhandlungsbereitschaft",
    modifier: +14,
    tags: ["kooperativ", "kompromiss"],
    gegenmassnahme: "BATNA definieren, keine übereilte Einigung, Vergleichsrahmen vorbereiten",
  },
  {
    id: "gegenangriff",
    label: "Gegenangriff / Widerklage",
    icon: "🗡️",
    color: "#FF3B30",
    beschreibung: "Gegner erhebt Widerklage oder Gegenforderung",
    modifier: -22,
    tags: ["aggressiv", "risikoreich"],
    gegenmassnahme: "Eigene Schwachstellen identifizieren, defensiven Fallmantel aufbauen",
  },
  {
    id: "ignorieren",
    label: "Ignorieren / Stille",
    icon: "🤐",
    color: "#636366",
    beschreibung: "Gegner reagiert nicht, abwartendes Schweigen",
    modifier: +3,
    tags: ["passiv", "abwartend"],
    gegenmassnahme: "Fristablauf dokumentieren, Versäumnisurteil / Mahnbescheid prüfen",
  },
  {
    id: "mediation",
    label: "Mediationsantrag",
    icon: "⚖️",
    color: "#0A84FF",
    beschreibung: "Gegner schlägt außergerichtliche Einigung vor",
    modifier: +10,
    tags: ["kooperativ", "extern"],
    gegenmassnahme: "Mediatoren-Auswahl vorbereiten, Vertraulichkeitsvereinbarung sichern",
  },
  {
    id: "oeffentlichkeit",
    label: "Öffentlichkeitsdruck",
    icon: "📰",
    color: "#FF9500",
    beschreibung: "Gegner geht an die Öffentlichkeit / Presse",
    modifier: -12,
    tags: ["aggressiv", "reputationsrisiko"],
    gegenmassnahme: "Kommunikationsstrategie + Pressemitteilung in Reserve halten",
  },
  {
    id: "beweis_angriff",
    label: "Beweisangriff",
    icon: "🔍",
    color: "#5856D6",
    beschreibung: "Gegner greift zentrale Beweise an / beantragt Gutachten",
    modifier: -15,
    tags: ["rechtlich", "beweisrecht"],
    gegenmassnahme: "Beweismittel zusätzlich absichern, Sachverständigen frühzeitig beauftragen",
  },
  {
    id: "insolvenz",
    label: "Insolvenz / Vermögensentzug",
    icon: "💸",
    color: "#B81C3A",
    beschreibung: "Gegner droht mit Insolvenz oder verschiebt Vermögen",
    modifier: -30,
    tags: ["existenziell", "vollstreckung"],
    gegenmassnahme: "Arrestantrag, vorläufige Sicherungsmaßnahmen nach § 916 ZPO",
  },
  {
    id: "kapitulation",
    label: "Vollständige Kapitulation",
    icon: "🏳️",
    color: "#1DB954",
    beschreibung: "Gegner gibt vollständig nach, erkennt Ansprüche an",
    modifier: +28,
    tags: ["optimal", "selten"],
    gegenmassnahme: "Titulierung sichern, Kostenerstattung geltend machen",
  },
];

// ─── Eigene Strategie-Optionen ─────────────────────────────────────────────────
const EIGENE_STRATEGIEN = [
  { id: "offensiv",    label: "Offensiv – Maximaler Druck",     icon: "🎯", modifier: +8,  color: "#B81C3A" },
  { id: "defensiv",   label: "Defensiv – Schadensbegrenzung",   icon: "🛡️", modifier: +5,  color: "#0A84FF" },
  { id: "verhandlung",label: "Verhandlungsorientiert",          icon: "💬", modifier: +12, color: "#1DB954" },
  { id: "hybrid",     label: "Hybrid – Druck + Verhandlung",    icon: "⚖️", modifier: +10, color: "#FF9500" },
  { id: "warteraum",  label: "Abwartend – Zeitvorteil nutzen",  icon: "⏳", modifier: +3,  color: "#636366" },
];

// ─── Basis-Erfolgswahrscheinlichkeit aus Strategos-Daten ableiten ──────────────
function calcBasisPrognose(scenario) {
  let base = 55; // Neutraler Ausgangswert

  const ctx = scenario?.unternehmenskontext || {};
  const sit = scenario?.situationsanalyse || {};
  const ki  = scenario?.ki_analyse || {};

  // Gesamtrisiko aus Situationsanalyse
  if (sit.gesamt_risiko != null) {
    base -= (sit.gesamt_risiko - 5) * 2; // Je höher das Risiko, desto niedriger die Basis
  }

  // Zeitkritikalität
  if (ctx.zeitkritikalitaet != null) {
    base -= ctx.zeitkritikalitaet * 1.5;
  }

  // Handlungsoptionen vorhanden?
  if (ki.handlungsoptionen?.optionen?.length > 0) {
    base += 5;
  }

  // Quant-Analyse: EV-Score
  if (ki.quant_analyse?.ev_gesamt != null) {
    if (ki.quant_analyse.ev_gesamt > 0) base += 7;
    else base -= 5;
  }

  // Vertragsanalyse: kritische Klauseln
  const kritische = (ki.vertrags_analyse?.klauseln || []).filter(k => k.risiko_stufe === "kritisch").length;
  base -= kritische * 3;

  // Strategos-Empfehlung: Grundhaltung
  const grundhaltung = scenario?.strategos_empfehlung?.grundhaltung || "";
  if (grundhaltung.toLowerCase().includes("stark")) base += 6;
  if (grundhaltung.toLowerCase().includes("schwach")) base -= 6;

  return Math.max(10, Math.min(90, Math.round(base)));
}

// ─── Scores aus gewählten Reaktionsmustern und eigener Strategie ──────────────
function calcGesamtPrognose(basisPrognose, selectedReaktionen, eigeneStrategie, anpassungen) {
  let score = basisPrognose;

  // Reaktionsmuster
  selectedReaktionen.forEach(id => {
    const m = REAKTIONSMUSTER.find(r => r.id === id);
    if (m) score += m.modifier;
  });

  // Eigene Strategie
  if (eigeneStrategie) {
    const s = EIGENE_STRATEGIEN.find(s => s.id === eigeneStrategie);
    if (s) score += s.modifier;
  }

  // Manuelle Anpassungen
  score += anpassungen;

  return Math.max(5, Math.min(97, Math.round(score)));
}

// ─── Score-Farbe ───────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 70) return "#1DB954";
  if (s >= 50) return "#FF9500";
  return "#B81C3A";
}

// ─── Gauge-Visualisierung ──────────────────────────────────────────────────────
function PrognoseGauge({ score, label }) {
  const color = scoreColor(score);
  const r = 44, cx = 60, cy = 60;
  const circumference = Math.PI * r; // halber Kreis
  const dash = (score / 100) * circumference;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={120} height={75} viewBox="0 0 120 75">
        {/* Hintergrund-Halbkreis */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={10} strokeLinecap="round" />
        {/* Score-Halbkreis */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
        {/* Wert */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={color}
          style={{ fontSize: 22, fontWeight: 900, fontFamily: "-apple-system,sans-serif" }}>
          {score}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#888"
          style={{ fontSize: 9, fontFamily: "-apple-system,sans-serif" }}>
          {label}
        </text>
      </svg>
    </div>
  );
}

// ─── Reaktionsmuster-Karte ─────────────────────────────────────────────────────
function ReaktionsCard({ reaktion, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => onToggle(reaktion.id)}
      style={{
        border: `2px solid ${selected ? reaktion.color : "rgba(0,0,0,0.09)"}`,
        borderRadius: 12, overflow: "hidden",
        background: selected ? `${reaktion.color}0d` : "#fff",
        cursor: "pointer", transition: "all 0.15s", userSelect: "none",
      }}>
      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{reaktion.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: selected ? reaktion.color : "#1a1a1a" }}>{reaktion.label}</p>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 5,
              background: reaktion.modifier > 0 ? "rgba(29,185,84,0.12)" : "rgba(184,28,58,0.1)",
              color: reaktion.modifier > 0 ? "#1DB954" : "#B81C3A",
            }}>
              {reaktion.modifier > 0 ? "+" : ""}{reaktion.modifier}%
            </span>
          </div>
          <p style={{ fontSize: 10, color: "#888", marginTop: 1 }}>{reaktion.beschreibung}</p>
        </div>
        <div onClick={e => { e.stopPropagation(); setOpen(!open); }}
          style={{ padding: 4, borderRadius: 6, background: "rgba(0,0,0,0.04)", flexShrink: 0 }}>
          {open ? <ChevronUp size={13} color="#aaa" /> : <ChevronDown size={13} color="#aaa" />}
        </div>
      </div>
      {open && (
        <div onClick={e => e.stopPropagation()}
          style={{ padding: "8px 12px 10px", borderTop: `1px solid ${reaktion.color}20`, background: `${reaktion.color}06` }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: reaktion.color, textTransform: "uppercase", marginBottom: 4 }}>Empfohlene Gegenmassnahme</p>
          <p style={{ fontSize: 11, color: "#333", lineHeight: 1.5 }}>{reaktion.gegenmassnahme}</p>
          <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
            {reaktion.tags.map(t => (
              <span key={t} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, background: "rgba(0,0,0,0.05)", color: "#666" }}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Strategos-Daten kumulieren für KI-Prompt ─────────────────────────────────
function buildStrategosKontext(scenario) {
  const ctx = scenario?.unternehmenskontext || {};
  const sit = scenario?.situationsanalyse || {};
  const ki  = scenario?.ki_analyse || {};
  const emp = scenario?.strategos_empfehlung || {};
  const mat = scenario?.szenario_matrix || {};

  const lines = [];

  // Schritt 1: Unternehmenskontext
  if (ctx.unternehmen_name) lines.push(`UNTERNEHMEN: ${ctx.unternehmen_name} (${ctx.rechtsform || ""}, ${ctx.branche || ""}, Umsatz: ${ctx.umsatz ? (ctx.umsatz/1e6).toFixed(1)+"Mio. "+(ctx.waehrung||"EUR") : "—"})`);
  if (ctx.sachverhalt_lang) lines.push(`SACHVERHALT: ${ctx.sachverhalt_lang.slice(0, 500)}`);
  if (ctx.gegner_name) lines.push(`GEGNER: ${ctx.gegner_name} (${ctx.gegner_rolle || "—"}) — ${ctx.gegner_info?.slice(0,200) || ""}`);
  if (ctx.zeitkritikalitaet != null) lines.push(`ZEITKRITIKALITÄT: ${ctx.zeitkritikalitaet}/10`);
  if (ctx.rechtsgebiete?.length) lines.push(`RECHTSGEBIETE: ${ctx.rechtsgebiete.join(", ")}`);

  // Schritt 2: Situationsanalyse
  if (sit.gesamt_risiko != null) lines.push(`GESAMTRISIKO (Schritt 2): ${sit.gesamt_risiko}/10`);
  if (sit.gesamt_exposure_eur) lines.push(`FINANZIELLE EXPOSURE: ${(sit.gesamt_exposure_eur/1e6).toFixed(1)} Mio. EUR`);
  if (sit.kritische_punkte?.length) lines.push(`KRITISCHE PUNKTE: ${sit.kritische_punkte.join(" | ")}`);
  if (sit.quantifizierung?.length) {
    lines.push(`QUANTIFIZIERUNGEN: ${sit.quantifizierung.slice(0,3).map(q => `${q.titel||""}: ${q.betrag_eur ? (q.betrag_eur/1e6).toFixed(1)+"Mio.€" : ""} [${q.wahrscheinlichkeit_pct||""}%]`).join(", ")}`);
  }

  // Schritt 3: Szenario-Matrix
  if (mat.szenarien?.length) {
    lines.push(`SZENARIEN (Schritt 3): ${mat.szenarien.slice(0,3).map(s => `${s.titel||s.name||""} [${s.empfehlung||""}]`).join(" | ")}`);
  }

  // Schritt 5: Handlungsoptionen
  if (ki.handlungsoptionen?.optionen?.length) {
    lines.push(`HANDLUNGSOPTIONEN (Schritt 5): ${ki.handlungsoptionen.optionen.slice(0,4).map(o => `${o.titel||o.name||""} (Erfolg: ${o.erfolgswahrscheinlichkeit||o.wahrscheinlichkeit_pct||"?"}%, Kosten: ${o.kosten_eur ? (o.kosten_eur/1e6).toFixed(1)+"Mio.€" : "—"})`).join(" | ")}`);
  }

  // Schritt 3/Vertragsanalyse: Klauseln
  if (ki.vertrags_analyse?.klauseln?.length) {
    const kritisch = ki.vertrags_analyse.klauseln.filter(k => k.risiko_stufe === "kritisch");
    const hoch = ki.vertrags_analyse.klauseln.filter(k => k.risiko_stufe === "hoch");
    if (kritisch.length) lines.push(`KRITISCHE KLAUSELN: ${kritisch.map(k => k.klausel_typ).join(", ")}`);
    if (hoch.length) lines.push(`HOHE-RISIKO-KLAUSELN: ${hoch.map(k => k.klausel_typ).join(", ")}`);
    if (ki.vertrags_analyse.gesamtbewertung) lines.push(`VERTRAGSBEWERTUNG: ${ki.vertrags_analyse.gesamtbewertung.slice(0,200)}`);
  }

  // Schritt 6: Quantitative Analyse
  if (ki.quant_analyse) {
    if (ki.quant_analyse.ev_gesamt != null) lines.push(`ERWARTUNGSWERT (EV): ${(ki.quant_analyse.ev_gesamt/1e6).toFixed(2)} Mio. EUR`);
    if (ki.quant_analyse.worst_case_eur) lines.push(`WORST CASE: ${(ki.quant_analyse.worst_case_eur/1e6).toFixed(1)} Mio. EUR`);
    if (ki.quant_analyse.best_case_eur) lines.push(`BEST CASE: ${(ki.quant_analyse.best_case_eur/1e6).toFixed(1)} Mio. EUR`);
    if (ki.quant_analyse.fazit) lines.push(`QUANT-FAZIT: ${ki.quant_analyse.fazit.slice(0,200)}`);
  }

  // Schritt 5: Strategos-Empfehlung
  if (emp.grundhaltung) lines.push(`STRATEGOS-GRUNDHALTUNG: ${emp.grundhaltung}`);
  if (emp.groesste_hebel?.length) lines.push(`GRÖSSTE HEBEL: ${emp.groesste_hebel.slice(0,3).join(" | ")}`);
  if (emp.groesste_risiken?.length) lines.push(`GRÖSSTE RISIKEN: ${emp.groesste_risiken.slice(0,3).join(" | ")}`);
  if (emp.sun_tzu?.length) lines.push(`SUN TZU: ${emp.sun_tzu.slice(0,2).map(s => s.prinzip||s.titel||"").join(" | ")}`);
  if (emp.machiavelli?.length) lines.push(`MACHIAVELLI: ${emp.machiavelli.slice(0,2).map(s => s.prinzip||s.titel||"").join(" | ")}`);

  // Schritt 7: Umsetzungsplan
  if (ki.umsetzungsplan?.massnahmen?.length) {
    lines.push(`UMSETZUNGSPLAN (Schritt 7): ${ki.umsetzungsplan.massnahmen.slice(0,3).map(m => `${m.titel||""} [${m.prioritaet||""}]`).join(" | ")}`);
  }

  return lines.join("\n");
}

// ─── KI-Analyse ───────────────────────────────────────────────────────────────
async function runKiAnalyse(scenario, selectedReaktionen, eigeneStrategie, prognose) {
  const reaktionTexte = selectedReaktionen.map(id => {
    const r = REAKTIONSMUSTER.find(r => r.id === id);
    return r ? `${r.label} (${r.modifier > 0 ? "+" : ""}${r.modifier}%): ${r.beschreibung}` : id;
  }).join("\n- ");
  const strategieText = EIGENE_STRATEGIEN.find(s => s.id === eigeneStrategie)?.label || "—";
  const strategosKontext = buildStrategosKontext(scenario);

  return base44.integrations.Core.InvokeLLM({
    prompt: `Du bist ein strategischer Prozess- und Vertragsberater auf Senior-Ebene. Führe eine vollständige Taktik-Simulation auf Basis ALLER vorliegenden Strategos-Analysedaten durch.

═══════════════════════════════════════
SZENARIO: ${scenario.title || "—"}
═══════════════════════════════════════
${strategosKontext || "Keine weiteren Strategos-Daten vorhanden."}

═══════════════════════════════════════
SIMULATION: Eigene Strategie & Gegnerische Reaktionsmuster
═══════════════════════════════════════
GEWÄHLTE EIGENE STRATEGIE: ${strategieText}
ERWARTETE GEGNERISCHE REAKTIONSMUSTER:
- ${reaktionTexte || "Keine gewählt"}
BERECHNETE AUSGANGS-ERFOLGSWAHRSCHEINLICHKEIT: ${prognose}%

═══════════════════════════════════════
AUFGABEN:
═══════════════════════════════════════
1. GESAMTBEWERTUNG: Bewerte die Strategiekombination unter Einbeziehung ALLER Strategos-Ergebnisse (Vertragsklauseln, Quantanalyse, Handlungsoptionen, Gegner-Info). Sei konkret, zahlenbasiert, schonungslos.
2. GEFÄHRLICHSTE KOMBINATION: Welche Reaktionsmuster-Kombination ist am gefährlichsten? Warum?
3. GEGENMASSNAMEN: Für jedes gewählte Reaktionsmuster: eine konkrete, umsetzbare taktische Gegenmaßnahme mit Dringlichkeit (hoch/mittel/niedrig).
4. HAUPTEMPFEHLUNG: Eine klare, handlungsorientierte Hauptempfehlung die alle Strategos-Daten berücksichtigt.
5. ERFOLGSFAKTOREN: 3 kritische Erfolgsfaktoren (konkret, bezogen auf diesen Fall).
6. HAUPTRISIKEN: 3 Hauptrisiken (konkret, mit Bezug auf Vertragsklauseln/Quant-Daten wo verfügbar).
7. DREHBUCH: Was passiert in 30, 90, 180 Tagen bei diesem Reaktionsprofil? Konkrete Ereignisse, nicht allgemein.
8. PROGNOSEKORREKTUR: Wie muss die taktische Erfolgswahrscheinlichkeit (${prognose}%) korrigiert werden? Zahl zwischen -20 und +20.
9. VERTRAGS-ERFOLGSWAHRSCHEINLICHKEIT: Berechne eine eigenständige Gesamt-Erfolgswahrscheinlichkeit des VERTRAGS/SZENARIOS (0-100%) auf Basis ALLER Strategos-Daten: Vertragsklauseln (Risikostufen, kritische Klauseln), Quantanalyse (EV, Worst/Best-Case), Situationsanalyse (Gesamtrisiko, Exposure), Handlungsoptionen (beste Erfolgswahrscheinlichkeit), Strategos-Empfehlung (Grundhaltung, Hebel), Umsetzungsplan. Dies ist UNABHÄNGIG von den Reaktionsmustern — eine reine Vertragsbewertung. Gib auch eine kurze Begründung (2-3 Sätze).`,
    response_json_schema: {
      type: "object",
      properties: {
        gesamt_bewertung: { type: "string" },
        gefaehrlichste_kombination: { type: "string" },
        empfehlungen_pro_reaktion: {
          type: "array",
          items: { type: "object", properties: {
            reaktion: { type: "string" },
            massnahme: { type: "string" },
            dringlichkeit: { type: "string" }
          }}
        },
        hauptempfehlung: { type: "string" },
        erfolgsfaktoren: { type: "array", items: { type: "string" } },
        hauptrisiken: { type: "array", items: { type: "string" } },
        drehbuch: { type: "object", properties: {
          t30: { type: "string" },
          t90: { type: "string" },
          t180: { type: "string" }
        }},
        prognose_korrektur: { type: "number" },
        prognose_begruendung: { type: "string" },
        vertrags_erfolg_pct: { type: "number" },
        vertrags_erfolg_begruendung: { type: "string" }
      }
    },
    model: "claude_sonnet_4_6"
  });
}

// ─── Hauptkomponente ───────────────────────────────────────────────────────────
export default function Step8TaktikSimulation({ scenario, onSave }) {
  const [selectedReaktionen, setSelectedReaktionen] = useState(
    scenario?.ki_analyse?.taktik_simulation?.selected_reaktionen || []
  );
  const [eigeneStrategie, setEigeneStrategie] = useState(
    scenario?.ki_analyse?.taktik_simulation?.eigene_strategie || "hybrid"
  );
  const [manuelleAnpassung, setManuelleAnpassung] = useState(
    scenario?.ki_analyse?.taktik_simulation?.manuelle_anpassung || 0
  );
  // kiResult sowohl als State (lokales Re-render) als auch aus scenario (nach Re-mount)
  const savedKiResult = scenario?.ki_analyse?.taktik_simulation?.ki_result || null;
  const [localKiResult, setLocalKiResult] = useState(null);
  const kiResult = localKiResult || savedKiResult;
  const [loading, setLoading] = useState(false);
  const [filterTag, setFilterTag] = useState("alle");

  const basisPrognose = useMemo(() => calcBasisPrognose(scenario), [scenario]);
  const prognose = useMemo(
    () => calcGesamtPrognose(basisPrognose, selectedReaktionen, eigeneStrategie, manuelleAnpassung),
    [basisPrognose, selectedReaktionen, eigeneStrategie, manuelleAnpassung]
  );
  const kiKorrigiertePrognose = kiResult?.prognose_korrektur != null
    ? Math.max(5, Math.min(97, prognose + kiResult.prognose_korrektur))
    : null;

  const toggleReaktion = (id) => {
    setSelectedReaktionen(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const TAGS = ["alle", "aggressiv", "defensiv", "kooperativ", "rechtlich", "passiv"];
  const filteredReaktionen = filterTag === "alle"
    ? REAKTIONSMUSTER
    : REAKTIONSMUSTER.filter(r => r.tags.includes(filterTag));

  const handleKiAnalyse = async () => {
    setLoading(true);
    try {
      const rawResult = await runKiAnalyse(scenario, selectedReaktionen, eigeneStrategie, prognose);
      // InvokeLLM mit response_json_schema gibt das Objekt direkt zurück
      const result = rawResult;
      // State ZUERST setzen, dann speichern — verhindert Verlust durch Re-mount
      setLocalKiResult(result);
      onSave({
        ki_analyse: {
          ...(scenario.ki_analyse || {}),
          taktik_simulation: {
            selected_reaktionen: selectedReaktionen,
            eigene_strategie: eigeneStrategie,
            manuelle_anpassung: manuelleAnpassung,
            ki_result: result,
          }
        }
      });
    } catch (err) {
      alert("KI-Analyse fehlgeschlagen: " + (err?.message || "Netzwerkfehler"));
    }
    setLoading(false);
  };

  const handleReset = () => {
    setSelectedReaktionen([]);
    setEigeneStrategie("hybrid");
    setManuelleAnpassung(0);
    setLocalKiResult(null);
  };

  const ctx = scenario?.unternehmenskontext || {};
  const sit = scenario?.situationsanalyse || {};
  const ki  = scenario?.ki_analyse || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif" }}>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#5856D6", letterSpacing: "0.15em", textTransform: "uppercase" }}>Schritt 8 · Strategos</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", marginTop: 4 }}>Taktik-Simulation</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Gegnerische Reaktionsmuster wählen · Erfolgswahrscheinlichkeit dynamisch berechnen</p>
      </div>

      {/* Kontext-Banner */}
      {(ctx.unternehmen_name || ctx.gegner_name) && (
        <div style={{ display: "flex", gap: 12, padding: "10px 14px", background: "rgba(88,86,214,0.06)", border: "1px solid rgba(88,86,214,0.15)", borderRadius: 12, flexWrap: "wrap" }}>
          {ctx.unternehmen_name && (
            <div><p style={{ fontSize: 9, color: "#5856D6", fontWeight: 700, textTransform: "uppercase" }}>Mandant</p><p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{ctx.unternehmen_name}</p></div>
          )}
          {ctx.gegner_name && (
            <div><p style={{ fontSize: 9, color: "#B81C3A", fontWeight: 700, textTransform: "uppercase" }}>Gegner</p><p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{ctx.gegner_name} · {ctx.gegner_rolle || "—"}</p></div>
          )}
          {sit.gesamt_risiko != null && (
            <div><p style={{ fontSize: 9, color: "#FF9500", fontWeight: 700, textTransform: "uppercase" }}>Gesamtrisiko</p><p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{sit.gesamt_risiko}/10</p></div>
          )}
          {ki.handlungsoptionen?.optionen?.length > 0 && (
            <div><p style={{ fontSize: 9, color: "#1DB954", fontWeight: 700, textTransform: "uppercase" }}>Optionen</p><p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{ki.handlungsoptionen.optionen.length} analysiert</p></div>
          )}
        </div>
      )}

      {/* ── Hauptbereich: 2-Spalten ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>

        {/* Linke Spalte: Reaktionsmuster + Strategie */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Eigene Strategie */}
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>A · Eigene Strategie wählen</p>
              <p style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>Bestimmt den Grundmodifikator deiner Erfolgswahrscheinlichkeit</p>
            </div>
            <div style={{ padding: "10px 14px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {EIGENE_STRATEGIEN.map(s => (
                <button key={s.id} onClick={() => setEigeneStrategie(s.id)}
                  style={{
                    padding: "7px 14px", borderRadius: 9, cursor: "pointer",
                    border: `2px solid ${eigeneStrategie === s.id ? s.color : "rgba(0,0,0,0.09)"}`,
                    background: eigeneStrategie === s.id ? `${s.color}12` : "#fafafa",
                    fontSize: 11, fontWeight: eigeneStrategie === s.id ? 700 : 500,
                    color: eigeneStrategie === s.id ? s.color : "#555",
                    transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5,
                  }}>
                  <span>{s.icon}</span> {s.label}
                  <span style={{ fontSize: 10, fontWeight: 800, color: s.modifier > 0 ? "#1DB954" : "#B81C3A" }}>
                    {s.modifier > 0 ? "+" : ""}{s.modifier}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Reaktionsmuster */}
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>B · Gegnerische Reaktionsmuster</p>
                <p style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>Mehrfachauswahl möglich — jedes Muster beeinflusst den Score</p>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {TAGS.map(t => (
                  <button key={t} onClick={() => setFilterTag(t)}
                    style={{
                      padding: "3px 9px", borderRadius: 6, fontSize: 10, cursor: "pointer",
                      background: filterTag === t ? "#5856D6" : "rgba(0,0,0,0.05)",
                      color: filterTag === t ? "#fff" : "#666",
                      border: "none", fontWeight: filterTag === t ? 700 : 400,
                    }}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
              {filteredReaktionen.map(r => (
                <ReaktionsCard key={r.id} reaktion={r} selected={selectedReaktionen.includes(r.id)} onToggle={toggleReaktion} />
              ))}
            </div>
          </div>

          {/* Manuelle Feineinstellung */}
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, padding: "12px 14px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>C · Manuelle Feineinstellung</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input type="range" min={-20} max={20} step={1} value={manuelleAnpassung}
                onChange={e => setManuelleAnpassung(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#5856D6" }} />
              <div style={{ minWidth: 52, textAlign: "center", padding: "5px 10px", borderRadius: 8, background: manuelleAnpassung >= 0 ? "rgba(29,185,84,0.1)" : "rgba(184,28,58,0.1)" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: manuelleAnpassung >= 0 ? "#1DB954" : "#B81C3A" }}>
                  {manuelleAnpassung > 0 ? "+" : ""}{manuelleAnpassung}%
                </span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              <span style={{ fontSize: 9, color: "#aaa" }}>−20% (schlechtere Beweislage)</span>
              <span style={{ fontSize: 9, color: "#aaa" }}>+20% (bessere Beweislage)</span>
            </div>
          </div>
        </div>

        {/* Rechte Spalte: Score-Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "sticky", top: 16 }}>

          {/* Haupt-Gauge */}
          <div style={{ background: "#fff", border: `2px solid ${scoreColor(prognose)}30`, borderRadius: 16, padding: "16px 14px", textAlign: "center" }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Erfolgswahrscheinlichkeit</p>
            <PrognoseGauge score={prognose} label="Gesamt-Score" />
            {kiKorrigiertePrognose != null && kiKorrigiertePrognose !== prognose && (
              <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(88,86,214,0.08)", borderRadius: 8 }}>
                <p style={{ fontSize: 9, color: "#5856D6", fontWeight: 700 }}>KI-korrigiert</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: "#5856D6" }}>{kiKorrigiertePrognose}%</p>
              </div>
            )}
          </div>

          {/* Basis-Score-Aufschlüsselung */}
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: "12px 13px" }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Score-Aufschlüsselung</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, color: "#666" }}>Basis (Strategos)</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{basisPrognose}%</span>
              </div>
              {eigeneStrategie && (() => {
                const s = EIGENE_STRATEGIEN.find(s => s.id === eigeneStrategie);
                return s ? (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, color: "#666" }}>Strategie</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.modifier >= 0 ? "#1DB954" : "#B81C3A" }}>
                      {s.modifier >= 0 ? "+" : ""}{s.modifier}%
                    </span>
                  </div>
                ) : null;
              })()}
              {selectedReaktionen.map(id => {
                const r = REAKTIONSMUSTER.find(r => r.id === id);
                return r ? (
                  <div key={id} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{r.icon} {r.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.modifier >= 0 ? "#1DB954" : "#B81C3A", flexShrink: 0 }}>
                      {r.modifier >= 0 ? "+" : ""}{r.modifier}%
                    </span>
                  </div>
                ) : null;
              })}
              {manuelleAnpassung !== 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "#666" }}>Manuell</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: manuelleAnpassung >= 0 ? "#1DB954" : "#B81C3A" }}>
                    {manuelleAnpassung >= 0 ? "+" : ""}{manuelleAnpassung}%
                  </span>
                </div>
              )}
              <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 5, marginTop: 3, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#1a1a1a" }}>Gesamt</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: scoreColor(prognose) }}>{prognose}%</span>
              </div>
            </div>
          </div>

          {/* KI-Analyse Button */}
          <div
            onClick={(!loading && selectedReaktionen.length > 0) ? handleKiAnalyse : undefined}
            style={{
              width: "100%", padding: "11px 0",
              background: loading ? "rgba(88,86,214,0.5)" : selectedReaktionen.length === 0 ? "rgba(0,0,0,0.06)" : "#5856D6",
              color: loading ? "#fff" : selectedReaktionen.length === 0 ? "#aaa" : "#fff",
              border: selectedReaktionen.length === 0 ? "1px solid rgba(0,0,0,0.1)" : "none",
              borderRadius: 10,
              cursor: loading || selectedReaktionen.length === 0 ? "not-allowed" : "pointer",
              fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              transition: "all 0.15s", userSelect: "none", boxSizing: "border-box",
            }}>
            <Sparkles size={14} color={selectedReaktionen.length === 0 ? "#aaa" : "#fff"} />
            {loading ? "KI analysiert…" : selectedReaktionen.length === 0 ? "Reaktionen wählen" : "KI-Taktikanalyse starten"}
          </div>

          <div onClick={handleReset}
            style={{ width: "100%", padding: "8px 0", background: "transparent", color: "#888", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 9, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, userSelect: "none", boxSizing: "border-box" }}>
            <RotateCcw size={11} color="#888" /> Simulation zurücksetzen
          </div>

          {selectedReaktionen.length > 0 && (
            <div style={{ padding: "9px 12px", background: "rgba(0,0,0,0.03)", borderRadius: 10 }}>
              <p style={{ fontSize: 9, color: "#888", fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Gewählte Muster</p>
              {selectedReaktionen.map(id => {
                const r = REAKTIONSMUSTER.find(r => r.id === id);
                return r ? (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                    <span style={{ fontSize: 14 }}>{r.icon}</span>
                    <span style={{ fontSize: 10, color: "#333" }}>{r.label}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── KI-Ergebnis ── */}
      {kiResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* ── Vertrags-Erfolgswahrscheinlichkeit (prominent, oben) ── */}
          {kiResult.vertrags_erfolg_pct != null && (
            <div style={{
              background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
              borderRadius: 16, padding: "20px 24px",
              display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
            }}>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Vertrags-Erfolgswahrscheinlichkeit</p>
                <PrognoseGauge score={kiResult.vertrags_erfolg_pct} label="KI-Bewertung" />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: scoreColor(kiResult.vertrags_erfolg_pct), flexShrink: 0 }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: scoreColor(kiResult.vertrags_erfolg_pct) }}>
                    {kiResult.vertrags_erfolg_pct >= 70 ? "Starke Ausgangsposition" : kiResult.vertrags_erfolg_pct >= 50 ? "Moderate Ausgangsposition" : "Schwache Ausgangsposition"}
                  </p>
                </div>
                {kiResult.vertrags_erfolg_begruendung && (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{kiResult.vertrags_erfolg_begruendung}</p>
                )}
                <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Taktisch (mit Reaktion)</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: scoreColor(kiKorrigiertePrognose ?? prognose) }}>{kiKorrigiertePrognose ?? prognose}%</p>
                  </div>
                  {kiResult.prognose_korrektur != null && (
                    <div>
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>KI-Korrektur</p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: kiResult.prognose_korrektur >= 0 ? "#1DB954" : "#B81C3A" }}>
                        {kiResult.prognose_korrektur >= 0 ? "+" : ""}{kiResult.prognose_korrektur}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Graphen-Block ── */}
          {(() => {
            const ki = scenario?.ki_analyse || {};
            const sit = scenario?.situationsanalyse || {};
            const emp = scenario?.strategos_empfehlung || {};

            // Radar-Daten: 6 Dimensionen der Gesamtlage
            const radarData = [
              { dim: "Vertragsrisiko", val: Math.max(0, 100 - ((ki.vertrags_analyse?.klauseln || []).filter(k => k.risiko_stufe === "kritisch").length * 15 + (ki.vertrags_analyse?.klauseln || []).filter(k => k.risiko_stufe === "hoch").length * 8)) },
              { dim: "Quant. Stärke", val: ki.quant_analyse?.ev_gesamt != null ? Math.min(100, Math.max(0, 50 + (ki.quant_analyse.ev_gesamt / 1e6) * 2)) : 50 },
              { dim: "Situationslage", val: sit.gesamt_risiko != null ? Math.max(0, 100 - sit.gesamt_risiko * 10) : 50 },
              { dim: "Handlungsoptionen", val: Math.min(100, (ki.handlungsoptionen?.optionen?.length || 0) * 20 + 20) },
              { dim: "Strateg. Position", val: emp.grundhaltung?.toLowerCase().includes("stark") ? 80 : emp.grundhaltung?.toLowerCase().includes("schwach") ? 30 : 55 },
              { dim: "Taktik-Score", val: prognose },
            ];

            // Balken-Daten: Reaktionsmuster-Auswirkungen
            const barData = selectedReaktionen.map(id => {
              const r = REAKTIONSMUSTER.find(r => r.id === id);
              return { name: r?.label?.slice(0, 14) || id, wert: r?.modifier || 0, color: r?.modifier >= 0 ? "#1DB954" : "#B81C3A" };
            });

            // Score-Vergleich: Basis vs Taktisch vs Vertraglich
            const compareData = [
              { name: "Basis\n(Strategos)", wert: basisPrognose, color: "#636366" },
              { name: "Taktisch\n(+Reaktion)", wert: prognose, color: scoreColor(prognose) },
              ...(kiKorrigiertePrognose != null ? [{ name: "KI-korrigiert", wert: kiKorrigiertePrognose, color: "#5856D6" }] : []),
              ...(kiResult.vertrags_erfolg_pct != null ? [{ name: "Vertraglich\n(KI)", wert: kiResult.vertrags_erfolg_pct, color: scoreColor(kiResult.vertrags_erfolg_pct) }] : []),
            ];

            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Radar: Strategische Gesamtlage */}
                <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, padding: "14px 12px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>Strategische Gesamtlage</p>
                  <p style={{ fontSize: 9, color: "#aaa", marginBottom: 10 }}>6 Dimensionen aus allen Strategos-Schritten</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(0,0,0,0.07)" />
                      <PolarAngleAxis dataKey="dim" tick={{ fontSize: 9, fill: "#888" }} />
                      <Radar dataKey="val" stroke="#5856D6" fill="#5856D6" fillOpacity={0.18} strokeWidth={2} dot={{ r: 3, fill: "#5856D6" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar: Score-Vergleich */}
                <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, padding: "14px 12px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>Erfolgswahrscheinlichkeit — Vergleich</p>
                  <p style={{ fontSize: 9, color: "#aaa", marginBottom: 10 }}>Basis · Taktisch · KI-korrigiert · Vertraglich</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={compareData} barCategoryGap="30%">
                      <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#888" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: "#aaa" }} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={v => [`${v}%`, "Score"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <ReferenceLine y={50} stroke="rgba(0,0,0,0.12)" strokeDasharray="4 3" />
                      <Bar dataKey="wert" radius={[5, 5, 0, 0]}>
                        {compareData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar: Reaktionsmuster-Einfluss (nur wenn gewählt) */}
                {barData.length > 0 && (
                  <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, padding: "14px 12px", gridColumn: "1 / -1" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>Reaktionsmuster — Auswirkung auf Score</p>
                    <p style={{ fontSize: 9, color: "#aaa", marginBottom: 10 }}>Positiv = erhöht Erfolgschance · Negativ = senkt Erfolgschance</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={barData} layout="vertical" barCategoryGap="25%">
                        <XAxis type="number" domain={[-35, 35]} tick={{ fontSize: 8, fill: "#aaa" }} tickFormatter={v => `${v > 0 ? "+" : ""}${v}%`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#555" }} width={90} />
                        <Tooltip formatter={v => [`${v > 0 ? "+" : ""}${v}%`, "Modifier"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <ReferenceLine x={0} stroke="rgba(0,0,0,0.2)" />
                        <Bar dataKey="wert" radius={[0, 4, 4, 0]}>
                          {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Gesamtbewertung */}
          <div style={{ background: "#fff", border: "1px solid rgba(88,86,214,0.2)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px 8px", background: "rgba(88,86,214,0.05)", borderBottom: "1px solid rgba(88,86,214,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={14} color="#5856D6" />
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>KI-Taktikanalyse</p>
              {kiResult.prognose_korrektur != null && (
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: kiResult.prognose_korrektur >= 0 ? "#1DB954" : "#B81C3A" }}>
                  KI-Korrektur: {kiResult.prognose_korrektur >= 0 ? "+" : ""}{kiResult.prognose_korrektur}%
                </span>
              )}
            </div>
            <div style={{ padding: "12px 14px" }}>
              <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.6 }}>{kiResult.gesamt_bewertung}</p>
              {kiResult.prognose_begruendung && (
                <p style={{ fontSize: 11, color: "#888", marginTop: 8, fontStyle: "italic" }}>{kiResult.prognose_begruendung}</p>
              )}
              {kiResult.gefaehrlichste_kombination && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(184,28,58,0.07)", border: "1px solid rgba(184,28,58,0.2)", borderRadius: 9 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#B81C3A", textTransform: "uppercase", marginBottom: 3 }}>⚠ Gefährlichste Kombination</p>
                  <p style={{ fontSize: 11, color: "#333" }}>{kiResult.gefaehrlichste_kombination}</p>
                </div>
              )}
            </div>
          </div>

          {/* Hauptempfehlung */}
          {kiResult.hauptempfehlung && (
            <div style={{ padding: "12px 14px", background: "rgba(29,185,84,0.07)", border: "2px solid rgba(29,185,84,0.25)", borderRadius: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#1DB954", textTransform: "uppercase", marginBottom: 4 }}>Hauptempfehlung</p>
              <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.5, fontWeight: 600 }}>{kiResult.hauptempfehlung}</p>
            </div>
          )}

          {/* 3-Spalten: Maßnahmen / Erfolgsfaktoren / Risiken */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {/* Maßnahmen pro Reaktion */}
            {kiResult.empfehlungen_pro_reaktion?.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "9px 13px 7px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>Gegenmaßnahmen pro Reaktion</p>
                </div>
                <div style={{ padding: "9px 13px", display: "flex", flexDirection: "column", gap: 7 }}>
                  {kiResult.empfehlungen_pro_reaktion.map((e, i) => (
                    <div key={i} style={{ padding: "7px 10px", background: "rgba(0,0,0,0.025)", borderRadius: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{e.reaktion}</p>
                        {e.dringlichkeit && (
                          <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4,
                            background: e.dringlichkeit === "hoch" ? "rgba(184,28,58,0.1)" : e.dringlichkeit === "mittel" ? "rgba(255,149,0,0.1)" : "rgba(29,185,84,0.1)",
                            color: e.dringlichkeit === "hoch" ? "#B81C3A" : e.dringlichkeit === "mittel" ? "#FF9500" : "#1DB954",
                            fontWeight: 700 }}>{e.dringlichkeit}</span>
                        )}
                      </div>
                      <p style={{ fontSize: 10, color: "#555", lineHeight: 1.4 }}>{e.massnahme}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Erfolgsfaktoren */}
            {kiResult.erfolgsfaktoren?.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid rgba(29,185,84,0.2)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "9px 13px 7px", borderBottom: "1px solid rgba(29,185,84,0.1)", background: "rgba(29,185,84,0.04)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>Kritische Erfolgsfaktoren</p>
                </div>
                <div style={{ padding: "9px 13px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {kiResult.erfolgsfaktoren.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <CheckCircle size={13} color="#1DB954" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 11, color: "#333", lineHeight: 1.4 }}>{f}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risiken */}
            {kiResult.hauptrisiken?.length > 0 && (
              <div style={{ background: "#fff", border: "1px solid rgba(184,28,58,0.2)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "9px 13px 7px", borderBottom: "1px solid rgba(184,28,58,0.1)", background: "rgba(184,28,58,0.04)" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>Hauptrisiken</p>
                </div>
                <div style={{ padding: "9px 13px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {kiResult.hauptrisiken.map((r, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <AlertTriangle size={13} color="#B81C3A" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 11, color: "#333", lineHeight: 1.4 }}>{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Prognose-Zeitstrahl ── */}
          <TaktikZeitstrahl
            scenario={scenario}
            prognose={kiKorrigiertePrognose ?? prognose}
            basisPrognose={basisPrognose}
            kiResult={kiResult}
          />

          {/* ── Taktik-Szenario-Vergleich ── */}
          <TaktikVergleich basisPrognose={basisPrognose} />

          {/* Szenario-Drehbuch */}
          {kiResult.drehbuch && (
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>Szenario-Drehbuch</p>
                <p style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>Prognostizierter Verlauf bei gewähltem Reaktionsprofil</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 0 }}>
                {[
                  { key: "t30", label: "30 Tage", color: "#FF3B30" },
                  { key: "t90", label: "90 Tage", color: "#FF9500" },
                  { key: "t180", label: "180 Tage", color: "#1DB954" },
                ].map(({ key, label, color }) => kiResult.drehbuch[key] && (
                  <div key={key} style={{ padding: "12px 14px", borderRight: "1px solid rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <p style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase" }}>{label}</p>
                    </div>
                    <p style={{ fontSize: 11, color: "#333", lineHeight: 1.5 }}>{kiResult.drehbuch[key]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}