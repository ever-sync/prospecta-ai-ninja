import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import MarketingLanding from "./pages/MarketingLanding";
import DNA from "./pages/DNA";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Settings from "./pages/Settings";
import Presentations from "./pages/Presentations";
import Campaigns from "./pages/Campaigns";
import Templates from "./pages/Templates";
import Admin from "./pages/Admin";
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
          <Route path="/presentation/:publicId" element={<PresentationView />} />
          <Route path="/form/:slug" element={<FormView />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/search" element={<Index />} />
            <Route path="/dna" element={<DNA />} />
            <Route path="/presentations" element={<Presentations />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
