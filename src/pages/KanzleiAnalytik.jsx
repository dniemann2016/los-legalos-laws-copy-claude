import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, TrendingUp, AlertTriangle, Users, FileText, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useJurisdiction } from "../hooks/useJurisdiction";
import { getT } from "../lib/jurisdictionConfig";
import JurisdictionToggle from "../components/JurisdictionToggle";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import FallAnalyseModal from "../components/dashboard/FallAnalyseModal";

const COLORS = ["#1a3560", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function StatCard({ icon: Icon, label, value, sub, color = "text-slate-900", accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent || "bg-slate-50"}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function KanzleiAnalytik() {
  const [cases, setCases] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [arguments_, setArguments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { jurisdiction } = useJurisdiction();
  const t = getT(jurisdiction);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [cs, dl, args] = await Promise.all([
      base44.entities.Case.list(),
      base44.entities.Deadline.list(),
      base44.entities.Argument.list(),
    ]);
    setCases(cs || []);
    setDeadlines(dl || []);
    setArguments(args || []);
    setLoading(false);
  };

  // Derived stats
  const activeCases = cases.filter(c => c.status === "Aktiv").length;
  const openDeadlines = deadlines.filter(d => d.status === "offen").length;
  const overdueDeadlines = deadlines.filter(d => {
    if (d.status !== "offen") return false;
    return new Date(d.due_date) < new Date();
  }).length;
  const avgPrognose = cases.length
    ? Math.round(cases.filter(c => c.prognose).reduce((a, c) => a + (c.prognose || 0), 0) / cases.filter(c => c.prognose).length || 0)
    : 0;

  // Chart: Status-Verteilung
  const statusData = ["Aktiv", "Vorbereitung", "Abgeschlossen", "Ruhend"].map(s => ({
    name: s,
    value: cases.filter(c => c.status === s).length,
  })).filter(d => d.value > 0);

  // Chart: Fälle nach Rechtsgebiet
  const rechtsgebietMap = {};
  cases.forEach(c => {
    if (c.rechtsgebiet) rechtsgebietMap[c.rechtsgebiet] = (rechtsgebietMap[c.rechtsgebiet] || 0) + 1;
  });
  const rechtsgebietData = Object.entries(rechtsgebietMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // Chart: Fristen-Status
  const fristenData = [
    { name: "Offen", value: deadlines.filter(d => d.status === "offen" && new Date(d.due_date) >= new Date()).length },
    { name: "Überfällig", value: overdueDeadlines },
    { name: "Erledigt", value: deadlines.filter(d => d.status === "erledigt").length },
    { name: "Versäumt", value: deadlines.filter(d => d.status === "versaeumt").length },
  ].filter(d => d.value > 0);

  // Chart: Prognose-Verteilung
  const prognoseRanges = [
    { name: "0–25%", count: cases.filter(c => (c.prognose || 0) <= 25).length },
    { name: "26–50%", count: cases.filter(c => (c.prognose || 0) > 25 && (c.prognose || 0) <= 50).length },
    { name: "51–75%", count: cases.filter(c => (c.prognose || 0) > 50 && (c.prognose || 0) <= 75).length },
    { name: "76–100%", count: cases.filter(c => (c.prognose || 0) > 75).length },
  ];

  // Chart: Instanz-Verteilung
  const instanzMap = {};
  cases.forEach(c => { if (c.instanz) instanzMap[c.instanz] = (instanzMap[c.instanz] || 0) + 1; });
  const instanzData = Object.entries(instanzMap).map(([name, value]) => ({ name, value }));

  // Upcoming deadlines (next 14 days)
  const upcoming = deadlines
    .filter(d => d.status === "offen")
    .map(d => ({ ...d, daysLeft: Math.ceil((new Date(d.due_date) - new Date()) / 86400000) }))
    .filter(d => d.daysLeft >= 0 && d.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans pb-12">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-slate-400 hover:text-slate-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-px h-4 bg-slate-200" />
            <div>
              <h1 className="text-sm font-bold text-slate-900">{t.module?.[5]?.title || "Kanzlei-Analytik"}</h1>
              <p className="text-[11px] text-slate-400">{cases.length} Mandate · {activeCases} aktiv</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <JurisdictionToggle />
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-[#1a3560] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#142a4d] transition-colors">
              <TrendingUp className="w-3.5 h-3.5" /> {t.kiFallanalyse}
            </button>
            <button onClick={loadData} className="p-2 text-slate-400 hover:text-slate-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FileText} label={t.aktiveFaelleLabel} value={activeCases} sub={jurisdiction === "DE" ? `von ${cases.length} gesamt` : `of ${cases.length} total`} accent="bg-blue-50" color="text-blue-600" />
          <StatCard icon={AlertTriangle} label={t.offeeneFristenLabel} value={openDeadlines}
            sub={overdueDeadlines > 0 ? (jurisdiction === "DE" ? `${overdueDeadlines} überfällig` : `${overdueDeadlines} overdue`) : (jurisdiction === "DE" ? "Alle im Plan" : "All on track")}
            color={overdueDeadlines > 0 ? "text-red-500" : "text-green-600"} accent={overdueDeadlines > 0 ? "bg-red-50" : "bg-green-50"} />
          <StatCard icon={TrendingUp} label={t.avgPrognoseLabel} value={`${avgPrognose}%`} sub={jurisdiction === "DE" ? "Erfolgswahrscheinlichkeit" : "Win Probability"} accent="bg-amber-50" color="text-amber-600" />
          <StatCard icon={Users} label={t.argumenteLabel} value={arguments_.length} sub={jurisdiction === "DE" ? "gesamt erfasst" : "total recorded"} accent="bg-violet-50" color="text-violet-600" />
        </div>

        {/* Row 1: Rechtsgebiet + Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-100 p-5">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">{t.faelleNachRechtsgebiet}</h2>
            {rechtsgebietData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rechtsgebietData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#1a3560" radius={[4, 4, 0, 0]} name="Fälle" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Keine Daten</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">{t.statusVerteilung}</h2>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" nameKey="name" paddingAngle={3}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Keine Daten</div>
            )}
          </div>
        </div>

        {/* Row 2: Prognose-Verteilung + Fristen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">{t.prognoseVerteilung}</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={prognoseRanges} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" name="Fälle" radius={[4, 4, 0, 0]}>
                  {prognoseRanges.map((_, i) => (
                    <Cell key={i} fill={["#dc2626", "#d97706", "#3b82f6", "#16a34a"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">{t.fristenUebersicht}</h2>
            {fristenData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={fristenData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" paddingAngle={3}>
                    {fristenData.map((entry, i) => (
                      <Cell key={i} fill={
                        entry.name === "Überfällig" ? "#dc2626" :
                        entry.name === "Versäumt" ? "#d97706" :
                        entry.name === "Erledigt" ? "#16a34a" : "#3b82f6"
                      } />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Keine Fristen erfasst</div>
            )}
          </div>
        </div>

        {/* Row 3: Upcoming deadlines + Instanz */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-100 p-5">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">{t.naechste14Tage}</h2>
            {upcoming.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {upcoming.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{d.title}</p>
                      <p className="text-[10px] text-slate-400">{d.frist_type || "Frist"}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      d.daysLeft <= 2 ? "bg-red-100 text-red-700" :
                      d.daysLeft <= 5 ? "bg-amber-100 text-amber-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {d.daysLeft === 0 ? "Heute" : `${d.daysLeft}d`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Keine bevorstehenden Fristen</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">{t.instanzVerteilung}</h2>
            {instanzData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={instanzData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" paddingAngle={3}>
                    {instanzData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Keine Daten</div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <FallAnalyseModal cases={cases} jurisdiction={jurisdiction} t={t} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}