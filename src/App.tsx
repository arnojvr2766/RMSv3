import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProvider } from './contexts/RoleContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Payments from './pages/Payments';
import Facilities from './pages/Facilities';
import Rooms from './pages/Rooms';
import Renters from './pages/Renters';
import Leases from './pages/Leases';
import Penalties from './pages/Penalties';
import Complaints from './pages/Complaints';
import SettingsPage from './pages/Settings';
import PaymentApprovals from './pages/PaymentApprovals';
import Maintenance from './pages/Maintenance';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { useState } from 'react';
import './index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <SettingsProvider>
          <Router>
                 <div className="App min-h-screen bg-secondary-900">
                   <Header onMenuToggle={toggleSidebar} />
                   <div className="flex">
                     <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
                     <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-80' : 'lg:ml-16'} p-6`}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/facilities" element={<Facilities />} />
                  <Route path="/rooms" element={<Rooms />} />
                  <Route path="/renters" element={<Renters />} />
          <Route path="/leases" element={<Leases />} />
          <Route path="/payment-approvals" element={<PaymentApprovals />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/penalties" element={<Penalties />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/settings" element={<SettingsPage />} />
                </Routes>
                     </main>
                   </div>
                 </div>
                 
                 {/* PWA Install Prompt */}
                 <PWAInstallPrompt />
          </Router>
        </SettingsProvider>
      </RoleProvider>
    </QueryClientProvider>
  );
}

export default App;