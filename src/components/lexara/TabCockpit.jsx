import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Sparkles, AlertTriangle, CheckCircle2, Clock, Target, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

function PrognoseGauge({ value = 0 }) {
  const color = value >= 65 ? "#16a34a" : value >= 40 ? "#d97706" : "#dc2626";
  const r = 52, circ = Math.PI * r, offset = circ - (value / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="68" viewBox="0 0 120 68">
        <path d={`M 14 60 A ${r} ${r} 0 0 1 106 60`} fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" />
        <path d={`M 14 60 A ${r} ${r} 0 0 1 106 60`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="text-2xl font-bold -mt-8" style={{ color }}>{value}%</div>
      <div className="text-xs text-gray-400 mt-0.5">Erfolgswahrscheinlichkeit</div>
    </div>
  );
}

export default function TabCockpit({ caseId, caseData }) {
  const [deadlines, setDeadlines] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [args, setArgs] = useState([]);
  const [lastMinute, setLastMinute] = useState(null);
  const [loadingCheck, setLoadingCheck] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Deadline.filter({ case_id: caseId }),
      base44.entities.Task.filter({ case_id: caseId }),
      base44.entities.Argument.filter({ case_id: caseId }),
    ]).then(([d, t, a]) => { setDeadlines(d); setTasks(t); setArgs(a); });
  }, [caseId]);

  const now = new Date();

  const urgentTasks = tasks
    .filter(t => t.status !== "erledigt")
    .sort((a, b) => {
      const pa = a.priority === "hoch" ? 0 : a.priority === "mittel" ? 1 : 2;
      const pb = b.priority === "hoch" ? 0 : b.priority === "mittel" ? 1 : 2;
      return pa - pb || new Date(a.due_date) - new Date(b.due_date);
    })
    .slice(0, 3);

  const upcomingDeadlines = deadlines
    .filter(d => d.status !== "erledigt" && new Date(d.due_date) >= now)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const gegnerArgs = args.filter(a => a.side === "gegner").sort((a, b) => (b.strength || 5) - (a.strength || 5)).slice(0, 4);

  const daysUntil = (d) => Math.ceil((new Date(d) - now) / 86400000);
  const formatDate = (d) => { try { return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }); } catch { return d; } };

  const runLastMinuteCheck = async () => {
    setLoadingCheck(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein Verhandlungscoach. Führe einen Last-Minute-Check für den bevorstehenden Gerichtstermin durch.

Fall: ${caseData?.fallname || ""}, ${caseData?.rechtsgebiet || ""}
Prognose: ${caseData?.prognose || 0}%
Prozessziel: ${caseData?.prozessziel || ""}

Stärkste Gegenargumente des Gegners:
${gegnerArgs.map(a => `- ${a.title} (Stärke ${a.strength || 5}/10): ${a.description || ""}`).join("\n")}

Eigene Argumente:
${args.filter(a => a.side === "eigen").slice(0, 5).map(a => `- ${a.title} (Stärke ${a.strength || 5}/10)`).join("\n")}

Liefere:
1. Die 3 gefährlichsten Angriffspunkte des Gegners mit schnellen Konterstrategien
2. Die 3 wichtigsten Dinge, die der Anwalt im Termin NICHT tun sollte
3. Einen motivierenden, prägnanten Schluss-Satz für den Anwalt`,
      response_json_schema: {
        type: "object",
        properties: {
          gefahren: { type: "array", items: { type: "object", properties: { angriff: { type: "string" }, konter: { type: "string" } } } },
          verbote: { type: "array", items: { type: "string" } },
          motiviation: { type: "string" }
        }
      }
    });
    setLastMinute(res);
    setLoadingCheck(false);
  };

  const prognose = caseData?.prognose || 0;
  const prognoseColor = prognose >= 65 ? "text-green-600" : prognose >= 40 ? "text-amber-600" : "text-red-600";
  const prognoseLabel = prognose >= 65 ? "Gute Ausgangslage" : prognose >= 40 ? "Ausgangslage unklar" : "Schwierige Ausgangslage";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">⚖️ Verhandlungs-Cockpit</h2>
          <p className="text-xs text-gray-400 mt-0.5">Alle kritischen Informationen für den Gerichtstermin auf einen Blick</p>
        </div>
        <span className={`text-xs font-medium px-3 py-1 rounded-full border ${caseData?.status === "Aktiv" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
          {caseData?.status || "Unbekannt"}
        </span>
      </div>

      {/* Top row: Prognose + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center justify-center">
          <PrognoseGauge value={prognose} />
          <span className={`text-xs font-semibold mt-1 ${prognoseColor}`}>{prognoseLabel}</span>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          {[
            { icon: "⚔️", label: "Eigene Argumente", value: args.filter(a => a.side === "eigen").length, sub: "erfasst", color: "text-blue-600" },
            { icon: "🛡️", label: "Gegner-Argumente", value: args.filter(a => a.side === "gegner").length, sub: "bekannt", color: "text-red-600" },
            { icon: "📋", label: "Offene Aufgaben", value: tasks.filter(t => t.status !== "erledigt").length, sub: "ausstehend", color: "text-amber-600" },
            { icon: "⏰", label: "Kommende Fristen", value: upcomingDeadlines.length, sub: "aktiv", color: "text-purple-600" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="text-lg mb-1">{s.icon}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
              <div className="text-[10px] text-gray-300">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Middle row: Tasks + Deadlines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 3 Tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-800">3 Dringendste To-Dos</h3>
          </div>
          {urgentTasks.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Alle Aufgaben erledigt!
            </div>
          ) : (
            <div className="space-y-3">
              {urgentTasks.map((t, i) => {
                const days = t.due_date ? daysUntil(t.due_date) : null;
                const pColor = t.priority === "hoch" ? "bg-red-100 text-red-700" : t.priority === "mittel" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600";
                return (
                  <div key={t.id} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${pColor}`}>{t.priority || "niedrig"}</span>
                        {days !== null && <span className={`text-[10px] ${days <= 3 ? "text-red-500 font-semibold" : "text-gray-400"}`}>{days === 0 ? "Heute" : days < 0 ? `${Math.abs(days)}d überfällig` : `in ${days}d`}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-800">Anstehende Fristen</h3>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-gray-400">Keine offenen Fristen.</p>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map(d => {
                const days = daysUntil(d.due_date);
                const urgent = days <= 7;
                return (
                  <div key={d.id} className={`flex items-center gap-3 rounded-xl p-2.5 ${urgent ? "bg-red-50 border border-red-100" : "bg-gray-50"}`}>
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg text-center flex-shrink-0 ${urgent ? "bg-red-500 text-white" : "bg-gray-200 text-gray-700"}`}>
                      {days === 0 ? "Heute" : `${days}d`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{d.title}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(d.due_date)} · {d.frist_type || d.side || ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Last-Minute Check */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Last-Minute-Check</h3>
              <p className="text-xs text-gray-400">KI analysiert die gefährlichsten Gegenargumente und gibt Konterstrategien</p>
            </div>
          </div>
          <Button onClick={runLastMinuteCheck} disabled={loadingCheck} size="sm"
            className="bg-red-700 hover:bg-red-800 text-white text-xs rounded-xl gap-1.5">
            {loadingCheck ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {loadingCheck ? "Analysiere…" : lastMinute ? "Neu analysieren" : "Last-Minute-Check starten"}
          </Button>
        </div>

        {/* Gegner args preview */}
        {!lastMinute && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-medium">Stärkste Gegenargumente:</p>
            {gegnerArgs.length === 0
              ? <p className="text-xs text-gray-400">Keine Gegner-Argumente erfasst.</p>
              : gegnerArgs.map(a => (
                <div key={a.id} className="flex items-center gap-3 bg-red-50 rounded-xl px-3 py-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-red-600">{a.strength || 5}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-800">{a.title}</p>
                    {a.description && <p className="text-[10px] text-gray-500 line-clamp-1">{a.description}</p>}
                  </div>
                </div>
              ))}
          </div>
        )}

        {loadingCheck && (
          <div className="flex items-center gap-3 text-gray-400 text-sm py-4 justify-center">
            <div className="w-5 h-5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
            KI analysiert Risiken…
          </div>
        )}

        {lastMinute && (
          <div className="space-y-4">
            {(lastMinute.gefahren || []).map((g, i) => (
              <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-red-50 px-4 py-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-red-700">Angriff: {g.angriff}</p>
                  </div>
                </div>
                <div className="bg-green-50 px-4 py-2.5">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-green-800">Konter: {g.konter}</p>
                  </div>
                </div>
              </div>
            ))}

            {lastMinute.verbote?.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-300 mb-2">🚫 Das darf im Termin NICHT passieren:</p>
                {lastMinute.verbote.map((v, i) => (
                  <div key={i} className="flex gap-2 text-xs text-gray-200 mb-1">
                    <span className="text-red-400">✗</span> {v}
                  </div>
                ))}
              </div>
            )}

            {lastMinute.motiviation && (
              <div className="bg-blue-900 rounded-xl p-4">
                <p className="text-[10px] text-blue-300 uppercase tracking-widest mb-1">Schluss-Wort vom Coach</p>
                <p className="text-sm text-white font-medium italic">„{lastMinute.motiviation}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}