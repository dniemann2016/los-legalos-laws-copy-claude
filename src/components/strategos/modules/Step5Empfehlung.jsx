import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Download, Shield, Sword, Scale } from "lucide-react";
import { AppleCard, AppleButton, ApplePill, SF } from "../AppleCard";

function GrundHaltungBadge({ h }) {
  const cfg = {
    offensiv: { color: "#FF3B30", icon: "⚔️", label: "Offensiv" },
    defensiv: { color: "#007AFF", icon: "🛡️", label: "Defensiv" },
    kooperativ: { color: "#34C759", icon: "🤝", label: "Kooperativ" },
    strategisch: { color: "#5856D6", icon: "♟", label: "Strategisch" },
  };
  const c = cfg[h] || cfg.strategisch;
  return (
    <div style={{ padding: "14px 18px", background: `${c.color}10`, border: `2px solid ${c.color}30`, borderRadius: 16, textAlign: "center" }}>
      <div style={{ fontSize: 28 }}>{c.icon}</div>
      <p style={{ fontSize: 13, fontWeight: 700, color: c.color, marginTop: 4 }}>{c.label}</p>
      <p style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Grundhaltung</p>
    </div>
  );
}

function PrinzipCard({ item, source }) {
  const colors = { "Sun Tzu": "#FF3B30", "Machiavelli": "#5856D6", "Harvard": "#34C759" };
  const c = colors[source] || "#888";
  return (
    <div style={{ padding: "12px 14px", background: `${c}08`, border: `1px solid ${c}20`, borderRadius: 12, marginBottom: 8 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: c, textTransform: "uppercase", marginBottom: 4 }}>{source} · {item.prinzip}</p>
      <p style={{ fontSize: 12, color: "#1a1a1a", fontWeight: 600, marginBottom: 3 }}>{item.anwendung}</p>
      <p style={{ fontSize: 11, color: "#555", fontStyle: "italic" }}>{item.zitat}</p>
    </div>
  );
}

function HorizontCard({ data, label, color }) {
  if (!data) return null;
  return (
    <div style={{ padding: "13px 15px", background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 14 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>{data.ziel}</p>
      {data.massnahmen?.length > 0 && (
        <ul style={{ margin: 0, padding: "0 0 0 14px" }}>
          {data.massnahmen.map((m, i) => <li key={i} style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>{m}</li>)}
        </ul>
      )}
      {data.erfolgsmessung && <p style={{ fontSize: 10, color, marginTop: 6 }}>✓ {data.erfolgsmessung}</p>}
    </div>
  );
}

export default function Step5Empfehlung({ scenario, onSave }) {
  const ctx = scenario.unternehmenskontext || {};
  const sit = scenario.situationsanalyse || {};
  const mat = scenario.szenario_matrix || {};
  const act = scenario.aktionsplan || {};
  const [emp, setEmp] = useState(scenario.strategos_empfehlung || {});
  const [gen, setGen] = useState(false);

  const generate = async () => {
    setGen(true);
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist Strategos — der ultimative Großkanzlei-Berater für Konzernmandate. Erstelle die Gesamtempfehlung.

UNTERNEHMEN: ${ctx.unternehmen_name} (${ctx.rechtsform}, ${ctx.branche}), Umsatz ${ctx.umsatz}€, Märkte: ${(ctx.operative_maerkte || []).join(",")}
SACHVERHALT: ${ctx.sachverhalt_lang}
GEGNER: ${ctx.gegner_name} (${ctx.gegner_rolle})
GESAMT-RISIKO: ${sit.gesamt_risiko || "—"}/10
EXPOSURE: ${sit.gesamt_exposure_eur || "—"}€
TOP-SZENARIEN: ${(mat.szenarien || []).slice(0, 3).map(s => `${s.bezeichnung} (${s.erfolg_pct}%)`).join("; ")}
AKTIONSPLAN: ${(act.massnahmen || []).length} Maßnahmen

Liefere:
1. machtposition: Welche Machtposition hat das Unternehmen wirklich?
2. groesste_hebel: Top-3 strategische Hebel (array)
3. groesste_risiken: Top-3 existenzielle Risiken (array)
4. grundhaltung: offensiv/defensiv/kooperativ/strategisch
5. sun_tzu: 3 Prinzipien aus "Die Kunst des Krieges" mit prinzip, anwendung(konkret!), zitat
6. machiavelli: 3 Prinzipien aus "Der Fürst" mit prinzip, anwendung(konkret!), zitat
7. harvard: Harvard-Verhandlungsstrategie mit interessen(Gegner + Eigene), beste_alternative_batna, zone_moeglicher_einigung
8. horizont_1: 0-90 Tage — ziel, massnahmen(array), erfolgsmessung
9. horizont_2: 3-18 Monate — ziel, massnahmen(array), erfolgsmessung
10. horizont_3: 18+ Monate — ziel, massnahmen(array), erfolgsmessung
11. risiko_chancen_karte: 4-6 Einträge mit aspekt, risiko, chance, bewertung(0-10)`,
      response_json_schema: {
        type: "object",
        properties: {
          machtposition: { type: "string" },
          groesste_hebel: { type: "array", items: { type: "string" } },
          groesste_risiken: { type: "array", items: { type: "string" } },
          grundhaltung: { type: "string" },
          sun_tzu: { type: "array", items: { type: "object", properties: { prinzip: { type: "string" }, anwendung: { type: "string" }, zitat: { type: "string" } } } },
          machiavelli: { type: "array", items: { type: "object", properties: { prinzip: { type: "string" }, anwendung: { type: "string" }, zitat: { type: "string" } } } },
          harvard: { type: "object", properties: { interessen: { type: "string" }, beste_alternative_batna: { type: "string" }, zone_moeglicher_einigung: { type: "string" } } },
          horizont_1: { type: "object", properties: { ziel: { type: "string" }, massnahmen: { type: "array", items: { type: "string" } }, erfolgsmessung: { type: "string" } } },
          horizont_2: { type: "object", properties: { ziel: { type: "string" }, massnahmen: { type: "array", items: { type: "string" } }, erfolgsmessung: { type: "string" } } },
          horizont_3: { type: "object", properties: { ziel: { type: "string" }, massnahmen: { type: "array", items: { type: "string" } }, erfolgsmessung: { type: "string" } } },
          risiko_chancen_karte: { type: "array", items: { type: "object", properties: { aspekt: { type: "string" }, risiko: { type: "string" }, chance: { type: "string" }, bewertung: { type: "number" } } } }
        }
      },
      model: "claude_sonnet_4_6"
    });
    setEmp(r);
    await onSave({ strategos_empfehlung: r });
    setGen(false);
  };

  const exportPDF = async () => {
    const content = `STRATEGOS ENTERPRISE — GESAMTEMPFEHLUNG
Unternehmen: ${ctx.unternehmen_name}
Datum: ${new Date().toLocaleDateString("de-DE")}

MACHTPOSITION:
${emp.machtposition || "—"}

GRÖẞTE HEBEL:
${(emp.groesste_hebel || []).map((h, i) => `${i + 1}. ${h}`).join("\n")}

GRÖẞTE RISIKEN:
${(emp.groesste_risiken || []).map((r, i) => `${i + 1}. ${r}`).join("\n")}

GRUNDHALTUNG: ${emp.grundhaltung || "—"}

SUN TZU:
${(emp.sun_tzu || []).map(s => `• ${s.prinzip}: ${s.anwendung}`).join("\n")}

MACHIAVELLI:
${(emp.machiavelli || []).map(s => `• ${s.prinzip}: ${s.anwendung}`).join("\n")}

HARVARD-VERHANDLUNG:
${emp.harvard ? `BATNA: ${emp.harvard.beste_alternative_batna}\nZOPA: ${emp.harvard.zone_moeglicher_einigung}` : "—"}

HORIZONTE:
H1 (0-90 Tage): ${emp.horizont_1?.ziel || "—"}
H2 (3-18 Monate): ${emp.horizont_2?.ziel || "—"}
H3 (18+ Monate): ${emp.horizont_3?.ziel || "—"}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `Strategos_Empfehlung_${new Date().toISOString().slice(0, 10)}.txt`; a.click();
  };

  const has = Object.keys(emp).length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, ...SF }}>
      <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#AF52DE", letterSpacing: "0.15em", textTransform: "uppercase" }}>Schritt 5 · Enterprise</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", marginTop: 4 }}>Strategos-Empfehlung</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Gesamtstrategie · Sun Tzu · Machiavelli · Harvard · 3-Horizonte</p>
      </div>

      <AppleCard title="Gesamtempfehlung generieren" accentColor="#AF52DE">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <p style={{ fontSize: 12, color: "#555", flex: 1, minWidth: 180 }}>Synthese aller vorherigen Schritte zu einer vollständigen Strategie.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <AppleButton onClick={generate} disabled={gen} variant="violet" icon={Sparkles}>{gen ? "Analysiert…" : has ? "Neu generieren" : "Strategos starten"}</AppleButton>
            {has && <AppleButton onClick={exportPDF} variant="ghost" icon={Download}>Export</AppleButton>}
          </div>
        </div>
      </AppleCard>

      {has && (
        <>
          {/* Machtposition & Grundhaltung */}
          <AppleCard title="Strategische Ausgangslage" accentColor="#1a1a1a">
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>Machtposition</p>
                <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.5 }}>{emp.machtposition}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#34C759", textTransform: "uppercase", marginBottom: 5 }}>💡 Größte Hebel</p>
                    {(emp.groesste_hebel || []).map((h, i) => <p key={i} style={{ fontSize: 12, color: "#1a1a1a", marginBottom: 3, display: "flex", gap: 6 }}><span style={{ color: "#34C759", fontWeight: 700 }}>{i + 1}.</span> {h}</p>)}
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#FF3B30", textTransform: "uppercase", marginBottom: 5 }}>⚠ Größte Risiken</p>
                    {(emp.groesste_risiken || []).map((r, i) => <p key={i} style={{ fontSize: 12, color: "#1a1a1a", marginBottom: 3, display: "flex", gap: 6 }}><span style={{ color: "#FF3B30", fontWeight: 700 }}>{i + 1}.</span> {r}</p>)}
                  </div>
                </div>
              </div>
              {emp.grundhaltung && <GrundHaltungBadge h={emp.grundhaltung} />}
            </div>
          </AppleCard>

          {/* Sun Tzu */}
          {emp.sun_tzu?.length > 0 && (
            <AppleCard title="☯ Sun Tzu — Die Kunst des Krieges" accentColor="#FF3B30">
              {emp.sun_tzu.map((s, i) => <PrinzipCard key={i} item={s} source="Sun Tzu" />)}
            </AppleCard>
          )}

          {/* Machiavelli */}
          {emp.machiavelli?.length > 0 && (
            <AppleCard title="♟ Machiavelli — Der Fürst" accentColor="#5856D6">
              {emp.machiavelli.map((s, i) => <PrinzipCard key={i} item={s} source="Machiavelli" />)}
            </AppleCard>
          )}

          {/* Harvard */}
          {emp.harvard && (
            <AppleCard title="🤝 Harvard-Verhandlungsstrategie" accentColor="#34C759">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[["Interessen (Analyse)", emp.harvard.interessen, "#1a1a1a"], ["Beste Alternative (BATNA)", emp.harvard.beste_alternative_batna, "#007AFF"], ["Zone möglicher Einigung (ZOPA)", emp.harvard.zone_moeglicher_einigung, "#34C759"]].map(([l, v, c]) => (
                  <div key={l} style={{ padding: "10px 13px", background: "rgba(0,0,0,0.025)", borderRadius: 10 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: c, textTransform: "uppercase", marginBottom: 4 }}>{l}</p>
                    <p style={{ fontSize: 12, color: "#1a1a1a" }}>{v}</p>
                  </div>
                ))}
              </div>
            </AppleCard>
          )}

          {/* 3 Horizonte */}
          <AppleCard title="Strategische Horizonte" accentColor="#007AFF">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <HorizontCard data={emp.horizont_1} label="Horizont 1 · 0–90 Tage" color="#FF3B30" />
              <HorizontCard data={emp.horizont_2} label="Horizont 2 · 3–18 Monate" color="#FF9500" />
              <HorizontCard data={emp.horizont_3} label="Horizont 3 · 18+ Monate" color="#34C759" />
            </div>
          </AppleCard>

          {/* Risiko-Chancen-Karte */}
          {emp.risiko_chancen_karte?.length > 0 && (
            <AppleCard title="Risiko-Chancen-Matrix" accentColor="#FF9500">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                      {["Aspekt", "Risiko", "Chance", "Bewertung"].map(h => <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {emp.risiko_chancen_karte.map((e, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                        <td style={{ padding: "9px 12px", fontWeight: 600, color: "#1a1a1a" }}>{e.aspekt}</td>
                        <td style={{ padding: "9px 12px", color: "#FF3B30", fontSize: 11 }}>{e.risiko}</td>
                        <td style={{ padding: "9px 12px", color: "#34C759", fontSize: 11 }}>{e.chance}</td>
                        <td style={{ padding: "9px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ flex: 1, height: 5, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${(e.bewertung || 0) * 10}%`, background: (e.bewertung || 0) >= 7 ? "#FF3B30" : (e.bewertung || 0) >= 4 ? "#FF9500" : "#34C759", borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, minWidth: 22, color: "#1a1a1a" }}>{e.bewertung}/10</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AppleCard>
          )}
        </>
      )}
    </div>
  );
}