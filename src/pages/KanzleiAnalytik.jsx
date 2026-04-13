import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, AlertTriangle, Users, FileText, RefreshCw } from "lucide-react";
import { useJurisdiction } from "../hooks/useJurisdiction";
import { getT, getTByLanguage } from "../lib/jurisdictionConfig";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import FallAnalyseModal from "../components/dashboard/FallAnalyseModal";
import AkteureAnalytik from "../components/lexara/AkteureAnalytik";

const COLORS = ["#1a3560", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function StatCard({ icon: Icon, label, value, sub, color = "text-slate-900", accent }) {
  return (
    <div className="bg-white rounded-xl border border-[#f0f0f0] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-[#999] uppercase tracking-widest">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent || "bg-[#fafafa]"}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-[#1a1a1a] tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-[#999] mt-1">{sub}</p>}
    </div>
  );
}

export default function KanzleiAnalytik() {
  const [cases, setCases] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [arguments_, setArguments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterLabel, setFilterLabel] = useState(null);
  const [filteredCases, setFilteredCases] = useState([]);
  const { jurisdiction } = useJurisdiction();
  const { language } = useUserProfile();
  const t = language === "EN" || language === "FR" ? getTByLanguage(language) : getT(jurisdiction);

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

  const activeCases = cases.filter(c => c.status === "Aktiv").length;
  const openDeadlines = deadlines.filter(d => d.status === "offen").length;
  const overdueDeadlines = deadlines.filter(d => {
    if (d.status !== "offen") return false;
    return new Date(d.due_date) < new Date();
  }).length;
  const avgPrognose = cases.length
    ? Math.round(cases.filter(c => c.prognose).reduce((a, c) => a + (c.prognose || 0), 0) / (cases.filter(c => c.prognose).length || 1))
    : 0;

  const statusData = ["Aktiv", "Vorbereitung", "Abgeschlossen", "Ruhend"].map(s => ({
    name: s, value: cases.filter(c => c.status === s).length,
  })).filter(d => d.value > 0);

  const rechtsgebietMap = {};
  cases.forEach(c => {
    if (c.rechtsgebiet) rechtsgebietMap[c.rechtsgebiet] = (rechtsgebietMap[c.rechtsgebiet] || 0) + 1;
  });
  const rechtsgebietData = Object.entries(rechtsgebietMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 7);

  const fristenData = [
    { name: "Offen", value: deadlines.filter(d => d.status === "offen" && new Date(d.due_date) >= new Date()).length },
    { name: "Ueberfaellig", value: overdueDeadlines },
    { name: "Erledigt", value: deadlines.filter(d => d.status === "erledigt").length },
    { name: "Versaeumt", value: deadlines.filter(d => d.status === "versaeumt").length },
  ].filter(d => d.value > 0);

  const prognoseRanges = [
    { name: "0-25%", count: cases.filter(c => (c.prognose || 0) <= 25).length },
    { name: "26-50%", count: cases.filter(c => (c.prognose || 0) > 25 && (c.prognose || 0) <= 50).length },
    { name: "51-75%", count: cases.filter(c => (c.prognose || 0) > 50 && (c.prognose || 0) <= 75).length },
    { name: "76-100%", count: cases.filter(c => (c.prognose || 0) > 75).length },
  ];

  const instanzMap = {};
  cases.forEach(c => { if (c.instanz) instanzMap[c.instanz] = (instanzMap[c.instanz] || 0) + 1; });
  const instanzData = Object.entries(instanzMap).map(([name, value]) => ({ name, value }));

  const upcoming = deadlines
    .filter(d => d.status === "offen")
    .map(d => ({ ...d, daysLeft: Math.ceil((new Date(d.due_date) - new Date()) / 86400000) }))
    .filter(d => d.daysLeft >= 0 && d.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-[#1a3560] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans pb-12">
      <div className="border-b border-[#f0f0f0] bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-[#1a1a1a]">{t.module?.[5]?.title || "Kanzlei-Analytik"}</h1>
            <p className="text-[11px] text-[#666]">{t.mandatesSub(cases.length, activeCases)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-[#1a3560] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#142a4d] transition-colors">
              <TrendingUp className="w-3.5 h-3.5" /> {t.kiFallanalyse}
            </button>
            <button onClick={loadData} className="p-2 text-[#999] hover:text-[#1a1a1a] transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FileText} label={t.aktiveFaelleLabel} value={activeCases} sub={t.ofTotalLabel(cases.length)} accent="bg-blue-50" color="text-blue-600" />
          <StatCard icon={AlertTriangle} label={t.offeeneFristenLabel} value={openDeadlines}
            sub={overdueDeadlines > 0 ? `${overdueDeadlines} ${t.overdueDeadlinesLabel}` : t.allOnTrack}
            color={overdueDeadlines > 0 ? "text-red-500" : "text-green-600"} accent={overdueDeadlines > 0 ? "bg-red-50" : "bg-green-50"} />
          <StatCard icon={TrendingUp} label={t.avgPrognoseLabel} value={`${avgPrognose}%`} sub={t.winProbabilityLabel} accent="bg-amber-50" color="text-amber-600" />
          <StatCard icon={Users} label={t.argumenteLabel} value={arguments_.length} sub={t.totalRecordedLabel} accent="bg-violet-50" color="text-violet-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-xl border border-[#f0f0f0] p-5">
            <h2 className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-4">{t.faelleNachRechtsgebiet}</h2>
            {filterLabel && (
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs font-medium text-[#1a1a1a]">Filter: <span className="text-[#1a3560]">{filterLabel}</span> · {filteredCases.length} Fälle</p>
                <button onClick={() => { setFilterLabel(null); setFilteredCases([]); }} className="text-[10px] text-[#999] hover:text-[#1a1a1a] underline">{t.filterResetBtn}</button>
              </div>
            )}
            {filterLabel && filteredCases.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {filteredCases.map(c => (
                  <span key={c.id} className="text-[10px] bg-[#fafafa] text-[#666] rounded-md px-2 py-0.5 border border-[#f0f0f0]">{c.fallname}</span>
                ))}
              </div>
            )}
            {rechtsgebietData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rechtsgebietData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  onClick={(data) => {
                    if (!data?.activePayload) return;
                    const label = data.activePayload[0]?.payload?.name;
                    if (!label) return;
                    setFilterLabel(label);
                    setFilteredCases(cases.filter(c => c.rechtsgebiet === label));
                  }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#999" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#999" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", fontSize: 12 }} cursor={{ fill: "#fafafa" }} />
                  <Bar dataKey="count" fill="#1a3560" radius={[4, 4, 0, 0]} name="Fälle" style={{ cursor: "pointer" }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-[#999] text-sm">{t.noDataShort}</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#f0f0f0] p-5">
            <h2 className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-4">{t.statusVerteilung}</h2>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart onClick={(data) => {
                  if (!data?.activePayload) return;
                  const label = data.activePayload[0]?.payload?.name;
                  if (!label) return;
                  setFilterLabel(label);
                  setFilteredCases(cases.filter(c => c.status === label));
                }}>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" nameKey="name" paddingAngle={3} style={{ cursor: "pointer" }}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", fontSize: 12 }} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-[#999] text-sm">{t.noDataShort}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#f0f0f0] p-5">
            <h2 className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-4">{t.prognoseVerteilung}</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={prognoseRanges} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#999" }} />
                <YAxis tick={{ fontSize: 11, fill: "#999" }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", fontSize: 12 }} />
                <Bar dataKey="count" name="Fälle" radius={[4, 4, 0, 0]}>
                  {prognoseRanges.map((_, i) => (
                    <Cell key={i} fill={["#dc2626", "#d97706", "#3b82f6", "#16a34a"][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-[#f0f0f0] p-5">
            <h2 className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-4">{t.fristenUebersicht}</h2>
            {fristenData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={fristenData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" paddingAngle={3}>
                    {fristenData.map((entry, i) => (
                      <Cell key={i} fill={
                        entry.name === "Ueberfaellig" ? "#dc2626" :
                        entry.name === "Versaeumt" ? "#d97706" :
                        entry.name === "Erledigt" ? "#16a34a" : "#3b82f6"
                      } />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", fontSize: 12 }} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-[#999] text-sm">{t.noDeadlinesShort}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-xl border border-[#f0f0f0] p-5">
            <h2 className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-4">{t.naechste14Tage}</h2>
            {upcoming.length > 0 ? (
              <div className="divide-y divide-[#fafafa]">
                {upcoming.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-xs font-semibold text-[#1a1a1a]">{d.title}</p>
                      <p className="text-[10px] text-[#999]">{d.frist_type || "Frist"}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      d.daysLeft <= 2 ? "bg-red-100 text-red-700" :
                      d.daysLeft <= 5 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {d.daysLeft === 0 ? t.todayShort : `${d.daysLeft}d`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-[#999] text-sm">{t.noUpcomingShort}</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#f0f0f0] p-5">
            <h2 className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-4">{t.instanzVerteilung}</h2>
            {instanzData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={instanzData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" paddingAngle={3}>
                    {instanzData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #f0f0f0", fontSize: 12 }} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 flex items-center justify-center text-[#999] text-sm">{t.noDataShort}</div>
            )}
          </div>
        </div>

        <AkteureAnalytik />
      </div>

      {showModal && (
        <FallAnalyseModal cases={cases} jurisdiction={jurisdiction} t={t} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}