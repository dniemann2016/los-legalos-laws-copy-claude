/**
 * TaktikZeitstrahl — Zeitstrahl-Ansicht für die Taktik-Simulation
 *
 * Zeigt Fristen und Meilensteine aus:
 *  - ki_kontext.zeitachse / kritische_fristen (aus Schritt 0 Dokument-Analyse)
 *  - situationsanalyse.zeitachse
 *  - ki_analyse.taktik_simulation.drehbuch (t30/t90/t180)
 *  - umsetzungsplan.massnahmen
 *
 * Überlagert wird die Erfolgsprognose als Linie — so sieht man wie sich
 * die Erfolgschance über den Prozessverlauf hinweg entwickelt.
 */

import { useMemo } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Scatter
} from "recharts";

function scoreColor(s) {
  if (s >= 70) return "#1DB954";
  if (s >= 50) return "#FF9500";
  return "#B81C3A";
}

// Datum-String → ungefähre Tage ab heute (heuristisch)
function parseDatumTage(datumStr) {
  if (!datumStr) return null;
  const s = String(datumStr).toLowerCase().trim();

  // "sofort", "heute" etc.
  if (s.includes("sofort") || s.includes("heute") || s.includes("jetzt")) return 0;

  // Relative Angaben: "in X wochen/monaten/tagen"
  const relMatch = s.match(/in\s+(\d+)\s*(tag|woche|monat|jahr)/i);
  if (relMatch) {
    const n = parseInt(relMatch[1]);
    const unit = relMatch[2].toLowerCase();
    if (unit.startsWith("tag")) return n;
    if (unit.startsWith("woche")) return n * 7;
    if (unit.startsWith("monat")) return n * 30;
    if (unit.startsWith("jahr")) return n * 365;
  }

  // "Q1 2025", "Q2", "J2", "J3" etc.
  const qMatch = s.match(/q([1-4])\s*(?:20\d\d)?/);
  if (qMatch) return (parseInt(qMatch[1]) - 1) * 90 + 45;
  const jMatch = s.match(/^j(\d+)$/);
  if (jMatch) return parseInt(jMatch[1]) * 365;

  // ISO-Datum oder "DD.MM.YYYY"
  const isoMatch = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(s);
    const diff = Math.round((d - new Date()) / 86400000);
    return diff > 0 ? diff : null;
  }
  const deMatch = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (deMatch) {
    const d = new Date(`${deMatch[3]}-${deMatch[2].padStart(2,"0")}-${deMatch[1].padStart(2,"0")}`);
    const diff = Math.round((d - new Date()) / 86400000);
    return diff > 0 ? diff : null;
  }

  // "30 Tage" / "30 days"
  const dayMatch = s.match(/(\d+)\s*(tag|day)/i);
  if (dayMatch) return parseInt(dayMatch[1]);

  // Kurzfristig/mittelfristig/langfristig
  if (s.includes("kurzfristig")) return 60;
  if (s.includes("mittelfristig")) return 365;
  if (s.includes("langfristig")) return 730;

  return null;
}

// Normalisiert Prognose-Wert entlang eines Zeitpunkts basierend auf kumulativen Reaktions-Modifikatoren
function calcPrognoseAtT(basisPrognose, tage, reaktionModifier, drehbuch) {
  // Einfache lineare Simulation: Über die Zeit akkumuliert sich der Modifier
  // + drehbuch t30/t90/t180 können Korrekturen enthalten
  let p = basisPrognose;

  if (tage <= 30) {
    // Drehbuch t30 signalisiert eher negativen Verlauf → leichter Abzug
    const factor = drehbuch?.t30 ? 0.98 : 1.0;
    p = basisPrognose * factor;
  } else if (tage <= 90) {
    p = basisPrognose + reaktionModifier * 0.5;
  } else if (tage <= 180) {
    p = basisPrognose + reaktionModifier * 0.8;
  } else {
    p = basisPrognose + reaktionModifier;
  }

  return Math.max(5, Math.min(97, Math.round(p)));
}

// Custom Tooltip
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10,
      padding: "9px 13px", fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
      maxWidth: 240,
    }}>
      <p style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: 3 }}>{d.label}</p>
      {d.prognose != null && (
        <p style={{ color: scoreColor(d.prognose), fontWeight: 700 }}>Prognose: {d.prognose}%</p>
      )}
      {d.kategorie && (
        <p style={{ color: d.kategorie === "frist" ? "#FF3B30" : d.kategorie === "meilenstein" ? "#5856D6" : "#FF9500", fontSize: 10, marginTop: 2 }}>
          {d.kategorie === "frist" ? "⏰ Frist" : d.kategorie === "meilenstein" ? "📍 Meilenstein" : "📋 Massnahme"}
        </p>
      )}
      {d.beschreibung && <p style={{ color: "#555", marginTop: 3, lineHeight: 1.4 }}>{d.beschreibung}</p>}
      <p style={{ color: "#aaa", fontSize: 9, marginTop: 4 }}>Tag ~{d.tage} ab heute</p>
    </div>
  );
}

export default function TaktikZeitstrahl({ scenario, prognose, kiResult, basisPrognose }) {
  const ki = scenario?.ki_analyse || {};
  const sit = scenario?.situationsanalyse || {};
  const kiKontext = scenario?.ki_kontext || {};

  const reaktionModifier = prognose - basisPrognose;
  const drehbuch = kiResult?.drehbuch;

  // ── Alle Ereignisse sammeln ──────────────────────────────────────────────
  const ereignisse = useMemo(() => {
    const list = [];

    // 1. Kritische Fristen aus Schritt 0 (Dokument-Analyse)
    (kiKontext.kritische_fristen || []).forEach((f) => {
      const tage = parseDatumTage(f.datum);
      if (tage != null) {
        list.push({ tage, label: f.beschreibung || f.datum, beschreibung: f.datum, kategorie: "frist" });
      }
    });

    // 2. Zeitachse aus Schritt 0
    (kiKontext.zeitachse || []).forEach((e) => {
      const tage = parseDatumTage(e.datum);
      if (tage != null) {
        list.push({ tage, label: e.beschreibung || e.datum, beschreibung: e.datum, kategorie: "meilenstein" });
      }
    });

    // 3. Fristen aus Situationsanalyse (Schritt 2) Modulen
    (sit.module || []).forEach((m) => {
      (m.fristen || []).forEach((f) => {
        const tage = parseDatumTage(f.datum);
        if (tage != null) {
          list.push({ tage, label: `${f.beschreibung} (${m.rechtsgebiet})`, beschreibung: f.datum, kategorie: "frist" });
        }
      });
    });

    // 4. Zeitachse aus Situationsanalyse
    (sit.zeitachse || []).forEach((z) => {
      const tage = parseDatumTage(z.wann);
      if (tage != null) {
        list.push({ tage, label: z.was_muss_entschieden_sein || z.wann, beschreibung: z.wann, kategorie: "meilenstein" });
      }
    });

    // 5. Umsetzungsplan-Maßnahmen (Schritt 7)
    (ki.umsetzungsplan?.massnahmen || []).forEach((m) => {
      const tage = parseDatumTage(m.zeitraum || m.deadline);
      if (tage != null) {
        list.push({ tage, label: m.titel || "Maßnahme", beschreibung: m.zeitraum || m.deadline, kategorie: "massnahme" });
      }
    });

    // 6. Vertragsanalyse Fristen (Schritt 3)
    (ki.vertrags_analyse?.kritische_fristen || []).forEach((f) => {
      const tage = parseDatumTage(f.datum);
      if (tage != null) {
        list.push({ tage, label: f.beschreibung, beschreibung: f.datum, kategorie: "frist" });
      }
    });

    // Drehbuch-Fixpunkte
    if (drehbuch?.t30) list.push({ tage: 30, label: "Drehbuch 30 Tage", beschreibung: drehbuch.t30.slice(0, 80), kategorie: "meilenstein" });
    if (drehbuch?.t90) list.push({ tage: 90, label: "Drehbuch 90 Tage", beschreibung: drehbuch.t90.slice(0, 80), kategorie: "meilenstein" });
    if (drehbuch?.t180) list.push({ tage: 180, label: "Drehbuch 180 Tage", beschreibung: drehbuch.t180.slice(0, 80), kategorie: "meilenstein" });

    return list.filter(e => e.tage >= 0 && e.tage <= 730).sort((a, b) => a.tage - b.tage);
  }, [kiKontext, sit, ki, drehbuch]);

  // ── Chart-Daten: Prognose-Linie über Zeit ────────────────────────────────
  const chartData = useMemo(() => {
    // Fixpunkte für die Linie: Heute (0), 30, 60, 90, 180, 270, 365, 545, 730 Tage
    const punkte = [0, 15, 30, 60, 90, 120, 180, 270, 365, 545, 730];
    return punkte.map(t => ({
      tage: t,
      prognose: calcPrognoseAtT(basisPrognose, t, reaktionModifier, drehbuch),
      label: t === 0 ? "Heute" : t <= 360 ? `Tag ${t}` : `Jahr ${(t/365).toFixed(1)}`,
    }));
  }, [basisPrognose, reaktionModifier, drehbuch]);

  // Scatter-Punkte: Ereignisse mit Prognose-Wert
  const scatterData = useMemo(() => {
    return ereignisse.map(e => ({
      ...e,
      prognose: calcPrognoseAtT(basisPrognose, e.tage, reaktionModifier, drehbuch),
    }));
  }, [ereignisse, basisPrognose, reaktionModifier, drehbuch]);

  const hasDaten = chartData.length > 0;

  if (!hasDaten) return null;

  const fristeData = scatterData.filter(e => e.kategorie === "frist");
  const meilensteinData = scatterData.filter(e => e.kategorie === "meilenstein");
  const massnahmenData = scatterData.filter(e => e.kategorie === "massnahme");

  const endPrognose = chartData[chartData.length - 1]?.prognose ?? prognose;

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(88,86,214,0.18)", borderRadius: 16, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(88,86,214,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>⏱ Prognose-Zeitstrahl</p>
            <p style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>
              Fristen & Meilensteine aus allen Strategos-Schritten · Erfolgschance im Zeitverlauf
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 8, color: "#aaa", textTransform: "uppercase", fontWeight: 700 }}>Heute</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: scoreColor(basisPrognose) }}>{basisPrognose}%</p>
            </div>
            <div style={{ width: 1, height: 30, background: "rgba(0,0,0,0.08)" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 8, color: "#aaa", textTransform: "uppercase", fontWeight: 700 }}>Taktisch</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: scoreColor(prognose) }}>{prognose}%</p>
            </div>
            <div style={{ width: 1, height: 30, background: "rgba(0,0,0,0.08)" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 8, color: "#aaa", textTransform: "uppercase", fontWeight: 700 }}>Langfristig</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: scoreColor(endPrognose) }}>{endPrognose}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: "16px 8px 8px" }}>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis
              dataKey="tage"
              tickFormatter={v => v === 0 ? "Heute" : v < 365 ? `T${v}` : `J${(v/365).toFixed(0)}`}
              tick={{ fontSize: 8, fill: "#aaa" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
              tick={{ fontSize: 8, fill: "#aaa" }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Gefahrenzone */}
            <ReferenceLine y={50} stroke="rgba(0,0,0,0.15)" strokeDasharray="4 3" label={{ value: "50%", position: "right", fontSize: 8, fill: "#aaa" }} />

            {/* Prognose-Fläche */}
            <Area
              type="monotone"
              dataKey="prognose"
              stroke="#5856D6"
              strokeWidth={2.5}
              fill="rgba(88,86,214,0.08)"
              dot={false}
              activeDot={{ r: 4, fill: "#5856D6" }}
            />

            {/* Fristen als rote Punkte */}
            {fristeData.length > 0 && (
              <Scatter
                data={fristeData}
                dataKey="prognose"
                fill="#FF3B30"
                shape={(props) => {
                  const { cx, cy } = props;
                  return <circle cx={cx} cy={cy} r={6} fill="#FF3B30" stroke="#fff" strokeWidth={2} />;
                }}
              />
            )}

            {/* Meilensteine als blaue Diamanten */}
            {meilensteinData.length > 0 && (
              <Scatter
                data={meilensteinData}
                dataKey="prognose"
                fill="#5856D6"
                shape={(props) => {
                  const { cx, cy } = props;
                  return (
                    <polygon
                      points={`${cx},${cy - 7} ${cx + 6},${cy} ${cx},${cy + 7} ${cx - 6},${cy}`}
                      fill="#5856D6" stroke="#fff" strokeWidth={1.5}
                    />
                  );
                }}
              />
            )}

            {/* Maßnahmen als orangene Quadrate */}
            {massnahmenData.length > 0 && (
              <Scatter
                data={massnahmenData}
                dataKey="prognose"
                fill="#FF9500"
                shape={(props) => {
                  const { cx, cy } = props;
                  return <rect x={cx - 5} y={cy - 5} width={10} height={10} fill="#FF9500" stroke="#fff" strokeWidth={1.5} rx={2} />;
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legende */}
      <div style={{ padding: "0 16px 12px", display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 12, height: 3, background: "#5856D6", borderRadius: 2 }} />
          <span style={{ fontSize: 9, color: "#888" }}>Prognose-Verlauf</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF3B30", border: "2px solid #fff", boxShadow: "0 0 0 1px #FF3B30" }} />
          <span style={{ fontSize: 9, color: "#888" }}>Fristen ({fristeData.length})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, background: "#5856D6", transform: "rotate(45deg)", border: "1.5px solid #fff" }} />
          <span style={{ fontSize: 9, color: "#888" }}>Meilensteine ({meilensteinData.length})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, background: "#FF9500", borderRadius: 2, border: "1.5px solid #fff" }} />
          <span style={{ fontSize: 9, color: "#888" }}>Maßnahmen ({massnahmenData.length})</span>
        </div>
        {ereignisse.length === 0 && (
          <span style={{ fontSize: 10, color: "#aaa", fontStyle: "italic" }}>
            Keine Fristen/Meilensteine — Dokument in Schritt 0 hochladen für vollständige Zeitstrahl-Daten
          </span>
        )}
      </div>

      {/* Ereignis-Liste */}
      {ereignisse.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "10px 16px 14px" }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Alle Ereignisse im Zeitstrahl
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
            {[...ereignisse].sort((a, b) => a.tage - b.tage).map((e, i) => {
              const p = calcPrognoseAtT(basisPrognose, e.tage, reaktionModifier, drehbuch);
              const col = e.kategorie === "frist" ? "#FF3B30" : e.kategorie === "meilenstein" ? "#5856D6" : "#FF9500";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 8px", background: "rgba(0,0,0,0.02)", borderRadius: 7 }}>
                  <div style={{ minWidth: 40, textAlign: "right" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#888" }}>T{e.tage}</span>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: e.kategorie === "meilenstein" ? 2 : "50%", background: col, flexShrink: 0, transform: e.kategorie === "meilenstein" ? "rotate(45deg)" : "none" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.label}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: scoreColor(p), flexShrink: 0 }}>{p}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}