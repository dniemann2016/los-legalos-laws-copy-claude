import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Shield, AlertTriangle, TrendingUp } from "lucide-react";
import { AppleCard, AppleButton, ApplePill, AppleInput, AppleTextarea, AppleField, AppleSelect, SF } from "../AppleCard";

const ILLEGAL_WARNING = (
  <div style={{ margin: "10px 0", padding: "10px 14px", background: "rgba(184,28,58,0.12)", border: "2px solid #B81C3A", borderRadius: 11, display: "flex", gap: 10, alignItems: "flex-start" }}>
    <AlertTriangle style={{ width: 18, height: 18, color: "#B81C3A", flexShrink: 0, marginTop: 1 }} />
    <div>
      <p style={{ fontSize: 12, fontWeight: 800, color: "#B81C3A", textTransform: "uppercase", letterSpacing: "0.05em" }}>⚠ ACHTUNG: ILLEGALER WEG</p>
      <p style={{ fontSize: 11, color: "#B81C3A", marginTop: 2, lineHeight: 1.4 }}>Diese Option verstößt gegen geltendes Recht. Sie wird ausschließlich zu Informationszwecken aufgezeigt, damit Sie die Konsequenzen kennen. Das System empfiehlt diesen Weg ausdrücklich NICHT. Jegliche Umsetzung erfolgt auf eigenes strafrechtliches und zivilrechtliches Risiko.</p>
    </div>
  </div>
);

function FolgenBlock({ folgen }) {
  if (!folgen) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginTop: 10, marginBottom: 10 }}>
      {[["Kurzfristig (0–1J)", folgen.kurzfristig, "#FF3B30"], ["Mittelfristig (1–5J)", folgen.mittelfristig, "#FF9500"], ["Langfristig (5J+)", folgen.langfristig, "#1DB954"]].map(([l, v, c]) => v && (
        <div key={l} style={{ padding: "8px 10px", background: `${c}08`, border: `1px solid ${c}20`, borderRadius: 9 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: c, textTransform: "uppercase", marginBottom: 4 }}>{l}</p>
          <p style={{ fontSize: 11, color: "#333", lineHeight: 1.4 }}>{v}</p>
        </div>
      ))}
    </div>
  );
}

function ChancenRisikenBlock({ chancen, risiken }) {
  if (!chancen?.length && !risiken?.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
      {chancen?.length > 0 && (
        <div style={{ padding: "8px 11px", background: "rgba(29,185,84,0.06)", border: "1px solid rgba(29,185,84,0.2)", borderRadius: 9 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#1DB954", textTransform: "uppercase", marginBottom: 5 }}>Chancen</p>
          {chancen.map((c, i) => <p key={i} style={{ fontSize: 11, color: "#1a1a1a", marginBottom: 3 }}>+ {c}</p>)}
        </div>
      )}
      {risiken?.length > 0 && (
        <div style={{ padding: "8px 11px", background: "rgba(184,28,58,0.06)", border: "1px solid rgba(184,28,58,0.2)", borderRadius: 9 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#B81C3A", textTransform: "uppercase", marginBottom: 5 }}>Risiken</p>
          {risiken.map((r, i) => <p key={i} style={{ fontSize: 11, color: "#1a1a1a", marginBottom: 3 }}>− {r}</p>)}
        </div>
      )}
    </div>
  );
}

function ReaktionsSzenarien({ szenarien }) {
  if (!szenarien?.length) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>Mögliche Reaktionsszenarien & Empfohlene Reaktionen</p>
      {szenarien.map((s, i) => (
        <div key={i} style={{ padding: "8px 11px", background: "rgba(88,86,214,0.06)", border: "1px solid rgba(88,86,214,0.15)", borderRadius: 9, marginBottom: 5 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#5856D6", marginBottom: 3 }}>{s.szenario}</p>
          {s.wahrscheinlichkeit && <p style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>Wahrscheinlichkeit: {s.wahrscheinlichkeit}</p>}
          {s.reaktion && <p style={{ fontSize: 11, color: "#333" }}>→ Empfohlen: {s.reaktion}</p>}
        </div>
      ))}
    </div>
  );
}

function OptionPanel({ opt, data, gegner, isIllegal }) {
  const color = isIllegal ? "#B81C3A" : (opt === "A" ? "#1DB954" : opt === "B" ? "#FF9500" : "#0A84FF");
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: isIllegal ? "rgba(184,28,58,0.04)" : `${color}06`, border: `${isIllegal ? "2px" : "1px"} solid ${color}${isIllegal ? "50" : "25"}`, borderRadius: 16, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "13px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {isIllegal ? <AlertTriangle style={{ width: 15, height: 15, color }} /> : <Shield style={{ width: 15, height: 15, color }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Option {opt}: {data?.name || (isIllegal ? "Illegaler Weg" : "Handlungsoption")}</p>
            {isIllegal && <span style={{ fontSize: 9, fontWeight: 800, background: "#B81C3A", color: "#fff", padding: "2px 7px", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>ILLEGAL</span>}
          </div>
          <p style={{ fontSize: 10, color: "#888" }}>{data?.kernstrategie?.slice(0, 80) || ""}</p>
        </div>
        {data?.erfolg_pct && (
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{data.erfolg_pct}%</p>
            <p style={{ fontSize: 9, color: "#aaa" }}>Erfolg</p>
          </div>
        )}
        <span style={{ color: "#bbb", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${color}20` }}>
          {isIllegal && ILLEGAL_WARNING}

          {data?.beschreibung && (
            <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.7)", borderRadius: 10, marginTop: 12, marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 4 }}>Beschreibung</p>
              <p style={{ fontSize: 12, color: "#1a1a1a", lineHeight: 1.5 }}>{data.beschreibung}</p>
            </div>
          )}

          {/* Juristische Vor- & Nachteile */}
          <ChancenRisikenBlock chancen={data?.juristische_vorteile} risiken={data?.juristische_nachteile} />

          {/* Kurzfristige / Mittelfristige / Langfristige Folgen */}
          <FolgenBlock folgen={data?.folgen} />

          {/* Reaktionsszenarien */}
          <ReaktionsSzenarien szenarien={data?.reaktionsszenarien} />

          {/* Operativer Handlungsbaum */}
          {data?.handlungsbaum?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 7 }}>Operativer Handlungsbaum</p>
              {data.handlungsbaum.map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "7px 10px", background: "rgba(0,0,0,0.025)", borderRadius: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color, minWidth: 20 }}>{i + 1}.</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{h.schritt}</p>
                    {h.verantwortlich && <p style={{ fontSize: 10, color: "#888" }}>👤 {h.verantwortlich} · {h.frist}</p>}
                    {h.kosten_eur && <p style={{ fontSize: 10, color: "#888" }}>💰 {h.kosten_eur?.toLocaleString()}€</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Strafen (bei illegalen Wegen) */}
          {data?.strafen && (
            <div style={{ padding: "10px 12px", background: "rgba(184,28,58,0.08)", border: "1px solid rgba(184,28,58,0.2)", borderRadius: 10, marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#B81C3A", textTransform: "uppercase", marginBottom: 5 }}>Mögliche Strafen & Sanktionen</p>
              <p style={{ fontSize: 12, color: "#B81C3A" }}>{data.strafen}</p>
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[["Erfolg %", data?.erfolg_pct, color], ["Risiko %", data?.risiko_pct, "#B81C3A"], ["Zeithorizont", data?.zeithorizont, "#636366"]].map(([l, v, c]) => v !== undefined && (
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

  const OPTION_SCHEMA = {
    type: "object", properties: {
      name: { type: "string" },
      beschreibung: { type: "string" },
      kernstrategie: { type: "string" },
      erfolg_pct: { type: "number" },
      risiko_pct: { type: "number" },
      zeithorizont: { type: "string" },
      rechtliche_basis: { type: "string" },
      business_judgment_rule: { type: "string" },
      ist_illegal: { type: "boolean" },
      strafen: { type: "string" },
      juristische_vorteile: { type: "array", items: { type: "string" } },
      juristische_nachteile: { type: "array", items: { type: "string" } },
      folgen: { type: "object", properties: {
        kurzfristig: { type: "string" },
        mittelfristig: { type: "string" },
        langfristig: { type: "string" }
      }},
      reaktionsszenarien: { type: "array", items: { type: "object", properties: {
        szenario: { type: "string" }, wahrscheinlichkeit: { type: "string" }, reaktion: { type: "string" }
      }}},
      handlungsbaum: { type: "array", items: { type: "object", properties: {
        schritt: { type: "string" }, verantwortlich: { type: "string" }, frist: { type: "string" }, kosten_eur: { type: "number" }
      }}}
    }
  };

  const GEGNER_SCHEMA = { type: "object", properties: {
    reaktion: { type: "string" }, gegenreaktion: { type: "string" }, behoerden_reaktion: { type: "string" }
  }};

  const generate = async () => {
    setGenerating(true);
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist Senior-Partner einer Top-Kanzlei und strategischer Unternehmensberater (Sun Tzu + Machiavelli + Harvard-Methode).

UNTERNEHMENSKONTEXT:
Unternehmen: ${ctx.unternehmen_name} (${ctx.rechtsform}, ${ctx.branche}), Umsatz: ${ctx.umsatz ? (ctx.umsatz/1e6).toFixed(1)+"Mio.€" : "—"}, MA: ${ctx.mitarbeiter || "—"}
Märkte: ${(ctx.operative_maerkte || []).join(", ")}
Sachverhalt: ${ctx.sachverhalt_lang || "—"}
Gegner: ${ctx.gegner_name || "—"} (${ctx.gegner_rolle || "—"})
Zeitkritikalität: ${ctx.zeitkritikalitaet || 5}/10
Rechtsgebiete: ${(ctx.rechtsgebiete || []).join(", ")}
ZIELZUSTAND: ${zielZustand || "nicht definiert"}
Zeitrahmen: ${zeitraum}
RISIKO: ${sit.gesamt_risiko || "—"}/10, Exposure: ${sit.gesamt_exposure_eur ? (sit.gesamt_exposure_eur/1e6).toFixed(1)+"Mio.€" : "—"}

${scenario.ki_kontext?.ki_briefing ? `════ KI-BASIS-BRIEFING (aus Dokumenten-Analyse) ════\n${scenario.ki_kontext.ki_briefing}\n` : ""}
════ AUFTRAG ════

Erstelle ALLE sinnvollen Handlungsoptionen (3 bis 7, je nach Komplexität). 
Keine feste Anzahl — so viele wie sachlich gerechtfertigt sind.

FÜR JEDE OPTION (legal oder illegal):
1. name: prägnanter Titel der Option
2. beschreibung: vollständige inhaltliche Beschreibung
3. kernstrategie: strategische Logik
4. ist_illegal: true/false — WENN es ein illegaler Weg ist, MUSS ist_illegal=true gesetzt werden
5. strafen: bei illegalen Wegen — alle möglichen Strafen, Bußgelder, Strafverfolgungsrisiken (konkret mit §§)
6. juristische_vorteile: juristische Stärken dieser Option (4-5 Punkte)
7. juristische_nachteile: juristische Schwächen und Risiken (3-5 Punkte)
8. folgen: PFLICHT — kurz-/mittel-/langfristige Konsequenzen
9. reaktionsszenarien: 3 mögliche Szenarien die eintreten könnten + empfohlene Reaktion
10. handlungsbaum: 5-7 operative Schritte
11. erfolg_pct, risiko_pct, zeithorizont
12. rechtliche_basis: konkrete §§ und Normen
13. business_judgment_rule: § 93 Abs. 1 S. 2 AktG Schutz

WICHTIG: Falls es einen illegalen Weg gibt der wirtschaftlich günstiger wäre als alle legalen Wege — MUSS dieser aufgezeigt werden mit ist_illegal=true. Ebenso alle Graubereiche.

GEGNER-SZENARIEN: Pro Option die antizipierte Reaktion von Behörden, Wettbewerbern und Gerichten.

GESAMTBEWERTUNG:
- empfohlene_option (Bezeichnung), begruendung
- kritische_erfolgsfaktoren (5)
- wege_die_vermieden_werden_sollten (mit Begründung)`,
      response_json_schema: {
        type: "object",
        properties: {
          optionen: { type: "array", items: OPTION_SCHEMA },
          gegner_szenarien: { type: "array", items: GEGNER_SCHEMA },
          empfohlene_option: { type: "string" },
          begruendung: { type: "string" },
          kritische_erfolgsfaktoren: { type: "array", items: { type: "string" } },
          wege_die_vermieden_werden_sollten: { type: "array", items: { type: "string" } }
        }
      },
      model: "claude_sonnet_4_6"
    });
    setOpts(r);
    await onSave({ ki_analyse: { ...(scenario.ki_analyse || {}), handlungsoptionen: r, ziel_zustand: zielZustand, zeitraum } });
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
          {/* Illegale Wege zählen — Hinweis oben */}
          {(opts.optionen || []).some(o => o.ist_illegal) && (
            <div style={{ padding: "10px 14px", background: "rgba(184,28,58,0.08)", border: "1px solid rgba(184,28,58,0.3)", borderRadius: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <AlertTriangle style={{ width: 16, height: 16, color: "#B81C3A", flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: "#B81C3A", fontWeight: 600 }}>
                Diese Analyse enthält {(opts.optionen || []).filter(o => o.ist_illegal).length} illegale(n) Weg(e). Diese werden ausschließlich zur Information und Risikoaufklärung aufgezeigt.
              </p>
            </div>
          )}

          {(opts.optionen || []).map((opt, i) => (
            <OptionPanel
              key={i}
              opt={String.fromCharCode(65 + i)}
              data={opt}
              gegner={(opts.gegner_szenarien || [])[i]}
              isIllegal={!!opt.ist_illegal}
            />
          ))}

          {/* Gesamtempfehlung */}
          {opts.empfohlene_option && (
            <AppleCard title="Strategos-Empfehlung" accentColor="#1DB954">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(29,185,84,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#1DB954" }}>✓</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>Empfohlen: {opts.empfohlene_option}</p>
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
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#B81C3A", textTransform: "uppercase", marginBottom: 6 }}>Zu vermeidende Wege</p>
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