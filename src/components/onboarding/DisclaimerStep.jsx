import { useState } from "react";
import { ShieldCheck } from "lucide-react";

const CONTENT = {
  DE: {
    title: "Haftungsausschluss & Datenschutz",
    body: `MachiavelLEX ist ein KI-gestütztes Werkzeug zur Unterstützung rechtlicher Fachleute. Die Plattform ersetzt keine anwaltliche Beratung und begründet kein Mandatsverhältnis.\n\nAlle Eingaben werden DSGVO-konform auf EU-Servern verarbeitet. Mandantendaten werden nicht zur KI-Weiterentwicklung genutzt. Anonymisierte Muster können zur Verbesserung jurisdiktionsspezifischer Empfehlungen verwendet werden.\n\nDie KI-Analysen sind als Entscheidungsunterstützung zu verstehen und ersetzen nicht die professionelle Urteilsbildung des Anwalts.`,
    checkbox: "Ich akzeptiere die Nutzungsbedingungen und habe die Datenschutzhinweise gelesen.",
    btn: "Weiter",
  },
  EN: {
    title: "Disclaimer & Privacy",
    body: `MachiavelLEX is an AI-assisted tool designed to support legal professionals. The platform does not replace legal advice and does not establish an attorney-client relationship.\n\nAll inputs are processed in compliance with GDPR on EU servers. Client data is not used for AI training. Anonymized patterns may be used to improve jurisdiction-specific recommendations.\n\nAI analyses are intended as decision support and do not replace the professional judgment of the attorney.`,
    checkbox: "I accept the terms of use and have read the privacy notice.",
    btn: "Continue",
  },
  FR: {
    title: "Avertissement & Confidentialité",
    body: `MachiavelLEX est un outil assisté par IA conçu pour soutenir les professionnels du droit. La plateforme ne remplace pas un avis juridique et n'établit pas de relation avocat-client.\n\nToutes les saisies sont traitées conformément au RGPD sur des serveurs européens. Les données clients ne sont pas utilisées pour l'entraînement de l'IA. Des modèles anonymisés peuvent être utilisés pour améliorer les recommandations par juridiction.\n\nLes analyses IA sont destinées à l'aide à la décision et ne remplacent pas le jugement professionnel de l'avocat.`,
    checkbox: "J'accepte les conditions d'utilisation et j'ai lu la politique de confidentialité.",
    btn: "Continuer",
  },
};

export default function DisclaimerStep({ language, onAccept }) {
  const [checked, setChecked] = useState(false);
  const c = CONTENT[language] || CONTENT.DE;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-[#1a3560]" />
        </div>
        <h2 className="text-base font-bold text-slate-900">{c.title}</h2>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 leading-relaxed mb-5 whitespace-pre-line max-h-48 overflow-y-auto">
        {c.body}
      </div>

      <label className="flex items-start gap-3 cursor-pointer mb-5">
        <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-[#1a3560] flex-shrink-0" />
        <span className="text-xs text-slate-700">{c.checkbox}</span>
      </label>

      <button disabled={!checked} onClick={onAccept}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#1a3560] text-white hover:bg-[#142a4d]">
        {c.btn}
      </button>
    </div>
  );
}