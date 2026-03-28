import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Home from './pages/Home';
import Modules from './pages/Modules';
import LexaraDashboard from './pages/LexaraDashboard';
import CaseDetail from './pages/CaseDetail';
import Zeitleiste from './pages/Zeitleiste';
import MandantenView from './pages/MandantenView';
import RichterProfile from './pages/RichterProfile';
import PlattformAgent from './pages/PlattformAgent';
import KanzleiCockpit from './pages/KanzleiCockpit';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/modules" element={<Modules />} />
      <Route path="/lexara" element={<LexaraDashboard />} />
      <Route path="/lexara/case" element={<CaseDetail />} />
      <Route path="/zeitleiste" element={<Zeitleiste />} />
      <Route path="/mandant" element={<MandantenView />} />
      <Route path="/richterprofile" element={<RichterProfile />} />
      <Route path="/plattform-agent" element={<PlattformAgent />} />
      <Route path="/cockpit" element={<KanzleiCockpit />} />
      {/* Add your page Route elements here */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
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
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App