import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Calculator, TrendingUp, AlertTriangle } from "lucide-react";
import { AppleCard, AppleButton, AppleField, AppleInput, SF } from "../AppleCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

const SF_FONT = { fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif" };
const TOOLTIP_STYLE = { borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 8px 28px rgba(0,0,0,0.12)", fontSize: 12, fontFamily: SF_FONT.fontFamily, background: "#fff", padding: "8px 14px" };

function GaugeMini({ value, max = 100, color, label }) {
  const r = 20, circ = 2 * Math.PI * r;
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={48} height={48}>
        <circle cx={24} cy={24} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={5} />
        <circle cx={24} cy={24} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "24px 24px" }} />
      </svg>
      <p style={{ fontSize: 11, fontWeight: 800, color, marginTop: -38, lineHeight: "48px", position: "relative" }}>{Math.round(value)}</p>
      <p style={{ fontSize: 9, color: "#888", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>{label}</p>
    </div>
  );
}

export default function Step5QuantitativeAnalyse({ scenario, onSave }) {
  const ctx = scenario.unternehmenskontext || {};
  const sit = scenario.situationsanalyse || {};
  const opts = scenario.ki_analyse?.handlungsoptionen || {};
  const [fin, setFin] = useState(scenario.finanzdaten || {});
  const [result, setResult] = useState(scenario.ki_analyse?.quant_analyse || null);
  const [analysing, setAnalysing] = useState(false);

  const saveFin = (k, v) => {
    const n = { ...fin, [k]: v };
    setFin(n);
    onSave({ finanzdaten: n });
  };

  const runAnalysis = async () => {
    setAnalysing(true);
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist Quantitativer Risikoanalyst und Senior-Anwalt für Wirtschaftsrecht. Führe eine vollständige quantitative Kosten-Nutzen-Analyse durch.

UNTERNEHMENSKONTEXT:
Unternehmen: ${ctx.unternehmen_name} (${ctx.rechtsform}), Umsatz: ${ctx.umsatz ? (ctx.umsatz/1e6).toFixed(1)+"Mio.€" : "—"}
Märkte: ${(ctx.operative_maerkte || []).join(", ")}
Sachverhalt: ${ctx.sachverhalt_lang || "—"}
Rechtsgebiete: ${(ctx.rechtsgebiete || []).join(", ")}

FINANZEINGABEN:
${Object.entries(fin).filter(([,v]) => v).map(([k, v]) => `${k}: ${typeof v === "number" ? v.toLocaleString()+"€" : v}`).join("\n") || "Keine manuellen Eingaben"}

HANDLUNGSOPTIONEN:
Option A: ${JSON.stringify(scenario.option_a || opts.option_a || {}).slice(0, 400)}
Option B: ${JSON.stringify(scenario.option_b || opts.option_b || {}).slice(0, 400)}
Option C: ${JSON.stringify(scenario.option_c || opts.option_c || {}).slice(0, 400)}

RISIKOANALYSE: Gesamt-Risiko ${sit.gesamt_risiko || "—"}/10, Exposure ${sit.gesamt_exposure_eur ? (sit.gesamt_exposure_eur/1e6).toFixed(1)+"Mio.€" : "—"}

${scenario.ki_kontext?.ki_briefing ? `════ KI-BASIS-BRIEFING (aus Dokumenten-Analyse) ════\n${String(scenario.ki_kontext.ki_briefing).slice(0, 600)}\n` : ""}
BERECHNE:

1. EXPECTED VALUE (EV) pro Option: wahrscheinlichkeitsgewichteter Nettoertrag
   Formel: EV = P(Erfolg) × Ertrag_Erfolg + P(Misserfolg) × Verlust_Misserfolg

2. RISIKOADJUSTIERTER WERT (RAV): EV - Risikopuffer
   
3. DOWNSIDE RISK: Worst-Case-Verlust bei 95% Konfidenz

4. RISIKOPRIORITÄTSZAHL (RPN): Eintrittswahrscheinlichkeit × Schadenshöhe × Entdeckbarkeit (je 1-10)

5. MONTE-CARLO-SIMULATION: 3 Szenarien (optimistisch/base/pessimistisch) mit Wahrscheinlichkeiten

6. BREAK-EVEN-ANALYSE: Wann wird welche Option rentabel?

7. SENSITIVITÄTSANALYSE: Welcher Parameter hat den größten Einfluss? (Tornado-Diagramm Daten)

8. INDIREKTE KOSTEN: Reputationsschaden, Managementaufwand, Produktionsverzögerung, regulatorische Auflagen (häufig höher als direkte Kosten!)

RECHTLICHE BUSSGELDER / RISIKEN (als Worst-Case einpreisen):
- Kartellrecht: bis 10% weltweiter Konzernumsatz (§ 81 Abs. 4 GWB)
- DSGVO: bis 20 Mio.€ oder 4% Umsatz (Art. 83 DSGVO)
- Steuern: Zinsen 1,8% p.a. nach § 233a AO, Festsetzungsfristen 4/5/10 Jahre (§§ 169 ff. AO)
- Patentrecht: entgangener Gewinn / Lizenzanalogie / Verletzergewinn (§ 139 PatG)
- Schiedsverfahren: ICC/DIS-Gebühren nach Streitwert
- Bonusregelung/Kronzeuge: vollständige Bußgeldfreistellung möglich

${ctx.umsatz ? `Umsatz für Bußgeldberechnung: ${(ctx.umsatz/1e6).toFixed(1)}Mio.€ → Kartellrechts-Bußgeld max: ${(ctx.umsatz * 0.1 / 1e6).toFixed(1)}Mio.€` : ""}`,
      response_json_schema: {
        type: "object",
        properties: {
          optionen_bewertung: { type: "array", items: { type: "object", properties: {
            option: { type: "string" },
            name: { type: "string" },
            ev_eur: { type: "number" },
            rav_eur: { type: "number" },
            downside_risk_eur: { type: "number" },
            rpn: { type: "number" },
            break_even_monate: { type: "number" },
            roi_pct: { type: "number" },
            erfolg_pct: { type: "number" }
          }}},
          monte_carlo: { type: "object", properties: {
            optimistisch: { type: "object", properties: { wert_eur: { type: "number" }, wahrscheinlichkeit_pct: { type: "number" }, beschreibung: { type: "string" } } },
            base: { type: "object", properties: { wert_eur: { type: "number" }, wahrscheinlichkeit_pct: { type: "number" }, beschreibung: { type: "string" } } },
            pessimistisch: { type: "object", properties: { wert_eur: { type: "number" }, wahrscheinlichkeit_pct: { type: "number" }, beschreibung: { type: "string" } } }
          }},
          sensitivitaet: { type: "array", items: { type: "object", properties: {
            parameter: { type: "string" }, einfluss_pct: { type: "number" }, richtung: { type: "string" }
          }}},
          indirekte_kosten: { type: "object", properties: {
            reputationsschaden_eur: { type: "number" },
            management_aufwand_eur: { type: "number" },
            produktionsverzögerung_eur: { type: "number" },
            regulatorische_auflagen_eur: { type: "number" },
            gesamt_indirekt_eur: { type: "number" }
          }},
          bussgeld_worst_cases: { type: "array", items: { type: "object", properties: {
            rechtsgebiet: { type: "string" }, norm: { type: "string" }, max_eur: { type: "number" }, einschätzung: { type: "string" }
          }}},
          empfohlene_option: { type: "string" },
          gesamtfazit: { type: "string" },
          steuer_fristen: { type: "array", items: { type: "object", properties: {
            typ: { type: "string" }, frist: { type: "string" }, rechtsfolge: { type: "string" }
          }}}
        }
      },
      model: "claude_sonnet_4_6"
    });
    setResult(r);
    await onSave({ ki_analyse: { ...(scenario.ki_analyse || {}), quant_analyse: r } });
    setAnalysing(false);
  };

  const FINANZFELDER = [
    ["transaktionswert", "Transaktionswert / Streitwert (€)"],
    ["kosten_legal", "Kosten Option A — Legal (€)"],
    ["kosten_aggressiv", "Kosten Option B — Aggressiv (€)"],
    ["erwarteter_gewinn", "Erwarteter Gewinn Best Case (€)"],
    ["potentielle_strafe", "Potentielle Strafe / Buße (€)"],
    ["reputationsschaden", "Geschätzter Reputationsschaden (€)"],
    ["zeitkosten", "Zeitkosten / Opportunitätskosten (€)"],
    ["schiedsverfahren_kosten", "Schiedsverfahrenskosten (€)"],
  ];

  const evData = result?.optionen_bewertung?.map(o => ({
    name: `Option ${o.option}`,
    EV: Math.round((o.ev_eur || 0) / 1000),
    RAV: Math.round((o.rav_eur || 0) / 1000),
    Downside: Math.round(Math.abs(o.downside_risk_eur || 0) / 1000) * -1,
  })) || [];

  const sensData = result?.sensitivitaet?.slice(0, 6).sort((a, b) => b.einfluss_pct - a.einfluss_pct) || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, ...SF }}>
      <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#5856D6", letterSpacing: "0.15em", textTransform: "uppercase" }}>Schritt 5 · Strategos</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", marginTop: 4 }}>Quantitative Risiko- & Kosten-Nutzen-Analyse</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Expected Value · Monte Carlo · Sensitivität · Indirekte Kosten · Bußgeld-Worst-Case</p>
      </div>

      {/* Finanzeingaben */}
      <AppleCard title="Finanzeingaben (optional — KI schätzt bei fehlenden Daten)" accentColor="#5856D6">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {FINANZFELDER.map(([key, label]) => (
            <AppleField key={key} label={label}>
              <AppleInput type="number" value={fin[key] || ""}
                onChange={e => setFin(f => ({ ...f, [key]: Number(e.target.value) }))}
                onBlur={() => saveFin(key, fin[key])}
                placeholder="0" />
            </AppleField>
          ))}
        </div>
      </AppleCard>

      {/* Analyse starten */}
      <AppleCard accentColor="#5856D6">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Quantitative Analyse starten</p>
            <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>EV · Monte Carlo · Sensitivität · Bußgeld-Max · Steuerfristen</p>
          </div>
          <AppleButton onClick={runAnalysis} disabled={analysing} variant="violet" icon={Calculator}>
            {analysing ? "Berechnet…" : result ? "Neu berechnen" : "Analyse starten"}
          </AppleButton>
        </div>
      </AppleCard>

      {result && (
        <>
          {/* Optionen-Vergleich */}
          {result.optionen_bewertung?.length > 0 && (
            <AppleCard title="Optionen-Vergleich (EV / RAV / Downside)" accentColor="#5856D6">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                {result.optionen_bewertung.map(o => (
                  <div key={o.option} style={{ padding: "13px 14px", background: o.option === result.empfohlene_option ? "rgba(88,86,214,0.1)" : "rgba(0,0,0,0.03)", border: `1px solid ${o.option === result.empfohlene_option ? "rgba(88,86,214,0.3)" : "rgba(0,0,0,0.07)"}`, borderRadius: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Option {o.option}</p>
                      {o.option === result.empfohlene_option && <span style={{ fontSize: 9, fontWeight: 700, color: "#5856D6", background: "rgba(88,86,214,0.15)", padding: "2px 6px", borderRadius: 5 }}>EMPFOHLEN</span>}
                    </div>
                    {[["EV (€k)", (o.ev_eur || 0) / 1000, "#5856D6"], ["RAV (€k)", (o.rav_eur || 0) / 1000, "#1DB954"], ["Downside (€k)", (o.downside_risk_eur || 0) / 1000, "#B81C3A"], ["ROI %", o.roi_pct, "#FF9500"], ["RPN", o.rpn, "#636366"], ["Break-Even", `${o.break_even_monate || "?"}M`, "#0A84FF"]].map(([l, v, c]) => (
                      <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: "#888" }}>{l}</span>
                        <strong style={{ color: c }}>{typeof v === "number" ? v.toFixed(0) : v}</strong>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {evData.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={evData} margin={{ left: -10, right: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#aaa" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#aaa" }} unit="k€" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [v + "k€"]} />
                    <ReferenceLine y={0} stroke="rgba(0,0,0,0.15)" />
                    <Bar dataKey="EV" fill="#5856D6" radius={[6, 6, 0, 0]} name="EV" />
                    <Bar dataKey="RAV" fill="#1DB954" radius={[6, 6, 0, 0]} name="RAV" />
                    <Bar dataKey="Downside" fill="#B81C3A" radius={[0, 0, 6, 6]} name="Downside" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </AppleCard>
          )}

          {/* Monte Carlo */}
          {result.monte_carlo && (
            <AppleCard title="Monte-Carlo-Simulation (3 Szenarien)" accentColor="#0A84FF">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[["Optimistisch", result.monte_carlo.optimistisch, "#1DB954"], ["Base Case", result.monte_carlo.base, "#0A84FF"], ["Pessimistisch", result.monte_carlo.pessimistisch, "#B81C3A"]].map(([l, v, c]) => v && (
                  <div key={l} style={{ padding: "12px 14px", background: `${c}08`, border: `1px solid ${c}20`, borderRadius: 13 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: c, textTransform: "uppercase", marginBottom: 6 }}>{l}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: c, lineHeight: 1 }}>{v.wert_eur !== undefined ? (v.wert_eur / 1000).toFixed(0) + "k€" : "—"}</p>
                    <p style={{ fontSize: 10, color: "#888", marginTop: 4 }}>P = {v.wahrscheinlichkeit_pct || "?"}%</p>
                    <p style={{ fontSize: 11, color: "#555", marginTop: 6, lineHeight: 1.4 }}>{v.beschreibung}</p>
                  </div>
                ))}
              </div>
            </AppleCard>
          )}

          {/* Sensitivitätsanalyse / Tornado */}
          {sensData.length > 0 && (
            <AppleCard title="Sensitivitätsanalyse (Tornado-Diagramm)" accentColor="#FF9500">
              <p style={{ fontSize: 11, color: "#888", marginBottom: 12 }}>Welcher Parameter hat den größten Einfluss auf das Ergebnis?</p>
              {sensData.map((s, i) => (
                <div key={i} style={{ marginBottom: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: "#333", fontWeight: i === 0 ? 700 : 500 }}>{s.parameter}</span>
                    <span style={{ color: s.richtung === "positiv" ? "#1DB954" : "#B81C3A", fontWeight: 700 }}>{s.richtung === "positiv" ? "+" : "−"}{s.einfluss_pct}%</span>
                  </div>
                  <div style={{ height: 7, background: "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${s.einfluss_pct}%`, background: s.richtung === "positiv" ? "#1DB954" : "#B81C3A", borderRadius: 4, transition: "width 0.6s" }} />
                  </div>
                </div>
              ))}
            </AppleCard>
          )}

          {/* Indirekte Kosten */}
          {result.indirekte_kosten && (
            <AppleCard title="Indirekte Kosten (oft unterschätzt!)" accentColor="#B81C3A">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 9 }}>
                {[["Reputationsschaden", result.indirekte_kosten.reputationsschaden_eur, "#B81C3A"], ["Management-Aufwand", result.indirekte_kosten.management_aufwand_eur, "#FF9500"], ["Produktionsverzögerung", result.indirekte_kosten.produktionsverzögerung_eur, "#636366"], ["Regulatorische Auflagen", result.indirekte_kosten.regulatorische_auflagen_eur, "#5856D6"]].map(([l, v, c]) => (
                  <div key={l} style={{ padding: "10px 13px", background: `${c}08`, borderRadius: 11 }}>
                    <p style={{ fontSize: 10, color: c, fontWeight: 700, textTransform: "uppercase" }}>{l}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginTop: 2 }}>{v ? (v / 1000).toFixed(0) + "k€" : "—"}</p>
                  </div>
                ))}
              </div>
              {result.indirekte_kosten.gesamt_indirekt_eur && (
                <div style={{ marginTop: 10, padding: "10px 13px", background: "rgba(184,28,58,0.08)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#B81C3A" }}>Gesamte indirekte Kosten</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "#B81C3A" }}>{(result.indirekte_kosten.gesamt_indirekt_eur / 1e6).toFixed(1)}M€</p>
                </div>
              )}
            </AppleCard>
          )}

          {/* Bußgeld Worst Cases */}
          {result.bussgeld_worst_cases?.length > 0 && (
            <AppleCard title="Bußgeld-Worst-Cases (rechtliche Maxima)" accentColor="#B81C3A">
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {result.bussgeld_worst_cases.map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "rgba(184,28,58,0.05)", border: "1px solid rgba(184,28,58,0.12)", borderRadius: 10 }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{b.rechtsgebiet}</p>
                      <p style={{ fontSize: 10, fontFamily: "monospace", color: "#888" }}>{b.norm}</p>
                      <p style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{b.einschätzung}</p>
                    </div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#B81C3A", whiteSpace: "nowrap" }}>{b.max_eur ? (b.max_eur / 1e6).toFixed(0) + "M€" : "variabel"}</p>
                  </div>
                ))}
              </div>
            </AppleCard>
          )}

          {/* Steuerfristen */}
          {result.steuer_fristen?.length > 0 && (
            <AppleCard title="Steuerrechtliche Fristen (§§ 169 ff. AO)" accentColor="#FF9500">
              {result.steuer_fristen.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: i < result.steuer_fristen.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <AlertTriangle style={{ width: 13, height: 13, color: "#FF9500", flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{f.typ}: <span style={{ color: "#FF9500" }}>{f.frist}</span></p>
                    <p style={{ fontSize: 11, color: "#666" }}>{f.rechtsfolge}</p>
                  </div>
                </div>
              ))}
            </AppleCard>
          )}

          {/* Gesamtfazit */}
          {result.gesamtfazit && (
            <AppleCard title="Gesamtfazit" accentColor="#1a1a1a">
              <div style={{ padding: "13px 15px", background: "rgba(0,0,0,0.03)", borderRadius: 12 }}>
                <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.6 }}>{result.gesamtfazit}</p>
              </div>
            </AppleCard>
          )}
        </>
      )}
    </div>
  );
}