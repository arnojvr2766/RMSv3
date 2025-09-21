import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RoleProvider } from './contexts/RoleContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { OrganizationSettingsProvider } from './contexts/OrganizationSettingsContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginScreen from './components/auth/LoginScreen';
import SetupPassword from './pages/SetupPassword';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Home from './pages/Home';
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

const AppContent: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLoginSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LoginScreen onLoginSuccess={handleLoginSuccess} />} />
      <Route path="/setup-password" element={<SetupPassword />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-900">
            <Header onMenuToggle={handleMenuToggle} />
            <div className="flex">
              <Sidebar isOpen={sidebarOpen} onToggle={handleMenuToggle} />
              <main className="flex-1 p-6">
                <Dashboard />
              </main>
            </div>
          </div>
        </ProtectedRoute>
      } />
              
      <Route path="/facilities" element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-900">
                    <Header onMenuToggle={handleMenuToggle} />
                    <div className="flex">
                      <Sidebar isOpen={sidebarOpen} onToggle={handleMenuToggle} />
                      <main className="flex-1 p-6">
                        <Facilities />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              
      <Route path="/rooms" element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-900">
                    <Header onMenuToggle={handleMenuToggle} />
                    <div className="flex">
                      <Sidebar isOpen={sidebarOpen} onToggle={handleMenuToggle} />
                      <main className="flex-1 p-6">
                        <Rooms />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              
      <Route path="/renters" element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-900">
                    <Header onMenuToggle={handleMenuToggle} />
                    <div className="flex">
                      <Sidebar isOpen={sidebarOpen} onToggle={handleMenuToggle} />
                      <main className="flex-1 p-6">
                        <Renters />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              
      <Route path="/leases" element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-900">
                    <Header onMenuToggle={handleMenuToggle} />
                    <div className="flex">
                      <Sidebar isOpen={sidebarOpen} onToggle={handleMenuToggle} />
                      <main className="flex-1 p-6">
                        <Leases />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              
      <Route path="/payments" element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-900">
                    <Header onMenuToggle={handleMenuToggle} />
                    <div className="flex">
                      <Sidebar isOpen={sidebarOpen} onToggle={handleMenuToggle} />
                      <main className="flex-1 p-6">
                        <Payments />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              
      <Route path="/maintenance" element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-900">
                    <Header onMenuToggle={handleMenuToggle} />
                    <div className="flex">
                      <Sidebar isOpen={sidebarOpen} onToggle={handleMenuToggle} />
                      <main className="flex-1 p-6">
                        <Maintenance />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              
      <Route path="/penalties" element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-900">
                    <Header onMenuToggle={handleMenuToggle} />
                    <div className="flex">
                      <Sidebar isOpen={sidebarOpen} onToggle={handleMenuToggle} />
                      <main className="flex-1 p-6">
                        <Penalties />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              
      <Route path="/settings" element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-900">
                    <Header onMenuToggle={handleMenuToggle} />
                    <div className="flex">
                      <Sidebar isOpen={sidebarOpen} onToggle={handleMenuToggle} />
                      <main className="flex-1 p-6">
                        <Settings />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              
      <Route path="/complaints" element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-900">
                    <Header onMenuToggle={handleMenuToggle} />
                    <div className="flex">
                      <Sidebar isOpen={sidebarOpen} onToggle={handleMenuToggle} />
                      <main className="flex-1 p-6">
                        <Complaints />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              } />
              
      <Route path="/payment-approvals" element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-900">
                    <Header onMenuToggle={handleMenuToggle} />
                    <div className="flex">
                      <Sidebar isOpen={sidebarOpen} onToggle={handleMenuToggle} />
                      <main className="flex-1 p-6">
                        <PaymentApprovals />
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
      } />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <OrganizationSettingsProvider>
          <SettingsProvider>
            <Router>
              <AppContent />
            </Router>
          </SettingsProvider>
        </OrganizationSettingsProvider>
      </RoleProvider>
    </AuthProvider>
  );
}

export default App;
