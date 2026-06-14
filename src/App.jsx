/**
 * App.jsx — Haupt-Router & Einstiegspunkt der React-App
 *
 * ARCHITEKTUR-ÜBERBLICK:
 * ──────────────────────────────────────────────────────────────────
 *  Provider-Stack (von außen nach innen):
 *    AuthProvider          → Stellt currentUser & auth-State bereit
 *    QueryClientProvider   → React Query Caching & Server-State
 *    BrowserRouter         → React Router v6
 *      AppShell            → Layout (Toolbar + Sidebar + Outlet)
 *        [Alle Seiten]     → Werden über <Route> eingebunden
 *    Toaster / Sonner      → Toast-Benachrichtigungen
 *    DsgvoBanner           → DSGVO-Cookie-Hinweis
 *
 * NEUE SEITE HINZUFÜGEN:
 *   1. import MyPage from './pages/MyPage'
 *   2. <Route path="/mein-pfad" element={<MyPage />} />
 *      (innerhalb von <Route element={<AppShell />}>)
 *
 * KI-FUNKTIONEN:
 *   Alle KI-Aufrufe laufen über lib/kiProvider.js → invokeLLM()
 *   Alle algorithmischen Berechnungen (ohne KI) → lib/legalAlgorithms.js
 *
 * BACKEND-FUNKTIONEN (Deno / functions/):
 *   analyzeDocument      → Dokumenten-KI-Analyse (10 Schritte)
 *   checkCaseCompliance  → DSGVO-Compliance-Check pro Fall
 *   deadlineEmailAlert   → E-Mail-Alert bei ablaufenden Fristen (scheduled)
 *   exportCasePDF        → PDF-Export eines Falls
 *   exportGegnerVerhaltenPDF → PDF-Export Gegner-Verhaltensdaten
 *   exportIcal           → iCal-Export aller Fristen
 *   exportToSupabase     → Sync zu externem Supabase-Projekt
 *   logCaseChange        → Audit-Trail-Eintrag für CaseHistory
 *   sendMandantUpdate    → E-Mail-Update an Mandanten
 *   stripeCheckout       → Stripe-Zahlungssession erstellen
 *   stripeWebhook        → Stripe-Webhook-Handler
 *
 * ENTITÄTEN (Base44 DB):
 *   Case, Argument, Evidence, Deadline, Person, Document,
 *   JudgeProfile, CaseFolder, CaseHistory, CaseQuestionnaire,
 *   CaseWarning, GegnerVerhalten, TimelineEvent, Task,
 *   StrategosScenario, LegalLoophole, AIPerformanceFeedback,
 *   KIUsageLog, JurisdictionInsight
 * ──────────────────────────────────────────────────────────────────
 */

/**
 * App.jsx — Haupt-Router
 *
 * Alle Seiten werden hier als Routen registriert.
 * Layout: AppShell (Toolbar + Sidebar) wraps alle Routen via <Outlet>.
 * Auth: AuthProvider stellt currentUser und isAuthenticated bereit.
 *
 * Neue Seite hinzufügen:
 *   1. import MyPage from './pages/MyPage'
 *   2. <Route path="/my-page" element={<MyPage />} /> innerhalb von <Route element={<AppShell />}>
 *
 * Architektur-Übersicht: siehe ARCHITECTURE.md
 */

import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// ── Layout ────────────────────────────────────────────────────────────────────
import AppShell from './components/AppShell';
import DsgvoBanner from './components/DsgvoBanner';

// ── Seiten ────────────────────────────────────────────────────────────────────
import Home from './pages/Home';
import Login from './pages/Login';
import Modules from './pages/Modules';
import LexaraDashboard from './pages/LexaraDashboard';     // Fallübersicht
import CaseDetail from './pages/CaseDetail';               // Falldetail (9 Reiter)
import Zeitleiste from './pages/Zeitleiste';               // Globale Fristen
import MandantenView from './pages/MandantenView';
import RichterProfile from './pages/RichterProfile';       // Richter & Beteiligte
import PlattformAgent from './pages/PlattformAgent';
import KanzleiCockpit from './pages/KanzleiCockpit';
import FallAssistentChat from './pages/FallAssistentChat'; // KI-Chat
import KanzleiAnalytik from './pages/KanzleiAnalytik';
import OnboardingSetup from './pages/OnboardingSetup';
import Aufgaben from './pages/Aufgaben';
import SunTzuMachiavel from './pages/SunTzuMachiavel';     // Strategische Analyse
import Strategos from './pages/Strategos';                 // Strategos Enterprise
import KICompliance from './pages/KICompliance';           // KI-Compliance Dokumentation

// Add page imports here

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Modules />} />
                <Route path="/modules" element={<Modules />} />
                <Route path="/lexara" element={<LexaraDashboard />} />
                <Route path="/lexara/case" element={<CaseDetail />} />
                <Route path="/zeitleiste" element={<Zeitleiste />} />
                <Route path="/mandant" element={<MandantenView />} />
                <Route path="/richterprofile" element={<RichterProfile />} />
                <Route path="/plattform-agent" element={<PlattformAgent />} />
                <Route path="/cockpit" element={<KanzleiCockpit />} />
                <Route path="/analytik" element={<KanzleiAnalytik />} />
                <Route path="/chat/fall-assistent" element={<FallAssistentChat />} />
                <Route path="/onboarding" element={<OnboardingSetup />} />
                <Route path="/aufgaben" element={<Aufgaben />} />
                <Route path="/strategic-analysis" element={<SunTzuMachiavel />} />
                <Route path="/strategos" element={<Strategos />} />
                <Route path="/ki-compliance" element={<KICompliance />} />
                {/* Add your page Route elements here */}
                <Route path="*" element={<PageNotFound />} />
              </Route>
            </Route>
          </Routes>
          <DsgvoBanner />
        </Router>
        <Toaster />
        <SonnerToaster position="bottom-right" richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App