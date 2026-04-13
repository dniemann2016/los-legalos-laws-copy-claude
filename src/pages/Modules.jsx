import { useNavigate } from "react-router-dom";
import { Scale, Users, Bot, LayoutDashboard, MessageSquare, BarChart2, Sword, CheckSquare, Calendar } from "lucide-react";
import { useJurisdiction } from "../hooks/useJurisdiction";
import { getT } from "../lib/jurisdictionConfig";
import { useAuth } from "@/lib/AuthContext";

const PATHS = [
  "/chat/fall-assistent",
  "/lexara",
  "/richterprofile",
  "/plattform-agent",
  "/cockpit",
  "/analytik",
  "/strategic-analysis",
];

const ICONS = [MessageSquare, Scale, Users, Bot, LayoutDashboard, BarChart2, Sword];

const ACCENTS = [
  { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { bg: "bg-red-50", text: "text-red-800", border: "border-red-200" },
];

export default function Modules() {
  const navigate = useNavigate();
  const { jurisdiction } = useJurisdiction();
  const t = getT(jurisdiction);
  const { currentUser } = useAuth();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Guten Morgen";
    if (h < 18) return "Guten Tag";
    return "Guten Abend";
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Page header */}
      <div className="bg-white border-b border-[#f0f0f0] px-8 py-5">
        <h1 className="text-xl font-bold text-[#1a1a1a]">
          {greeting()}{currentUser?.full_name ? `, ${currentUser.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-[#666666] mt-0.5">{t.platformSub}</p>
      </div>

      <div className="px-8 py-6 max-w-4xl">
        {/* Quick Access */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold text-[#999] uppercase tracking-widest mb-3">Module</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {t.module.map((mod, i) => {
              const Icon = ICONS[i];
              const acc = ACCENTS[i];
              return (
                <button
                  key={mod.title}
                  onClick={() => navigate(PATHS[i])}
                  className="flex items-center gap-4 p-4 bg-white border border-[#f0f0f0] rounded-xl hover:border-[#2d4a8a]/30 hover:shadow-sm transition-all duration-150 text-left group"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${acc.bg} ${acc.border} border`}>
                    <Icon className={`w-4 h-4 ${acc.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-[#999] uppercase tracking-widest">{mod.category}</p>
                    <h3 className="text-[13px] font-semibold text-[#1a1a1a] leading-snug">{mod.title}</h3>
                    <p className="text-[11px] text-[#888] mt-0.5 line-clamp-1">{mod.description}</p>
                  </div>
                  <div className="w-1 h-8 rounded-full bg-[#f0f0f0] group-hover:bg-[#2d4a8a]/30 transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Fristen", sub: "Zeitleiste", path: "/zeitleiste", icon: Calendar, color: "text-orange-600 bg-orange-50 border-orange-200" },
            { label: "Aufgaben", sub: "Alle offenen Aufgaben", path: "/aufgaben", icon: CheckSquare, color: "text-green-700 bg-green-50 border-green-200" },
            { label: "KI-Chat", sub: "Fall-Assistent", path: "/chat/fall-assistent", icon: MessageSquare, color: "text-violet-700 bg-violet-50 border-violet-200" },
            { label: "Cockpit", sub: "Risiko-Überblick", path: "/cockpit", icon: LayoutDashboard, color: "text-blue-700 bg-blue-50 border-blue-200" },
          ].map(q => {
            const Icon = q.icon;
            return (
              <button key={q.path} onClick={() => navigate(q.path)}
                className="flex flex-col items-center gap-2 p-4 bg-white border border-[#f0f0f0] rounded-xl hover:border-[#2d4a8a]/30 hover:shadow-sm transition-all">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${q.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <p className="text-[12px] font-semibold text-[#1a1a1a]">{q.label}</p>
                  <p className="text-[10px] text-[#999]">{q.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 pt-5 border-t border-[#f0f0f0] flex items-center justify-between">
          <p className="text-[11px] text-[#bbb]">{t.copyright}</p>
          <p className="text-[11px] text-[#bbb]">{t.dsgvo}</p>
        </div>
      </div>
    </div>
  );
}