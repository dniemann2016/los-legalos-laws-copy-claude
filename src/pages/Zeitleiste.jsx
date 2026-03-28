import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Calendar, AlertTriangle, Clock, Check } from "lucide-react";
import { Link } from "react-router-dom";

function getStatusColor(deadline) {
  if (deadline.status === "erledigt") return "bg-green-100 text-green-700 border-green-200";
  if (deadline.status === "versaeumt") return "bg-red-100 text-red-700 border-red-200";
  const days = Math.ceil((new Date(deadline.due_date) - new Date()) / 86400000);
  if (days < 0) return "bg-red-100 text-red-700 border-red-200";
  if (days <= 7) return "bg-orange-100 text-orange-700 border-orange-200";
  if (days <= 30) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function getDaysLabel(due_date, status) {
  if (status === "erledigt") return "Erledigt";
  if (status === "versaeumt") return "Versäumt";
  const days = Math.ceil((new Date(due_date) - new Date()) / 86400000);
  if (days < 0) return `${Math.abs(days)}d überfällig`;
  if (days === 0) return "Heute";
  if (days === 1) return "Morgen";
  return `in ${days} Tagen`;
}

function getStatusIcon(deadline) {
  if (deadline.status === "erledigt") return <Check className="w-3.5 h-3.5" />;
  const days = Math.ceil((new Date(deadline.due_date) - new Date()) / 86400000);
  if (days <= 7) return <AlertTriangle className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
}

export default function Zeitleiste() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("alle");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [deadlines, cases] = await Promise.all([
      base44.entities.Deadline.list("due_date"),
      base44.entities.Case.list(),
    ]);
    const caseMap = {};
    cases.forEach(c => { caseMap[c.id] = c.fallname; });
    const enriched = deadlines.map(d => ({ ...d, caseName: caseMap[d.case_id] || "Unbekannter Fall" }));
    setItems(enriched);
    setLoading(false);
  };

  const filtered = items.filter(d => {
    if (filter === "offen") return d.status === "offen";
    if (filter === "kritisch") {
      const days = Math.ceil((new Date(d.due_date) - new Date()) / 86400000);
      return d.status === "offen" && days <= 14;
    }
    if (filter === "erledigt") return d.status === "erledigt";
    return true;
  });

  // Group by month
  const grouped = {};
  filtered.forEach(d => {
    const date = new Date(d.due_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    if (!grouped[key]) grouped[key] = { label, items: [] };
    grouped[key].items.push(d);
  });

  const openCount = items.filter(d => d.status === "offen").length;
  const criticalCount = items.filter(d => {
    const days = Math.ceil((new Date(d.due_date) - new Date()) / 86400000);
    return d.status === "offen" && days <= 14;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Link to="/lexara" className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm">
              <ArrowLeft className="w-4 h-4" /> Zurück
            </Link>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Fristen-Zeitleiste
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">{openCount} offen · {criticalCount} kritisch (≤14 Tage)</p>
            </div>
            <div className="flex gap-1">
              {["alle", "offen", "kritisch", "erledigt"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                    ${filter === f ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  {f === "kritisch" ? "⚠ Kritisch" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Keine Fristen gefunden</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([key, group]) => (
              <div key={key}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">{group.label}</h3>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="space-y-3 pl-10">
                    {group.items.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).map(d => {
                      const colorClass = getStatusColor(d);
                      return (
                        <div key={d.id} className="relative">
                          <div className={`absolute -left-6 top-3 w-3 h-3 rounded-full border-2 border-white ring-2 ${
                            d.status === "erledigt" ? "bg-green-500 ring-green-200" :
                            Math.ceil((new Date(d.due_date) - new Date()) / 86400000) <= 7 ? "bg-red-500 ring-red-200" :
                            Math.ceil((new Date(d.due_date) - new Date()) / 86400000) <= 30 ? "bg-orange-400 ring-orange-200" :
                            "bg-gray-400 ring-gray-200"
                          }`} />
                          <div className="bg-white border border-gray-100 rounded-xl p-3 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 leading-tight">{d.title}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{d.caseName}</p>
                                {d.frist_type && <p className="text-[10px] text-gray-400">{d.frist_type}{d.paragraph ? ` · ${d.paragraph}` : ""}</p>}
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${colorClass}`}>
                                  {getStatusIcon(d)}
                                  {getDaysLabel(d.due_date, d.status)}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(d.due_date).toLocaleDateString("de-DE")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}