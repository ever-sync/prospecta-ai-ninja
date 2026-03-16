import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import MarketingLanding from "./pages/MarketingLanding";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import LgpdPage from "./pages/LgpdPage";
import DNA from "./pages/DNA";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Settings from "./pages/Settings";
import Presentations from "./pages/Presentations";
import Campaigns from "./pages/Campaigns";
import Templates from "./pages/Templates";
import Admin from "./pages/Admin";
import RobotsSetup from "./pages/RobotsSetup";
import PresentationView from "./pages/PresentationView";
import NotFound from "./pages/NotFound";
import FormView from "./pages/FormView";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/" element={<MarketingLanding />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/esqueci-minha-senha" element={<ForgotPassword />} />
          <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
          <Route path="/termos-de-uso" element={<TermsOfUse />} />
          <Route path="/lgpd" element={<LgpdPage />} />
          <Route path="/presentation/:publicId" element={<PresentationView />} />
          <Route path="/form/:slug" element={<FormView />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/search" element={<Index />} />
            <Route path="/robots" element={<RobotsSetup />} />
            <Route path="/dna" element={<DNA />} />
            <Route path="/presentations" element={<Presentations />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/planos" element={<Admin initialTab="planos" />} />
            <Route path="/admin/custos" element={<Admin initialTab="custos" />} />
            <Route path="/admin/emails" element={<Admin initialTab="emails" />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
