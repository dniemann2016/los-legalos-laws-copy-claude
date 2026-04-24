import { useMemo } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ScatterChart, Scatter, ZAxis, ReferenceLine, Legend,
} from "recharts";

const SF = { fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" };
const APPLE_COLORS = ["#007AFF", "#34C759", "#FF9500", "#5856D6", "#FF3B30", "#AF52DE", "#FF2D55", "#00C7BE"];

function Section({ title, subtitle, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.88)",
      backdropFilter: "blur(20px)",
      borderRadius: 20,
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
      overflow: "hidden",
      ...SF,
    }}>
      <div style={{ padding: "20px 24px 0" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</p>
        {subtitle && <p style={{ fontSize: 12, color: "#bbb", marginTop: 3 }}>{subtitle}</p>}
      </div>
      <div style={{ padding: "16px 24px 22px" }}>{children}</div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12, border: "none",
  boxShadow: "0 4px 20px rgba(0,0,0,0.12)", fontSize: 12, fontFamily: SF.fontFamily,
};

// Custom Radar tick
function RadarTick({ payload, x, y, textAnchor }) {
  return (
    <text x={x} y={y} textAnchor={textAnchor} style={{ fontSize: 10, fill: "#999", fontFamily: SF.fontFamily }}>
      {payload.value.length > 14 ? payload.value.slice(0, 13) + "…" : payload.value}
    </text>
  );
}

export default function KonzernRechtsgebietDashboard({ cases, questionnaires }) {
  const tooltipS = tooltipStyle;

  // ── Daten pro Rechtsgebiet ───────────────────────────────────────────────
  const rgData = useMemo(() => {
    const map = {};
    cases.forEach(c => {
      const rg = c.rechtsgebiet;
      if (!rg) return;
      if (!map[rg]) map[rg] = { name: rg, total: 0, aktiv: 0, abgeschlossen: 0, sumPrognose: 0, sumStreitwert: 0, won: 0, dauerArr: [] };
      map[rg].total++;
      if (c.status === "Aktiv") map[rg].aktiv++;
      if (c.status === "Abgeschlossen") {
        map[rg].abgeschlossen++;
        if ((c.prognose || 0) >= 50) map[rg].won++;
        const q = questionnaires.find(q => q.case_id === c.id);
        const monate = q?.dauer_monate || Math.max(1, Math.round(
          (new Date(c.updated_date || Date.now()) - new Date(c.created_date)) / (1000 * 60 * 60 * 24 * 30)
        ));
        map[rg].dauerArr.push(monate);
      }
      map[rg].sumPrognose += c.prognose || 0;
      map[rg].sumStreitwert += c.streitwert || 0;
    });

    return Object.values(map)
      .filter(d => d.total >= 1)
      .map(d => ({
        ...d,
        erfolgsrate: d.abgeschlossen > 0 ? Math.round((d.won / d.abgeschlossen) * 100) : null,
        avgPrognose: Math.round(d.sumPrognose / d.total),
        avgDauer: d.dauerArr.length > 0 ? Math.round(d.dauerArr.reduce((s, v) => s + v, 0) / d.dauerArr.length) : null,
        gesamtStreitwert: d.sumStreitwert,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [cases, questionnaires]);

  // ── Radar-Daten (normalisiert 0–100) ─────────────────────────────────────
  const radarData = useMemo(() => {
    const withErfolg = rgData.filter(d => d.erfolgsrate !== null);
    if (withErfolg.length < 3) return [];
    const maxDauer = Math.max(...withErfolg.map(d => d.avgDauer || 1));
    const maxStreit = Math.max(...withErfolg.map(d => d.gesamtStreitwert || 1));

    return withErfolg.slice(0, 6).map(d => ({
      subject: d.name.length > 12 ? d.name.slice(0, 11) + "…" : d.name,
      Erfolgsrate: d.erfolgsrate,
      Prognose: d.avgPrognose,
      // Dauer invertiert: kürzere Dauer = besser = höhere Zahl
      Effizienz: d.avgDauer ? Math.round((1 - d.avgDauer / maxDauer) * 100) : 50,
      Volumen: maxStreit > 0 ? Math.round((d.gesamtStreitwert / maxStreit) * 100) : 0,
    }));
  }, [rgData]);

  // ── Scatter: Erfolg vs. Dauer ─────────────────────────────────────────────
  const scatterData = useMemo(() =>
    rgData
      .filter(d => d.erfolgsrate !== null && d.avgDauer !== null)
      .map((d, i) => ({
        x: d.avgDauer,
        y: d.erfolgsrate,
        z: Math.max(200, d.total * 120),
        name: d.name,
        fill: APPLE_COLORS[i % APPLE_COLORS.length],
      })),
    [rgData]
  );

  // ── Doppelbalken: Erfolgsrate + Prognose ─────────────────────────────────
  const vergleichData = useMemo(() =>
    rgData.filter(d => d.erfolgsrate !== null || d.avgPrognose > 0).map(d => ({
      name: d.name.length > 12 ? d.name.slice(0, 11) + "…" : d.name,
      Erfolgsrate: d.erfolgsrate ?? 0,
      Prognose: d.avgPrognose,
      Fälle: d.total,
    })),
    [rgData]
  );

  if (rgData.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Trennlinie mit Label ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.08)" }} />
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(0,122,255,0.08)", borderRadius: 10, padding: "6px 14px",
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#007AFF" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#007AFF", textTransform: "uppercase", letterSpacing: "0.07em", ...SF }}>
            Konzern-Benchmarks · Rechtsgebiet-Analytics
          </span>
        </div>
        <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.08)" }} />
      </div>

      {/* ── ROW 1: Radar + Scatter ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Radar */}
        {radarData.length >= 3 && (
          <Section title="Performance-Profil" subtitle="Erfolg · Prognose · Effizienz · Volumen pro Rechtsgebiet">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} outerRadius={95}>
                <PolarGrid stroke="rgba(0,0,0,0.07)" />
                <PolarAngleAxis dataKey="subject" tick={<RadarTick />} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: "#ccc" }} />
                <Radar name="Erfolgsrate" dataKey="Erfolgsrate" stroke="#34C759" fill="#34C759" fillOpacity={0.18} />
                <Radar name="Prognose" dataKey="Prognose" stroke="#007AFF" fill="#007AFF" fillOpacity={0.12} />
                <Radar name="Effizienz" dataKey="Effizienz" stroke="#FF9500" fill="#FF9500" fillOpacity={0.1} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipS} formatter={v => [v + "%"]} />
              </RadarChart>
            </ResponsiveContainer>
          </Section>
        )}

        {/* Scatter: Erfolg vs. Dauer */}
        {scatterData.length >= 2 ? (
          <Section title="Erfolg vs. Verfahrensdauer" subtitle="Größe = Fallvolumen · ideal: oben links">
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis type="number" dataKey="x" name="Dauer (Monate)" unit="M"
                  tick={{ fontSize: 10, fill: "#bbb" }} label={{ value: "Ø Dauer (Monate)", position: "insideBottom", offset: -2, fontSize: 10, fill: "#ccc" }} />
                <YAxis type="number" dataKey="y" name="Erfolgsrate" unit="%"
                  domain={[0, 100]} tick={{ fontSize: 10, fill: "#bbb" }} />
                <ZAxis type="number" dataKey="z" range={[80, 600]} />
                <ReferenceLine x={12} stroke="rgba(0,0,0,0.1)" strokeDasharray="4 3"
                  label={{ value: "1J", position: "top", fontSize: 9, fill: "#bbb" }} />
                <ReferenceLine y={50} stroke="rgba(0,0,0,0.1)" strokeDasharray="4 3"
                  label={{ value: "50%", position: "right", fontSize: 9, fill: "#bbb" }} />
                <Tooltip
                  contentStyle={tooltipS}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={{ ...tooltipS, padding: "10px 14px", background: "#fff" }}>
                        <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{d?.name}</p>
                        <p style={{ fontSize: 12, color: "#555" }}>Erfolgsrate: <strong>{d?.y}%</strong></p>
                        <p style={{ fontSize: 12, color: "#555" }}>Ø Dauer: <strong>{d?.x} Monate</strong></p>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData} shape={(props) => {
                  const { cx, cy, fill, payload } = props;
                  const r = Math.sqrt(payload.z) / 7;
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.75} stroke={fill} strokeWidth={1.5} />
                      <text x={cx} y={cy - r - 4} textAnchor="middle" fontSize={9} fill="#666">
                        {payload.name.length > 10 ? payload.name.slice(0, 9) + "…" : payload.name}
                      </text>
                    </g>
                  );
                }} />
              </ScatterChart>
            </ResponsiveContainer>
          </Section>
        ) : (
          // Fallback: einfacher Dauer-Benchmark wenn nicht genug Scatter-Daten
          <Section title="Verfahrensdauer-Benchmark" subtitle="Ø Monate pro Rechtsgebiet (abgeschl. Fälle)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={rgData.filter(d => d.avgDauer)} layout="vertical" margin={{ left: 8, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#bbb" }} unit="M" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#aaa" }} width={110} />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
                <Tooltip contentStyle={tooltipS} formatter={v => [v + " Monate", "Ø Dauer"]} />
                <Bar dataKey="avgDauer" radius={[0, 8, 8, 0]} name="Ø Dauer">
                  {rgData.filter(d => d.avgDauer).map((_, i) => (
                    <Cell key={i} fill={APPLE_COLORS[i % APPLE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>
        )}
      </div>

      {/* ── ROW 2: Doppelbalken Erfolg vs. Prognose ───────────────────── */}
      {vergleichData.length > 0 && (
        <Section title="Erfolgsrate vs. KI-Prognose" subtitle="Abweichung zeigt Kalibrierungsbedarf der KI pro Rechtsgebiet">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={vergleichData} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#aaa" }} />
              <YAxis tick={{ fontSize: 11, fill: "#bbb" }} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={tooltipS} formatter={(v, name) => [v + "%", name]} />
              <ReferenceLine y={50} stroke="rgba(0,0,0,0.1)" strokeDasharray="4 3" />
              <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Erfolgsrate" fill="#34C759" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Prognose" fill="#007AFF" radius={[6, 6, 0, 0]} opacity={0.55} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* ── ROW 3: Tabelle Rechtsgebiets-KPIs ────────────────────────── */}
      <Section title="Rechtsgebiets-KPI-Matrix" subtitle="Vollständige Benchmarks für Konzernreporting">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(0,0,0,0.06)" }}>
                {["Rechtsgebiet", "Fälle gesamt", "Aktiv", "Abgeschl.", "Erfolgsrate", "Ø KI-Prognose", "Ø Dauer", "Gesamtstreitwert"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 14px", textAlign: i === 0 ? "left" : "right", fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rgData.map((d, i) => {
                const er = d.erfolgsrate;
                const erColor = er === null ? "#bbb" : er >= 65 ? "#34C759" : er >= 40 ? "#FF9500" : "#FF3B30";
                return (
                  <tr key={d.name} style={{ borderBottom: i < rgData.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "12px 14px", fontWeight: 600, color: "#1a1a1a" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: APPLE_COLORS[i % APPLE_COLORS.length], flexShrink: 0 }} />
                        {d.name}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right", color: "#555" }}>{d.total}</td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      {d.aktiv > 0 ? (
                        <span style={{ background: "rgba(0,122,255,0.1)", color: "#007AFF", padding: "2px 8px", borderRadius: 7, fontWeight: 600 }}>{d.aktiv}</span>
                      ) : <span style={{ color: "#ccc" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right", color: "#555" }}>
                      {d.abgeschlossen > 0 ? d.abgeschlossen : <span style={{ color: "#ccc" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      {er !== null ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                          <div style={{ width: 50, height: 5, background: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, width: `${er}%`, background: erColor }} />
                          </div>
                          <span style={{ fontWeight: 700, color: erColor, minWidth: 36, textAlign: "right" }}>{er}%</span>
                        </div>
                      ) : <span style={{ color: "#ccc" }}>Keine abgeschl. Fälle</span>}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right", color: "#555" }}>{d.avgPrognose}%</td>
                    <td style={{ padding: "12px 14px", textAlign: "right", color: "#5856D6", fontWeight: 600 }}>
                      {d.avgDauer !== null ? `${d.avgDauer}M` : <span style={{ color: "#ccc" }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right", color: "#555" }}>
                      {d.gesamtStreitwert > 0 ? `${(d.gesamtStreitwert / 1000000).toFixed(1)}M€` : <span style={{ color: "#ccc" }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}