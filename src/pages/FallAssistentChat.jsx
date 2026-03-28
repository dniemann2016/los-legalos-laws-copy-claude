import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, Plus, MessageSquare, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const QUICK_PROMPTS = [
  "Zeige mir alle offenen Fristen",
  "Welche Fälle haben die höchste Erfolgswahrscheinlichkeit?",
  "Analysiere die Argumente im aktuellen Fall",
  "Erstelle einen neuen Fall für mich",
  "Welche kritischen Fristen laufen diese Woche ab?",
  "Gib mir eine Übersicht aller aktiven Fälle",
];

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">L</span>
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? "items-end flex flex-col" : ""}`}>
        {message.content && (
          <div className={`rounded-2xl px-4 py-2.5 ${isUser ? "bg-gray-900 text-white" : "bg-white border border-gray-100"}`}>
            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <ReactMarkdown className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {message.tool_calls?.length > 0 && (
          <div className="mt-1 space-y-1">
            {message.tool_calls.map((tc, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${tc.status === "completed" ? "bg-green-400" : tc.status === "running" || tc.status === "in_progress" ? "bg-orange-400 animate-pulse" : "bg-gray-300"}`} />
                <span>{tc.name?.split(".").reverse().join(" ").toLowerCase()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FallAssistentChat() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    if (!activeConv) return;
    const unsub = base44.agents.subscribeToConversation(activeConv.id, (data) => {
      setMessages(data.messages || []);
      setSending(false);
    });
    return unsub;
  }, [activeConv?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    const convs = await base44.agents.listConversations({ agent_name: "fall_assistent" });
    setConversations(convs || []);
    setLoading(false);
  };

  const newConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: "fall_assistent",
      metadata: { name: `Gespräch ${new Date().toLocaleDateString("de-DE")}` },
    });
    setActiveConv(conv);
    setMessages([]);
    setConversations(prev => [conv, ...prev]);
  };

  const openConversation = async (conv) => {
    const full = await base44.agents.getConversation(conv.id);
    setActiveConv(full);
    setMessages(full.messages || []);
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);

    let conv = activeConv;
    if (!conv) {
      conv = await base44.agents.createConversation({
        agent_name: "fall_assistent",
        metadata: { name: msg.slice(0, 40) },
      });
      setActiveConv(conv);
      setConversations(prev => [conv, ...prev]);
    }

    setMessages(prev => [...prev, { role: "user", content: msg }]);
    await base44.agents.addMessage(conv, { role: "user", content: msg });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <Link to="/modules" className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Zurück
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
              <span className="text-white text-xs font-bold">L</span>
            </div>
            <h1 className="font-bold text-gray-900 text-sm">Lex · Fall-Assistent</h1>
          </div>
          <p className="text-xs text-gray-400">Juristischer KI-Assistent</p>
        </div>

        <div className="p-3">
          <button onClick={newConversation}
            className="w-full flex items-center gap-2 bg-gray-900 text-white rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" /> Neues Gespräch
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <div className="text-center text-xs text-gray-400 py-4">Lädt...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-xs text-gray-400 py-4">Noch keine Gespräche</div>
          ) : conversations.map(conv => (
            <button key={conv.id} onClick={() => openConversation(conv)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2
                ${activeConv?.id === conv.id ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
              <span className="truncate">{conv.metadata?.name || "Gespräch"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center mb-4">
              <span className="text-white text-2xl font-bold">L</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Lex, Ihr juristischer Assistent</h2>
            <p className="text-sm text-gray-500 mb-8 text-center max-w-md">
              Ich kann Fälle analysieren, Fristen überwachen, Argumente verwalten und strategische Empfehlungen geben.
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
              {QUICK_PROMPTS.map((p) => (
                <button key={p} onClick={() => sendMessage(p)}
                  className="text-left text-sm text-gray-600 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all">
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
            {sending && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">L</span>
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
        )}

        {/* Input */}
        <div className="bg-white border-t border-gray-100 p-4">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Juristische Frage stellen oder Fall-Daten verwalten..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 focus:bg-white transition-colors"
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || sending}
              className="bg-gray-900 text-white rounded-xl px-4 py-3 hover:bg-gray-800 disabled:opacity-40 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}