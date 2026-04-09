import { Globe, ArrowLeft } from "lucide-react";
import { JURISDICTION_META } from "../../lib/jurisdictionConfig";

const JURISDICTIONS = ["DE","AT","CH","LI","LU","SE","NO","DK","FI","US"];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const TITLES = { DE: "Rechtsordnung wählen", EN: "Select Jurisdiction", FR: "Choisir la juridiction" };
const BTN = { DE: "Einrichtung abschließen", EN: "Complete Setup", FR: "Terminer la configuration" };

export default function JurisdictionStep({ jurisdiction, usState, language, onSelect, onSelectState, onComplete, onBack }) {
  const title = TITLES[language] || TITLES.DE;
  const btn = BTN[language] || BTN.DE;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
          <Globe className="w-5 h-5 text-emerald-600" />
        </div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {JURISDICTIONS.map(jur => {
          const meta = JURISDICTION_META[jur];
          const name = meta.name[language] || meta.name.EN;
          return (
            <button key={jur} onClick={() => onSelect(jur)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                jurisdiction === jur
                  ? "border-[#1a3560] bg-blue-50"
                  : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
              }`}>
              <span className="text-xl">{meta.flag}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{name}</p>
                <p className="text-[10px] text-slate-400 truncate">{meta.system}</p>
              </div>
            </button>
          );
        })}
      </div>

      {jurisdiction === "US" && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
            {language === "DE" ? "US-Bundesstaat" : language === "FR" ? "État américain" : "US State"}
          </label>
          <select value={usState} onChange={e => onSelectState(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-slate-400">
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      <button onClick={onComplete}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-[#1a3560] text-white hover:bg-[#142a4d] transition-colors mb-3">
        {btn}
      </button>

      <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>
    </div>
  );
}