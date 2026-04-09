import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Clock, CheckCircle2, AlertCircle, Calendar, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const EVENT_TYPES = [
  { value: "frist", label: "Frist", color: "bg-red-100 text-red-700 border-red-200", icon: "⏰" },
  { value: "korrespondenz", label: "Korrespondenz", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "✉️" },
  { value: "schritt", label: "Verhandlungsschritt", color: "bg-green-100 text-green-700 border-green-200", icon: "⚖️" },
  { value: "termin", label: "Gerichtstermin", color: "bg-purple-100 text-purple-700 border-purple-200", icon: "🏛️" },
  { value: "massnahme", label: "Maßnahme", color: "bg-amber-100 text-amber-700 border-amber-200", icon: "📋" },
];

function TimelineSection({ caseId, caseData }) {
  const [deadlines, setDeadlines] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`timeline_${caseId}`) || "[]"); } catch { return []; }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newEv, setNewEv] = useState({ title: "", date: "", type: "schritt", notes: "", done: false });
  const [showTimeline, setShowTimeline] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Deadline.filter({ case_id: caseId }),
      base44.entities.Task.filter({ case_id: caseId }),
    ]).then(([d, t]) => { setDeadlines(d); setTasks(t); });
  }, [caseId]);

  const saveEvents = (evs) => {
    setEvents(evs);
    localStorage.setItem(`timeline_${caseId}`, JSON.stringify(evs));
  };

  const addEvent = () => {
    if (!newEv.title.trim() || !newEv.date) return;
    saveEvents([...events, { ...newEv, id: Date.now().toString() }]);
    setNewEv({ title: "", date: "", type: "schritt", notes: "", done: false });
    setShowAdd(false);
  };

  const toggleDone = (id) => saveEvents(events.map(e => e.id === id ? { ...e, done: !e.done } : e));
  const removeEvent = (id) => saveEvents(events.filter(e => e.id !== id));

  // Merge all events for timeline
  const allItems = [
    ...deadlines.map(d => ({ id: d.id, title: d.title, date: d.due_date, type: "frist", notes: d.frist_type || "", done: d.status === "erledigt", source: "db" })),
    ...tasks.filter(t => t.due_date).map(t => ({ id: t.id, title: t.title, date: t.due_date, type: "massnahme", notes: t.notes || "", done: t.status === "erledigt", source: "db" })),
    ...events.map(e => ({ ...e, source: "local" })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const now = new Date();
  const past = allItems.filter(e => new Date(e.date) < now);
  const future = allItems.filter(e => new Date(e.date) >= now);

  const getType = (type) => EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[0];
  const formatDate = (d) => { try { return new Date(d).toLocaleDateString("de-DE", { day:"2-digit", month:"short", year:"numeric" }); } catch { return d; } };
  const daysUntil = (d) => { const diff = Math.ceil((new Date(d) - now) / 86400000); return diff; };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-5">
      <button onClick={() => setShowTimeline(!showTimeline)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50">
        <Calendar className="w-4 h-4 text-blue-500" />
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-800">📅 Interaktive Prozess-Timeline</p>
          <p className="text-xs text-gray-400">{allItems.length} Ereignisse · {future.filter(e => !e.done).length} ausstehend</p>
        </div>
        <button onClick={e => { e.stopPropagation(); setShowAdd(!showAdd); }}
          className="flex items-center gap-1 text-xs border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-100 text-gray-500">
          <Plus className="w-3 h-3" /> Ereignis
        </button>
        {showTimeline ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {showAdd && (
        <div className="px-5 pb-4 border-t border-gray-50 pt-4 bg-gray-50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white col-span-2" placeholder="Titel *" value={newEv.title} onChange={e => setNewEv({ ...newEv, title: e.target.value })} />
            <input type="date" className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={newEv.date} onChange={e => setNewEv({ ...newEv, date: e.target.value })} />
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={newEv.type} onChange={e => setNewEv({ ...newEv, type: e.target.value })}>
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white col-span-2" placeholder="Notizen (optional)" value={newEv.notes} onChange={e => setNewEv({ ...newEv, notes: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addEvent} className="bg-gray-900 text-white text-xs rounded-lg">Hinzufügen</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="text-xs rounded-lg">Abbrechen</Button>
          </div>
        </div>
      )}

      {showTimeline && (
        <div className="px-5 pb-5 border-t border-gray-50">
          {/* Future events */}
          {future.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">⏭ AUSSTEHEND</p>
              <div className="relative pl-5 space-y-3">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-100" />
                {future.map((ev, i) => {
                  const tp = getType(ev.type);
                  const days = daysUntil(ev.date);
                  return (
                    <div key={ev.id} className="relative group">
                      <div className={`absolute -left-3 top-2.5 w-3 h-3 rounded-full border-2 ${ev.done ? "bg-green-400 border-green-400" : days <= 7 ? "bg-red-400 border-red-400" : "bg-white border-gray-300"}`} />
                      <div className={`ml-2 rounded-xl border p-3 ${ev.done ? "opacity-50" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${tp.color}`}>{tp.icon} {tp.label}</span>
                              <span className={`text-[10px] font-semibold ${days <= 3 ? "text-red-500" : days <= 7 ? "text-amber-500" : "text-gray-400"}`}>
                                {days === 0 ? "Heute" : days < 0 ? `${Math.abs(days)} Tage überfällig` : `in ${days} Tagen`} · {formatDate(ev.date)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-800 mt-0.5">{ev.title}</p>
                            {ev.notes && <p className="text-xs text-gray-400 mt-0.5">{ev.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {ev.source === "local" && (
                              <><button onClick={() => toggleDone(ev.id)} className="text-gray-300 hover:text-green-500">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => removeEvent(ev.id)} className="text-gray-300 hover:text-red-400">
                                <X className="w-3.5 h-3.5" />
                              </button></>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past events */}
          {past.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">📁 VERGANGEN</p>
              <div className="relative pl-5 space-y-2">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-100" />
                {past.slice().reverse().map((ev) => {
                  const tp = getType(ev.type);
                  return (
                    <div key={ev.id} className="relative group">
                      <div className="absolute -left-3 top-2.5 w-3 h-3 rounded-full bg-gray-200 border-2 border-gray-300" />
                      <div className="ml-2 bg-gray-50 rounded-xl border border-gray-100 p-2.5 opacity-70 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${tp.color}`}>{tp.icon} {tp.label}</span>
                          <span className="text-[10px] text-gray-400">{formatDate(ev.date)}</span>
                          <span className="text-xs text-gray-600 font-medium">{ev.title}</span>
                        </div>
                        {ev.notes && <p className="text-[10px] text-gray-400 mt-0.5">{ev.notes}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {allItems.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">Keine Ereignisse — Fristen und Aufgaben aus den anderen Tabs erscheinen hier automatisch.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TabVerhandlung({ caseId, caseData }) {
  const [args, setArgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [fokus, setFokus] = useState("");
  const [richterStil, setRichterStil] = useState(caseData?.ki_berater_result ? "Neutral" : "Neutral");

  useEffect(() => {
    base44.entities.Argument.filter({ case_id: caseId }).then(setArgs);
  }, [caseId]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    const eigene = args.filter(a => a.side === "eigen");
    const gegner = args.filter(a => a.side === "gegner");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist Verhandlungscoach für den Anwalt. Erstelle Reaktionsskripte für die Verhandlung.
Fall: ${caseData?.fallname || ""}, Rechtsgebiet: ${caseData?.rechtsgebiet || ""}, Prognose: ${caseData?.prognose || 0}%
Eigene Argumente (${eigene.length}): ${eigene.map(a => `${a.title} (Stärke ${a.strength}/10)`).join("; ")}
Gegner-Argumente (${gegner.length}): ${gegner.map(a => `${a.title} (Stärke ${a.strength}/10)`).join("; ")}
Richter-Stil: ${richterStil}
${fokus ? `Fokus: ${fokus}` : ""}
Erstelle 3–5 realistische Verhandlungsszenarien, jeweils mit: dem wahrscheinlichen Einwand der Gegenseite, einem präzisen Reaktionsskript (was der Anwalt sagen soll), einer Alternativreaktion und einer Einschätzung, ob das Szenario günstig oder ungünstig ist.`,
      response_json_schema: {
        type: "object",
        properties: {
          szenarien: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                einwand: { type: "string" },
                reaktion_primaer: { type: "string" },
                reaktion_alternativ: { type: "string" },
                bewertung: { type: "string", enum: ["günstig", "neutral", "ungünstig"] },
                taktik_hinweis: { type: "string" }
              }
            }
          },
          gesamtempfehlung: { type: "string" }
        }
      }
    });
    if (!res || !res.szenarien) {
      setError("KI konnte keine Szenarien generieren. Bitte erneut versuchen.");
      setLoading(false);
      return;
    }
    setResult(res);
    setLoading(false);
  };

  const bewertungStyle = { "günstig": "bg-green-100 text-green-700", "neutral": "bg-gray-100 text-gray-600", "ungünstig": "bg-red-100 text-red-700" };

  return (
    <div className="space-y-4">
      <TimelineSection caseId={caseId} caseData={caseData} />
      <div>
        <h2 className="text-base font-semibold text-gray-900">Verhandlungsszenarien</h2>
        <p className="text-xs text-gray-400 mt-0.5">KI simuliert gegnerische Einwände und generiert Reaktionsskripte</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Richter-Stil</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={richterStil} onChange={e => setRichterStil(e.target.value)}>
              {["Neutral","Kooperativ","Streng","Prozessaktiv","Vergleichsorientiert"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Fokus / Schwerpunkt (optional)</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="z.B. Schadensersatzanspruch" value={fokus} onChange={e => setFokus(e.target.value)} />
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
          <strong>{args.filter(a=>a.side==="eigen").length}</strong> eigene · <strong>{args.filter(a=>a.side==="gegner").length}</strong> Gegner-Argumente geladen
          {args.length === 0 && <span className="text-amber-500 ml-2">⚠️ Keine Argumente – bitte erst im Tab „Argumente" hinzufügen</span>}
        </div>
        <Button onClick={generate} disabled={loading || args.length === 0} className="w-full bg-gray-900 text-white rounded-xl gap-2">
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Simuliere Szenarien...</> : "⚔️ Verhandlungsszenarien generieren"}
        </Button>
        {error && <p className="text-xs text-red-500">⚠️ {error}</p>}
      </div>

      {result && (
        <div className="space-y-3">
          {(result.szenarien || []).map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">{s.titel}</h3>
                {s.bewertung && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${bewertungStyle[s.bewertung] || "bg-gray-100 text-gray-600"}`}>{s.bewertung}</span>}
              </div>
              <div className="space-y-3">
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-red-500 uppercase tracking-widest mb-1">⚔️ Einwand Gegenseite</p>
                  <p className="text-xs text-gray-700 italic">„{s.einwand}"</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest mb-1">✅ Primäre Reaktion</p>
                  <p className="text-xs text-gray-700">{s.reaktion_primaer}</p>
                </div>
                {s.reaktion_alternativ && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">↩ Alternativreaktion</p>
                    <p className="text-xs text-gray-600">{s.reaktion_alternativ}</p>
                  </div>
                )}
                {s.taktik_hinweis && (
                  <p className="text-[10px] text-amber-600">💡 Taktik: {s.taktik_hinweis}</p>
                )}
              </div>
            </div>
          ))}
          {result.gesamtempfehlung && (
            <div className="bg-gray-900 text-white rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-2">🎯 Gesamtempfehlung</h3>
              <p className="text-sm">{result.gesamtempfehlung}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}