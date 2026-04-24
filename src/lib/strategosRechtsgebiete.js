/**
 * STRATEGOS · Vollständige Rechtsgebiets-Wissensbasis
 * 17 Blöcke · Alle Felder · Alle Formeln · Alle Jurisdiktionen
 */

export const RECHTSGEBIETE_VOLLSTAENDIG = [
  // ── BLOCK I ─────────────────────────────────────────────────────────────
  {
    key: "steuerrecht_national",
    label: "Steuerrecht (National)",
    kurzlabel: "Steuer National",
    icon: "💰",
    color: "#34C759",
    block: "I",
    pflichtfelder: [
      "Körperschaftsteuersatz", "Gewerbesteuer-Hebesatz je Gemeinde",
      "Umsatzsteuer-Voranmeldungen & Dauerfristverlängerungen",
      "Verlustvorträge (§ 10d EStG – Mindestbesteuerung 60% ab 1 Mio. €)",
      "Zinsschranke (§ 4h EStG – EBITDA-Grenze 30%)",
      "Thesaurierungsbegünstigung (Personengesellschaften)",
      "Organschaft / Ergebnisabführungsvertrag",
      "Laufende Betriebsprüfungen (Zeitraum & Schwerpunkte)",
      "Offene Einsprüche und Klagen",
    ],
    formeln: [
      {
        name: "Effektive Gesamtsteuerbelastung KapGes DE",
        formel: "EStB = 15% (KSt) + 0,825% (SolZ) + Hebesatz × 3,5% (GewSt) → Typisch 29–33%",
      },
      {
        name: "Zinsschranke",
        formel: "Abzugsfähige Nettozinsen = min(tatsächliche Nettozinsen ; 30% × steuerliches EBITDA)",
      },
      {
        name: "Mindestbesteuerung § 10d EStG",
        formel: "Verrechenbarer Verlust = 1.000.000 € + 60% × (zvE − 1.000.000 €)",
      },
    ],
    dokumente: ["Steuerbescheide 5 Jahre", "Jahresabschlüsse", "Ergebnisabführungsverträge", "Prüfungsberichte Finanzamt"],
    jurisdiktionen: { DE: true, AT: true, CH: true },
  },
  {
    key: "steuerrecht_international",
    label: "Internationales Steuerrecht / Verrechnungspreise",
    kurzlabel: "Steuer Intl.",
    icon: "🌍",
    color: "#2ECC71",
    block: "I",
    pflichtfelder: [
      "Konzernstruktur mit Beteiligungsquoten & Jurisdiktionen",
      "Konzerninterne Transaktionen (Waren, Dienstleistungen, Lizenzen, Darlehen, Kostenumlagen) mit Volumen & Preisen",
      "Verrechnungspreismethode je Transaktion (Preisvergleich, Wiederverkaufspreis, Kostenaufschlag, TNMM, Profit Split)",
      "Funktions- und Risikoanalyse je Gesellschaft",
      "Betriebsstätten weltweit (feste Einrichtung, Vertreter, Server, Lager, Baustellen >12 Monate)",
      "Quellensteuereinbehalte (Dividenden / Zinsen / Lizenzen) & anwendbare DBA",
      "BEPS Pillar 2 Einordnung",
      "Country-by-Country-Report",
    ],
    formeln: [
      {
        name: "Fremdvergleichs-Score (FVS)",
        formel: "FVS = (konzerninterner Preis ÷ Interquartilsbereich-Median Benchmark) × 100 → 75–125: akzeptabel",
      },
      {
        name: "BEPS Pillar 2 Top-Up-Tax",
        formel: "TUT = max(0 ; (15% − GloBE-Effektivsteuersatz_Land) × GloBE-Nettoeinkommen_Land)",
      },
      {
        name: "Quellensteueroptimierung via Holding",
        formel: "Nettoertrag = Bruttozahlung × (1 − min(DBA-Satz_A ; DBA-Satz_B ; Inlandssatz))",
      },
      {
        name: "CbCR Risikoindikator",
        formel: "Auffälligkeit = (Gewinnanteil_Land ÷ Umsatzanteil_Land) − 1 → >+0,5 oder <−0,3: Behördenrisiko",
      },
      {
        name: "Profit Split Residualgewinn",
        formel: "Residualgewinn_A = Gesamtgewinn − RoutinerenditeA − RoutinerenditeB × (WertbeitragA ÷ Gesamtwertbeitrag)",
      },
    ],
    jurisdiktionen: { DE: true, AT: true, CH: true, UK: true, US: true, EU: true, CN: true },
  },
  {
    key: "umsatzsteuer",
    label: "Umsatzsteuer / VAT International",
    kurzlabel: "USt / VAT",
    icon: "🧾",
    color: "#27AE60",
    block: "I",
    pflichtfelder: [
      "Leistungsortbestimmung (B2B vs. B2C, § 3a UStG / Art. 44–59 MwStSystRL)",
      "OSS-Registrierung (One-Stop-Shop EU-B2C)",
      "Fiskalvertreter in Drittländern",
      "Reverse-Charge-Mechanismus",
      "Vorsteuerquoten bei gemischter Verwendung",
    ],
    formeln: [
      {
        name: "Vorsteuerschlüssel gemischte Verwendung",
        formel: "Abziehbare Vorsteuer = Gesamtvorsteuer × (steuerpflichtige Umsätze ÷ Gesamtumsätze)",
      },
    ],
    jurisdiktionen: { DE: true, AT: true, CH: true, EU: true, UK: true },
  },
  // ── BLOCK II ────────────────────────────────────────────────────────────
  {
    key: "ip_recht",
    label: "IP / Patent / Marken / Urheberrecht",
    kurzlabel: "IP / Patent",
    icon: "®️",
    color: "#FF2D55",
    block: "II",
    pflichtfelder: [
      "Patentstatus (angemeldet/erteilt/anhängig) mit Anmeldenummern",
      "Ergänzende Schutzzertifikate (SPC Pharma/Pflanzenschutz – max. 5 Jahre)",
      "Arbeitnehmererfindungen (§§ 5–12 ArbEG: Meldepflicht, Vergütungsanspruch)",
      "NPE / Patent Trolls als Gegner",
      "Urheberrecht: Art des Werkes, Nutzungsrechte (einfach/ausschließlich)",
      "Open-Source-Lizenzen im Code (GPL Copyleft-Risiko!)",
      "Datenbankschutz (§§ 87a ff. UrhG)",
      "Markenregistrierungen (DE / EUIPO / WIPO / US USPTO)",
      "Domain-Streitigkeiten (UDRP / DENIC)",
      "Design/Geschmacksmuster (EUIPO: bis 25 Jahre in 5-Jahres-Perioden)",
      "Trade Secrets / Geschäftsgeheimnisse (GeschGehG: Schutzmaßnahmen dokumentiert?)",
    ],
    formeln: [
      {
        name: "Arbeitnehmererfinder-Vergütung",
        formel: "Vergütung = Erfindungswert × Anteilsfaktor (2–20% je nach Stellung & Erfindungsanteil)",
      },
      {
        name: "Lizenzschadensersatz Urheberrecht (dreifach)",
        formel: "SE = max(entgangener Gewinn ; Lizenzanalogie ; Verletzergewinn)",
      },
      {
        name: "GPL-Kontaminationsrisiko",
        formel: "Risiko = binär: GPL-Integration in proprietären Code ohne Offenlegung = vollständige Quellcode-Offenlegungspflicht ODER Unterlassung + SE",
      },
    ],
    jurisdiktionen: { DE: true, EU: true, US: true, UK: true, CH: true },
  },
  // ── BLOCK III ───────────────────────────────────────────────────────────
  {
    key: "kartellrecht",
    label: "Kartellrecht",
    kurzlabel: "Kartellrecht",
    icon: "⚖️",
    color: "#AF52DE",
    block: "III",
    pflichtfelder: [
      "Fusionskontrolle: Marktanteile, SIEC-Test, Phase I/II (25/90 AT), Gun Jumping",
      "Killer Acquisitions (neue EU-Referenzschwellen)",
      "Horizontale Absprachen (Preise, Mengen, Kapazitäten, Informationsaustausch)",
      "Hub-and-Spoke-Kartell / Algorithmen-Kartelle",
      "Vertikale Beschränkungen: Marktanteile (Safe Harbour <30%), Art der Beschränkung",
      "Mindestpreisbindung (Hardcore – nie freigestellt)",
      "Marktmissbrauch: Marktanteil auf relevantem Markt (sachlich + räumlich)",
      "SSNIP-Test (5–10% Preiserhöhung → Marktabgrenzung)",
      "Kampfpreise (Areeda-Turner-Test: Preis < variable Durchschnittskosten)",
      "Essential Facility Doctrine",
    ],
    formeln: [
      {
        name: "Upward Pricing Pressure (UPP) Fusionskontrolle",
        formel: "UPP_A = (Preis_B − Grenzkosten_B) × Diversionsverhältnis_A→B − Effizienzgewinn_A → positiv = Preiserhöhungsdruck",
      },
      {
        name: "Safe-Harbour-Prüfung vertikal",
        formel: "Freistellung wenn: Marktanteil Lieferant ≤30% UND Marktanteil Abnehmer ≤30% UND keine Hardcore-Beschränkung (alle 3 Bedingungen)",
      },
      {
        name: "Bußgeld Kartellrecht EU",
        formel: "Bußgeld = bis 10% des weltweiten Jahresumsatzes + Gewinnabschöpfung; Kronzeuge: bis 100% Reduktion",
      },
    ],
    jurisdiktionen: { DE: true, EU: true, US: true, UK: true },
  },
  // ── BLOCK IV ────────────────────────────────────────────────────────────
  {
    key: "vertragsrecht",
    label: "Vertragsrecht / M&A / Schiedsverfahren",
    kurzlabel: "Vertragsrecht",
    icon: "📝",
    color: "#007AFF",
    block: "IV",
    pflichtfelder: [
      "AGB-Kontrolle (§§ 305 ff. BGB: überraschende Klauseln, unangemessene Benachteiligung)",
      "Störung der Geschäftsgrundlage (§ 313 BGB – COVID, Energie, Krieg)",
      "Force Majeure Definition & Folgen",
      "M&A: Share Deal vs. Asset Deal",
      "Due Diligence Scope (Legal, Financial, Tax, Commercial, Technical, Environmental, HR, IP, IT)",
      "Representations & Warranties, Indemnities, W&R Insurance",
      "Locked-Box vs. Closing Accounts Mechanismus",
      "JV: Governance, Deadlock, Put/Call-Optionen, Tag-Along, Drag-Along",
      "Schiedsvereinbarung (ICC/DIS/LCIA/AAA/VIAC/ad hoc), Schiedsort, Anzahl Schiedsrichter",
      "Emergency Arbitrator (Eilschiedsverfahren <15 Tage)",
      "New York Convention Anerkennung & Vollstreckung (168 Staaten)",
      "eIDAS – qualifizierte elektronische Signatur",
    ],
    formeln: [
      {
        name: "Locked-Box Kaufpreisanpassung",
        formel: "Kaufpreis_final = Kaufpreis_Locked-Box + Leakage_Penalty − Permitted_Leakage",
      },
      {
        name: "Closing Accounts Kaufpreisanpassung",
        formel: "Kaufpreis_final = Kaufpreis_initial ± NWC-Anpassung ± Nettoverschuldungs-Anpassung ± Capex-Anpassung",
      },
      {
        name: "EBITDA-Multiplikator-Bewertung",
        formel: "Unternehmenswert = EBITDA × Branchenmultiplikator (Tech-SaaS 8–20×, Industrie 5–9×, Handel 4–7×, Pharma 10–18×)",
      },
      {
        name: "Equity Bridge (EV → Eigenkapitalwert)",
        formel: "Eigenkapitalwert = EV − Nettoverschuldung − Pensionsrückstellungen − schuldenähnliche Posten + Barmittel",
      },
      {
        name: "Kostenvergleich Schiedsgericht vs. Staatsgericht",
        formel: "Schiedskosten ≈ 0,5–2% Streitwert (ICC) + 3 Anwaltshonorare + Gutachten; ab ~500.000 € Streitwert oft günstiger bei int. SV",
      },
    ],
    jurisdiktionen: { DE: true, AT: true, CH: true, UK: true, US: true, EU: true, FR: true },
  },
  // ── BLOCK V ─────────────────────────────────────────────────────────────
  {
    key: "gesellschaftsrecht",
    label: "Gesellschaftsrecht",
    kurzlabel: "Gesellschaftsrecht",
    icon: "🏢",
    color: "#5856D6",
    block: "V",
    pflichtfelder: [
      "Rechtsform & Gründungsdokumente (Gesellschaftsvertrag / Satzung)",
      "Gesellschafterkreis & Beteiligungsquoten",
      "Geschäftsführer / Vorstand (Einzel- oder Gesamtvertretung)",
      "Vinkulierungsklauseln",
      "Gesellschafterbeschlüsse (Quoren: einfache, qualifizierte Mehrheit, Einstimmigkeit)",
      "Treuepflichten, Nachschusspflichten, Abfindungsklauseln",
      "Wettbewerbsverbote der Gesellschafter",
      "Gesellschafterstreit (Deadlock, Ausschlussklage, Auflösungsklage)",
      "Squeeze-out (AG: ab 95%, SE: ab 90%), Delisting",
      "Upstream-Darlehen / Cash Pooling (verdeckte Gewinnausschüttung vermeiden)",
      "Kapitalerhöhung / -herabsetzung",
    ],
    formeln: [
      {
        name: "Business Judgment Rule – Haftungsfreistellung",
        formel: "Haftung ausgeschlossen wenn: (1) unternehmerische Entscheidung + (2) keine Interessenkonflikte + (3) angemessene Infobasis + (4) Wohl der Gesellschaft → alle 4 Bedingungen erforderlich",
      },
      {
        name: "GmbH Zahlungsunfähigkeits-Schwelle",
        formel: "Insolvenzantragspflicht wenn: Liquiditätslücke >10% der fälligen Verbindlichkeiten und nicht binnen 3 Wochen schließbar → Antragspflicht binnen 6 Wochen (§ 15a InsO)",
      },
    ],
    jurisdiktionen: { DE: true, AT: true, CH: true, UK: true, US: true },
  },
  // ── BLOCK VI ────────────────────────────────────────────────────────────
  {
    key: "insolvenzrecht",
    label: "Insolvenzrecht / Restrukturierung",
    kurzlabel: "Insolvenz",
    icon: "📉",
    color: "#FF2D55",
    block: "VI",
    pflichtfelder: [
      "Liquiditätsstatus (21-Tage-Planung & 13-Wochen-Cashflow)",
      "Überschuldungsstatus (Fortführungsprognose? Modifizierte zweistufige Prüfung)",
      "IDW S6 Sanierungsgutachten (Krisenursachen, Leitbild, Maßnahmen, integrierte Planung)",
      "Gläubigerstruktur (besichert / unbesichert, Rangrücktrittsvereinbarungen)",
      "D&O-Versicherung der Geschäftsführer",
      "Verfahrensart (Regelinsolvenz, Schutzschirmverfahren § 270d InsO, StaRUG, WHOA, Cross-Border)",
      "COMI (Centre of Main Interests – zuständiges Insolvenzgericht)",
      "Anfechtungsrisiken (§ 133 InsO: 4 Jahre, bei Vorsatz 30 Jahre)",
    ],
    formeln: [
      {
        name: "Zahlungsunfähigkeits-Liquiditätslücke",
        formel: "Lücke = fällige Verbindlichkeiten − verfügbare ZM − kurzfristig mobilisierbare Mittel → ≥10% und nicht binnen 3 Wochen = § 17 InsO",
      },
      {
        name: "Überschuldungsstatus",
        formel: "Saldo = Fortführungswerte Aktiva − Summe Verbindlichkeiten → negativ + keine pos. Fortführungsprognose = Insolvenzantragspflicht",
      },
      {
        name: "Insolvenzanfechtung § 133 InsO",
        formel: "Anfechtbar wenn: Transaktion innerhalb 4 Jahre vor Antrag + Gläubigerbenachteiligung + Kenntnis des Benachteiligungsvorsatzes",
      },
      {
        name: "Gläubigerquoten-Simulation",
        formel: "Quote_ungesichert = (Insolvenzmasse − Masseverbindlichkeiten − bevorrechtigte Forderungen) ÷ Summe ungesicherte Forderungen",
      },
    ],
    jurisdiktionen: { DE: true, AT: true, CH: true, UK: true, NL: true },
  },
  // ── BLOCK VII ───────────────────────────────────────────────────────────
  {
    key: "arbeitsrecht",
    label: "Arbeitsrecht",
    kurzlabel: "Arbeitsrecht",
    icon: "👥",
    color: "#FF9500",
    block: "VII",
    pflichtfelder: [
      "Befristungsrecht (§§ 14 ff. TzBfG: sachgrundlose Befristung max. 2 Jahre, 3 Verlängerungen)",
      "Elternzeit / Mutterschutz (Kündigungsverbot, Rückkehranspruch)",
      "Arbeitnehmerüberlassung (AÜG: max. 18 Monate, Equal Pay nach 9 Monaten)",
      "Scheinselbstständigkeit (Weisungsgebundenheit, Betriebsintegration, kein unternehmerisches Risiko)",
      "Betriebsrat & Mitbestimmungsrechte (§ 87 BetrVG: Arbeitszeit, Lohn, Überwachung, Datenschutz)",
      "Betriebsänderung ab 20 MA → Interessenausgleich + Sozialplan (§ 111 BetrVG)",
      "Tarifvertrag (Branche/Haus, Tarifbindung durch Verbandsmitgliedschaft)",
      "Einigungsstelle (Zwangsschlichtung bei Scheitern)",
    ],
    formeln: [
      {
        name: "Scheinselbstständigkeit SV-Nachzahlung",
        formel: "SV-Nachzahlung = (AN-Anteil + AG-Anteil) × Honorarsumme × Verjährungszeitraum → 4 Jahre rückwirkend (Vorsatz: 30 Jahre) ≈ 40% des Honorars",
      },
      {
        name: "Sozialplan-Dotierung (Faustregel)",
        formel: "Sozialplan-Volumen = Anzahl MA × Ø Monatsgehalt × Ø Betriebszugehörigkeit × Faktor 0,5–1,5",
      },
      {
        name: "Nachteilsausgleich § 113 BetrVG",
        formel: "Nachteilsausgleich = fiktive Sozialplanabfindung × 1,0–2,0 (Gericht setzt Betrag fest)",
      },
    ],
    jurisdiktionen: { DE: true, AT: true, CH: true, UK: true, FR: true },
  },
  // ── BLOCK VIII ──────────────────────────────────────────────────────────
  {
    key: "datenschutz",
    label: "Datenschutz / DSGVO / KI-Act / NIS2",
    kurzlabel: "Datenschutz",
    icon: "🔒",
    color: "#00BCD4",
    block: "VIII",
    pflichtfelder: [
      "DSGVO: Verarbeitungszwecke, Rechtsgrundlagen, Betroffenenrechte, TOM",
      "KI-Act EU: Klassifizierung (verboten/Hochrisiko/begrenzt/minimal)",
      "Hochrisiko-KI (Anhang III): Biometrie, kritische Infrastruktur, Bildung, Beschäftigung, Kreditwürdigkeit, Strafverfolgung",
      "NIS2: Sektorzuordnung (Wesentliche / Wichtige Einrichtung)",
      "NIS2-Meldepflicht: 24h Erstmeldung, 72h Details, 1 Monat Abschlussbericht an BSI",
      "Datentransfers (Drittländer: Angemessenheitsbeschluss, SCCs, BCR)",
      "Datenlokalisierung China (PIPL)",
    ],
    formeln: [
      {
        name: "DSGVO-Bußgeld",
        formel: "max(20 Mio. € ; 4% weltweiter Jahresumsatz) für Art. 83 Abs. 5 Verstöße",
      },
      {
        name: "KI-Act Bußgeld",
        formel: "Verbotene KI: max(35 Mio. € ; 7% Weltumsatz). Hochrisiko-Verstöße: max(15 Mio. € ; 3%). Falsche Infos: max(7,5 Mio. € ; 1,5%)",
      },
      {
        name: "NIS2-Bußgeld",
        formel: "Wesentliche Einrichtung: max(10 Mio. € ; 2% Weltumsatz). Wichtige Einrichtung: max(7 Mio. € ; 1,4% Weltumsatz)",
      },
    ],
    jurisdiktionen: { DE: true, EU: true, UK: true, US: true, CN: true, CH: true },
  },
  // ── BLOCK IX ────────────────────────────────────────────────────────────
  {
    key: "kapitalmarktrecht",
    label: "Kapitalmarktrecht / ESG / CSRD",
    kurzlabel: "Kapitalmarkt",
    icon: "📈",
    color: "#FF6B35",
    block: "IX",
    pflichtfelder: [
      "MAR: Insiderhandel, Marktmanipulation, Ad-hoc-Pflichten",
      "Leerverkäufe (Short Selling Regulation: ab 0,2% melden, ab 0,5% veröffentlichen)",
      "Derivate / Hedging (EMIR: Clearing-Pflicht, Meldepflicht Transaktionsregister)",
      "Aktienrückkauf Safe Harbour (MAR: max. 25% Tageshandelsvolumen)",
      "CSRD / ESRS: E1-E5, S1-S4, G1 (Double Materiality)",
      "EU-Taxonomie Klassifizierung",
      "SFDR (Sustainable Finance Disclosure Regulation)",
    ],
    formeln: [
      {
        name: "Double Materiality Score CSRD",
        formel: "DM = finanzielle Wesentlichkeit (0–5) × Impact-Wesentlichkeit (0–5) → Produkt ≥9 ODER beide Dimensionen ≥3: berichtspflichtig",
      },
    ],
    jurisdiktionen: { DE: true, EU: true, UK: true, US: true },
  },
  // ── BLOCK X ─────────────────────────────────────────────────────────────
  {
    key: "compliance",
    label: "Regulierung / Compliance (Finanz, Pharma, Energie, TK)",
    kurzlabel: "Compliance",
    icon: "✅",
    color: "#4CAF50",
    block: "X",
    pflichtfelder: [
      "Finanzregulierung: BaFin-Lizenz, Basel IV (CET1 min. 7%), LCR ≥100%, NSFR ≥100%, MiFID II, GwG",
      "Pharma: EMA/BfArM-Zulassung, Pharmakovigilanz (15/90-Tage-Meldung), GMP, klinische Studien",
      "Energie: Netzzugangsrecht (§ 20 EnWG), EEG-Vergütung, EU-ETS CO₂-Zertifikate",
      "Telekommunikation: Marktregulierung BNetzA, Frequenzzuteilungen, TTDSG/TKG-Datenschutz",
    ],
    formeln: [
      {
        name: "CET1-Quote Basel IV",
        formel: "CET1 = (hartes Kernkapital ÷ risikogewichtete Aktiva) × 100 → Mindest 4,5% + 2,5% Kapitalerhaltungspuffer = effektiv 7%",
      },
      {
        name: "Leverage Ratio",
        formel: "LR = (Kernkapital ÷ Gesamtrisikopositionsmessgröße) × 100 → Mindest 3% nach Basel IV",
      },
      {
        name: "ETS-Kosten-Prognose",
        formel: "ETS_Kosten = (Ist-Emissionen − kostenlos zugeteilte Zertifikate) × ETS-Marktpreis (ca. 60–70 €/tCO₂)",
      },
      {
        name: "Marktexklusivitäts-Restdauer Pharma",
        formel: "Restdauer = Patentablauf − heute + SPC-Verlängerung (max. 5 J) + Kinderarzneimittel-Prämie (6 Monate)",
      },
    ],
    jurisdiktionen: { DE: true, EU: true, UK: true, US: true, CH: true },
  },
  // ── BLOCK XI ────────────────────────────────────────────────────────────
  {
    key: "strafrecht",
    label: "Wirtschaftsstrafrecht / Internal Investigation",
    kurzlabel: "Wirtschaftsstrafrecht",
    icon: "🚨",
    color: "#FF3B30",
    block: "XI",
    pflichtfelder: [
      "Compliance-Management-System (IDW PS 980 als Haftungsmilderung)",
      "Straftaten: Untreue § 266, Betrug § 263, Bestechung § 299, Steuerhinterziehung § 370 AO, Geldwäsche § 261, Korruption §§ 331–335",
      "Internal Investigation (wer leitet? Anwaltsprivileg, Legal Hold, Dokumentensicherung)",
      "FCPA / UK Bribery Act (extraterritorial für dt. Unternehmen!)",
      "Whistleblower-Anzeige (intern / extern)",
      "Hausdurchsuchungsprotokoll (sofort Anwalt, keine Aussage, keine Vernichtung)",
      "Selbstanzeige Steuerhinterziehung § 371 AO (vollständig, rechtzeitig, keine Entdeckung)",
      "Verbandssanktionengesetz DE (geplant: bis 10 Mio. € oder 10% Jahresumsatz)",
    ],
    formeln: [
      {
        name: "Steuerhinterziehung Selbstanzeige Nachzahlung",
        formel: "Nachzahlung = Hinterziehungsbetrag + Zinsen (1,8% p.a.) + Strafzuschlag (>100k€: 10%; >1M€: 15%; >2M€: 20%) → entfällt bei sofortiger Zahlung <100k€",
      },
      {
        name: "FCPA-Mindestbußgeld",
        formel: "Mindestbußgeld = max(erlangter Vorteil × 2 ; US Sentencing Guidelines) → bis 50% Reduktion bei proaktiver Offenlegung + Kooperation",
      },
    ],
    jurisdiktionen: { DE: true, AT: true, CH: true, UK: true, US: true },
  },
  // ── BLOCK XII ───────────────────────────────────────────────────────────
  {
    key: "immobilienrecht",
    label: "Immobilien- und Baurecht",
    kurzlabel: "Immobilien",
    icon: "🏗️",
    color: "#8E6D3E",
    block: "XII",
    pflichtfelder: [
      "Grundbuchauszug (Eigentümer, Abt. II Lasten, Abt. III Grundschulden)",
      "Baugenehmigung (vorhanden? Auflagen? Bestandsschutz?)",
      "Bebauungsplan: GRZ, GFZ, Baulinie, Nutzungsart",
      "Gewerbemietverträge (Laufzeit, Indexierung, Nebenkosten, Optionsrechte)",
      "ESG-Anforderungen (EU-Taxonomie, CRREM-Pfad, Energieausweis)",
      "Mängelrechte Bau (§§ 633 ff. BGB, HOAI-Honorarstreit, Bauhandwerkersicherung § 648a BGB)",
    ],
    formeln: [
      {
        name: "Mietwert-Indexierung (Gewerbe)",
        formel: "Neue Miete = Ausgangsmiete × (aktueller VPI ÷ VPI zum Vertragsbeginn)",
      },
      {
        name: "Ertragswertmethode Immobilie",
        formel: "Ertragswert = Jahresreinertrag ÷ Liegenschaftszinssatz (Büro Innenstadt 3–4%; Einzelhandel 4–6%; Logistik 5–7%)",
      },
    ],
    jurisdiktionen: { DE: true, AT: true, CH: true },
  },
  // ── BLOCK XIII ──────────────────────────────────────────────────────────
  {
    key: "vergaberecht",
    label: "Vergaberecht",
    kurzlabel: "Vergabe",
    icon: "🏛️",
    color: "#607D8B",
    block: "XIII",
    pflichtfelder: [
      "Auftragswert vs. EU-Schwellenwerte 2024 (Liefer-/DL: 221.000 €; Bau: 5.538.000 €)",
      "Verfahrensart (offen, nicht offen, Verhandlung, wettbewerbl. Dialog, Innovationspartnerschaft)",
      "Eignungsnachweise (Umsatz, Referenzen, Zertifizierungen)",
      "Zuschlagskriterien (wirtschaftlich günstigstes Angebot – Preis allein verboten bei OJEU)",
      "Rügeobliegenheit (§ 160 GWB: sofort rügen sonst kein Nachprüfungsantrag!)",
    ],
    formeln: [
      {
        name: "Gewichtete Angebotsbewertung",
        formel: "Gesamtpunktzahl = (Preis-Punkte × Preisgewichtung) + (Qualitäts-Punkte × Qualitätsgewichtung) + …",
      },
      {
        name: "Schadensersatz rechtswidriger Zuschlag",
        formel: "SE = entgangener Gewinn (Deckungsbeitrag des Auftrags) ODER nur Angebotserstellungskosten wenn Zuschlag nicht hätte erteilt werden dürfen",
      },
    ],
    jurisdiktionen: { DE: true, EU: true, AT: true, CH: true },
  },
  // ── BLOCK XIV ───────────────────────────────────────────────────────────
  {
    key: "erbrecht",
    label: "Erbrecht / Unternehmensnachfolge",
    kurzlabel: "Erbrecht",
    icon: "📜",
    color: "#795548",
    block: "XIV",
    pflichtfelder: [
      "Testament / Erbvertrag (vorhanden? aktuell?)",
      "Pflichtteilsberechtigte (Kinder, Ehepartner: 50% gesetzliches Erbteil – nicht entziehbar)",
      "Unternehmensbewertung für ErbSt (vereinfachtes Ertragswertverfahren §§ 199 ff. BewG)",
      "Verschonungsregelung (§§ 13a/13b ErbStG: 85% oder 100% Verschonung – Lohnsummenregel, Behaltensfrist 5/7 J)",
      "Vorweggenommene Erbfolge (Schenkung: 10-Jahres-Freibetrag 400k€ je Kind je Elternteil)",
      "Familienpool (GmbH & Co. KG als Übertragungsstruktur)",
    ],
    formeln: [
      {
        name: "Erbschaftsteuer-Schätzung",
        formel: "ErbSt = (Steuerwert − Freibetrag) × Steuersatz; Freibeträge: Partner 500k€, Kind 400k€, Enkel 200k€; Steuersätze Kl. I: 7–30%",
      },
      {
        name: "Vereinfachtes Ertragswertverfahren BewG",
        formel: "Steuerwert = nachhaltig erzielbarer Jahresertrag ÷ 13,75%; Jahresertrag = Ø 3 Jahre bereinigt um außerordentliche Effekte",
      },
    ],
    jurisdiktionen: { DE: true, AT: true, CH: true },
  },
  // ── BLOCK XV ────────────────────────────────────────────────────────────
  {
    key: "versicherungsrecht",
    label: "Versicherungsrecht",
    kurzlabel: "Versicherung",
    icon: "🛡️",
    color: "#009688",
    block: "XV",
    pflichtfelder: [
      "Versicherungsarten: D&O, Produkthaftpflicht, Betriebshaftpflicht, Cyber, Rechtsschutz, Transport, Kredit, Kaution, Betriebsunterbrechung",
      "Versicherungssummen & Selbstbehalte",
      "Anzeigepflichten (§ 19 VVG – Verletzung = Leistungsfreiheit!)",
      "Obliegenheiten im Schadensfall (sofortige Meldung, Schadensminimierung, keine Regulierungszusagen ohne Versicherer)",
      "D&O-Inanspruchnahme (wann greift D&O ein?)",
      "Cyber-Deckung (Ransomware: Lösegeld, Betriebsunterbrechung, Drittschäden)",
    ],
    formeln: [
      {
        name: "Betriebsunterbrechungs-Entschädigung",
        formel: "BU-Leistung = (Tagesbeitrag × Unterbrechungstage) − ersparte Kosten − anderweitige Einnahmen; Tagesbeitrag = Jahresumsatz × Deckungsbeitragsquote ÷ 365",
      },
    ],
    jurisdiktionen: { DE: true, AT: true, CH: true, UK: true },
  },
  // ── BLOCK XVI ───────────────────────────────────────────────────────────
  {
    key: "prozessrecht",
    label: "Prozessrecht (National & International)",
    kurzlabel: "Prozessrecht",
    icon: "⚖️",
    color: "#455A64",
    block: "XVI",
    pflichtfelder: [
      "Gerichtsstand (§§ 12 ff. ZPO: allgemeiner = Sitz Beklagter; besondere: Erfüllungsort, Deliktsort)",
      "Streitwert & Zuständigkeit (<5.000 € = AG; >5.000 € = LG)",
      "Einstweiliger Rechtsschutz (Arrest, einstweilige Verfügung: Dringlichkeit, Verfügungsanspruch, -grund)",
      "Beweislastverteilung",
      "Verjährungsfristen (Regel: 3 Jahre § 195 BGB; Beginn 1. Januar nach Entstehung & Kenntnis)",
      "IPR: Rom I-VO (Verträge), Rom II-VO (Delikt), Eingriffsnormen, ordre public",
      "US: Class Actions, Punitive Damages (3×), Discovery",
      "US-UK: Common Law, Präzedenzfälle",
    ],
    formeln: [
      {
        name: "Prozesskostenrisiko",
        formel: "Gesamtkosten bei Verlust = GKG-Gebühren + eigene RVG-Gebühren + gegnerische RVG-Gebühren → bei 500k€ Streitwert ca. 35.000–60.000 €",
      },
      {
        name: "Kostenquotelung bei Teilsieg",
        formel: "Kostenanteil = (unterlegener Betrag ÷ Gesamtstreitwert) × Gesamtkosten",
      },
    ],
    jurisdiktionen: { DE: true, EU: true, UK: true, US: true, CH: true, FR: true },
  },
  // ── ERGÄNZUNG: Medienrecht ───────────────────────────────────────────────
  {
    key: "medienrecht",
    label: "Medien- und Presserecht",
    kurzlabel: "Medienrecht",
    icon: "📺",
    color: "#E91E63",
    block: "Erg.",
    pflichtfelder: [
      "Rundfunk- / Medienstaatsvertrag (MStV): Plattformen, Intermediäre, Algorithmentransparenz",
      "Digital Services Act (DSA): VLOP/VLOSE-Status (>45 Mio. EU-Nutzer), Risikobewertungspflichten",
      "Presserecht: Gegendarstellungsrecht, Unterlassungsklage, Persönlichkeitsrecht",
      "Leistungsschutzrecht Presseverlage (§ 87g UrhG / Art. 15 DSM-Richtlinie)",
      "NetzDG / Hate Speech (Löschpflicht rechtswidriger Inhalte ≥2 Mio. registrierte Nutzer)",
    ],
    formeln: [
      {
        name: "DSA-Bußgeld",
        formel: "max(6% weltweiter Jahresumsatz) für VLOP/VLOSE-Verstöße; max(1% bei falschen Informationen)",
      },
    ],
    jurisdiktionen: { DE: true, EU: true },
  },
  // ── ERGÄNZUNG: Rüstung/Export ────────────────────────────────────────────
  {
    key: "exportkontrolle",
    label: "Exportkontrolle / Dual-Use / Rüstung",
    kurzlabel: "Export",
    icon: "🔐",
    color: "#37474F",
    block: "Erg.",
    pflichtfelder: [
      "AWG / AWV: Ausfuhrgenehmigungspflicht für Dual-Use-Güter (EU-Dual-Use-VO 2021/821)",
      "ITAR / EAR (USA): extraterritorial für US-Technologie-Komponenten",
      "Sanktionslisten (EU, UN, OFAC-SDN, OFAC-SSI) – Embargo-Prüfung jeder Transaktion",
      "Russland-Sanktionen (EU-Sanktionspakete – Güter, Dienstleistungen, Finanzierung)",
      "China-Trade-Controls (BIS Entity List, FDP Rule – Foreign Direct Product Rule)",
      "Kriegswaffenkontrollgesetz (KWKG) für Rüstungsgüter",
    ],
    formeln: [
      {
        name: "OFAC-Zivilbuße",
        formel: "max(Transaktionswert × 2 ; 375.579 USD pro Verstoß, Stand 2024) + Strafverfolgung bei Vorsatz",
      },
    ],
    jurisdiktionen: { DE: true, EU: true, US: true, UK: true },
  },
];

// ── Lookup-Maps ──────────────────────────────────────────────────────────────
export const RG_BY_KEY = Object.fromEntries(
  RECHTSGEBIETE_VOLLSTAENDIG.map(rg => [rg.key, rg])
);

// Kompatibilitäts-Map: alte 9 Schlüssel → neue Schlüssel
export const KEY_COMPAT = {
  vertragsrecht: "vertragsrecht",
  gesellschaftsrecht: "gesellschaftsrecht",
  kartellrecht: "kartellrecht",
  steuerrecht: "steuerrecht_national",
  arbeitsrecht: "arbeitsrecht",
  datenschutz: "datenschutz",
  ip_recht: "ip_recht",
  compliance: "compliance",
  strafrecht: "strafrecht",
};

// Übergreifende Systemformeln (Monte Carlo, Wechselwirkungen)
export const SYSTEM_FORMELN = {
  gesamtrisiko: "GRW = Σ (Schadenshöhe_i × Eintrittswahrscheinlichkeit_i × Zeitgewichtungsfaktor_i × Korrelationskoeffizient_ij)",
  monteCarlo: "10.000 Läufe → 5%-Quantil (Best Case), 50%-Quantil (Erwartungswert), 95%-Quantil (Worst Case)",
  wechselwirkung: "Wenn RG_A und RG_B beide aktiv → automatische Schnittmengen-Prüfung (z.B. Kartellrecht + M&A + Steuer bei Fusion)",
};

// Jurisdiktions-Differenzierung
export const JURISDIKTIONEN = {
  US: {
    label: "USA",
    besonderheiten: [
      "Common Law (Präzedenzfälle entscheidend)",
      "Class Actions mit Punitive Damages (bis 3× Schadensersatz)",
      "Discovery (umfassende Dokumentenoffenlegung)",
      "FCPA (extraterritorial)",
      "SOX (Sarbanes-Oxley: interne Kontrollen börsennotierte AG)",
      "Delaware Corporate Law",
    ],
  },
  UK: {
    label: "UK",
    besonderheiten: [
      "Common Law, post-Brexit eigenständige Regulierung",
      "UK GDPR, UK Competition Act, FCA",
      "UK Bribery Act (strengster Anti-Korruptionsstandard: keine Ausnahme für kleine Zahlungen)",
      "SONIA (LIBOR-Nachfolger für Kreditverträge)",
    ],
  },
  CH: {
    label: "Schweiz",
    besonderheiten: [
      "Kein EU-Mitglied (eigenes DSG seit 2023, kein DSGVO)",
      "OR (Obligationenrecht) statt BGB",
      "Schiedsgerichtsbarkeit Genf (ICC, Swiss Rules) – globaler Standard",
      "Banking Secrecy (eingeschränkt durch FATCA/AEOI)",
      "Kantonssteuer-Varianz",
    ],
  },
  FR: {
    label: "Frankreich",
    besonderheiten: [
      "Code Civil, SAS (flexibelste Gesellschaftsform)",
      "Arbeitnehmerfreundlich: Comité Social et Économique, Gewinnbeteiligung Pflicht",
      "SAPIN II (Anti-Korruption mit Compliance-Pflichten für Unternehmen >500 MA / >100 Mio. € Umsatz)",
    ],
  },
  CN: {
    label: "China",
    besonderheiten: [
      "Investitionsbeschränkungen (Negative List)",
      "PIPL (Personal Information Protection Law = chinesische DSGVO)",
      "Datenlokalisierung: sensible Daten dürfen China nicht verlassen",
      "Anti-Monopol-Gesetz (Fusionskontrolle: SAMR)",
      "VIE-Struktur für ausländische Investitionen in regulierten Sektoren",
    ],
  },
};