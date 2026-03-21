import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const ProtectedRoute = lazy(() =>
  import("@/components/ProtectedRoute").then((module) => ({ default: module.ProtectedRoute })),
);
const AppLayout = lazy(() =>
  import("@/components/AppLayout").then((module) => ({ default: module.AppLayout })),
);
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const MarketingLanding = lazy(() => import("./pages/MarketingLanding"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const LgpdPage = lazy(() => import("./pages/LgpdPage"));
const DNA = lazy(() => import("./pages/DNA"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CRM = lazy(() => import("./pages/CRM"));
const Settings = lazy(() => import("./pages/Settings"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Presentations = lazy(() => import("./pages/Presentations"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Templates = lazy(() => import("./pages/Templates"));
const Admin = lazy(() => import("./pages/Admin"));
const RobotsSetup = lazy(() => import("./pages/RobotsSetup"));
const Clients = lazy(() => import("./pages/Clients"));
const PresentationView = lazy(() => import("./pages/PresentationView"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FormView = lazy(() => import("./pages/FormView"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

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
        <PwaInstallPrompt />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<MarketingLanding />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/esqueci-minha-senha" element={<ForgotPassword />} />
            <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
            <Route path="/termos-de-uso" element={<TermsOfUse />} />
            <Route path="/lgpd" element={<LgpdPage />} />
            <Route path="/presentation/:publicId" element={<PresentationView />} />
            <Route path="/form/:slug" element={<FormView />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/search" element={<Index />} />
              <Route path="/robots" element={<RobotsSetup />} />
              <Route path="/dna" element={<DNA />} />
              <Route path="/presentations" element={<Presentations />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/planos" element={<Admin initialTab="planos" />} />
              <Route path="/admin/custos" element={<Admin initialTab="custos" />} />
              <Route path="/admin/emails" element={<Admin initialTab="emails" />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/documentation" element={<Documentation />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
