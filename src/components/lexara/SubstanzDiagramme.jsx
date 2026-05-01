/**
 * SubstanzDiagramme.jsx — Stärken-Analyse Visualisierung
 * Zeigt Argumente & Beweise als interaktive Recharts-Diagramme
 * Eingebunden in TabSimulationCockpit (Reiter 7, Sub-Tab 5)
 */

import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, Legend, LabelList
} from "recharts";
import { Scale, Shield, TrendingUp, AlertTriangle } from "lucide-react";

const MATTE_COLORS = {
  eigen:    "#4F86C6",   // gedämpftes Blau
  gegner:   "#C0666A",   // gedämpftes Rot/Korall
  ki:       "#5BAA7D",   // gedämpftes Grün
  manual:   "#B07CC6",   // gedämpftes Violett
  neutral:  "#8FA4B0",   // Grau-Blau
};

const STRENGTH_COLORS = [
  "#4F86C6","#5BAA7D","#B07CC6","#C09A3A","#C0666A",
  "#6AABB5","#8F7BC6","#5A9E8A","#C0804F","#6080C0",
];

function StatChip({ label, value, color }) {
  return (
    <div className="flex flex-col items-center px-4 py-3 rounded-xl"
      style={{ background: `${color}18`, border: `1px solid ${color}55` }}>
      <span className="text-lg font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px] text-gray-500 mt-0.5 text-center leading-tight">{label}</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 border rounded-xl px-3 py-2 shadow-lg text-xs"
      style={{ borderColor: "rgba(0,0,0,0.1)" }}>
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{p.value}/10</span>
        </div>
      ))}
    </div>
  );
};

export default function SubstanzDiagramme({ caseId }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("bar"); // bar | radar | scatter

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, e] = await Promise.all([
        base44.entities.Argument.filter({ case_id: caseId }),
        base44.entities.Evidence.filter({ case_id: caseId }),
      ]);
      setArgs(a);
      setEvidence(e);
      setLoading(false);
    })();
  }, [caseId]);

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-400 rounded-full animate-spin" />
      Lade Analyse…
    </div>
  );

  // ── Stats ──────────────────────────────────────────────────────────────────
  const eigenArgs   = args.filter(a => a.side === "eigen");
  const gegnerArgs  = args.filter(a => a.side === "gegner");
  const avgEigen    = eigenArgs.length ? (eigenArgs.reduce((s, a) => s + (a.ki_strength ?? a.strength ?? 5), 0) / eigenArgs.length).toFixed(1) : "–";
  const avgGegner   = gegnerArgs.length ? (gegnerArgs.reduce((s, a) => s + (a.ki_strength ?? a.strength ?? 5), 0) / gegnerArgs.length).toFixed(1) : "–";
  const avgEvidence = evidence.length ? (evidence.reduce((s, e) => s + (e.ki_weight ?? e.weight ?? 5), 0) / evidence.length).toFixed(1) : "–";
  const widersprueche = args.filter(a => a.is_contradiction).length;

  // ── Bar-Chart Daten: Argumente ─────────────────────────────────────────────
  const argBarData = args.slice(0, 12).map(a => ({
    name: a.title?.length > 18 ? a.title.slice(0, 18) + "…" : (a.title || "–"),
    Manuell: a.strength ?? 5,
    KI:      a.ki_strength ?? null,
    side:    a.side,
  }));

  // ── Bar-Chart Daten: Beweise ───────────────────────────────────────────────
  const evBarData = evidence.slice(0, 10).map(e => ({
    name:    e.title?.length > 18 ? e.title.slice(0, 18) + "…" : (e.title || "–"),
    Manuell: e.weight ?? 5,
    KI:      e.ki_weight ?? null,
  }));

  // ── Radar: Typen-Durchschnitt ──────────────────────────────────────────────
  const typeMap = {};
  args.forEach(a => {
    const t = a.type || "Sonstig";
    if (!typeMap[t]) typeMap[t] = { count: 0, total: 0 };
    typeMap[t].count++;
    typeMap[t].total += (a.ki_strength ?? a.strength ?? 5);
  });
  const radarData = Object.entries(typeMap).map(([type, d]) => ({
    subject: type.length > 14 ? type.slice(0, 14) + "…" : type,
    Stärke:  +(d.total / d.count).toFixed(1),
  }));

  // ── Scatter: Manuell vs KI ─────────────────────────────────────────────────
  const discrepancyData = args
    .filter(a => a.ki_strength !== undefined && a.ki_strength !== null)
    .map(a => ({
      name: a.title?.slice(0, 20) || "–",
      manuell: a.strength ?? 5,
      ki:      a.ki_strength,
      diff:    Math.abs((a.strength ?? 5) - a.ki_strength),
      side:    a.side,
    }))
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 10);

  const VIEWS = [
    { id: "bar",        label: "Stärken-Balken" },
    { id: "radar",      label: "Typen-Radar" },
    { id: "discrepancy",label: "KI-Abweichung" },
  ];

  return (
    <div className="space-y-5">
      {/* ── KPI-Chips ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip label="Ø eigene Argumente" value={avgEigen}   color={MATTE_COLORS.eigen} />
        <StatChip label="Ø Gegner-Argumente" value={avgGegner}  color={MATTE_COLORS.gegner} />
        <StatChip label="Ø Beweis-Gewicht"   value={avgEvidence} color={MATTE_COLORS.ki} />
        <StatChip label="Widersprüche"        value={widersprueche} color={MATTE_COLORS.neutral} />
      </div>

      {/* ── View Switcher ── */}
      <div className="flex gap-2 flex-wrap">
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            className="no-override px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
            style={{
              background: view === v.id ? MATTE_COLORS.eigen : "transparent",
              color:      view === v.id ? "#fff" : MATTE_COLORS.eigen,
              border:     `1.5px solid ${MATTE_COLORS.eigen}`,
            }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* ── BAR: Argumente ── */}
      {view === "bar" && (
        <div className="space-y-5">
          {argBarData.length > 0 && (
            <div className="bg-white border rounded-2xl p-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Scale className="w-3.5 h-3.5 text-blue-400" /> Argumente — Stärke (manuell vs. KI)
              </h4>
              <ResponsiveContainer width="100%" height={Math.max(200, argBarData.length * 38)}>
                <BarChart data={argBarData} layout="vertical" barGap={2}>
                  <XAxis type="number" domain={[0, 10]} tickCount={6} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Manuell" fill={MATTE_COLORS.eigen} radius={[0, 4, 4, 0]} maxBarSize={14}>
                    {argBarData.map((d, i) => (
                      <Cell key={i} fill={d.side === "eigen" ? MATTE_COLORS.eigen : MATTE_COLORS.gegner} />
                    ))}
                    <LabelList dataKey="Manuell" position="right" style={{ fontSize: 9, fill: "#888" }} />
                  </Bar>
                  <Bar dataKey="KI" fill={MATTE_COLORS.ki} radius={[0, 4, 4, 0]} maxBarSize={14}>
                    <LabelList dataKey="KI" position="right" style={{ fontSize: 9, fill: "#888" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-3 mt-3 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="w-3 h-3 rounded-sm" style={{ background: MATTE_COLORS.eigen }} /> Eigene Argumente
                </span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="w-3 h-3 rounded-sm" style={{ background: MATTE_COLORS.gegner }} /> Gegner-Argumente
                </span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="w-3 h-3 rounded-sm" style={{ background: MATTE_COLORS.ki }} /> KI-Bewertung
                </span>
              </div>
            </div>
          )}

          {evBarData.length > 0 && (
            <div className="bg-white border rounded-2xl p-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-purple-400" /> Beweise — Gewicht (manuell vs. KI)
              </h4>
              <ResponsiveContainer width="100%" height={Math.max(180, evBarData.length * 38)}>
                <BarChart data={evBarData} layout="vertical" barGap={2}>
                  <XAxis type="number" domain={[0, 10]} tickCount={6} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Manuell" fill={MATTE_COLORS.manual} radius={[0, 4, 4, 0]} maxBarSize={14}>
                    {evBarData.map((_, i) => (
                      <Cell key={i} fill={STRENGTH_COLORS[i % STRENGTH_COLORS.length]} />
                    ))}
                    <LabelList dataKey="Manuell" position="right" style={{ fontSize: 9, fill: "#888" }} />
                  </Bar>
                  <Bar dataKey="KI" fill={MATTE_COLORS.ki} radius={[0, 4, 4, 0]} maxBarSize={14}>
                    <LabelList dataKey="KI" position="right" style={{ fontSize: 9, fill: "#888" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {args.length === 0 && evidence.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Noch keine Argumente oder Beweise erfasst.</p>
          )}
        </div>
      )}

      {/* ── RADAR: Typen ── */}
      {view === "radar" && (
        <div className="bg-white border rounded-2xl p-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" /> Durchschnittsstärke nach Argumenttyp
          </h4>
          {radarData.length >= 3 ? (
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(0,0,0,0.07)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#555" }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tickCount={5} tick={{ fontSize: 9 }} />
                <Radar name="Ø Stärke" dataKey="Stärke" stroke={MATTE_COLORS.eigen} fill={MATTE_COLORS.eigen} fillOpacity={0.22} strokeWidth={2} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              Mindestens 3 verschiedene Argumenttypen benötigt für Radar-Ansicht.
            </p>
          )}
        </div>
      )}

      {/* ── DISCREPANCY: Manuell vs KI ── */}
      {view === "discrepancy" && (
        <div className="bg-white border rounded-2xl p-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Größte Abweichungen: Manuell vs. KI-Bewertung
          </h4>
          {discrepancyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(180, discrepancyData.length * 42)}>
              <BarChart data={discrepancyData} layout="vertical" barGap={2}>
                <XAxis type="number" domain={[0, 10]} tickCount={6} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="manuell" name="Manuell" fill={MATTE_COLORS.manual} radius={[0, 4, 4, 0]} maxBarSize={14}>
                  <LabelList dataKey="manuell" position="right" style={{ fontSize: 9, fill: "#888" }} />
                </Bar>
                <Bar dataKey="ki" name="KI" fill={MATTE_COLORS.ki} radius={[0, 4, 4, 0]} maxBarSize={14}>
                  <LabelList dataKey="ki" position="right" style={{ fontSize: 9, fill: "#888" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              Keine KI-bewerteten Argumente vorhanden.
            </p>
          )}
          <p className="text-[10px] text-gray-400 mt-3">
            Sortiert nach größter Abweichung zwischen manueller und KI-Bewertung (Top 10).
            Abweichungen ≥ 4 gelten als Compliance-Hinweis.
          </p>
        </div>
      )}
    </div>
  );
}