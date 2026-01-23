import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import InviteSignup from "./pages/InviteSignup";
import RequestJoin from "./pages/RequestJoin";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Announcements from "./pages/Announcements";
import Documents from "./pages/Documents";
import Directory from "./pages/Directory";
import Profile from "./pages/Profile";
import PaymentHistory from "./pages/PaymentHistory";
import NotificationHistory from "./pages/NotificationHistory";
import Reservations from "./pages/Reservations";
import MaintenanceRequests from "./pages/MaintenanceRequests";
import Violations from "./pages/Violations";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminResidents from "./pages/admin/AdminResidents";
import AdminJoinRequests from "./pages/admin/AdminJoinRequests";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminFinancials from "./pages/admin/AdminFinancials";
import AdminDataImport from "./pages/admin/AdminDataImport";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import AdminSpaces from "./pages/admin/AdminSpaces";
import AdminMaintenance from "./pages/admin/AdminMaintenance";
import AdminFunds from "./pages/admin/AdminFunds";
import AdminViolations from "./pages/admin/AdminViolations";
import HoaOnboarding from "./pages/admin/HoaOnboarding";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/invite" element={<InviteSignup />} />
            <Route path="/request-join" element={<RequestJoin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Resident routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/payments" element={<PaymentHistory />} />
            <Route path="/notifications" element={<NotificationHistory />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/maintenance" element={<MaintenanceRequests />} />
            <Route path="/violations" element={<Violations />} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/announcements" element={<AdminAnnouncements />} />
            <Route path="/admin/documents" element={<AdminDocuments />} />
            <Route path="/admin/residents" element={<AdminResidents />} />
            <Route path="/admin/join-requests" element={<AdminJoinRequests />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/financials" element={<AdminFinancials />} />
            <Route path="/admin/data-import" element={<AdminDataImport />} />
            <Route path="/admin/super" element={<SuperAdminDashboard />} />
            <Route path="/admin/spaces" element={<AdminSpaces />} />
            <Route path="/admin/maintenance" element={<AdminMaintenance />} />
            <Route path="/admin/funds" element={<AdminFunds />} />
            <Route path="/admin/violations" element={<AdminViolations />} />
            <Route path="/admin/onboarding" element={<HoaOnboarding />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
