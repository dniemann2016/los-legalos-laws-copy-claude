import { useNavigate } from "react-router-dom";
import { ChevronRight, Scale, Users, Bot, LayoutDashboard, MessageSquare, BarChart2 } from "lucide-react";
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
];

const ICONS = [
  <MessageSquare className="w-10 h-10 text-violet-600" />,
  <Scale className="w-10 h-10 text-gray-700" />,
  <Users className="w-10 h-10 text-indigo-600" />,
  <Bot className="w-10 h-10 text-emerald-600" />,
  <LayoutDashboard className="w-10 h-10 text-blue-600" />,
  <BarChart2 className="w-10 h-10 text-purple-600" />,
];

export default function Modules() {
  const navigate = useNavigate();
  const { jurisdiction } = useJurisdiction();
  const t = getT(jurisdiction);

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center">
      <div className="w-full max-w-md px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t.platform}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.platformSub}</p>
          <div className="mt-4 flex justify-center">
            <JurisdictionToggle />
          </div>
        </div>
        <div className="space-y-2">
          {t.module.map((mod, i) => (
            <button key={mod.title} onClick={() => navigate(PATHS[i])}
              className="w-full flex items-center gap-5 p-5 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 text-left group">
              <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                {ICONS[i]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">{mod.category}</p>
                <h3 className="text-base font-semibold text-gray-900">{mod.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5 leading-snug">{mod.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}