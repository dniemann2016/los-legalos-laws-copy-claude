# MachSun Law — Code-Architektur

## Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Base44 (Entities als DB, Backend-Funktionen als Deno-Serverless)
- **Routing**: React Router DOM v6

---

## Ordnerstruktur

```
src/
├── api/
│   └── base44Client.js          # Vorkonfigurierter SDK-Client (Entities, Auth, Integrations)
│
├── agents/
│   ├── fall_assistent           # KI-Assistent für Fallberatung
│   └── plattform_optimierer     # Plattform-Optimierungs-Agent
│
├── components/
│   ├── AppShell.jsx             # Haupt-Layout: Toolbar + Sidebar + <Outlet>
│   ├── DsgvoBanner.jsx          # DSGVO-Hinweisbanner (einmalig anzeigen)
│   ├── JurisdictionToggle.jsx   # Rechtsordnungs-Umschalter (DACH/EU/US)
│   │
│   ├── lexara/                  # ── LEXARA-FALLANALYSE-MODULE ──
│   │   │
│   │   │  # Reiter 1 — Fallerfassung
│   │   ├── Tab1Fallerfassung.jsx
│   │   ├── TabBasisdaten.jsx
│   │   ├── TabDokumente.jsx
│   │   ├── TabDokumenteAnalyse.jsx
│   │   │
│   │   │  # Reiter 2 — Substanz (Argumente, Beweise, Zeitstrahl)
│   │   ├── Tab2Fallsubstanz.jsx
│   │   ├── Tab2SubstanzCore.jsx
│   │   ├── TabArgumente.jsx
│   │   ├── TabBeweise.jsx
│   │   ├── TabArgumenteBeweisVerkettung.jsx
│   │   ├── TabVerkettung.jsx
│   │   ├── TabZeitstrahl.jsx
│   │   │
│   │   │  # Reiter 3 — Akteure & Fristen
│   │   ├── Tab3AkteureFristen.jsx
│   │   ├── TabPersonen.jsx
│   │   ├── TabFristen.jsx
│   │   │
│   │   │  # Reiter 4 — Gegner / Gegneranalyse
│   │   ├── Tab3Gegneranalyse.jsx        # (historisch "Tab3", entspricht Reiter 4)
│   │   ├── GegnerProfilSimulation.jsx
│   │   ├── GegnerRisikoMatrix.jsx
│   │   ├── GegnerVerhaltenDashboard.jsx
│   │   ├── OpponentStrategyDashboard.jsx
│   │   │
│   │   │  # Reiter 5 — Recht & Compliance
│   │   ├── Tab4RechtlicheAnalyse.jsx    # (historisch "Tab4", entspricht Reiter 5)
│   │   ├── ComplianceChecker.jsx
│   │   ├── PraezedenzfallSuche.jsx
│   │   │
│   │   │  # Reiter 6 — Strategie & Prognose
│   │   ├── TabStrategiePrognose.jsx     # Container für Reiter 6
│   │   ├── TabStrategie.jsx             # Sub 0: Strategie & KI-Prognose
│   │   ├── WasWaereWennSimulation.jsx   # Sub 1: Was-wäre-wenn
│   │   ├── TabRisiko.jsx                # Sub 2: Risikoformeln & Monte Carlo
│   │   ├── TabRisikoAlgo.jsx            # AlgoRisikoPanel Komponente
│   │   ├── RiskMatrix.jsx               # Sub 3: KI-Risikomatrix
│   │   │
│   │   │  # Reiter 7 — Simulation & Cockpit
│   │   ├── TabSimulationCockpit.jsx     # Container für Reiter 7
│   │   ├── TabVerhandlung.jsx           # Sub 0: Verhandlungssimulation
│   │   ├── TabVerhandlungssimulation.jsx
│   │   ├── TabGesamtbewertung.jsx       # Sub 1: Gesamtbewertung
│   │   ├── TabCockpit.jsx               # Sub 2: Fall-Cockpit
│   │   ├── CaseInfluenceGraph.jsx       # Sub 3: Einfluss-Netzwerk
│   │   ├── MonteCarloSimulation.jsx
│   │   ├── ScenarioSimulator.jsx
│   │   │
│   │   │  # Reiter 8 — Aktion
│   │   ├── Tab8Aktion.jsx
│   │   ├── TabSchriftsatz.jsx
│   │   │
│   │   │  # Reiter 9 — Abschluss
│   │   ├── TabAbschlussProtokoll.jsx    # Container für Reiter 9
│   │   ├── Tab10Abschluss.jsx           # Sub 0: Abschluss & Monte Carlo
│   │   ├── TabKIProtokoll.jsx           # Sub 1: KI-Protokoll
│   │   ├── TabZeitstrahl.jsx            # Sub 2: Zeitstrahl Gesamt
│   │   ├── TabPrognoseVergleich.jsx     # Sub 3: Prognose-Vergleich (alle Modelle)
│   │   │                               # Sub 4: Risiko-Analyse (TabRisiko + RiskMatrix)
│   │   │
│   │   │  # Strategie-Beratung (Reiter 6 / Tab5)
│   │   ├── Tab6Risiko.jsx
│   │   ├── Tab7Simulation.jsx
│   │   ├── Tab9Cockpit.jsx
│   │   ├── Tab10Abschluss.jsx
│   │   ├── TabAnalyse.jsx
│   │   ├── TabKIBerater.jsx
│   │   ├── TabNotizen.jsx
│   │   ├── TabHistory.jsx
│   │   │
│   │   │  # Visualisierungen
│   │   ├── ArgumentGraph.jsx
│   │   ├── ArgumentGraphiOS.jsx
│   │   ├── ArgumentEvidenceGraph.jsx
│   │   ├── ArgumentZeitstrahlChart.jsx
│   │   ├── ArgumentationskettenVisualisierung.jsx
│   │   ├── BeweismatrixChart.jsx
│   │   ├── TimelineVisualization.jsx
│   │   ├── StrategicTimeline.jsx
│   │   │
│   │   │  # Sonstige Lexara-Module
│   │   ├── AIPerformanceDashboard.jsx
│   │   ├── AkteureAnalytik.jsx
│   │   ├── FallAbschlussFragebogen.jsx
│   │   ├── FolderOrganizer.jsx
│   │   ├── JudgeComparisonModal.jsx
│   │   ├── KIFeedbackPanel.jsx
│   │   ├── KonzernRechtsgebietDashboard.jsx
│   │   └── RechtsgebietFelder.jsx
│   │
│   ├── modules/
│   │   └── StrategischerBeweisstrang.jsx
│   │
│   ├── onboarding/
│   │   ├── DisclaimerStep.jsx
│   │   ├── JurisdictionStep.jsx
│   │   └── LanguageStep.jsx
│   │
│   ├── richter/                 # Richter-/Beteiligte-Profile
│   │   ├── AkteureBeziehungen.jsx
│   │   ├── ErfolgsMatrix.jsx
│   │   ├── NetzwerkVisualisierung.jsx
│   │   └── RichterDetail.jsx
│   │
│   ├── strategos/               # Strategos Enterprise-Modul
│   │   ├── AppleCard.jsx
│   │   ├── EnterpriseShell.jsx
│   │   ├── Step0DocIntelligenz.jsx
│   │   └── modules/
│   │       ├── Step1Kontext.jsx … Step6LexaraSync.jsx
│   │
│   └── ui/                      # shadcn/ui Basiskomponenten (nicht anfassen)
│       └── button, card, dialog, input, …
│
├── entities/                    # JSON-Schemata (Base44 Datenbank)
│   ├── Case.json                # Hauptentität: Fallstammdaten
│   ├── Argument.json            # Rechts- und Tatsachenargumente
│   ├── Evidence.json            # Beweismittel
│   ├── Deadline.json            # Fristen
│   ├── Person.json              # Richter, Zeugen, Parteien
│   ├── Document.json            # Hochgeladene Dokumente
│   ├── CaseFolder.json          # Ordner-Gruppierung
│   ├── CaseHistory.json         # Änderungsprotokoll
│   ├── CaseWarning.json         # Automatische Warnungen
│   ├── CaseQuestionnaire.json   # Abschluss-Fragebogen
│   ├── GegnerVerhalten.json     # Gegnerverhalten-Tracking
│   ├── JudgeProfile.json        # Richterprofile (kanzleiübergreifend)
│   ├── TimelineEvent.json       # Zeitstrahl-Ereignisse
│   ├── Task.json                # Aufgaben
│   ├── KIUsageLog.json          # KI-Nutzungsprotokoll
│   ├── AIPerformanceFeedback.json
│   ├── JurisdictionInsight.json # Rechtsordnungs-Insights
│   ├── LegalLoophole.json       # Gesetzeslücken
│   └── StrategosScenario.json   # Strategos-Szenarien
│
├── functions/                   # Deno Serverless Backend-Funktionen
│   ├── analyzeDocument.js       # KI-Dokumentenanalyse (10-Schritte-Pipeline)
│   ├── checkCaseCompliance.js   # Compliance-Prüfung
│   ├── deadlineEmailAlert.js    # E-Mail-Benachrichtigungen für Fristen
│   ├── exportCasePDF.js         # PDF-Export eines Falls
│   ├── exportGegnerVerhaltenPDF.js
│   ├── exportIcal.js            # iCal-Export für Fristen
│   ├── exportToSupabase.js      # Supabase-Daten-Sync
│   ├── logCaseChange.js         # Änderungsprotokoll schreiben
│   ├── sendMandantUpdate.js     # E-Mail an Mandanten
│   ├── stripeCheckout.js        # Stripe Checkout Session
│   └── stripeWebhook.js         # Stripe Webhook Handler
│
├── hooks/
│   ├── useKIProtokoll.js        # KI-Nutzungen protokollieren
│   ├── useJurisdiction.js       # Aktive Rechtsordnung lesen
│   ├── useUserProfile.js        # Nutzerprofil laden
│   └── use-mobile.jsx           # Responsive breakpoint
│
├── lib/
│   ├── AuthContext.jsx           # Auth-Provider (Login, currentUser)
│   ├── legalAlgorithms.js        # Bayesianische Prognose, Monte Carlo, Break-Even
│   ├── jurisdictionConfig.js     # Rechtsordnungs-Konfiguration
│   ├── strategosRechtsgebiete.js # Rechtsgebiete für Strategos
│   ├── query-client.js           # TanStack Query Instanz
│   ├── utils.js                  # cn() helper
│   ├── app-params.js
│   └── PageNotFound.jsx
│
├── pages/                        # Seiten (je Route eine Datei)
│   ├── Home.jsx                  # Startseite / Modul-Übersicht  →  /
│   ├── LexaraDashboard.jsx       # Fallübersicht                  →  /lexara
│   ├── CaseDetail.jsx            # Falldetail (9-Reiter)          →  /lexara/case?id=
│   ├── Zeitleiste.jsx            # Globale Fristenliste           →  /zeitleiste
│   ├── MandantenView.jsx         # Mandanten-Portal               →  /mandant
│   ├── RichterProfile.jsx        # Richter-/Beteiligten-DB        →  /richterprofile
│   ├── PlattformAgent.jsx        # Agent-Interface                →  /plattform-agent
│   ├── KanzleiCockpit.jsx        # Kanzlei-Cockpit                →  /cockpit
│   ├── KanzleiAnalytik.jsx       # Analytik & Reporting           →  /analytik
│   ├── FallAssistentChat.jsx     # KI-Chat                        →  /chat/fall-assistent
│   ├── OnboardingSetup.jsx       # Einrichtungsassistent          →  /onboarding
│   ├── Aufgaben.jsx              # Aufgabenverwaltung             →  /aufgaben
│   ├── SunTzuMachiavel.jsx       # Strategische Analyse           →  /strategic-analysis
│   └── Strategos.jsx             # Strategos Enterprise           →  /strategos
│
├── utils/
│   └── index.ts                  # Allgemeine Hilfsfunktionen
│
├── App.jsx                       # Router-Konfiguration (alle Routen)
├── index.css                     # Design-Tokens (CSS-Variablen, Tailwind-Base)
├── tailwind.config.js            # Tailwind-Theme-Erweiterungen
└── index.html                    # HTML-Einstiegspunkt
```

---

## Wichtige Konzepte

### Lexara 9-Reiter-Struktur (CaseDetail.jsx)
| Reiter | Label | Haupt-Komponente |
|--------|-------|-----------------|
| 1 | Fallakte | `Tab1Fallerfassung` |
| 2 | Substanz | `Tab2SubstanzCore` → `TabArgumente` / `TabBeweise` |
| 3 | Akteure & Fristen | `Tab3AkteureFristen` |
| 4 | Gegner | `Tab3Gegneranalyse` |
| 5 | Recht & Compliance | `Tab4RechtlicheAnalyse` |
| 6 | Strategie & Prognose | `TabStrategiePrognose` |
| 7 | Simulation & Cockpit | `TabSimulationCockpit` |
| 8 | Aktion | `Tab8Aktion` |
| 9 | Abschluss | `TabAbschlussProtokoll` |

### Prognose-Modelle (alle in `TabPrognoseVergleich` aggregiert)
- **6-Stufen-Algo** (`TabStrategie.computePrognose`) — linear, schnell
- **Prozessstärke-Score** (`TabStrategie`, unterer Block) — gewichtete 5-Faktoren-Matrix
- **Bayesianisch + Monte Carlo** (`lib/legalAlgorithms.js → computeVollanalyse`) — statistisch robust
- **KI-Prognose** (`TabStrategie.runKiPrognose`) — LLM-basiert, in `caseData.ki_berater_result` gespeichert

### Design-System
- Tokens in `index.css` (CSS-Variablen) → gemappt in `tailwind.config.js`
- Farb-Konstanten lokal in Komponenten als `const C = { … }` (Apple HIG)
- Fonts: SF Pro / System-Stack via `-apple-system`

### Auth
- `lib/AuthContext.jsx` liefert `currentUser`, `isAuthenticated`, `isLoadingAuth`
- `base44.auth.me()` in Backend-Funktionen

### KI-Protokollierung
- Jede LLM-Nutzung soll via `useKIProtokoll(caseId).logKI(…)` protokolliert werden
- Gespeichert in `KIUsageLog` Entity

---

## Namenskonventionen

| Präfix/Muster | Bedeutung |
|---|---|
| `Tab*` | Reiter-Komponente innerhalb CaseDetail |
| `Tab[N]*` | Entspricht Reiter N (historisch nummeriert) |
| `*Core` | Container-Komponente mit Sub-Tabs |
| `*Algo` | Rein algorithmisch, keine KI |
| `use*` | React Hook |
| `C = { … }` | Lokale Design-Token-Konstante |
| `SF = { … }` | SF-Pro Font-Stack Shorthand |

---

## Neue Features hinzufügen

1. **Neue Seite**: Datei in `pages/` anlegen + Route in `App.jsx` eintragen
2. **Neuer Reiter in CaseDetail**: Komponente in `components/lexara/` + in `TABS`-Array + `activeSub`-Handling in `CaseDetail.jsx`
3. **Neue Entity**: JSON-Schema in `entities/` anlegen
4. **Neue Backend-Funktion**: Datei in `functions/` (Deno) + Aufruf via `base44.functions.invoke('name', params)