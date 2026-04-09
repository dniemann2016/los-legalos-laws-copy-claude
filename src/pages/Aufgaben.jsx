import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Plus, X, CheckCircle2, Circle, Clock, AlertTriangle, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { getTByLanguage } from "../lib/jurisdictionConfig";
import { useUserProfile } from "../hooks/useUserProfile";

const PRIORITY_CONFIG = {
  hoch:    { label: { DE: "Hoch",   EN: "High",   FR: "Élevée"  }, color: "bg-red-100 text-red-700 ring-red-200" },
  mittel:  { label: { DE: "Mittel", EN: "Medium", FR: "Moyenne" }, color: "bg-amber-100 text-amber-700 ring-amber-200" },
  niedrig: { label: { DE: "Niedrig",EN: "Low",    FR: "Faible"  }, color: "bg-green-100 text-green-700 ring-green-200" },
};

const STATUS_CONFIG = {
  offen:          { label: { DE: "Offen",        EN: "Open",        FR: "Ouvert"       }, icon: Circle },
  in_bearbeitung: { label: { DE: "In Bearbeitung",EN: "In Progress", FR: "En cours"     }, icon: Clock },
  erledigt:       { label: { DE: "Erledigt",     EN: "Done",        FR: "Terminé"      }, icon: CheckCircle2 },
};

const EMPTY = { title: "", case_id: "", case_name: "", notes: "", assignee: "", due_date: "", priority: "mittel", status: "offen" };

export default function Aufgaben() {
  const { language } = useUserProfile();
  const t = getTByLanguage(language);
  const lang = language || "DE";

  const [tasks, setTasks] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("alle");
  const [filterPriority, setFilterPriority] = useState("alle");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [ts, cs] = await Promise.all([
      base44.entities.Task.list("-created_date"),
      base44.entities.Case.list("-updated_date", 100),
    ]);
    setTasks(ts);
    setCases(cs);
    setLoading(false);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    const selectedCase = cases.find(c => c.id === form.case_id);
    const data = { ...form, case_name: selectedCase?.fallname || form.case_name };
    if (editing) {
      await base44.entities.Task.update(editing, data);
    } else {
      await base44.entities.Task.create(data);
    }
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY);
    loadData();
  };

  const toggleStatus = async (task) => {
    const next = task.status === "offen" ? "in_bearbeitung" : task.status === "in_bearbeitung" ? "erledigt" : "offen";
    await base44.entities.Task.update(task.id, { status: next });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
  };

  const deleteTask = async (id) => {
    await base44.entities.Task.delete(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const openEdit = (task) => {
    setForm({ ...EMPTY, ...task });
    setEditing(task.id);
    setShowForm(true);
  };

  const filtered = tasks.filter(t => {
    const matchSearch = !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.case_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.assignee?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "alle" || t.status === filterStatus;
    const matchPriority = filterPriority === "alle" || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const openCount = tasks.filter(t => t.status !== "erledigt").length;
  const overdueCount = tasks.filter(t => t.status !== "erledigt" && t.due_date && new Date(t.due_date) < new Date()).length;

  const getDaysLabel = (due_date, status) => {
    if (status === "erledigt") return null;
    if (!due_date) return null;
    const days = Math.ceil((new Date(due_date) - new Date()) / 86400000);
    if (days < 0) return { label: lang === "EN" ? `${Math.abs(days)}d overdue` : `${Math.abs(days)}T überfällig`, cls: "text-red-600 font-semibold" };
    if (days === 0) return { label: t.todayLabel, cls: "text-red-600 font-semibold" };
    if (days === 1) return { label: t.tomorrowLabel, cls: "text-amber-600 font-semibold" };
    return { label: t.inDaysLabel(days), cls: "text-slate-500" };
  };

  const titleLabel = lang === "EN" ? "Tasks" : lang === "FR" ? "Tâches" : "Aufgaben";
  const newTaskLabel = lang === "EN" ? "+ Task" : lang === "FR" ? "+ Tâche" : "+ Aufgabe";
  const searchPlaceholder = lang === "EN" ? "Search tasks…" : lang === "FR" ? "Rechercher…" : "Aufgaben suchen…";
  const titlePlaceholder = lang === "EN" ? "Task title *" : lang === "FR" ? "Titre de la tâche *" : "Aufgabe *";
  const notesPlaceholder = lang === "EN" ? "Notes…" : lang === "FR" ? "Notes…" : "Notizen…";
  const assigneePlaceholder = lang === "EN" ? "Assignee (email)" : lang === "FR" ? "Responsable (email)" : "Zuständig (E-Mail)";
  const dueDateLabel = lang === "EN" ? "Due Date" : lang === "FR" ? "Date limite" : "Fälligkeit";
  const priorityLabel = lang === "EN" ? "Priority" : lang === "FR" ? "Priorité" : "Priorität";
  const statusLabel = lang === "EN" ? "Status" : lang === "FR" ? "Statut" : "Status";
  const caseLabel = lang === "EN" ? "Linked Case" : lang === "FR" ? "Dossier lié" : "Verknüpfter Fall";
  const noTasksLabel = lang === "EN" ? "No tasks found" : lang === "FR" ? "Aucune tâche" : "Keine Aufgaben gefunden";
  const openLabel = lang === "EN" ? "open" : lang === "FR" ? "ouvertes" : "offen";
  const overdueLabel = lang === "EN" ? "overdue" : lang === "FR" ? "en retard" : "überfällig";
  const allLabel = lang === "EN" ? "All" : lang === "FR" ? "Tout" : "Alle";

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/cockpit" className="text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-slate-900">{titleLabel}</h1>
            <p className="text-[11px] text-slate-400">{openCount} {openLabel} · {overdueCount} {overdueLabel}</p>
          </div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50 focus:outline-none focus:border-slate-400 w-48"
          />
          <button onClick={() => { setShowForm(true); setEditing(null); setForm(EMPTY); }}
            className="flex items-center gap-1.5 bg-[#1a3560] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#142a4d] transition-colors">
            <Plus className="w-3.5 h-3.5" /> {newTaskLabel}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["alle", "offen", "in_bearbeitung", "erledigt"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${filterStatus === s ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"}`}>
              {s === "alle" ? allLabel : STATUS_CONFIG[s]?.label[lang] || s}
            </button>
          ))}
          <div className="w-px bg-slate-200 mx-1" />
          {["alle", "hoch", "mittel", "niedrig"].map(p => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${filterPriority === p ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"}`}>
              {p === "alle" ? allLabel : PRIORITY_CONFIG[p]?.label[lang] || p}
            </button>
          ))}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 text-sm">{editing ? (lang === "EN" ? "Edit Task" : "Aufgabe bearbeiten") : (lang === "EN" ? "New Task" : "Neue Aufgabe")}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }} className="text-slate-400 hover:text-slate-700 p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="col-span-2 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-slate-400"
                placeholder={titlePlaceholder} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />

              <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-slate-400"
                value={form.case_id} onChange={e => setForm({ ...form, case_id: e.target.value })}>
                <option value="">– {caseLabel} –</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.fallname}</option>)}
              </select>

              <input type="text" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-slate-400"
                placeholder={assigneePlaceholder} value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} />

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 pl-1">{dueDateLabel}</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-slate-400"
                  value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 pl-1">{priorityLabel}</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"
                    value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    {["hoch", "mittel", "niedrig"].map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label[lang]}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 pl-1">{statusLabel}</label>
                  <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"
                    value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {["offen", "in_bearbeitung", "erledigt"].map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label[lang]}</option>)}
                  </select>
                </div>
              </div>

              <textarea className="col-span-2 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-slate-400 resize-none"
                rows={2} placeholder={notesPlaceholder} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={save} className="flex-1 bg-[#1a3560] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#142a4d] transition-colors">{t.saveBtn}</button>
              <button onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50">{t.cancelBtn}</button>
            </div>
          </div>
        )}

        {/* Task list */}
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">{noTasksLabel}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(task => {
              const StatusIcon = STATUS_CONFIG[task.status]?.icon || Circle;
              const dayInfo = getDaysLabel(task.due_date, task.status);
              const isDone = task.status === "erledigt";
              return (
                <div key={task.id} className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-all ${isDone ? "border-slate-100 opacity-60" : "border-slate-200"}`}>
                  <button onClick={() => toggleStatus(task)} className="flex-shrink-0 text-slate-400 hover:text-slate-700 transition-colors">
                    <StatusIcon className={`w-5 h-5 ${task.status === "erledigt" ? "text-green-500" : task.status === "in_bearbeitung" ? "text-blue-500" : "text-slate-300"}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}>{task.title}</p>
                      {task.priority && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ring-1 font-medium ${PRIORITY_CONFIG[task.priority]?.color}`}>
                          {PRIORITY_CONFIG[task.priority]?.label[lang]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {task.case_name && <span className="text-[10px] text-slate-400">{task.case_name}</span>}
                      {task.assignee && <span className="text-[10px] text-slate-400">· {task.assignee}</span>}
                      {task.notes && <span className="text-[10px] text-slate-300 truncate max-w-[200px]">· {task.notes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {dayInfo && <span className={`text-[11px] ${dayInfo.cls}`}>{dayInfo.label}</span>}
                    <button onClick={() => openEdit(task)} className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors px-1">{lang === "EN" ? "Edit" : "Edit"}</button>
                    <button onClick={() => deleteTask(task.id)} className="text-[11px] text-slate-300 hover:text-red-500 transition-colors">×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}