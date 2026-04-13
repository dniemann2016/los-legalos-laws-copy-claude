import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Plus, X, Scale, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STATUS_CONFIG = {
  Aktiv:        { text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-1 ring-emerald-200" },
  Vorbereitung: { text: "text-blue-700",    bg: "bg-blue-50",    ring: "ring-1 ring-blue-200" },
  Abgeschlossen:{ text: "text-slate-500",   bg: "bg-slate-100",  ring: "" },
  Ruhend:       { text: "text-amber-700",   bg: "bg-amber-50",   ring: "ring-1 ring-amber-200" },
};

function PrognoseArc({ value = 0 }) {
  const color = value >= 65 ? "#16a34a" : value >= 40 ? "#d97706" : "#dc2626";
  const r = 16, circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      <svg width="40" height="40" style={{ transform: "rotate(-90deg)" }} className="absolute inset-0">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#f1f5f9" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="relative text-[10px] font-bold" style={{ color }}>{Math.round(value)}</span>
    </div>
  );
}

function CaseCard({ caseData, counts }) {
  const navigate = useNavigate();
  const sc = STATUS_CONFIG[caseData.status] || STATUS_CONFIG.Aktiv;
  const total = 9;
  const done = [caseData.fallname, caseData.gericht, caseData.zentrale_rechtsfrage,
    counts.args > 0, counts.evidence > 0, counts.persons > 0,
    counts.deadlines > 0, caseData.prognose, caseData.streitwert].filter(Boolean).length;
  const pct = Math.round((done / total) * 100);

  return (
    <div onClick={() => navigate(`/lexara/case?id=${caseData.id}`)}
      className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-[#1a3560]/30 hover:shadow-xl cursor-pointer transition-all duration-200 group flex flex-col gap-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {caseData.aktenzeichen && (
            <p className="text-[10px] text-slate-400 font-mono mb-1 tracking-wider">{caseData.aktenzeichen}</p>
          )}
          <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-[#1a3560] transition-colors">
            {caseData.fallname}
          </h3>
        </div>
        <PrognoseArc value={caseData.prognose || 0} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {caseData.status && (
          <span className={`text-[10px] rounded-full px-2.5 py-0.5 font-semibold ${sc.text} ${sc.bg} ${sc.ring}`}>
            {caseData.status}
          </span>
        )}
        {caseData.rechtsgebiet && (
          <span className="text-[10px] bg-slate-50 text-slate-500 rounded-full px-2.5 py-0.5 border border-slate-100">
            {caseData.rechtsgebiet}
          </span>
        )}
        {caseData.instanz && caseData.instanz !== "Erstinstanz" && (
          <span className="text-[10px] bg-purple-50 text-purple-600 rounded-full px-2.5 py-0.5 border border-purple-100">
            {caseData.instanz}
          </span>
        )}
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
          <span>Vollständigkeit</span>
          <span className="font-medium text-slate-600">{pct}%</span>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-slate-300"}`}
            style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-50">
        {[["⚔️", counts.args, "Args"], ["📄", counts.evidence, "Beweise"], ["👤", counts.persons, "Pers."], ["⏰", counts.deadlines, "Fristen"]].map(([icon, v, l]) => (
          <div key={l} className="text-center">
            <p className="text-xs font-bold text-slate-800">{v}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LexaraDashboard() {
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCase, setNewCase] = useState({ fallname: "", aktenzeichen: "", rechtsgebiet: "", status: "Aktiv", instanz: "Erstinstanz" });
  const [caseCounts, setCaseCounts] = useState({});
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [cs, args, evs, pers, deadlines] = await Promise.all([
      base44.entities.Case.list("-created_date"),
      base44.entities.Argument.filter({}),
      base44.entities.Evidence.filter({}),
      base44.entities.Person.filter({}),
      base44.entities.Deadline.filter({}),
    ]);
    setCases(cs);
    const counts = {};
    cs.forEach(c => {
      counts[c.id] = {
        args: args.filter(a => a.case_id === c.id).length,
        evidence: evs.filter(e => e.case_id === c.id).length,
        persons: pers.filter(p => p.case_id === c.id).length,
        deadlines: deadlines.filter(d => d.case_id === c.id).length,
      };
    });
    setCaseCounts(counts);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newCase.fallname.trim()) return;
    setCreating(true);
    await base44.entities.Case.create(newCase);
    setNewCase({ fallname: "", aktenzeichen: "", rechtsgebiet: "", status: "Aktiv", instanz: "Erstinstanz" });
    setShowCreate(false);
    setCreating(false);
    loadData();
  };

  const filtered = cases.filter(c => {
    const matchSearch = c.fallname?.toLowerCase().includes(search.toLowerCase()) ||
      c.aktenzeichen?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const aktiv = cases.filter(c => c.status === "Aktiv").length;
  const avgPrognose = cases.length ? Math.round(cases.reduce((s, c) => s + (c.prognose || 0), 0) / cases.length) : 0;
  const totalArgs = Object.values(caseCounts).reduce((s, c) => s + c.args, 0);
  const totalDeadlines = Object.values(caseCounts).reduce((s, c) => s + c.deadlines, 0);

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans">
      <div className="border-b border-slate-200/70 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center gap-3">
          <div className="flex items-center gap-2.5 mr-auto">
            <div className="w-8 h-8 rounded-xl bg-[#1a3560] flex items-center justify-center shadow-md">
              <Scale className="w-[15px] h-[15px] text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-900 tracking-tight leading-none">Fallübersicht</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{cases.length} Mandate verwaltet</p>
            </div>
          </div>
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 w-44 h-8 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-slate-300 focus:bg-white transition-all" />
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-[#1a3560] text-white text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-[#142a4d] transition-colors shadow-md shadow-[#1a3560]/20">
            <Plus className="w-3.5 h-3.5" /> Neuer Fall
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {cases.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Scale className="w-4 h-4 text-blue-600" />, label: "Aktive Mandate", value: aktiv, accent: "bg-blue-50" },
              { icon: <TrendingUp className="w-4 h-4 text-emerald-600" />, label: "Ø Erfolgsquote", value: `${avgPrognose}%`, accent: "bg-emerald-50" },
              { icon: <AlertCircle className="w-4 h-4 text-violet-600" />, label: "Argumente gesamt", value: totalArgs, accent: "bg-violet-50" },
              { icon: <Clock className="w-4 h-4 text-amber-600" />, label: "Offene Fristen", value: totalDeadlines, accent: "bg-amber-50" },
            ].map((k, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 px-4 py-4 flex items-center gap-3 shadow-sm">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${k.accent}`}>{k.icon}</div>
                <div>
                  <p className="text-xl font-bold text-slate-900 leading-none tracking-tight">{k.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{k.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {["all", "Aktiv", "Vorbereitung", "Ruhend", "Abgeschlossen"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                statusFilter === s
                  ? "bg-[#1a3560] text-white border-[#1a3560] shadow-sm shadow-[#1a3560]/20"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white shadow-sm"
              }`}>
              {s === "all" ? "Alle" : s}
              {s !== "all" && <span className="ml-1.5 text-[10px] opacity-60">{cases.filter(c => c.status === s).length}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-[#1a3560] rounded-full animate-spin" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(c => (
              <CaseCard key={c.id} caseData={c} counts={caseCounts[c.id] || { args: 0, evidence: 0, persons: 0, deadlines: 0 }} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <Scale className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-800 mb-1 tracking-tight">
              {search || statusFilter !== "all" ? "Keine Treffer" : "Noch keine Fälle"}
            </p>
            <p className="text-xs text-slate-400 font-medium">
              {search || statusFilter !== "all" ? "Filter oder Suche anpassen" : "Neuer Fall Button anklicken um zu beginnen"}
            </p>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1a3560] flex items-center justify-center shadow-md">
                  <Scale className="w-[14px] h-[14px] text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm tracking-tight">Neuen Fall anlegen</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Grunddaten — alles weitere im Fall</p>
                </div>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-slate-300 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-[#1a3560] focus:bg-white transition-all"
                placeholder="Fallname *" value={newCase.fallname} onChange={e => setNewCase({ ...newCase, fallname: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleCreate()} />
              <div className="grid grid-cols-2 gap-3">
                <input className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-[#1a3560] focus:bg-white transition-all"
                  placeholder="Aktenzeichen" value={newCase.aktenzeichen} onChange={e => setNewCase({ ...newCase, aktenzeichen: e.target.value })} />
                <input className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-[#1a3560] focus:bg-white transition-all"
                  placeholder="Rechtsgebiet" value={newCase.rechtsgebiet} onChange={e => setNewCase({ ...newCase, rechtsgebiet: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-[#1a3560] transition-all"
                  value={newCase.status} onChange={e => setNewCase({ ...newCase, status: e.target.value })}>
                  {["Aktiv", "Vorbereitung", "Abgeschlossen", "Ruhend"].map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-[#1a3560] transition-all"
                  value={newCase.instanz} onChange={e => setNewCase({ ...newCase, instanz: e.target.value })}>
                  {["Erstinstanz", "Berufung", "Revision"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleCreate} disabled={!newCase.fallname.trim() || creating}
                className="flex-1 bg-[#1a3560] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#142a4d] disabled:opacity-50 transition-colors shadow-md shadow-[#1a3560]/20">
                {creating ? "Erstelle…" : "Fall erstellen"}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors">
                Abbrechen
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-300 mt-4">MachiavelLEX · DSGVO-konform · EU-Server</p>
          </div>
        </div>
      )}
    </div>
  );
}