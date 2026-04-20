import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RoleProvider } from './contexts/RoleContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { OrganizationSettingsProvider } from './contexts/OrganizationSettingsContext';
import { ModalProvider } from './contexts/ModalContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import LoginScreen from './components/auth/LoginScreen';
import SetupPassword from './pages/SetupPassword';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MobileBottomNav from './components/layout/MobileBottomNav';
import HelpChatWidget from './components/ui/HelpChatWidget';
import Dashboard from './pages/Dashboard';
import Facilities from './pages/Facilities';
import Rooms from './pages/Rooms';
import Renters from './pages/Renters';
import Leases from './pages/Leases';
import Payments from './pages/Payments';
import Maintenance from './pages/Maintenance';
import Penalties from './pages/Penalties';
import Settings from './pages/Settings';
import Complaints from './pages/Complaints';
import PaymentApprovals from './pages/PaymentApprovals';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Training from './pages/Training';
import MobilePayments from './pages/mobile/MobilePayments';
import MobileRooms from './pages/mobile/MobileRooms';
import MobileInspections from './pages/mobile/MobileInspections';
import MobileRenters from './pages/mobile/MobileRenters';
import MobileLeases from './pages/mobile/MobileLeases';
import MobileDashboard from './pages/mobile/MobileDashboard';

// ─── Shared layout ────────────────────────────────────────────────────────────
const AppLayout: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = 'bg-gray-900' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Auto-close sidebar on mobile whenever route changes
  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className={`min-h-screen ${bg}`}>
      <Header onMenuToggle={() => setSidebarOpen(s => !s)} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(s => !s)} />
        {/* pb-20 gives bottom nav clearance on mobile; lg:pb-8 for desktop */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-20 lg:pb-8 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
      <MobileBottomNav />
      <HelpChatWidget />
    </div>
  );
};

// ─── Route helpers ─────────────────────────────────────────────────────────────
const Protected = ({ children, admin = false, bg }: { children: React.ReactNode; admin?: boolean; bg?: string }) => {
  const Guard = admin ? AdminRoute : ProtectedRoute;
  return (
    <Guard>
      <AppLayout bg={bg}>{children}</AppLayout>
    </Guard>
  );
};

// ─── App content ───────────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    const isMobile = window.innerWidth < 768;
    navigate(isMobile ? '/mobile/dashboard' : '/dashboard');
  };

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LoginScreen onLoginSuccess={handleLoginSuccess} />} />
      <Route path="/setup-password" element={<SetupPassword />} />

      {/* Desktop protected routes */}
      <Route path="/dashboard"         element={<Protected><Dashboard /></Protected>} />
      <Route path="/facilities"        element={<Protected><Facilities /></Protected>} />
      <Route path="/rooms"             element={<Protected><Rooms /></Protected>} />
      <Route path="/renters"           element={<Protected><Renters /></Protected>} />
      <Route path="/leases"            element={<Protected><Leases /></Protected>} />
      <Route path="/payments"          element={<Protected><Payments /></Protected>} />
      <Route path="/maintenance"       element={<Protected><Maintenance /></Protected>} />
      <Route path="/penalties"         element={<Protected><Penalties /></Protected>} />
      <Route path="/complaints"        element={<Protected><Complaints /></Protected>} />
      <Route path="/notifications"     element={<Protected><Notifications /></Protected>} />
      <Route path="/profile"           element={<Protected><Profile /></Protected>} />
      <Route path="/training"          element={<Protected><Training /></Protected>} />
      <Route path="/payment-approvals" element={<Protected admin><PaymentApprovals /></Protected>} />
      <Route path="/settings"          element={<Protected admin><Settings /></Protected>} />
      <Route path="/reports"           element={<Protected admin><Reports /></Protected>} />

      {/* Mobile routes */}
      <Route path="/mobile/dashboard"   element={<ProtectedRoute><MobileDashboard /></ProtectedRoute>} />
      <Route path="/mobile/payments"    element={<ProtectedRoute><MobilePayments /></ProtectedRoute>} />
      <Route path="/mobile/rooms"       element={<ProtectedRoute><MobileRooms /></ProtectedRoute>} />
      <Route path="/mobile/renters"     element={<ProtectedRoute><MobileRenters /></ProtectedRoute>} />
      <Route path="/mobile/leases"      element={<ProtectedRoute><MobileLeases /></ProtectedRoute>} />
      <Route path="/mobile/inspections" element={<ProtectedRoute><MobileInspections /></ProtectedRoute>} />
    </Routes>
  );
};

// ─── Root ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <OrganizationSettingsProvider>
          <SettingsProvider>
            <ModalProvider>
              <ToastProvider>
                <Router>
                  <AppContent />
                </Router>
              </ToastProvider>
            </ModalProvider>
          </SettingsProvider>
        </OrganizationSettingsProvider>
      </RoleProvider>
    </AuthProvider>
  );
}

export default App;
