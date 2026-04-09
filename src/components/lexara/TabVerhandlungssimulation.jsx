import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, RefreshCw, Bot, User, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLLEN = [
  { id: "anwalt_gegner", label: "Gegnerischer Anwalt", desc: "Aggressiv, taktisch, sucht Schwachstellen", emoji: "⚖️" },
  { id: "richter", label: "Kritischer Richter", desc: "Hinterfragt beide Seiten, skeptisch, präzise", emoji: "🧑‍⚖️" },
  { id: "verhandlungsfuehrer", label: "Verhandlungsführer (Harvard)", desc: "Win-Win orientiert, sachlich, lösungsfokussiert", emoji: "🤝" },
  { id: "mandant_gegner", label: "Gegnerischer Mandant", desc: "Emotional, stur, will maximalen Druck", emoji: "😤" },
];

const SZENARIEN = [
  { id: "eroefffnung", label: "Verhandlungseröffnung", desc: "Erste Positionierung und Weichenstellung" },
  { id: "beweisangriff", label: "Beweisangriff", desc: "Gegner greift Ihre Hauptbeweise an" },
  { id: "vergleich", label: "Vergleichsverhandlung", desc: "Annäherung auf einen Vergleich" },
  { id: "kreuzverhör", label: "Kreuzverhör Zeuge", desc: "Glaubwürdigkeit eines Zeugen testen" },
  { id: "plädoyer", label: "Schlussplädoyer", desc: "Finale Argumentation vor Urteilsfindung" },
];

export default function TabVerhandlungssimulation({ caseId, caseData }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [gewaehltRolle, setGewaehltRolle] = useState(null);
  const [gewaehltSzenario, setGewaehltSzenario] = useState(null);
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [started, setStarted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [urteilsAnalyse, setUrteilsAnalyse] = useState(null);
  const [showUrteil, setShowUrteil] = useState(false);
  const [urteilLoading, setUrteilLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
    ]).then(([a, e]) => { setArgs(a); setEvidence(e); });
  }, [caseId]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startSession = async () => {
    if (!gewaehltRolle || !gewaehltSzenario) return;
    setStarted(true);
    setLoading(true);
    const rolle = ROLLEN.find(r => r.id === gewaehltRolle);
    const szenario = SZENARIEN.find(s => s.id === gewaehltSzenario);
    const eigeneArgs = args.filter(a => a.side === "eigen");
    const gegnerArgs = args.filter(a => a.side === "gegner");

    const systemContext = `Fall: ${caseData?.fallname || ""} | ${caseData?.rechtsgebiet || ""} | Streitwert: ${caseData?.streitwert ? `${caseData.streitwert.toLocaleString("de-DE")}€` : "unbekannt"} | Prognose: ${caseData?.prognose || 0}%
Eigene Argumente: ${eigeneArgs.map(a => `${a.title} (${a.strength}/10)`).join(", ") || "keine"}
Gegnerargumente: ${gegnerArgs.map(a => `${a.title} (${a.strength}/10)`).join(", ") || "keine"}`;

    const opening = await base44.integrations.Core.InvokeLLM({
      prompt: `Du spielst die Rolle: ${rolle.label} (${rolle.desc}).
Szenario: ${szenario.label} – ${szenario.desc}
Fallkontext: ${systemContext}

Beginne die Verhandlungssimulation mit deiner Eröffnung. Bleibe strikt in deiner Rolle, sei konkret auf den Fall bezogen und herausfordernd für den Anwalt. Maximal 3-4 Sätze als Einstieg.`,
    });

    setMessages([{ role: "ki", content: opening, rolle: rolle.label, emoji: rolle.emoji }]);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    const rolle = ROLLEN.find(r => r.id === gewaehltRolle);
    const szenario = SZENARIEN.find(s => s.id === gewaehltSzenario);
    const eigeneArgs = args.filter(a => a.side === "eigen");
    const gegnerArgs = args.filter(a => a.side === "gegner");

    const verlauf = messages.map(m => `${m.role === "user" ? "ANWALT" : rolle?.label}: ${m.content}`).join("\n");

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du spielst die Rolle: ${rolle?.label} (${rolle?.desc}).
Szenario: ${szenario?.label} – ${szenario?.desc}
Fallkontext: Fall "${caseData?.fallname}", ${caseData?.rechtsgebiet}, Prognose ${caseData?.prognose || 0}%.
Eigene Argumente: ${eigeneArgs.map(a => `${a.title} (${a.strength}/10)`).join(", ") || "keine"}
Gegnerargumente: ${gegnerArgs.map(a => `${a.title} (${a.strength}/10)`).join(", ") || "keine"}

BISHERIGER VERLAUF:
${verlauf}

ANWALT: ${userMsg}

Antworte als ${rolle?.label}. Bleibe in der Rolle, sei konkret, herausfordernd und beziehe dich auf die konkreten Argumente des Falls. Maximal 3-4 Sätze.`,
    });

    setMessages(prev => [...prev, { role: "ki", content: res, rolle: rolle?.label, emoji: rolle?.emoji }]);
    setLoading(false);
  };

  const requestFeedback = async () => {
    setShowFeedback(true);
    setLoading(true);
    const verlauf = messages.map(m => `${m.role === "user" ? "ANWALT" : "GEGNER"}: ${m.content}`).join("\n");

    const fb = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener Anwalts-Coach. Analysiere folgende Verhandlungssimulation und gib konstruktives Feedback:

SZENARIO: ${SZENARIEN.find(s => s.id === gewaehltSzenario)?.label}
FALL: ${caseData?.fallname}, ${caseData?.rechtsgebiet}

VERLAUF:
${verlauf}

Bewerte: Argumentationsqualität, taktisches Vorgehen, Reaktion auf Angriffe, Verhandlungsführung. Sei konkret und konstruktiv.`,
      response_json_schema: {
        type: "object",
        properties: {
          gesamtnote: { type: "number" },
          staerken: { type: "array", items: { type: "string" } },
          schwaechen: { type: "array", items: { type: "string" } },
          verpasste_chancen: { type: "array", items: { type: "string" } },
          empfehlungen: { type: "array", items: { type: "string" } },
          fazit: { type: "string" },
        }
      }
    });

    setFeedback(fb);
    setLoading(false);
  };

  const analyzeUrteil = async () => {
    setUrteilLoading(true);
    setShowUrteil(true);
    const eigeneArgs = args.filter(a => a.side === "eigen");
    const gegnerArgs = args.filter(a => a.side === "gegner");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener Richter und Prozessstratege. Analysiere diesen Fall:

Fall: "${caseData?.fallname}" | ${caseData?.rechtsgebiet || ""} | Gericht: ${caseData?.gericht || ""}
Streitwert: ${caseData?.streitwert ? caseData.streitwert.toLocaleString("de-DE") + "€" : "unbekannt"}

Eigene Argumente: ${eigeneArgs.map(a => `"${a.title}" (manuell:${a.strength||5}, KI:${a.ki_strength??"n/a"})`).join(", ") || "keine"}
Gegnerargumente: ${gegnerArgs.map(a => `"${a.title}" (manuell:${a.strength||5}, KI:${a.ki_strength??"n/a"})`).join(", ") || "keine"}
Beweise: ${evidence.map(e => `"${e.title}" Typ:${e.type||""} (manuell:${e.weight||5}, KI:${e.ki_weight??"n/a"})`).join(", ") || "keine"}

Berechne:
1. Wahrscheinlichkeit eines erfolgreichen Urteils für uns (%)
2. Liste spezifischer Gegenargumente der Gegenseite (mind. 5, direkt auf unsere Argumente bezogen)
3. Welche Beweise könnte die Gegenseite angreifen und wie?
4. Kritische Rechtsfragen die der Richter stellen wird`,
      response_json_schema: {
        type: "object",
        properties: {
          erfolgswahrscheinlichkeit: { type: "number" },
          begruendung: { type: "string" },
          gegenargumente: { type: "array", items: { type: "object", properties: { argument: { type: "string" }, zielt_auf: { type: "string" }, staerke: { type: "number" } }, required: ["argument"] } },
          beweisangriffe: { type: "array", items: { type: "object", properties: { beweis: { type: "string" }, angriff: { type: "string" } }, required: ["beweis", "angriff"] } },
          richter_fragen: { type: "array", items: { type: "string" } },
        }
      }
    });
    setUrteilsAnalyse(res);
    setUrteilLoading(false);
  };

  const reset = () => {
    setMessages([]);
    setStarted(false);
    setFeedback(null);
    setShowFeedback(false);
    setGewaehltRolle(null);
    setGewaehltSzenario(null);
    setUrteilsAnalyse(null);
    setShowUrteil(false);
  };

  if (!started) {
    return (
      <div className="space-y-5">
        {/* Urteilswahrscheinlichkeit */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <button onClick={() => showUrteil ? setShowUrteil(false) : analyzeUrteil()}
            className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 text-left">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">KI-Urteilsprognose & Gegenargumente</p>
              <p className="text-xs text-gray-400">Erfolgswahrscheinlichkeit + spezifische Gegenargumente der Gegenseite</p>
            </div>
            {urteilsAnalyse && (showUrteil ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />)}
          </button>
          {showUrteil && (
            <div className="border-t border-gray-100 p-4 space-y-4">
              {urteilLoading ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm py-4 justify-center">
                  <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                  KI analysiert…
                </div>
              ) : urteilsAnalyse && (
                <>
                  <div className="bg-gray-900 text-white rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-1">Erfolgswahrscheinlichkeit</p>
                    <div className="flex items-end gap-3">
                      <p className="text-3xl font-bold">{urteilsAnalyse.erfolgswahrscheinlichkeit}%</p>
                      <div className="flex-1 pb-1"><div className="h-1.5 bg-gray-700 rounded-full"><div className="h-full bg-green-400 rounded-full" style={{width:`${urteilsAnalyse.erfolgswahrscheinlichkeit}%`}} /></div></div>
                    </div>
                    {urteilsAnalyse.begruendung && <p className="text-xs text-gray-300 mt-2">{urteilsAnalyse.begruendung}</p>}
                  </div>

                  {(urteilsAnalyse.gegenargumente||[]).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">🔴 Spezifische Gegenargumente ({urteilsAnalyse.gegenargumente.length})</p>
                      <div className="space-y-1.5">
                        {urteilsAnalyse.gegenargumente.map((g, i) => (
                          <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-3">
                            <p className="text-xs font-medium text-red-800">{g.argument}</p>
                            {g.zielt_auf && <p className="text-[10px] text-red-500 mt-0.5">→ Zielt auf: {g.zielt_auf}</p>}
                            {g.staerke && <p className="text-[10px] text-gray-400">Stärke: {g.staerke}/10</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(urteilsAnalyse.beweisangriffe||[]).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">📎 Beweisangriffe des Gegners</p>
                      <div className="space-y-1.5">
                        {urteilsAnalyse.beweisangriffe.map((b, i) => (
                          <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                            <p className="text-xs font-semibold text-amber-800">{b.beweis}</p>
                            <p className="text-xs text-amber-700 mt-0.5">{b.angriff}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(urteilsAnalyse.richter_fragen||[]).length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">🧑‍⚖️ Erwartete Richterfragen</p>
                      <div className="space-y-1">
                        {urteilsAnalyse.richter_fragen.map((f, i) => (
                          <p key={i} className="text-xs text-gray-700 flex gap-2"><span className="text-blue-400">?</span>{f}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={analyzeUrteil} className="text-xs text-violet-600 hover:underline flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Neu berechnen
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">🎭 Verhandlungssimulation</h3>
          <p className="text-xs text-gray-500">Der KI-Berater übernimmt eine Gegenrolle – testen Sie Ihre Argumentationsstrategie in einer realistischen Simulation.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-700 mb-3">1. Wählen Sie die Gegenrolle</p>
          <div className="grid grid-cols-2 gap-2">
            {ROLLEN.map(r => (
              <button key={r.id} onClick={() => setGewaehltRolle(r.id)}
                className={`text-left p-3 rounded-xl border transition-all ${gewaehltRolle === r.id ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 hover:border-gray-400"}`}>
                <div className="text-lg mb-1">{r.emoji}</div>
                <p className={`text-xs font-semibold ${gewaehltRolle === r.id ? "text-white" : "text-gray-800"}`}>{r.label}</p>
                <p className={`text-[10px] mt-0.5 ${gewaehltRolle === r.id ? "text-gray-300" : "text-gray-500"}`}>{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-700 mb-3">2. Wählen Sie das Szenario</p>
          <div className="space-y-2">
            {SZENARIEN.map(s => (
              <button key={s.id} onClick={() => setGewaehltSzenario(s.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${gewaehltSzenario === s.id ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"}`}>
                <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${gewaehltSzenario === s.id ? "border-gray-900 bg-gray-900" : "border-gray-300"}`} />
                <div>
                  <p className="text-xs font-semibold text-gray-800">{s.label}</p>
                  <p className="text-[10px] text-gray-500">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Button onClick={startSession} disabled={!gewaehltRolle || !gewaehltSzenario} className="w-full bg-gray-900 text-white rounded-xl">
          🎬 Simulation starten
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {ROLLEN.find(r => r.id === gewaehltRolle)?.emoji} {ROLLEN.find(r => r.id === gewaehltRolle)?.label}
            <span className="text-gray-400 font-normal"> · </span>
            {SZENARIEN.find(s => s.id === gewaehltSzenario)?.label}
          </p>
          <p className="text-xs text-gray-400">{caseData?.fallname}</p>
        </div>
        <div className="flex gap-2">
          {messages.length >= 4 && !showFeedback && (
            <Button size="sm" variant="outline" onClick={requestFeedback} className="rounded-xl text-xs h-8">📊 Feedback</Button>
          )}
          <Button size="sm" variant="outline" onClick={reset} className="rounded-xl text-xs h-8">↩ Neu</Button>
        </div>
      </div>

      {/* Chat */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 min-h-[400px] max-h-[500px] overflow-y-auto flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "ki" && (
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm">{m.emoji}</div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.role === "user" ? "bg-gray-900 text-white" : "bg-gray-50 border border-gray-100"}`}>
              {m.role === "ki" && <p className="text-[10px] font-semibold text-gray-400 mb-1">{m.rolle}</p>}
              <p className="text-sm leading-relaxed">{m.content}</p>
            </div>
            {m.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-gray-400"
          placeholder="Ihr Argument / Ihre Antwort als Anwalt…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          disabled={loading}
        />
        <Button onClick={sendMessage} disabled={!input.trim() || loading} className="bg-gray-900 text-white rounded-xl px-4">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Feedback */}
      {showFeedback && feedback && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">📊 Coach-Feedback</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Gesamtnote</span>
              <span className={`text-lg font-bold ${feedback.gesamtnote >= 7 ? "text-green-600" : feedback.gesamtnote >= 5 ? "text-amber-500" : "text-red-600"}`}>{feedback.gesamtnote}/10</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(feedback.staerken || []).length > 0 && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-700 mb-2">✅ Stärken</p>
                {feedback.staerken.map((s, i) => <p key={i} className="text-xs text-green-800">• {s}</p>)}
              </div>
            )}
            {(feedback.schwaechen || []).length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-700 mb-2">⚠️ Schwächen</p>
                {feedback.schwaechen.map((s, i) => <p key={i} className="text-xs text-red-800">• {s}</p>)}
              </div>
            )}
            {(feedback.verpasste_chancen || []).length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-2">💡 Verpasste Chancen</p>
                {feedback.verpasste_chancen.map((s, i) => <p key={i} className="text-xs text-amber-800">• {s}</p>)}
              </div>
            )}
            {(feedback.empfehlungen || []).length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-700 mb-2">🎯 Empfehlungen</p>
                {feedback.empfehlungen.map((s, i) => <p key={i} className="text-xs text-blue-800">• {s}</p>)}
              </div>
            )}
          </div>

          {feedback.fazit && (
            <div className="bg-gray-900 text-white rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Fazit</p>
              <p className="text-sm">{feedback.fazit}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}