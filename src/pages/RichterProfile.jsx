import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, X, ArrowLeft, Link, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import RichterDetail from "../components/richter/RichterDetail";

const STILE = ["Neutral","Kooperativ","Streng","Prozessaktiv","Vergleichsorientiert"];
const EMPTY = { name:"", gericht:"", kammer:"", rechtsgebiet:"", klaeger_rate:50, vergleich_rate:30, durchschnitt_dauer_monate:12, urteile_gesamt:0, stil:"Neutral", bekannt_fuer:"", notizen:"" };
const STIL_COLOR = { Kooperativ:"bg-green-100 text-green-700", Streng:"bg-red-100 text-red-700", Neutral:"bg-gray-100 text-gray-600", Prozessaktiv:"bg-blue-100 text-blue-700", Vergleichsorientiert:"bg-purple-100 text-purple-700" };

function GaugeBar({ value, max = 100, color = "bg-gray-800" }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
      </div>
      <span className="text-xs text-gray-600 w-8 text-right">{value}%</span>
    </div>
  );
}

export default function RichterProfile() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [linkingId, setLinkingId] = useState(null);
  const [selectedCase, setSelectedCase] = useState("");
  const [detailProfile, setDetailProfile] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([
      base44.entities.JudgeProfile.list("-created_date"),
      base44.entities.Case.list("-created_date"),
    ]);
    setProfiles(p);
    setCases(c);
    setLoading(false);
  };

  const save = async () => {
    if (!form.name.trim() || !form.gericht.trim()) return;
    if (editing) { await base44.entities.JudgeProfile.update(editing, form); setEditing(null); }
    else { await base44.entities.JudgeProfile.create(form); }
    setForm(EMPTY);
    setShowForm(false);
    load();
  };

  const del = async (id) => { await base44.entities.JudgeProfile.delete(id); load(); };

  const startEdit = (p) => {
    setForm({ name:p.name||"", gericht:p.gericht||"", kammer:p.kammer||"", rechtsgebiet:p.rechtsgebiet||"", klaeger_rate:p.klaeger_rate||50, vergleich_rate:p.vergleich_rate||30, durchschnitt_dauer_monate:p.durchschnitt_dauer_monate||12, urteile_gesamt:p.urteile_gesamt||0, stil:p.stil||"Neutral", bekannt_fuer:p.bekannt_fuer||"", notizen:p.notizen||"" });
    setEditing(p.id);
    setShowForm(true);
  };

  const handleProfileUpdate = (updated) => {
    setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (detailProfile?.id === updated.id) setDetailProfile(updated);
  };

  const linkToCase = async (profileId) => {
    if (!selectedCase) return;
    const caseData = cases.find(c => c.id === selectedCase);
    if (!caseData) return;
    const profile = profiles.find(p => p.id === profileId);
    await base44.entities.Case.update(selectedCase, {
      richter_name: profile.name,
      richter_klaeger_rate: profile.klaeger_rate,
    });
    setLinkingId(null);
    setSelectedCase("");
    load();
  };

  const filtered = profiles.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.gericht?.toLowerCase().includes(search.toLowerCase())
  );

  const ProfileForm = () => (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">{editing ? "Profil bearbeiten" : "Neues Richterprofil"}</h3>
      <div className="grid grid-cols-2 gap-3">
        <input className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white col-span-2" placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white" placeholder="Gericht *" value={form.gericht} onChange={e => setForm({ ...form, gericht: e.target.value })} />
        <input className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white" placeholder="Kammer / Senat" value={form.kammer} onChange={e => setForm({ ...form, kammer: e.target.value })} />
        <input className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white" placeholder="Rechtsgebiet" value={form.rechtsgebiet} onChange={e => setForm({ ...form, rechtsgebiet: e.target.value })} />
        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white" value={form.stil} onChange={e => setForm({ ...form, stil: e.target.value })}>
          {STILE.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[["Klägerquote %","klaeger_rate"],["Vergleichsrate %","vergleich_rate"],["Ø Dauer (Mo.)","durchschnitt_dauer_monate"],["Urteile gesamt","urteile_gesamt"]].map(([l,f]) => (
          <div key={f}>
            <label className="text-[10px] text-gray-400 block mb-1">{l}</label>
            <input type="number" className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs bg-white" value={form[f]} onChange={e => setForm({ ...form, [f]: +e.target.value })} />
          </div>
        ))}
      </div>
      <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white" placeholder="Bekannt für..." value={form.bekannt_fuer} onChange={e => setForm({ ...form, bekannt_fuer: e.target.value })} />
      <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white" placeholder="Notizen" rows={2} value={form.notizen} onChange={e => setForm({ ...form, notizen: e.target.value })} />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} className="bg-gray-900 text-white rounded-xl text-xs">{editing ? "Aktualisieren" : "Erstellen"}</Button>
        <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }} className="rounded-xl text-xs">Abbrechen</Button>
      </div>
    </div>
  );

  if (detailProfile) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <RichterDetail
            profile={detailProfile}
            cases={cases}
            onBack={() => setDetailProfile(null)}
            onUpdate={handleProfileUpdate}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button onClick={() => navigate("/modules")} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Richterprofile</h1>
            <p className="text-sm text-gray-500">Erfahrungen dokumentieren · KI-Taktikanalyse</p>
          </div>
          <input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-48" />
          <Button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(EMPTY); }} className="bg-gray-900 text-white rounded-xl gap-1 h-9 text-sm">
            <Plus className="w-4 h-4" /> Richter
          </Button>
        </div>

        {showForm && !editing && <div className="mb-4"><ProfileForm /></div>}

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-1">Noch keine Richterprofile</p>
            <p className="text-sm">Klicken Sie auf „+ Richter" um ein Profil anzulegen</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-all">
                {editing === p.id ? <ProfileForm /> : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-gray-900">{p.name}</h3>
                          {p.stil && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STIL_COLOR[p.stil] || "bg-gray-100 text-gray-600"}`}>{p.stil}</span>}
                        </div>
                        <p className="text-xs text-gray-500">{p.gericht}{p.kammer ? ` · ${p.kammer}` : ""}</p>
                        {p.rechtsgebiet && <p className="text-[10px] text-gray-400">{p.rechtsgebiet}</p>}
                      </div>
                      <div className="flex gap-1 items-center">
                        <button onClick={() => startEdit(p)} className="text-gray-300 hover:text-blue-500 p-1"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => del(p.id)} className="text-gray-300 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Klägerquote</p>
                        <GaugeBar value={p.klaeger_rate || 0} color="bg-blue-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 mb-0.5">Vergleichsrate</p>
                        <GaugeBar value={p.vergleich_rate || 0} color="bg-purple-500" />
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 mb-3">
                      {p.durchschnitt_dauer_monate > 0 && <span><strong className="text-gray-700">{p.durchschnitt_dauer_monate}</strong> Mo. Ø</span>}
                      {p.urteile_gesamt > 0 && <span><strong className="text-gray-700">{p.urteile_gesamt}</strong> Urteile</span>}
                      {(p.erfahrungen || []).length > 0 && <span><strong className="text-gray-700">{p.erfahrungen.length}</strong> Erfahrungen</span>}
                    </div>
                    {p.bekannt_fuer && <p className="text-xs text-gray-400 italic mb-3">"{p.bekannt_fuer}"</p>}
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        {linkingId === p.id ? (
                          <div className="flex gap-2">
                            <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" value={selectedCase} onChange={e => setSelectedCase(e.target.value)}>
                              <option value="">Fall auswählen...</option>
                              {cases.map(c => <option key={c.id} value={c.id}>{c.fallname}</option>)}
                            </select>
                            <button onClick={() => linkToCase(p.id)} className="text-xs bg-gray-900 text-white px-2 py-1.5 rounded-lg hover:bg-gray-700">✓</button>
                            <button onClick={() => { setLinkingId(null); setSelectedCase(""); }} className="text-xs text-gray-400 hover:text-gray-600 px-1"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setLinkingId(p.id)} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 transition-colors">
                            <Link className="w-3 h-3" /> Mit Fall verknüpfen
                          </button>
                        )}
                      </div>
                      <button onClick={() => setDetailProfile(p)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 font-medium transition-colors">
                        Details & KI <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {(() => {
                      const linked = cases.filter(c => c.richter_name === p.name);
                      return linked.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {linked.map(c => <span key={c.id} className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{c.fallname}</span>)}
                        </div>
                      ) : null;
                    })()}
                    {p.ki_analyse && <p className="text-[10px] text-purple-500 mt-2">✓ KI-Analyse vorhanden</p>}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}