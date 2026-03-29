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

const COLORS = ["#1f2937", "#6b7280", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

function StatCard({ icon: Icon, label, value, sub, color = "text-gray-900" }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Zurück
            </Link>
            <span className="text-gray-200">·</span>
            <h1 className="font-bold text-gray-900 text-base">{t.module?.[5]?.title || "Kanzlei-Analytik"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <JurisdictionToggle className="mr-1" />
            <button onClick={() => setShowModal(true)}
              className="bg-gray-900 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> {t.kiFallanalyse}
            </button>
            <button onClick={loadData} className="p-2 text-gray-400 hover:text-gray-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={FileText} label={t.aktiveFaelleLabel} value={activeCases} sub={jurisdiction === "DE" ? `von ${cases.length} gesamt` : `of ${cases.length} total`} />
          <StatCard icon={AlertTriangle} label={t.offeeneFristenLabel} value={openDeadlines}
            sub={overdueDeadlines > 0 ? (jurisdiction === "DE" ? `${overdueDeadlines} überfällig` : `${overdueDeadlines} overdue`) : (jurisdiction === "DE" ? "Alle im Plan" : "All on track")}
            color={overdueDeadlines > 0 ? "text-red-500" : "text-gray-900"} />
          <StatCard icon={TrendingUp} label={t.avgPrognoseLabel} value={`${avgPrognose}%`} sub={jurisdiction === "DE" ? "Erfolgswahrscheinlichkeit" : "Win Probability"} />
          <StatCard icon={Users} label={t.argumenteLabel} value={arguments_.length} sub={jurisdiction === "DE" ? "gesamt erfasst" : "total recorded"} />
        </div>

        {/* Row 1: Rechtsgebiet + Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">{t.faelleNachRechtsgebiet}</h2>
            {rechtsgebietData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rechtsgebietData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#1f2937" radius={[4, 4, 0, 0]} name="Fälle" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Keine Daten</div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">{t.statusVerteilung}</h2>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" nameKey="name" paddingAngle={3}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Keine Daten</div>
            )}
          </div>
        </div>

        {/* Row 2: Prognose-Verteilung + Fristen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">{t.prognoseVerteilung}</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={prognoseRanges} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="count" name="Fälle" radius={[4, 4, 0, 0]}>
                  {prognoseRanges.map((_, i) => (
                    <Cell key={i} fill={["#ef4444", "#f59e0b", "#3b82f6", "#10b981"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">{t.fristenUebersicht}</h2>
            {fristenData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={fristenData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" paddingAngle={3}>
                    {fristenData.map((entry, i) => (
                      <Cell key={i} fill={
                        entry.name === "Überfällig" ? "#ef4444" :
                        entry.name === "Versäumt" ? "#f59e0b" :
                        entry.name === "Erledigt" ? "#10b981" : "#3b82f6"
                      } />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Keine Fristen erfasst</div>
            )}
          </div>
        </div>

        {/* Row 3: Upcoming deadlines + Instanz */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">{t.naechste14Tage}</h2>
            {upcoming.length > 0 ? (
              <div className="space-y-2">
                {upcoming.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.title}</p>
                      <p className="text-xs text-gray-400">{d.frist_type || "Frist"}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      d.daysLeft <= 2 ? "bg-red-100 text-red-700" :
                      d.daysLeft <= 5 ? "bg-orange-100 text-orange-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {d.daysLeft === 0 ? "Heute" : `${d.daysLeft}d`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Keine bevorstehenden Fristen</div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">{t.instanzVerteilung}</h2>
            {instanzData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={instanzData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" paddingAngle={3}>
                    {instanzData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Keine Daten</div>
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