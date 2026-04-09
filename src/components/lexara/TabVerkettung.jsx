import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, Sparkles, RefreshCw, Pencil, Check, Network } from "lucide-react";
import ArgumentGraph from "./ArgumentGraph";
import { Button } from "@/components/ui/button";

const CONN_TYPES = ["stützt", "entkräftet", "schließt aus", "kausal", "widerspricht", "schwächt", "verstärkt"];
const COLORS = {
  "stützt": "text-green-600 border-green-300 bg-green-50",
  "entkräftet": "text-red-500 border-red-300 bg-red-50",
  "schließt aus": "text-gray-600 border-gray-300 bg-gray-50",
  "kausal": "text-blue-500 border-blue-300 bg-blue-50",
  "widerspricht": "text-orange-500 border-orange-300 bg-orange-50",
  "schwächt": "text-amber-500 border-amber-300 bg-amber-50",
  "verstärkt": "text-emerald-600 border-emerald-300 bg-emerald-50",
};

export default function TabVerkettung({ caseId }) {
  const [args, setArgs] = useState([]);
  const [showAddConn, setShowAddConn] = useState(false);
  const [newConn, setNewConn] = useState({ from: "", to: "", type: "stützt", explanation: "", intensitaet: 5 });
  const [editConn, setEditConn] = useState(null); // { fromId, toId, type, explanation, intensitaet }
  const [kiAnalyzing, setKiAnalyzing] = useState(false);
  const [kiSuggestions, setKiSuggestions] = useState([]);
  const [showGraph, setShowGraph] = useState(false);

  useEffect(() => { load(); }, [caseId]);

  const load = async () => {
    const a = await base44.entities.Argument.filter({ case_id: caseId });
    setArgs(a);
  };

  const addConnection = async () => {
    if (!newConn.from || !newConn.to || newConn.from === newConn.to) return;
    const fromArg = args.find(a => a.id === newConn.from);
    if (!fromArg) return;
    const existing = (fromArg.connections || []).filter(c => c.targetId !== newConn.to);
    await base44.entities.Argument.update(newConn.from, {
      connections: [...existing, { targetId: newConn.to, type: newConn.type, explanation: newConn.explanation, intensitaet: newConn.intensitaet }]
    });
    setNewConn({ from: "", to: "", type: "stützt", explanation: "", intensitaet: 5 });
    setShowAddConn(false);
    load();
  };

  const removeConnection = async (fromId, toId) => {
    const fromArg = args.find(a => a.id === fromId);
    if (!fromArg) return;
    await base44.entities.Argument.update(fromId, { connections: (fromArg.connections || []).filter(c => c.targetId !== toId) });
    load();
  };

  const startEdit = (conn) => {
    setEditConn({ ...conn });
  };

  const saveEdit = async () => {
    if (!editConn) return;
    const fromArg = args.find(a => a.id === editConn.fromId);
    if (!fromArg) return;
    const updated = (fromArg.connections || []).map(c =>
      c.targetId === editConn.toId
        ? { targetId: editConn.toId, type: editConn.type, explanation: editConn.explanation, intensitaet: editConn.intensitaet }
        : c
    );
    await base44.entities.Argument.update(editConn.fromId, { connections: updated });
    setEditConn(null);
    load();
  };

  const kiAnalyze = async () => {
    if (args.length < 2) return;
    setKiAnalyzing(true);
    setKiSuggestions([]);
    const argList = args.map(a => `ID: ${a.id} | Titel: "${a.title}" | Seite: ${a.side}`).join("\n");
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener Rechtsanwalt. Analysiere folgende juristische Argumente und erkenne Beziehungen zwischen ihnen.\n\nArgumente:\n${argList}\n\nErkenne für jede sinnvolle Verbindung: welches Argument stützt, entkräftet, widerspricht, verstärkt, schwächt oder schließt ein anderes aus.\nGib nur Verbindungen an die wirklich relevant sind (max 10). Bewerte die Intensität 1-10.`,
      response_json_schema: {
        type: "object",
        properties: {
          verbindungen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                vonId: { type: "string" },
                nachId: { type: "string" },
                typ: { type: "string" },
                erklaerung: { type: "string" },
                intensitaet: { type: "number" }
              },
              required: ["vonId", "nachId", "typ"]
            }
          }
        }
      }
    });
    setKiSuggestions(result?.verbindungen || []);
    setKiAnalyzing(false);
  };

  const takeSuggestion = async (s) => {
    const fromArg = args.find(a => a.id === s.vonId);
    if (!fromArg) return;
    const existing = (fromArg.connections || []).filter(c => c.targetId !== s.nachId);
    await base44.entities.Argument.update(s.vonId, {
      connections: [...existing, { targetId: s.nachId, type: s.typ, explanation: s.erklaerung || "", intensitaet: s.intensitaet || 5 }]
    });
    setKiSuggestions(prev => prev.filter(x => !(x.vonId === s.vonId && x.nachId === s.nachId)));
    load();
  };

  const takeAllSuggestions = async () => {
    for (const s of kiSuggestions) await takeSuggestion(s);
    setKiSuggestions([]);
  };

  const connections = [];
  args.forEach(arg => {
    (arg.connections || []).forEach(c => {
      if (c.targetId) connections.push({ fromId: arg.id, fromTitle: arg.title, toId: c.targetId, type: c.type, explanation: c.explanation || "", intensitaet: c.intensitaet ?? 5 });
    });
  });

  const getTitle = (id) => { const a = args.find(x => x.id === id); return a ? (a.title.length > 35 ? a.title.slice(0, 35) + "…" : a.title) : id; };
  const eigenArgs = args.filter(a => a.side === "eigen");
  const gegnerArgs = args.filter(a => a.side === "gegner");

  return (
    <div className="space-y-4">
      {showGraph && <ArgumentGraph args={args} onClose={() => setShowGraph(false)} />}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-700">🔗 Argumentketten & Kausalzusammenhänge</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowGraph(true)} disabled={args.length === 0}
            className="flex items-center gap-1 text-xs border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors">
            <Network className="w-3 h-3" />
            Graph
          </button>
          <button onClick={kiAnalyze} disabled={kiAnalyzing || args.length < 2}
            className="flex items-center gap-1 text-xs border border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors">
            {kiAnalyzing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            KI-Analyse
          </button>
          <Button size="sm" onClick={() => setShowAddConn(!showAddConn)} className="bg-gray-900 text-white rounded-xl text-xs gap-1">
            <Plus className="w-3 h-3" /> Verbindung
          </Button>
        </div>
      </div>

      {showAddConn && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Von</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={newConn.from} onChange={e => setNewConn({ ...newConn, from: e.target.value })}>
                <option value="">Argument wählen...</option>
                {args.map(a => <option key={a.id} value={a.id}>{a.title.slice(0, 40)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Nach</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={newConn.to} onChange={e => setNewConn({ ...newConn, to: e.target.value })}>
                <option value="">Argument wählen...</option>
                {args.filter(a => a.id !== newConn.from).map(a => <option key={a.id} value={a.id}>{a.title.slice(0, 40)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={newConn.type} onChange={e => setNewConn({ ...newConn, type: e.target.value })}>
              {CONN_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-400">Intensität:</label>
              <input type="number" min={1} max={10} step={0.5} value={newConn.intensitaet}
                onChange={e => setNewConn({ ...newConn, intensitaet: +e.target.value })}
                className="w-14 border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white" />
              <span className="text-xs text-gray-400">/10</span>
            </div>
            <input className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" placeholder="Erklärung (optional)" value={newConn.explanation} onChange={e => setNewConn({ ...newConn, explanation: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addConnection} className="bg-gray-900 text-white rounded-lg text-xs">Hinzufügen</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddConn(false)} className="rounded-lg text-xs">Abbrechen</Button>
          </div>
        </div>
      )}

      {/* KI-Suggestions */}
      {kiSuggestions.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-violet-700">✨ KI-Vorschläge ({kiSuggestions.length})</p>
            <button onClick={takeAllSuggestions} className="text-xs bg-violet-700 text-white px-3 py-1 rounded-lg hover:bg-violet-800">Alle übernehmen</button>
          </div>
          {kiSuggestions.map((s, i) => (
            <div key={i} className="bg-white border border-violet-100 rounded-lg p-3 flex items-center gap-2 flex-wrap text-xs">
              <span className="font-medium text-gray-800">{getTitle(s.vonId)}</span>
              <span className={`px-2 py-0.5 border rounded-full text-[10px] font-medium ${COLORS[s.typ] || "text-gray-500 border-gray-300"}`}>{s.typ}</span>
              <span className="text-gray-400">→</span>
              <span className="font-medium text-gray-800">{getTitle(s.nachId)}</span>
              {s.intensitaet && <span className="text-gray-400 text-[10px]">Intensität: {s.intensitaet}/10</span>}
              {s.erklaerung && <span className="text-gray-400 italic">— {s.erklaerung}</span>}
              <button onClick={() => takeSuggestion(s)} className="ml-auto text-xs text-violet-600 border border-violet-200 rounded px-2 py-0.5 hover:bg-violet-50">Übernehmen</button>
            </div>
          ))}
        </div>
      )}

      {/* Arguments overview */}
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
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: Math.min(5, Math.round((arg.strength || 5) / 2)) }).map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-blue-500 rounded-full" />)}
                      <span className="text-[9px] text-gray-400 ml-1">Stärke {arg.strength || 5}/10</span>
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
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: Math.min(5, Math.round((arg.strength || 5) / 2)) }).map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-red-400 rounded-full" />)}
                      <span className="text-[9px] text-gray-400 ml-1">Gegenkraft {arg.strength || 5}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connections list */}
      {connections.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">🔗 STRÄNGE & KAUSALZUSAMMENHÄNGE ({connections.length})</p>
          {connections.map((conn, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-all group">
              {editConn?.fromId === conn.fromId && editConn?.toId === conn.toId ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-medium text-gray-800">{getTitle(conn.fromId)}</span>
                    <select className="border border-gray-200 rounded px-2 py-1 text-xs" value={editConn.type} onChange={e => setEditConn({ ...editConn, type: e.target.value })}>
                      {CONN_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-gray-800">{getTitle(conn.toId)}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs" placeholder="Erklärung" value={editConn.explanation} onChange={e => setEditConn({ ...editConn, explanation: e.target.value })} />
                    <label className="text-xs text-gray-400">Int.:</label>
                    <input type="number" min={1} max={10} step={0.5} value={editConn.intensitaet} onChange={e => setEditConn({ ...editConn, intensitaet: +e.target.value })}
                      className="w-14 border border-gray-200 rounded px-1 py-1 text-xs" />
                    <button onClick={saveEdit} className="text-green-600 hover:text-green-800"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditConn(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 text-xs flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">{getTitle(conn.fromId)}</span>
                    <span className={`px-2 py-0.5 border rounded-full text-[10px] font-medium ${COLORS[conn.type] || "text-gray-500 border-gray-300"}`}>🔗 {conn.type}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-gray-800">{getTitle(conn.toId)}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">Intensität: {conn.intensitaet}/10</span>
                    {conn.explanation && <span className="text-gray-400 italic">— {conn.explanation}</span>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all items-center">
                    <button onClick={() => startEdit(conn)} className="text-gray-400 hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeConnection(conn.fromId, conn.toId)} className="text-gray-300 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}