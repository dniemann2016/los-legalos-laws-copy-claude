/**
 * FORMAT 01 — Klausel-Risiko-Heatmap
 * Nutzt primär KI-analysierte Scores; fällt auf Rohdaten zurück.
 */
export default function KlauselHeatmap({ klauseln, onSelect, selectedIdx, kiResult }) {
  if (!klauseln?.length) return null;

  const RISIKO_ORDER = ["kritisch", "hoch", "mittel", "niedrig", "positiv"];
  const RISIKO_COLOR = { kritisch: "#B81C3A", hoch: "#FF9500", mittel: "#0A84FF", niedrig: "#1DB954", positiv: "#1DB954" };
  const RISIKO_SCORE = { kritisch: 9, hoch: 7.5, mittel: 5.5, niedrig: 3, positiv: 2 };
  const LABEL = { kritisch: "KRITISCH", hoch: "HOCH", mittel: "MITTEL", niedrig: "NIEDRIG", positiv: "NIEDRIG" };

  const hasKI = kiResult?.bewertungen?.length > 0;

  // KI-Scores als Map (klausel_typ → score/hauptrisiko/sofortiger_handlungsbedarf)
  const kiMap = {};
  if (hasKI) {
    kiResult.bewertungen.forEach(b => { kiMap[b.klausel_typ] = b; });
  }

  const sorted = [...klauseln].sort((a, b) =>
    RISIKO_ORDER.indexOf(a.risiko_stufe) - RISIKO_ORDER.indexOf(b.risiko_stufe)
  );

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>FORMAT 01 · Klausel-Risiko-Heatmap</p>
          <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Alle Klauseln nach Risikostufe — klicken für Detailansicht</p>
        </div>
        {hasKI && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(29,185,84,0.12)", color: "#1DB954" }}>KI-Analyse aktiv</span>}
      </div>

      {hasKI && kiResult.gesamt_heatmap_fazit && (
        <div style={{ padding: "8px 14px", background: "rgba(184,28,58,0.04)", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <p style={{ fontSize: 11, color: "#333", lineHeight: 1.5 }}>{kiResult.gesamt_heatmap_fazit}</p>
          {kiResult.top3_kritische_klauseln?.length > 0 && (
            <p style={{ fontSize: 10, color: "#B81C3A", marginTop: 4 }}>
              Top-Risiken: {kiResult.top3_kritische_klauseln.join(" · ")}
            </p>
          )}
        </div>
      )}

      <div style={{ padding: "8px 14px 12px" }}>
        {sorted.map((k, i) => {
          const color = RISIKO_COLOR[k.risiko_stufe] || "#0A84FF";
          const kiB = kiMap[k.klausel_typ];
          const score = kiB?.score ?? (RISIKO_SCORE[k.risiko_stufe] || 5);
          const isSelected = selectedIdx === klauseln.indexOf(k);

          return (
            <div key={i} onClick={() => onSelect && onSelect(klauseln.indexOf(k))}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                margin: "3px 0", borderRadius: 9, cursor: "pointer",
                background: isSelected ? `${color}10` : "transparent",
                border: isSelected ? `1px solid ${color}35` : "1px solid transparent",
                transition: "all 0.15s",
              }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a", minWidth: 38 }}>
                {k.norm ? `§ ${k.norm.replace(/[^\d]/g, "").slice(0, 3)}` : `#${i + 1}`}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 11.5, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                  {k.klausel_typ}
                </span>
                {kiB?.hauptrisiko && (
                  <span style={{ fontSize: 9.5, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", marginTop: 1 }}>
                    {kiB.hauptrisiko}
                  </span>
                )}
              </div>
              <div style={{ width: 120, height: 8, background: "rgba(0,0,0,0.06)", borderRadius: 99, overflow: "hidden", flexShrink: 0 }}>
                <div style={{ height: "100%", width: `${(score / 10) * 100}%`, background: color, borderRadius: 99, transition: "width 0.4s" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color, minWidth: 28, textAlign: "right" }}>{score.toFixed(1)}</span>
              <span style={{ fontSize: 9, fontWeight: 800, color, minWidth: 50, letterSpacing: "0.05em" }}>
                {LABEL[k.risiko_stufe] || "MITTEL"}
              </span>
              {kiB?.sofortiger_handlungsbedarf && (
                <span style={{ fontSize: 8, fontWeight: 800, color: "#fff", background: "#B81C3A", padding: "2px 5px", borderRadius: 4, flexShrink: 0 }}>SOFORT</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}