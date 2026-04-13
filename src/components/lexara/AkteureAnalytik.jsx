import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, ScatterChart, Scatter, ZAxis, ReferenceLine
} from "recharts";
import { Users, TrendingUp, Award, AlertTriangle } from "lucide-react";

const KAT_COLORS = {
  Richter: "#1a3560",
  Anwalt: "#3b82f6",
  Kanzlei: "#8b5cf6",
  Zeuge: "#f59e0b",
  Sachverstaendiger: "#10b981",
  Partei: "#ef4444",
  Sonstiges: "#94a3b8",
};

const KATEGORIEN = ["Alle", "Richter", "Anwalt", "Kanzlei", "Sachverstaendiger", "Partei"];

function MiniLabel({ value }) {
  const color = value >= 60 ? "text-green-600" : value >= 40 ? "text-amber-600" : "text-red-600";
  return <span className={`text-[10px] font-bold ${color}`}>{value}%</span>;
}

const CustomBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-900 mb-1">{d.name}</p>
      <p className="text-slate-500">{d.kategorie}</p>
      {d.klaeger_rate !== undefined && <p className="text-blue-600 mt-1">Klägerquote: <strong>{d.klaeger_rate}%</strong></p>}
      {d.vergleich_rate !== undefined && <p className="text-violet-600">Vergleichsrate: <strong>{d.vergleich_rate}%</strong></p>}
      {d.urteile_gesamt > 0 && <p className="text-slate-400">{d.urteile_gesamt} Urteile</p>}
    </div>
  );
};

export default function AkteureAnalytik() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [katFilter, setKatFilter] = useState("Alle");
  const [sortBy, setSortBy] = useState("klaeger_rate");

  useEffect(() => {
    base44.entities.JudgeProfile.list().then(data => {
      setProfiles(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = profiles
    .filter(p => katFilter === "Alle" || (p.kategorie || "Richter") === katFilter)
    .filter(p => p.klaeger_rate !== undefined || p.vergleich_rate !== undefined)
    .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))
    .slice(0, 15);

  const chartData = filtered.map(p => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
    fullName: p.name,
    klaeger_rate: p.klaeger_rate || 0,
    vergleich_rate: p.vergleich_rate || 0,
    urteile_gesamt: p.urteile_gesamt || 0,
    kategorie: p.kategorie || "Richter",
    color: KAT_COLORS[p.kategorie] || KAT_COLORS.Sonstiges,
  }));

  // Scatter: Klägerquote vs Vergleichsrate
  const scatterData = profiles
    .filter(p => p.klaeger_rate !== undefined && p.vergleich_rate !== undefined)
    .map(p => ({
      x: p.klaeger_rate || 0,
      y: p.vergleich_rate || 0,
      z: (p.urteile_gesamt || 1) * 10,
      name: p.name,
      kategorie: p.kategorie || "Richter",
    }));

  // Top performers
  const topKlaeger = [...profiles].filter(p => p.klaeger_rate).sort((a, b) => b.klaeger_rate - a.klaeger_rate).slice(0, 3);
  const topVergleich = [...profiles].filter(p => p.vergleich_rate).sort((a, b) => b.vergleich_rate - a.vergleich_rate).slice(0, 3);
  const riskActors = [...profiles].filter(p => p.klaeger_rate && p.klaeger_rate < 35).slice(0, 3);

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
    </div>
  );

  if (profiles.length === 0) return (
    <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
      <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
      <p className="text-sm font-medium text-slate-600">Noch keine Akteur-Profile</p>
      <p className="text-xs text-slate-400 mt-1">Legen Sie Profile unter Prozessbeteiligte an.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1a3560]" /> Akteurs-Erfolgsraten
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">{profiles.length} Profile · Klägerquoten & Vergleichsraten im Überblick</p>
        </div>
      </div>

      {/* Top / Risk Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Award className="w-3 h-3" /> Top Klägerquote
          </p>
          <div className="space-y-2">
            {topKlaeger.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-green-400 font-bold">#{i + 1}</span>
                  <span className="text-xs font-semibold text-slate-800">{p.name}</span>
                  <span className="text-[9px] text-slate-400">{p.kategorie || "Richter"}</span>
                </div>
                <MiniLabel value={p.klaeger_rate} />
              </div>
            ))}
            {topKlaeger.length === 0 && <p className="text-xs text-green-600 opacity-60">Keine Daten</p>}
          </div>
        </div>

        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
          <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Top Vergleichsrate
          </p>
          <div className="space-y-2">
            {topVergleich.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-violet-400 font-bold">#{i + 1}</span>
                  <span className="text-xs font-semibold text-slate-800">{p.name}</span>
                  <span className="text-[9px] text-slate-400">{p.kategorie || "Richter"}</span>
                </div>
                <MiniLabel value={p.vergleich_rate} />
              </div>
            ))}
            {topVergleich.length === 0 && <p className="text-xs text-violet-600 opacity-60">Keine Daten</p>}
          </div>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Risikoakteure (&lt;35%)
          </p>
          <div className="space-y-2">
            {riskActors.map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800">{p.name}</span>
                  <span className="text-[9px] text-slate-400">{p.kategorie || "Richter"}</span>
                </div>
                <MiniLabel value={p.klaeger_rate} />
              </div>
            ))}
            {riskActors.length === 0 && <p className="text-xs text-red-600 opacity-60">Keine Risikoakteure</p>}
          </div>
        </div>
      </div>

      {/* Filter + Sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {KATEGORIEN.map(k => (
            <button key={k} onClick={() => setKatFilter(k)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                katFilter === k ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-500 hover:border-slate-400"
              }`}>
              {k}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">Sortieren:</span>
          <select className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 bg-white"
            value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="klaeger_rate">Klägerquote</option>
            <option value="vergleich_rate">Vergleichsrate</option>
            <option value="urteile_gesamt">Urteile gesamt</option>
          </select>
        </div>
      </div>

      {/* Bar Chart: Klägerquote */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Klägerquote & Vergleichsrate im Vergleich
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} domain={[0, 100]} unit="%" />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="4 4" label={{ value: "50%", position: "right", fontSize: 10, fill: "#cbd5e1" }} />
              <Bar dataKey="klaeger_rate" name="Klägerquote" radius={[3, 3, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.klaeger_rate >= 55 ? "#16a34a" : d.klaeger_rate >= 40 ? "#3b82f6" : "#ef4444"} />
                ))}
              </Bar>
              <Bar dataKey="vergleich_rate" name="Vergleichsrate" fill="#8b5cf6" radius={[3, 3, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center flex-wrap">
            {[["Grün", "Klägerquote ≥55% – Vorteilhaft", "#16a34a"], ["Blau", "40–54%", "#3b82f6"], ["Rot", "<40% – Riskant", "#ef4444"], ["Lila", "Vergleichsrate", "#8b5cf6"]].map(([l, desc, col]) => (
              <div key={l} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: col }} />
                <span className="text-[9px] text-slate-500">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scatter: Matrix */}
      {scatterData.length >= 2 && (
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
            Strategische Matrix: Klägerquote vs. Vergleichsrate
          </h3>
          <p className="text-[10px] text-slate-400 mb-4">Rechts oben = hohe Kläger- und Vergleichsrate = strategisch wertvoll</p>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" dataKey="x" name="Klägerquote" unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} label={{ value: "Klägerquote", position: "insideBottom", offset: -2, fontSize: 10, fill: "#94a3b8" }} />
              <YAxis type="number" dataKey="y" name="Vergleichsrate" unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} label={{ value: "Vergleichsrate", angle: -90, position: "insideLeft", offset: 10, fontSize: 10, fill: "#94a3b8" }} />
              <ZAxis type="number" dataKey="z" range={[40, 200]} />
              <ReferenceLine x={50} stroke="#e2e8f0" strokeDasharray="4 4" />
              <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="4 4" />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-white border border-slate-200 rounded-xl shadow p-3 text-xs">
                    <p className="font-bold text-slate-900">{d.name}</p>
                    <p className="text-slate-400">{d.kategorie}</p>
                    <p className="text-blue-600">Klägerquote: {d.x}%</p>
                    <p className="text-violet-600">Vergleichsrate: {d.y}%</p>
                  </div>
                );
              }} />
              <Scatter data={scatterData} fill="#1a3560">
                {scatterData.map((d, i) => (
                  <Cell key={i} fill={d.x >= 55 && d.y >= 50 ? "#16a34a" : d.x < 40 ? "#ef4444" : "#3b82f6"} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            {[["#16a34a", "Strategisch vorteilhaft"], ["#3b82f6", "Neutral"], ["#ef4444", "Riskant"]].map(([col, l]) => (
              <div key={l} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: col }} />
                <span className="text-[9px] text-slate-500">{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}