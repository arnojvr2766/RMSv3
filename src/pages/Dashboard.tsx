import React from 'react';
import { Building, CreditCard, Users, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Dashboard: React.FC = () => {
  // Mock data - will be replaced with real data from Firebase
  const stats = {
    totalIncome: 45230,
    occupancyRate: 87,
    overduePayments: 3,
    pendingApprovals: 7,
  };

  const recentPayments = [
    { id: '1', room: '101', tenant: 'John Doe', amount: 1500, status: 'posted' },
    { id: '2', room: '102', tenant: 'Jane Smith', amount: 1800, status: 'posted' },
    { id: '3', room: '103', tenant: 'Bob Johnson', amount: 1200, status: 'pending' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Rental Management Dashboard
          </h1>
          <p className="mt-2 text-secondary">
            Welcome back! Here's what's happening with your properties.
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
            <Button variant="primary">
              <CreditCard className="w-4 h-4 mr-2" />
              New Payment
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

        {/* Recent Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Payments</h3>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-white">Room {payment.room}</p>
                    <p className="text-sm text-secondary">{payment.tenant}</p>
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

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Facility Overview</h3>
              <Button variant="ghost" size="sm">Manage</Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-secondary">Total Facilities</span>
                <span className="font-semibold text-white">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary">Total Rooms</span>
                <span className="font-semibold text-white">24</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary">Active Tenants</span>
                <span className="font-semibold text-white">18</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary">Available Rooms</span>
                <span className="font-semibold text-white">6</span>
              </div>
            </div>
          </Card>
        </div>
    </div>
  );
};

export default Dashboard;
