/**
 * TaktikVergleich — Nebeneinander-Vergleich zweier Taktik-Szenarien
 * Jedes Szenario hat eigene Strategie + Reaktionsmuster → Erfolgswahrscheinlichkeit
 */
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";
import { Plus, X, GitCompare } from "lucide-react";

const REAKTIONSMUSTER = [
  { id: "eskalation",    label: "Eskalation",          modifier: -18, icon: "⚡" },
  { id: "verzoegerung",  label: "Verzögerungstaktik",  modifier: -9,  icon: "🐢" },
  { id: "vergleich",     label: "Vergleichsangebot",   modifier: +14, icon: "🤝" },
  { id: "gegenangriff",  label: "Gegenangriff",        modifier: -22, icon: "🗡️" },
  { id: "ignorieren",    label: "Ignorieren / Stille", modifier: +3,  icon: "🤐" },
  { id: "mediation",     label: "Mediationsantrag",    modifier: +10, icon: "⚖️" },
  { id: "oeffentlichkeit",label: "Öffentlichkeitsdruck",modifier: -12,icon: "📰" },
  { id: "beweis_angriff",label: "Beweisangriff",       modifier: -15, icon: "🔍" },
  { id: "insolvenz",     label: "Insolvenz",           modifier: -30, icon: "💸" },
  { id: "kapitulation",  label: "Kapitulation",        modifier: +28, icon: "🏳️" },
];

const EIGENE_STRATEGIEN = [
  { id: "offensiv",    label: "Offensiv",      modifier: +8,  color: "#B81C3A" },
  { id: "defensiv",   label: "Defensiv",       modifier: +5,  color: "#0A84FF" },
  { id: "verhandlung",label: "Verhandlung",    modifier: +12, color: "#1DB954" },
  { id: "hybrid",     label: "Hybrid",         modifier: +10, color: "#FF9500" },
  { id: "warteraum",  label: "Abwartend",      modifier: +3,  color: "#636366" },
];

function scoreColor(s) {
  if (s >= 70) return "#1DB954";
  if (s >= 50) return "#FF9500";
  return "#B81C3A";
}

function calcScore(basisPrognose, reaktionen, strategie) {
  let score = basisPrognose;
  reaktionen.forEach(id => {
    const m = REAKTIONSMUSTER.find(r => r.id === id);
    if (m) score += m.modifier;
  });
  const s = EIGENE_STRATEGIEN.find(s => s.id === strategie);
  if (s) score += s.modifier;
  return Math.max(5, Math.min(97, Math.round(score)));
}

function ScenarioColumn({ label, color, basisPrognose, value, onChange }) {
  const score = useMemo(
    () => calcScore(basisPrognose, value.reaktionen, value.strategie),
    [basisPrognose, value.reaktionen, value.strategie]
  );

  const toggleReaktion = (id) => {
    onChange({
      ...value,
      reaktionen: value.reaktionen.includes(id)
        ? value.reaktionen.filter(r => r !== id)
        : [...value.reaktionen, id],
    });
  };

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Score-Anzeige */}
      <div style={{
        background: `${color}10`, border: `2px solid ${color}40`,
        borderRadius: 14, padding: "16px 14px", textAlign: "center",
      }}>
        <p style={{ fontSize: 9, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
        <p style={{ fontSize: 40, fontWeight: 900, color, lineHeight: 1, margin: "8px 0 4px" }}>{score}%</p>
        <p style={{ fontSize: 10, color: "#888" }}>
          {score >= 70 ? "Starke Position" : score >= 50 ? "Moderate Position" : "Schwache Position"}
        </p>
        {/* Balkenvisualisierung */}
        <div style={{ marginTop: 10, height: 8, background: "rgba(0,0,0,0.07)", borderRadius: 99 }}>
          <div style={{ height: 8, width: `${score}%`, background: color, borderRadius: 99, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }} />
        </div>
      </div>

      {/* Eigene Strategie */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 12, padding: "10px 12px" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 7 }}>Eigene Strategie</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {EIGENE_STRATEGIEN.map(s => (
            <div key={s.id} onClick={() => onChange({ ...value, strategie: s.id })}
              style={{
                padding: "4px 10px", borderRadius: 7, cursor: "pointer", fontSize: 10,
                fontWeight: value.strategie === s.id ? 700 : 400,
                background: value.strategie === s.id ? `${s.color}15` : "rgba(0,0,0,0.04)",
                border: `1px solid ${value.strategie === s.id ? s.color : "transparent"}`,
                color: value.strategie === s.id ? s.color : "#666",
                userSelect: "none",
              }}>
              {s.label}
              <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 800, color: s.modifier >= 0 ? "#1DB954" : "#B81C3A" }}>
                {s.modifier >= 0 ? "+" : ""}{s.modifier}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reaktionsmuster */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 12, padding: "10px 12px" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 7 }}>Gegnerische Reaktionsmuster</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {REAKTIONSMUSTER.map(r => {
            const sel = value.reaktionen.includes(r.id);
            return (
              <div key={r.id} onClick={() => toggleReaktion(r.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "5px 8px", borderRadius: 8,
                  background: sel ? `${r.modifier >= 0 ? "#1DB954" : "#B81C3A"}0d` : "rgba(0,0,0,0.02)",
                  border: `1px solid ${sel ? (r.modifier >= 0 ? "rgba(29,185,84,0.3)" : "rgba(184,28,58,0.3)") : "transparent"}`,
                  cursor: "pointer", userSelect: "none", transition: "all 0.12s",
                }}>
                <span style={{ fontSize: 13 }}>{r.icon}</span>
                <span style={{ fontSize: 10, flex: 1, color: sel ? "#1a1a1a" : "#666", fontWeight: sel ? 600 : 400 }}>{r.label}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: r.modifier >= 0 ? "#1DB954" : "#B81C3A" }}>
                  {r.modifier >= 0 ? "+" : ""}{r.modifier}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Score-Aufschlüsselung */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 12, padding: "10px 12px" }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 7 }}>Score-Aufschlüsselung</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: "#666" }}>Basis</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>{basisPrognose}%</span>
          </div>
          {(() => { const s = EIGENE_STRATEGIEN.find(s => s.id === value.strategie); return s ? (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "#666" }}>Strategie</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: s.modifier >= 0 ? "#1DB954" : "#B81C3A" }}>{s.modifier >= 0 ? "+" : ""}{s.modifier}%</span>
            </div>
          ) : null; })()}
          {value.reaktionen.map(id => {
            const r = REAKTIONSMUSTER.find(r => r.id === id);
            return r ? (
              <div key={id} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, color: "#666" }}>{r.icon} {r.label.slice(0, 16)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: r.modifier >= 0 ? "#1DB954" : "#B81C3A" }}>{r.modifier >= 0 ? "+" : ""}{r.modifier}%</span>
              </div>
            ) : null;
          })}
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 4, marginTop: 2, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontWeight: 700 }}>Gesamt</span>
            <span style={{ fontSize: 12, fontWeight: 900, color }}>{score}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaktikVergleich({ basisPrognose }) {
  const [szenarioA, setSzenarioA] = useState({ strategie: "hybrid",    reaktionen: [] });
  const [szenarioB, setSzenarioB] = useState({ strategie: "offensiv",  reaktionen: [] });

  const scoreA = useMemo(() => calcScore(basisPrognose, szenarioA.reaktionen, szenarioA.strategie), [basisPrognose, szenarioA]);
  const scoreB = useMemo(() => calcScore(basisPrognose, szenarioB.reaktionen, szenarioB.strategie), [basisPrognose, szenarioB]);

  const winner = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : null;

  // Vergleichs-Balkenchart
  const compareData = [
    { name: "Szenario A", wert: scoreA, color: "#5856D6" },
    { name: "Szenario B", wert: scoreB, color: "#FF9500" },
  ];

  // Radar: Reaktionsmuster-Abdeckung
  const radarData = REAKTIONSMUSTER.map(r => ({
    dim: r.label.slice(0, 10),
    A: szenarioA.reaktionen.includes(r.id) ? 1 : 0,
    B: szenarioB.reaktionen.includes(r.id) ? 1 : 0,
  }));

  return (
    <div style={{ background: "#fff", border: "2px solid rgba(0,0,0,0.09)", borderRadius: 16, overflow: "hidden", marginTop: 4 }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#fafafa", display: "flex", alignItems: "center", gap: 10 }}>
        <GitCompare size={16} color="#5856D6" />
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>Taktik-Szenario-Vergleich</p>
          <p style={{ fontSize: 10, color: "#aaa" }}>Zwei Szenarien konfigurieren und Erfolgsaussichten gegenüberstellen</p>
        </div>
        {winner && (
          <div style={{ marginLeft: "auto", padding: "5px 14px", background: winner === "A" ? "rgba(88,86,214,0.1)" : "rgba(255,149,0,0.1)", border: `1px solid ${winner === "A" ? "rgba(88,86,214,0.3)" : "rgba(255,149,0,0.3)"}`, borderRadius: 8 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: winner === "A" ? "#5856D6" : "#FF9500" }}>
              Szenario {winner} vorn · {Math.abs(scoreA - scoreB)}% Unterschied
            </p>
          </div>
        )}
      </div>

      <div style={{ padding: "16px" }}>
        {/* Haupt-Vergleich */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <ScenarioColumn label="Szenario A" color="#5856D6" basisPrognose={basisPrognose} value={szenarioA} onChange={setSzenarioA} />

          {/* Mitte: Vergleichs-Chart */}
          <div style={{ width: 160, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
            <div style={{ background: "#fafafa", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "10px 8px" }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", textAlign: "center", marginBottom: 6 }}>Score-Vergleich</p>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={compareData} barCategoryGap="20%">
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#888" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: "#aaa" }} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={v => [`${v}%`, "Score"]} contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                  <Bar dataKey="wert" radius={[5, 5, 0, 0]}>
                    {compareData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Delta */}
            <div style={{ background: "#fafafa", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
              <p style={{ fontSize: 9, color: "#aaa", textTransform: "uppercase", marginBottom: 4 }}>Differenz</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: scoreA !== scoreB ? (scoreA > scoreB ? "#5856D6" : "#FF9500") : "#888" }}>
                {scoreA === scoreB ? "=" : `${Math.abs(scoreA - scoreB)}%`}
              </p>
              {scoreA !== scoreB && (
                <p style={{ fontSize: 9, color: "#888", marginTop: 2 }}>
                  {scoreA > scoreB ? "A führt" : "B führt"}
                </p>
              )}
            </div>

            {/* Radar */}
            {(szenarioA.reaktionen.length > 0 || szenarioB.reaktionen.length > 0) && (
              <div style={{ background: "#fafafa", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "8px 4px" }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", textAlign: "center", marginBottom: 4 }}>Muster-Overlap</p>
                <ResponsiveContainer width="100%" height={120}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(0,0,0,0.07)" />
                    <PolarAngleAxis dataKey="dim" tick={{ fontSize: 6, fill: "#aaa" }} />
                    <Radar dataKey="A" stroke="#5856D6" fill="#5856D6" fillOpacity={0.2} strokeWidth={1.5} />
                    <Radar dataKey="B" stroke="#FF9500" fill="#FF9500" fillOpacity={0.2} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                  {[["#5856D6","A"],["#FF9500","B"]].map(([c,l]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <div style={{ width: 8, height: 2, background: c, borderRadius: 99 }} />
                      <span style={{ fontSize: 8, color: "#aaa" }}>Sz. {l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ScenarioColumn label="Szenario B" color="#FF9500" basisPrognose={basisPrognose} value={szenarioB} onChange={setSzenarioB} />
        </div>
      </div>
    </div>
  );
}