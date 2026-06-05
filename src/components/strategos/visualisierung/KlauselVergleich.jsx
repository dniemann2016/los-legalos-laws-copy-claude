/**
 * FORMAT 10 — Klausel-Vergleich (Vorher / Nachher)
 * Nutzt primär KI-analysierte Formulierungen; fällt auf Rohdaten zurück.
 */
const RISIKO_COLOR = { kritisch: "#B81C3A", hoch: "#FF9500", mittel: "#0A84FF", niedrig: "#1DB954", positiv: "#1DB954" };

export default function KlauselVergleich({ klausel, kiResult }) {
  if (!klausel) return null;

  const hasKI = !!(kiResult?.soll_formulierung || kiResult?.ist_formulierung);
  const istRisikoColor = RISIKO_COLOR[klausel.risiko_stufe] || "#B81C3A";

  // ── Inhalte aus KI oder Rohdaten ───────────────────────────────────────────
  const istText = hasKI
    ? (kiResult.ist_formulierung || klausel.kurzbeschreibung || klausel.rechtliche_mechanik || "Klausel in aktueller Fassung.")
    : (klausel.kurzbeschreibung || klausel.rechtliche_mechanik || "Klausel in aktueller Fassung.");
  const sollText = hasKI
    ? (kiResult.soll_formulierung || klausel.alternativ_formulierung || "")
    : (klausel.alternativ_formulierung || klausel.verhandlungsempfehlung || "");

  const istProbleme = hasKI ? (kiResult.ist_probleme || []) : (klausel.juristische_nachteile?.slice(0, 4) || []);
  const sollVorteile = hasKI ? (kiResult.soll_vorteile || []) : (klausel.juristische_vorteile?.slice(0, 4) || []);

  if (!sollText && !klausel.verhandlungsempfehlung) {
    return (
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "#bbb" }}>Keine Alternativformulierung — KI-Analyse starten für Vorher/Nachher-Vergleich.</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>FORMAT 10 · Klausel-Vergleich (Vorher / Nachher)</p>
          <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>IST-Formulierung vs. empfohlene SOLL-Formulierung</p>
        </div>
        {hasKI && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {kiResult.risiko_reduktion_pct && (
              <span style={{ fontSize: 10, fontWeight: 800, color: "#1DB954" }}>−{kiResult.risiko_reduktion_pct}% Risiko</span>
            )}
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(29,185,84,0.12)", color: "#1DB954" }}>KI-Analyse aktiv</span>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* IST */}
        <div style={{ border: `2px solid ${istRisikoColor}40`, borderRadius: 11, overflow: "hidden" }}>
          <div style={{ background: istRisikoColor, padding: "8px 12px" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>IST-FORMULIERUNG</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>Risiko: {klausel.risiko_stufe || "hoch"}</p>
          </div>
          <div style={{ padding: "10px 12px" }}>
            <p style={{ fontSize: 11, color: "#333", fontStyle: "italic", lineHeight: 1.5, marginBottom: 10 }}>„{istText}"</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {istProbleme.map((n, i) => (
                <div key={i} style={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 10, color: istRisikoColor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>■</span>
                  <p style={{ fontSize: 10, color: istRisikoColor }}>{n}</p>
                </div>
              ))}
              {istProbleme.length === 0 && <p style={{ fontSize: 10, color: "#aaa", fontStyle: "italic" }}>Keine Nachteile identifiziert</p>}
            </div>
          </div>
        </div>

        {/* SOLL */}
        <div style={{ border: "2px solid rgba(29,185,84,0.4)", borderRadius: 11, overflow: "hidden" }}>
          <div style={{ background: "#1DB954", padding: "8px 12px" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>SOLL-FORMULIERUNG</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>Risiko deutlich reduziert</p>
          </div>
          <div style={{ padding: "10px 12px" }}>
            <p style={{ fontSize: 11, color: "#333", fontStyle: "italic", lineHeight: 1.5, marginBottom: 10 }}>„{sollText || "KI-Analyse starten für optimierte Formulierung."}"</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {sollVorteile.map((v, i) => (
                <div key={i} style={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 10, color: "#1DB954", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>■</span>
                  <p style={{ fontSize: 10, color: "#1DB954" }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KI-Extras */}
      {hasKI && (
        <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
          {kiResult.kompromiss_formulierung && (
            <div style={{ padding: "9px 12px", background: "rgba(10,132,255,0.07)", border: "1px solid rgba(10,132,255,0.2)", borderRadius: 9 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#0A84FF", textTransform: "uppercase", marginBottom: 3 }}>Kompromissformulierung</p>
              <p style={{ fontSize: 11, color: "#333", fontStyle: "italic" }}>„{kiResult.kompromiss_formulierung}"</p>
            </div>
          )}
          {kiResult.verhandlungsargument && (
            <div style={{ padding: "8px 12px", background: "rgba(29,185,84,0.07)", borderRadius: 9, borderLeft: "3px solid #1DB954" }}>
              <p style={{ fontSize: 11, color: "#333" }}>Verhandlungsargument: {kiResult.verhandlungsargument}</p>
            </div>
          )}
          {kiResult.gegner_einwand && (
            <div style={{ padding: "8px 12px", background: "rgba(184,28,58,0.05)", borderRadius: 9, borderLeft: "3px solid #B81C3A" }}>
              <p style={{ fontSize: 11, color: "#666" }}>Gegner-Einwand: {kiResult.gegner_einwand}</p>
            </div>
          )}
          {kiResult.rechtliche_grundlage && (
            <p style={{ fontSize: 10, color: "#888" }}>Rechtliche Grundlage: {kiResult.rechtliche_grundlage}</p>
          )}
        </div>
      )}
    </div>
  );
}