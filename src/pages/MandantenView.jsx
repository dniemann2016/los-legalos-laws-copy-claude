import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { sendMandantUpdate } from "@/functions/sendMandantUpdate";
import { Calendar, TrendingUp, Scale, Mail, CheckCircle, Clock, AlertCircle } from "lucide-react";

function PrognoseRing({ value = 0 }) {
  const r = 30, circ = 2 * Math.PI * r, offset = circ - (value / 100) * circ;
  const color = value >= 60 ? "#16a34a" : value >= 40 ? "#d97706" : "#dc2626";
  return (
    <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="#f3f4f6" strokeWidth="5" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x="40" y="40" dominantBaseline="central" textAnchor="middle"
        style={{ transform: "rotate(90deg)", transformOrigin: "40px 40px", fontSize: 16, fontWeight: 700, fill: color }}>
        {Math.round(value)}%
      </text>
    </svg>
  );
}

export default function MandantenView() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get("id");
  const [caseData, setCaseData] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [args, setArgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    loadData();
  }, [caseId]);

  const loadData = async () => {
    setLoading(true);
    const [cases, dl, argList] = await Promise.all([
      base44.entities.Case.filter({ id: caseId }),
      base44.entities.Deadline.filter({ case_id: caseId }),
      base44.entities.Argument.filter({ case_id: caseId }),
    ]);
    setCaseData(cases[0] || null);
    setDeadlines(dl.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)));
    setArgs(argList.filter(a => a.side === "eigen"));
    setLoading(false);
  };

  const handleSendEmail = async () => {
    if (!recipientEmail.trim()) return;
    setSendingEmail(true);
    await sendMandantUpdate({ caseId, recipientEmail });
    setSendingEmail(false);
    setEmailSent(true);
    setShowEmailForm(false);
    setTimeout(() => setEmailSent(false), 4000);
  };

  if (!caseId) return <div className="min-h-screen flex items-center justify-center text-gray-400">Kein Fall ausgewählt.</div>;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>;
  if (!caseData) return <div className="min-h-screen flex items-center justify-center text-gray-400">Fall nicht gefunden.</div>;

  const nextDeadline = deadlines.find(d => d.status === "offen" && new Date(d.due_date) >= new Date());
  const daysUntil = nextDeadline ? Math.ceil((new Date(nextDeadline.due_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const completedDeadlines = deadlines.filter(d => d.status === "erledigt").length;
  const progressPct = deadlines.length > 0 ? Math.round((completedDeadlines / deadlines.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Mandantenportal</p>
            <h1 className="text-lg font-bold text-gray-900">{caseData.fallname}</h1>
            {caseData.aktenzeichen && <p className="text-xs text-gray-400">{caseData.aktenzeichen}</p>}
          </div>
          <div className="flex items-center gap-2">
            {emailSent && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> E-Mail gesendet</span>}
            <button onClick={() => setShowEmailForm(!showEmailForm)}
              className="flex items-center gap-2 text-xs bg-gray-900 text-white px-3 py-2 rounded-xl hover:bg-gray-700 transition-colors">
              <Mail className="w-3.5 h-3.5" /> Update senden
            </button>
          </div>
        </div>
      </div>

      {showEmailForm && (
        <div className="bg-white border-b border-gray-100 px-6 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <input type="email" placeholder="Mandanten-E-Mail..." value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <button onClick={handleSendEmail} disabled={sendingEmail || !recipientEmail.trim()}
              className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm hover:bg-gray-700 disabled:opacity-50">
              {sendingEmail ? "Senden..." : "Jetzt senden"}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        {/* Status-Banner */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-6">
          <PrognoseRing value={caseData.prognose || 0} />
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">Erfolgsprognose</p>
            <div className="flex gap-4 mt-3 flex-wrap">
              {caseData.rechtsgebiet && <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{caseData.rechtsgebiet}</span>}
              {caseData.instanz && <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{caseData.instanz}</span>}
              {caseData.status && <span className="text-xs bg-green-50 text-green-700 rounded-full px-2 py-0.5">{caseData.status}</span>}
            </div>
            {caseData.gericht && <p className="text-xs text-gray-400 mt-2">Gericht: {caseData.gericht}</p>}
          </div>
        </div>

        {/* Nächste Frist */}
        <div className={`rounded-2xl border p-5 ${!nextDeadline ? "bg-white border-gray-100" : daysUntil <= 7 ? "bg-red-50 border-red-100" : daysUntil <= 14 ? "bg-amber-50 border-amber-100" : "bg-white border-gray-100"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">Nächste Frist</h2>
          </div>
          {nextDeadline ? (
            <div>
              <p className="font-semibold text-gray-900">{nextDeadline.title}</p>
              <p className="text-sm text-gray-600 mt-1">{new Date(nextDeadline.due_date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</p>
              <p className={`text-sm font-medium mt-1 ${daysUntil <= 7 ? "text-red-600" : daysUntil <= 14 ? "text-amber-600" : "text-green-600"}`}>
                {daysUntil <= 0 ? "Überfällig!" : `noch ${daysUntil} Tage`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Keine offenen Fristen</p>
          )}
        </div>

        {/* Fallfortschritt */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">Fallfortschritt</h2>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-sm font-semibold text-gray-700">{progressPct}%</span>
          </div>
          <p className="text-xs text-gray-400">{completedDeadlines} von {deadlines.length} Meilensteinen abgeschlossen</p>
          <div className="mt-3 space-y-1">
            {deadlines.slice(0, 5).map(d => (
              <div key={d.id} className="flex items-center gap-2 text-xs">
                {d.status === "erledigt" ? <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> :
                  d.status === "versaeumt" ? <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" /> :
                  <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                <span className={`${d.status === "erledigt" ? "text-gray-400 line-through" : "text-gray-700"}`}>{d.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Aktuelle Strategie (ohne interne KI-Details) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">Ihre Rechtsstrategie</h2>
          </div>
          {caseData.prozessziel && (
            <div className="mb-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Prozessziel</p>
              <p className="text-sm text-gray-700">{caseData.prozessziel}</p>
            </div>
          )}
          {caseData.zentrale_rechtsfrage && (
            <div className="mb-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Zentrale Rechtsfrage</p>
              <p className="text-sm text-gray-700">{caseData.zentrale_rechtsfrage}</p>
            </div>
          )}
          {args.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Unsere stärksten Argumente</p>
              <div className="space-y-1.5">
                {args.sort((a, b) => (b.strength || 0) - (a.strength || 0)).slice(0, 3).map(a => (
                  <div key={a.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-900 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{a.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!caseData.prozessziel && !caseData.zentrale_rechtsfrage && args.length === 0 && (
            <p className="text-sm text-gray-400">Strategie wird noch ausgearbeitet.</p>
          )}
        </div>
      </div>
    </div>
  );
}