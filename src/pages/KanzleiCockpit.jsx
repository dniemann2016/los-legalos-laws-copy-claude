import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, TrendingUp, Clock, Scale, DollarSign, ChevronRight, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

function RisikoAmpel({ level }) {
  const map = { niedrig: "bg-green-500", mittel: "bg-amber-400", hoch: "bg-red-500" };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${map[level] || "bg-gray-300"}`} />;
}

function StatCard({ icon, label, value, sub, color = "text-gray-900" }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function KanzleiCockpit() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [args, setArgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Case.list("-updated_date", 100),
      base44.entities.Deadline.list("-due_date", 200),
      base44.entities.Argument.list("-created_date", 500),
    ]).then(([c, d, a]) => {
      setCases(c);
      setDeadlines(d);
      setArgs(a);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
    </div>
  );

  const aktiv = cases.filter(c => c.status === "Aktiv");
  const gesamtStreitwert = cases.reduce((s, c) => s + (c.streitwert || 0), 0);
  const avgPrognose = cases.length ? Math.round(cases.reduce((s, c) => s + (c.prognose || 0), 0) / cases.length) : 0;

  const today = new Date();
  const naechsteFristen = deadlines
    .filter(d => d.status === "offen" && new Date(d.due_date) > today)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);
  const ueberfaellig = deadlines.filter(d => d.status === "offen" && new Date(d.due_date) < today);

  const risikoVerteilung = [
    { name: "Niedrig", value: cases.filter(c => (c.prognose || 0) >= 65).length, color: "#22c55e" },
    { name: "Mittel", value: cases.filter(c => (c.prognose || 0) >= 40 && (c.prognose || 0) < 65).length, color: "#f59e0b" },
    { name: "Hoch", value: cases.filter(c => (c.prognose || 0) < 40).length, color: "#ef4444" },
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/modules" className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm">
              <ArrowLeft className="w-4 h-4" /> Module
            </Link>
            <span className="text-gray-200">·</span>
            <h1 className="font-bold text-gray-900 text-sm">Kanzlei-Cockpit</h1>
            <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">Portfolio-Übersicht</span>
          </div>
          <Link to="/lexara" className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
            + Neuer Fall
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon="⚖️" label="Aktive Fälle" value={aktiv.length} sub={`${cases.length} gesamt`} />
          <StatCard icon="💶" label="Gesamtstreitwert" value={`${(gesamtStreitwert / 1000000).toFixed(1)}M€`} sub="alle Mandate" />
          <StatCard icon="🎯" label="Ø Erfolgsprognose" value={`${avgPrognose}%`} sub="gewichtet" color={avgPrognose >= 60 ? "text-green-600" : avgPrognose >= 40 ? "text-amber-600" : "text-red-600"} />
          <StatCard icon="🚨" label="Überfällige Fristen" value={ueberfaellig.length} sub="sofort handeln" color={ueberfaellig.length > 0 ? "text-red-600" : "text-green-600"} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-600 mb-3">🔴 Risikoverteilung</p>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={risikoVerteilung} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                  {risikoVerteilung.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v + " Fälle", n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-3 mt-1">
              {risikoVerteilung.map(r => (
                <div key={r.name} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="text-[10px] text-gray-500">{r.name} ({r.value})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-600 mb-3">📂 Fälle nach Rechtsgebiet</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={rechtsgebietData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} width={100} />
                <Tooltip formatter={v => [v + " Fälle"]} />
                <Bar dataKey="value" fill="#1f2937" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hochrisiko + Chancen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-red-700 mb-3">🚨 Hochrisiko-Fälle (aktiv)</p>
            {hochrisikoFaelle.length === 0 ? (
              <p className="text-xs text-gray-400">Keine Hochrisiko-Fälle aktiv. ✓</p>
            ) : (
              <div className="space-y-2">
                {hochrisikoFaelle.map(c => (
                  <button key={c.id} onClick={() => navigate(`/lexara/case?id=${c.id}`)}
                    className="w-full flex items-center justify-between bg-white rounded-xl border border-red-100 p-3 text-left hover:border-red-300 transition-colors group">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{c.fallname}</p>
                      <p className="text-[10px] text-gray-400">{c.rechtsgebiet} · {c.gericht}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-600">{c.prognose || 0}%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-green-700 mb-3">✅ Top-Chancen</p>
            {topChancen.length === 0 ? (
              <p className="text-xs text-gray-400">Noch keine Fälle mit hoher Prognose.</p>
            ) : (
              <div className="space-y-2">
                {topChancen.map(c => (
                  <button key={c.id} onClick={() => navigate(`/lexara/case?id=${c.id}`)}
                    className="w-full flex items-center justify-between bg-white rounded-xl border border-green-100 p-3 text-left hover:border-green-300 transition-colors group">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{c.fallname}</p>
                      <p className="text-[10px] text-gray-400">{c.rechtsgebiet} · {c.streitwert ? `${(c.streitwert / 1000).toFixed(0)}k€` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-green-600">{c.prognose || 0}%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nächste Fristen */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-700">⏰ Nächste Fristen</p>
            <Link to="/zeitleiste" className="text-xs text-gray-400 hover:text-gray-600">Alle anzeigen →</Link>
          </div>
          {naechsteFristen.length === 0 ? (
            <p className="text-xs text-gray-400">Keine offenen Fristen. ✓</p>
          ) : (
            <div className="space-y-2">
              {naechsteFristen.map((d, i) => {
                const days = Math.ceil((new Date(d.due_date) - today) / 86400000);
                const c = cases.find(ca => ca.id === d.case_id);
                return (
                  <div key={i} className={`flex items-center justify-between py-2 border-b border-gray-50 last:border-0`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${days <= 3 ? "bg-red-100 text-red-600" : days <= 7 ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-600"}`}>
                        {days}T
                      </span>
                      <div>
                        <p className="text-xs font-medium text-gray-800">{d.title}</p>
                        <p className="text-[10px] text-gray-400">{c?.fallname || "Fall unbekannt"} · {d.frist_type}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(d.due_date).toLocaleDateString("de-DE")}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alle Fälle Tabelle */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-700">📋 Alle Mandate ({cases.length})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {["", "Fall", "Rechtsgebiet", "Gericht", "Streitwert", "Prognose", "Status", ""].map((h, i) => (
                    <th key={i} className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/lexara/case?id=${c.id}`)}>
                    <td className="pl-4 py-3"><RisikoAmpel level={getRisikoLevel(c)} /></td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-gray-800 max-w-[180px] truncate">{c.fallname}</p>
                      {c.aktenzeichen && <p className="text-[10px] text-gray-400">{c.aktenzeichen}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.rechtsgebiet || "–"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.gericht || "–"}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{c.streitwert ? `${(c.streitwert / 1000).toFixed(0)}k€` : "–"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${(c.prognose || 0) >= 65 ? "bg-green-500" : (c.prognose || 0) >= 40 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${c.prognose || 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-600">{c.prognose || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.status === "Aktiv" ? "bg-blue-100 text-blue-700" : c.status === "Abgeschlossen" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{c.status || "–"}</span>
                    </td>
                    <td className="px-4 py-3"><ChevronRight className="w-3.5 h-3.5 text-gray-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}