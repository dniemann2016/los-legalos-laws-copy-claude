/**
 * FORMAT 04 — Optionen als Card-Layout
 * Nutzt primär KI-analysierte Optionen; fällt auf Rohdaten zurück.
 */
function WertBadge({ value }) {
  const color = value === "hoch" ? "#1DB954" : value === "mittel" ? "#0A84FF" : value === "negativ" || value === "niedrig" ? "#B81C3A" : "#888";
  return <span style={{ fontSize: 14, fontWeight: 800, color }}>{value}</span>;
}

export default function OptionenCards({ klausel, kiResult }) {
  if (!klausel) return null;

  const hasKI = kiResult?.optionen?.length > 0;

  // ── KI-Ergebnis hat Vorrang ─────────────────────────────────────────────────
  const displayOptionen = hasKI
    ? kiResult.optionen.map(opt => ({
        id: opt.id || "–",
        label: opt.titel,
        detail: opt.beschreibung?.slice(0, 80),
        wahrscheinlichkeit: opt.wahrscheinlichkeit_pct,
        kosten: opt.kosten_label || (opt.kosten_eur ? `${opt.kosten_eur.toLocaleString("de-DE")} €` : "—"),
        strat_wert: opt.strategischer_wert,
        farbe: opt.empfohlen ? "#1DB954" : opt.strategischer_wert === "hoch" ? "#1DB954" : opt.strategischer_wert === "niedrig" ? "#B81C3A" : "#0A84FF",
        empfohlen: opt.empfohlen,
        risiken: opt.risiken || [],
        zeitaufwand: opt.zeitaufwand,
      }))
    : (() => {
        const opts = [];
        if (klausel.verhandlungsempfehlung) {
          opts.push({ id: "B", label: "Nachverhandeln", detail: klausel.verhandlungsempfehlung?.slice(0, 60), wahrscheinlichkeit: klausel.durchsetzbar ? 65 : 45, kosten: "Mittel", strat_wert: "hoch", farbe: "#1DB954", empfohlen: true, risiken: [] });
        }
        if (klausel.alternativ_formulierung) {
          opts.push({ id: "D", label: "Alt.-Formulierung", detail: klausel.alternativ_formulierung?.slice(0, 60), wahrscheinlichkeit: 78, kosten: "Gering", strat_wert: "mittel", farbe: "#0A84FF", risiken: [] });
        }
        opts.push({ id: "A", label: "Akzeptieren", detail: "Status Quo beibehalten", wahrscheinlichkeit: 100, kosten: "0 €", strat_wert: ["kritisch","hoch"].includes(klausel.risiko_stufe) ? "negativ" : "mittel", farbe: "#636366", risiken: [] });
        if (!klausel.durchsetzbar) {
          opts.push({ id: "F", label: "Klauselangriff", detail: klausel.durchsetzbarkeit?.slice(0, 60), wahrscheinlichkeit: 31, kosten: "1.2 Mio €", strat_wert: "niedrig", farbe: "#FF9500", risiken: [] });
        }
        return opts.length >= 2 ? opts : [
          { id: "A", label: "Akzeptieren", wahrscheinlichkeit: 100, kosten: "0 €", strat_wert: "negativ", farbe: "#636366", risiken: [] },
          { id: "B", label: "Nachverhandeln", wahrscheinlichkeit: 62, kosten: "85 k €", strat_wert: "hoch", farbe: "#1DB954", empfohlen: true, risiken: [] },
          { id: "D", label: "Kompensation", wahrscheinlichkeit: 78, kosten: "60 k €", strat_wert: "mittel", farbe: "#0A84FF", risiken: [] },
          { id: "F", label: "Klauselangriff", wahrscheinlichkeit: 31, kosten: "1.2 Mio €", strat_wert: "niedrig", farbe: "#B81C3A", risiken: [] },
        ];
      })();

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>FORMAT 04 · Optionen als Card-Layout</p>
          <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Handlungsmöglichkeiten — von Akzeptanz bis Klauselangriff</p>
        </div>
        {hasKI && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(29,185,84,0.12)", color: "#1DB954" }}>KI-Analyse aktiv</span>}
      </div>

      {hasKI && kiResult.beste_option_begruendung && (
        <div style={{ padding: "8px 14px", background: "rgba(29,185,84,0.05)", borderBottom: "1px solid rgba(29,185,84,0.1)" }}>
          <p style={{ fontSize: 11, color: "#333" }}>💡 {kiResult.beste_option_begruendung}</p>
        </div>
      )}

      <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {displayOptionen.map((opt, i) => (
          <div key={i} style={{
            border: `2px solid ${opt.empfohlen ? opt.farbe : opt.farbe + "40"}`,
            borderRadius: 12, overflow: "hidden",
            background: opt.empfohlen ? `${opt.farbe}0a` : "#fafafa",
            position: "relative",
          }}>
            {opt.empfohlen && (
              <div style={{ position: "absolute", top: 0, right: 0, background: opt.farbe, padding: "2px 7px", borderBottomLeftRadius: 8 }}>
                <p style={{ fontSize: 8, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>Empfohlen</p>
              </div>
            )}
            <div style={{ background: opt.empfohlen ? opt.farbe : opt.farbe + "20", padding: "10px 12px" }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: opt.empfohlen ? "#fff" : opt.farbe }}>{opt.id}</span>
              <p style={{ fontSize: 11, fontWeight: 700, color: opt.empfohlen ? "#fff" : opt.farbe, marginTop: 2 }}>{opt.label}</p>
            </div>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
              {opt.detail && <p style={{ fontSize: 10, color: "#555", lineHeight: 1.3 }}>{opt.detail}</p>}
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>Wahrscheinlichkeit</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>{opt.wahrscheinlichkeit}%</p>
              </div>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>Kosten</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#333" }}>{opt.kosten}</p>
              </div>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>Strat. Wert</p>
                <WertBadge value={opt.strat_wert} />
              </div>
              {opt.zeitaufwand && (
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>Zeitaufwand</p>
                  <p style={{ fontSize: 11, color: "#555" }}>{opt.zeitaufwand}</p>
                </div>
              )}
              {opt.risiken?.length > 0 && (
                <div>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#B81C3A", textTransform: "uppercase", marginBottom: 2 }}>Risiken</p>
                  {opt.risiken.slice(0, 2).map((r, ri) => <p key={ri} style={{ fontSize: 9, color: "#B81C3A" }}>• {r}</p>)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasKI && kiResult.verhandlungsstrategie && (
        <div style={{ margin: "0 14px 12px", padding: "9px 12px", background: "rgba(29,185,84,0.07)", borderRadius: 9, borderLeft: "3px solid #1DB954" }}>
          <p style={{ fontSize: 11, color: "#333" }}>Verhandlungsstrategie: {kiResult.verhandlungsstrategie}</p>
        </div>
      )}
    </div>
  );
}