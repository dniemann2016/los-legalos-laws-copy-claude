import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, ChevronDown, ChevronUp, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const BEWEIS_TYPES = ["Gesetzliche Grundlage / Normtext","BGH/BVerfG Entscheidung (einschlägig)","Notarielle Beurkundung","Öffentliche Urkunde §415 ZPO","BGH-Entscheidung (übertragbar)","Gerichtliches SV-Gutachten","OLG-Entscheidung (gleiches BL)","Private Urkunde §416 ZPO","Augenscheinsbeweis","Privates SV-Gutachten","E-Mail / elektronisch","Zeuge (unabhängig)","LG-Entscheidung","Parteivernehmung §445 ZPO","Zeuge (parteinah)","Indizien (kumulativ)","Negative Tatsache"];
const WEIGHTS = {"Gesetzliche Grundlage / Normtext":10,"BGH/BVerfG Entscheidung (einschlägig)":9.5,"Notarielle Beurkundung":9.5,"Öffentliche Urkunde §415 ZPO":9,"BGH-Entscheidung (übertragbar)":8.5,"Gerichtliches SV-Gutachten":8.5,"OLG-Entscheidung (gleiches BL)":7.5,"Private Urkunde §416 ZPO":7.5,"Augenscheinsbeweis":7,"Privates SV-Gutachten":6.5,"E-Mail / elektronisch":6,"Zeuge (unabhängig)":6,"LG-Entscheidung":5,"Parteivernehmung §445 ZPO":4,"Zeuge (parteinah)":3.5,"Indizien (kumulativ)":3.5,"Negative Tatsache":3};

export default function TabBeweise({ caseId }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [selectedArg, setSelectedArg] = useState(null);
  const [kiWeightingId, setKiWeightingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const [newEv, setNewEv] = useState({ title: "", description: "", type: BEWEIS_TYPES[0], source: "" });

  useEffect(() => { load(); }, [caseId]);

  const load = async () => {
    const [a, e] = await Promise.all([base44.entities.Argument.filter({ case_id: caseId }), base44.entities.Evidence.filter({ case_id: caseId })]);
    setArgs(a);
    setEvidence(e);
    if (a.length > 0 && !selectedArg) setSelectedArg(a[0].id);
  };

  const addEvidence = async () => {
    if (!newEv.title.trim() || !selectedArg) return;
    await base44.entities.Evidence.create({ case_id: caseId, argument_id: selectedArg, ...newEv, weight: WEIGHTS[newEv.type]||5 });
    setNewEv({ title: "", description: "", type: BEWEIS_TYPES[0], source: "" });
    setShowAdd(false);
    load();
  };

  const del = async (id) => { await base44.entities.Evidence.delete(id); load(); };

  const kiGewichten = async (ev) => {
    setKiWeightingId(ev.id);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein Rechtsanwalt. Bewerte die Beweiskraft dieses Beweismittels im deutschen Zivilprozess auf einer Skala von 0-10.
Titel: "${ev.title}"
Typ: "${ev.type||""}"
Beschreibung: "${ev.description||""}"
Gib NUR eine Zahl zwischen 0 und 10 zurück (z.B. 7.5). Keine Erklärung.`,
    });
    const parsed = parseFloat(String(result).replace(/[^0-9.]/g, ""));
    if (!isNaN(parsed)) {
      await base44.entities.Evidence.update(ev.id, { weight: Math.min(10, Math.max(0, parsed)) });
      load();
    }
    setKiWeightingId(null);
  };
  const selectedArgData = args.find(a => a.id === selectedArg);
  const argEvidence = evidence.filter(e => e.argument_id === selectedArg);

  return (
    <div className="flex gap-4" style={{minHeight:"400px"}}>
      <div className="w-52 flex-shrink-0 overflow-y-auto space-y-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Argumente</p>
        {args.map(arg => (
          <button key={arg.id} onClick={() => setSelectedArg(arg.id)}
            className={`w-full text-left rounded-xl p-3 text-xs transition-all ${selectedArg===arg.id?"bg-gray-900 text-white":"bg-white border border-gray-100 text-gray-700 hover:border-gray-200"}`}>
            <div className={`text-[9px] font-medium mb-0.5 ${selectedArg===arg.id?"text-gray-300":"text-gray-400"}`}>{arg.side==="eigen"?"Eigen":"Gegner"}</div>
            <div className="font-medium leading-snug">{arg.title}</div>
            <div className={`mt-1 text-[10px] ${selectedArg===arg.id?"text-gray-400":"text-gray-400"}`}>{evidence.filter(e=>e.argument_id===arg.id).length} Beweise</div>
          </button>
        ))}
        {args.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Keine Argumente</p>}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {selectedArgData ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${selectedArgData.side==="eigen"?"bg-blue-50 text-blue-700":"bg-red-50 text-red-700"}`}>{selectedArgData.side==="eigen"?"Eigenes Argument":"Gegner-Argument"}</span>
                <h3 className="font-semibold text-gray-900 mt-1">{selectedArgData.title}</h3>
              </div>
              <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-gray-900 text-white rounded-xl text-xs gap-1"><Plus className="w-3 h-3" /> Beweis</Button>
            </div>
            {showAdd && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Titel *" value={newEv.title} onChange={e=>setNewEv({...newEv,title:e.target.value})} />
                <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Beschreibung" rows={2} value={newEv.description} onChange={e=>setNewEv({...newEv,description:e.target.value})} />
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={newEv.type} onChange={e=>setNewEv({...newEv,type:e.target.value})}>
                  {BEWEIS_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Quelle" value={newEv.source} onChange={e=>setNewEv({...newEv,source:e.target.value})} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addEvidence} className="bg-gray-900 text-white rounded-lg text-xs">Hinzufügen</Button>
                  <Button size="sm" variant="outline" onClick={()=>setShowAdd(false)} className="rounded-lg text-xs">Abbrechen</Button>
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">📋 Beweisstrang mit Konkretisierungen</h4>
              <p className="text-xs text-gray-400 mb-4">Klicken Sie auf die Punkte (•) neben Beweisen, um Konkretisierungen anzuzeigen.</p>
              <div className="relative pl-6 space-y-4">
                {argEvidence.map((ev) => (
                  <div key={ev.id} className="relative group">
                    <div className="absolute -left-6 top-2 w-4 h-4 border-2 border-gray-800 rounded-full bg-white flex items-center justify-center cursor-pointer">
                      <div className="w-1.5 h-1.5 bg-gray-800 rounded-full" />
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1"><span className="text-xs">📄</span><span className="font-medium text-sm text-gray-900">{ev.title}</span></div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-green-600 rounded-full" style={{width:`${(ev.weight||5)*10}%`}} /></div>
                            <span className="text-xs text-gray-500">{ev.weight||5}/10</span>
                          </div>
                          {ev.description && <p className="text-xs text-gray-500">{ev.description}</p>}
                          {ev.type && <p className="text-[10px] text-gray-400 mt-0.5">{ev.type}</p>}
                          <button onClick={() => kiGewichten(ev)} disabled={kiWeightingId === ev.id}
                            title="KI-Gewichtung" className="mt-1 flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-800 border border-violet-200 rounded px-1.5 py-0.5 disabled:opacity-40">
                            {kiWeightingId === ev.id ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                            KI gewichten
                          </button>
                        </div>
                        <button onClick={() => del(ev.id)} className="text-gray-300 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all ml-2"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {argEvidence.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Noch keine Beweise.</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <button onClick={() => setShowRef(!showRef)} className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700">
                📖 Referenztabelle {showRef?"ausblenden":"anzeigen"}
                {showRef ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showRef && (
                <table className="mt-3 w-full text-xs">
                  <thead><tr className="text-gray-400 border-b border-gray-100"><th className="text-left py-1 font-medium">Typ</th><th className="text-center py-1 font-medium">Gewicht</th><th className="text-right py-1 font-medium">Kategorie</th></tr></thead>
                  <tbody>
                    {Object.entries(WEIGHTS).map(([type, w]) => (
                      <tr key={type} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-1.5 text-gray-700">{type}</td>
                        <td className="py-1.5 text-center font-medium">{w}</td>
                        <td className="py-1.5 text-right text-gray-400">{w>=8?"Beweis":w>=6?"Rspr.":"Beweis"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">Wählen Sie ein Argument aus der Liste</div>
        )}
      </div>
    </div>
  );
}