import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Plus, X, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";

function PrognoseCircle({ value = 0 }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 70 ? "#16a34a" : value >= 40 ? "#d97706" : "#dc2626";
  return (
    <svg width="46" height="46" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="23" cy="23" r={r} fill="none" stroke="#f1f5f9" strokeWidth="3" />
      <circle cx="23" cy="23" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x="23" y="23" dominantBaseline="central" textAnchor="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "23px 23px", fontSize: 10, fontWeight: 700, fill: color }}>
        {Math.round(value)}
      </text>
    </svg>
  );
}

function CaseCard({ caseData, args, evidence, persons, deadlines }) {
  const navigate = useNavigate();
  const statusColors = {
    Aktiv: "bg-green-50 text-green-700 ring-1 ring-green-200",
    Vorbereitung: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    Abgeschlossen: "bg-slate-100 text-slate-500",
    Ruhend: "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  };
  const total = 9;
  const done = [caseData.fallname, caseData.gericht, caseData.zentrale_rechtsfrage, args > 0, evidence > 0, persons > 0, deadlines > 0, caseData.prognose, caseData.streitwert].filter(Boolean).length;
  const pct = Math.round((done / total) * 100);
  const pctColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-slate-300";

  return (
    <div onClick={() => navigate(`/lexara/case?id=${caseData.id}`)}
      className="bg-white rounded-xl border border-slate-100 p-5 hover:border-slate-200 hover:shadow-md cursor-pointer transition-all duration-150 group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {caseData.aktenzeichen && <p className="text-[10px] text-slate-400 font-mono mb-1">{caseData.aktenzeichen}</p>}
          <h3 className="font-semibold text-slate-900 text-sm leading-snug">{caseData.fallname}</h3>
        </div>
        <PrognoseCircle value={caseData.prognose || 0} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {caseData.rechtsgebiet && <span className="text-[10px] bg-slate-50 text-slate-500 rounded-md px-2 py-0.5 border border-slate-100">{caseData.rechtsgebiet}</span>}
        {caseData.status && <span className={`text-[10px] rounded-md px-2 py-0.5 font-medium ${statusColors[caseData.status] || "bg-slate-100 text-slate-600"}`}>{caseData.status}</span>}
        {caseData.instanz && <span className="text-[10px] bg-slate-50 text-slate-500 rounded-md px-2 py-0.5 border border-slate-100">{caseData.instanz}</span>}
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
          <span>Fortschritt</span><span>{done}/{total} Schritte</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pctColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-50">
        {[["Args", args], ["Beweise", evidence], ["Personen", persons], ["Fristen", deadlines]].map(([l, v]) => (
          <div key={l} className="text-center">
            <p className="text-sm font-bold text-slate-800">{v}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wide mt-0.5">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LexaraDashboard() {
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCase, setNewCase] = useState({ fallname: "", aktenzeichen: "", rechtsgebiet: "", status: "Aktiv", instanz: "Erstinstanz" });
  const [caseCounts, setCaseCounts] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [cs, args, evs, pers, deadlines] = await Promise.all([
      base44.entities.Case.list("-created_date"),
      base44.entities.Argument.list(),
      base44.entities.Evidence.list(),
      base44.entities.Person.list(),
      base44.entities.Deadline.list(),
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
    await base44.entities.Case.create(newCase);
    setNewCase({ fallname: "", aktenzeichen: "", rechtsgebiet: "", status: "Aktiv", instanz: "Erstinstanz" });
    setShowCreate(false);
    loadData();
  };

  const filtered = cases.filter(c =>
    c.fallname?.toLowerCase().includes(search.toLowerCase()) ||
    c.aktenzeichen?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = cases.filter(c => c.status === "Aktiv").length;

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans">
      {/* Top bar */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/modules" className="text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-slate-900">Fallübersicht</h1>
            <p className="text-[11px] text-slate-400">{cases.length} Mandate · {activeCount} aktiv</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Fall suchen…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 w-48 h-8 text-sm rounded-lg border-slate-200 bg-slate-50" />
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-[#1a3560] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#142a4d] transition-colors">
            <Plus className="w-3.5 h-3.5" /> Neuer Fall
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {showCreate && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-slate-900">Neuen Fall anlegen</h2>
                <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700 p-1"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-slate-400" placeholder="Fallname *" value={newCase.fallname} onChange={e => setNewCase({ ...newCase, fallname: e.target.value })} />
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-slate-400" placeholder="Aktenzeichen" value={newCase.aktenzeichen} onChange={e => setNewCase({ ...newCase, aktenzeichen: e.target.value })} />
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-slate-400" placeholder="Rechtsgebiet" value={newCase.rechtsgebiet} onChange={e => setNewCase({ ...newCase, rechtsgebiet: e.target.value })} />
                <div className="flex gap-2">
                  <select className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50" value={newCase.status} onChange={e => setNewCase({ ...newCase, status: e.target.value })}>
                    {["Aktiv", "Vorbereitung", "Abgeschlossen", "Ruhend"].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50" value={newCase.instanz} onChange={e => setNewCase({ ...newCase, instanz: e.target.value })}>
                    {["Erstinstanz", "Berufung", "Revision"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={handleCreate} className="flex-1 bg-[#1a3560] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#142a4d] transition-colors">Fall erstellen</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors">Abbrechen</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => (
              <CaseCard key={c.id} caseData={c}
                args={caseCounts[c.id]?.args || 0}
                evidence={caseCounts[c.id]?.evidence || 0}
                persons={caseCounts[c.id]?.persons || 0}
                deadlines={caseCounts[c.id]?.deadlines || 0}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-24">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">Noch keine Fälle</p>
                <p className="text-xs text-slate-400">Klicke auf „Neuer Fall" um zu beginnen</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}