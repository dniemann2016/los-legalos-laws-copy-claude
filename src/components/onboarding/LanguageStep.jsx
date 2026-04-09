import { Languages, ArrowLeft } from "lucide-react";

const LANGUAGES = [
  { code: "DE", label: "Deutsch", flag: "🇩🇪", sub: "German", notice: null },
  { code: "EN", label: "English", flag: "🇬🇧", sub: "English", notice: "🚧 Platform is currently displayed mostly in German. Full English translation is in progress." },
  { code: "FR", label: "Français", flag: "🇫🇷", sub: "French", notice: "🚧 La plateforme s'affiche actuellement principalement en allemand. La traduction complète est en cours." },
];

const TITLES = {
  DE: "Sprache wählen",
  EN: "Select Language",
  FR: "Choisir la langue",
};

export default function LanguageStep({ language, onSelect, onBack }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
          <Languages className="w-5 h-5 text-violet-600" />
        </div>
        <h2 className="text-base font-bold text-slate-900">{TITLES[language] || TITLES.DE}</h2>
      </div>

      <div className="space-y-2 mb-5">
        {LANGUAGES.map(lang => (
          <button key={lang.code} onClick={() => onSelect(lang.code)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
              language === lang.code
                ? "border-[#1a3560] bg-blue-50"
                : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
            }`}>
            <span className="text-2xl">{lang.flag}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">{lang.label}</p>
              <p className="text-xs text-slate-400">{lang.sub}</p>
              {lang.notice && (
                <p className="text-[10px] text-amber-600 font-medium mt-0.5">{lang.notice}</p>
              )}
            </div>
            {language === lang.code && (
              <div className="ml-auto w-4 h-4 rounded-full bg-[#1a3560] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>
    </div>
  );
}