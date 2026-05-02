/**
 * FORMAT 04 — Optionen als Card-Layout
 * Handlungsmöglichkeiten gegenüber einer kritischen Klausel — kompakt nebeneinander.
 */
const OPTIONEN_STANDARD = [
  { id: "A", label: "Akzeptieren", wahrscheinlichkeit: 100, kosten: "0 €", strat_wert: "negativ", farbe: "#636366" },
  { id: "B", label: "Nachverhandeln", wahrscheinlichkeit: 62, kosten: "85 k €", strat_wert: "hoch", farbe: "#1DB954" },
  { id: "D", label: "Kompensation", wahrscheinlichkeit: 78, kosten: "60 k €", strat_wert: "mittel", farbe: "#0A84FF" },
  { id: "F", label: "Klauselangriff", wahrscheinlichkeit: 31, kosten: "1.2 Mio €", strat_wert: "niedrig", farbe: "#B81C3A" },
];

function WertBadge({ value }) {
  const color = value === "hoch" ? "#1DB954" : value === "mittel" ? "#0A84FF" : value === "negativ" ? "#B81C3A" : "#888";
  return <span style={{ fontSize: 14, fontWeight: 800, color }}>{value}</span>;
}

export default function OptionenCards({ klausel }) {
  if (!klausel) return null;

  // Optionen aus Verhandlungsempfehlung + Szenarien ableiten, oder Standardoptionen
  const optionen = [];

  if (klausel.verhandlungsempfehlung) {
    optionen.push({
      id: "B", label: "Nachverhandeln",
      detail: klausel.verhandlungsempfehlung?.slice(0, 60),
      wahrscheinlichkeit: klausel.durchsetzbar ? 65 : 45,
      kosten: "Mittel",
      strat_wert: "hoch",
      farbe: "#1DB954",
      empfohlen: true,
    });
  }

  if (klausel.alternativ_formulierung) {
    optionen.push({
      id: "D", label: "Alt.-Formulierung",
      detail: klausel.alternativ_formulierung?.slice(0, 60),
      wahrscheinlichkeit: 78,
      kosten: "Gering",
      strat_wert: "mittel",
      farbe: "#0A84FF",
    });
  }

  optionen.push({
    id: "A", label: "Akzeptieren",
    detail: "Status Quo beibehalten",
    wahrscheinlichkeit: 100,
    kosten: "0 €",
    strat_wert: ["kritisch","hoch"].includes(klausel.risiko_stufe) ? "negativ" : "mittel",
    farbe: "#636366",
  });

  if (!klausel.durchsetzbar) {
    optionen.push({
      id: "F", label: "Klauselangriff",
      detail: klausel.durchsetzbarkeit?.slice(0, 60),
      wahrscheinlichkeit: 31,
      kosten: "1.2 Mio €",
      strat_wert: "niedrig",
      farbe: "#FF9500",
    });
  }

  const displayOptionen = optionen.length >= 2 ? optionen : OPTIONEN_STANDARD;

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>FORMAT 04 · Optionen als Card-Layout</p>
        <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Handlungsmöglichkeiten — von Akzeptanz bis Klauselangriff</p>
      </div>

      <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {displayOptionen.map((opt, i) => (
          <div key={i} style={{
            border: `2px solid ${opt.empfohlen ? opt.farbe : opt.farbe + "40"}`,
            borderRadius: 12,
            overflow: "hidden",
            background: opt.empfohlen ? `${opt.farbe}0a` : "#fafafa",
            position: "relative",
          }}>
            {opt.empfohlen && (
              <div style={{ position: "absolute", top: 0, right: 0, background: opt.farbe, padding: "2px 7px", borderBottomLeftRadius: 8 }}>
                <p style={{ fontSize: 8, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>Empfohlen</p>
              </div>
            )}
            {/* Header */}
            <div style={{ background: opt.empfohlen ? opt.farbe : opt.farbe + "20", padding: "10px 12px" }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: opt.empfohlen ? "#fff" : opt.farbe }}>{opt.id}</span>
              <p style={{ fontSize: 11, fontWeight: 700, color: opt.empfohlen ? "#fff" : opt.farbe, marginTop: 2 }}>{opt.label}</p>
              <p style={{ fontSize: 9, color: opt.empfohlen ? "rgba(255,255,255,0.7)" : "#888", marginTop: 1 }}>Handlungsoption</p>
            </div>
            {/* Body */}
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}