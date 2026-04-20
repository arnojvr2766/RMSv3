import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, CreditCard, Users, AlertCircle, CheckCircle, TrendingUp, DoorClosed, RefreshCw, FileText } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SystemAdminDashboardSimple from './SystemAdminDashboardSimple';
import NewRentalWizard from '../components/forms/NewRentalWizard';
import { useRole } from '../contexts/RoleContext';
import { dashboardService, type DashboardMetrics } from '../services/dashboardService';
import { StatCardsSkeleton } from '../components/ui/SkeletonLoader';

const Dashboard: React.FC = () => {
  const { isSystemAdmin } = useRole();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWizard, setShowWizard] = useState(false);

  const loadMetrics = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await dashboardService.getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      setError('Could not load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadMetrics(); }, []);

  if (isSystemAdmin) return <SystemAdminDashboardSimple />;

  const STATUS_BADGE: Record<string, string> = {
    paid:     'bg-green-500/20 text-green-400',
    posted:   'bg-green-500/20 text-green-400',
    pending:  'bg-yellow-500/20 text-yellow-400',
    overdue:  'bg-red-500/20 text-red-400',
    partial:  'bg-blue-500/20 text-blue-400',
  };

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">Welcome back — here's what's happening.</p>
        </div>
        <Button variant="ghost" onClick={loadMetrics} disabled={isLoading} title="Refresh">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stats Grid */}
      {isLoading ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400">Monthly Revenue</p>
                <p className="text-xl md:text-2xl font-bold text-white mt-0.5">
                  R {(metrics?.totalMonthlyRevenue || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {metrics?.totalFacilities} facilit{metrics?.totalFacilities === 1 ? 'y' : 'ies'}
                </p>
              </div>
              <div className="p-2 bg-yellow-500/20 rounded-full">
                <CreditCard className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400">Occupancy Rate</p>
                <p className="text-xl md:text-2xl font-bold text-white mt-0.5">
                  {Math.round(metrics?.occupancyRate || 0)}%
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {metrics?.occupiedRooms} / {metrics?.totalRooms} rooms
                </p>
              </div>
              <div className="p-2 bg-green-500/20 rounded-full">
                <Building className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400">Overdue Payments</p>
                <p className={`text-xl md:text-2xl font-bold mt-0.5 ${(metrics?.overduePayments || 0) > 0 ? 'text-red-400' : 'text-white'}`}>
                  {metrics?.overduePayments || 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  R {(metrics?.overdueAmount || 0).toLocaleString()} owed
                </p>
              </div>
              <div className="p-2 bg-red-500/20 rounded-full">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400">Active Tenants</p>
                <p className="text-xl md:text-2xl font-bold text-white mt-0.5">
                  {metrics?.totalActiveTenants || 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {metrics?.pendingPayments || 0} pending payments
                </p>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-full">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setShowWizard(true)}>
            <FileText className="w-4 h-4 mr-2" />
            New Rental Agreement
          </Button>
          <Button variant="secondary" onClick={() => navigate('/payments')}>
            <CreditCard className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
          <Button variant="ghost" onClick={() => navigate('/renters')}>
            <Users className="w-4 h-4 mr-2" />
            Add Tenant
          </Button>
          <Button variant="ghost" onClick={() => navigate('/complaints')}>
            <AlertCircle className="w-4 h-4 mr-2" />
            New Complaint
          </Button>
          <Button variant="ghost" onClick={() => navigate('/leases')}>
            <CheckCircle className="w-4 h-4 mr-2" />
            View Leases
          </Button>
        </div>
      </div>

      {showWizard && (
        <NewRentalWizard onClose={() => { setShowWizard(false); loadMetrics(); }} />
      )}

      {/* Bottom grid — recent payments + facility overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Payments */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Recent Payments</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/payments')}>View All</Button>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-700/60 rounded-lg animate-pulse" />)}
            </div>
          ) : (metrics?.recentPayments || []).length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No recent payments.</p>
          ) : (
            <div className="space-y-2">
              {(metrics?.recentPayments || []).slice(0, 4).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-700/60 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">Room {p.room}</p>
                    <p className="text-xs text-gray-400 truncate">{p.tenant}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-semibold text-white">R {p.amount?.toLocaleString()}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_BADGE[p.status] || 'bg-gray-500/20 text-gray-400'}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Portfolio Summary */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Portfolio Summary</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/facilities')}>Manage</Button>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-6 bg-gray-700/60 rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Facilities', value: metrics?.totalFacilities ?? '—', icon: Building, color: 'text-yellow-400' },
                { label: 'Total Rooms', value: metrics?.totalRooms ?? '—', icon: DoorClosed, color: 'text-blue-400' },
                { label: 'Available Rooms', value: metrics?.availableRooms ?? '—', icon: TrendingUp, color: 'text-green-400' },
                { label: 'Collection Rate', value: `${Math.round(metrics?.paymentCollectionRate || 0)}%`, icon: CreditCard, color: 'text-purple-400' },
              ].map(row => {
                const Icon = row.icon;
                return (
                  <div key={row.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${row.color}`} />
                      <span className="text-sm text-gray-400">{row.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{row.value}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
