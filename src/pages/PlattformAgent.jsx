import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { getTByLanguage } from "../lib/jurisdictionConfig";
import { useUserProfile } from "../hooks/useUserProfile";
import { ArrowLeft, Bot, Send, Zap, TrendingUp, Target, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";

const STARTER_PROMPTS = [
  { icon: "⏰", label: "Kritische Fristen identifizieren", prompt: "Analysiere ALLE Fälle in der Datenbank und identifiziere kritische bevorstehende Fristen. Markiere alle Fristen, die in den nächsten 14 Tagen fällig sind oder bereits überfällig sind. Erstelle eine priorisierte Liste und aktualisiere den Status überfälliger Fristen auf 'versaeumt'. Erstelle fehlende Standardfristen für aktive Fälle basierend auf dem Rechtsgebiet (z.B. Berufungsfrist 1 Monat ab Urteil, Revisionsbegründungsfrist etc.)." },
  { icon: "💡", label: "Argumente aus Verlaufsdaten vorschlagen", prompt: "Analysiere alle vorhandenen Argumente in der Datenbank und identifiziere Muster: Welche Argumenttypen wurden für welche Rechtsgebiete am häufigsten mit hoher Stärke (8+) bewertet? Schlage für jeden aktiven Fall (Status 'Aktiv') 3-5 zusätzliche Argumente vor, die auf historischen Mustern basieren. Erstelle diese Argumente direkt in der Datenbank für die entsprechenden Fälle." },
  { icon: "🔴", label: "Risiken & Widersprüche aufdecken", prompt: "Führe eine vollständige Risikoanalyse aller aktiven Fälle durch. Suche nach: 1) Widersprüchen zwischen eigenen Argumenten und Beweismitteln, 2) Fällen mit hoher Prognose aber schwachen Beweisen, 3) Fällen wo die Gegenseite mehr starke Argumente hat als wir, 4) Fällen ohne erfasste Schlüsselargumente, 5) Inkonsistenzen in den Fallnotizen. Erstelle einen priorisierten Risikobericht und schlage konkrete Maßnahmen vor." },
  { icon: "🔍", label: "Plattform-Audit starten", prompt: "Führe einen vollständigen Audit der Plattform durch. Analysiere alle vorhandenen Fälle, Richterprofile und Argumente. Identifiziere die 5 kritischsten Lücken und behebe sie direkt." },
  { icon: "⚖️", label: "Richterprofile vervollständigen", prompt: "Analysiere alle vorhandenen Fälle und prüfe, ob die zugehörigen Richter vollständige Profile haben. Erstelle fehlende Profile und ergänze Lücken." },
  { icon: "📊", label: "Wettbewerbsanalyse", prompt: "Vergleiche MachiavelLEX mit den führenden Kanzleisoftware-Systemen (RA-Micro, Datev Anwalt, IKAROS, Wolters Kluwer). Was sind unsere USPs? Was fehlt uns noch? Erstelle einen konkreten Aktionsplan." },
  { icon: "🎯", label: "Großkanzlei-Readiness prüfen", prompt: "Prüfe ob MachiavelLEX für eine Großkanzlei mit 50+ Anwälten bereit ist. Analysiere: Mandanten-Management, Teamkollaboration, Compliance, Reporting, Datenschutz. Gib Konkrete Empfehlungen." },
  { icon: "📋", label: "Fristen-Compliance Check", prompt: "Prüfe alle offenen Fälle auf fehlende oder überfällige Fristen. Erstelle alle fehlenden gesetzlichen Standardfristen (Berufungsfristen, Einspruchsfristen etc.) für jeden aktiven Fall." },
];

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? "items-end flex flex-col" : ""}`}>
        {message.content && (
          <div className={`rounded-2xl px-4 py-3 ${isUser ? "bg-gray-900 text-white" : "bg-white border border-gray-100"}`}>
            {isUser ? (
              <p className="text-sm">{message.content}</p>
            ) : (
              <ReactMarkdown className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {(message.tool_calls || []).map((tc, i) => (
          <div key={i} className="mt-1.5 ml-1 text-xs text-gray-500 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>{tc.status === "completed" ? "✓" : "⏳"} {tc.name?.replace(/_/g, " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlattformAgent() {
  const { language } = useUserProfile();
  const t = getTByLanguage(language);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    const unsub = base44.agents.subscribeToConversation(activeConv.id, (data) => {
      setMessages(data.messages || []);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return unsub;
  }, [activeConv?.id]);

  const loadConversations = async () => {
    setLoadingConvs(true);
    const convs = await base44.agents.listConversations({ agent_name: "plattform_optimierer" });
    setConversations(convs || []);
    setLoadingConvs(false);
  };

  const startNewConversation = async (initialPrompt) => {
    const conv = await base44.agents.createConversation({
      agent_name: "plattform_optimierer",
      metadata: { name: initialPrompt ? initialPrompt.slice(0, 50) + "…" : "Neue Sitzung" }
    });
    setActiveConv(conv);
    setMessages(conv.messages || []);
    setConversations(prev => [conv, ...prev]);
    if (initialPrompt) {
      await sendMessage(conv, initialPrompt);
    }
  };

  const sendMessage = async (conv, text) => {
    const convToUse = conv || activeConv;
    if (!convToUse || !text.trim()) return;
    setSending(true);
    setInput("");
    await base44.agents.addMessage(convToUse, { role: "user", content: text });
    setSending(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!activeConv) {
      await startNewConversation(input);
    } else {
      await sendMessage(null, input);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/modules" className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm">
              <ArrowLeft className="w-4 h-4" /> Module
            </Link>
            <span className="text-gray-200">·</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <h1 className="font-bold text-gray-900 text-sm">Plattform-Optimierer</h1>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium">KI-Agent</span>
            </div>
          </div>
          <button onClick={() => startNewConversation(null)}
            className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
            {t.newSession}
          </button>
        </div>
      </div>

      <div className="flex-1 flex max-w-6xl mx-auto w-full">
        {/* Sidebar */}
        <div className="w-56 border-r border-gray-100 bg-white flex-shrink-0 hidden md:flex flex-col">
          <div className="p-3 border-b border-gray-50">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t.sessionsLabel}</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <p className="text-xs text-gray-400 p-3">Laden…</p>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-gray-400 p-3">{t.noSessionsYet}</p>
            ) : (
              conversations.map(c => (
                <button key={c.id} onClick={() => { setActiveConv(c); setMessages(c.messages || []); }}
                  className={`w-full text-left px-3 py-2.5 text-xs border-b border-gray-50 transition-colors flex items-center gap-2 group ${activeConv?.id === c.id ? "bg-gray-50 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
                  <ChevronRight className={`w-3 h-3 flex-shrink-0 ${activeConv?.id === c.id ? "text-gray-900" : "text-gray-300 group-hover:text-gray-400"}`} />
                  <span className="truncate">{c.metadata?.name || "Sitzung"}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col">
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mb-4">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{t.platformAgentTitle}</h2>
              <p className="text-sm text-gray-500 text-center mb-8 max-w-md">
                {t.platformAgentDesc}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl mb-6">
                {STARTER_PROMPTS.map((s) => (
                  <button key={s.label} onClick={() => startNewConversation(s.prompt)}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all text-left">
                    <span className="text-xl">{s.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{s.label}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 w-full max-w-xl">
                <input value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder={t.customTaskPlaceholder}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:border-gray-400" />
                <button onClick={handleSend} disabled={!input.trim()}
                  className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-gray-700 transition-colors">
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
                  </div>
                )}
                {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
                {sending && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <div className="border-t border-gray-100 bg-white p-3">
                <div className="flex gap-2">
                  <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder={t.nextTaskPlaceholder}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400" />
                  <button onClick={handleSend} disabled={!input.trim() || sending}
                    className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-gray-700 transition-colors">
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 text-center">{t.agentNote}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}