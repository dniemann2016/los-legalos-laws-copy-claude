/**
 * FORMAT 03 — Zeitachse mit Eintrittsszenarien
 * Nutzt primär KI-analysierte Meilensteine; fällt auf Rohdaten zurück.
 */
export default function ZeitachseSzenarien({ klausel, kiResult }) {
  if (!klausel) return null;

  const hasKI = kiResult?.meilensteine?.length > 0;

  const HORIZONT_COLOR = { kurzfristig: "#FF9500", mittelfristig: "#B81C3A", langfristig: "#0A84FF" };
  const milestones = [0, 20, 50, 80, 100];
  const labels = ["HEUTE", "+6 Mon.", "+24 Mon.", "+48 Mon.", "+60 Mon."];

  if (hasKI) {
    // ── KI-Meilensteine als erweiterte Zeitachse ──────────────────────────────
    const kiMilestones = kiResult.meilensteine.slice(0, 6);
    return (
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>FORMAT 03 · Zeitachse mit Eintrittsszenarien</p>
            <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{klausel.klausel_typ} — Wann wird diese Klausel scharf?</p>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(29,185,84,0.12)", color: "#1DB954" }}>KI-Analyse aktiv</span>
        </div>

        {kiResult.kritischer_zeitpunkt && (
          <div style={{ padding: "8px 14px", background: "rgba(184,28,58,0.05)", borderBottom: "1px solid rgba(184,28,58,0.1)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#B81C3A" }}>⏰ Kritischer Zeitpunkt: {kiResult.kritischer_zeitpunkt}</p>
          </div>
        )}

        <div style={{ padding: "14px 14px 10px" }}>
          {/* Visueller Timeline mit KI-Meilensteinen */}
          <div style={{ position: "relative", paddingLeft: 16 }}>
            {/* Vertikale Linie */}
            <div style={{ position: "absolute", left: 7, top: 6, bottom: 6, width: 2, background: "rgba(0,0,0,0.1)", borderRadius: 99 }} />

            {kiMilestones.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, position: "relative" }}>
                {/* Punkt auf der Linie */}
                <div style={{
                  position: "absolute", left: -9, top: 4,
                  width: 10, height: 10, borderRadius: "50%",
                  background: m.kritisch ? "#B81C3A" : "#0A84FF",
                  border: "2px solid #fff",
                  boxShadow: m.kritisch ? "0 0 0 2px rgba(184,28,58,0.3)" : "none",
                  flexShrink: 0,
                }} />
                <div style={{
                  flex: 1, padding: "8px 11px",
                  background: m.kritisch ? "rgba(184,28,58,0.05)" : "rgba(0,0,0,0.025)",
                  border: `1px solid ${m.kritisch ? "rgba(184,28,58,0.2)" : "rgba(0,0,0,0.07)"}`,
                  borderRadius: 9,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: m.kritisch ? "#B81C3A" : "#555" }}>{m.zeitpunkt}</p>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      {m.wahrscheinlichkeit_pct != null && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: "rgba(0,0,0,0.06)", color: "#555" }}>
                          {m.wahrscheinlichkeit_pct}%
                        </span>
                      )}
                      {m.kritisch && <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: "#B81C3A", padding: "1px 6px", borderRadius: 4 }}>KRITISCH</span>}
                    </div>
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{m.ereignis}</p>
                  {m.trigger && <p style={{ fontSize: 10, color: "#666", marginTop: 2 }}>Trigger: {m.trigger}</p>}
                  {m.handlungsfenster_tage != null && (
                    <p style={{ fontSize: 9, color: "#0A84FF", marginTop: 3 }}>Handlungsfenster: {m.handlungsfenster_tage} Tage</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {kiResult.fruehwarnsignale?.length > 0 && (
            <div style={{ marginTop: 10, padding: "9px 12px", background: "rgba(255,149,0,0.07)", borderRadius: 9, borderLeft: "3px solid #FF9500" }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#FF9500", textTransform: "uppercase", marginBottom: 5 }}>Frühwarnsignale</p>
              {kiResult.fruehwarnsignale.map((s, i) => (
                <p key={i} style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>⚠ {s}</p>
              ))}
            </div>
          )}

          {kiResult.empfohlene_ueberwachung && (
            <p style={{ fontSize: 10, color: "#888", marginTop: 8, fontStyle: "italic" }}>
              Empfohlene Überwachung: {kiResult.empfohlene_ueberwachung}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Fallback: Rohdaten-Szenarien ─────────────────────────────────────────────
  const szenarien = (klausel.szenarien || []).filter(s => HORIZONT_COLOR[s.horizont]);
  if (!szenarien.length) {
    return (
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "#bbb" }}>Keine Szenariodaten — KI-Analyse starten für vollständige Zeitachse.</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>FORMAT 03 · Zeitachse mit Eintrittsszenarien</p>
        <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{klausel.klausel_typ} — Wann wird diese Klausel scharf?</p>
      </div>
      <div style={{ padding: "24px 20px 20px" }}>
        <div style={{ position: "relative", height: 120, marginBottom: 8 }}>
          {szenarien.map((s, i) => {
            const pos = { kurzfristig: 20, mittelfristig: 50, langfristig: 80 }[s.horizont] || 50;
            const color = HORIZONT_COLOR[s.horizont] || "#0A84FF";
            const top = i % 2 === 0 ? 0 : 30;
            return (
              <div key={i} style={{ position: "absolute", left: `calc(${pos}% - 70px)`, top, width: 140, padding: "8px 10px", background: color, borderRadius: 9, zIndex: 2 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
                  {s.eintrittsbedingung || s.beschreibung?.slice(0, 40) || s.horizont}
                </p>
                {s.risiken && <p style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{s.risiken?.slice(0, 45)}</p>}
                <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `8px solid ${color}` }} />
              </div>
            );
          })}
        </div>
        <div style={{ position: "relative", height: 32 }}>
          <div style={{ position: "absolute", top: 12, left: 0, right: 0, height: 2, background: "rgba(0,0,0,0.12)", borderRadius: 99 }} />
          {milestones.map((pos, i) => (
            <div key={i} style={{ position: "absolute", left: `${pos}%`, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.2)", background: "#fff", zIndex: 1 }} />
              <p style={{ fontSize: 9, color: "#888", marginTop: 4, whiteSpace: "nowrap", fontWeight: i === 0 ? 700 : 400 }}>{labels[i]}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 9, color: "#bbb", marginTop: 8, fontStyle: "italic" }}>⚠ KI-Analyse starten für quantifizierte Wahrscheinlichkeiten und Meilensteine</p>
      </div>
    </div>
  );
}