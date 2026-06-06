/**
 * FORMAT 02 — Wirkungsbaum
 * Detailansicht einer Klausel — wie sie ins Unternehmen wirkt (Wirkungspfade + €).
 */
export default function WirkungsBaum({ klausel, kiResult }) {
  // KI-Ergebnis priorisieren
  if (kiResult?.wirkungspfade?.length > 0) {
    return (
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#5856D6", textTransform: "uppercase", letterSpacing: "0.1em" }}>KI-WIRKUNGSBAUM · Analyse</p>
          <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>KI-generierte Wirkungspfade ins Unternehmen</p>
        </div>
        <div style={{ padding: "12px 14px", display: "flex", gap: 0, alignItems: "flex-start" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            {kiResult.wirkungspfade.map((w, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: w.positiv ? "#1DB954" : "#B81C3A", flexShrink: 0 }} />
                <div style={{ flex: 1, padding: "8px 12px", background: w.positiv ? "#1DB95409" : "#B81C3A09", border: `1px solid ${w.positiv ? "#1DB95425" : "#B81C3A25"}`, borderRadius: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{w.bereich}</p>
                    {w.finanzieller_einfluss_eur && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: w.positiv ? "#1DB954" : "#B81C3A" }}>
                        {w.finanzieller_einfluss_eur > 0 ? "+" : ""}{w.finanzieller_einfluss_eur?.toLocaleString()} €
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{w.beschreibung}</p>
                  {w.betroffene_abteilungen?.length > 0 && (
                    <p style={{ fontSize: 9, color: "#888", marginTop: 3 }}>Betroffen: {w.betroffene_abteilungen.join(", ")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {kiResult.gesamteinfluss_eur && (
          <div style={{ padding: "9px 14px", background: "#5856D607", borderTop: "1px solid #5856D620" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#5856D6" }}>
              Gesamteinfluss: {kiResult.gesamteinfluss_eur > 0 ? "+" : ""}{kiResult.gesamteinfluss_eur?.toLocaleString()} €
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!klausel) return null;

  const wirkungen = [];

  // Aus Szenarien + Nachteilen / Vorteilen Wirkungspfade ableiten
  if (klausel.szenarien?.length) {
    klausel.szenarien.forEach((s, i) => {
      if (s.beschreibung) {
        wirkungen.push({
          bereich: s.horizont === "kurzfristig" ? "Kurzfristig" : s.horizont === "mittelfristig" ? "Mittelfristig" : "Langfristig",
          detail: s.eintrittsbedingung || s.beschreibung?.slice(0, 60),
          wert: s.risiken ? `⚠ ${s.risiken?.slice(0, 40)}` : s.chancen ? `+ ${s.chancen?.slice(0, 40)}` : null,
          positiv: !!s.chancen && !s.risiken,
          farbe: s.horizont === "kurzfristig" ? "#B81C3A" : s.horizont === "mittelfristig" ? "#FF9500" : "#0A84FF",
        });
      }
    });
  }

  // Nachteile als negative Wirkungen
  klausel.juristische_nachteile?.slice(0, 4).forEach(n => {
    wirkungen.push({ bereich: "Rechtliche Folge", detail: n?.slice(0, 70), wert: null, positiv: false, farbe: "#B81C3A" });
  });

  // Vorteile
  klausel.juristische_vorteile?.slice(0, 2).forEach(v => {
    wirkungen.push({ bereich: "Rechtlicher Vorteil", detail: v?.slice(0, 70), wert: null, positiv: true, farbe: "#1DB954" });
  });

  if (!wirkungen.length) return null;

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>FORMAT 02 · Wirkungsbaum</p>
        <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Wie diese Klausel ins Unternehmen hineinwirkt</p>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", gap: 0, alignItems: "flex-start" }}>
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {wirkungen.slice(0, 7).map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Verbindungspunkt */}
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: w.farbe, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: "7px 11px", background: `${w.farbe}09`, border: `1px solid ${w.farbe}25`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{w.bereich}</p>
                  {w.detail && <p style={{ fontSize: 10, color: "#666", marginTop: 1 }}>{w.detail}</p>}
                </div>
                {w.wert && (
                  <p style={{ fontSize: 11, fontWeight: 800, color: w.positiv ? "#1DB954" : "#B81C3A", flexShrink: 0 }}>
                    {w.wert}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}