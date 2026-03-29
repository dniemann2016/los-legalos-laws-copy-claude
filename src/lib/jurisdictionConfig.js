// Jurisdiction configuration: DE = German law, US = American law

export const JURISDICTIONS = {
  DE: "DE",
  US: "US",
};

export const T = {
  DE: {
    // General
    platform: "MachiavelLEX",
    platformSub: "Legal Intelligence Platform",
    // Case fields
    fallname: "Fallname",
    aktenzeichen: "Aktenzeichen",
    gericht: "Gericht",
    rechtsgebiet: "Rechtsgebiet",
    prozessziel: "Prozessziel",
    streitwert: "Streitwert",
    instanz: "Instanz",
    prognose: "Prognose",
    zentrale_rechtsfrage: "Zentrale Rechtsfrage",
    richter: "Richter",
    // Status
    aktiv: "Aktiv",
    vorbereitung: "Vorbereitung",
    abgeschlossen: "Abgeschlossen",
    ruhend: "Ruhend",
    // Instanzen
    erstinstanz: "Erstinstanz",
    berufung: "Berufung",
    revision: "Revision",
    // Roles
    richterRole: "Richter",
    zeuge: "Zeuge",
    sachverstaendiger: "Sachverständiger",
    partei: "Partei",
    anwalt: "Anwalt",
    gutachter: "Gutachter",
    // Deadline
    frist: "Frist",
    fristen: "Fristen",
    // Argument
    argument: "Argument",
    argumente: "Argumente",
    // Evidence
    beweis: "Beweis",
    beweise: "Beweise",
    // Navigation
    aktiveFaelle: "Aktive Fälle",
    offeeneFristen: "Offene Fristen",
    // Modules
    module: [
      { category: "KI-ASSISTENT · FALLVERWALTUNG", title: "Lex · Fall-Assistent", description: "Juristischer KI-Assistent: Fälle analysieren, Fristen überwachen, Argumente verwalten und Strategien entwickeln per Chat." },
      { category: "KANZLEI · FALLMANAGEMENT", title: "Anwalts-Tool", description: "Argumentketten, Beweisführung, Strategie & Prognose für laufende Mandantenakten." },
      { category: "RICHTERPROFILE · STATISTIKEN", title: "Richterprofile", description: "Statistische Richterprofile mit Klägerquote, Vergleichsrate und Verfahrensdauer – verknüpft mit laufenden Fällen." },
      { category: "KI-AGENT · PLATTFORM", title: "Plattform-Optimierer", description: "KI-Agent der kontinuierlich Lücken erkennt, Richterprofile ergänzt, Argumente stärkt und die Kanzlei auf Großkanzlei-Niveau hebt." },
      { category: "PORTFOLIO · COCKPIT", title: "Kanzlei-Cockpit", description: "Portfolio-Übersicht aller Mandate mit Risikoampel, KPI-Dashboard, Fristenalarm und Chancen-Analyse auf einen Blick." },
      { category: "ANALYTIK · CHARTS", title: "Kanzlei-Analytik", description: "Interaktive Dashboards mit Recharts: Fallstatistiken, Fristen-Übersichten, Prognoseverteilung und KI-gestützte Fallanalyse." },
    ],
    // Analytics labels
    faelleNachRechtsgebiet: "Fälle nach Rechtsgebiet",
    statusVerteilung: "Status-Verteilung",
    prognoseVerteilung: "Prognose-Verteilung",
    fristenUebersicht: "Fristen-Übersicht",
    naechste14Tage: "Fristen der nächsten 14 Tage",
    instanzVerteilung: "Instanz-Verteilung",
    kiFallanalyse: "KI-Fallanalyse",
    fallAuswaehlen: "Fall auswählen",
    analyseStarten: "KI-Analyse starten",
    analyseWarning: "⚠ Diese Analyse ersetzt keine rechtliche Beratung und dient ausschließlich als Orientierungshilfe.",
    aktiveFaelleLabel: "Aktive Fälle",
    offeeneFristenLabel: "Offene Fristen",
    avgPrognoseLabel: "Ø Prognose",
    argumenteLabel: "Argumente",
    currency: "€",
    currencyLocale: "de-DE",
  },
  US: {
    // General
    platform: "MachiavelLEX",
    platformSub: "Legal Intelligence Platform",
    // Case fields
    fallname: "Case Name",
    aktenzeichen: "Docket Number",
    gericht: "Court",
    rechtsgebiet: "Practice Area",
    prozessziel: "Legal Objective",
    streitwert: "Amount in Controversy",
    instanz: "Court Level",
    prognose: "Win Probability",
    zentrale_rechtsfrage: "Central Legal Issue",
    richter: "Judge",
    // Status
    aktiv: "Active",
    vorbereitung: "Preparation",
    abgeschlossen: "Closed",
    ruhend: "Stayed",
    // Instanzen
    erstinstanz: "Trial Court",
    berufung: "Court of Appeals",
    revision: "Supreme Court",
    // Roles
    richterRole: "Judge",
    zeuge: "Witness",
    sachverstaendiger: "Expert Witness",
    partei: "Party",
    anwalt: "Attorney",
    gutachter: "Consultant",
    // Deadline
    frist: "Deadline",
    fristen: "Deadlines",
    // Argument
    argument: "Argument",
    argumente: "Arguments",
    // Evidence
    beweis: "Evidence",
    beweise: "Evidence Items",
    // Navigation
    aktiveFaelle: "Active Cases",
    offeeneFristen: "Open Deadlines",
    // Modules
    module: [
      { category: "AI ASSISTANT · CASE MANAGEMENT", title: "Lex · Case Assistant", description: "AI-powered legal assistant: analyze cases, track deadlines, manage arguments, and develop litigation strategies via chat." },
      { category: "LAW FIRM · CASE MANAGEMENT", title: "Attorney Tool", description: "Argument chains, evidence management, strategy & win probability for active client matters." },
      { category: "JUDGE PROFILES · STATISTICS", title: "Judge Profiles", description: "Statistical judge profiles with plaintiff win rates, settlement rates, and average case duration – linked to active cases." },
      { category: "AI AGENT · PLATFORM", title: "Platform Optimizer", description: "AI agent that continuously identifies gaps, enriches judge profiles, strengthens arguments, and elevates firm performance." },
      { category: "PORTFOLIO · COCKPIT", title: "Firm Cockpit", description: "Portfolio overview of all matters with risk indicators, KPI dashboard, deadline alerts, and opportunity analysis." },
      { category: "ANALYTICS · CHARTS", title: "Firm Analytics", description: "Interactive dashboards: case statistics, deadline overviews, win probability distribution, and AI-powered case analysis." },
    ],
    // Analytics labels
    faelleNachRechtsgebiet: "Cases by Practice Area",
    statusVerteilung: "Status Distribution",
    prognoseVerteilung: "Win Probability Distribution",
    fristenUebersicht: "Deadline Overview",
    naechste14Tage: "Deadlines in the Next 14 Days",
    instanzVerteilung: "Court Level Distribution",
    kiFallanalyse: "AI Case Analysis",
    fallAuswaehlen: "Select a Case",
    analyseStarten: "Start AI Analysis",
    analyseWarning: "⚠ This analysis does not constitute legal advice and is intended solely as a reference tool.",
    aktiveFaelleLabel: "Active Cases",
    offeeneFristenLabel: "Open Deadlines",
    avgPrognoseLabel: "Avg. Win Probability",
    argumenteLabel: "Arguments",
    currency: "$",
    currencyLocale: "en-US",
  },
};

export function getT(jurisdiction) {
  return T[jurisdiction] || T.DE;
}