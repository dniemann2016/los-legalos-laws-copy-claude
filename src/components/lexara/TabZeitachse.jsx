import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Sparkles, ChevronDown, ChevronRight, Edit2, Check, X, AlertCircle, Target, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TabZeitachse({ caseId, caseData, onUpdate }) {
  const [timeline, setTimeline] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [taktiken, setTaktiken] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [selectedPhase, setSelectedPhase] = useState(null);

  useEffect(() => {
    loadTimeline();
  }, [caseId]);

  const loadTimeline = async () => {
    const [fristen, args, evidence] = await Promise.all([
      base44.entities.Deadline.filter({ case_id: caseId }),
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
    ]);

    const events = [];

    // Add deadlines
    fristen.forEach(f => {
      events.push({
        id: `deadline-${f.id}`,
        date: new Date(f.due_date),
        type: "deadline",
        label: f.title,
        data: f,
        side: f.side === "Gegner" ? "gegner" : "eigen",
        icon: "📅",
      });
    });

    // Add arguments
    args.forEach(a => {
      events.push({
        id: `arg-${a.id}`,
        date: new Date(caseData?.created_date || new Date()),
        type: "argument",
        label: a.title,
        data: a,
        side: a.side,
        icon: a.side === "eigen" ? "⚖️" : "🔴",
      });
    });

    // Add evidence
    evidence.forEach(e => {
      events.push({
        id: `ev-${e.id}`,
        date: new Date(caseData?.created_date || new Date()),
        type: "evidence",
        label: e.title,
        data: e,
        icon: "📄",
      });
    });

    // Sort by date
    events.sort((a, b) => a.date - b.date);
    setTimeline(events);
    setLoaded(true);
  };

  const runTaktikAnalyse = async () => {
    if (!loaded) return;
    setAnalyzing(true);

    const fristen = timeline.filter(e => e.type === "deadline");
    const args = timeline.filter(e => e.type === "argument");
    const eigeArgs = args.filter(a => a.side === "eigen").map(a => a.label).join(", ");
    const gegnerArgs = args.filter(a => a.side === "gegner").map(a => a.label).join(", ");

    const result = await base44.integrations.Core.InvokeLLM({
      model: "gpt_5",
      prompt: `Du bist Prozessstratege. Analysiere die Prozesschronologie und erstelle ALLE möglichen Gegner-Taktiken.

Eigene Argumente: ${eigeArgs || "keine"}
Gegner-Argumente: ${gegnerArgs || "keine"}
Fristen: ${fristen.map(f => `${f.label} (${f.data.side})`).join(", ") || "keine"}
Ziel: ${caseData?.prozessziel || "unbekannt"}

Generiere eine kombinatorische Matrix aller möglichen Gegner-Szenarien:
1. Zu jeder Frist: Was könnte der Gegner bezwecken?
2. Zu jedem Argument: Wie könnte der Gegner gegenargumentieren?
3. Cross-Taktiken: Welche Kombinationen sind wahrscheinlich?
4. Für jedes Szenario: Wie kontern wir strategisch optimal?`,
      response_json_schema: {
        type: "object",
        properties: {
          gegner_szenarien: {
            type: "array",
            items: {
              type: "object",
              properties: {
                szenario: { type: "string" },
                wahrscheinlichkeit: { type: "number", enum: [1, 2, 3, 4, 5] },
                fristen_betroffen: { type: "array", items: { type: "string" } },
                gegner_argumente: { type: "array", items: { type: "string" } },
                unsere_konter: { type: "array", items: { type: "string" } },
                kritisch: { type: "boolean" },
              }
            }
          },
          strategische_checkpoints: {
            type: "array",
            items: {
              type: "object",
              properties: {
                zeitpunkt: { type: "string" },
                aktion: { type: "string" },
                grund: { type: "string" },
              }
            }
          },
          risikozone: { type: "string" },
        }
      }
    });

    setTaktiken(result);
    setAnalyzing(false);
  };

  const startEdit = (event) => {
    setEditingId(event.id);
    setEditData({ ...event });
  };

  const saveEdit = async () => {
    if (!editingId || !editData.data) return;
    
    const [type, entityId] = editingId.split("-");
    const entity = type === "deadline" ? "Deadline" : type === "argument" ? "Argument" : "Evidence";
    
    await base44.entities[entity].update(entityId, {
      ...editData.data,
      strategische_notiz: editData.data.strategische_notiz || "",
    });

    loadTimeline();
    setEditingId(null);
  };

  if (!loaded) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>;

  const phases = [];
  timeline.forEach((event, i) => {
    const phase = {
      date: event.date.toLocaleDateString("de-DE", { month: "short", day: "numeric" }),
      events: [event],
      index: i,
    };
    const existing = phases.find(p => p.date === phase.date);
    if (existing) existing.events.push(event);
    else phases.push(phase);
  });

  return (
    <div className="space-y-6">
      {/* Header & Control */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">⏳ Prozesschronologie & Strategiepunkte</h3>
            <p className="text-xs text-gray-500 mt-1">KI-gestützte Gegner-Taktik-Analyse</p>
          </div>
          <Button
            onClick={runTaktikAnalyse}
            disabled={analyzing}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-xl gap-1.5"
          >
            {analyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {analyzing ? "Analysiere…" : "KI-Szenarien"}
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-300 via-gray-200 to-transparent" />

        <div className="space-y-6 pl-24">
          {phases.map((phase, idx) => (
            <div key={idx} className="relative">
              {/* Date marker */}
              <div className="absolute -left-16 top-2 text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                {phase.date}
              </div>

              {/* Timeline dot */}
              <div className="absolute -left-10 top-3 w-6 h-6 rounded-full bg-white border-2 border-gray-900 flex items-center justify-center text-[10px] font-bold text-gray-900">
                {phase.index + 1}
              </div>

              {/* Events */}
              <div className="space-y-3">
                {phase.events.map((event) => (
                  <div
                    key={event.id}
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${
                      event.type === "deadline"
                        ? "bg-amber-50 border-amber-200 hover:border-amber-300"
                        : event.type === "argument"
                          ? event.side === "eigen"
                            ? "bg-blue-50 border-blue-200 hover:border-blue-300"
                            : "bg-red-50 border-red-200 hover:border-red-300"
                          : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedPhase(event.id)}
                  >
                    {editingId === event.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editData.label || ""}
                          onChange={e => setEditData({ ...editData, label: e.target.value })}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        />
                        <textarea
                          value={editData.data?.strategische_notiz || ""}
                          onChange={e => setEditData({ ...editData, data: { ...editData.data, strategische_notiz: e.target.value } })}
                          placeholder="Strategische Überlegung..."
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                          rows="2"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit} className="bg-green-600 hover:bg-green-700 text-white text-xs">
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="text-xs">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{event.icon}</span>
                            <p className="text-sm font-semibold text-gray-900">{event.label}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              event.type === "deadline" ? "bg-amber-100 text-amber-700" :
                              event.side === "eigen" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                            }`}>
                              {event.type === "deadline" ? "FRIST" : event.side === "eigen" ? "EIGENES ARG" : "GEGNER-ARG"}
                            </span>
                          </div>
                          {event.data?.description && <p className="text-xs text-gray-600 mt-1">{event.data.description}</p>}
                          {event.data?.strategische_notiz && <p className="text-xs text-gray-500 mt-1 italic">💡 {event.data.strategische_notiz}</p>}
                          {event.data?.strength && <p className="text-xs text-gray-500 mt-1">Stärke: {event.data.strength}/10</p>}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(event); }}
                          className="text-gray-400 hover:text-gray-600 ml-2"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gegner-Szenarien */}
      {taktiken && (
        <div className="space-y-4">
          {/* Risikozone */}
          {taktiken.risikozone && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 text-sm">⚠️ Kritische Risikozone</p>
                  <p className="text-sm text-red-800 mt-1">{taktiken.risikozone}</p>
                </div>
              </div>
            </div>
          )}

          {/* Szenarien */}
          {(taktiken.gegner_szenarien || []).length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">🎯 Gegner-Szenarien (kombinatorisch)</p>
              <div className="space-y-3">
                {taktiken.gegner_szenarien.map((szenario, i) => (
                  <div
                    key={i}
                    className={`border rounded-xl p-3 space-y-2 cursor-pointer transition-all ${
                      szenario.kritisch
                        ? "bg-red-50 border-red-200 hover:border-red-300"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{szenario.szenario}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {Array(szenario.wahrscheinlichkeit).fill(0).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          ))}
                          <span className="text-xs text-gray-500">Wahrscheinlichkeit: {szenario.wahrscheinlichkeit}/5</span>
                        </div>
                      </div>
                      {szenario.kritisch && <span className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded font-bold">KRITISCH</span>}
                    </div>

                    {szenario.fristen_betroffen && szenario.fristen_betroffen.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 font-semibold mb-1">📅 Fristen-Bezug:</p>
                        <div className="flex flex-wrap gap-1">
                          {szenario.fristen_betroffen.map((f, j) => (
                            <span key={j} className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {szenario.gegner_argumente && szenario.gegner_argumente.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 font-semibold mb-1">🔴 Gegner-Argumente:</p>
                        <ul className="text-xs text-gray-700 space-y-0.5">
                          {szenario.gegner_argumente.map((a, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span>•</span> {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {szenario.unsere_konter && szenario.unsere_konter.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                        <p className="text-xs text-green-700 font-semibold mb-1">✅ Unsere Gegenmaßnahmen:</p>
                        <ul className="text-xs text-green-800 space-y-0.5">
                          {szenario.unsere_konter.map((k, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <span>→</span> {k}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategische Checkpoints */}
          {(taktiken.strategische_checkpoints || []).length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">🎯 Strategische Meilensteine</p>
              <div className="space-y-2">
                {taktiken.strategische_checkpoints.map((cp, i) => (
                  <div key={i} className="flex items-start gap-3 pb-2 border-b border-gray-100 last:border-0 last:pb-0">
                    <Target className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{cp.zeitpunkt}</p>
                      <p className="text-xs text-gray-600">{cp.aktion}</p>
                      <p className="text-xs text-blue-600 mt-0.5">💡 {cp.grund}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!taktiken && !analyzing && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-blue-900">Starte die KI-Analyse um kombinatorische Gegner-Szenarien zu generieren</p>
        </div>
      )}
    </div>
  );
}