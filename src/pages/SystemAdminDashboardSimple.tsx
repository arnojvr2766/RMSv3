import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  DollarSign, 
  Building, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  X
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import QuickPaymentCapture from '../components/forms/QuickPaymentCapture';
import RenterSearchForm from '../components/forms/RenterSearchForm';
import RoomForm from '../components/forms/RoomForm';
import { facilityService } from '../services/firebaseService';

// Local type definitions to avoid import issues
interface Facility {
  id?: string;
  name: string;
  address: string;
  billingEntity: string;
  contactInfo: {
    phone: string;
    email: string;
  };
  defaultBusinessRules: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    childSurcharge: number;
    gracePeriodDays: number;
    paymentMethods: string[];
  };
  primaryColor: string;
  status: 'active' | 'inactive';
  createdAt: any;
  updatedAt: any;
}

interface Room {
  id?: string;
  facilityId: string;
  roomNumber: string;
  type: 'single' | 'double' | 'family' | 'studio';
  capacity: number;
  monthlyRent: number;
  depositAmount: number;
  amenities: string[];
  businessRules: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    childSurcharge: number;
    gracePeriodDays: number;
    paymentMethods: string[];
    usesFacilityDefaults: boolean;
  };
  status: 'available' | 'occupied' | 'maintenance' | 'unavailable';
  description?: string;
  floorLevel?: number;
  squareMeters?: number;
  createdAt: any;
  updatedAt: any;
}

interface Renter {
  id?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    idNumber: string;
    dateOfBirth: any;
    phone: string;
    email: string;
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  employment: {
    employer: string;
    position: string;
    monthlyIncome: number;
    workPhone?: string;
  };
  bankDetails: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    branchCode: string;
  };
  notes?: string;
  status: 'active' | 'inactive' | 'blacklisted';
  createdAt: any;
  updatedAt: any;
}

interface DashboardData {
  monthlyRevenue: number;
  occupancyRate: number;
  overduePayments: number;
  pendingApprovals: number;
  totalTenants: number;
  totalRooms: number;
  occupiedRooms: number;
}

interface ActivityItem {
  id: string;
  type: 'payment' | 'lease' | 'tenant' | 'maintenance' | 'overdue' | 'approval' | 'system';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  user?: string;
  facility?: string;
  room?: string;
  tenant?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
}

const SystemAdminDashboardSimple: React.FC = () => {
  const navigate = useNavigate();
  const [lastUpdated, setLastUpdated] = React.useState(new Date());
  const [dashboardData, setDashboardData] = React.useState<DashboardData>({
    monthlyRevenue: 0,
    occupancyRate: 0,
    overduePayments: 0,
    pendingApprovals: 0,
    totalTenants: 0,
    totalRooms: 0,
    occupiedRooms: 0
  });
  const [recentActivities, setRecentActivities] = React.useState<ActivityItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  
  // Modal states for quick actions
  const [showQuickPaymentCapture, setShowQuickPaymentCapture] = React.useState(false);
  const [showRenterForm, setShowRenterForm] = React.useState(false);
  const [showRoomForm, setShowRoomForm] = React.useState(false);
  const [showFacilitySelection, setShowFacilitySelection] = React.useState(false);
  const [selectedFacility, setSelectedFacility] = React.useState<Facility | null>(null);
  const [facilities, setFacilities] = React.useState<Facility[]>([]);
  
  console.log('🚀 SystemAdminDashboardSimple - Component loaded!');

  const fetchRealData = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching real dashboard data...');
      
      // Fetch all collections
      const [facilitiesSnapshot, roomsSnapshot, rentersSnapshot, paymentSchedulesSnapshot] = await Promise.all([
        getDocs(collection(db, 'facilities')),
        getDocs(collection(db, 'rooms')),
        getDocs(collection(db, 'renters')),
        getDocs(collection(db, 'payment_schedules'))
      ]);

      const facilities = facilitiesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      const rooms = roomsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      const renters = rentersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      const paymentSchedules = paymentSchedulesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      // Calculate real metrics
      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter((room: any) => room.status === 'occupied').length;
      const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
      
      // Calculate monthly revenue from occupied rooms
      const monthlyRevenue = rooms
        .filter((room: any) => room.status === 'occupied')
        .reduce((sum: number, room: any) => sum + (room.monthlyRent || 0), 0);

      // Count overdue payments
      let overduePayments = 0;
      paymentSchedules.forEach((schedule: any) => {
        if (schedule.payments) {
          schedule.payments.forEach((payment: any) => {
            if (payment.status === 'overdue') {
              overduePayments++;
            }
          });
        }
      });

      // Count pending approvals using the same logic as payment approvals page
      let pendingApprovals = 0;
      
      // First, count separate approval records from payment_approvals collection
      try {
        const approvalQuery = query(
          collection(db, 'payment_approvals'),
          where('status', '==', 'pending')
        );
        const approvalSnapshot = await getDocs(approvalQuery);
        pendingApprovals += approvalSnapshot.docs.length;
      } catch (error) {
        console.error('Error fetching payment approvals:', error);
      }
      
      // Then, count payments with pending_approval status from payment schedules
      paymentSchedules.forEach((schedule: any) => {
        if (schedule.payments) {
          schedule.payments.forEach((payment: any) => {
            if (payment.status === 'pending_approval') {
              pendingApprovals++;
            }
          });
        }
      });

      const realData: DashboardData = {
        monthlyRevenue,
        occupancyRate,
        overduePayments,
        pendingApprovals,
        totalTenants: renters.filter((renter: any) => renter.status === 'active').length,
        totalRooms,
        occupiedRooms
      };

      // Generate recent activities from the data
      const activities: ActivityItem[] = [];
      
      // Add recent payment activities
      paymentSchedules.forEach((schedule: any) => {
        if (schedule.payments) {
          schedule.payments.forEach((payment: any) => {
            if (payment.paidDate) {
              const facility = facilities.find((f: any) => f.id === schedule.facilityId);
              const room = rooms.find((r: any) => r.id === schedule.roomId);
              const renter = renters.find((renter: any) => renter.id === schedule.renterId);
              
              activities.push({
                id: `${schedule.id}-${payment.month}`,
                type: 'payment',
                title: 'Payment Received',
                description: `Payment of R${payment.amount || payment.paidAmount} received for ${room?.roomNumber || 'Room'}`,
                timestamp: payment.paidDate.toDate ? payment.paidDate.toDate().toISOString() : new Date().toISOString(),
                amount: payment.amount || payment.paidAmount,
                user: payment.capturedBy || 'System',
                facility: facility?.name,
                room: room?.roomNumber,
                tenant: renter ? `${renter.personalInfo?.firstName} ${renter.personalInfo?.lastName}` : 'Unknown',
                status: 'success'
              });
            }
          });
        }
      });

      // Add overdue payment alerts
      if (overduePayments > 0) {
        activities.push({
          id: 'overdue-alert',
          type: 'overdue',
          title: 'Overdue Payment Alert',
          description: `${overduePayments} payments are overdue and require immediate attention`,
          timestamp: new Date().toISOString(),
          status: 'error'
        });
      }

      // Add pending approval alerts
      if (pendingApprovals > 0) {
        activities.push({
          id: 'approval-alert',
          type: 'approval',
          title: 'Pending Approvals',
          description: `${pendingApprovals} payments are awaiting approval`,
          timestamp: new Date().toISOString(),
          status: 'warning'
        });
      }

      // Sort activities by timestamp (most recent first) and take the latest 8
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);

      console.log('📊 Real dashboard data:', realData);
      console.log('📊 Recent activities:', sortedActivities);
      setDashboardData(realData);
      setRecentActivities(sortedActivities);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRealData();
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    try {
      const facilitiesData = await facilityService.getFacilities();
      setFacilities(facilitiesData);
    } catch (error) {
      console.error('Error loading facilities:', error);
    }
  };

  const handleRefresh = () => {
    fetchRealData();
    console.log('Dashboard refreshed at:', new Date().toLocaleTimeString());
  };

  const handleQuickAction = (action: string) => {
    console.log('🚀 Quick action clicked:', action);
    console.log('🚀 Dashboard facilities:', facilities);
    switch (action) {
      case 'payment':
        setShowQuickPaymentCapture(true);
        break;
      case 'tenant':
        setShowRenterForm(true);
        break;
      case 'room':
        // If only one facility, auto-select it, otherwise show facility selection
        if (facilities.length === 1) {
          setSelectedFacility(facilities[0]);
          setShowRoomForm(true);
        } else if (facilities.length > 1) {
          // For multiple facilities, show facility selection modal
          setShowFacilitySelection(true);
        } else {
          // No facilities, navigate to facilities page to create one
          navigate('/facilities');
        }
        break;
      case 'reports':
        // For now, just show an alert - you can implement reports later
        alert('Reports feature coming soon!');
        break;
      case 'overdue':
        navigate('/payments?status=overdue');
        break;
      case 'approvals':
        navigate('/payment-approvals');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const handleRenterSelected = (renter: Renter) => {
    console.log('Renter selected:', renter);
    setShowRenterForm(false);
    // Navigate to rooms to select a room for this renter
    navigate('/rooms');
  };

  const handleRoomFormSuccess = () => {
    setShowRoomForm(false);
    setSelectedFacility(null);
    // Refresh dashboard data to show updated room count
    fetchRealData();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="w-full px-2 sm:px-4 lg:px-8 py-3 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-4">
              <img 
                src="/RentDesk.png" 
                alt="RentDesk Logo" 
                className="w-8 h-8 md:w-12 md:h-12 rounded-lg"
              />
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-white">System Admin Dashboard</h1>
                <p className="text-xs md:text-base text-gray-400">Complete system overview and management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="text-xs md:text-sm text-gray-400 hidden sm:block">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
              >
                <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full py-4 md:py-8">

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8">
          <Card>
            <div className="p-3 md:p-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2 md:p-3 bg-green-500/20 rounded-full">
                  <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                </div>
                <div className="text-xs md:text-sm text-green-400 font-medium">Live</div>
              </div>
              <h3 className="text-xs md:text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                Monthly Revenue
              </h3>
              <div className="text-xl md:text-3xl font-bold text-white mb-2">
                {loading ? '...' : `R${dashboardData.monthlyRevenue.toLocaleString()}`}
              </div>
              <div className="text-xs md:text-sm text-green-400">
                From {dashboardData.occupiedRooms} occupied rooms
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <Building className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-sm text-blue-400 font-medium">Live</div>
              </div>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                Occupancy Rate
              </h3>
              <div className="text-3xl font-bold text-white mb-2">
                {loading ? '...' : `${dashboardData.occupancyRate.toFixed(1)}%`}
              </div>
              <div className="text-sm text-blue-400">
                {dashboardData.occupiedRooms}/{dashboardData.totalRooms} rooms occupied
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div className="text-sm text-red-400 font-medium">Live</div>
              </div>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                Overdue Payments
              </h3>
              <div className="text-3xl font-bold text-white mb-2">
                {loading ? '...' : dashboardData.overduePayments}
              </div>
              <div className="text-sm text-red-400">
                Requires immediate attention
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/20 rounded-full">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-sm text-purple-400 font-medium">Live</div>
              </div>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">
                Active Tenants
              </h3>
              <div className="text-3xl font-bold text-white mb-2">
                {loading ? '...' : dashboardData.totalTenants}
              </div>
              <div className="text-sm text-purple-400">
                Currently active in system
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-4 md:mb-8">
          <h2 className="text-lg md:text-2xl font-bold text-white mb-3 md:mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
            {[
              { title: 'Capture Payment', icon: DollarSign, color: 'bg-blue-500/20 text-blue-400', action: 'payment' },
              { title: 'Add Tenant', icon: Users, color: 'bg-green-500/20 text-green-400', action: 'tenant' },
              { title: 'Add Room', icon: Building, color: 'bg-purple-500/20 text-purple-400', action: 'room' },
              { title: 'View Reports', icon: TrendingUp, color: 'bg-cyan-500/20 text-cyan-400', action: 'reports' },
              { title: 'Overdue Payments', icon: AlertTriangle, color: 'bg-red-500/20 text-red-400', badge: dashboardData.overduePayments, action: 'overdue' },
              { title: 'Pending Approvals', icon: CheckCircle, color: 'bg-yellow-500/20 text-yellow-400', badge: dashboardData.pendingApprovals, action: 'approvals' }
            ].map((action, index) => {
              const IconComponent = action.icon;
              return (
                <div
                  key={index}
                  className="group relative bg-gray-800 rounded-lg md:rounded-xl p-2 md:p-4 border border-gray-700 hover:border-gray-600 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer"
                  onClick={() => handleQuickAction(action.action)}
                >
                  {action.badge && action.badge > 0 && (
                    <div className={`absolute -top-1 -right-1 md:-top-2 md:-right-2 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      action.action === 'overdue' ? 'bg-red-500' : 
                      action.action === 'approvals' ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`}>
                      {action.badge}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <div className={`p-1.5 md:p-2 rounded-lg ${action.color}`}>
                      <IconComponent className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs md:text-sm font-semibold text-white">
                        {action.title}
                      </h3>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity - Full Width */}
        <Card>
          <div className="p-3 md:p-6">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-semibold text-white">Recent Activity</h3>
              <div className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm text-gray-400">
                <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
                <span>Live updates</span>
              </div>
            </div>
            
            <div className="space-y-2 md:space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">Loading recent activities...</div>
                  <div className="text-sm text-gray-500">Fetching data from Firestore</div>
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">No recent activity</div>
                  <div className="text-sm text-gray-500">Activities will appear here as they happen</div>
                </div>
              ) : (
                recentActivities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-2 md:space-x-4 p-2 md:p-4 rounded-lg hover:bg-gray-700/50 transition-colors duration-200 border border-gray-700"
                  >
                    <div className={`p-2 md:p-3 rounded-lg ${
                      activity.type === 'payment' ? 'bg-green-500/20 text-green-400' :
                      activity.type === 'overdue' ? 'bg-red-500/20 text-red-400' :
                      activity.type === 'approval' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {activity.type === 'payment' ? <DollarSign className="w-4 h-4 md:w-5 md:h-5" /> :
                       activity.type === 'overdue' ? <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" /> :
                       activity.type === 'approval' ? <CheckCircle className="w-4 h-4 md:w-5 md:h-5" /> :
                       <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-xs md:text-sm font-medium text-white mb-1">
                            {activity.title}
                          </h4>
                          <p className="text-xs md:text-sm text-gray-400 mb-1 md:mb-2">
                            {activity.description}
                          </p>
                          
                          {/* Additional details */}
                          <div className="flex flex-wrap gap-2 md:gap-4 text-xs text-gray-500">
                            {activity.user && (
                              <span className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>By: {activity.user}</span>
                              </span>
                            )}
                            {activity.facility && (
                              <span className="flex items-center space-x-1">
                                <Building className="w-3 h-3" />
                                <span>{activity.facility}</span>
                              </span>
                            )}
                            {activity.room && (
                              <span>Room: {activity.room}</span>
                            )}
                            {activity.tenant && (
                              <span>Tenant: {activity.tenant}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 ml-4">
                          {activity.amount && (
                            <div className="text-sm font-semibold text-green-400">
                              R{activity.amount.toLocaleString()}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {recentActivities.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-700">
                <button className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  View all activities →
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Payment Capture Modal */}
      {showQuickPaymentCapture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <QuickPaymentCapture
              onClose={() => setShowQuickPaymentCapture(false)}
              onSuccess={() => {
                setShowQuickPaymentCapture(false);
                fetchRealData(); // Refresh dashboard data
              }}
            />
          </div>
        </div>
      )}

      {/* Add Renter Modal */}
      {showRenterForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
            <RenterSearchForm
              onRenterSelected={handleRenterSelected}
              onCancel={() => setShowRenterForm(false)}
            />
          </div>
        </div>
      )}

      {/* Facility Selection Modal */}
      {showFacilitySelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Select Facility</h2>
              <Button variant="ghost" onClick={() => setShowFacilitySelection(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <p className="text-gray-400 mb-6">Choose which facility you want to add a room to:</p>
            
            <div className="space-y-3">
              {facilities.map((facility) => (
                <div
                  key={facility.id}
                  className="p-4 border border-gray-700 rounded-lg hover:border-gray-600 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedFacility(facility);
                    setShowFacilitySelection(false);
                    setShowRoomForm(true);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: facility.primaryColor }}
                    >
                      <Building className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{facility.name}</h3>
                      <p className="text-gray-400 text-sm">{facility.address}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showRoomForm && selectedFacility && (
        <RoomForm
          facility={selectedFacility}
          onSuccess={handleRoomFormSuccess}
          onCancel={() => {
            setShowRoomForm(false);
            setSelectedFacility(null);
          }}
        />
      )}
    </div>
  );
};

export default SystemAdminDashboardSimple;
