import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { getTByLanguage } from "../lib/jurisdictionConfig";
import { useUserProfile } from "../hooks/useUserProfile";
import { ArrowLeft, ChevronRight, AlertTriangle, TrendingUp, Scale, Clock, Search, CheckCircle2, Circle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const RISK_COLORS = { niedrig: "#16a34a", mittel: "#d97706", hoch: "#dc2626" };

function RisikoAmpel({ level }) {
  const colors = { niedrig: "bg-green-500", mittel: "bg-amber-400", hoch: "bg-red-500" };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[level] || "bg-slate-300"}`} />;
}

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent || "bg-slate-50"}`}>
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function KanzleiCockpit() {
  const navigate = useNavigate();
  const { language } = useUserProfile();
  const t = getTByLanguage(language);
  const [cases, setCases] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Case.list("-updated_date", 100),
      base44.entities.Deadline.list("-due_date", 200),
      base44.entities.Task.list("-created_date", 50),
    ]).then(([c, d, tk]) => { setCases(c); setDeadlines(d); setTasks(tk); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
    </div>
  );

  const aktiv = cases.filter(c => c.status === "Aktiv");
  const gesamtStreitwert = cases.reduce((s, c) => s + (c.streitwert || 0), 0);
  const avgPrognose = cases.length ? Math.round(cases.reduce((s, c) => s + (c.prognose || 0), 0) / cases.length) : 0;
  const today = new Date();
  const naechsteFristen = deadlines.filter(d => d.status === "offen" && new Date(d.due_date) > today)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 6);
  const ueberfaellig = deadlines.filter(d => d.status === "offen" && new Date(d.due_date) < today);

  const risikoVerteilung = [
    { name: "Niedrig", value: cases.filter(c => (c.prognose || 0) >= 65).length, color: "#16a34a" },
    { name: "Mittel", value: cases.filter(c => (c.prognose || 0) >= 40 && (c.prognose || 0) < 65).length, color: "#d97706" },
    { name: "Hoch", value: cases.filter(c => (c.prognose || 0) < 40).length, color: "#dc2626" },
  ];

  const rechtsgebietData = Object.entries(
    cases.reduce((acc, c) => { const rg = c.rechtsgebiet || "Sonstige"; acc[rg] = (acc[rg] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const getRisikoLevel = (c) => {
    const p = c.prognose || 0;
    if (p >= 65) return "niedrig";
    if (p >= 40) return "mittel";
    return "hoch";
  };

  const hochrisikoFaelle = cases.filter(c => (c.prognose || 0) < 40 && c.status === "Aktiv").slice(0, 5);
  const topChancen = cases.filter(c => (c.prognose || 0) >= 70 && c.status === "Aktiv").slice(0, 5);

  // Next deadline per case
  const today2 = new Date();
  const nextDeadlineMap = {};
  deadlines.filter(d => d.status === "offen" && new Date(d.due_date) >= today2)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .forEach(d => { if (!nextDeadlineMap[d.case_id]) nextDeadlineMap[d.case_id] = d; });

  // Upcoming tasks (open, not done)
  const openTasks = tasks.filter(t => t.status !== "erledigt")
    .sort((a, b) => new Date(a.due_date || "9999") - new Date(b.due_date || "9999"))
    .slice(0, 6);

  // Filtered cases for table
  const filteredCases = cases.filter(c => {
    if (!tableSearch) return true;
    const q = tableSearch.toLowerCase();
    return c.fallname?.toLowerCase().includes(q) ||
      c.aktenzeichen?.toLowerCase().includes(q) ||
      c.rechtsgebiet?.toLowerCase().includes(q);
  });

  const tasksTitleLabel = language === "EN" ? "Upcoming Tasks" : language === "FR" ? "Tâches à venir" : "Anstehende Aufgaben";
  const tasksViewAll = language === "EN" ? "View all →" : language === "FR" ? "Tout voir →" : "Alle anzeigen →";
  const noTasksLabel = language === "EN" ? "No open tasks ✓" : language === "FR" ? "Aucune tâche ouverte ✓" : "Keine offenen Aufgaben ✓";
  const searchPlaceholder = language === "EN" ? "Search cases…" : language === "FR" ? "Rechercher…" : "Fälle suchen…";
  const updatedLabel = language === "EN" ? "Updated" : language === "FR" ? "Modifié" : "Aktualisiert";
  const nextDeadlineLabel = language === "EN" ? "Next Deadline" : language === "FR" ? "Prochain délai" : "Nächste Frist";
  const PRIORITY_COLORS = { hoch: "bg-red-100 text-red-700", mittel: "bg-amber-100 text-amber-700", niedrig: "bg-green-100 text-green-700" };
  const PRIORITY_LABELS = { hoch: { DE: "Hoch", EN: "High", FR: "Élevée" }, mittel: { DE: "Mittel", EN: "Medium", FR: "Moyenne" }, niedrig: { DE: "Niedrig", EN: "Low", FR: "Faible" } };

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans">
      {/* Sticky top bar */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/modules" className="text-slate-400 hover:text-slate-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-px h-4 bg-slate-200" />
            <div>
              <h1 className="text-sm font-bold text-slate-900">{t.cockpitTitle}</h1>
              <p className="text-[11px] text-slate-400">{t.portfolioSub(cases.length)}</p>
            </div>
          </div>
          <Link to="/lexara"
            className="flex items-center gap-1.5 bg-[#1a3560] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#142a4d] transition-colors">
            {t.newCaseLinkLabel}
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Scale} label={t.aktiveFaelleLabel} value={aktiv.length} sub={`${cases.length} ${t.allMandatesSub}`} accent="bg-blue-50" />
          <KpiCard icon={TrendingUp} label={t.totalClaimLabel} value={`${(gesamtStreitwert / 1000000).toFixed(1)}M€`} sub={t.allMandatesSub} accent="bg-emerald-50" />
          <KpiCard icon={TrendingUp} label={t.avgPrognosisLabel} value={`${avgPrognose}%`} sub={t.weightedAvgSub} accent="bg-amber-50" />
          <KpiCard icon={AlertTriangle} label={t.overdueDeadlinesLabel} value={ueberfaellig.length}
            sub={ueberfaellig.length > 0 ? t.actNow : t.allOnTrack} accent={ueberfaellig.length > 0 ? "bg-red-50" : "bg-green-50"} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 p-5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">{t.risikoverteilung}</p>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={risikoVerteilung} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={3}>
                  {risikoVerteilung.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v + ` ${t.casesLabelShort}`, n]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {risikoVerteilung.map(r => (
                <div key={r.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="text-[10px] text-slate-500">{r.name} <span className="font-semibold text-slate-700">({r.value})</span></span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-xl border border-slate-100 p-5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">{t.faelleNachRechtsgebiet}</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={rechtsgebietData} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} width={110} />
                <Tooltip formatter={v => [v + ` ${t.casesLabelShort}`]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="value" fill="#1a3560" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk + Chancen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-red-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-[11px] font-semibold text-red-600 uppercase tracking-widest">{t.highRiskLabel}</p>
            </div>
            {hochrisikoFaelle.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">{t.noHighRisk}</p>
            ) : (
              <div className="space-y-2">
                {hochrisikoFaelle.map(c => (
                  <button key={c.id} onClick={() => navigate(`/lexara/case?id=${c.id}`)}
                    className="w-full flex items-center justify-between bg-red-50 rounded-lg border border-red-100 px-3 py-2.5 text-left hover:border-red-300 transition-colors group">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{c.fallname}</p>
                      <p className="text-[10px] text-slate-400">{c.rechtsgebiet}{c.gericht ? ` · ${c.gericht}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-red-600">{c.prognose || 0}%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-green-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-[11px] font-semibold text-green-700 uppercase tracking-widest">{t.topChancesLabel}</p>
            </div>
            {topChancen.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">{t.noTopChancesText}</p>
            ) : (
              <div className="space-y-2">
                {topChancen.map(c => (
                  <button key={c.id} onClick={() => navigate(`/lexara/case?id=${c.id}`)}
                    className="w-full flex items-center justify-between bg-green-50 rounded-lg border border-green-100 px-3 py-2.5 text-left hover:border-green-300 transition-colors group">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{c.fallname}</p>
                      <p className="text-[10px] text-slate-400">{c.rechtsgebiet}{c.streitwert ? ` · ${(c.streitwert / 1000).toFixed(0)}k€` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-green-600">{c.prognose || 0}%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fristen */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{t.nextDeadlinesLabel}</p>
            </div>
            <Link to="/zeitleiste" className="text-[11px] text-[#1a3560] font-semibold hover:opacity-70 transition-opacity">{t.showAllLink}</Link>
          </div>
          {naechsteFristen.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">{t.noOpenDeadlinesText}</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {naechsteFristen.map((d, i) => {
                const days = Math.ceil((new Date(d.due_date) - today) / 86400000);
                const c = cases.find(ca => ca.id === d.case_id);
                const urgency = days <= 3 ? "bg-red-100 text-red-700" : days <= 7 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
                return (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md min-w-[32px] text-center ${urgency}`}>{days}{language === "EN" ? "d" : language === "FR" ? "j" : "T"}</span>
                      <div>
                        <p className="text-xs font-medium text-slate-800">{d.title}</p>
                        <p className="text-[10px] text-slate-400">{c?.fallname || "—"}{d.frist_type ? ` · ${d.frist_type}` : ""}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 tabular-nums">{new Date(d.due_date).toLocaleDateString(language === "EN" ? "en-US" : language === "FR" ? "fr-FR" : "de-DE")}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{tasksTitleLabel}</p>
            </div>
            <Link to="/aufgaben" className="text-[11px] text-[#1a3560] font-semibold hover:opacity-70 transition-opacity">{tasksViewAll}</Link>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">{noTasksLabel}</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {openTasks.map(task => {
                const daysLeft = task.due_date ? Math.ceil((new Date(task.due_date) - new Date()) / 86400000) : null;
                const urgency = daysLeft !== null && daysLeft <= 0 ? "text-red-600" : daysLeft !== null && daysLeft <= 3 ? "text-amber-600" : "text-slate-400";
                return (
                  <div key={task.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {task.status === "in_bearbeitung" ? <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{task.title}</p>
                        {task.case_name && <p className="text-[10px] text-slate-400 truncate">{task.case_name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.priority && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${PRIORITY_COLORS[task.priority]}`}>
                          {PRIORITY_LABELS[task.priority]?.[language] || task.priority}
                        </span>
                      )}
                      {daysLeft !== null && (
                        <span className={`text-[11px] tabular-nums ${urgency}`}>
                          {daysLeft < 0 ? (language === "EN" ? `${Math.abs(daysLeft)}d late` : `${Math.abs(daysLeft)}T überf.`) : daysLeft === 0 ? (language === "EN" ? "Today" : "Heute") : `${daysLeft}d`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mandats-Tabelle */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{t.allMandatesLabel}</p>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={tableSearch} onChange={e => setTableSearch(e.target.value)} placeholder={searchPlaceholder}
                  className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-slate-400 w-48" />
              </div>
              <span className="text-[11px] text-slate-400 flex-shrink-0">{t.entriesLabel(filteredCases.length)}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-50">
                  {["", t.tableHeaderCase, t.rechtsgebiet, t.tableHeaderCourt, t.tableHeaderClaimValue, t.prognose, t.tableHeaderStatus, updatedLabel, nextDeadlineLabel, ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCases.map(c => {
                  const nextDl = nextDeadlineMap[c.id];
                  const dlDays = nextDl ? Math.ceil((new Date(nextDl.due_date) - new Date()) / 86400000) : null;
                  return (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/lexara/case?id=${c.id}`)}>
                      <td className="pl-5 py-3"><RisikoAmpel level={getRisikoLevel(c)} /></td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-800 max-w-[160px] truncate">{c.fallname}</p>
                        {c.aktenzeichen && <p className="text-[10px] text-slate-400 font-mono">{c.aktenzeichen}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[100px] truncate">{c.rechtsgebiet || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{c.gericht || "—"}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-700 tabular-nums">{c.streitwert ? `${(c.streitwert / 1000).toFixed(0)}k€` : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${(c.prognose || 0) >= 65 ? "bg-green-500" : (c.prognose || 0) >= 40 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${c.prognose || 0}%` }} />
                          </div>
                          <span className="text-xs font-medium text-slate-700 tabular-nums">{c.prognose || 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                          c.status === "Aktiv" ? "bg-blue-50 text-blue-700" :
                          c.status === "Abgeschlossen" ? "bg-green-50 text-green-700" :
                          c.status === "Vorbereitung" ? "bg-amber-50 text-amber-700" :
                          "bg-slate-100 text-slate-500"}`}>{c.status || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-slate-400 tabular-nums whitespace-nowrap">
                        {c.updated_date ? new Date(c.updated_date).toLocaleDateString(language === "EN" ? "en-US" : language === "FR" ? "fr-FR" : "de-DE") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {nextDl ? (
                          <span className={`text-[10px] font-medium tabular-nums ${dlDays !== null && dlDays <= 7 ? "text-red-600" : dlDays !== null && dlDays <= 14 ? "text-amber-600" : "text-slate-500"}`}>
                            {new Date(nextDl.due_date).toLocaleDateString(language === "EN" ? "en-US" : language === "FR" ? "fr-FR" : "de-DE")}
                          </span>
                        ) : <span className="text-[10px] text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3"><ChevronRight className="w-3.5 h-3.5 text-slate-300" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}