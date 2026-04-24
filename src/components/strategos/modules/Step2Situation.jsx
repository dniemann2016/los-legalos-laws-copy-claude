import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Clock, Sparkles, Calculator, Link2 } from "lucide-react";
import { AppleCard, AppleButton, ApplePill, SF } from "../AppleCard";
import { RG_BY_KEY, RECHTSGEBIETE_VOLLSTAENDIG, JURISDIKTIONEN, SYSTEM_FORMELN } from "@/lib/strategosRechtsgebiete";

// RG_META aus vollständiger Wissensbasis + Fallback für unbekannte Schlüssel
const RG_META = new Proxy(
  Object.fromEntries(RECHTSGEBIETE_VOLLSTAENDIG.map(rg => [rg.key, { label: rg.label, color: rg.color, icon: rg.icon }])),
  { get: (target, key) => target[key] || { label: key, color: "#888", icon: "📋" } }
);

// Formel-Kontext für KI-Prompt (komprimiert)
const buildFormelContext = (rechtsgebiete) => {
  return rechtsgebiete.map(key => {
    const rg = RG_BY_KEY[key];
    if (!rg) return "";
    const formeln = (rg.formeln || []).map(f => `  • ${f.name}: ${f.formel}`).join("\n");
    const felder = (rg.pflichtfelder || []).slice(0, 5).join("; ");
    return `[${rg.label}]\nPflichtfelder: ${felder}\nFormeln:\n${formeln}`;
  }).filter(Boolean).join("\n\n");
};

function RiskRing({ score }) {
  const c = score >= 7 ? "#FF3B30" : score >= 4 ? "#FF9500" : "#34C759";
  const r = 23;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 56, height: 56 }}>
      <svg width={56} height={56}>
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={5} />
        <circle cx={28} cy={28} r={r} fill="none" stroke={c} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 10)}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "28px 28px", transition: "stroke-dashoffset 0.6s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: c }}>{score}</span>
        <span style={{ fontSize: 8, color: "#aaa" }}>/10</span>
      </div>
    </div>
  );
}

function ModulPanel({ m, onQuantify, loading }) {
  const meta = RG_META[m.rechtsgebiet] || { label: m.rechtsgebiet, color: "#888", icon: "📋" };
  const sc = m.risiko_score || 0;
  const col = sc >= 7 ? "#FF3B30" : sc >= 4 ? "#FF9500" : "#34C759";
  return (
    <AppleCard accentColor={meta.color}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, flex: 1 }}>
          <span style={{ fontSize: 24 }}>{meta.icon}</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{meta.label}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, boxShadow: `0 0 0 3px ${col}30` }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: col }}>
                {sc >= 7 ? "Sofortiger Handlungsbedarf" : sc >= 4 ? "Mittelfristig relevant" : "Kein akutes Risiko"}
              </span>
            </div>
          </div>
        </div>
        <RiskRing score={sc} />
      </div>

      {m.findings?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 5 }}>Findings</p>
          {m.findings.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "6px 10px", background: "rgba(0,0,0,0.025)", borderRadius: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, minWidth: 14 }}>{i + 1}.</span>
              <span style={{ fontSize: 12, color: "#333", lineHeight: 1.4 }}>{typeof f === "string" ? f : f.text}</span>
            </div>
          ))}
        </div>
      )}

      {m.fristen?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#FF9500", textTransform: "uppercase", marginBottom: 5 }}>⏰ Fristen</p>
          {m.fristen.map((f, i) => (
            <div key={i} style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
              <Clock style={{ width: 11, height: 11, color: "#FF9500" }} />
              <span style={{ color: "#1a1a1a", fontWeight: 600 }}>{f.datum || "—"}</span>
              <span style={{ color: "#666" }}>{f.beschreibung}</span>
            </div>
          ))}
        </div>
      )}

      {m.normen?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 5 }}>Relevante Normen</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {m.normen.map((n, i) => <ApplePill key={i} color={meta.color}>{n}</ApplePill>)}
          </div>
        </div>
      )}

      {m.querverbindungen?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#5856D6", textTransform: "uppercase", marginBottom: 5 }}>🔗 Querverbindungen</p>
          {m.querverbindungen.map((q, i) => (
            <div key={i} style={{ fontSize: 11, color: "#555", display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 3 }}>
              <Link2 style={{ width: 10, height: 10, color: "#5856D6", marginTop: 2 }} />
              <span>{q}</span>
            </div>
          ))}
        </div>
      )}

      {m.formel_ergebnisse?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#5856D6", textTransform: "uppercase", marginBottom: 5 }}>📐 Formel-Ergebnisse</p>
          {m.formel_ergebnisse.map((f, i) => (
            <div key={i} style={{ padding: "7px 10px", background: "rgba(88,86,214,0.06)", borderRadius: 8, marginBottom: 4, borderLeft: `3px solid ${meta.color}` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{f.formel_name}</p>
              <p style={{ fontSize: 12, color: "#1a1a1a", marginTop: 2, fontFamily: "monospace" }}>{f.ergebnis}</p>
              {f.interpretation && <p style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{f.interpretation}</p>}
            </div>
          ))}
        </div>
      )}

      {m.quantifizierung ? (
        <div style={{ padding: "10px 12px", background: "linear-gradient(135deg,rgba(88,86,214,0.08),rgba(0,122,255,0.08))", borderRadius: 10, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[["Eintritt", `${m.quantifizierung.eintritt_pct}%`], ["Schaden", `${(m.quantifizierung.schaden_eur || 0).toLocaleString()}€`], ["Reputation", m.quantifizierung.reputation], ["Präzedenz", m.quantifizierung.praezedenz]].map(([l, v]) => (
            <div key={l}>
              <p style={{ fontSize: 9, color: "#888", textTransform: "uppercase", fontWeight: 600 }}>{l}</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{v}</p>
            </div>
          ))}
        </div>
      ) : (
        <AppleButton onClick={() => onQuantify(m)} disabled={loading} variant="violet" icon={Calculator}>
          {loading ? "Berechnet…" : "Quantifizieren"}
        </AppleButton>
      )}
    </AppleCard>
  );
}

export default function Step2Situation({ scenario, onSave }) {
  const ctx = scenario.unternehmenskontext || {};
  const rechtsgebiete = ctx.rechtsgebiete || [];
  const [sit, setSit] = useState(scenario.situationsanalyse || { module: [] });
  const [analyzing, setAnalyzing] = useState(false);
  const [qId, setQId] = useState(null);

  const run = async () => {
    setAnalyzing(true);
    const formelContext = buildFormelContext(rechtsgebiete);
    const jurisdiktionsHinweise = (ctx.operative_maerkte || [])
      .filter(m => JURISDIKTIONEN[m])
      .map(m => `${m}: ${(JURISDIKTIONEN[m]?.besonderheiten || []).slice(0, 3).join(" | ")}`)
      .join("\n");

    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist Senior-Partner einer internationalen Großkanzlei mit Expertise in allen 17+ Rechtsgebieten. Führe eine vollständige, mehrdimensionale Risikoanalyse durch.

═══ MANDANT ═══
Unternehmen: ${ctx.unternehmen_name} (${ctx.rechtsform}, ${ctx.branche}${ctx.branche_freitext ? " / " + ctx.branche_freitext : ""})
Umsatz: ${ctx.umsatz ? (ctx.umsatz/1000000).toFixed(1) + " Mio." : "—"}€ | Mitarbeiter: ${ctx.mitarbeiter || "—"}
Hauptsitz: ${ctx.hauptsitz_land}, ${ctx.hauptsitz_stadt || ""}
Operative Märkte: ${(ctx.operative_maerkte || []).join(", ") || "—"}
Gegner: ${ctx.gegner_name || "—"} (${ctx.gegner_rolle || "—"})
Gegner-Info: ${ctx.gegner_info || "—"}

═══ SITUATION ═══
Typ: ${ctx.situationstyp || "—"} | Zeitkritikalität: ${ctx.zeitkritikalitaet || 5}/10
Sachverhalt: ${ctx.sachverhalt_lang || "—"}

═══ ZU ANALYSIERENDE RECHTSGEBIETE ═══
${rechtsgebiete.join(", ")}

═══ RECHTSGEBIETS-WISSENSBASIS (Pflichtfelder & Formeln) ═══
${formelContext}

${jurisdiktionsHinweise ? `═══ JURISDIKTIONS-BESONDERHEITEN ═══\n${jurisdiktionsHinweise}` : ""}

═══ SYSTEMFORMELN (übergreifend) ═══
Gesamtrisiko-Erwartungswert: ${SYSTEM_FORMELN.gesamtrisiko}
Wechselwirkungen: ${SYSTEM_FORMELN.wechselwirkung}

═══ ANALYSEAUFTRAG ═══
Für JEDES Rechtsgebiet:
1. risiko_score (0–10): präzise Bewertung unter Verwendung der Pflichtfelder und Formeln des jeweiligen Gebiets
2. findings (4–6 Punkte): konkret, mit §§ und Normen — NICHT allgemein. Verwende die Pflichtfelder als Checkliste.
3. fristen: exakte Datum/Zeitangaben mit gesetzlicher Grundlage
4. normen: konkrete §§, Richtlinien, Verordnungen (z.B. § 4h EStG, Art. 101 AEUV, § 87 BetrVG)
5. querverbindungen: Wechselwirkungen mit anderen aktiven Rechtsgebieten (z.B. "Kartellrecht-Aspekte der M&A-Transaktion")
6. formel_ergebnisse: Wende ALLE relevanten Formeln des Rechtsgebiets rechnerisch an — mit konkreten Zahlenergebnissen wenn Input-Daten verfügbar

Gesamtbewertung: gesamt_risiko, kritische_punkte (Top-3 mit konkreter Handlungsempfehlung), gesamt_exposure_eur (berechnet), zeitachse (Entscheidungspunkte mit Datum/Zeitraum).`,
      response_json_schema: {
        type: "object",
        properties: {
          module: { type: "array", items: { type: "object", properties: {
            rechtsgebiet: { type: "string" },
            risiko_score: { type: "number" },
            findings: { type: "array", items: { type: "string" } },
            fristen: { type: "array", items: { type: "object", properties: { datum: { type: "string" }, beschreibung: { type: "string" } } } },
            normen: { type: "array", items: { type: "string" } },
            querverbindungen: { type: "array", items: { type: "string" } },
            formel_ergebnisse: { type: "array", items: { type: "object", properties: {
              formel_name: { type: "string" },
              ergebnis: { type: "string" },
              interpretation: { type: "string" }
            }}}
          }}},
          gesamt_risiko: { type: "number" },
          kritische_punkte: { type: "array", items: { type: "string" } },
          gesamt_exposure_eur: { type: "number" },
          zeitachse: { type: "array", items: { type: "object", properties: { wann: { type: "string" }, was_muss_entschieden_sein: { type: "string" } } } },
          jurisdiktions_warnungen: { type: "array", items: { type: "string" } }
        }
      },
      model: "claude_sonnet_4_6"
    });
    setSit(r);
    await onSave({ situationsanalyse: r });
    setAnalyzing(false);
  };

  const quantify = async (m) => {
    setQId(m.rechtsgebiet);
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Quantifiziere das Risiko für ${m.rechtsgebiet}.
Unternehmen: ${ctx.unternehmen_name}, Umsatz ${ctx.umsatz}€
Findings: ${(m.findings || []).join(" | ")}
Normen: ${(m.normen || []).join(", ")}
Berechne: eintritt_pct(%), schaden_eur(€), reputation(gering/mittel/hoch/existenziell), praezedenz(nur_dieser_fall/alle_aehnlichen).`,
      response_json_schema: {
        type: "object",
        properties: {
          eintritt_pct: { type: "number" },
          schaden_eur: { type: "number" },
          reputation: { type: "string" },
          praezedenz: { type: "string" }
        }
      }
    });
    const u = { ...sit, module: sit.module.map(x => x.rechtsgebiet === m.rechtsgebiet ? { ...x, quantifizierung: r } : x) };
    setSit(u);
    await onSave({ situationsanalyse: u });
    setQId(null);
  };

  const has = sit.module?.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, ...SF }}>
      <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#FF9500", letterSpacing: "0.15em", textTransform: "uppercase" }}>Schritt 2 · Enterprise</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", marginTop: 4 }}>Situationsanalyse</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>KI-Tiefenanalyse pro Rechtsgebiet</p>
      </div>

      {has && (
        <AppleCard title="KI-Gesamtbewertung" accentColor="#FF3B30">
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 16, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <RiskRing score={sit.gesamt_risiko || 0} />
              <p style={{ fontSize: 10, color: "#888", marginTop: 4, fontWeight: 600 }}>Gesamt</p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>Top-3 Kritisch</p>
              {(sit.kritische_punkte || []).slice(0, 3).map((p, i) => (
                <p key={i} style={{ fontSize: 12, color: "#1a1a1a", marginBottom: 3, display: "flex", gap: 6 }}>
                  <AlertTriangle style={{ width: 11, height: 11, color: "#FF3B30", flexShrink: 0, marginTop: 2 }} />
                  <span>{p}</span>
                </p>
              ))}
            </div>
            {sit.gesamt_exposure_eur > 0 && (
              <div style={{ padding: "13px 15px", background: "rgba(255,59,48,0.08)", borderRadius: 12, textAlign: "center" }}>
                <p style={{ fontSize: 10, color: "#FF3B30", fontWeight: 700, textTransform: "uppercase" }}>Gesamt-Exposure</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#FF3B30", marginTop: 2 }}>{(sit.gesamt_exposure_eur / 1000000).toFixed(1)}M€</p>
              </div>
            )}
          </div>
          {sit.zeitachse?.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 7 }}>Zeitachse</p>
              {sit.zeitachse.map((z, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "5px 10px", background: "rgba(0,0,0,0.025)", borderRadius: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#FF9500", minWidth: 80 }}>{z.wann}</span>
                  <span style={{ fontSize: 11, color: "#333" }}>{z.was_muss_entschieden_sein}</span>
                </div>
              ))}
            </div>
          )}
          {sit.jurisdiktions_warnungen?.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#5856D6", textTransform: "uppercase", marginBottom: 7 }}>🌍 Jurisdiktions-Besonderheiten</p>
              {sit.jurisdiktions_warnungen.map((w, i) => (
                <div key={i} style={{ fontSize: 11, color: "#555", padding: "4px 10px", background: "rgba(88,86,214,0.06)", borderRadius: 7, marginBottom: 3 }}>
                  {w}
                </div>
              ))}
            </div>
          )}
        </AppleCard>
      )}

      <AppleCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{has ? "Analyse aktualisieren" : "Analyse starten"}</p>
            <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{rechtsgebiete.length} Rechtsgebiet{rechtsgebiete.length !== 1 ? "e" : ""} · Claude Sonnet</p>
          </div>
          <AppleButton onClick={run} disabled={analyzing || rechtsgebiete.length === 0} variant="warning" icon={Sparkles}>
            {analyzing ? "Analysiert…" : has ? "Neu analysieren" : "KI-Analyse starten"}
          </AppleButton>
        </div>
        {rechtsgebiete.length === 0 && <p style={{ marginTop: 8, fontSize: 11, color: "#FF3B30" }}>⚠ Bitte in Schritt 1 Rechtsgebiete wählen.</p>}
      </AppleCard>

      {sit.module?.map((m, i) => (
        <ModulPanel key={i} m={m} onQuantify={quantify} loading={qId === m.rechtsgebiet} />
      ))}
    </div>
  );
}