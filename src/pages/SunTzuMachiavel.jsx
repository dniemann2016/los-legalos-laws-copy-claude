import { useState } from "react";
import { Sword, Crown, Shield, ChevronDown, ChevronUp, Loader2, FileText, AlertTriangle, Lightbulb, Target } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useJurisdiction } from "../hooks/useJurisdiction";
import { getAIContext } from "../lib/jurisdictionConfig";

const LAWS_OF_POWER = [
  "Never outshine the master","Never put too much trust in friends, learn how to use enemies",
  "Conceal your intentions","Always say less than necessary","Court attention at all costs",
  "Get others to do the work, take the credit","Make other people come to you",
  "Make others come to you – use bait if necessary","Win through your actions, never through argument",
  "Avoid the unhappy and the unlucky","Keep people dependent on you",
  "Use selective honesty to disarm your victim","Appeal to self-interest, never to mercy",
  "Pose as a friend, work as a spy","Crush your enemy totally","Use absence to increase respect and honor",
  "Keep others in suspended terror","Do not build fortresses – isolation is dangerous",
  "Know who you're dealing with","Do not commit to anyone",
];

const SUN_TZU_PRINCIPLES = [
  "Know yourself and know your enemy",
  "Supreme excellence consists in breaking the enemy's resistance without fighting",
  "All warfare is based on deception","Attack weakness, avoid strength",
  "Speed is the essence of war","Use spies to gather intelligence",
  "Win without fighting","Adapt to circumstances","Strike at the enemy's strategy",
];

export default function SunTzuMachiavel() {
  const { jurisdiction } = useJurisdiction();
  const [caseText, setCaseText] = useState("");
  const [opponent, setOpponent] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  const analyze = async () => {
    if (!caseText.trim()) return;
    setLoading(true);
    setResult(null);
    const legalCtx = getAIContext(jurisdiction);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a master strategist combining Sun Tzu's "The Art of War", Machiavelli's "The Prince", and Robert Greene's "48 Laws of Power" with expert legal knowledge.\n\nLEGAL CONTEXT: ${legalCtx}\n\nCASE DESCRIPTION:\n${caseText}\n\nOPPONENT DESCRIPTION:\n${opponent || "Unknown opponent / opposing counsel"}\n\nSTRATEGIC GOAL:\n${goal || "Win the case / achieve the best possible outcome"}\n\nSUN TZU PRINCIPLES TO APPLY: ${SUN_TZU_PRINCIPLES.join(", ")}\n\n48 LAWS OF POWER (select the most relevant): ${LAWS_OF_POWER.join("; ")}\n\nTASK: Provide a deep strategic and psychological analysis of this legal case.`,
      model: "claude_sonnet_4_6",
      response_json_schema: {
        type: "object",
        properties: {
          strategic_summary: { type: "string" },
          strategic_path: { type: "array", items: { type: "object", properties: { phase: { type: "string" }, action: { type: "string" }, rationale: { type: "string" }, timing: { type: "string" } } } },
          risk_assessment: { type: "object", properties: { overall_risk: { type: "string" }, critical_risks: { type: "array", items: { type: "string" } }, hidden_dangers: { type: "array", items: { type: "string" } }, mitigation: { type: "array", items: { type: "string" } } } },
          power_laws: { type: "array", items: { type: "object", properties: { law_number: { type: "number" }, law_name: { type: "string" }, application: { type: "string" } } } },
          sun_tzu_plan: { type: "array", items: { type: "object", properties: { principle: { type: "string" }, tactical_move: { type: "string" } } } },
          opponent_profile: { type: "object", properties: { psychological_type: { type: "string" }, weaknesses: { type: "array", items: { type: "string" } }, likely_tactics: { type: "array", items: { type: "string" } }, exploitation_strategy: { type: "string" } } },
          machiavellian_moves: { type: "array", items: { type: "string" } },
          red_lines: { type: "array", items: { type: "string" } },
          win_probability_assessment: { type: "string" },
          master_quote: { type: "string" }
        }
      }
    });
    setResult(res);
    setLoading(false);
  };

  const toggle = (s) => setExpandedSection(prev => prev === s ? null : s);

  const Section = ({ id, icon, title, color, children }) => {
    const open = expandedSection === id;
    return (
      <div className={`rounded-2xl border overflow-hidden ${color}`}>
        <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-5 py-4 text-left">
          <div className="flex items-center gap-2.5">
            {icon}
            <span className="font-bold text-sm">{title}</span>
          </div>
          {open ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
        </button>
        {open && <div className="px-5 pb-5 space-y-3">{children}</div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="border-b border-[#f0f0f0] bg-white sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
            <Sword className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#1a1a1a] leading-none">Sun Tzu × Machiavelli</p>
            <p className="text-[10px] text-[#999] mt-0.5">Strategic Psycho-Analysis · 48 Laws of Power</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h1 className="font-bold text-base mb-1">Strategic War Room</h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Describe your case. The AI will analyse it through the combined lens of Sun Tzu, Machiavelli, and the 48 Laws of Power.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#f0f0f0] p-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-1.5">Case Description *</label>
            <textarea value={caseText} onChange={e => setCaseText(e.target.value)} rows={5}
              placeholder="Describe your legal case, the key facts, the claims, what's at stake…"
              className="w-full border border-[#f0f0f0] rounded-xl px-4 py-3 text-sm text-[#1a1a1a] placeholder-[#ccc] focus:outline-none focus:border-slate-300 resize-none bg-[#fafafa]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-1.5">Opponent / Opposing Counsel</label>
              <textarea value={opponent} onChange={e => setOpponent(e.target.value)} rows={3}
                placeholder="Describe the opponent: their behavior, known tactics, personality…"
                className="w-full border border-[#f0f0f0] rounded-xl px-4 py-3 text-sm text-[#1a1a1a] placeholder-[#ccc] focus:outline-none focus:border-slate-300 resize-none bg-[#fafafa]" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#999] uppercase tracking-widest block mb-1.5">Strategic Goal</label>
              <textarea value={goal} onChange={e => setGoal(e.target.value)} rows={3}
                placeholder="Win at trial? Force a favorable settlement? Delay?"
                className="w-full border border-[#f0f0f0] rounded-xl px-4 py-3 text-sm text-[#1a1a1a] placeholder-[#ccc] focus:outline-none focus:border-slate-300 resize-none bg-[#fafafa]" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={analyze} disabled={!caseText.trim() || loading}
              className="flex items-center gap-2 bg-[#1a3560] text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-[#142a4d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sword className="w-4 h-4" />}
              {loading ? "Analysing…" : "Generate Strategic Analysis"}
            </button>
            {loading && <p className="text-xs text-[#999] italic">Using Claude Sonnet — may take ~30s…</p>}
          </div>
        </div>

        {result && (
          <div className="space-y-3">
            {result.master_quote && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <p className="text-sm text-amber-900 italic leading-relaxed text-center font-medium">"{result.master_quote}"</p>
              </div>
            )}
            {result.strategic_summary && (
              <div className="bg-slate-900 text-white rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Strategic Summary</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-200">{result.strategic_summary}</p>
              </div>
            )}
            {result.win_probability_assessment && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Win Probability Assessment</p>
                  <p className="text-sm text-emerald-900">{result.win_probability_assessment}</p>
                </div>
              </div>
            )}
            {result.strategic_path?.length > 0 && (
              <Section id="path" icon={<Target className="w-4 h-4 text-slate-700" />} title="Strategic Path — Sequence of Moves" color="bg-white border-[#f0f0f0]">
                <div className="space-y-3">
                  {result.strategic_path.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">{step.phase}{step.timing ? <span className="font-normal text-slate-400"> · {step.timing}</span> : ""}</p>
                        <p className="text-xs font-semibold text-slate-900 mt-0.5">{step.action}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{step.rationale}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {result.risk_assessment && (
              <Section id="risk" icon={<AlertTriangle className="w-4 h-4 text-red-600" />} title="Risk Assessment" color="bg-red-50 border-red-100">
                {result.risk_assessment.overall_risk && <p className="text-sm font-semibold text-red-800 bg-red-100 rounded-lg px-3 py-2">{result.risk_assessment.overall_risk}</p>}
                {result.risk_assessment.critical_risks?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1.5">Critical Risks</p>
                    {result.risk_assessment.critical_risks.map((r, i) => <p key={i} className="text-xs text-red-700 flex items-start gap-1.5 mb-1"><span className="text-red-400 mt-0.5">•</span>{r}</p>)}
                  </div>
                )}
                {result.risk_assessment.mitigation?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Mitigation Strategies</p>
                    {result.risk_assessment.mitigation.map((r, i) => <p key={i} className="text-xs text-emerald-700 flex items-start gap-1.5 mb-1"><span className="text-emerald-500 mt-0.5">✓</span>{r}</p>)}
                  </div>
                )}
              </Section>
            )}
            {result.power_laws?.length > 0 && (
              <Section id="laws" icon={<Crown className="w-4 h-4 text-amber-600" />} title="48 Laws of Power — Applied to Your Case" color="bg-amber-50 border-amber-100">
                <div className="space-y-3">
                  {result.power_laws.map((law, i) => (
                    <div key={i} className="bg-white rounded-xl p-3 border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">Law #{law.law_number}</p>
                      <p className="text-xs font-bold text-slate-800 mb-1">{law.law_name}</p>
                      <p className="text-xs text-slate-600">{law.application}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {result.sun_tzu_plan?.length > 0 && (
              <Section id="suntzu" icon={<Sword className="w-4 h-4 text-indigo-600" />} title="Sun Tzu — Battle Plan" color="bg-indigo-50 border-indigo-100">
                <div className="space-y-3">
                  {result.sun_tzu_plan.map((item, i) => (
                    <div key={i} className="bg-white rounded-xl p-3 border border-indigo-100">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Principle</p>
                      <p className="text-xs font-bold text-slate-800 mb-1 italic">"{item.principle}"</p>
                      <p className="text-xs text-slate-600">{item.tactical_move}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {result.opponent_profile && (
              <Section id="opponent" icon={<FileText className="w-4 h-4 text-purple-600" />} title="Psychological Profile of Opponent" color="bg-purple-50 border-purple-100">
                {result.opponent_profile.psychological_type && <p className="text-xs font-semibold text-purple-800 bg-purple-100 rounded-lg px-3 py-2">{result.opponent_profile.psychological_type}</p>}
                {result.opponent_profile.weaknesses?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1.5">Exploitable Weaknesses</p>
                    {result.opponent_profile.weaknesses.map((w, i) => <p key={i} className="text-xs text-purple-700 flex items-start gap-1.5 mb-1"><span>⚡</span>{w}</p>)}
                  </div>
                )}
                {result.opponent_profile.exploitation_strategy && (
                  <div className="bg-purple-900 text-white rounded-xl p-3">
                    <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-1">Exploitation Strategy</p>
                    <p className="text-xs">{result.opponent_profile.exploitation_strategy}</p>
                  </div>
                )}
              </Section>
            )}
            {result.machiavellian_moves?.length > 0 && (
              <Section id="machiavel" icon={<Lightbulb className="w-4 h-4 text-slate-700" />} title="Machiavellian Moves — Realpolitik" color="bg-slate-50 border-[#f0f0f0]">
                <div className="space-y-2">
                  {result.machiavellian_moves.map((m, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-white rounded-lg p-3 border border-[#f0f0f0]">
                      <span className="text-[10px] font-bold text-slate-400 mt-0.5 flex-shrink-0">M{i + 1}</span>
                      <p className="text-xs text-slate-700">{m}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {result.red_lines?.length > 0 && (
              <Section id="redlines" icon={<AlertTriangle className="w-4 h-4 text-red-300" />} title="Red Lines — Never Do This" color="bg-red-900 border-red-800">
                <div className="space-y-2">
                  {result.red_lines.map((r, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-red-400 text-xs mt-0.5 flex-shrink-0">✗</span>
                      <p className="text-xs text-red-100">{r}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            <p className="text-center text-[10px] text-[#999] pt-2">
              This AI analysis uses advanced reasoning (Claude Sonnet). For informational purposes only — does not constitute legal advice.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}