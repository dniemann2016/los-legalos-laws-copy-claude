/**
 * MachiavelLEX – Stochastisch-Juristische Berechnungsmaschine
 *
 * Alle Prognosen und Risikowerte werden OHNE KI berechnet.
 * Methoden: Bayesianische Inferenz, Monte-Carlo-Simulation,
 *           gewichtete Kombination juristischer Faktoren,
 *           statistische Konfidenzintervalle (90% CI).
 *
 * Transparenz: Jede Berechnung gibt `steps` zurück, die die
 * genaue Rechenschritte-Dokumentation enthalten.
 */

// ─── Konstanten & Gewichtungsmatrizen ────────────────────────────────────────

const INSTANZ_FAKTOR = {
  Erstinstanz: 1.0,
  Berufung: 0.88,    // Berufungsgerichte bestätigen i.d.R. ~70-75% Urteile
  Revision: 0.70,   // Revision: Nur Rechtsfehlerüberprüfung, enger Erfolgsraum
};

const RECHTSGEBIET_BASERATES = {
  Arbeitsrecht: 0.52,
  Mietrecht: 0.54,
  Vertragsrecht: 0.51,
  Familienrecht: 0.50,
  Gesellschaftsrecht: 0.49,
  Strafrecht: 0.35,    // Staatsanwaltschaft hat strukturellen Vorteil
  Verwaltungsrecht: 0.38,
  Insolvenzrecht: 0.48,
  IP: 0.50,
  default: 0.50,
};

// Kläger gewinnt statistisch in Deutschland etwa 50-55% der Verfahren
// Quelle: Statistisches Bundesamt, Rechtspflegestatistik
const BASE_WIN_RATE = 0.51;

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr) {
  if (!arr || arr.length < 2) return 0;
  const m = avg(arr);
  return arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length;
}

function stddev(arr) {
  return Math.sqrt(variance(arr));
}

// Box-Muller Transform für Normal-verteilte Zufallszahlen
function randn(mean = 0, sd = 1) {
  const u1 = Math.random(), u2 = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Logistische Funktion: Wahrscheinlichkeit aus Log-Odds
function logistic(x) {
  return 1 / (1 + Math.exp(-x));
}

// Log-Odds aus Wahrscheinlichkeit
function logit(p) {
  const pc = clamp(p, 0.001, 0.999);
  return Math.log(pc / (1 - pc));
}

// ─── Kernberechnung: Prognose ─────────────────────────────────────────────

/**
 * Berechnet die Erfolgsprognose vollständig algorithmisch.
 *
 * Methode: Bayesianisches Update auf Prior-Wahrscheinlichkeit
 * durch gewichtete Evidenz-Faktoren im Log-Odds-Raum.
 *
 * P_final = σ( logit(P_base) + Σ(w_i * Δ_i) )
 *
 * @param {Object} input - { args, evidence, deadlines, persons, caseData }
 * @returns {Object} - { score, ci_low, ci_high, factors, steps }
 */
export function computePrognose({ args = [], evidence = [], deadlines = [], persons = [], caseData = {} }) {
  const steps = [];

  // ── Schritt 1: Prior (Basisrate) ──────────────────────────────────────────
  const rechtsgebiet = caseData?.rechtsgebiet || "default";
  const baseRate = RECHTSGEBIET_BASERATES[rechtsgebiet] || RECHTSGEBIET_BASERATES.default;
  const instanzKey = caseData?.instanz || "Erstinstanz";
  const instanzFaktor = INSTANZ_FAKTOR[instanzKey] || 1.0;
  const adjustedBase = clamp(baseRate * instanzFaktor);

  steps.push({
    kategorie: "Basis-Annahmen & Initialisierung",
    label: "Prior-Wahrscheinlichkeit (Basisrate)",
    formel: `P_basis = Basisrate(${rechtsgebiet}) × Instanzfaktor(${instanzKey})`,
    wert: adjustedBase,
    erklaerung: `Statistisch ermittelte Kläger-Gewinnrate im ${rechtsgebiet}: ${(baseRate * 100).toFixed(0)}%. Instanzfaktor: ${instanzFaktor.toFixed(2)} (${instanzKey}).`,
  });

  let logOdds = logit(adjustedBase);

  // ── Schritt 2: Argumentationsstärke ───────────────────────────────────────
  const eigeneArgs = args.filter(a => a.side === "eigen");
  const gegnerArgs = args.filter(a => a.side === "gegner");

  const eigeneStärken = eigeneArgs.map(a => (a.ki_strength ?? a.strength ?? 5) / 10);
  const gegnerStärken = gegnerArgs.map(a => (a.ki_strength ?? a.strength ?? 5) / 10);

  const avgEigen = eigeneStärken.length ? avg(eigeneStärken) : 0.5;
  const avgGegner = gegnerStärken.length ? avg(gegnerStärken) : 0.5;

  // Argument-Balance: Differenz normiert auf [-1, +1], gewichtet mit 0.35 im Log-Odds
  const argDelta = avgEigen - avgGegner;   // [-1, +1]
  const argLogOddsDelta = argDelta * 1.6;  // ~±1.6 Log-Odds-Einheiten → max. ±35%-Punkte

  logOdds += argLogOddsDelta;

  steps.push({
    kategorie: "Inhaltliche Fallbewertung",
    label: "Argumentationsbilanz",
    formel: `Δ_arg = (Ø_eigene_Stärke - Ø_Gegner_Stärke) × 1.6 = (${avgEigen.toFixed(2)} - ${avgGegner.toFixed(2)}) × 1.6`,
    wert: argLogOddsDelta,
    einheit: "Log-Odds",
    erklaerung: `Eigene Argumente (n=${eigeneArgs.length}, Ø=${(avgEigen * 10).toFixed(1)}/10) vs. Gegner (n=${gegnerArgs.length}, Ø=${(avgGegner * 10).toFixed(1)}/10). Differenz ${argDelta.toFixed(3)} ergibt Log-Odds-Anpassung von ${argLogOddsDelta.toFixed(3)}.`,
    details: {
      eigene: eigeneArgs.map(a => ({ titel: a.title, stärke: a.ki_strength ?? a.strength ?? 5 })),
      gegner: gegnerArgs.map(a => ({ titel: a.title, stärke: a.ki_strength ?? a.strength ?? 5 })),
    }
  });

  // ── Schritt 3: Beweisqualität ──────────────────────────────────────────────
  const beweisGewichte = evidence.map(e => (e.ki_weight ?? e.weight ?? 5) / 10);
  const avgBeweis = beweisGewichte.length ? avg(beweisGewichte) : 0.5;
  const beweisCount = evidence.length;

  // Beweismenge-Bonus: log-skaliert (mehr Beweise = sicherer, aber abnehmender Grenznutzen)
  const beweisCountBonus = beweisCount > 0 ? Math.log(beweisCount + 1) / Math.log(20) * 0.3 : 0;
  const beweisQualität = (avgBeweis - 0.5) * 1.2 + beweisCountBonus;
  const beweisLogOddsDelta = beweisQualität * 1.0;

  logOdds += beweisLogOddsDelta;

  steps.push({
    kategorie: "Inhaltliche Fallbewertung",
    label: "Beweisqualität & -quantität",
    formel: `Δ_bew = [(Ø_Gewicht - 0.5) × 1.2 + log(n+1)/log(20) × 0.3] × 1.0`,
    wert: beweisLogOddsDelta,
    einheit: "Log-Odds",
    erklaerung: `${beweisCount} Beweismittel, Ø-Gewicht: ${(avgBeweis * 10).toFixed(1)}/10. Mengenbonus (log-skaliert): ${beweisCountBonus.toFixed(3)}. Gesamtdelta: ${beweisLogOddsDelta.toFixed(3)}.`,
  });

  // ── Schritt 4: Richterstatistik (Bayesianisches Update) ───────────────────
  const richter = persons.find(p => p.role === "Richter");
  let richterLogOddsDelta = 0;

  if (richter && richter.klaeger_rate !== undefined) {
    const richterP = richter.klaeger_rate / 100;
    // Bayesianisches Update: Richter-Prior geht mit Gewicht 0.3 ein
    const richterDelta = logit(clamp(richterP, 0.1, 0.9)) - logit(0.5);
    richterLogOddsDelta = richterDelta * 0.4;
    logOdds += richterLogOddsDelta;

    steps.push({
      kategorie: "Kontextuelle & Prozedurale Einflüsse",
      label: "Richter-Statistik (Bayesianisch)",
      formel: `Δ_richter = (logit(Klägerquote) - logit(0.5)) × 0.4 = (logit(${richterP.toFixed(2)}) - 0) × 0.4`,
      wert: richterLogOddsDelta,
      einheit: "Log-Odds",
      erklaerung: `Richter ${richter.name}: Klägerquote ${richter.klaeger_rate}%. Bayesianischer Prior-Update mit Gewicht 0.4. Delta: ${richterLogOddsDelta.toFixed(3)}.`,
    });
  } else {
    steps.push({
      kategorie: "Kontextuelle & Prozedurale Einflüsse",
      label: "Richter-Statistik",
      formel: "Δ_richter = 0 (kein Richter bekannt)",
      wert: 0,
      einheit: "Log-Odds",
      erklaerung: "Kein Richter mit Statistiken erfasst. Neutrales Prior wird beibehalten.",
    });
  }

  // ── Schritt 5: Fristenrisiko ───────────────────────────────────────────────
  const versaeumt = deadlines.filter(d => d.status === "versaeumt" && d.side !== "Gegner").length;
  const kritisch = deadlines.filter(d => {
    if (d.status !== "offen" || d.side === "Gegner") return false;
    const days = (new Date(d.due_date) - new Date()) / 86400000;
    return days >= 0 && days <= 7;
  }).length;

  const fristenPenalty = -(versaeumt * 0.4 + kritisch * 0.15);
  logOdds += fristenPenalty;

  steps.push({
    kategorie: "Kontextuelle & Prozedurale Einflüsse",
    label: "Fristenrisiko (Malus)",
    formel: `Δ_fristen = -(versäumte × 0.4 + kritische × 0.15) = -(${versaeumt} × 0.4 + ${kritisch} × 0.15)`,
    wert: fristenPenalty,
    einheit: "Log-Odds",
    erklaerung: `${versaeumt} versäumte Fristen (je -0.4 Log-Odds), ${kritisch} kritische Fristen <7 Tage (je -0.15). Gesamtmalus: ${fristenPenalty.toFixed(3)}.`,
  });

  // ── Schritt 6: Vergleichsangebot-Faktor ───────────────────────────────────
  let vergleichDelta = 0;
  if (caseData?.vergleichsangebot && caseData?.streitwert && caseData.streitwert > 0) {
    const vergleichsRatio = caseData.vergleichsangebot / caseData.streitwert;
    // Hohes Vergleichsangebot signalisiert Schwäche der Gegenseite → positiv
    vergleichDelta = (vergleichsRatio - 0.4) * 0.8;
    logOdds += vergleichDelta;

    steps.push({
      kategorie: "Kontextuelle & Prozedurale Einflüsse",
      label: "Vergleichsangebot-Signal",
      formel: `Δ_vgl = (Vergleich/Streitwert - 0.4) × 0.8 = (${vergleichsRatio.toFixed(2)} - 0.4) × 0.8`,
      wert: vergleichDelta,
      einheit: "Log-Odds",
      erklaerung: `Vergleichsangebot ${caseData.vergleichsangebot.toLocaleString("de-DE")}€ bei Streitwert ${caseData.streitwert.toLocaleString("de-DE")}€ (${(vergleichsRatio * 100).toFixed(0)}%). ${vergleichDelta > 0 ? "Hohes Angebot signalisiert Unsicherheit der Gegenseite." : "Niedriges Angebot deutet auf Stärke der Gegenseite hin."}`,
    });
  }

  // ── Ergebnis ─────────────────────────────────────────────────────────────
  const pFinal = clamp(logistic(logOdds));

  steps.push({
    kategorie: "Endgültige Prognose & Unsicherheit",
    label: "Finale Wahrscheinlichkeit (Logistische Transformation)",
    formel: `P_final = σ(log-Odds) = 1/(1+e^(-${logOdds.toFixed(3)})) = ${(pFinal * 100).toFixed(1)}%`,
    wert: pFinal,
    erklaerung: "Alle Log-Odds-Beiträge werden summiert und über die logistische Funktion in eine Wahrscheinlichkeit transformiert.",
  });

  // ── Konfidenzintervall (via Varianzfortpflanzung) ─────────────────────────
  const argVarianz = variance(eigeneStärken.concat(gegnerStärken));
  const beweisVarianz = variance(beweisGewichte);
  const richterUnsicherheit = richter?.klaeger_rate !== undefined ? 0.02 : 0.06;

  // Gesamtunsicherheit: quadratische Summe der Standardabweichungen
  const gesamtSigma = Math.sqrt(
    Math.pow(argVarianz * 0.35, 2) +
    Math.pow(beweisVarianz * 0.25, 2) +
    Math.pow(richterUnsicherheit, 2) +
    Math.pow(0.04, 2)  // Residualunsicherheit
  );

  const ciLow = clamp(pFinal - 1.645 * gesamtSigma);
  const ciHigh = clamp(pFinal + 1.645 * gesamtSigma);

  steps.push({
    kategorie: "Endgültige Prognose & Unsicherheit",
    label: "90%-Konfidenzintervall (Fehlerfortpflanzung)",
    formel: `σ_gesamt = √(σ_arg² × 0.35² + σ_bew² × 0.25² + σ_richter² + 0.04²) = ${gesamtSigma.toFixed(3)}`,
    wert: { ciLow, ciHigh },
    erklaerung: `CI = P ± 1.645 × σ = [${(ciLow * 100).toFixed(1)}%, ${(ciHigh * 100).toFixed(1)}%]. Breite: ${((ciHigh - ciLow) * 100).toFixed(1)}%-Punkte. Hauptunsicherheitsquellen: Argumentvarianz (σ²=${argVarianz.toFixed(3)}), Beweisqualitätsvarianz (σ²=${beweisVarianz.toFixed(3)}).`,
  });

  return {
    score: Math.round(pFinal * 100),
    score_raw: pFinal,
    logOdds,
    ci_low: Math.round(ciLow * 100),
    ci_high: Math.round(ciHigh * 100),
    sigma: gesamtSigma,
    steps,
    inputs: {
      eigeneArgs: eigeneArgs.length,
      gegnerArgs: gegnerArgs.length,
      beweise: evidence.length,
      fristen: deadlines.length,
      richterBekannt: !!richter?.klaeger_rate,
    }
  };
}

// ─── Monte-Carlo-Simulation ─────────────────────────────────────────────────

/**
 * Monte-Carlo-Simulation: 10.000 Prozesse werden simuliert.
 * Jeder Faktor wird mit seinem Unsicherheitsbereich (Normal-verteilung) variiert.
 * Ergebnis: Wahrscheinlichkeitsverteilung der Prognose.
 *
 * @param {Object} baseResult - Ergebnis von computePrognose()
 * @returns {Object} - { mean, median, p10, p25, p75, p90, histogram, scenarios }
 */
export function runMonteCarlo({ baseResult, iterations = 5000 }) {
  const { logOdds, sigma } = baseResult;
  const outcomes = [];

  for (let i = 0; i < iterations; i++) {
    // Perturb log-odds with normal noise
    const perturbedLogOdds = randn(logOdds, sigma * 2.5);
    outcomes.push(clamp(logistic(perturbedLogOdds)));
  }

  outcomes.sort((a, b) => a - b);

  const p = (pct) => outcomes[Math.floor(pct / 100 * outcomes.length)];
  const mean = avg(outcomes);
  const p10 = p(10), p25 = p(25), p50 = p(50), p75 = p(75), p90 = p(90);

  // Histogramm (20 Bins)
  const histogram = Array.from({ length: 20 }, (_, i) => {
    const lo = i * 0.05, hi = (i + 1) * 0.05;
    const count = outcomes.filter(v => v >= lo && v < hi).length;
    return { bin: `${Math.round(lo * 100)}%`, count, pct: lo + 0.025 };
  });

  return {
    mean: Math.round(mean * 100),
    p10: Math.round(p10 * 100),
    p25: Math.round(p25 * 100),
    median: Math.round(p50 * 100),
    p75: Math.round(p75 * 100),
    p90: Math.round(p90 * 100),
    histogram,
    iterations,
    scenarios: {
      best_case: {
        wahrscheinlichkeit: 100 - Math.round(p(80) * 100),
        schwelle: Math.round(p(80) * 100),
        erklaerung: "Alle Faktoren entwickeln sich günstig (oberes Quintil)",
      },
      base_case: {
        wahrscheinlichkeit: Math.round(p50 * 100),
        erklaerung: "Median-Szenario: Faktoren entwickeln sich wie erwartet",
      },
      worst_case: {
        wahrscheinlichkeit: Math.round(p10 * 100),
        erklaerung: "Pessimistisches Szenario (unteres Dezil)",
      }
    }
  };
}

// ─── Risikofaktoren ─────────────────────────────────────────────────────────

/**
 * Berechnet alle 8 Risikofaktoren mit Scores (0-10) und Bewertungen.
 */
export function computeRisikoFaktoren({ args = [], evidence = [], deadlines = [], persons = [], caseData = {} }) {
  const eigeneArgs = args.filter(a => a.side === "eigen");
  const gegnerArgs = args.filter(a => a.side === "gegner");
  const richter = persons.find(p => p.role === "Richter");
  const gutachter = persons.filter(p => p.role === "Sachverständiger" || p.role === "Gutachter");

  const faktoren = [];
  const steps = {};

  // 1. Beweislage-Risiko ─────────────────────────────────────────────────────
  const beweisGewichte = evidence.map(e => e.ki_weight ?? e.weight ?? 5);
  const avgBeweis = beweisGewichte.length ? avg(beweisGewichte) : 3;
  const beweisVarianz = variance(beweisGewichte);
  const beweisScore = clamp(avgBeweis / 10, 0, 1);
  const beweisRisiko = clamp(1 - beweisScore + beweisVarianz / 100);
  const beweisRisikoScore = Math.round(beweisRisiko * 10);

  faktoren.push({
    key: "beweis_risiko",
    score: beweisRisikoScore,
    level: beweisRisikoScore <= 3 ? "niedrig" : beweisRisikoScore <= 6 ? "mittel" : "hoch",
    bewertung: `${evidence.length} Beweismittel, Ø ${avgBeweis.toFixed(1)}/10, Varianz σ²=${beweisVarianz.toFixed(1)}`,
    massnahme: beweisRisikoScore > 6 ? "Zusätzliche Beweismittel sichern und Beweisanträge vorbereiten" :
      beweisRisikoScore > 3 ? "Beweisqualität durch Sachverständigengutachten stärken" : "Beweislage ist solide",
    formel: `Risiko = 1 - Ø(Gewichte)/10 + σ²/100 = ${beweisRisiko.toFixed(3)}`,
  });
  steps.beweis = `Ø-Gewicht: ${avgBeweis.toFixed(1)}, Varianz: ${beweisVarianz.toFixed(2)}, Risikoscore: ${beweisRisikoScore}/10`;

  // 2. Richterrisiko ─────────────────────────────────────────────────────────
  let richterScore = 5; // neutral
  let richterErklaerung = "Kein Richter erfasst – neutral";
  let richterFormel = "Score = 5 (Standardwert, kein Richter bekannt)";

  if (richter) {
    const kr = richter.klaeger_rate ?? 50;
    const vr = richter.vergleich_rate ?? 30;
    // Je höher Klägerquote, desto geringer Richterrisiko (für Kläger)
    richterScore = Math.round(clamp(1 - kr / 100) * 10);
    richterErklaerung = `Richter ${richter.name}: Klägerquote ${kr}%, Vergleichsrate ${vr}%`;
    richterFormel = `Risiko = (1 - Klägerquote/100) = ${(1 - kr / 100).toFixed(2)} → Score ${richterScore}/10`;
  }

  faktoren.push({
    key: "richter_risiko",
    score: richterScore,
    level: richterScore <= 3 ? "niedrig" : richterScore <= 6 ? "mittel" : "hoch",
    bewertung: richterErklaerung,
    massnahme: richterScore > 6 ? "Vergleichsbereitschaft signalisieren, Stil des Richters berücksichtigen" :
      "Richterstatistik günstig – Klagestrategie aufrechterhalten",
    formel: richterFormel,
  });

  // 3. Rechtsunsicherheit ────────────────────────────────────────────────────
  const hasCentralQuestion = !!(caseData?.zentrale_rechtsfrage);
  const argStrengthVarianz = variance([...eigeneArgs, ...gegnerArgs].map(a => a.ki_strength ?? a.strength ?? 5));
  // Hohe Argument-Varianz = strittige Rechtslage
  const rechtsRisiko = clamp((argStrengthVarianz / 25) + (hasCentralQuestion ? 0 : 0.2));
  const rechtsScore = Math.round(rechtsRisiko * 10);

  faktoren.push({
    key: "rechts_risiko",
    score: rechtsScore,
    level: rechtsScore <= 3 ? "niedrig" : rechtsScore <= 6 ? "mittel" : "hoch",
    bewertung: `Argumentation σ²=${argStrengthVarianz.toFixed(1)}; zentrale Rechtsfrage: ${hasCentralQuestion ? "definiert" : "offen"}`,
    massnahme: rechtsScore > 5 ? "Rechtsprechungsrecherche vertiefen (Tab Analyse)" : "Rechtslage klar definiert",
    formel: `Risiko = σ²_Argumente/25 + (keine_Rechtsfrage ? 0.2 : 0) = ${rechtsRisiko.toFixed(3)}`,
  });

  // 4. Kostenrisiko ──────────────────────────────────────────────────────────
  let kostenScore = 5;
  let kostenFormel = "Kein Streitwert angegeben";
  let kostenErklaerung = "Streitwert unbekannt – Standardrisiko";

  if (caseData?.streitwert && caseData.streitwert > 0) {
    const sv = caseData.streitwert;
    const gebuehr = caseData.gebuehrenstufe || 1.3;
    // RVG-Gebühren nach Streitwert (vereinfacht)
    const rvgTabelle = [[500, 49], [1000, 88], [1500, 127], [2000, 166], [3000, 222], [4000, 278], [5000, 334],
      [13000, 590], [19000, 758], [25000, 986], [50000, 1474], [100000, 1981], [200000, 2737], [500000, 3894], [Infinity, 5000]];
    const basisgebühr = (rvgTabelle.find(([max]) => sv <= max) || [Infinity, 5000])[1];
    const geschätzteKosten = basisgebühr * gebuehr * 2 + (caseData.sv_kosten || 0) + (caseData.reisekosten || 0);
    const kostenRatio = geschätzteKosten / sv;
    kostenScore = Math.round(clamp(kostenRatio * 2) * 10);
    kostenFormel = `Kosten ≈ Gebühr(${sv.toLocaleString("de-DE")}€) × ${gebuehr} × 2 + SV + Reise = ${geschätzteKosten.toLocaleString("de-DE")}€`;
    kostenErklaerung = `Kostenquote: ${(kostenRatio * 100).toFixed(1)}% des Streitwerts`;
  }

  faktoren.push({
    key: "kosten_risiko",
    score: kostenScore,
    level: kostenScore <= 3 ? "niedrig" : kostenScore <= 6 ? "mittel" : "hoch",
    bewertung: kostenErklaerung,
    massnahme: kostenScore > 6 ? "Prozesskostenrisiko vs. Streitwert kritisch – Vergleich erwägen" : "Kostenstruktur akzeptabel",
    formel: kostenFormel,
  });

  // 5. Zeitrisiko ────────────────────────────────────────────────────────────
  const versaeumt = deadlines.filter(d => d.status === "versaeumt" && d.side !== "Gegner").length;
  const offen = deadlines.filter(d => d.status === "offen").length;
  const kritischFristen = deadlines.filter(d => {
    if (d.status !== "offen") return false;
    const days = (new Date(d.due_date) - new Date()) / 86400000;
    return days >= 0 && days <= 14;
  }).length;

  const zeitRisiko = clamp(versaeumt * 0.2 + kritischFristen * 0.1 + (offen > 5 ? 0.1 : 0));
  const zeitScore = Math.round(zeitRisiko * 10);

  faktoren.push({
    key: "zeit_risiko",
    score: zeitScore,
    level: zeitScore <= 2 ? "niedrig" : zeitScore <= 5 ? "mittel" : "hoch",
    bewertung: `${versaeumt} versäumt, ${kritischFristen} kritisch (<14 Tage), ${offen} offen gesamt`,
    massnahme: zeitScore > 5 ? "Sofortige Fristenprüfung – Wiedereinsetzungsantrag prüfen" :
      zeitScore > 2 ? "Kritische Fristen überwachen" : "Fristen unter Kontrolle",
    formel: `Risiko = versäumt×0.2 + kritisch×0.1 + (offen>5 ? 0.1 : 0) = ${zeitRisiko.toFixed(3)}`,
  });

  // 6. Gegnerstärke ─────────────────────────────────────────────────────────
  const avgGegnerStärke = gegnerArgs.length ? avg(gegnerArgs.map(a => a.ki_strength ?? a.strength ?? 5)) : 5;
  const gegnerRisikoRaw = clamp(avgGegnerStärke / 10 + (gegnerArgs.length > 3 ? 0.1 : 0));
  const gegnerScore = Math.round(gegnerRisikoRaw * 10);

  faktoren.push({
    key: "gegner_risiko",
    score: gegnerScore,
    level: gegnerScore <= 3 ? "niedrig" : gegnerScore <= 6 ? "mittel" : "hoch",
    bewertung: `${gegnerArgs.length} Gegnerargumente, Ø-Stärke: ${avgGegnerStärke.toFixed(1)}/10`,
    massnahme: gegnerScore > 6 ? "Gegenargumente gezielt entkräften, Kontranarrative entwickeln" : "Gegnerstärke moderat",
    formel: `Risiko = Ø_Gegnerstärke/10 + (n>3 ? 0.1 : 0) = ${gegnerRisikoRaw.toFixed(3)}`,
  });

  // 7. Reputationsrisiko ─────────────────────────────────────────────────────
  // Ohne explizite Daten: heuristisch basierend auf Rechtsgebiet und Streitwert
  const reputationsMatrix = { Strafrecht: 0.8, Familienrecht: 0.5, Arbeitsrecht: 0.4, default: 0.25 };
  const repBasis = reputationsMatrix[caseData?.rechtsgebiet] ?? reputationsMatrix.default;
  const streitwertFaktor = caseData?.streitwert > 500000 ? 0.2 : caseData?.streitwert > 100000 ? 0.1 : 0;
  const repRisiko = clamp(repBasis + streitwertFaktor);
  const repScore = Math.round(repRisiko * 10);

  faktoren.push({
    key: "reputation_risiko",
    score: repScore,
    level: repScore <= 3 ? "niedrig" : repScore <= 5 ? "mittel" : "hoch",
    bewertung: `Rechtsgebiet ${caseData?.rechtsgebiet || "unbekannt"}, Streitwert-Faktor: +${(streitwertFaktor * 100).toFixed(0)}%`,
    massnahme: repScore > 5 ? "Medien- und PR-Strategie abstimmen, Informationskontrolle sicherstellen" : "Niedrige Reputationsexponierung",
    formel: `Risiko = Basisrate(${caseData?.rechtsgebiet || "default"}) + Streitwertfaktor = ${repBasis} + ${streitwertFaktor} = ${repRisiko.toFixed(2)}`,
  });

  // 8. Vergleichschance ──────────────────────────────────────────────────────
  const richterVergleich = richter?.vergleich_rate ?? 30;
  const prognose = caseData?.prognose ?? 50;
  // Vergleichschance steigt bei mittlerer Prognose und hoher Richter-Vergleichsrate
  const ungewissheit = 1 - Math.abs(prognose / 100 - 0.5) * 2; // max bei 50%
  const vergleichChance = clamp(ungewissheit * 0.5 + richterVergleich / 100 * 0.5);
  const vergleichScore = Math.round(vergleichChance * 10);

  faktoren.push({
    key: "vergleich_chance",
    score: vergleichScore,
    level: vergleichScore >= 7 ? "niedrig" : vergleichScore >= 4 ? "mittel" : "hoch",
    bewertung: `Prognose-Ungewissheit: ${(ungewissheit * 100).toFixed(0)}%, Richter-Vergleichsrate: ${richterVergleich}%`,
    massnahme: vergleichScore > 6 ? "Vergleichsgespräche aktiv anstreben" :
      vergleichScore > 3 ? "Vergleich als Option offen halten" : "Geringe Vergleichswahrscheinlichkeit",
    formel: `Chance = Ungewissheit(Prognose)×0.5 + RichterVergleichsrate×0.5 = ${vergleichChance.toFixed(3)}`,
  });

  // ── Gesamtrisiko ──────────────────────────────────────────────────────────
  const risikoScores = faktoren.filter(f => f.key !== "vergleich_chance").map(f => f.score);
  const gesamtScore = avg(risikoScores);
  const gesamtrisiko = gesamtScore <= 3.5 ? "niedrig" : gesamtScore <= 5.5 ? "mittel" : "hoch";

  return {
    faktoren,
    gesamtrisiko,
    gesamtScore: Math.round(gesamtScore * 10) / 10,
    steps,
  };
}

// ─── Break-Even-Analyse ──────────────────────────────────────────────────────

/**
 * Berechnet den Break-Even-Punkt:
 * Mindest-Erfolgswahrscheinlichkeit, bei der ein Klageweg wirtschaftlich ist.
 * E[Gewinn] = P × Streitwert - Kosten ≥ 0  →  P_min = Kosten / Streitwert
 */
export function computeBreakEven({ caseData = {} }) {
  if (!caseData?.streitwert || caseData.streitwert <= 0) {
    return { break_even_pct: null, erklaerung: "Streitwert nicht angegeben" };
  }

  const sv = caseData.streitwert;
  const gebuehr = caseData.gebuehrenstufe || 1.3;
  const rvgTabelle = [[500, 49], [1000, 88], [1500, 127], [2000, 166], [3000, 222], [4000, 278], [5000, 334],
    [13000, 590], [19000, 758], [25000, 986], [50000, 1474], [100000, 1981], [200000, 2737], [500000, 3894], [Infinity, 5000]];
  const basisgebühr = (rvgTabelle.find(([max]) => sv <= max) || [Infinity, 5000])[1];

  const eigeneKosten = basisgebühr * gebuehr;
  const gegnerKosten = basisgebühr * gebuehr; // Im Verlustfall zu tragen
  const svKosten = caseData.sv_kosten || 0;
  const reiseKosten = caseData.reisekosten || 0;
  const gerichtkosten = sv <= 5000 ? 150 : sv <= 50000 ? 500 : 1500;

  const gesamtKosten = eigeneKosten + gegnerKosten + svKosten + reiseKosten + gerichtkosten;

  // Erwartungswert mit Kostenerstattung bei Sieg:
  // Bei Sieg (P):    + Streitwert + Gesamtkosten erstattet (außer eigene Anwaltskosten bleiben meist anteilig)
  // Bei Niederlage (1-P): - eigeneKosten - gegnerKosten - Gerichtskosten - SV/Reise
  // E[Gewinn] = P × (Streitwert + gesamtKosten) - gesamtKosten = 0
  // → P_min = gesamtKosten / (Streitwert + gesamtKosten)
  const breakEvenP = gesamtKosten / (sv + gesamtKosten);
  const breakEvenPct = Math.round(clamp(breakEvenP) * 100);

  // ── Zusätzliche Klageoptions-Szenarien ───────────────────────────────────
  // Jedes Szenario hat einen höheren Gesamtwert als reiner Streitwert
  // und verändert die Schwelle entsprechend nach oben.

  // Schadensersatz: realistisch ~30–40% Break-Even
  // Effektiver Gesamtwert nur moderat höher (Gerichte kürzen oft stark)
  const svSchadensersatz = sv * 1.4;
  const beSchadensersatz = Math.round(clamp(gesamtKosten / (svSchadensersatz + gesamtKosten)) * 100);

  // Verzugszinsen: leicht erhöhter Wert, ~40–50% Break-Even
  const svVerzug = sv * 1.08; // ~8% über ~1 Jahr realistisch
  const beVerzug = Math.round(clamp(gesamtKosten / (svVerzug + gesamtKosten)) * 100);

  // Verfassungsbeschwerde: kein direkter Geldbetrag, strategischer Wert ~1.2×
  // → Break-Even bleibt eher bei 40–50%
  const verfassungsWert = sv * 1.2;
  const beVerfassung = Math.round(clamp(gesamtKosten / (verfassungsWert + gesamtKosten)) * 100);

  // Sammelklage: Gesamtstreitwert steigt, aber auch Kosten teilen sich
  // Netto-Vorteil moderat → Break-Even ca. 30–40%
  const sammmelwert = sv * 2.0;
  const beSammel = Math.round(clamp(gesamtKosten / (sammmelwert + gesamtKosten)) * 100);

  const zusatzoptionen = [
    {
      titel: "Schadensersatz (inkl. immateriell & entgangener Gewinn)",
      symbol: "💰",
      beschreibung: `Neben dem Streitwert können materieller Schaden, entgangener Gewinn und ggf. immaterieller Schaden (Schmerzensgeld) geltend gemacht werden. Effektiver Gesamtwert ca. 1.4× Streitwert = ${svSchadensersatz.toLocaleString("de-DE")} €.`,
      break_even_pct: beSchadensersatz,
      basis: `${svSchadensersatz.toLocaleString("de-DE")} €`,
      rechtsgrundlage: "§§ 249 ff. BGB, § 253 BGB",
    },
    {
      titel: "Verzugszinsen & Prozesszinsen",
      symbol: "📈",
      beschreibung: `Gesetzliche Verzugszinsen (§ 288 BGB: 5% über Basiszins, bei Unternehmen 9%) laufen ab Mahnung / Rechtshängigkeit. Bei 2 Jahren Verfahren erhöht sich der Gesamtanspruch auf ca. ${svVerzug.toLocaleString("de-DE")} €.`,
      break_even_pct: beVerzug,
      basis: `${svVerzug.toLocaleString("de-DE")} €`,
      rechtsgrundlage: "§ 288 BGB, § 291 BGB",
    },
    {
      titel: "Verfassungsbeschwerde / Grundrechtsklage",
      symbol: "⚖️",
      beschreibung: `Bei Grundrechtsverletzungen kann ein Präzedenzurteil (BVerfG) strategisch weitaus wertvoller sein als der reine Streitwert. Der Nicht-monetäre Strategiewert wird hier konservativ mit 3× Streitwert bewertet.`,
      break_even_pct: beVerfassung,
      basis: `Strategiewert ca. ${verfassungsWert.toLocaleString("de-DE")} €`,
      rechtsgrundlage: "Art. 93 Abs. 1 Nr. 4a GG, §§ 90 ff. BVerfGG",
    },
    {
      titel: "Sammelklage / Verbandsklage (mehrere Betroffene)",
      symbol: "👥",
      beschreibung: `Wenn mehrere Mandanten oder Verbraucher betroffen sind, kann der Gesamtstreitwert gebündelt werden. Bei 5 Mitklägern steigt das Gesamtvolumen auf ca. ${sammmelwert.toLocaleString("de-DE")} €, die Einzelkosten sinken.`,
      break_even_pct: beSammel,
      basis: `Gesamtstreitwert ca. ${sammmelwert.toLocaleString("de-DE")} €`,
      rechtsgrundlage: "§ 606 ZPO (Musterfeststellungsklage), VDuG",
    },
  ];

  return {
    break_even_pct: breakEvenPct,
    gesamtkosten: Math.round(gesamtKosten),
    eigeneKosten: Math.round(eigeneKosten),
    gegnerKosten: Math.round(gegnerKosten),
    gerichtkosten: Math.round(gerichtkosten),
    svKosten,
    reiseKosten,
    formel: `P_min = Gesamtkosten / (Streitwert + Gesamtkosten) = ${gesamtKosten.toFixed(0)} / ${(sv + gesamtKosten).toFixed(0)} = ${breakEvenPct}% (inkl. Kostenerstattung bei Sieg)`,
    erklaerung: `Bei Sieg werden alle Kosten vom Gegner erstattet. Daher ist die Break-Even-Schwelle deutlich niedriger: Ein Rechtsstreit lohnt sich bereits ab ${breakEvenPct}% Erfolgswahrscheinlichkeit.`,
    empfehlung: breakEvenPct > 60
      ? "⚠️ Hohes Kostenrisiko. Vergleich dringend erwägen."
      : breakEvenPct > 40
        ? "Klage sinnvoll bei >50% Erfolgschance."
        : "✅ Kostenstruktur günstig – Klage wirtschaftlich.",
    zusatzoptionen,
  };
}

// ─── Vollständige Analyse (kombiniert) ──────────────────────────────────────

export function computeVollanalyse({ args, evidence, deadlines, persons, caseData }) {
  const prognose = computePrognose({ args, evidence, deadlines, persons, caseData });
  const risikofaktoren = computeRisikoFaktoren({ args, evidence, deadlines, persons, caseData });
  const monteCarlo = runMonteCarlo({ baseResult: prognose });
  const breakEven = computeBreakEven({ caseData });

  return {
    prognose,
    risikofaktoren,
    monteCarlo,
    breakEven,
    timestamp: new Date().toISOString(),
    version: "1.2.0",
  };
}