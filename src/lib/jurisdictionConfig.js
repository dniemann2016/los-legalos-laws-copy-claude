export const JURISDICTIONS = {
  DE: "DE", AT: "AT", CH: "CH", LI: "LI",
  LU: "LU", SE: "SE", NO: "NO", DK: "DK", FI: "FI", US: "US",
};

export const JURISDICTION_META = {
  DE: { flag: "🇩🇪", name: { DE: "Deutschland", EN: "Germany", FR: "Allemagne" }, system: "ZPO / BGB / StPO", currency: "€" },
  AT: { flag: "🇦🇹", name: { DE: "Österreich", EN: "Austria", FR: "Autriche" }, system: "ZPO / ABGB / StPO", currency: "€" },
  CH: { flag: "🇨🇭", name: { DE: "Schweiz", EN: "Switzerland", FR: "Suisse" }, system: "ZPO / OR / ZGB", currency: "CHF" },
  LI: { flag: "🇱🇮", name: { DE: "Liechtenstein", EN: "Liechtenstein", FR: "Liechtenstein" }, system: "ZPO / PGR", currency: "CHF" },
  LU: { flag: "🇱🇺", name: { DE: "Luxemburg", EN: "Luxembourg", FR: "Luxembourg" }, system: "Code de procédure civile", currency: "€" },
  SE: { flag: "🇸🇪", name: { DE: "Schweden", EN: "Sweden", FR: "Suède" }, system: "Rättegångsbalken", currency: "SEK" },
  NO: { flag: "🇳🇴", name: { DE: "Norwegen", EN: "Norway", FR: "Norvège" }, system: "Tvisteloven", currency: "NOK" },
  DK: { flag: "🇩🇰", name: { DE: "Dänemark", EN: "Denmark", FR: "Danemark" }, system: "Retsplejeloven", currency: "DKK" },
  FI: { flag: "🇫🇮", name: { DE: "Finnland", EN: "Finland", FR: "Finlande" }, system: "Oikeudenkäymiskaari", currency: "€" },
  US: { flag: "🇺🇸", name: { DE: "USA", EN: "United States", FR: "États-Unis" }, system: "Common Law / FRCP", currency: "$" },
};

export function getAIContext(jurisdiction, usState) {
  const contexts = {
    DE: `You are an expert German attorney. Apply German law strictly: ZPO, BGB, StGB, HGB. Reference specific paragraphs (§§). Follow BGH and BVerfG case law. Use precise German legal terminology.`,
    AT: `You are an expert Austrian attorney. Apply Austrian law: ZPO, ABGB, StGB. Reference OGH decisions. Distinguish from German law where relevant. Use Austrian legal terminology.`,
    CH: `You are an expert Swiss attorney. Apply Swiss law: ZPO, OR, ZGB, StGB. Reference BGer/Tribunal fédéral decisions. Note cantonal variations where relevant.`,
    LI: `You are an expert Liechtenstein attorney. Apply Liechtenstein law including the PGR (Personen- und Gesellschaftsrecht). Note similarities to Austrian law.`,
    LU: `You are an expert Luxembourg attorney. Apply Luxembourg law based on French civil law tradition. Reference Cour d'appel and Cour de cassation decisions. Note EU law primacy.`,
    SE: `You are an expert Swedish attorney. Apply Swedish law under the Rättegångsbalken. Reference Högsta domstolen decisions. Note Nordic legal tradition.`,
    NO: `You are an expert Norwegian attorney. Apply Norwegian law under the Tvisteloven. Reference Høyesterett decisions.`,
    DK: `You are an expert Danish attorney. Apply Danish law under the Retsplejeloven. Reference Højesteret decisions.`,
    FI: `You are an expert Finnish attorney. Apply Finnish law under the Oikeudenkäymiskaari. Reference Korkein oikeus decisions. Note bilingual (Finnish/Swedish) legal system.`,
    US: `You are an expert American attorney${usState ? ` specializing in ${usState} law` : ""}. Apply US federal and ${usState || "state"} law. Reference FRCP, applicable federal statutes, ${usState ? `${usState} Rules of Civil Procedure, ` : ""}and relevant case law. Use IRAC structure.`,
  };
  return contexts[jurisdiction] || contexts.DE;
}

const DE_TEXT = {
  platform: "Ihre KI-gestützte Rechtsplattform",
  platformSub: "Strategische Fallanalyse & Intelligente Prozessführung",
  kiFallanalyse: "KI-Fallanalyse",
  analyseStarten: "KI-Analyse starten",
  analyseWarning: "Diese Analyse ist eine KI-gestützte Einschätzung und ersetzt keine Rechtsberatung.",
  fallAuswaehlen: "Fall auswählen",
  aktiveFaelleLabel: "Aktive Fälle",
  offeeneFristenLabel: "Offene Fristen",
  avgPrognoseLabel: "Ø Prognose",
  argumenteLabel: "Argumente",
  faelleNachRechtsgebiet: "Fälle nach Rechtsgebiet",
  statusVerteilung: "Status-Verteilung",
  prognoseVerteilung: "Prognose-Verteilung",
  fristenUebersicht: "Fristen-Übersicht",
  naechste14Tage: "Nächste 14 Tage",
  instanzVerteilung: "Instanz-Verteilung",
  rechtsgebiet: "Rechtsgebiet",
  gericht: "Gericht",
  instanz: "Instanz",
  aktiv: "Status",
  streitwert: "Streitwert",
  prognose: "Prognose",
  module: [
    { category: "KI-Assistent", title: "Fall-Assistent Chat", description: "Konversationelle KI-Analyse Ihrer Mandate" },
    { category: "Mandatsverwaltung", title: "Lexara Dashboard", description: "Alle Fälle im Überblick – Fristen, Argumente, Beweise" },
    { category: "Personenprofile", title: "Richterprofile", description: "Erfahrungen, Statistiken & KI-Taktikanalyse" },
    { category: "KI-Agent", title: "Plattform-Agent", description: "Autonomer Agent für Plattformoptimierung und Analyse" },
    { category: "Cockpit", title: "Kanzlei-Cockpit", description: "Risiko-Ampel, Portfolio und Fristen-Monitoring" },
    { category: "Analytics", title: "Kanzlei-Analytik", description: "Visualisierung aller Fallkennzahlen und Trends" },
  ],
};

const EN_TEXT = {
  platform: "Your AI-Powered Legal Platform",
  platformSub: "Strategic Case Analysis & Intelligent Litigation Management",
  kiFallanalyse: "AI Case Analysis",
  analyseStarten: "Start AI Analysis",
  analyseWarning: "This analysis is AI-assisted and does not constitute legal advice.",
  fallAuswaehlen: "Select case",
  aktiveFaelleLabel: "Active Cases",
  offeeneFristenLabel: "Open Deadlines",
  avgPrognoseLabel: "Avg. Prognosis",
  argumenteLabel: "Arguments",
  faelleNachRechtsgebiet: "Cases by Practice Area",
  statusVerteilung: "Status Distribution",
  prognoseVerteilung: "Prognosis Distribution",
  fristenUebersicht: "Deadline Overview",
  naechste14Tage: "Next 14 Days",
  instanzVerteilung: "Court Level Distribution",
  rechtsgebiet: "Practice Area",
  gericht: "Court",
  instanz: "Court Level",
  aktiv: "Status",
  streitwert: "Amount in Controversy",
  prognose: "Win Probability",
  module: [
    { category: "AI Assistant", title: "Case Assistant Chat", description: "Conversational AI analysis of your cases" },
    { category: "Case Management", title: "Lexara Dashboard", description: "All cases at a glance – deadlines, arguments, evidence" },
    { category: "People Profiles", title: "Judge Profiles", description: "Experience, statistics & AI tactical analysis" },
    { category: "AI Agent", title: "Platform Agent", description: "Autonomous agent for platform optimization" },
    { category: "Cockpit", title: "Firm Cockpit", description: "Risk indicators, portfolio and deadline monitoring" },
    { category: "Analytics", title: "Firm Analytics", description: "Visualization of all case metrics and trends" },
  ],
};

const FR_TEXT = {
  platform: "Votre plateforme juridique IA",
  platformSub: "Analyse stratégique des dossiers & gestion intelligente du contentieux",
  kiFallanalyse: "Analyse IA du dossier",
  analyseStarten: "Lancer l'analyse IA",
  analyseWarning: "Cette analyse est assistée par IA et ne constitue pas un avis juridique.",
  fallAuswaehlen: "Sélectionner un dossier",
  aktiveFaelleLabel: "Dossiers actifs",
  offeeneFristenLabel: "Délais ouverts",
  avgPrognoseLabel: "Pronostic moy.",
  argumenteLabel: "Arguments",
  faelleNachRechtsgebiet: "Dossiers par domaine",
  statusVerteilung: "Répartition des statuts",
  prognoseVerteilung: "Répartition du pronostic",
  fristenUebersicht: "Vue d'ensemble des délais",
  naechste14Tage: "14 prochains jours",
  instanzVerteilung: "Répartition par instance",
  rechtsgebiet: "Domaine juridique",
  gericht: "Tribunal",
  instanz: "Instance",
  aktiv: "Statut",
  streitwert: "Valeur du litige",
  prognose: "Pronostic",
  module: [
    { category: "Assistant IA", title: "Chat assistant dossier", description: "Analyse IA conversationnelle de vos dossiers" },
    { category: "Gestion des dossiers", title: "Tableau de bord Lexara", description: "Tous les dossiers en un coup d'œil" },
    { category: "Profils de personnes", title: "Profils de juges", description: "Expériences, statistiques & analyse tactique IA" },
    { category: "Agent IA", title: "Agent de plateforme", description: "Agent autonome d'optimisation de la plateforme" },
    { category: "Cockpit", title: "Cockpit cabinet", description: "Indicateurs de risque, portefeuille et délais" },
    { category: "Analytique", title: "Analytique cabinet", description: "Visualisation de tous les indicateurs de dossiers" },
  ],
};

const TEXTS = { DE: DE_TEXT, AT: DE_TEXT, CH: DE_TEXT, LI: DE_TEXT, EN: EN_TEXT, US: EN_TEXT, SE: EN_TEXT, NO: EN_TEXT, DK: EN_TEXT, FI: EN_TEXT, LU: FR_TEXT, FR: FR_TEXT };

export function getT(jurisdiction) {
  return TEXTS[jurisdiction] || DE_TEXT;
}