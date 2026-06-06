import { useState } from "react";
import { Copy, Check, FileText, BarChart2, Lightbulb, Scale, BookOpen } from "lucide-react";

function Section({ icon: Icon, title, color, children }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={13} color={color} />
        </div>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{title}</p>
      </div>
      <div style={{ padding: "12px 16px" }}>{children}</div>
    </div>
  );
}

function KV({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em", minWidth: 100, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 11.5, color: "#333", flex: 1, lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}

function CopyButton({ text, label = "Kopieren" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
      background: copied ? "#34C75915" : "rgba(0,0,0,0.05)",
      color: copied ? "#34C759" : "#555",
      border: `1px solid ${copied ? "#34C75930" : "rgba(0,0,0,0.1)"}`,
      cursor: "pointer", transition: "all 0.15s"
    }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Kopiert!" : label}
    </button>
  );
}

function buildNotionText(scenario) {
  const ctx = scenario.unternehmenskontext || {};
  const sit = scenario.situationsanalyse || {};
  const ki = scenario.ki_analyse || {};
  const opt = scenario.szenario_matrix || {};
  const emp = scenario.strategos_empfehlung || {};
  const akt = scenario.aktionsplan || {};

  const lines = [];
  lines.push(`# ${scenario.title}`);
  lines.push(`**Typ:** ${scenario.szenario_typ || "–"} | **Rechtsgebiet:** ${scenario.rechtsgebiet || "–"} | **Status:** ${scenario.status || "–"}`);
  lines.push("");

  if (ctx.unternehmen_name) {
    lines.push("## 🏢 Unternehmenskontext");
    lines.push(`- Unternehmen: ${ctx.unternehmen_name}`);
    if (ctx.branche) lines.push(`- Branche: ${ctx.branche}`);
    if (ctx.hauptsitz_land) lines.push(`- Sitz: ${ctx.hauptsitz_stadt || ""} ${ctx.hauptsitz_land}`);
    if (ctx.sachverhalt_lang) lines.push(`\n**Sachverhalt:** ${ctx.sachverhalt_lang}`);
    lines.push("");
  }

  if ((sit.module || []).length > 0) {
    lines.push("## ⚠️ Risikoanalyse");
    (sit.module || []).forEach(m => {
      lines.push(`### ${m.label || m.id}`);
      if (m.risiko_score) lines.push(`- Risikoscore: ${m.risiko_score}/10`);
      if (m.fazit) lines.push(`- Fazit: ${m.fazit}`);
    });
    if (sit.gesamt_risiko) lines.push(`\n**Gesamtrisiko:** ${sit.gesamt_risiko}/10`);
    if (sit.gesamt_exposure_eur) lines.push(`**Exposure:** €${sit.gesamt_exposure_eur.toLocaleString("de-DE")}`);
    lines.push("");
  }

  if (ki.vertrags_analyse) {
    lines.push("## 📄 Vertragsanalyse");
    const va = ki.vertrags_analyse;
    if (va.zusammenfassung) lines.push(va.zusammenfassung);
    if ((va.klauseln || []).length > 0) {
      lines.push("\n**Kritische Klauseln:**");
      va.klauseln.slice(0, 5).forEach(k => {
        lines.push(`- **${k.bezeichnung || k.typ}** (Risiko: ${k.risiko_level || "–"}): ${k.empfehlung || ""}`);
      });
    }
    lines.push("");
  }

  if (ki.handlungsoptionen) {
    lines.push("## 🔀 Handlungsoptionen");
    const ho = ki.handlungsoptionen;
    ["option_a", "option_b", "option_c"].forEach(key => {
      const o = ho[key];
      if (!o) return;
      lines.push(`### ${o.titel || key.toUpperCase()}`);
      if (o.beschreibung) lines.push(o.beschreibung);
      if (o.erfolgswahrscheinlichkeit) lines.push(`- Erfolgswahrscheinlichkeit: **${o.erfolgswahrscheinlichkeit}%**`);
      if (o.risiko) lines.push(`- Risiko: ${o.risiko}`);
    });
    lines.push("");
  }

  if (ki.quant_analyse) {
    lines.push("## 📊 Quantitative Analyse");
    const qa = ki.quant_analyse;
    if (qa.expected_value_eur) lines.push(`- Expected Value: €${Number(qa.expected_value_eur).toLocaleString("de-DE")}`);
    if (qa.monte_carlo_p50) lines.push(`- Monte Carlo P50: €${Number(qa.monte_carlo_p50).toLocaleString("de-DE")}`);
    if (qa.monte_carlo_p95) lines.push(`- Worst Case P95: €${Number(qa.monte_carlo_p95).toLocaleString("de-DE")}`);
    lines.push("");
  }

  if (emp.grundhaltung) {
    lines.push("## 🎯 Strategos-Empfehlung");
    lines.push(`**Grundhaltung:** ${emp.grundhaltung}`);
    if ((emp.groesste_hebel || []).length > 0) {
      lines.push("\n**Größte Hebel:**");
      emp.groesste_hebel.forEach(h => lines.push(`- ${h}`));
    }
    if ((emp.groesste_risiken || []).length > 0) {
      lines.push("\n**Größte Risiken:**");
      emp.groesste_risiken.forEach(r => lines.push(`- ${r}`));
    }
    lines.push("");
  }

  if ((akt.massnahmen || []).length > 0) {
    lines.push("## 🗺️ Umsetzungsplan");
    akt.massnahmen.slice(0, 8).forEach((m, i) => {
      lines.push(`${i + 1}. **${m.titel || m.aktion}** — ${m.zeitraum || ""} (${m.verantwortlich || "–"})`);
    });
    lines.push("");
  }

  lines.push("---");
  lines.push(`*Erstellt mit Strategos Enterprise · ${new Date().toLocaleDateString("de-DE")}*`);

  return lines.join("\n");
}

export default function NotionExportTab({ scenario }) {
  const ctx = scenario.unternehmenskontext || {};
  const sit = scenario.situationsanalyse || {};
  const ki = scenario.ki_analyse || {};
  const emp = scenario.strategos_empfehlung || {};
  const akt = scenario.aktionsplan || {};

  const notionText = buildNotionText(scenario);

  const hasData = ctx.unternehmen_name || (sit.module || []).length > 0 || ki.vertrags_analyse || ki.handlungsoptionen;

  if (!hasData) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
        <BookOpen size={36} color="#ddd" />
        <p style={{ fontSize: 14, fontWeight: 600, color: "#999", marginTop: 12 }}>Noch keine Analysedaten</p>
        <p style={{ fontSize: 11.5, color: "#bbb", marginTop: 6, maxWidth: 280 }}>Führen Sie zuerst die Analyse-Schritte 1–7 durch. Die Ergebnisse erscheinen hier automatisch.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Notion-Export</p>
          <p style={{ fontSize: 10.5, color: "#aaa", marginTop: 2 }}>Alle Analyseergebnisse · Kopieren &amp; in Notion einfügen</p>
        </div>
        <CopyButton text={notionText} label="Gesamtdokument kopieren" />
      </div>

      {/* Kontext */}
      {ctx.unternehmen_name && (
        <Section icon={FileText} title="Unternehmenskontext" color="#0A84FF">
          <KV label="Unternehmen" value={ctx.unternehmen_name} />
          <KV label="Branche" value={ctx.branche || ctx.branche_freitext} />
          <KV label="Sitz" value={ctx.hauptsitz_stadt ? `${ctx.hauptsitz_stadt}, ${ctx.hauptsitz_land}` : ctx.hauptsitz_land} />
          <KV label="Sachverhalt" value={ctx.sachverhalt_lang} />
          <KV label="Gegner" value={ctx.gegner_name ? `${ctx.gegner_name} (${ctx.gegner_rolle || ""})` : null} />
        </Section>
      )}

      {/* Risikoanalyse */}
      {(sit.module || []).length > 0 && (
        <Section icon={Scale} title="Risikoanalyse" color="#FF3B30">
          {sit.gesamt_risiko !== undefined && <KV label="Gesamtrisiko" value={`${sit.gesamt_risiko}/10`} />}
          {sit.gesamt_exposure_eur && <KV label="Exposure" value={`€${Number(sit.gesamt_exposure_eur).toLocaleString("de-DE")}`} />}
          {(sit.kritische_punkte || []).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", marginBottom: 5 }}>Kritische Punkte</p>
              {sit.kritische_punkte.map((p, i) => (
                <p key={i} style={{ fontSize: 11.5, color: "#333", marginBottom: 3 }}>• {p}</p>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Vertragsanalyse */}
      {ki.vertrags_analyse && (
        <Section icon={FileText} title="Vertragsanalyse" color="#FF9500">
          {ki.vertrags_analyse.zusammenfassung && (
            <p style={{ fontSize: 11.5, color: "#444", lineHeight: 1.6, marginBottom: 10 }}>{ki.vertrags_analyse.zusammenfassung}</p>
          )}
          {(ki.vertrags_analyse.klauseln || []).length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", marginBottom: 6 }}>Kritische Klauseln</p>
              {ki.vertrags_analyse.klauseln.slice(0, 6).map((k, i) => (
                <div key={i} style={{ padding: "7px 10px", background: "rgba(255,149,0,0.06)", borderRadius: 8, marginBottom: 5, borderLeft: "3px solid #FF9500" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{k.bezeichnung || k.typ}</p>
                  {k.risiko_level && <p style={{ fontSize: 10, color: "#FF9500" }}>Risiko: {k.risiko_level}</p>}
                  {k.empfehlung && <p style={{ fontSize: 10.5, color: "#555", marginTop: 3 }}>{k.empfehlung}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Handlungsoptionen */}
      {ki.handlungsoptionen && (
        <Section icon={Lightbulb} title="Handlungsoptionen & Wahrscheinlichkeiten" color="#1DB954">
          {["option_a", "option_b", "option_c"].map(key => {
            const o = ki.handlungsoptionen[key];
            if (!o) return null;
            const pct = o.erfolgswahrscheinlichkeit || 0;
            return (
              <div key={key} style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(29,185,84,0.05)", borderRadius: 10, border: "1px solid rgba(29,185,84,0.12)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{o.titel || key.toUpperCase()}</p>
                  {pct > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 60, height: 5, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: pct > 60 ? "#1DB954" : pct > 35 ? "#FF9500" : "#FF3B30", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#555" }}>{pct}%</span>
                    </div>
                  )}
                </div>
                {o.beschreibung && <p style={{ fontSize: 11, color: "#555", lineHeight: 1.5 }}>{o.beschreibung}</p>}
                {o.risiko && <p style={{ fontSize: 10.5, color: "#888", marginTop: 4 }}>⚠️ {o.risiko}</p>}
              </div>
            );
          })}
        </Section>
      )}

      {/* Quantitative Analyse */}
      {ki.quant_analyse && (
        <Section icon={BarChart2} title="Quantitative Analyse" color="#5856D6">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 10 }}>
            {[
              { label: "Expected Value", val: ki.quant_analyse.expected_value_eur },
              { label: "Monte Carlo P50", val: ki.quant_analyse.monte_carlo_p50 },
              { label: "Worst Case P95", val: ki.quant_analyse.monte_carlo_p95 },
            ].map(({ label, val }) => val ? (
              <div key={label} style={{ background: "rgba(88,86,214,0.05)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                <p style={{ fontSize: 9.5, color: "#aaa", textTransform: "uppercase", marginBottom: 3 }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#5856D6" }}>€{Number(val).toLocaleString("de-DE")}</p>
              </div>
            ) : null)}
          </div>
        </Section>
      )}

      {/* Empfehlung */}
      {emp.grundhaltung && (
        <Section icon={Scale} title="Strategos-Empfehlung" color="#AF52DE">
          <KV label="Grundhaltung" value={emp.grundhaltung} />
          {(emp.groesste_hebel || []).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", marginBottom: 4 }}>Größte Hebel</p>
              {emp.groesste_hebel.map((h, i) => <p key={i} style={{ fontSize: 11.5, color: "#333", marginBottom: 2 }}>🎯 {h}</p>)}
            </div>
          )}
          {(emp.groesste_risiken || []).length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", marginBottom: 4 }}>Größte Risiken</p>
              {emp.groesste_risiken.map((r, i) => <p key={i} style={{ fontSize: 11.5, color: "#333", marginBottom: 2 }}>⚠️ {r}</p>)}
            </div>
          )}
        </Section>
      )}

      {/* Umsetzungsplan */}
      {(akt.massnahmen || []).length > 0 && (
        <Section icon={FileText} title="Umsetzungsplan" color="#34C759">
          {akt.massnahmen.slice(0, 8).map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: "#34C75915", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#34C759" }}>{i + 1}</span>
              </div>
              <div>
                <p style={{ fontSize: 11.5, fontWeight: 600, color: "#1a1a1a" }}>{m.titel || m.aktion}</p>
                {m.zeitraum && <p style={{ fontSize: 10.5, color: "#aaa" }}>{m.zeitraum} · {m.verantwortlich || ""}</p>}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Copy All */}
      <div style={{ marginTop: 20, padding: "14px 16px", background: "rgba(0,0,0,0.03)", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: "#555" }}>Gesamtdokument für Notion</p>
          <p style={{ fontSize: 10.5, color: "#aaa", marginTop: 2 }}>Markdown · In Notion einfügen mit ⌘V</p>
        </div>
        <CopyButton text={notionText} label="Alles kopieren" />
      </div>
    </div>
  );
}