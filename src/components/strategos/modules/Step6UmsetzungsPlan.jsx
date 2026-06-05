import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Download, Scale, ArrowRight, CheckCircle, Clock, AlertTriangle, Link2, ExternalLink } from "lucide-react";
import { AppleCard, AppleButton, ApplePill, SF } from "../AppleCard";
import { useNavigate } from "react-router-dom";

const HORIZONTE_CFG = [
  { key: "sofort", label: "Sofort", sub: "Nächste 30 Tage", color: "#B81C3A" },
  { key: "mittelfristig", label: "6–12 Monate", sub: "Strategische Umsetzung", color: "#FF9500" },
  { key: "langfristig", label: "Langfristig", sub: "Positionierung & Monitoring", color: "#1DB954" },
];

export default function Step6UmsetzungsPlan({ scenario, onSave }) {
  const navigate = useNavigate();
  const ctx = scenario.unternehmenskontext || {};
  const sit = scenario.situationsanalyse || {};
  const mat = scenario.szenario_matrix || {};
  const act = scenario.aktionsplan || {};
  const emp = scenario.strategos_empfehlung || {};
  const quant = scenario.ki_analyse?.quant_analyse || {};
  const opts = scenario.ki_analyse?.handlungsoptionen || {};
  const [plan, setPlan] = useState(scenario.ki_analyse?.umsetzungsplan || null);
  const [generating, setGenerating] = useState(false);
  const [creatingLexara, setCreatingLexara] = useState(false);
  const [lexaraCreated, setLexaraCreated] = useState(scenario.ki_analyse?.lexara_case_created || null);

  const generate = async () => {
    setGenerating(true);
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist Strategos — Senior-Berater und Rechtsexperte. Erstelle den finalen, vollständig operativen Umsetzungsplan.

VOLLSTÄNDIGE ANALYSE:
Unternehmen: ${ctx.unternehmen_name} (${ctx.rechtsform}, ${ctx.branche}), Umsatz: ${ctx.umsatz ? (ctx.umsatz/1e6).toFixed(1)+"Mio.€" : "—"}
Sachverhalt: ${ctx.sachverhalt_lang || "—"}
Gegner: ${ctx.gegner_name || "—"} (${ctx.gegner_rolle || "—"})
${scenario.ki_kontext?.ki_briefing ? `\n════ KI-BASIS-BRIEFING (aus Dokumenten-Analyse) ════\n${String(scenario.ki_kontext.ki_briefing).slice(0, 600)}\n` : ""}
Gesamt-Risiko: ${sit.gesamt_risiko || "—"}/10 | Exposure: ${sit.gesamt_exposure_eur ? (sit.gesamt_exposure_eur/1e6).toFixed(1)+"Mio.€" : "—"}
Empfohlene Option: ${quant.empfohlene_option || emp.grundhaltung || opts.empfohlene_option || "—"}
Top-3 Hebel: ${(emp.groesste_hebel || []).slice(0, 3).join(" · ") || "—"}
Aktionsplan: ${(act.massnahmen || []).length} Maßnahmen

LIEFERE:

1. UMSETZUNGSPLAN mit 3 Horizonten:
   - sofort (0-30 Tage): 5-7 konkrete Sofortmaßnahmen mit genauer Frist, Verantwortlichem, §§, Kosten
   - mittelfristig (6-12 Monate): 5-7 strategische Maßnahmen
   - langfristig (18+ Monate): 3-5 Positionierungsmaßnahmen

2. MONITORING-PLAN: 5-7 konkrete Indikatoren die das Unternehmen beobachten muss, um zu erkennen ob die Strategie angepasst werden muss

3. COMPLIANCE-DOKUMENTATION: Was muss für Business Judgment Rule (§ 93 Abs. 2 AktG) dokumentiert werden? Was hilft bei Steuerprüfung (§ 90 Abs. 3 AO)? Was entlastet bei Kartelluntersuchung?

4. ZEITSTRAHL mit 8-10 kritischen Meilensteinen (datum/zeitraum + ereignis + konsequenz bei Versäumnis)

5. SCHIEDSVERFAHREN-EMPFEHLUNG: Falls Konflikt eskaliert — ordentlicher Rechtsweg oder Schiedsgericht? Welche Institution (ICC / DIS / LCIA / SCC), welcher Schiedsort, welches Recht?

6. LEXARA-ÜBERGABE-CHECKLISTE: Falls Strategos-Szenario in Rechtsstreit übergeht — welche Daten müssen in Lexara erfasst werden?

7. DOKUMENTATIONS-STANDARD für §§ 93 AktG, 30/130 OWiG, 266 StGB, 370 AO als Verteidigungsmittel`,
      response_json_schema: {
        type: "object",
        properties: {
          umsetzung_sofort: { type: "array", items: { type: "object", properties: {
            massnahme: { type: "string" }, frist: { type: "string" }, verantwortlich: { type: "string" },
            norm: { type: "string" }, kosten_eur: { type: "number" }, prioritaet: { type: "string" }
          }}},
          umsetzung_mittelfristig: { type: "array", items: { type: "object", properties: {
            massnahme: { type: "string" }, zeitraum: { type: "string" }, verantwortlich: { type: "string" }, wirkung: { type: "string" }
          }}},
          umsetzung_langfristig: { type: "array", items: { type: "object", properties: {
            massnahme: { type: "string" }, zeitraum: { type: "string" }, ziel: { type: "string" }
          }}},
          monitoring_indikatoren: { type: "array", items: { type: "object", properties: {
            indikator: { type: "string" }, schwellenwert: { type: "string" }, massnahme_bei_abweichung: { type: "string" }, frequenz: { type: "string" }
          }}},
          zeitstrahl: { type: "array", items: { type: "object", properties: {
            datum: { type: "string" }, ereignis: { type: "string" }, konsequenz_versaeumnis: { type: "string" }, kritisch: { type: "boolean" }
          }}},
          schiedsverfahren_empfehlung: { type: "object", properties: {
            empfehlung: { type: "string" },
            institution: { type: "string" },
            schiedsort: { type: "string" },
            schiedsrecht: { type: "string" },
            begruendung: { type: "string" },
            kostenindikation: { type: "string" }
          }},
          compliance_dokumentation: { type: "array", items: { type: "object", properties: {
            rechtsgrundlage: { type: "string" },
            was_dokumentieren: { type: "string" },
            zweck: { type: "string" }
          }}},
          lexara_checkliste: { type: "array", items: { type: "string" } },
          executive_summary: { type: "string" }
        }
      },
      model: "claude_sonnet_4_6"
    });
    setPlan(r);
    await onSave({ ki_analyse: { ...(scenario.ki_analyse || {}), umsetzungsplan: r } });
    setGenerating(false);
  };

  const createLexaraCase = async () => {
    setCreatingLexara(true);
    const newCase = await base44.entities.Case.create({
      fallname: `[STRATEGOS] ${scenario.title}`,
      rechtsgebiet: (ctx.rechtsgebiete || []).join(", ") || scenario.rechtsgebiet || "",
      status: "Vorbereitung",
      instanz: "Erstinstanz",
      zentrale_rechtsfrage: ctx.sachverhalt_lang?.slice(0, 200) || "",
      prognose: sit.gesamt_risiko ? Math.max(0, 100 - sit.gesamt_risiko * 10) : null,
      streitwert: scenario.finanzdaten?.transaktionswert || sit.gesamt_exposure_eur || null,
      notes: `[Aus STRATEGOS-Szenario migriert — ${new Date().toLocaleDateString("de-DE")}]\n\nSachverhalt: ${ctx.sachverhalt_lang || "—"}\n\nGegner: ${ctx.gegner_name || "—"} (${ctx.gegner_rolle || "—"})\n\nStrategos-Empfehlung: ${emp.machtposition?.slice(0, 300) || "—"}\n\nTop-Hebel: ${(emp.groesste_hebel || []).join(" · ")}\n\nGroesste Risiken: ${(emp.groesste_risiken || []).join(" · ")}`,
      ki_berater_result: {
        strategos_scenario_id: scenario.id,
        empfohlene_option: quant.empfohlene_option || opts.empfohlene_option,
        gesamt_risiko: sit.gesamt_risiko,
        exposure_eur: sit.gesamt_exposure_eur,
      },
    });
    const info = { case_id: newCase.id, case_name: newCase.fallname, created_at: new Date().toISOString() };
    setLexaraCreated(info);
    await onSave({ ki_analyse: { ...(scenario.ki_analyse || {}), lexara_case_created: info }, unternehmenskontext: { ...ctx, lexara_case_id: newCase.id } });
    setCreatingLexara(false);
  };

  const exportReport = async () => {
    const text = `STRATEGOS — GESAMTBERICHT & UMSETZUNGSPLAN
${"=".repeat(60)}
Unternehmen: ${ctx.unternehmen_name || "—"}
Szenario: ${scenario.title}
Datum: ${new Date().toLocaleDateString("de-DE")}

EXECUTIVE SUMMARY:
${plan?.executive_summary || "—"}

SOFORTMASSNAHMEN (0-30 Tage):
${(plan?.umsetzung_sofort || []).map((m, i) => `${i + 1}. ${m.massnahme}\n   Frist: ${m.frist} | Verantw.: ${m.verantwortlich} | Norm: ${m.norm}`).join("\n")}

MITTELFRISTIG (6-12 Monate):
${(plan?.umsetzung_mittelfristig || []).map((m, i) => `${i + 1}. ${m.massnahme} (${m.zeitraum})`).join("\n")}

MONITORING-INDIKATOREN:
${(plan?.monitoring_indikatoren || []).map(m => `• ${m.indikator}: ${m.schwellenwert} | Frequenz: ${m.frequenz}`).join("\n")}

SCHIEDSVERFAHREN-EMPFEHLUNG:
${plan?.schiedsverfahren_empfehlung?.begruendung || "—"}
Institution: ${plan?.schiedsverfahren_empfehlung?.institution || "—"} | Ort: ${plan?.schiedsverfahren_empfehlung?.schiedsort || "—"}

COMPLIANCE-DOKUMENTATION:
${(plan?.compliance_dokumentation || []).map(c => `• ${c.rechtsgrundlage}: ${c.was_dokumentieren}`).join("\n")}
${"=".repeat(60)}
Vertraulich — Erstellt mit STRATEGOS · ${new Date().toLocaleDateString("de-DE")}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `Strategos_Umsetzungsplan_${new Date().toISOString().slice(0, 10)}.txt`; a.click();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, ...SF }}>
      <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#AF52DE", letterSpacing: "0.15em", textTransform: "uppercase" }}>Schritt 6 · Strategos</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", marginTop: 4 }}>Handlungsempfehlung & Umsetzungsplan</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Operative Roadmap · Monitoring · Schiedsempfehlung · LEXARA-Export</p>
      </div>

      {/* Generieren */}
      <AppleCard accentColor="#AF52DE">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Umsetzungsplan generieren</p>
            <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>BJR-Dokumentation · Monitoring · Zeitstrahl · Schiedsempfehlung</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <AppleButton onClick={generate} disabled={generating} variant="violet" icon={Sparkles}>
              {generating ? "Generiert…" : plan ? "Neu generieren" : "Plan erstellen"}
            </AppleButton>
            {plan && <AppleButton onClick={exportReport} variant="ghost" icon={Download}>Export</AppleButton>}
          </div>
        </div>
      </AppleCard>

      {plan && (
        <>
          {/* Executive Summary */}
          {plan.executive_summary && (
            <AppleCard title="Executive Summary" accentColor="#1a1a1a">
              <div style={{ padding: "13px 15px", background: "rgba(0,0,0,0.03)", borderRadius: 12 }}>
                <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.65 }}>{plan.executive_summary}</p>
              </div>
            </AppleCard>
          )}

          {/* Umsetzung 3 Horizonte */}
          {HORIZONTE_CFG.map(h => {
            const data = plan[`umsetzung_${h.key}`] || [];
            if (data.length === 0) return null;
            return (
              <AppleCard key={h.key} title={`${h.label} · ${h.sub}`} accentColor={h.color}>
                {data.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < data.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: `${h.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: h.color }}>{i + 1}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{m.massnahme}</p>
                      <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                        {(m.frist || m.zeitraum) && <span style={{ fontSize: 10, color: h.color, fontWeight: 700 }}>📅 {m.frist || m.zeitraum}</span>}
                        {m.verantwortlich && <span style={{ fontSize: 10, color: "#888" }}>👤 {m.verantwortlich}</span>}
                        {m.norm && <span style={{ fontSize: 10, fontFamily: "monospace", color: "#636366", background: "rgba(0,0,0,0.05)", padding: "1px 5px", borderRadius: 4 }}>{m.norm}</span>}
                        {m.kosten_eur && <span style={{ fontSize: 10, color: "#888" }}>💰 {m.kosten_eur.toLocaleString()}€</span>}
                        {m.prioritaet && <ApplePill color={m.prioritaet === "kritisch" ? "#B81C3A" : m.prioritaet === "hoch" ? "#FF9500" : "#636366"}>{m.prioritaet}</ApplePill>}
                      </div>
                      {m.wirkung && <p style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{m.wirkung}</p>}
                    </div>
                  </div>
                ))}
              </AppleCard>
            );
          })}

          {/* Zeitstrahl */}
          {plan.zeitstrahl?.length > 0 && (
            <AppleCard title="Kritischer Zeitstrahl" accentColor="#0A84FF">
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 11, top: 0, bottom: 0, width: 2, background: "rgba(10,132,255,0.15)", borderRadius: 2 }} />
                {plan.zeitstrahl.map((z, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, marginBottom: 14, paddingLeft: 4 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: z.kritisch ? "#B81C3A" : "#0A84FF", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, boxShadow: z.kritisch ? "0 0 0 4px rgba(184,28,58,0.2)" : "0 0 0 3px rgba(10,132,255,0.15)" }}>
                      {z.kritisch ? <AlertTriangle style={{ width: 10, height: 10, color: "#fff" }} /> : <Clock style={{ width: 10, height: 10, color: "#fff" }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 4, borderBottom: i < plan.zeitstrahl.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: z.kritisch ? "#B81C3A" : "#0A84FF", textTransform: "uppercase" }}>{z.datum}</p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", marginTop: 2 }}>{z.ereignis}</p>
                      {z.konsequenz_versaeumnis && <p style={{ fontSize: 11, color: "#B81C3A", marginTop: 2 }}>⚠ Versäumnis: {z.konsequenz_versaeumnis}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </AppleCard>
          )}

          {/* Monitoring */}
          {plan.monitoring_indikatoren?.length > 0 && (
            <AppleCard title="Monitoring-Plan (Frühwarnsystem)" accentColor="#1DB954">
              {plan.monitoring_indikatoren.map((m, i) => (
                <div key={i} style={{ padding: "10px 12px", background: "rgba(29,185,84,0.05)", border: "1px solid rgba(29,185,84,0.12)", borderRadius: 10, marginBottom: 7 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <CheckCircle style={{ width: 13, height: 13, color: "#1DB954", flexShrink: 0 }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{m.indikator}</p>
                    {m.frequenz && <span style={{ fontSize: 10, color: "#888", marginLeft: "auto" }}>📊 {m.frequenz}</span>}
                  </div>
                  {m.schwellenwert && <p style={{ fontSize: 11, color: "#555", marginLeft: 21 }}>Schwellenwert: <strong>{m.schwellenwert}</strong></p>}
                  {m.massnahme_bei_abweichung && <p style={{ fontSize: 11, color: "#1DB954", marginLeft: 21, marginTop: 2 }}>→ {m.massnahme_bei_abweichung}</p>}
                </div>
              ))}
            </AppleCard>
          )}

          {/* Schiedsempfehlung */}
          {plan.schiedsverfahren_empfehlung && (
            <AppleCard title="Schiedsverfahren-Empfehlung (falls Eskalation)" accentColor="#5856D6">
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, alignItems: "start" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>{plan.schiedsverfahren_empfehlung.empfehlung}</p>
                  <p style={{ fontSize: 12, color: "#555", lineHeight: 1.5, marginBottom: 10 }}>{plan.schiedsverfahren_empfehlung.begruendung}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {[["Institution", plan.schiedsverfahren_empfehlung.institution, "#5856D6"], ["Schiedsort", plan.schiedsverfahren_empfehlung.schiedsort, "#0A84FF"], ["Schiedsrecht", plan.schiedsverfahren_empfehlung.schiedsrecht, "#636366"], ["Kosten", plan.schiedsverfahren_empfehlung.kostenindikation, "#FF9500"]].map(([l, v, c]) => v && (
                    <div key={l} style={{ padding: "7px 10px", background: `${c}08`, borderRadius: 9 }}>
                      <p style={{ fontSize: 9, color: c, fontWeight: 700, textTransform: "uppercase" }}>{l}</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </AppleCard>
          )}

          {/* Compliance Dokumentation */}
          {plan.compliance_dokumentation?.length > 0 && (
            <AppleCard title="Compliance-Dokumentation (als Verteidigungsmittel)" accentColor="#636366">
              {plan.compliance_dokumentation.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: i < plan.compliance_dokumentation.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: "#5856D6", background: "rgba(88,86,214,0.08)", padding: "3px 7px", borderRadius: 6, flexShrink: 0, height: "fit-content" }}>{c.rechtsgrundlage}</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{c.was_dokumentieren}</p>
                    <p style={{ fontSize: 11, color: "#888" }}>{c.zweck}</p>
                  </div>
                </div>
              ))}
            </AppleCard>
          )}
        </>
      )}

      {/* LEXARA-Export */}
      <AppleCard title="LEXARA-Integration — Übergang zu Lexara" accentColor="#0A84FF">
        {lexaraCreated ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(29,185,84,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle style={{ width: 20, height: 20, color: "#1DB954" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>LEXARA-Fall erstellt</p>
              <p style={{ fontSize: 11, color: "#888" }}>{lexaraCreated.case_name} · {new Date(lexaraCreated.created_at).toLocaleDateString("de-DE")}</p>
            </div>
            <AppleButton onClick={() => navigate(`/lexara/case?id=${lexaraCreated.case_id}`)} variant="primary" icon={ExternalLink}>
              In LEXARA öffnen
            </AppleButton>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6, marginBottom: 14 }}>
              Wenn dieses Strategos-Szenario in einen echten Rechtsstreit übergeht, können alle analysierten Daten mit einem Klick als LEXARA-Fall exportiert werden. Prognose, Sachverhalt, Gegner-Profil, Exposure und KI-Empfehlung werden automatisch übertragen.
            </p>
            {plan?.lexara_checkliste?.length > 0 && (
              <div style={{ marginBottom: 14, padding: "10px 13px", background: "rgba(10,132,255,0.06)", borderRadius: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#0A84FF", textTransform: "uppercase", marginBottom: 7 }}>LEXARA-Übergabe-Checkliste</p>
                {plan.lexara_checkliste.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 7, fontSize: 11, color: "#333", marginBottom: 3 }}>
                    <ArrowRight style={{ width: 11, height: 11, color: "#0A84FF", flexShrink: 0, marginTop: 2 }} />{item}
                  </div>
                ))}
              </div>
            )}
            <AppleButton onClick={createLexaraCase} disabled={creatingLexara} variant="primary" icon={Scale}>
              {creatingLexara ? "Erstellt LEXARA-Fall…" : "Als LEXARA-Fall exportieren"}
            </AppleButton>
          </div>
        )}
      </AppleCard>

      {/* Vollständigkeit */}
      <AppleCard title="Analyse-Vollständigkeit" accentColor="#5856D6">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            ["1 · Kontext", Object.keys(ctx).length > 3, "#0A84FF"],
            ["2 · Verträge", !!scenario.ki_analyse?.vertrags_analyse, "#0A84FF"],
            ["3 · Patente", !!scenario.ki_analyse?.patent_analyse, "#FF9500"],
            ["4 · Optionen", !!scenario.ki_analyse?.handlungsoptionen, "#1DB954"],
            ["5 · Quantitativ", !!scenario.ki_analyse?.quant_analyse, "#5856D6"],
            ["6 · Umsetzung", !!plan, "#AF52DE"],
          ].map(([label, done, color]) => (
            <div key={label} style={{ padding: "10px 13px", background: done ? `${color}10` : "rgba(0,0,0,0.03)", border: `1px solid ${done ? color + "30" : "rgba(0,0,0,0.07)"}`, borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: done ? color : "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {done && <CheckCircle style={{ width: 10, height: 10, color: "#fff" }} />}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: done ? color : "#888" }}>{label}</span>
            </div>
          ))}
        </div>
      </AppleCard>
    </div>
  );
}