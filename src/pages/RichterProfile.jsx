import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Edit, Trash2, X, ArrowLeft, Link, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import RichterDetail from "../components/richter/RichterDetail";

const STILE = ["Neutral","Kooperativ","Streng","Prozessaktiv","Vergleichsorientiert"];
const KATEGORIEN = ["Richter","Anwalt","Kanzlei","Zeuge","Sachverständiger","Partei","Sonstiges"];
const EMPTY = { name:"", gericht:"", kammer:"", rechtsgebiet:"", kategorie:"Richter", klaeger_rate:50, vergleich_rate:30, durchschnitt_dauer_monate:12, urteile_gesamt:0, stil:"Neutral", bekannt_fuer:"", notizen:"" };
const KAT_ICONS = { Richter:"⚖️", Anwalt:"👔", Kanzlei:"🏛️", Zeuge:"👁️", Sachverständiger:"🔬", Partei:"🏢", Sonstiges:"📋" };
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
  const [katFilter, setKatFilter] = useState("Alle");

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

  const filtered = profiles.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.gericht?.toLowerCase().includes(search.toLowerCase());
    const matchKat = katFilter === "Alle" || (p.kategorie || "Richter") === katFilter;
    return matchSearch && matchKat;
  });

  const ProfileForm = () => (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">{editing ? "Profil bearbeiten" : "Neues Profil"}</h3>
      <div className="grid grid-cols-2 gap-3">
        <input className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white col-span-2" placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white" value={form.kategorie} onChange={e => setForm({ ...form, kategorie: e.target.value })}>
          {KATEGORIEN.map(k => <option key={k}>{k}</option>)}
        </select>
        <input className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white" placeholder="Gericht / Kanzlei / Institution *" value={form.gericht} onChange={e => setForm({ ...form, gericht: e.target.value })} />
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
            allProfiles={profiles}
            onBack={() => setDetailProfile(null)}
            onUpdate={handleProfileUpdate}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/modules")} className="text-slate-400 hover:text-slate-700 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex-1">
            <h1 className="text-sm font-bold text-slate-900">Prozessbeteiligte</h1>
            <p className="text-[11px] text-slate-400">{profiles.length} Profile · Richter, Anwälte, Kanzleien & mehr</p>
          </div>
          <input placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-40 bg-slate-50 focus:outline-none focus:border-slate-400" />
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(EMPTY); }}
            className="flex items-center gap-1.5 bg-[#1a3560] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#142a4d] transition-colors">
            <Plus className="w-3.5 h-3.5" /> Profil
          </button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {showForm && !editing && <div className="mb-5"><ProfileForm /></div>}

        {/* Kategorie-Filter */}
        <div className="flex gap-2 flex-wrap mb-5">
          {["Alle", ...KATEGORIEN].map(k => (
            <button key={k} onClick={() => setKatFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                katFilter === k ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-400"
              }`}>
              {k !== "Alle" && KAT_ICONS[k] + " "}{k}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm font-medium text-slate-700 mb-1">Noch keine Richterprofile</p>
            <p className="text-xs text-slate-400">Klicken Sie auf „+ Richter“ um ein Profil anzulegen</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-100 p-5 hover:border-slate-200 hover:shadow-sm transition-all">
                {editing === p.id ? <ProfileForm /> : (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{KAT_ICONS[p.kategorie || "Richter"]}</span>
                            <h3 className="font-semibold text-slate-900 text-sm">{p.name}</h3>
                          </div>
                          {p.stil && <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${STIL_COLOR[p.stil] || "bg-slate-100 text-slate-600"}`}>{p.stil}</span>}
                        </div>
                        <p className="text-xs text-slate-500">{p.gericht}{p.kammer ? ` · ${p.kammer}` : ""}</p>
                        {p.rechtsgebiet && <p className="text-[10px] text-slate-400 mt-0.5">{p.rechtsgebiet}</p>}
                      </div>
                      <div className="flex gap-0.5 items-center">
                        <button onClick={() => startEdit(p)} className="text-slate-300 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => del(p.id)} className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="space-y-2.5 mb-4">
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">Klägerquote</p>
                        <GaugeBar value={p.klaeger_rate || 0} color="bg-blue-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">Vergleichsrate</p>
                        <GaugeBar value={p.vergleich_rate || 0} color="bg-violet-500" />
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500 mb-3 pt-3 border-t border-slate-50">
                      {p.durchschnitt_dauer_monate > 0 && <span><strong className="text-slate-800">{p.durchschnitt_dauer_monate}</strong> Mo. Ø</span>}
                      {p.urteile_gesamt > 0 && <span><strong className="text-slate-800">{p.urteile_gesamt}</strong> Urteile</span>}
                      {(p.erfahrungen || []).length > 0 && <span><strong className="text-slate-800">{p.erfahrungen.length}</strong> Erfahrungen</span>}
                    </div>
                    {p.bekannt_fuer && <p className="text-[11px] text-slate-400 italic mb-3">"{p.bekannt_fuer}"</p>}
                    <div className="flex items-center justify-between">
                      <div>
                        {linkingId === p.id ? (
                          <div className="flex gap-2">
                            <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50" value={selectedCase} onChange={e => setSelectedCase(e.target.value)}>
                              <option value="">Fall auswählen...</option>
                              {cases.map(c => <option key={c.id} value={c.id}>{c.fallname}</option>)}
                            </select>
                            <button onClick={() => linkToCase(p.id)} className="text-xs bg-[#1a3560] text-white px-2 py-1.5 rounded-lg hover:bg-[#142a4d]">✓</button>
                            <button onClick={() => { setLinkingId(null); setSelectedCase(""); }} className="text-xs text-slate-400 hover:text-slate-600 px-1"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setLinkingId(p.id)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-700 transition-colors">
                            <Link className="w-3 h-3" /> Mit Fall verknüpfen
                          </button>
                        )}
                      </div>
                      <button onClick={() => setDetailProfile(p)} className="flex items-center gap-1 text-[11px] font-semibold text-[#1a3560] hover:opacity-70 transition-opacity">
                        Details & KI <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {(() => {
                      const linked = cases.filter(c => c.richter_name === p.name);
                      return linked.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {linked.map(c => <span key={c.id} className="text-[10px] bg-slate-100 text-slate-600 rounded-md px-2 py-0.5">{c.fallname}</span>)}
                        </div>
                      ) : null;
                    })()}
                    {p.ki_analyse && <p className="text-[10px] text-violet-500 font-medium mt-2">✓ KI-Analyse vorhanden</p>}
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