/**
 * FORMAT 10 — Klausel-Vergleich (Vorher / Nachher)
 * IST-Formulierung vs. SOLL-Formulierung mit Risiko-Delta.
 */
const RISIKO_COLOR = { kritisch: "#B81C3A", hoch: "#FF9500", mittel: "#0A84FF", niedrig: "#1DB954", positiv: "#1DB954" };

export default function KlauselVergleich({ klausel }) {
  if (!klausel?.alternativ_formulierung && !klausel?.verhandlungsempfehlung) return null;

  const istRisikoColor = RISIKO_COLOR[klausel.risiko_stufe] || "#B81C3A";
  const sollRisikoColor = "#1DB954";

  const istNachteile = klausel.juristische_nachteile?.slice(0, 4) || [];
  const sollVorteile = klausel.juristische_vorteile?.slice(0, 4) || [];

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>FORMAT 10 · Klausel-Vergleich (Vorher / Nachher)</p>
        <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>IST-Formulierung vs. empfohlene SOLL-Formulierung</p>
      </div>

      <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* IST */}
        <div style={{ border: `2px solid ${istRisikoColor}40`, borderRadius: 11, overflow: "hidden" }}>
          <div style={{ background: istRisikoColor, padding: "8px 12px" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>IST-FORMULIERUNG</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>
              Risiko {klausel.risiko_stufe || "hoch"}/10
            </p>
          </div>
          <div style={{ padding: "10px 12px" }}>
            <p style={{ fontSize: 11, color: "#333", fontStyle: "italic", lineHeight: 1.5, marginBottom: 12 }}>
              „{klausel.kurzbeschreibung || klausel.rechtliche_mechanik || "Klausel in aktueller Fassung."}"
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {istNachteile.map((n, i) => (
                <div key={i} style={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 10, color: istRisikoColor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>■</span>
                  <p style={{ fontSize: 10, color: istRisikoColor }}>{n}</p>
                </div>
              ))}
              {istNachteile.length === 0 && (
                <p style={{ fontSize: 10, color: "#aaa", fontStyle: "italic" }}>Keine Nachteile identifiziert</p>
              )}
            </div>
          </div>
        </div>

        {/* SOLL */}
        <div style={{ border: `2px solid ${sollRisikoColor}40`, borderRadius: 11, overflow: "hidden" }}>
          <div style={{ background: sollRisikoColor, padding: "8px 12px" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>SOLL-FORMULIERUNG</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>
              Risiko deutlich reduziert
            </p>
          </div>
          <div style={{ padding: "10px 12px" }}>
            <p style={{ fontSize: 11, color: "#333", fontStyle: "italic", lineHeight: 1.5, marginBottom: 12 }}>
              „{klausel.alternativ_formulierung || klausel.verhandlungsempfehlung || "Empfohlene Neuformulierung nach Verhandlung."}"
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {sollVorteile.map((v, i) => (
                <div key={i} style={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 10, color: sollRisikoColor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>■</span>
                  <p style={{ fontSize: 10, color: sollRisikoColor }}>{v}</p>
                </div>
              ))}
              {sollVorteile.length === 0 && klausel.verhandlungsempfehlung && (
                <div style={{ display: "flex", gap: 5 }}>
                  <span style={{ fontSize: 10, color: sollRisikoColor, fontWeight: 700 }}>■</span>
                  <p style={{ fontSize: 10, color: sollRisikoColor }}>Verhandlungsempfehlung umgesetzt</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}