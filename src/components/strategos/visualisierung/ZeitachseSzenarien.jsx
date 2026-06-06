/**
 * FORMAT 03 — Zeitachse mit Eintrittsszenarien
 * Zeigt wann mit welcher Wahrscheinlichkeit welche Wirkung eintreten kann.
 */
export default function ZeitachseSzenarien({ klausel }) {
  if (!klausel?.szenarien?.length) return null;

  const HORIZONT_POS = { kurzfristig: 20, mittelfristig: 50, langfristig: 80 };
  const HORIZONT_LABEL = { kurzfristig: "+6 Mon.", mittelfristig: "+24 Mon.", langfristig: "+48 Mon." };
  const HORIZONT_COLOR = { kurzfristig: "#FF9500", mittelfristig: "#B81C3A", langfristig: "#0A84FF" };

  // Milestones: HEUTE + Szenarien
  const milestones = [0, 20, 50, 80, 100];
  const labels = ["HEUTE", "+6 Mon.", "+24 Mon.", "+48 Mon.", "+60 Mon."];

  const szenarien = klausel.szenarien.filter(s => HORIZONT_POS[s.horizont]);

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>FORMAT 03 · Zeitachse mit Eintrittsszenarien</p>
        <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
          {klausel.klausel_typ} — Wann wird diese Klausel scharf?
        </p>
      </div>

      <div style={{ padding: "24px 20px 20px" }}>
        {/* Szenarien-Bubbles über der Zeitachse */}
        <div style={{ position: "relative", height: 120, marginBottom: 8 }}>
          {szenarien.map((s, i) => {
            const pos = HORIZONT_POS[s.horizont] || 50;
            const color = HORIZONT_COLOR[s.horizont] || "#0A84FF";
            const top = i % 2 === 0 ? 0 : 30;
            return (
              <div key={i} style={{
                position: "absolute",
                left: `calc(${pos}% - 70px)`,
                top,
                width: 140,
                padding: "8px 10px",
                background: color,
                borderRadius: 9,
                zIndex: 2,
              }}>
                {s.eintrittsbedingung && (
                  <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", marginBottom: 2 }}>
                    P ≈ ~
                  </p>
                )}
                <p style={{ fontSize: 10, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
                  {s.eintrittsbedingung || s.beschreibung?.slice(0, 40) || s.horizont}
                </p>
                {s.risiken && (
                  <p style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                    {s.risiken?.slice(0, 45)}
                  </p>
                )}
                {/* Pfeil nach unten zur Linie */}
                <div style={{
                  position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
                  width: 0, height: 0,
                  borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
                  borderTop: `8px solid ${color}`,
                }} />
              </div>
            );
          })}
        </div>

        {/* Zeitachse */}
        <div style={{ position: "relative", height: 32 }}>
          {/* Linie */}
          <div style={{ position: "absolute", top: 12, left: 0, right: 0, height: 2, background: "rgba(0,0,0,0.12)", borderRadius: 99 }} />
          {/* Punkte + Labels */}
          {milestones.map((pos, i) => (
            <div key={i} style={{ position: "absolute", left: `${pos}%`, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.2)", background: "#fff", zIndex: 1 }} />
              <p style={{ fontSize: 9, color: "#888", marginTop: 4, whiteSpace: "nowrap", fontWeight: i === 0 ? 700 : 400 }}>{labels[i]}</p>
              {i === 0 && <p style={{ fontSize: 8, color: "#aaa" }}>Q{Math.floor(new Date().getMonth() / 3) + 1}/{String(new Date().getFullYear()).slice(2)}</p>}
            </div>
          ))}
        </div>

        {/* Legende */}
        <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          {szenarien.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: HORIZONT_COLOR[s.horizont] || "#aaa" }} />
              <p style={{ fontSize: 10, color: "#555" }}>{HORIZONT_LABEL[s.horizont]}: {s.horizont}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 9, color: "#bbb", marginTop: 8, fontStyle: "italic" }}>
          ⚠ Wahrscheinlichkeitsangaben sind Schätzwerte — Sensitivitätsanalyse empfohlen
        </p>
      </div>
    </div>
  );
}