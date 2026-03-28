import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Plus, X, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function PrognoseCircle({ value = 0 }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="26" cy="26" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="#1f2937" strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x="26" y="26" dominantBaseline="central" textAnchor="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "26px 26px", fontSize: 11, fontWeight: 600, fill: "#111827" }}>
        {Math.round(value)}
      </text>
    </svg>
  );
}

function CaseCard({ caseData, args, evidence, persons, deadlines }) {
  const navigate = useNavigate();
  const statusColors = { Aktiv: "bg-green-100 text-green-700", Vorbereitung: "bg-blue-100 text-blue-700", Abgeschlossen: "bg-gray-100 text-gray-600", Ruhend: "bg-yellow-100 text-yellow-700" };
  const total = 9;
  const done = [caseData.fallname, caseData.gericht, caseData.zentrale_rechtsfrage, args>0, evidence>0, persons>0, deadlines>0, caseData.prognose, caseData.streitwert].filter(Boolean).length;
  const pct = Math.round((done / total) * 100);

  return (
    <div onClick={() => navigate(`/lexara/case?id=${caseData.id}`)}
      className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-md cursor-pointer transition-all relative">
      <div className="absolute top-3 right-3">
        <PrognoseCircle value={caseData.prognose || 0} />
      </div>
      {caseData.aktenzeichen && <p className="text-[10px] text-gray-400 mb-1">{caseData.aktenzeichen}</p>}
      <h3 className="font-semibold text-gray-900 text-sm pr-14 leading-tight">{caseData.fallname}</h3>
      <div className="flex flex-wrap gap-1 mt-2">
        {caseData.rechtsgebiet && <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{caseData.rechtsgebiet}</span>}
        {caseData.status && <span className={`text-[10px] rounded-full px-2 py-0.5 ${statusColors[caseData.status] || "bg-gray-100 text-gray-600"}`}>{caseData.status}</span>}
        {caseData.instanz && <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{caseData.instanz}</span>}
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>Fortschritt</span><span>{done}/{total} · {pct}%</span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gray-800 rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex gap-4 mt-3 text-center">
        {[["Args",args],["Beweise",evidence],["Personen",persons],["Fristen",deadlines]].map(([l,v]) => (
          <div key={l}><p className="text-xs font-semibold text-gray-800">{v}</p><p className="text-[10px] text-gray-400">{l}</p></div>
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Link to="/modules" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Fallübersicht</h1>
            <p className="text-sm text-gray-500">Wählen Sie einen Fall oder erstelle einen neuen</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Fall suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-52 h-9 text-sm rounded-xl border-gray-200" />
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-gray-900 text-white hover:bg-gray-800 rounded-xl w-9 h-9 p-0">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {showCreate && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Neuer Fall</h2>
                <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Fallname *" value={newCase.fallname} onChange={e => setNewCase({...newCase, fallname: e.target.value})} />
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Aktenzeichen" value={newCase.aktenzeichen} onChange={e => setNewCase({...newCase, aktenzeichen: e.target.value})} />
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Rechtsgebiet" value={newCase.rechtsgebiet} onChange={e => setNewCase({...newCase, rechtsgebiet: e.target.value})} />
                <div className="flex gap-2">
                  <select className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" value={newCase.status} onChange={e => setNewCase({...newCase, status: e.target.value})}>
                    {["Aktiv","Vorbereitung","Abgeschlossen","Ruhend"].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" value={newCase.instanz} onChange={e => setNewCase({...newCase, instanz: e.target.value})}>
                    {["Erstinstanz","Berufung","Revision"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleCreate} className="flex-1 bg-gray-900 text-white rounded-xl">Fall erstellen</Button>
                <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl">Abbrechen</Button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
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
              <div className="col-span-3 text-center py-16 text-gray-400">
                <p className="text-lg mb-2">Noch keine Fälle</p>
                <p className="text-sm">Klicke auf + um einen neuen Fall zu erstellen</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}