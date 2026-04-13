import { useNavigate } from "react-router-dom";
import { ChevronRight, Scale, Users, Bot, LayoutDashboard, MessageSquare, BarChart2, Sword } from "lucide-react";
import { useJurisdiction } from "../hooks/useJurisdiction";
import { getT } from "../lib/jurisdictionConfig";
import JurisdictionToggle from "../components/JurisdictionToggle";

const PATHS = [
  "/chat/fall-assistent",
  "/lexara",
  "/richterprofile",
  "/plattform-agent",
  "/cockpit",
  "/analytik",
  "/strategic-analysis",
];

const ICON_COLORS = [
  "bg-violet-50 text-violet-700",
  "bg-slate-100 text-slate-700",
  "bg-indigo-50 text-indigo-700",
  "bg-emerald-50 text-emerald-700",
  "bg-blue-50 text-blue-700",
  "bg-amber-50 text-amber-700",
  "bg-red-50 text-red-800",
];

const ICONS = [
  <MessageSquare className="w-5 h-5" />,
  <Scale className="w-5 h-5" />,
  <Users className="w-5 h-5" />,
  <Bot className="w-5 h-5" />,
  <LayoutDashboard className="w-5 h-5" />,
  <BarChart2 className="w-5 h-5" />,
  <Sword className="w-5 h-5" />,
];

export default function Modules() {
  const navigate = useNavigate();
  const { jurisdiction } = useJurisdiction();
  const t = getT(jurisdiction);

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-sans">
      {/* Top bar */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1a3560] flex items-center justify-center">
              <Scale className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-[13px] text-slate-800 tracking-tight">MachiavelLEX</span>
          </div>
          <JurisdictionToggle />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-widest mb-2">Legal Intelligence Platform</p>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-1">{t.platform}</h1>
          <p className="text-sm text-slate-500">{t.platformSub}</p>
        </div>

        {/* Module grid */}
        <div className="space-y-2">
          {t.module.map((mod, i) => (
            <button
              key={mod.title}
              onClick={() => navigate(PATHS[i])}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all duration-150 text-left group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${ICON_COLORS[i]}`}>
                {ICONS[i]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{mod.category}</p>
                </div>
                <h3 className="text-[14px] font-semibold text-slate-900 leading-snug">{mod.title}</h3>
                <p className="text-[12px] text-slate-500 mt-0.5 leading-snug line-clamp-1">{mod.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">{t.copyright}</p>
          <p className="text-[11px] text-slate-400">{t.dsgvo}</p>
        </div>
      </div>
    </div>
  );
}