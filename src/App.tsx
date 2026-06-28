import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import AuthCallback from "./pages/AuthCallback";
import Coach from "./pages/Coach";
import Login from "./pages/Login";
import UserApp from "./pages/UserApp";
import OnboardingFlow from "./components/auth/OnboardingFlow";
import Pricing from "./pages/Pricing";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { useAuth } from "@/contexts/AuthContext";

// Anonymous visitors get full demo context inside Coach so tier-gated
// features unlock and ai-router receives demo financial snapshot.
const CoachRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Coach /> : <DemoModeProvider><Coach /></DemoModeProvider>;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/coach" element={<CoachRoute />} />
            <Route path="/dashboard" element={<DemoModeProvider><UserApp /></DemoModeProvider>} />

            {/* Protected */}
            <Route path="/onboarding" element={
              <ProtectedRoute requireOnboarding={false}><OnboardingFlow /></ProtectedRoute>
            } />
            <Route path="/app" element={
              <ProtectedRoute><UserApp /></ProtectedRoute>
            } />
            <Route path="/billing" element={
              <ProtectedRoute requireOnboarding={false}><Billing /></ProtectedRoute>
            } />

            {/* Hidden admin route — gated by user_roles inside the page */}
            <Route path="/admin" element={<Admin />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
