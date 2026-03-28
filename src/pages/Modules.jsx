import { useNavigate } from "react-router-dom";
import { ChevronRight, Scale } from "lucide-react";

export default function Modules() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center">
      <div className="w-full max-w-md px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900">MachiavelLEX</h1>
          <p className="text-sm text-gray-500 mt-1">Legal Intelligence Platform</p>
        </div>
        <button
          onClick={() => navigate("/lexara")}
          className="w-full flex items-center gap-5 p-5 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 text-left group"
        >
          <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
            <Scale className="w-10 h-10 text-gray-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">KANZLEI · FALLMANAGEMENT</p>
            <h3 className="text-base font-semibold text-gray-900">Anwalts-Tool</h3>
            <p className="text-sm text-gray-500 mt-0.5 leading-snug">Argumentketten, Beweisführung, Strategie & Prognose für laufende Mandantenakten – mit Dokument-Upload und KI-Analyse.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
        </button>
      </div>
    </div>
  );
}