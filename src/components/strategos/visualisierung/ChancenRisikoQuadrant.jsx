/**
 * FORMAT 05 — Chancen-Risiken-Quadrant
 * Nutzt primär KI-analysierte Portfolio-Koordinaten; fällt auf Rohdaten zurück.
 */
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const RISIKO_COLOR = { kritisch: "#B81C3A", hoch: "#FF9500", mittel: "#0A84FF", niedrig: "#1DB954", positiv: "#1DB954" };
const RISIKO_SCORE = { kritisch: 8.5, hoch: 6.5, mittel: 4.5, niedrig: 2.5, positiv: 2 };
const RISIKO_PROB  = { kritisch: 75, hoch: 55, mittel: 40, niedrig: 20, positiv: 30 };

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 9, padding: "8px 12px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxWidth: 200 }}>
      <p style={{ fontWeight: 700, color: "#1a1a1a" }}>{d.name}</p>
      {d.risiko && <p style={{ color: "#888", marginTop: 2 }}>Risikostufe: <strong style={{ color: RISIKO_COLOR[d.risiko] }}>{d.risiko}</strong></p>}
      {d.quadrant && <p style={{ color: "#555", marginTop: 2 }}>Quadrant: {d.quadrant}</p>}
      {d.sofortmassnahme && <p style={{ color: "#B81C3A", marginTop: 3, fontSize: 10 }}>→ {d.sofortmassnahme}</p>}
    </div>
  );
}

export default function ChancenRisikoQuadrant({ klauseln, kiResult }) {
  if (!klauseln?.length) return null;

  const hasKI = kiResult?.portfolio?.length > 0;

  // ── KI-Portfolio hat Vorrang ────────────────────────────────────────────────
  const data = hasKI
    ? kiResult.portfolio.map((p, i) => {
        const base = klauseln.find(k => k.klausel_typ === p.klausel_typ);
        const color = RISIKO_COLOR[base?.risiko_stufe] || "#0A84FF";
        return {
          x: Math.max(0, Math.min(100, p.x_wahrscheinlichkeit ?? 50)),
          y: Math.max(0, Math.min(10, p.y_wirkungstiefe ?? 5)),
          z: base?.risiko_stufe === "kritisch" ? 200 : base?.risiko_stufe === "hoch" ? 140 : 90,
          name: p.klausel_typ?.slice(0, 20) || `#${i + 1}`,
          risiko: base?.risiko_stufe,
          quadrant: p.quadrant,
          sofortmassnahme: p.sofortmassnahme,
          fill: color,
        };
      })
    : klauseln.map((k, i) => ({
        x: RISIKO_PROB[k.risiko_stufe] + Math.round((i * 7) % 20) - 5,
        y: RISIKO_SCORE[k.risiko_stufe] + ((i % 3) - 1) * 0.5,
        z: k.risiko_stufe === "kritisch" ? 200 : k.risiko_stufe === "hoch" ? 140 : 90,
        name: k.klausel_typ?.slice(0, 18) || `#${i + 1}`,
        risiko: k.risiko_stufe,
        fill: RISIKO_COLOR[k.risiko_stufe] || "#0A84FF",
      }));

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>FORMAT 05 · Chancen-Risiken-Quadrant</p>
          <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Portfolio-Sicht aller Klauseln — Wahrscheinlichkeit vs. Wirkungstiefe</p>
        </div>
        {hasKI && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "rgba(29,185,84,0.12)", color: "#1DB954" }}>KI-Analyse aktiv</span>}
      </div>

      {hasKI && (kiResult.portfolio_fazit || kiResult.gesamtrisiko_score != null) && (
        <div style={{ padding: "8px 14px", background: "rgba(10,132,255,0.04)", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          {kiResult.gesamtrisiko_score != null && (
            <span style={{ fontSize: 12, fontWeight: 800, color: kiResult.gesamtrisiko_score >= 7 ? "#B81C3A" : kiResult.gesamtrisiko_score >= 5 ? "#FF9500" : "#1DB954", marginRight: 10 }}>
              Gesamtrisiko: {kiResult.gesamtrisiko_score}/10
            </span>
          )}
          {kiResult.top_prioritaet && <span style={{ fontSize: 11, color: "#B81C3A" }}>🎯 {kiResult.top_prioritaet}</span>}
          {kiResult.portfolio_fazit && <p style={{ fontSize: 11, color: "#333", marginTop: 4 }}>{kiResult.portfolio_fazit}</p>}
        </div>
      )}

      <div style={{ padding: "12px 8px 8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 48px 2px" }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#FF9500", textTransform: "uppercase" }}>TAIL-RISK</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#B81C3A", textTransform: "uppercase" }}>VERMEIDEN</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart margin={{ top: 4, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis type="number" dataKey="x" domain={[0, 100]} name="Wahrscheinlichkeit"
              tick={{ fontSize: 9, fill: "#aaa" }}
              label={{ value: "Wahrscheinlichkeit →", position: "insideBottom", offset: -10, fontSize: 10, fill: "#aaa" }} />
            <YAxis type="number" dataKey="y" domain={[0, 10]} name="Wirkungstiefe"
              tick={{ fontSize: 9, fill: "#aaa" }}
              label={{ value: "Wirkungstiefe ↑", angle: -90, position: "insideLeft", fontSize: 10, fill: "#aaa" }} />
            <ReferenceLine x={50} stroke="rgba(0,0,0,0.12)" strokeDasharray="4 4" />
            <ReferenceLine y={5} stroke="rgba(0,0,0,0.12)" strokeDasharray="4 4" />
            <Tooltip content={<CustomTooltip />} />
            {data.map((d, i) => (
              <Scatter key={i} data={[d]} fill={d.fill} fillOpacity={0.75} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 48px 4px" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>VERNACHL.</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#0A84FF", textTransform: "uppercase" }}>MONITOREN</span>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: "8px 8px 4px" }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.fill }} />
              <span style={{ fontSize: 10, color: "#555" }}>{d.name}</span>
              {hasKI && d.quadrant && <span style={{ fontSize: 9, color: "#888" }}>({d.quadrant})</span>}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 9, color: "#bbb", padding: "0 8px 4px", fontStyle: "italic" }}>
          {hasKI ? "KI-kalibrierte Koordinaten · Blasengröße = strategische Bedeutung" : "Blasengröße = strategische Bedeutung der Klausel · KI-Analyse für präzise Koordinaten"}
        </p>
      </div>
    </div>
  );
}