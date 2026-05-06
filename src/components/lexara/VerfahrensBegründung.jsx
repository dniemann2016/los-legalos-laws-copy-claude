/**
 * VerfahrensBegründung.jsx
 *
 * Zeigt bei sensiblen Rechtsgebieten (Strafrecht, Sexualdelikte,
 * politisch / gesellschaftlich brisante Fälle) eine strukturierte
 * Begründungspflicht-Box an.
 *
 * Enthält:
 *  - Automatische Erkennung des Rechtsgebiets & Falltyps
 *  - KI-generierte Begründung warum so verfahren wird
 *  - Risikohinweise (Eidesstattl. Erklärungen, Zeugenaussagen, etc.)
 *  - Juristische Grundlage (§§ StPO, EMRK, GG)
 */

import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, ShieldAlert, Sparkles, ChevronDown, ChevronUp, FileText, Scale, Eye, Users } from "lucide-react";

// ── Typen sensibler Fälle ─────────────────────────────────────────────────────
const SENSIBLE_GEBIETE = [
  "Strafrecht",
  "strafrecht",
  "Sexualdelikt",
  "sexualdelikt",
  "Hebephilie",
  "Pädophilie",
  "Körperverletzung",
  "Totschlag",
  "Mord",
  "Betrug",
  "Corona",
  "COVID",
  "Pandemie",
  "Maßnahmen",
  "Impfpflicht",
  "Verschwörung",
  "Terrorismus",
  "Whistleblower",
  "Korruption",
];

const FALLTYP_RISIKEN = {
  sexualdelikt: {
    icon: "⚠️",
    label: "Sexualdelikt / Sittlichkeitsdelikt",
    color: "#B81C3A",
    risiken: [
      "Eidesstattliche Erklärungen (§ 156 StGB) — Falschaussage strafbar",
      "Gefahr der Zeugeneinflussnahme (§ 258 StGB Strafvereitelung)",
      "Glaubwürdigkeitsgutachten oft notwendig (BGH-Kriterien)",
      "Aussage-gegen-Aussage-Konstellation — hohe Beweisanforderungen",
      "Opferschutzrecht (§§ 68a ff. StPO): Zeugen dürfen nicht konfrontiert werden",
    ],
    normen: ["§ 177 StGB", "§ 184b StGB", "§ 68a StPO", "§ 156 StGB", "Art. 6 EMRK"],
    begruendungspflicht: "Bei Sexualdelikten ist die Verfahrensführung besonders zu begründen, da Aussagen oft ohne weitere Beweise stehen. Jede Verfahrenshandlung (insb. Konfrontation, Eidesstattl. Erklärungen) muss verhältnismäßig und dokumentiert sein.",
  },
  massnahmen: {
    icon: "🦠",
    label: "Corona / Pandemiemaßnahmen / Staatliche Eingriffe",
    color: "#FF9500",
    risiken: [
      "Grundrechtskonflikte (Art. 2, 8, 11 GG) — Verhältnismäßigkeit prüfen",
      "Rückwirkende Änderungen der Rechtslage (IfSG-Novellen)",
      "Beweisprobleme bei behördlichen Ermessensfehlern",
      "Politische Brisanz — Sachverständige kritisch würdigen",
      "Verjährungsfristen bei staatlichen Schäden beachten",
    ],
    normen: ["Art. 2 GG", "Art. 8 GG", "§§ 28 ff. IfSG", "§ 113 BGB", "VwGO"],
    begruendungspflicht: "Staatliche Maßnahmen während Ausnahmelagen erfordern besondere Verhältnismäßigkeitsprüfung. Die gewählte Verfahrensstrategie muss dokumentieren, warum bestimmte Schritte (Klage, Widerspruch, Eilantrag) gewählt werden.",
  },
  strafrecht: {
    icon: "⚖️",
    label: "Allgemeines Strafrecht",
    color: "#5856D6",
    risiken: [
      "Unschuldsvermutung (Art. 6 II EMRK) — dokumentieren",
      "In dubio pro reo — Beweislast liegt bei Staatsanwaltschaft",
      "Pflichtverteidigung prüfen (§ 140 StPO)",
      "Beschleunigungsgebot in Haftsachen",
      "Beweisverwertungsverbote (§ 136a StPO) identifizieren",
    ],
    normen: ["Art. 6 EMRK", "Art. 103 GG", "§ 136 StPO", "§ 140 StPO", "§ 244 StPO"],
    begruendungspflicht: "Strafrechtliche Verfahren erfordern lückenlose Dokumentation aller Verfahrensschritte. Die gewählte Verteidigungsstrategie muss begründet und für den Mandanten nachvollziehbar festgehalten werden.",
  },
};

function erkenneTyp(caseData) {
  const felder = [
    caseData?.rechtsgebiet || "",
    caseData?.fallname || "",
    caseData?.zentrale_rechtsfrage || "",
    caseData?.notes || "",
    caseData?.prozessziel || "",
  ].join(" ").toLowerCase();

  if (
    felder.includes("hebephil") || felder.includes("pädophil") ||
    felder.includes("sexuell") || felder.includes("missbrauch") ||
    felder.includes("vergewaltig") || felder.includes("§ 177") ||
    felder.includes("184") || felder.includes("sittlich")
  ) return "sexualdelikt";

  if (
    felder.includes("corona") || felder.includes("covid") ||
    felder.includes("pandemi") || felder.includes("maßnahmen") ||
    felder.includes("impfpflicht") || felder.includes("lockdown") ||
    felder.includes("infektionsschutz")
  ) return "massnahmen";

  if (
    felder.includes("strafrecht") || felder.includes("straftat") ||
    felder.includes("strafverfahr") || felder.includes("beschuldig") ||
    felder.includes("anklag") || felder.includes("verurteilt") ||
    felder.includes("freiheitsstrafe") || felder.includes("§ 2") ||
    felder.includes("stgb")
  ) return "strafrecht";

  return null;
}

function istSensibel(caseData) {
  const felder = [
    caseData?.rechtsgebiet || "",
    caseData?.fallname || "",
    caseData?.zentrale_rechtsfrage || "",
  ].join(" ");
  return SENSIBLE_GEBIETE.some(s => felder.toLowerCase().includes(s.toLowerCase()));
}

export default function VerfahrensBegründung({ caseData, caseId }) {
  const [expanded, setExpanded] = useState(false);
  const [kiText, setKiText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const typ = erkenneTyp(caseData);
  const sensibel = istSensibel(caseData);

  if (!typ && !sensibel) return null;

  const meta = FALLTYP_RISIKEN[typ] || {
    icon: "⚠️",
    label: "Sensibler Fall",
    color: "#FF9500",
    risiken: ["Besondere Sorgfaltspflicht des Anwalts", "Dokumentationspflicht erhöht"],
    normen: ["Art. 6 EMRK", "Art. 103 GG"],
    begruendungspflicht: "Dieser Fall weist besondere Merkmale auf, die eine erhöhte Dokumentation und Begründung der Verfahrensschritte erfordern.",
  };

  const generiereKIBegruendung = async () => {
    setLoading(true);
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein Senior-Strafverteidiger / Fachanwalt. Erstelle eine strukturierte anwaltliche Begründung, WARUM in diesem Fall so verfahren wird und welche Schritte besonders begründungsbedürftig sind.

Fall: ${caseData.fallname}
Rechtsgebiet: ${caseData.rechtsgebiet || "—"}
Typ: ${meta.label}
Zentrale Rechtsfrage: ${caseData.zentrale_rechtsfrage || "—"}
Prozessziel: ${caseData.prozessziel || "—"}
Status: ${caseData.status || "—"}

Erkannte Risiken: ${meta.risiken.join(", ")}

Erstelle:
1. VERFAHRENSBEGRÜNDUNG: Warum wird so verfahren? (3-5 Sätze, juristisch präzise)
2. KRITISCHE VERFAHRENSHANDLUNGEN: Was erfordert besondere Begründung?
   - Eidesstattliche Erklärungen: Wann zulässig, wann riskant?
   - Zeugenaussagen: Wie sichern ohne Einflussnahme?
   - Beweiserhebung: Welche Risiken?
3. DOKUMENTATIONSPFLICHTEN: Was muss zwingend aktenkundig gemacht werden?
4. EMPFEHLUNG: Konkrete nächste Schritte

Sprache: Deutsch, anwaltlich-präzise, sachlich.`,
      response_json_schema: {
        type: "object",
        properties: {
          verfahrensbegruendung: { type: "string" },
          kritische_handlungen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                handlung: { type: "string" },
                risiko: { type: "string" },
                empfehlung: { type: "string" }
              }
            }
          },
          dokumentationspflichten: { type: "array", items: { type: "string" } },
          empfehlung: { type: "string" }
        }
      },
      model: "claude_sonnet_4_6"
    });
    setKiText(r);
    setLoading(false);
    setShowFull(true);
  };

  return (
    <div style={{
      border: `1.5px solid ${meta.color}40`,
      borderRadius: 14,
      overflow: "hidden",
      background: `${meta.color}06`,
      marginBottom: 20,
      fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif"
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
          borderBottom: expanded ? `1px solid ${meta.color}20` : "none",
          background: `${meta.color}08`,
        }}>
        <ShieldAlert style={{ width: 16, height: 16, color: meta.color, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: meta.color, margin: 0 }}>
            {meta.icon} Begründungspflichtige Verfahrensführung — {meta.label}
          </p>
          <p style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
            Dieser Fall erfordert dokumentierte Begründung aller Verfahrensschritte
          </p>
        </div>
        {expanded
          ? <ChevronUp style={{ width: 14, height: 14, color: "#aaa" }} />
          : <ChevronDown style={{ width: 14, height: 14, color: "#aaa" }} />}
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Begründungspflicht-Box */}
          <div style={{ padding: "11px 14px", background: "#fff", border: `1px solid ${meta.color}20`, borderRadius: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: meta.color, textTransform: "uppercase", marginBottom: 5 }}>
              <Scale style={{ width: 11, height: 11, display: "inline", marginRight: 4 }} />
              Begründungspflicht
            </p>
            <p style={{ fontSize: 12, color: "#333", lineHeight: 1.6 }}>{meta.begruendungspflicht}</p>
          </div>

          {/* Normen */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>
              <FileText style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />
              Anwendbare Normen
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {meta.normen.map((n, i) => (
                <span key={i} style={{ fontSize: 10, padding: "3px 8px", background: `${meta.color}10`, border: `1px solid ${meta.color}25`, borderRadius: 6, fontFamily: "monospace", color: meta.color, fontWeight: 600 }}>
                  {n}
                </span>
              ))}
            </div>
          </div>

          {/* Risiken */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>
              <AlertTriangle style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />
              Besondere Risiken & Fallstricke
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {meta.risiken.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "7px 10px", background: "rgba(0,0,0,0.025)", borderRadius: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 10, color: meta.color, flexShrink: 0, marginTop: 1 }}>▪</span>
                  <span style={{ fontSize: 11, color: "#444", lineHeight: 1.4 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* KI-Begründung */}
          {!kiText ? (
            <div
              onClick={loading ? undefined : generiereKIBegruendung}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px",
                background: loading ? "rgba(0,0,0,0.04)" : `${meta.color}10`,
                border: `1px solid ${loading ? "rgba(0,0,0,0.08)" : meta.color + "30"}`,
                borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.15s"
              }}>
              <Sparkles style={{ width: 14, height: 14, color: loading ? "#aaa" : meta.color }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: loading ? "#aaa" : meta.color }}>
                  {loading ? "KI erstellt Verfahrensbegründung…" : "KI-Verfahrensbegründung generieren"}
                </p>
                <p style={{ fontSize: 10, color: "#999", marginTop: 1 }}>
                  Warum wird so verfahren? Eidesstattl. Erklärungen, Zeugenrisiken, Dokumentationspflichten
                </p>
              </div>
            </div>
          ) : (
            <div style={{ background: "#fff", border: `1px solid ${meta.color}20`, borderRadius: 11, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${meta.color}10`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>
                  <Sparkles style={{ width: 11, height: 11, display: "inline", marginRight: 5, color: meta.color }} />
                  KI-Verfahrensbegründung
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setShowFull(!showFull)} style={{ fontSize: 10, color: "#888", background: "transparent", border: "none", cursor: "pointer" }}>
                    {showFull ? "Einklappen" : "Ausklappen"}
                  </button>
                  <button onClick={generiereKIBegruendung} disabled={loading} style={{ fontSize: 10, color: meta.color, background: "transparent", border: "none", cursor: "pointer" }}>
                    ↺ Neu
                  </button>
                </div>
              </div>

              {showFull && (
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Verfahrensbegründung */}
                  {kiText.verfahrensbegruendung && (
                    <div style={{ padding: "10px 13px", background: `${meta.color}06`, borderRadius: 9, borderLeft: `3px solid ${meta.color}` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: meta.color, textTransform: "uppercase", marginBottom: 5 }}>Verfahrensbegründung</p>
                      <p style={{ fontSize: 12, color: "#333", lineHeight: 1.6 }}>{kiText.verfahrensbegruendung}</p>
                    </div>
                  )}

                  {/* Kritische Handlungen */}
                  {kiText.kritische_handlungen?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 7 }}>
                        <Eye style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />
                        Kritische Verfahrenshandlungen
                      </p>
                      {kiText.kritische_handlungen.map((h, i) => (
                        <div key={i} style={{ border: `1px solid rgba(0,0,0,0.06)`, borderRadius: 9, overflow: "hidden", marginBottom: 6 }}>
                          <div style={{ padding: "8px 11px", background: "rgba(0,0,0,0.025)" }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{h.handlung}</p>
                          </div>
                          <div style={{ padding: "8px 11px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div>
                              <p style={{ fontSize: 9, fontWeight: 700, color: "#B81C3A", textTransform: "uppercase", marginBottom: 3 }}>Risiko</p>
                              <p style={{ fontSize: 11, color: "#B81C3A" }}>{h.risiko}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 9, fontWeight: 700, color: "#1DB954", textTransform: "uppercase", marginBottom: 3 }}>Empfehlung</p>
                              <p style={{ fontSize: 11, color: "#1DB954" }}>{h.empfehlung}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dokumentationspflichten */}
                  {kiText.dokumentationspflichten?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>
                        <FileText style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />
                        Dokumentationspflichten
                      </p>
                      {kiText.dokumentationspflichten.map((d, i) => (
                        <div key={i} style={{ fontSize: 11, color: "#444", padding: "5px 10px", background: "rgba(0,0,0,0.025)", borderRadius: 7, marginBottom: 4, display: "flex", gap: 7 }}>
                          <span style={{ color: "#1DB954", flexShrink: 0 }}>✓</span>
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empfehlung */}
                  {kiText.empfehlung && (
                    <div style={{ padding: "10px 13px", background: "rgba(29,185,84,0.06)", borderRadius: 9, borderLeft: "3px solid #1DB954" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#1DB954", textTransform: "uppercase", marginBottom: 4 }}>Nächste Schritte</p>
                      <p style={{ fontSize: 12, color: "#333", lineHeight: 1.5 }}>{kiText.empfehlung}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}