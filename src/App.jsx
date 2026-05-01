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
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// ── Layout ────────────────────────────────────────────────────────────────────
import AppShell from './components/AppShell';
import DsgvoBanner from './components/DsgvoBanner';

// ── Seiten ────────────────────────────────────────────────────────────────────
import Home from './pages/Home';
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

import { useUserProfile } from './hooks/useUserProfile';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }
  if (authError?.type === 'auth_required') {
    // MVP: open access, skip login
  }

  return (
    <>
      <Routes>
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
          {/* Add your page Route elements here */}
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
      <DsgvoBanner />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="bottom-right" richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App