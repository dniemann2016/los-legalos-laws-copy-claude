import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Scale, FileText, AlertTriangle, Lightbulb, BarChart2, Map } from "lucide-react";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 7, fontSize: 10, fontWeight: 600, background: copied ? "#34C75915" : "rgba(0,0,0,0.05)", color: copied ? "#34C759" : "#888", border: `1px solid ${copied ? "#34C75930" : "rgba(0,0,0,0.08)"}`, cursor: "pointer", transition: "all 0.15s", flexShrink: 0 }}>
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? "Kopiert" : "Kopieren"}
    </button>
  );
}

function EinschaetzungBlock({ title, icon: Icon, color, content, subItems }) {
  const [open, setOpen] = useState(true);
  if (!content && (!subItems || subItems.length === 0)) return null;

  const fullText = [content, ...(subItems || []).map(s => `• ${s.label}: ${s.value}`)].filter(Boolean).join("\n");

  return (
    <div style={{ background: "#fff", borderRadius: 13, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "11px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={13} color={color} />
        </div>
        <p style={{ flex: 1, fontSize: 12, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{title}</p>
        <CopyButton text={fullText} />
        {open ? <ChevronUp size={13} color="#aaa" /> : <ChevronDown size={13} color="#aaa" />}
      </button>
      {open && (
        <div style={{ padding: "2px 14px 14px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          {content && (
            <p style={{ fontSize: 11.5, color: "#444", lineHeight: 1.65, marginTop: 10, whiteSpace: "pre-wrap" }}>{content}</p>
          )}
          {(subItems || []).length > 0 && (
            <div style={{ marginTop: content ? 10 : 8, display: "flex", flexDirection: "column", gap: 7 }}>
              {subItems.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 11px", background: color + "08", borderRadius: 9, borderLeft: `3px solid ${color}` }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: "#555", margin: 0 }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: "#333", margin: "3px 0 0", lineHeight: 1.55 }}>{item.value}</p>
                  </div>
                  {item.badge && (
                    <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 9.5, fontWeight: 700, background: item.badgeColor + "20", color: item.badgeColor, alignSelf: "flex-start", flexShrink: 0 }}>
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
      <Scale size={38} color="#ddd" />
      <p style={{ fontSize: 13.5, fontWeight: 600, color: "#bbb", marginTop: 14 }}>Noch keine rechtlichen Einschätzungen</p>
      <p style={{ fontSize: 11, color: "#ccc", marginTop: 6, maxWidth: 260, lineHeight: 1.6 }}>
        Führen Sie die KI-Analyse in den Schritten 1–7 durch. Alle generierten Begründungen erscheinen hier automatisch.
      </p>
    </div>
  );
}

export default function RechtlicheEinschaetzungenTab({ scenario }) {
  const ki = scenario.ki_analyse || {};
  const sit = scenario.situationsanalyse || {};
  const emp = scenario.strategos_empfehlung || {};
  const ctx = scenario.unternehmenskontext || {};

  // ── Rechtsgebiet-Analysen aus Schritt 2 ──
  const rechtsgebietModule = (sit.module || []).filter(m => m.fazit || m.analyse || m.risiko_score !== undefined);

  // ── Vertragsanalyse-Einschätzungen ──
  const vertragsKlauseln = (ki.vertrags_analyse?.klauseln || []).filter(k => k.empfehlung || k.beschreibung);

  // ── Patentanalyse ──
  const patentAnalyse = ki.patent_analyse;

  // ── Handlungsoptionen ──
  const handlungsOptionen = ki.handlungsoptionen;

  // ── Quantitative Einschätzung ──
  const quantAnalyse = ki.quant_analyse;

  // ── Umsetzungsplan rechtliche Hinweise ──
  const umsetzungHinweise = ki.umsetzungsplan;

  // ── KI-Briefing / Kontext-Analyse ──
  const kiBriefing = scenario.ki_kontext?.analyse;

  const hasAnyData = kiBriefing || rechtsgebietModule.length > 0 || vertragsKlauseln.length > 0
    || patentAnalyse || handlungsOptionen || quantAnalyse || umsetzungHinweise
    || emp.grundhaltung;

  if (!hasAnyData) return <EmptyState />;

  return (
    <div style={{ fontFamily: "-apple-system,'Helvetica Neue',Arial,sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Rechtliche Einschätzungen &amp; Begründungen</p>
        <p style={{ fontSize: 10.5, color: "#aaa", marginTop: 3 }}>Alle KI-generierten Analysen · automatisch aus den Schritten aggregiert</p>
      </div>

      {/* KI-Briefing */}
      {kiBriefing && (
        <EinschaetzungBlock
          title="KI-Briefing & Ersteinschätzung"
          icon={Lightbulb}
          color="#5856D6"
          content={typeof kiBriefing === "string" ? kiBriefing : kiBriefing.zusammenfassung || JSON.stringify(kiBriefing, null, 2)}
        />
      )}

      {/* Rechtsgebiet-Analysen */}
      {rechtsgebietModule.map((m, i) => (
        <EinschaetzungBlock
          key={i}
          title={m.label || m.id || `Rechtsgebiet ${i + 1}`}
          icon={Scale}
          color="#FF9500"
          content={m.fazit || m.analyse}
          subItems={[
            m.risiko_score !== undefined && { label: "Risikoscore", value: `${m.risiko_score}/10`, badge: m.risiko_score >= 7 ? "Hoch" : m.risiko_score >= 4 ? "Mittel" : "Niedrig", badgeColor: m.risiko_score >= 7 ? "#FF3B30" : m.risiko_score >= 4 ? "#FF9500" : "#34C759" },
            m.exposure_eur && { label: "Finanzielles Exposure", value: `€${Number(m.exposure_eur).toLocaleString("de-DE")}` },
            ...(m.kritische_normen || []).map(n => ({ label: "Kritische Norm", value: n })),
          ].filter(Boolean)}
        />
      ))}

      {/* Vertragsanalyse */}
      {vertragsKlauseln.length > 0 && (
        <EinschaetzungBlock
          title="Vertragsrechtliche Einschätzungen"
          icon={FileText}
          color="#0A84FF"
          content={ki.vertrags_analyse?.zusammenfassung}
          subItems={vertragsKlauseln.slice(0, 8).map(k => ({
            label: k.bezeichnung || k.typ || "Klausel",
            value: k.empfehlung || k.beschreibung || "",
            badge: k.risiko_level,
            badgeColor: k.risiko_level === "hoch" || k.risiko_level === "kritisch" ? "#FF3B30" : k.risiko_level === "mittel" ? "#FF9500" : "#34C759",
          }))}
        />
      )}

      {/* Patentanalyse */}
      {patentAnalyse && (
        <EinschaetzungBlock
          title="Patentrechtliche Einschätzung"
          icon={AlertTriangle}
          color="#FF3B30"
          content={patentAnalyse.zusammenfassung || (typeof patentAnalyse === "string" ? patentAnalyse : null)}
          subItems={[
            patentAnalyse.verletzungsrisiko !== undefined && { label: "Verletzungsrisiko", value: `${patentAnalyse.verletzungsrisiko}%`, badge: patentAnalyse.verletzungsrisiko > 60 ? "Hoch" : "Mittel", badgeColor: patentAnalyse.verletzungsrisiko > 60 ? "#FF3B30" : "#FF9500" },
            patentAnalyse.fto_einschaetzung && { label: "FTO-Einschätzung", value: patentAnalyse.fto_einschaetzung },
            patentAnalyse.empfehlung && { label: "Empfehlung", value: patentAnalyse.empfehlung },
          ].filter(Boolean)}
        />
      )}

      {/* Handlungsoptionen rechtliche Bewertung */}
      {handlungsOptionen && (
        <EinschaetzungBlock
          title="Rechtliche Bewertung der Handlungsoptionen"
          icon={Lightbulb}
          color="#1DB954"
          content={handlungsOptionen.gesamt_empfehlung || handlungsOptionen.einleitung}
          subItems={["option_a", "option_b", "option_c"].map(key => {
            const o = handlungsOptionen[key];
            if (!o) return null;
            const pct = o.erfolgswahrscheinlichkeit;
            return {
              label: o.titel || key.toUpperCase(),
              value: [o.rechtliche_einschaetzung || o.beschreibung, o.risiko ? `Risiko: ${o.risiko}` : null].filter(Boolean).join(" — "),
              badge: pct ? `${pct}%` : null,
              badgeColor: pct > 60 ? "#1DB954" : pct > 35 ? "#FF9500" : "#FF3B30",
            };
          }).filter(Boolean)}
        />
      )}

      {/* Quantitative Einschätzung */}
      {quantAnalyse && (
        <EinschaetzungBlock
          title="Quantitative Rechtsbewertung"
          icon={BarChart2}
          color="#5856D6"
          content={quantAnalyse.zusammenfassung || quantAnalyse.kommentar}
          subItems={[
            quantAnalyse.expected_value_eur && { label: "Expected Value (EV)", value: `€${Number(quantAnalyse.expected_value_eur).toLocaleString("de-DE")}` },
            quantAnalyse.monte_carlo_p50 && { label: "Monte Carlo P50", value: `€${Number(quantAnalyse.monte_carlo_p50).toLocaleString("de-DE")}` },
            quantAnalyse.monte_carlo_p95 && { label: "Worst Case P95", value: `€${Number(quantAnalyse.monte_carlo_p95).toLocaleString("de-DE")}`, badge: "Worst Case", badgeColor: "#FF3B30" },
            quantAnalyse.bussgelder_max && { label: "Max. Bußgeld", value: `€${Number(quantAnalyse.bussgelder_max).toLocaleString("de-DE")}` },
          ].filter(Boolean)}
        />
      )}

      {/* Strategos-Gesamtempfehlung */}
      {emp.grundhaltung && (
        <EinschaetzungBlock
          title="Strategos-Gesamtempfehlung"
          icon={Map}
          color="#AF52DE"
          content={emp.grundhaltung}
          subItems={[
            ...(emp.groesste_hebel || []).map(h => ({ label: "Hebel", value: h })),
            ...(emp.groesste_risiken || []).map(r => ({ label: "Risiko", value: r, badge: "⚠️", badgeColor: "#FF3B30" })),
            emp.harvard?.batna && { label: "BATNA", value: emp.harvard.batna },
          ].filter(Boolean)}
        />
      )}

      {/* Umsetzung rechtliche Hinweise */}
      {umsetzungHinweise?.rechtliche_hinweise && (
        <EinschaetzungBlock
          title="Rechtliche Hinweise zur Umsetzung"
          icon={AlertTriangle}
          color="#FF9500"
          content={Array.isArray(umsetzungHinweise.rechtliche_hinweise)
            ? umsetzungHinweise.rechtliche_hinweise.join("\n\n")
            : umsetzungHinweise.rechtliche_hinweise}
        />
      )}
    </div>
  );
}