import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TabVerkettung({ caseId }) {
  const [args, setArgs] = useState([]);
  const [showAddConn, setShowAddConn] = useState(false);
  const [newConn, setNewConn] = useState({ from: "", to: "", type: "stützt", explanation: "" });

  useEffect(() => { load(); }, [caseId]);

  const load = async () => {
    const a = await base44.entities.Argument.filter({ case_id: caseId });
    setArgs(a);
  };

  const addConnection = async () => {
    if (!newConn.from || !newConn.to || newConn.from === newConn.to) return;
    const fromArg = args.find(a => a.id === newConn.from);
    if (!fromArg) return;
    const existing = fromArg.connections || [];
    await base44.entities.Argument.update(newConn.from, { connections: [...existing, { targetId: newConn.to, type: newConn.type, explanation: newConn.explanation }] });
    setNewConn({ from: "", to: "", type: "stützt", explanation: "" });
    setShowAddConn(false);
    load();
  };

  const removeConnection = async (fromId, toId) => {
    const fromArg = args.find(a => a.id === fromId);
    if (!fromArg) return;
    await base44.entities.Argument.update(fromId, { connections: (fromArg.connections||[]).filter(c => c.targetId !== toId) });
    load();
  };

  const connections = [];
  args.forEach(arg => {
    (arg.connections || []).forEach(c => {
      if (c.targetId) connections.push({ fromId: arg.id, fromTitle: arg.title, toId: c.targetId, type: c.type, explanation: c.explanation||"" });
    });
  });

  const eigenArgs = args.filter(a => a.side === "eigen");
  const gegnerArgs = args.filter(a => a.side === "gegner");
  const getTitle = (id) => { const a = args.find(x => x.id === id); return a ? (a.title.length>35?a.title.slice(0,35)+"…":a.title) : id; };

  const COLORS = { "stützt":"text-green-600 border-green-300","entkräftet":"text-red-500 border-red-300","schließt aus":"text-gray-500 border-gray-300","kausal":"text-blue-500 border-blue-300" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">🔗 Argumentketten & Kausalzusammenhänge</h3>
        <Button size="sm" onClick={() => setShowAddConn(!showAddConn)} className="bg-gray-900 text-white rounded-xl text-xs gap-1"><Plus className="w-3 h-3" /> Verbindung</Button>
      </div>

      {showAddConn && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Von</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={newConn.from} onChange={e=>setNewConn({...newConn,from:e.target.value})}>
                <option value="">Argument wählen...</option>
                {args.map(a => <option key={a.id} value={a.id}>{a.title.slice(0,40)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Nach</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={newConn.to} onChange={e=>setNewConn({...newConn,to:e.target.value})}>
                <option value="">Argument wählen...</option>
                {args.filter(a=>a.id!==newConn.from).map(a => <option key={a.id} value={a.id}>{a.title.slice(0,40)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={newConn.type} onChange={e=>setNewConn({...newConn,type:e.target.value})}>
              {["stützt","entkräftet","schließt aus","kausal"].map(t=><option key={t}>{t}</option>)}
            </select>
            <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" placeholder="Erklärung (optional)" value={newConn.explanation} onChange={e=>setNewConn({...newConn,explanation:e.target.value})} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addConnection} className="bg-gray-900 text-white rounded-lg text-xs">Hinzufügen</Button>
            <Button size="sm" variant="outline" onClick={()=>setShowAddConn(false)} className="rounded-lg text-xs">Abbrechen</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        {args.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-10">Noch keine Argumente vorhanden.</div>
        ) : (
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">EIGENE SEITE</p>
              <div className="space-y-2">
                {eigenArgs.map(arg => (
                  <div key={arg.id} className="border-l-2 border-blue-400 bg-blue-50 rounded-xl p-3">
                    <div className="text-[9px] font-bold text-blue-500 uppercase mb-0.5">CLAIM</div>
                    <div className="text-xs font-medium text-gray-800">{arg.title}</div>
                    {arg.description && <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{arg.description}</div>}
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({length:Math.min(5,Math.round((arg.strength||5)/2))}).map((_,i)=><div key={i} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />)}
                      <span className="text-[9px] text-gray-400 ml-1">Stärke</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">GEGENSEITE</p>
              <div className="space-y-2">
                {gegnerArgs.map(arg => (
                  <div key={arg.id} className="border-l-2 border-red-400 bg-red-50 rounded-xl p-3">
                    <div className="text-[9px] font-bold text-red-500 uppercase mb-0.5">GEGENARGUMENT</div>
                    <div className="text-xs font-medium text-gray-800">{arg.title}</div>
                    {arg.description && <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{arg.description}</div>}
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({length:Math.min(5,Math.round((arg.strength||5)/2))}).map((_,i)=><div key={i} className="w-1.5 h-1.5 bg-red-400 rounded-full" />)}
                      <span className="text-[9px] text-gray-400 ml-1">Gegenkraft</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {connections.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">🔗 STRÄNGE & KAUSALZUSAMMENHÄNGE ({connections.length})</p>
          <p className="text-xs text-gray-400">Automatisch erkannte Zusammenhänge – einzeln übernehmen oder über „Alle übernehmen".</p>
          {connections.map((conn, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 text-xs flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800">{getTitle(conn.fromId)}</span>
                  <span className={`px-2 py-0.5 border rounded-full text-[10px] font-medium ${COLORS[conn.type]||"text-gray-500 border-gray-300"}`}>🔗 {conn.type}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-gray-800">{getTitle(conn.toId)}</span>
                  {conn.explanation && <span className="text-gray-400">— {conn.explanation}</span>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all items-center">
                  <button className="text-xs text-blue-500 hover:underline whitespace-nowrap">+ Graph</button>
                  <button onClick={() => removeConnection(conn.fromId, conn.toId)} className="text-gray-300 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}