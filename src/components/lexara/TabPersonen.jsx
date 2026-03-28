import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLES = ["Richter","Zeuge","Sachverständiger","Partei","Anwalt","Gutachter"];
const ROLE_COLORS = { Richter:"bg-purple-100 text-purple-700", Zeuge:"bg-blue-100 text-blue-700", Sachverständiger:"bg-green-100 text-green-700", Partei:"bg-orange-100 text-orange-700", Anwalt:"bg-gray-100 text-gray-700", Gutachter:"bg-teal-100 text-teal-700" };
const EMPTY = { name:"", role:"Richter", organization:"", aussagen:0, widersprueche:0, glaubwuerdigkeit:100, klaeger_rate:50, vergleich_rate:30, dauer_monate:12, notizen:"" };

export default function TabPersonen({ caseId, onCountChange }) {
  const [persons, setPersons] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { load(); }, [caseId]);

  const load = async (notify = false) => {
    const data = await base44.entities.Person.filter({ case_id: caseId });
    setPersons(data);
    if (notify) onCountChange && onCountChange();
  };

  const save = async () => {
    if (!form.name.trim()) return;
    if (editing) { await base44.entities.Person.update(editing, form); setEditing(null); }
    else { await base44.entities.Person.create({ case_id: caseId, ...form }); setShowAdd(false); }
    setForm(EMPTY);
    load(true);
  };

  const del = async (id) => { await base44.entities.Person.delete(id); load(true); };
  const startEdit = (p) => { setForm({name:p.name||"",role:p.role||"Richter",organization:p.organization||"",aussagen:p.aussagen||0,widersprueche:p.widersprueche||0,glaubwuerdigkeit:p.glaubwuerdigkeit||100,klaeger_rate:p.klaeger_rate||50,vergleich_rate:p.vergleich_rate||30,dauer_monate:p.dauer_monate||12,notizen:p.notizen||""}); setEditing(p.id); setShowAdd(false); };

  const PersonForm = () => (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
          {ROLES.map(r=><option key={r}>{r}</option>)}
        </select>
        <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white col-span-2" placeholder="Organisation / Gericht" value={form.organization} onChange={e=>setForm({...form,organization:e.target.value})} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[["Aussagen","aussagen"],["Widersprüche","widersprueche"],["Glaubw. %","glaubwuerdigkeit"],["Kläger %","klaeger_rate"],["Vergleiche %","vergleich_rate"],["Dauer (Mo.)","dauer_monate"]].map(([l,f]) => (
          <div key={f}>
            <label className="text-[10px] text-gray-400 block mb-1">{l}</label>
            <input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white" value={form[f]} onChange={e=>setForm({...form,[f]:+e.target.value})} />
          </div>
        ))}
      </div>
      <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" placeholder="Notizen" rows={2} value={form.notizen} onChange={e=>setForm({...form,notizen:e.target.value})} />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} className="bg-gray-900 text-white rounded-lg text-xs">{editing?"Aktualisieren":"Hinzufügen"}</Button>
        <Button size="sm" variant="outline" onClick={()=>{setShowAdd(false);setEditing(null);setForm(EMPTY);}} className="rounded-lg text-xs">Abbrechen</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-sm font-semibold text-gray-700">👤 Personen</h3><p className="text-xs text-gray-400">Zeugen, Richter, Parteien</p></div>
        <Button size="sm" onClick={()=>{setShowAdd(!showAdd);setEditing(null);setForm(EMPTY);}} className="bg-gray-900 text-white rounded-xl text-xs gap-1"><Plus className="w-3 h-3" /> Person hinzufügen</Button>
      </div>
      {showAdd && !editing && <PersonForm />}
      <div className="space-y-3">
        {persons.map(p => (
          <div key={p.id}>
            {editing === p.id ? <PersonForm /> : (
              <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-all group">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[p.role]||"bg-gray-100 text-gray-600"}`}>{p.role}</span>
                      <span className="text-sm font-semibold text-gray-900">{p.name}</span>
                    </div>
                    {p.organization && <p className="text-xs text-gray-500 mb-2">{p.organization}</p>}
                    <div className="flex gap-4 text-xs text-gray-600 flex-wrap">
                      {p.aussagen > 0 && <span><strong>{p.aussagen}</strong> <span className="text-gray-400">Aussagen</span></span>}
                      {p.widersprueche > 0 && <span><strong>{p.widersprueche}</strong> <span className="text-gray-400">Widersprüche</span></span>}
                      {p.glaubwuerdigkeit && <span>— <span className="text-gray-400">Glaubw.</span></span>}
                    </div>
                    {(p.klaeger_rate||p.vergleich_rate||p.dauer_monate) ? (
                      <div className="flex gap-4 text-xs mt-1 text-gray-500">
                        {p.klaeger_rate ? <span>{p.klaeger_rate}% <span className="text-gray-400">Kläger</span></span> : null}
                        {p.vergleich_rate ? <span>{p.vergleich_rate}% <span className="text-gray-400">Vergleiche</span></span> : null}
                        {p.dauer_monate ? <span>{p.dauer_monate} Mo. <span className="text-gray-400">Dauer</span></span> : null}
                      </div>
                    ) : null}
                    {p.notizen && <p className="text-xs text-gray-400 mt-1 italic">{p.notizen}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={()=>startEdit(p)} className="text-gray-400 hover:text-blue-500 p-1"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={()=>del(p.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {persons.length === 0 && !showAdd && <div className="text-center text-gray-400 text-sm py-10">Noch keine Personen. Fügen Sie Richter, Zeugen und Parteien hinzu.</div>}
      </div>
      <div className="text-xs text-gray-400 text-center">{persons.length} Personen</div>
    </div>
  );
}