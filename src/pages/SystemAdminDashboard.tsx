import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Building, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  Activity,
  RefreshCw,
  Download,
  Settings,
  Shield,
  Database,
  Clock
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import MetricCard from '../components/dashboard/MetricCard';
import QuickActions from '../components/dashboard/QuickActions';
import PerformanceChart from '../components/dashboard/PerformanceChart';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import { dashboardService, DashboardMetrics, FacilityPerformance, PaymentTrends, TenantInsights } from '../services/dashboardService';

const SystemAdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [facilityPerformance, setFacilityPerformance] = useState<FacilityPerformance[]>([]);
  const [paymentTrends, setPaymentTrends] = useState<PaymentTrends | null>(null);
  const [tenantInsights, setTenantInsights] = useState<TenantInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  console.log('🚀 SystemAdminDashboard - Component loaded!');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [metricsData, facilityData, trendsData, insightsData] = await Promise.all([
        dashboardService.getDashboardMetrics(),
        dashboardService.getFacilityPerformance(),
        dashboardService.getPaymentTrends(),
        dashboardService.getTenantInsights()
      ]);
      
      setMetrics(metricsData);
      setFacilityPerformance(facilityData);
      setPaymentTrends(trendsData);
      setTenantInsights(insightsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickAction = (action: string) => {
    console.log('Quick action clicked:', action);
    // Handle navigation to different sections
    switch (action) {
      case 'payment':
        // Navigate to payment capture
        break;
      case 'tenant':
        // Navigate to tenant management
        break;
      case 'room':
        // Navigate to room management
        break;
      case 'lease':
        // Navigate to lease management
        break;
      case 'reports':
        // Navigate to reports
        break;
      case 'overdue':
        // Navigate to overdue payments
        break;
      case 'approvals':
        // Navigate to approvals
        break;
      case 'settings':
        // Navigate to settings
        break;
      default:
        break;
    }
  };

  const handleExportData = () => {
    // Implement data export functionality
    console.log('Exporting dashboard data...');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading Dashboard...</div>
          <div className="text-gray-400 text-sm">Fetching real-time data</div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">Failed to load dashboard</div>
          <Button onClick={loadDashboardData} variant="primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src="/RentDesk.png" 
                alt="RentDesk Logo" 
                className="w-12 h-12 rounded-lg"
              />
              <div>
                <h1 className="text-2xl font-bold text-white">System Admin Dashboard</h1>
                <p className="text-gray-400">Complete system overview and management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <Button 
                onClick={loadDashboardData} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleExportData} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Monthly Revenue"
            value={metrics.totalMonthlyRevenue}
            change={{ value: 12.5, type: 'increase', period: 'last month' }}
            icon={DollarSign}
            iconColor="text-green-400"
            iconBgColor="bg-green-500/20"
            trend={{ data: [45, 48, 52, 51, 55, 58, 62, 65, 68], period: '9 months' }}
          />
          
          <MetricCard
            title="Occupancy Rate"
            value={`${metrics.occupancyRate.toFixed(1)}%`}
            change={{ value: 3.2, type: 'increase', period: 'last month' }}
            icon={Building}
            iconColor="text-blue-400"
            iconBgColor="bg-blue-500/20"
            trend={{ data: [75, 78, 82, 80, 85, 87, 89, 91, 93], period: '9 months' }}
          />
          
          <MetricCard
            title="Overdue Payments"
            value={metrics.overduePayments}
            change={{ value: -15, type: 'decrease', period: 'last week' }}
            icon={AlertTriangle}
            iconColor="text-red-400"
            iconBgColor="bg-red-500/20"
          />
          
          <MetricCard
            title="Active Tenants"
            value={metrics.totalActiveTenants}
            change={{ value: 8.3, type: 'increase', period: 'last month' }}
            icon={Users}
            iconColor="text-purple-400"
            iconBgColor="bg-purple-500/20"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Outstanding Amount"
            value={metrics.totalOutstandingAmount}
            icon={TrendingUp}
            iconColor="text-orange-400"
            iconBgColor="bg-orange-500/20"
          />
          
          <MetricCard
            title="Payment Collection Rate"
            value={`${metrics.paymentCollectionRate.toFixed(1)}%`}
            icon={CheckCircle}
            iconColor="text-green-400"
            iconBgColor="bg-green-500/20"
          />
          
          <MetricCard
            title="Total Facilities"
            value={metrics.totalFacilities}
            icon={Building}
            iconColor="text-cyan-400"
            iconBgColor="bg-cyan-500/20"
          />
          
          <MetricCard
            title="System Users"
            value={metrics.totalUsers}
            icon={Shield}
            iconColor="text-indigo-400"
            iconBgColor="bg-indigo-500/20"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions onActionClick={handleQuickAction} />
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Payment Trends */}
          {paymentTrends && (
            <PerformanceChart
              title="Payment Trends (Monthly)"
              data={paymentTrends.monthly.map(item => ({
                label: item.month,
                value: item.amount,
                change: Math.random() * 20 - 10 // Mock change data
              }))}
              type="line"
              height={300}
            />
          )}
          
          {/* Facility Performance */}
          <PerformanceChart
            title="Facility Performance"
            data={facilityPerformance.map(facility => ({
              label: facility.facilityName,
              value: facility.monthlyRevenue,
              color: `hsl(${Math.random() * 360}, 70%, 50%)`
            }))}
            type="bar"
            height={300}
          />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <ActivityFeed 
              activities={metrics.recentActivities.map(activity => ({
                id: activity.id,
                type: activity.type as any,
                title: activity.message,
                description: `Activity in ${activity.type}`,
                timestamp: new Date().toISOString(),
                amount: activity.amount,
                status: activity.type === 'payment' ? 'success' : 'info'
              }))}
              maxItems={8}
            />
          </div>
          
          {/* System Status */}
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-gray-300">System Uptime</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{metrics.systemUptime}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-sm text-gray-300">Active Users</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{metrics.activeUsers}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span className="text-sm text-gray-300">Database Status</span>
                    </div>
                    <span className="text-sm font-semibold text-white">Healthy</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="text-sm text-gray-300">Pending Approvals</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{metrics.pendingPayments}</span>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Tenant Insights */}
            {tenantInsights && (
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Tenant Insights</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Average Income</div>
                      <div className="text-lg font-semibold text-white">
                        R{metrics.averageTenantIncome.toLocaleString()}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Average Tenure</div>
                      <div className="text-lg font-semibold text-white">
                        {tenantInsights.averageTenure} months
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Satisfaction Score</div>
                      <div className="text-lg font-semibold text-white">
                        {tenantInsights.tenantSatisfaction}/5.0
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemAdminDashboard;
