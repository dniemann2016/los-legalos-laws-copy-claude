import { useNavigate } from "react-router-dom";
import { ChevronRight, Scale, Users, Bot, LayoutDashboard, MessageSquare } from "lucide-react";

const MODULES = [
  {
    category: "KI-ASSISTENT · FALLVERWALTUNG",
    title: "Lex · Fall-Assistent",
    description: "Juristischer KI-Assistent: Fälle analysieren, Fristen überwachen, Argumente verwalten und Strategien entwickeln per Chat.",
    icon: <MessageSquare className="w-10 h-10 text-violet-600" />,
    path: "/chat/fall-assistent",
  },
  {
    category: "KANZLEI · FALLMANAGEMENT",
    title: "Anwalts-Tool",
    description: "Argumentketten, Beweisführung, Strategie & Prognose für laufende Mandantenakten.",
    icon: <Scale className="w-10 h-10 text-gray-700" />,
    path: "/lexara",
  },
  {
    category: "RICHTERPROFILE · STATISTIKEN",
    title: "Richterprofile",
    description: "Statistische Richterprofile mit Klägerquote, Vergleichsrate und Verfahrensdauer – verknüpft mit laufenden Fällen.",
    icon: <Users className="w-10 h-10 text-indigo-600" />,
    path: "/richterprofile",
  },
  {
    category: "KI-AGENT · PLATTFORM",
    title: "Plattform-Optimierer",
    description: "KI-Agent der kontinuierlich Lücken erkennt, Richterprofile ergänzt, Argumente stärkt und die Kanzlei auf Großkanzlei-Niveau hebt.",
    icon: <Bot className="w-10 h-10 text-emerald-600" />,
    path: "/plattform-agent",
  },
  {
    category: "PORTFOLIO · COCKPIT",
    title: "Kanzlei-Cockpit",
    description: "Portfolio-Übersicht aller Mandate mit Risikoampel, KPI-Dashboard, Fristenalarm und Chancen-Analyse auf einen Blick.",
    icon: <LayoutDashboard className="w-10 h-10 text-blue-600" />,
    path: "/cockpit",
  },
];

export default function Modules() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center">
      <div className="w-full max-w-md px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900">MachiavelLEX</h1>
          <p className="text-sm text-gray-500 mt-1">Legal Intelligence Platform</p>
        </div>
        <div className="space-y-2">
          {MODULES.map(mod => (
            <button key={mod.title} onClick={() => navigate(mod.path)}
              className="w-full flex items-center gap-5 p-5 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 text-left group">
              <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                {mod.icon}
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