/**
 * FORMAT 05 — Chancen-Risiken-Quadrant
 * Portfolio-Sicht aller kritischen Klauseln — Wahrscheinlichkeit vs. Wirkungstiefe.
 */
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const RISIKO_SCORE = { kritisch: 8.5, hoch: 6.5, mittel: 4.5, niedrig: 2.5, positiv: 2 };
const RISIKO_COLOR = { kritisch: "#B81C3A", hoch: "#FF9500", mittel: "#0A84FF", niedrig: "#1DB954", positiv: "#1DB954" };
// Wahrscheinlichkeit: kritisch → hohe Wahrscheinlichkeit, niedrig → gering
const RISIKO_PROB  = { kritisch: 75, hoch: 55, mittel: 40, niedrig: 20, positiv: 30 };

const QUADRANT_LABELS = [
  { x: 15, y: 82, label: "TAIL-RISK", color: "#FF9500", align: "start" },
  { x: 72, y: 82, label: "VERMEIDEN", color: "#B81C3A", align: "start" },
  { x: 15, y: 18, label: "VERNACHL.", color: "#888", align: "start" },
  { x: 72, y: 18, label: "MONITOREN", color: "#0A84FF", align: "start" },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 9, padding: "8px 12px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight: 700, color: "#1a1a1a" }}>{d.name}</p>
      <p style={{ color: "#888", marginTop: 2 }}>Risikostufe: <strong style={{ color: RISIKO_COLOR[d.risiko] }}>{d.risiko}</strong></p>
    </div>
  );
}

export default function ChancenRisikoQuadrant({ klauseln, kiResult }) {
  // KI-Ergebnis priorisieren
  if (kiResult?.portfolio?.length > 0) {
    const data = kiResult.portfolio.map((p, i) => ({
      x: p.x_wahrscheinlichkeit,
      y: p.y_wirkungstiefe,
      z: p.y_wirkungstiefe * p.x_wahrscheinlichkeit / 10,
      name: p.klausel_typ?.slice(0, 18) || `#${i+1}`,
      quadrant: p.quadrant,
      fill: p.quadrant === "VERMEIDEN" ? "#B81C3A" : p.quadrant === "TAIL-RISK" ? "#FF9500" : p.quadrant === "MONITOREN" ? "#0A84FF" : "#1DB954",
    }));

    return (
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#0A84FF", textTransform: "uppercase", letterSpacing: "0.1em" }}>KI-PORTFOLIO · Analyse</p>
          <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>KI-generierte Quadranten-Positionierung</p>
        </div>
        <div style={{ padding: "12px 8px 8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 48px 2px" }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#FF9500", textTransform: "uppercase" }}>TAIL-RISK</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#B81C3A", textTransform: "uppercase" }}>VERMEIDEN</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 4, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis type="number" dataKey="x" domain={[0, 100]} name="Wahrscheinlichkeit" tick={{ fontSize: 9, fill: "#aaa" }} label={{ value: "Wahrscheinlichkeit →", position: "insideBottom", offset: -10, fontSize: 10, fill: "#aaa" }} />
              <YAxis type="number" dataKey="y" domain={[0, 10]} name="Wirkungstiefe" tick={{ fontSize: 9, fill: "#aaa" }} label={{ value: "Wirkungstiefe ↑", angle: -90, position: "insideLeft", fontSize: 10, fill: "#aaa" }} />
              <ReferenceLine x={50} stroke="rgba(0,0,0,0.12)" strokeDasharray="4 4" />
              <ReferenceLine y={5} stroke="rgba(0,0,0,0.12)" strokeDasharray="4 4" />
              <Tooltip content={<CustomTooltip />} />
              {data.map((d, i) => <Scatter key={i} data={[d]} fill={d.fill} fillOpacity={0.75} />)}
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
              </div>
            ))}
          </div>
          {kiResult.portfolio_fazit && (
            <div style={{ padding: "9px 12px", background: "#0A84FF07", borderTop: "1px solid #0A84FF20", marginTop: 8 }}>
              <p style={{ fontSize: 10, color: "#0A84FF" }}>📊 {kiResult.portfolio_fazit}</p>
            </div>
          )}
          {kiResult.top_prioritaet && (
            <div style={{ padding: "9px 12px", background: "#B81C3A07", borderTop: "1px solid #B81C3A20" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#B81C3A" }}>🎯 {kiResult.top_prioritaet}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!klauseln?.length) return null;

  const data = klauseln.map((k, i) => ({
    x: RISIKO_PROB[k.risiko_stufe] + Math.round((i * 7) % 20) - 5, // leichte Streuung
    y: RISIKO_SCORE[k.risiko_stufe] + ((i % 3) - 1) * 0.5,
    z: k.risiko_stufe === "kritisch" ? 200 : k.risiko_stufe === "hoch" ? 140 : 90,
    name: k.klausel_typ?.slice(0, 18) || `#${i+1}`,
    risiko: k.risiko_stufe,
    fill: RISIKO_COLOR[k.risiko_stufe] || "#0A84FF",
  }));

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>FORMAT 05 · Chancen-Risiken-Quadrant</p>
        <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Portfolio-Sicht aller Klauseln — Wahrscheinlichkeit vs. Wirkungstiefe</p>
      </div>

      <div style={{ padding: "12px 8px 8px" }}>
        {/* Quadrant-Labels außerhalb recharts */}
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 48px 2px" }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#FF9500", textTransform: "uppercase" }}>TAIL-RISK</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#B81C3A", textTransform: "uppercase" }}>VERMEIDEN</span>
          </div>
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
              <Scatter key={i} data={[d]} fill={d.fill} fillOpacity={0.75}>
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 48px 4px" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>VERNACHL.</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#0A84FF", textTransform: "uppercase" }}>MONITOREN</span>
        </div>

        {/* Legende */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: "8px 8px 4px" }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.fill }} />
              <span style={{ fontSize: 10, color: "#555" }}>{d.name}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 9, color: "#bbb", padding: "0 8px 4px", fontStyle: "italic" }}>
          Blasengröße = strategische Bedeutung der Klausel
        </p>
      </div>
    </div>
  );
}