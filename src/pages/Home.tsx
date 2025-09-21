import React, { useState } from 'react';
import { 
  Building, 
  CreditCard, 
  Users, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  FileText,
  Settings,
  DollarSign
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import QuickPaymentCapture from '../components/forms/QuickPaymentCapture';
import SystemAdminDashboardSimple from './SystemAdminDashboardSimple';
import { useRole } from '../contexts/RoleContext';

const Home: React.FC = () => {
  const { isSystemAdmin } = useRole();
  const [showQuickPaymentCapture, setShowQuickPaymentCapture] = useState(false);

  // Mock data - will be replaced with real data from Firebase
  const stats = {
    totalIncome: 45230,
    occupancyRate: 87,
    overduePayments: 3,
    pendingApprovals: 7,
    totalProperties: 3,
    totalRooms: 24,
    activeTenants: 18,
    availableRooms: 6,
  };

  const recentPayments = [
    { id: '1', room: '101', tenant: 'John Doe', amount: 1500, status: 'posted', date: '2024-01-15' },
    { id: '2', room: '102', tenant: 'Jane Smith', amount: 1800, status: 'posted', date: '2024-01-14' },
    { id: '3', room: '103', tenant: 'Bob Johnson', amount: 1200, status: 'pending', date: '2024-01-13' },
  ];

  const recentActivities = [
    { id: '1', type: 'payment', message: 'Payment received from Room 101', time: '2 hours ago', icon: CreditCard },
    { id: '2', type: 'tenant', message: 'New tenant application submitted', time: '4 hours ago', icon: Users },
    { id: '3', type: 'maintenance', message: 'Maintenance request for Room 205', time: '6 hours ago', icon: AlertCircle },
  ];

  // System Admin specific features
  const adminFeatures = [
    { title: 'System Settings', description: 'Configure system-wide settings', icon: Settings, color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
    { title: 'User Management', description: 'Manage user accounts and permissions', icon: Users, color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
    { title: 'Reports & Analytics', description: 'View detailed reports and analytics', icon: TrendingUp, color: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' },
    { title: 'Audit Logs', description: 'Review system audit logs', icon: FileText, color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
  ];

  // If user is System Admin, show the comprehensive dashboard
  if (isSystemAdmin) {
    return <SystemAdminDashboardSimple />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <img 
              src="/RentDesk.png" 
              alt="RentDesk Logo" 
              className="w-16 h-16 rounded-lg"
            />
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome to RentDesk
              </h1>
            </div>
          </div>
          <p className="text-secondary">
            Standard User Dashboard - Manage your properties and tenants
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Total Income</p>
                <p className="text-2xl font-bold text-white">R {stats.totalIncome.toLocaleString()}</p>
                <p className="text-sm text-success">+12% from last month</p>
              </div>
              <div className="p-3 bg-primary-500/20 rounded-full">
                <CreditCard className="w-6 h-6 text-primary-500" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Occupancy Rate</p>
                <p className="text-2xl font-bold text-white">{stats.occupancyRate}%</p>
                <p className="text-sm text-success">+3% from last month</p>
              </div>
              <div className="p-3 bg-accent-green-500/20 rounded-full">
                <Building className="w-6 h-6 text-accent-green-500" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Overdue Payments</p>
                <p className="text-2xl font-bold text-error">{stats.overduePayments}</p>
                <p className="text-sm text-error">Needs attention</p>
              </div>
              <div className="p-3 bg-error/20 rounded-full">
                <AlertCircle className="w-6 h-6 text-error" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary">Pending Approvals</p>
                <p className="text-2xl font-bold text-white">{stats.pendingApprovals}</p>
                <p className="text-sm text-warning">Awaiting review</p>
              </div>
              <div className="p-3 bg-warning/20 rounded-full">
                <CheckCircle className="w-6 h-6 text-warning" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="primary"
              onClick={() => setShowQuickPaymentCapture(true)}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Payments
            </Button>
            <Button variant="secondary">
              <Users className="w-4 h-4 mr-2" />
              Add Tenant
            </Button>
            <Button variant="accent">
              <AlertCircle className="w-4 h-4 mr-2" />
              New Complaint
            </Button>
            <Button variant="outline">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Payments */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Payments</h3>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary-500/20 rounded-lg">
                        <CreditCard className="w-4 h-4 text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Room {payment.room}</p>
                        <p className="text-sm text-secondary">{payment.tenant}</p>
                        <p className="text-xs text-secondary">{payment.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">R {payment.amount}</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'posted' 
                          ? 'bg-success/20 text-success'
                          : 'bg-warning/20 text-warning'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Property Overview */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Property Overview</h3>
                <Button variant="ghost" size="sm">Manage</Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Total Properties</span>
                  <span className="font-semibold text-white">{stats.totalProperties}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Total Rooms</span>
                  <span className="font-semibold text-white">{stats.totalRooms}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Active Tenants</span>
                  <span className="font-semibold text-white">{stats.activeTenants}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary">Available Rooms</span>
                  <span className="font-semibold text-white">{stats.availableRooms}</span>
                </div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-700 rounded-lg">
                      <activity.icon className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{activity.message}</p>
                      <p className="text-xs text-secondary">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        </div>

        {/* Quick Payment Capture Modal */}
        {showQuickPaymentCapture && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <QuickPaymentCapture
                onClose={() => setShowQuickPaymentCapture(false)}
              />
            </div>
          </div>
        )}
    </div>
  );
};

export default Home;
