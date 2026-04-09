import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronRight, Sparkles, RefreshCw, Plus, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Zwei-Phasen-Zeitachse für Prozessstrategie
 * Phase 1: VOR dem Prozess (Vorbereitung)
 * Phase 2: WÄHREND des Prozesses (Verhandlung)
 * 
 * Visualisiert: Fristen, Argumente, Beweise, Gegner-Taktik, Abhängigkeiten
 */

function TimelinePhaseBar({ phase, events, phaseStart, phaseEnd, allDeadlines, onEventClick }) {
  const getPhaseWidth = (date) => {
    if (!date) return 0;
    const d = new Date(date).getTime();
    const start = new Date(phaseStart).getTime();
    const end = new Date(phaseEnd).getTime();
    const range = end - start;
    if (d < start) return 0;
    if (d > end) return 100;
    return ((d - start) / range) * 100;
  };

  return (
    <div className="relative h-24 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl overflow-hidden">
      {/* Phase label */}
      <div className="absolute left-4 top-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
        {phase === "pre" ? "🔨 Vorbereitung" : "⚖️ Prozess"}
      </div>

      {/* Timeline grid */}
      {[0, 25, 50, 75, 100].map((pct) => (
        <div key={pct} className="absolute top-0 bottom-0 border-l border-gray-200/50" style={{ left: `${pct}%` }}>
          <div className="text-[8px] text-gray-400 px-1 mt-1">{pct}%</div>
        </div>
      ))}

      {/* Events */}
      {events.map((evt, idx) => {
        const pos = getPhaseWidth(evt.date);
        const isDeadline = evt.type === "deadline";
        const isArgument = evt.type === "argument";
        const isEvidence = evt.type === "evidence";

        return (
          <div
            key={idx}
            className="absolute top-8 transform -translate-x-1/2 cursor-pointer group"
            style={{ left: `${pos}%` }}
            onClick={() => onEventClick(evt)}
          >
            {/* Marker */}
            <div className={`w-3 h-3 rounded-full border-2 mx-auto transition-all group-hover:scale-150 ${
              isDeadline ? "bg-red-400 border-red-600" :
              isArgument ? "bg-blue-400 border-blue-600" :
              isEvidence ? "bg-green-400 border-green-600" :
              "bg-gray-400 border-gray-600"
            }`} />

            {/* Tooltip */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-32 text-xs text-center bg-gray-900 text-white rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap truncate">
              {evt.title}
            </div>

            {/* Vertical line */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-gradient-to-b from-current to-transparent opacity-40" />
          </div>
        );
      })}
    </div>
  );
}

function EventDetailsPanel({ event, onClose, caseData }) {
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analyzeEvent = async () => {
    if (!event || !caseData) return;
    setAnalyzing(true);

    const prompt = `Du bist Prozessstratege. Analysiere folgende Fall-Information:

Fall: ${caseData.fallname}
Rechtsgebiet: ${caseData.rechtsgebiet}
Streitwert: ${caseData.streitwert}€

EREIGNIS: ${event.title}
TYP: ${event.type}
DATUM: ${event.date}
BESCHREIBUNG: ${event.description || ""}
${event.type === "deadline" ? `FRIST-TYP: ${event.fristType}` : ""}
${event.type === "argument" ? `SEITE: ${event.side}` : ""}

Gebe folgende Analyse ab:
1. Was ist der STRATEGISCHE ZWECK dieses Ereignisses?
2. Welche ARGUMENTE/BEWEISE beeinflussen dieses Ereignis?
3. Welche FRISTEN sind damit verbunden?
4. Was könnte der GEGNER damit bezwecken (3 Szenarien)?
5. Welche GEGENMASSNAHMEN empfiehlst du?
6. Timing: Ist dieser Zeitpunkt optimal? Warum/warum nicht?`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          strategischer_zweck: { type: "string" },
          beteiligte_elemente: { type: "array", items: { type: "string" } },
          gegner_szenarien: {
            type: "array",
            items: { type: "object", properties: { szenario: { type: "string" }, wahrscheinlichkeit: { type: "string", enum: ["hoch", "mittel", "niedrig"] }, konsequenz: { type: "string" } } }
          },
          gegenmassnahmen: { type: "array", items: { type: "string" } },
          timing_bewertung: { type: "string" },
          empfehlung: { type: "string" }
        }
      }
    });

    setAnalysis(res);
    setAnalyzing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-white w-full max-w-2xl rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{event.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-xs text-gray-500 font-semibold">GRUNDINFO</p>
            <p className="text-sm text-gray-700"><strong>Typ:</strong> {event.type}</p>
            <p className="text-sm text-gray-700"><strong>Datum:</strong> {new Date(event.date).toLocaleDateString("de-DE")}</p>
            {event.description && <p className="text-sm text-gray-700"><strong>Beschreibung:</strong> {event.description}</p>}
          </div>

          <div className="flex gap-2">
            <Button onClick={analyzeEvent} disabled={analyzing} size="sm" className="gap-2">
              {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {analyzing ? "Analysiere..." : "KI-Analyse"}
            </Button>
          </div>

          {analysis && (
            <div className="space-y-3">
              <div className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded-r-lg">
                <p className="text-xs font-semibold text-blue-700 mb-1">🎯 Strategischer Zweck</p>
                <p className="text-sm text-blue-900">{analysis.strategischer_zweck}</p>
              </div>

              {analysis.gegner_szenarien?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600">🥊 Gegner-Szenarien</p>
                  {analysis.gegner_szenarien.map((s, i) => (
                    <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-2">
                      <p className="text-xs font-semibold text-red-700">{s.szenario}</p>
                      <p className="text-[10px] text-red-600 mt-0.5">{s.konsequenz}</p>
                      <span className="text-[9px] text-red-500 font-semibold">Wahrscheinlichkeit: {s.wahrscheinlichkeit}</span>
                    </div>
                  ))}
                </div>
              )}

              {analysis.gegenmassnahmen?.length > 0 && (
                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-r-lg">
                  <p className="text-xs font-semibold text-green-700 mb-2">🛡️ Empfohlene Gegenmaßnahmen</p>
                  <ul className="space-y-1">
                    {analysis.gegenmassnahmen.map((m, i) => (
                      <li key={i} className="text-sm text-green-900 flex items-start gap-2">
                        <span className="flex-shrink-0 mt-0.5">•</span> {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.empfehlung && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">💡 Handlungsempfehlung</p>
                  <p className="text-sm text-amber-900">{analysis.empfehlung}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StrategicTimeline({ caseId, caseData, onUpdate }) {
  const [deadlines, setDeadlines] = useState([]);
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [prePhaseStart, setPrePhaseStart] = useState("");
  const [prePhaseEnd, setPrePhaseEnd] = useState("");
  const [processPhaseStart, setProcessPhaseStart] = useState("");
  const [processPhaseEnd, setProcessPhaseEnd] = useState("");

  useEffect(() => {
    load();
  }, [caseId]);

  const load = async () => {
    const [d, a, e] = await Promise.all([
      base44.entities.Deadline.filter({ case_id: caseId }),
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
    ]);
    setDeadlines(d);
    setArgs(a);
    setEvidence(e);

    // Automatisch Phasen aus Daten initialisieren
    if (d.length > 0) {
      const dates = d.map(x => new Date(x.due_date).getTime()).sort((a, b) => a - b);
      const earliestDeadline = new Date(dates[0]);
      const latestDeadline = new Date(dates[dates.length - 1]);

      setPrePhaseStart(new Date(earliestDeadline.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
      setPrePhaseEnd(new Date(earliestDeadline.getTime() - 1).toISOString().split("T")[0]);
      setProcessPhaseStart(earliestDeadline.toISOString().split("T")[0]);
      setProcessPhaseEnd(new Date(latestDeadline.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    }

    setLoaded(true);
  };

  // Event-Generierung aus Entitäten
  const preEvents = [];
  const processEvents = [];

  deadlines.forEach(d => {
    const evt = {
      id: `deadline-${d.id}`,
      type: "deadline",
      title: d.title,
      date: d.due_date,
      fristType: d.frist_type,
      description: d.paragraph,
      side: d.side
    };
    if (new Date(d.due_date) < new Date(processPhaseStart)) preEvents.push(evt);
    else processEvents.push(evt);
  });

  args.forEach(a => {
    const evt = {
      id: `arg-${a.id}`,
      type: "argument",
      title: a.title,
      date: a.created_date,
      side: a.side,
      strength: a.strength
    };
    if (new Date(a.created_date) < new Date(processPhaseStart)) preEvents.push(evt);
    else processEvents.push(evt);
  });

  evidence.forEach(e => {
    const evt = {
      id: `ev-${e.id}`,
      type: "evidence",
      title: e.title,
      date: e.created_date,
      weight: e.weight
    };
    if (new Date(e.created_date) < new Date(processPhaseStart)) preEvents.push(evt);
    else processEvents.push(evt);
  });

  preEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  processEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!loaded) return <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Phase configuration */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">⏱️ Phasenkonfiguration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">VOR Prozess Start</label>
            <input type="date" value={prePhaseStart} onChange={e => setPrePhaseStart(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">VOR Prozess Ende</label>
            <input type="date" value={prePhaseEnd} onChange={e => setPrePhaseEnd(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Prozess Start</label>
            <input type="date" value={processPhaseStart} onChange={e => setProcessPhaseStart(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Prozess Ende</label>
            <input type="date" value={processPhaseEnd} onChange={e => setProcessPhaseEnd(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs" />
          </div>
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="space-y-4">
        <TimelinePhaseBar
          phase="pre"
          events={preEvents}
          phaseStart={prePhaseStart}
          phaseEnd={prePhaseEnd}
          allDeadlines={deadlines}
          onEventClick={setSelectedEvent}
        />
        <TimelinePhaseBar
          phase="process"
          events={processEvents}
          phaseStart={processPhaseStart}
          phaseEnd={processPhaseEnd}
          allDeadlines={deadlines}
          onEventClick={setSelectedEvent}
        />
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400 border-2 border-red-600" />
          <span className="text-gray-700 font-semibold">Frist</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400 border-2 border-blue-600" />
          <span className="text-gray-700 font-semibold">Argument</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-400 border-2 border-green-600" />
          <span className="text-gray-700 font-semibold">Beweis</span>
        </div>
      </div>

      {/* Event statistics */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{deadlines.length}</p>
          <p className="text-xs text-red-600 font-semibold">Fristen</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{args.length}</p>
          <p className="text-xs text-blue-600 font-semibold">Argumente</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{evidence.length}</p>
          <p className="text-xs text-green-600 font-semibold">Beweise</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-600">{preEvents.length + processEvents.length}</p>
          <p className="text-xs text-purple-600 font-semibold">Timeline-Events</p>
        </div>
      </div>

      {selectedEvent && (
        <EventDetailsPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          caseData={caseData}
        />
      )}
    </div>
  );
}