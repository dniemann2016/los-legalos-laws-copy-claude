import { useNavigate } from "react-router-dom";
import { ChevronRight, TrendingUp, Scale, BarChart2, FileText } from "lucide-react";

const MODULES = [
  {
    category: "CEO / CRO ÜBERSICHT",
    title: "Executive Dashboard",
    description: "Alle offenen Risiken, kritische Fristen, Top-Empfehlungen und KI-Bewertungstrends auf einen Blick.",
    icon: <TrendingUp className="w-10 h-10 text-blue-500" />,
    path: "/lexara",
  },
  {
    category: "KANZLEI · FALLMANAGEMENT",
    title: "Anwalts-Tool",
    description: "Argumentketten, Beweisführung, Strategie & Prognose für laufende Mandantenakten.",
    icon: <Scale className="w-10 h-10 text-gray-700" />,
    path: "/lexara",
  },
  {
    category: "ENTERPRISE · 9-SCHRITT-ANALYSE",
    title: "Business Risk Management",
    description: "Rechtliche Risiken strukturiert durchdenken, mit 8 mathematischen Modellen durchrechnen und fundierte Entscheidungen treffen.",
    icon: <BarChart2 className="w-10 h-10 text-green-600" />,
    path: "/lexara",
  },
  {
    category: "KI-DOKUMENTENPRÜFUNG",
    title: "Dokument-Analyse",
    description: "KI-gestützte Analyse von Verträgen, Klageschriften und juristischen Dokumenten.",
    icon: <FileText className="w-10 h-10 text-gray-500" />,
    path: "/lexara",
  },
];

export default function Modules() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900">MachiavelLEX</h1>
          <p className="text-sm text-gray-500 mt-1">Wählen Sie ein Modul</p>
        </div>
        <div className="space-y-2">
          {MODULES.map((mod) => (
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