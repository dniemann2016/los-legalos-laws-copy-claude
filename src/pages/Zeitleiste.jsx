import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, AlertTriangle, Clock, Check, Download } from "lucide-react";
import { getTByLanguage } from "../lib/jurisdictionConfig";
import { useUserProfile } from "../hooks/useUserProfile";
import { exportIcal } from "@/functions/exportIcal";

function getStatusColor(deadline) {
  if (deadline.status === "erledigt") return "bg-green-100 text-green-700 border-green-200";
  if (deadline.status === "versaeumt") return "bg-red-100 text-red-700 border-red-200";
  const days = Math.ceil((new Date(deadline.due_date) - new Date()) / 86400000);
  if (days < 0) return "bg-red-100 text-red-700 border-red-200";
  if (days <= 7) return "bg-orange-100 text-orange-700 border-orange-200";
  if (days <= 30) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-[#fafafa] text-[#666] border-[#f0f0f0]";
}

function getDaysLabel(due_date, status, t) {
  if (status === "erledigt") return t.doneStatus;
  if (status === "versaeumt") return t.missedStatus;
  const days = Math.ceil((new Date(due_date) - new Date()) / 86400000);
  if (days < 0) return t.daysOverdueLabel(Math.abs(days));
  if (days === 0) return t.todayLabel;
  if (days === 1) return t.tomorrowLabel;
  return t.inDaysLabel(days);
}

function getStatusIcon(deadline) {
  if (deadline.status === "erledigt") return <Check className="w-3.5 h-3.5" />;
  const days = Math.ceil((new Date(deadline.due_date) - new Date()) / 86400000);
  if (days <= 7) return <AlertTriangle className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
}

export default function Zeitleiste() {
  const { language } = useUserProfile();
  const t = getTByLanguage(language);
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

  const grouped = {};
  filtered.forEach(d => {
    const date = new Date(d.due_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const locale = language === "EN" ? "en-US" : language === "FR" ? "fr-FR" : "de-DE";
    const label = date.toLocaleDateString(locale, { month: "long", year: "numeric" });
    if (!grouped[key]) grouped[key] = { label, items: [] };
    grouped[key].items.push(d);
  });

  const openCount = items.filter(d => d.status === "offen").length;
  const criticalCount = items.filter(d => {
    const days = Math.ceil((new Date(d.due_date) - new Date()) / 86400000);
    return d.status === "offen" && days <= 14;
  }).length;

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      <div className="bg-white border-b border-[#f0f0f0] px-6 py-4 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-bold text-[#1a1a1a] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1a3560]" /> {t.timelineTitle}
            </h1>
            <p className="text-[11px] text-[#666] mt-0.5">{openCount} {t.openStatusLabel} · {criticalCount} {t.criticalStatusLabel}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={async () => {
                const res = await exportIcal({});
                const blob = new Blob([res.data], { type: "text/calendar" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "alle-fristen.ics"; a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-1.5 text-xs bg-white border border-[#f0f0f0] text-[#666] px-3 py-1.5 rounded-xl hover:border-slate-300 transition-all">
              <Download className="w-3.5 h-3.5" /> {t.iCalExport}
            </button>
            <div className="flex gap-1">
              {[["alle", t.filterAll], ["offen", t.filterOpen], ["kritisch", t.filterCritical], ["erledigt", t.filterCompleted]].map(([f, label]) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === f ? "bg-[#1a3560] text-white" : "bg-white border border-[#f0f0f0] text-[#666] hover:border-slate-300"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-slate-200 border-t-[#1a3560] rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#999]">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t.noDeadlinesFound}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([key, group]) => (
              <div key={key}>
                <h3 className="text-xs font-semibold text-[#999] uppercase tracking-widest mb-3">{group.label}</h3>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-[#f0f0f0]" />
                  <div className="space-y-3 pl-10">
                    {group.items.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).map(d => {
                      const colorClass = getStatusColor(d);
                      return (
                        <div key={d.id} className="relative">
                          <div className={`absolute -left-6 top-3 w-3 h-3 rounded-full border-2 border-white ring-2 ${
                            d.status === "erledigt" ? "bg-green-500 ring-green-200" :
                            Math.ceil((new Date(d.due_date) - new Date()) / 86400000) <= 7 ? "bg-red-500 ring-red-200" :
                            Math.ceil((new Date(d.due_date) - new Date()) / 86400000) <= 30 ? "bg-orange-400 ring-orange-200" :
                            "bg-slate-400 ring-slate-200"
                          }`} />
                          <div className="bg-white border border-[#f0f0f0] rounded-xl p-3 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-[#1a1a1a] leading-tight">{d.title}</p>
                                <p className="text-[10px] text-[#999] mt-0.5">{d.caseName}</p>
                                {d.frist_type && <p className="text-[10px] text-[#999]">{d.frist_type}{d.paragraph ? ` · ${d.paragraph}` : ""}</p>}
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${colorClass}`}>
                                  {getStatusIcon(d)}
                                  {getDaysLabel(d.due_date, d.status, t)}
                                </span>
                                <span className="text-[10px] text-[#999]">
                                  {new Date(d.due_date).toLocaleDateString(language === "EN" ? "en-US" : language === "FR" ? "fr-FR" : "de-DE")}
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