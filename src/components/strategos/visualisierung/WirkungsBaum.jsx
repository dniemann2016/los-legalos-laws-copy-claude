/**
 * FORMAT 02 — Wirkungsbaum
 * Nutzt primär KI-analysierte Wirkungspfade; fällt auf Rohdaten zurück.
 */
export default function WirkungsBaum({ klausel, kiResult }) {
  if (!klausel) return null;

  // ── KI-Ergebnis hat Vorrang ─────────────────────────────────────────────────
  const hasKI = kiResult?.wirkungspfade?.length > 0;

  const wirkungen = hasKI
    ? kiResult.wirkungspfade.map(p => ({
        bereich: p.bereich,
        detail: p.beschreibung?.slice(0, 80),
        wert: p.finanzieller_einfluss_eur
          ? `${p.finanzieller_einfluss_eur > 0 ? "+" : ""}${p.finanzieller_einfluss_eur.toLocaleString("de-DE")} €`
          : p.zeitrahmen ? `⏱ ${p.zeitrahmen}` : null,
        positiv: p.positiv,
        abteilungen: p.betroffene_abteilungen || [],
        farbe: p.positiv ? "#1DB954" : "#B81C3A",
      }))
    : (() => {
        const w = [];
        if (klausel.szenarien?.length) {
          klausel.szenarien.forEach(s => {
            if (s.beschreibung) w.push({
              bereich: s.horizont === "kurzfristig" ? "Kurzfristig" : s.horizont === "mittelfristig" ? "Mittelfristig" : "Langfristig",
              detail: s.eintrittsbedingung || s.beschreibung?.slice(0, 60),
              wert: s.risiken ? `⚠ ${s.risiken?.slice(0, 40)}` : s.chancen ? `+ ${s.chancen?.slice(0, 40)}` : null,
              positiv: !!s.chancen && !s.risiken,
              abteilungen: [],
              farbe: s.horizont === "kurzfristig" ? "#B81C3A" : s.horizont === "mittelfristig" ? "#FF9500" : "#0A84FF",
            });
          });
        }
        klausel.juristische_nachteile?.slice(0, 4).forEach(n => {
          w.push({ bereich: "Rechtliche Folge", detail: n?.slice(0, 70), wert: null, positiv: false, abteilungen: [], farbe: "#B81C3A" });
        });
        klausel.juristische_vorteile?.slice(0, 2).forEach(v => {
          w.push({ bereich: "Rechtlicher Vorteil", detail: v?.slice(0, 70), wert: null, positiv: true, abteilungen: [], farbe: "#1DB954" });
        });
        return w;
      })();

  if (!wirkungen.length) {
    return (
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "#bbb" }}>Keine Wirkungsdaten — KI-Analyse starten für vollständige Auswertung.</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>FORMAT 02 · Wirkungsbaum</p>
          <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Wie diese Klausel ins Unternehmen hineinwirkt</p>
        </div>
        {hasKI && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(29,185,84,0.12)", color: "#1DB954" }}>KI-Analyse aktiv</span>
        )}
      </div>

      {hasKI && kiResult.gesamteinfluss_eur != null && (
        <div style={{ padding: "8px 14px", background: "rgba(88,86,214,0.05)", borderBottom: "1px solid rgba(88,86,214,0.1)" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#5856D6" }}>
            Gesamteinfluss: {kiResult.gesamteinfluss_eur > 0 ? "+" : ""}{kiResult.gesamteinfluss_eur.toLocaleString("de-DE")} €
          </p>
          {kiResult.kritischster_pfad && <p style={{ fontSize: 10, color: "#666", marginTop: 2 }}>⚡ {kiResult.kritischster_pfad}</p>}
        </div>
      )}

      <div style={{ padding: "12px 14px", overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 0, alignItems: "flex-start", minWidth: "max-content" }}>
        {/* Klausel-Quelle */}
        <div style={{ flexShrink: 0, marginRight: 16 }}>
          <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "12px 14px", textAlign: "center", minWidth: 90 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase" }}>QUELLE</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginTop: 4, lineHeight: 1.2 }}>
              {klausel.norm || "#"}
            </p>
            <p style={{ fontSize: 9, color: "#888", marginTop: 4, lineHeight: 1.3 }}>
              {klausel.klausel_typ?.slice(0, 20)}
            </p>
          </div>
        </div>

        {/* Verbindungslinie */}
        <div style={{ display: "flex", alignItems: "center", marginRight: 16, alignSelf: "center" }}>
          <div style={{ width: 24, height: 2, background: "rgba(0,0,0,0.12)" }} />
        </div>

        {/* Wirkungspfade */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 320 }}>
          {wirkungen.slice(0, 8).map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: w.farbe, flexShrink: 0, marginTop: 6 }} />
              <div style={{ flex: 1, padding: "7px 11px", background: `${w.farbe}09`, border: `1px solid ${w.farbe}25`, borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{w.bereich}</p>
                    {w.detail && <p style={{ fontSize: 10, color: "#666", marginTop: 1 }}>{w.detail}</p>}
                    {w.abteilungen?.length > 0 && (
                      <p style={{ fontSize: 9, color: "#999", marginTop: 3 }}>Bereiche: {w.abteilungen.join(", ")}</p>
                    )}
                  </div>
                  {w.wert && (
                    <p style={{ fontSize: 11, fontWeight: 800, color: w.positiv ? "#1DB954" : "#B81C3A", flexShrink: 0 }}>
                      {w.wert}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>

      {hasKI && kiResult.empfehlung && (
        <div style={{ margin: "0 14px 12px", padding: "9px 12px", background: "rgba(29,185,84,0.07)", borderRadius: 9, borderLeft: "3px solid #1DB954" }}>
          <p style={{ fontSize: 11, color: "#1a1a1a" }}>{kiResult.empfehlung}</p>
        </div>
      )}
    </div>
  );
}