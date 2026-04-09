import { useState } from "react";
import { ShieldCheck, Lock } from "lucide-react";

const CONTENT = {
  DE: {
    title: "Nutzungsbedingungen, Geheimhaltung & Haftungsausschluss",
    nda_title: "⚠️ Vertraulichkeits- & Geheimhaltungsverpflichtung (NDA)",
    nda_body: `Mit dem Zugang zu MachiavelLEX erklären Sie sich rechtsverbindlich einverstanden:

1. GEHEIMHALTUNG: Alle Funktionen, Algorithmen, Prozesse, Benutzeroberflächen, KI-Logik, Datenstrukturen und sonstigen Bestandteile dieser Plattform unterliegen strikter Geheimhaltung und sind als Geschäftsgeheimnis im Sinne des GeschGehG (Gesetz zum Schutz von Geschäftsgeheimnissen) geschützt.

2. KOPIERVERBOT: Es ist ausdrücklich untersagt, Funktionen, Konzepte, Designs oder Technologien dieser Plattform ganz oder teilweise zu kopieren, nachzuahmen, zu reverse-engineeren oder für eigene oder fremde Produkte zu verwenden.

3. KOMMERZIELLES WEITERGABEVERBOT: Die Weitergabe, Lizenzierung oder kommerzielle Verwertung von Inhalten, Konzepten oder Technologien dieser Plattform an Dritte ist ohne ausdrückliche schriftliche Genehmigung des Rechteinhabers verboten.

4. SANKTIONEN BEI VERSTOSS: Bei Zuwiderhandlung gegen diese Bedingungen sind Sie verpflichtet:
   • Alle Einnahmen und Gewinne aus einem Produkt oder Dienst, das auf Grundlage der kopierten oder nachgeahmten Inhalte dieser Plattform basiert, vollständig an den Rechteinhaber abzutreten.
   • Einen pauschalierten Schadensersatz in Höhe von mindestens 250.000 € zu leisten, unbeschadet weitergehender Schadensersatzansprüche.
   • Alle Rechtsverfolgungs- und Anwaltskosten des Rechteinhabers zu tragen.
   • Die sofortige Unterlassung des rechtswidrigen Verhaltens sicherzustellen.

5. DATENSCHUTZ: Alle Eingaben werden DSGVO-konform auf EU-Servern verarbeitet. Mandantendaten werden nicht zur KI-Weiterentwicklung genutzt.

6. HAFTUNGSAUSSCHLUSS KI: MachiavelLEX ist ein KI-gestütztes Entscheidungshilfe-Werkzeug. Die Plattform ersetzt keine anwaltliche Beratung und begründet kein Mandatsverhältnis. KI-Analysen ersetzen nicht das professionelle Urteil des Anwalts.

Dieser Vertrag unterliegt deutschem Recht. Gerichtsstand ist Deutschland.`,
    checkbox: "Ich habe die Nutzungsbedingungen, die Geheimhaltungsverpflichtung und die Sanktionsregelungen vollständig gelesen und erkenne diese rechtsverbindlich an.",
    btn: "Verbindlich akzeptieren & Zugang erhalten",
  },
  EN: {
    title: "Terms of Use, Confidentiality & Disclaimer",
    nda_title: "⚠️ Confidentiality & Non-Disclosure Agreement (NDA)",
    nda_body: `By accessing MachiavelLEX, you legally agree to the following:

1. CONFIDENTIALITY: All features, algorithms, processes, user interfaces, AI logic, data structures and other components of this platform are strictly confidential and protected as trade secrets under applicable law.

2. NO COPYING: It is strictly prohibited to copy, imitate, reverse-engineer, or use the features, concepts, designs or technologies of this platform in whole or in part for your own or third-party products.

3. NO COMMERCIAL DISTRIBUTION: Sharing, licensing or commercial exploitation of content, concepts or technologies of this platform to third parties is prohibited without the express written consent of the rights holder.

4. PENALTIES FOR VIOLATION: In case of breach, you are obligated to:
   • Fully assign all revenues and profits from any product or service based on copied or imitated content of this platform to the rights holder.
   • Pay liquidated damages of at least €250,000, without prejudice to further claims.
   • Bear all legal prosecution and attorney costs of the rights holder.
   • Immediately cease and desist from the unlawful conduct.

5. DATA PROTECTION: All inputs are processed in compliance with GDPR on EU servers. Client data is not used for AI training.

6. AI DISCLAIMER: MachiavelLEX is an AI-assisted decision support tool. The platform does not replace legal advice and does not establish an attorney-client relationship.

This agreement is governed by German law. Place of jurisdiction is Germany.`,
    checkbox: "I have fully read the terms of use, the confidentiality obligation and the penalty provisions, and I accept them as legally binding.",
    btn: "Accept Legally & Gain Access",
  },
  FR: {
    title: "Conditions d'utilisation, Confidentialité & Avertissement",
    nda_title: "⚠️ Accord de confidentialité (NDA)",
    nda_body: `En accédant à MachiavelLEX, vous acceptez légalement ce qui suit :

1. CONFIDENTIALITÉ : Toutes les fonctionnalités, algorithmes, processus, interfaces, logique IA, structures de données et autres composants de cette plateforme sont strictement confidentiels et protégés en tant que secrets commerciaux.

2. INTERDICTION DE COPIE : Il est strictement interdit de copier, imiter, faire de la rétro-ingénierie ou utiliser les fonctionnalités, concepts, designs ou technologies de cette plateforme pour vos propres produits ou ceux de tiers.

3. INTERDICTION DE DISTRIBUTION COMMERCIALE : Le partage, la licence ou l'exploitation commerciale des contenus, concepts ou technologies de cette plateforme à des tiers est interdit sans le consentement écrit exprès du titulaire des droits.

4. SANCTIONS EN CAS DE VIOLATION : En cas de manquement, vous êtes tenu(e) de :
   • Céder intégralement tous les revenus et bénéfices d'un produit ou service basé sur le contenu copié ou imité de cette plateforme au titulaire des droits.
   • Payer des dommages-intérêts forfaitaires d'au moins 250 000 €, sans préjudice d'autres réclamations.
   • Prendre en charge tous les frais juridiques et honoraires d'avocat du titulaire des droits.
   • Cesser immédiatement tout comportement illicite.

5. PROTECTION DES DONNÉES : Toutes les saisies sont traitées conformément au RGPD sur des serveurs européens.

6. AVERTISSEMENT IA : MachiavelLEX est un outil d'aide à la décision assisté par IA. La plateforme ne remplace pas un avis juridique.

Cet accord est régi par le droit allemand. Le tribunal compétent est en Allemagne.`,
    checkbox: "J'ai lu intégralement les conditions d'utilisation, l'obligation de confidentialité et les dispositions de sanction, et je les accepte comme juridiquement contraignantes.",
    btn: "Accepter légalement & Obtenir l'accès",
  },
};

export default function DisclaimerStep({ language, onAccept }) {
  const [checked, setChecked] = useState(false);
  const c = CONTENT[language] || CONTENT.DE;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-7">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-[#1a3560] rounded-xl flex items-center justify-center">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-base font-bold text-slate-900">{c.title}</h2>
      </div>

      {/* NDA Header */}
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-3 flex items-center gap-2">
        <span className="text-xs font-bold text-red-700">{c.nda_title}</span>
      </div>

      {/* NDA Body */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 leading-relaxed mb-5 whitespace-pre-line max-h-64 overflow-y-auto font-mono">
        {c.nda_body}
      </div>

      <label className="flex items-start gap-3 cursor-pointer mb-5 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-[#1a3560] flex-shrink-0" />
        <span className="text-xs text-slate-800 font-medium leading-relaxed">{c.checkbox}</span>
      </label>

      <button disabled={!checked} onClick={onAccept}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#1a3560] text-white hover:bg-[#142a4d]">
        {c.btn}
      </button>
    </div>
  );
}