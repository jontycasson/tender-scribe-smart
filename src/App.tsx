import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import NewTender from "./pages/NewTender";
import TenderDetails from "./pages/TenderDetails";
import Security from "./pages/Security";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AcceptableUse from "./pages/AcceptableUse";
import Try from "./pages/Try";
import Contact from "./pages/Contact";
import Pricing from "./pages/Pricing";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminDemoUsage from "./pages/admin/AdminDemoUsage";
import AdminSecurity from "./pages/admin/AdminSecurity";
import AdminEdgeFunctions from "./pages/admin/AdminEdgeFunctions";
import AdminDatabase from "./pages/admin/AdminDatabase";
import AdminStorage from "./pages/admin/AdminStorage";
import AdminSystem from "./pages/admin/AdminSystem";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <AnalyticsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/new-tender" element={<NewTender />} />
              <Route path="/tender/:id" element={<TenderDetails />} />
              <Route path="/security" element={<Security />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/acceptable-use" element={<AcceptableUse />} />
              <Route path="/try" element={<Try />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/pricing" element={<Pricing />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/companies" element={<AdminCompanies />} />
              <Route path="/admin/database" element={<AdminDatabase />} />
              <Route path="/admin/storage" element={<AdminStorage />} />
              <Route path="/admin/edge-functions" element={<AdminEdgeFunctions />} />
              <Route path="/admin/security" element={<AdminSecurity />} />
              <Route path="/admin/demo-usage" element={<AdminDemoUsage />} />
              <Route path="/admin/system" element={<AdminSystem />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </AnalyticsProvider>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
