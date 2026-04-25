import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Target, Shield, Sword, GitMerge, Eye, AlertTriangle, TrendingUp } from "lucide-react";
import { AppleCard, AppleButton, ApplePill, AppleInput, AppleTextarea, AppleField, AppleSelect, SF } from "../AppleCard";

const OPTION_CFG = {
  A: { label: "Legaler Weg", color: "#1DB954", icon: Shield, desc: "Konservativ, rechtlich einwandfrei" },
  B: { label: "Aggressiver Weg", color: "#B81C3A", icon: Sword, desc: "Höheres Risiko, höheres Potential" },
  C: { label: "Hybrid / Kreativ", color: "#0A84FF", icon: GitMerge, desc: "Balanciert Risiko und Potential" },
};

function OptionPanel({ opt, data, gegner, onUpdate }) {
  const cfg = OPTION_CFG[opt];
  const Icon = cfg.icon;
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: `${cfg.color}06`, border: `1px solid ${cfg.color}25`, borderRadius: 16, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "13px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${cfg.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon style={{ width: 15, height: 15, color: cfg.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Option {opt}: {cfg.label}</p>
          <p style={{ fontSize: 10, color: "#888" }}>{cfg.desc}</p>
        </div>
        {data?.erfolg_pct && (
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>{data.erfolg_pct}%</p>
            <p style={{ fontSize: 9, color: "#aaa" }}>Erfolg</p>
          </div>
        )}
        <span style={{ color: "#bbb", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${cfg.color}20` }}>
          {data?.beschreibung && (
            <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.7)", borderRadius: 10, marginTop: 12, marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 4 }}>KI-Kernstrategie</p>
              <p style={{ fontSize: 12, color: "#1a1a1a", lineHeight: 1.5 }}>{data.beschreibung}</p>
              {data.vorteile?.length > 0 && <p style={{ fontSize: 11, color: "#1DB954", marginTop: 6 }}>+ {data.vorteile.join(" · ")}</p>}
              {data.nachteile?.length > 0 && <p style={{ fontSize: 11, color: "#B81C3A", marginTop: 3 }}>− {data.nachteile.join(" · ")}</p>}
            </div>
          )}
          {/* Operativer Handlungsbaum */}
          {data?.handlungsbaum?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 7 }}>Operativer Handlungsbaum</p>
              {data.handlungsbaum.map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "7px 10px", background: "rgba(0,0,0,0.025)", borderRadius: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color, minWidth: 20 }}>{i + 1}.</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{h.schritt}</p>
                    {h.verantwortlich && <p style={{ fontSize: 10, color: "#888" }}>👤 {h.verantwortlich} · {h.frist}</p>}
                    {h.kosten_eur && <p style={{ fontSize: 10, color: "#888" }}>💰 {h.kosten_eur?.toLocaleString()}€</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Gegner-Szenario */}
          {gegner && (
            <div style={{ padding: "10px 12px", background: "rgba(184,28,58,0.06)", border: "1px solid rgba(184,28,58,0.15)", borderRadius: 10, marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#B81C3A", textTransform: "uppercase", marginBottom: 5 }}>🎯 Antizipierte Reaktion</p>
              {gegner.reaktion && <p style={{ fontSize: 11, color: "#333", marginBottom: 4 }}><strong>Reaktion:</strong> {gegner.reaktion}</p>}
              {gegner.gegenreaktion && <p style={{ fontSize: 11, color: "#555", marginBottom: 4 }}><strong>Unser Zug 2:</strong> {gegner.gegenreaktion}</p>}
              {gegner.behoerden_reaktion && <p style={{ fontSize: 11, color: "#FF9500" }}><strong>Behörden:</strong> {gegner.behoerden_reaktion}</p>}
            </div>
          )}
          {/* Rechtliche Basis */}
          {data?.rechtliche_basis && (
            <div style={{ padding: "7px 10px", background: "rgba(0,0,0,0.03)", borderRadius: 8, marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 2 }}>Rechtliche Grundlage</p>
              <p style={{ fontSize: 11, fontFamily: "monospace", color: "#555" }}>{data.rechtliche_basis}</p>
            </div>
          )}
          {/* Kosten/Zeit */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[["Erfolg %", data?.erfolg_pct, cfg.color], ["Risiko %", data?.risiko_pct, "#B81C3A"], ["Zeithorizont", data?.zeithorizont, "#636366"]].map(([l, v, c]) => v !== undefined && (
              <div key={l} style={{ padding: "8px 10px", background: `${c}10`, borderRadius: 9, textAlign: "center" }}>
                <p style={{ fontSize: 10, color: c, fontWeight: 700, textTransform: "uppercase" }}>{l}</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a", marginTop: 2 }}>{v}{typeof v === "number" && l.includes("%") ? "%" : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Step4HandlungsOptionen({ scenario, onSave }) {
  const ctx = scenario.unternehmenskontext || {};
  const sit = scenario.situationsanalyse || {};
  const [opts, setOpts] = useState(scenario.ki_analyse?.handlungsoptionen || null);
  const [generating, setGenerating] = useState(false);
  const [zielZustand, setZielZustand] = useState(scenario.ki_analyse?.ziel_zustand || "");
  const [zeitraum, setZeitraum] = useState(scenario.ki_analyse?.zeitraum || "12 Monate");

  const generate = async () => {
    setGenerating(true);
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist Senior-Partner einer Top-Kanzlei und strategischer Unternehmensberater. Erstelle vollständige Handlungsoptionen nach dem Strategos-Prinzip: Von Punkt A nach Punkt C — ohne B kennen zu müssen.

UNTERNEHMENSKONTEXT:
Unternehmen: ${ctx.unternehmen_name} (${ctx.rechtsform}, ${ctx.branche}), Umsatz: ${ctx.umsatz ? (ctx.umsatz/1e6).toFixed(1)+"Mio.€" : "—"}, MA: ${ctx.mitarbeiter || "—"}
Märkte: ${(ctx.operative_maerkte || []).join(", ")}
Sachverhalt: ${ctx.sachverhalt_lang || "—"}
Gegner: ${ctx.gegner_name || "—"} (${ctx.gegner_rolle || "—"}), Info: ${ctx.gegner_info || "—"}
Zeitkritikalität: ${ctx.zeitkritikalitaet || 5}/10
Gewählte Rechtsgebiete: ${(ctx.rechtsgebiete || []).join(", ")}
SITUATION HEUTE (Punkt A): ${ctx.sachverhalt_lang || "—"}
GEWÜNSCHTER ZIELZUSTAND (Punkt C): ${zielZustand || "nicht definiert"}
Zeitrahmen: ${zeitraum}

RISIKOANALYSE AUS SCHRITT 2:
Gesamt-Risiko: ${sit.gesamt_risiko || "—"}/10
Kritische Punkte: ${(sit.kritische_punkte || []).join(" | ")}
Exposure: ${sit.gesamt_exposure_eur ? (sit.gesamt_exposure_eur/1e6).toFixed(1)+"Mio.€" : "—"}

Erstelle 3 vollständig ausgearbeitete Handlungsoptionen.

PRO OPTION:
- beschreibung: vollständige inhaltliche Beschreibung
- kernstrategie: was ist die strategische Logik
- handlungsbaum: 5-7 operative Schritte mit schritt, verantwortlich, frist, kosten_eur
- erfolg_pct, risiko_pct, zeithorizont
- vorteile (4), nachteile (3)
- rechtliche_basis: konkrete §§ und Normen
- business_judgment_rule: wie schützt die BJR diese Entscheidung (§ 93 Abs. 1 S. 2 AktG)
- kartellrechtliche_gruenze: § 1 GWB / Art. 101 AEUV falls relevant
- steuerliche_aspekte: § 42 AO Gestaltungsmissbrauch falls relevant

PRO OPTION AUCH GEGNER-SZENARIO:
- reaktion: voraussichtliche Reaktion von Behörden/Wettbewerbern/Gerichten
- gegenreaktion: unser antizipierter Zug 2
- behoerden_reaktion: spezifische Behördenreaktion (Kartellamt, BaFin, etc.)

GESAMTBEWERTUNG:
- empfohlene_option, begruendung
- kritische_erfolgsfaktoren (5)
- wege_die_vermieden_werden_sollten (3 mit rechtlicher Begründung)`,
      response_json_schema: {
        type: "object",
        properties: {
          option_a: { type: "object", properties: {
            beschreibung: { type: "string" }, kernstrategie: { type: "string" }, erfolg_pct: { type: "number" }, risiko_pct: { type: "number" }, zeithorizont: { type: "string" },
            vorteile: { type: "array", items: { type: "string" } }, nachteile: { type: "array", items: { type: "string" } },
            rechtliche_basis: { type: "string" }, business_judgment_rule: { type: "string" }, kartellrechtliche_grenze: { type: "string" }, steuerliche_aspekte: { type: "string" },
            handlungsbaum: { type: "array", items: { type: "object", properties: { schritt: { type: "string" }, verantwortlich: { type: "string" }, frist: { type: "string" }, kosten_eur: { type: "number" } } } }
          }},
          option_b: { type: "object", properties: {
            beschreibung: { type: "string" }, kernstrategie: { type: "string" }, erfolg_pct: { type: "number" }, risiko_pct: { type: "number" }, zeithorizont: { type: "string" },
            vorteile: { type: "array", items: { type: "string" } }, nachteile: { type: "array", items: { type: "string" } },
            rechtliche_basis: { type: "string" }, business_judgment_rule: { type: "string" }, kartellrechtliche_grenze: { type: "string" }, steuerliche_aspekte: { type: "string" },
            handlungsbaum: { type: "array", items: { type: "object", properties: { schritt: { type: "string" }, verantwortlich: { type: "string" }, frist: { type: "string" }, kosten_eur: { type: "number" } } } }
          }},
          option_c: { type: "object", properties: {
            beschreibung: { type: "string" }, kernstrategie: { type: "string" }, erfolg_pct: { type: "number" }, risiko_pct: { type: "number" }, zeithorizont: { type: "string" },
            vorteile: { type: "array", items: { type: "string" } }, nachteile: { type: "array", items: { type: "string" } },
            rechtliche_basis: { type: "string" }, business_judgment_rule: { type: "string" }, kartellrechtliche_grenze: { type: "string" }, steuerliche_aspekte: { type: "string" },
            handlungsbaum: { type: "array", items: { type: "object", properties: { schritt: { type: "string" }, verantwortlich: { type: "string" }, frist: { type: "string" }, kosten_eur: { type: "number" } } } }
          }},
          gegner_szenarien: { type: "object", properties: {
            a: { type: "object", properties: { reaktion: { type: "string" }, gegenreaktion: { type: "string" }, behoerden_reaktion: { type: "string" } } },
            b: { type: "object", properties: { reaktion: { type: "string" }, gegenreaktion: { type: "string" }, behoerden_reaktion: { type: "string" } } },
            c: { type: "object", properties: { reaktion: { type: "string" }, gegenreaktion: { type: "string" }, behoerden_reaktion: { type: "string" } } }
          }},
          empfohlene_option: { type: "string" },
          begruendung: { type: "string" },
          kritische_erfolgsfaktoren: { type: "array", items: { type: "string" } },
          wege_die_vermieden_werden_sollten: { type: "array", items: { type: "string" } }
        }
      },
      model: "claude_sonnet_4_6"
    });
    setOpts(r);
    await onSave({ ki_analyse: { ...(scenario.ki_analyse || {}), handlungsoptionen: r, ziel_zustand: zielZustand, zeitraum }, option_a: r.option_a, option_b: r.option_b, option_c: r.option_c });
    setGenerating(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, ...SF }}>
      <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#1DB954", letterSpacing: "0.15em", textTransform: "uppercase" }}>Schritt 4 · Strategos</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", marginTop: 4 }}>Handlungsoptionen & Entscheidungsszenarien</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Von A nach C — ohne B kennen zu müssen · Gegner-Antizipation · Operativer Handlungsbaum</p>
      </div>

      {/* Zieldefinition */}
      <AppleCard title="Zieldefinition (Von A nach C)" accentColor="#1DB954">
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
          <AppleField label="Gewünschter Zielzustand (Punkt C) — was soll in X Monaten erreicht sein?">
            <AppleTextarea rows={3} value={zielZustand} onChange={e => setZielZustand(e.target.value)}
              onBlur={() => onSave({ ki_analyse: { ...(scenario.ki_analyse || {}), ziel_zustand: zielZustand } })}
              placeholder="z.B. Fusion mit XYZ GmbH abgeschlossen, Kartellrechtliche Freigabe Phase I erhalten, Kaufpreis ≤ 50 Mio. €, kein Personalabbau..." />
          </AppleField>
          <AppleField label="Zeitrahmen">
            <AppleSelect value={zeitraum} onChange={e => setZeitraum(e.target.value)}>
              {["3 Monate","6 Monate","12 Monate","18 Monate","24 Monate","36 Monate","5 Jahre"].map(z => <option key={z} value={z}>{z}</option>)}
            </AppleSelect>
          </AppleField>
        </div>
      </AppleCard>

      {/* KI starten */}
      <AppleCard accentColor="#1DB954">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>KI-Handlungsoptionen generieren</p>
            <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>3 Optionen · BJR-Schutz · Gegner-Antizipation · § 1 GWB / Art. 101 AEUV</p>
          </div>
          <AppleButton onClick={generate} disabled={generating} variant="accent" icon={Sparkles}>
            {generating ? "Generiert…" : opts ? "Neu generieren" : "Optionen ermitteln"}
          </AppleButton>
        </div>
      </AppleCard>

      {/* Optionen */}
      {opts && (
        <>
          {["A","B","C"].map(k => (
            <OptionPanel key={k} opt={k} data={opts[`option_${k.toLowerCase()}`]} gegner={opts.gegner_szenarien?.[k.toLowerCase()]} onUpdate={() => {}} />
          ))}

          {/* Gesamtempfehlung */}
          {opts.empfohlene_option && (
            <AppleCard title="Strategos-Empfehlung" accentColor="#1DB954">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(29,185,84,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#1DB954" }}>{opts.empfohlene_option}</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>Option {opts.empfohlene_option} empfohlen</p>
                  <p style={{ fontSize: 11, color: "#888" }}>{opts.begruendung}</p>
                </div>
              </div>
              {opts.kritische_erfolgsfaktoren?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>Kritische Erfolgsfaktoren</p>
                  {opts.kritische_erfolgsfaktoren.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, color: "#333", marginBottom: 4 }}>
                      <TrendingUp style={{ width: 12, height: 12, color: "#1DB954", flexShrink: 0, marginTop: 2 }} />{f}
                    </div>
                  ))}
                </div>
              )}
              {opts.wege_die_vermieden_werden_sollten?.length > 0 && (
                <div style={{ padding: "10px 13px", background: "rgba(184,28,58,0.06)", borderRadius: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#B81C3A", textTransform: "uppercase", marginBottom: 6 }}>Zu vermeidende Wege (rechtlich riskant)</p>
                  {opts.wege_die_vermieden_werden_sollten.map((w, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, color: "#B81C3A", marginBottom: 4 }}>
                      <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 2 }} />{w}
                    </div>
                  ))}
                </div>
              )}
            </AppleCard>
          )}
        </>
      )}
    </div>
  );
}