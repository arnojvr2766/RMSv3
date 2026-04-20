import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Plus, 
  Filter, 
  Search, 
  Calendar, 
  Building2, 
  DoorClosed, 
  User, 
  DollarSign,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useOrganizationSettings } from '../../contexts/OrganizationSettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  facilityService, 
  roomService, 
  renterService, 
  leaseService, 
  paymentScheduleService
} from '../../services/firebaseService';
import { overdueService } from '../../services/overdueService';
import { paymentApprovalService, type PaymentApproval } from '../../services/paymentApprovalService';
import { Timestamp } from 'firebase/firestore';
import MobileCard from '../../components/mobile/MobileCard';
import QuickActions from '../../components/mobile/QuickActions';
import BottomSheet from '../../components/mobile/BottomSheet';
import PaymentCapture from '../../components/forms/PaymentCapture';
import PaymentEdit from '../../components/forms/PaymentEdit';
import QuickPaymentCapture from '../../components/forms/QuickPaymentCapture';
import MobilePaymentCapture from '../../components/mobile/MobilePaymentCapture';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

interface PaymentTransaction {
  id: string;
  leaseId: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  month: string;
  dueDate: any;
  amount: number;
  type: 'rent' | 'deposit' | 'late_fee' | 'deposit_payout' | 'maintenance' | 'penalty';
  status: 'pending' | 'paid' | 'overdue' | 'partial' | 'pending_approval';
  paidAmount?: number;
  paidDate?: any;
  paymentMethod?: string;
  lateFee?: number;
  notes?: string;
  facilityName?: string;
  roomNumber?: string;
  renterName?: string;
}

/**
 * MobilePayments - Mobile-optimized payments page
 * Features:
 * - Card-based payment list (no tables)
 * - Quick capture FAB
 * - Swipeable payment cards
 * - Pull-to-refresh
 * - Large touch targets
 */
const MobilePayments: React.FC = () => {
  const { currentRole, isSystemAdmin } = useRole();
  const { allowStandardUserPayments } = useOrganizationSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [showPaymentCapture, setShowPaymentCapture] = useState(false);
  const [showPaymentEdit, setShowPaymentEdit] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentTransaction | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [selectedPaymentData, setSelectedPaymentData] = useState<any>(null);
  const [isLoadingPaymentData, setIsLoadingPaymentData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Loading payments...');
      
      // Load facilities, rooms, renters, leases
      const facilities = await facilityService.getFacilities();
      console.log('Facilities loaded:', facilities.length);
      
      const rooms = await roomService.getAllRooms();
      console.log('Rooms loaded:', rooms.length);
      
      const renters = await renterService.getAllRenters();
      console.log('Renters loaded:', renters.length);
      
      const leases = await leaseService.getAllLeases();
      console.log('Leases loaded:', leases.length);

      // Load payment schedules
      const schedules = await paymentScheduleService.getAllPaymentSchedules();
      console.log('Payment schedules loaded:', schedules.length);

      const transactions: PaymentTransaction[] = [];
      const facilityMap = new Map(facilities.map(f => [f.id, f]));
      const roomMap = new Map(rooms.map(r => [r.id, r]));
      const renterMap = new Map(renters.map(r => [r.id, r]));
      const leaseMap = new Map(leases.map(l => [l.id, l]));

      // Get current month and previous 2 months
      const now = new Date();
      const monthsToLoad = new Set<string>();
      for (let i = 0; i < 3; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsToLoad.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
      }
      console.log('Months to load:', Array.from(monthsToLoad));

      for (const schedule of schedules) {
        const lease = leaseMap.get(schedule.leaseId);
        if (!lease) {
          console.warn(`Lease not found for schedule ${schedule.id}, leaseId: ${schedule.leaseId}`);
          continue;
        }

        const facility = facilityMap.get(lease.facilityId);
        const room = roomMap.get(lease.roomId);
        const renter = renterMap.get(lease.renterId);

        // Check if schedule has payments array
        if (!schedule.payments || !Array.isArray(schedule.payments)) {
          console.warn(`Schedule ${schedule.id} has no payments array`);
          continue;
        }

        schedule.payments.forEach(payment => {
          if (!monthsToLoad.has(payment.month)) return;

          transactions.push({
            id: `${schedule.id}_${payment.month}`,
            leaseId: lease.id!,
            facilityId: lease.facilityId,
            roomId: lease.roomId,
            renterId: lease.renterId,
            month: payment.month,
            dueDate: payment.dueDate,
            amount: payment.amount,
            type: payment.type,
            status: payment.status,
            paidAmount: payment.paidAmount,
            paidDate: payment.paidDate,
            paymentMethod: payment.paymentMethod,
            lateFee: payment.lateFee,
            notes: payment.notes,
            facilityName: facility?.name || 'Unknown Facility',
            roomNumber: room?.roomNumber || 'Unknown Room',
            renterName: renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : 'Unknown Renter'
          });
        });
      }

      console.log('Transactions created:', transactions.length);
      setPaymentTransactions(transactions);
    } catch (error: any) {
      console.error('Error loading payments:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to load payments. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = paymentTransactions.filter(payment => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (
        !payment.facilityName?.toLowerCase().includes(searchLower) &&
        !payment.roomNumber?.toLowerCase().includes(searchLower) &&
        !payment.renterName?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Status filter
    if (filterStatus !== 'all' && payment.status !== filterStatus) {
      return false;
    }

    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'overdue':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'partial':
        return <Clock className="w-5 h-5 text-orange-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'overdue':
        return 'bg-red-500/20 text-red-400';
      case 'partial':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handlePaymentClick = async (payment: PaymentTransaction) => {
    // If payment is pending or overdue, show capture flow
    if (payment.status === 'pending' || payment.status === 'overdue') {
      setSelectedPayment(payment);
      setSelectedScheduleId(payment.id.split('_')[0]);
      setShowPaymentCapture(true);
    } else {
      // Otherwise, show edit flow for paid/partial payments
      setSelectedPayment(payment);
      const scheduleId = payment.id.split('_')[0];
      setSelectedScheduleId(scheduleId);
      setIsLoadingPaymentData(true);
      
      try {
        // Fetch the payment schedule to get the actual payment object
        const schedule = await paymentScheduleService.getPaymentScheduleById(scheduleId);
        if (schedule && schedule.payments) {
          const paymentData = schedule.payments.find(p => p.month === payment.month);
          if (paymentData) {
            setSelectedPaymentData(paymentData);
            setShowPaymentEdit(true);
          } else {
            alert('Payment not found in schedule');
          }
        } else {
          alert('Payment schedule not found');
        }
      } catch (error) {
        console.error('Error loading payment data:', error);
        alert('Failed to load payment data');
      } finally {
        setIsLoadingPaymentData(false);
      }
    }
  };

  const handleQuickCapture = () => {
    setShowQuickCapture(true);
  };

  return (
    <div className="p-4 pt-20 pb-24 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search payments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Bar - iOS Style Segmented Control */}
      <div className="bg-gray-800/60 rounded-2xl p-1.5 flex items-center shadow-inner">
        <div className="flex items-center flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          {['all', 'pending', 'paid', 'overdue', 'partial'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`relative flex-1 min-w-[70px] px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 touch-manipulation ${
                filterStatus === status
                  ? 'text-gray-900 bg-white shadow-md'
                  : 'text-gray-400 active:text-gray-300'
              }`}
            >
              <span className="relative z-10">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Cards */}
      {error ? (
        <div className="text-center py-12">
          <CreditCard className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button variant="primary" onClick={loadPayments}>
            Try Again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading payments...</p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No payments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => (
            <MobileCard
              key={payment.id}
              onClick={() => handlePaymentClick(payment)}
              className="cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(payment.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-1">
                    R{payment.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-400">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{payment.renterName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DoorClosed className="w-4 h-4" />
                      <span>{payment.roomNumber}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4" />
                      <span>{payment.facilityName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{payment.month}</span>
                    </div>
                    {payment.type && (
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4" />
                        <span className="capitalize">{payment.type.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                </div>
                    <div className="ml-4 flex-shrink-0 flex flex-col space-y-2">
                      {(payment.status === 'pending' || payment.status === 'overdue') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePaymentClick(payment);
                          }}
                          className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 active:shadow-md transition-all duration-150 touch-manipulation"
                          title="Capture Payment"
                          aria-label="Capture Payment"
                        >
                          <DollarSign className="w-5 h-5 text-gray-900" strokeWidth={2.5} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePaymentClick(payment);
                        }}
                        className="w-12 h-12 bg-gray-700/50 rounded-2xl flex items-center justify-center active:bg-gray-700 active:scale-95 transition-all duration-150 touch-manipulation"
                        title="View Details"
                        aria-label="View Details"
                      >
                        <Eye className="w-5 h-5 text-gray-300" strokeWidth={2} />
                      </button>
                    </div>
              </div>
            </MobileCard>
          ))}
        </div>
      )}

      {/* Quick Capture FAB */}
      <QuickActions
        mainAction={{
          id: 'capture-payment',
          label: 'Capture Payment',
          icon: Plus,
          onClick: handleQuickCapture,
        }}
      />

      {/* Quick Payment Capture Modal */}
      {showQuickCapture && (
        <QuickPaymentCapture
          onClose={() => {
            setShowQuickCapture(false);
            loadPayments();
          }}
          onSuccess={() => {
            setShowQuickCapture(false);
            loadPayments();
          }}
        />
      )}

      {/* Mobile Payment Capture Modal */}
      {showPaymentCapture && selectedPayment && (
        <MobilePaymentCapture
          paymentTransaction={selectedPayment}
          scheduleId={selectedScheduleId}
          onSuccess={() => {
            setShowPaymentCapture(false);
            setSelectedPayment(null);
            loadPayments();
          }}
          onCancel={() => {
            setShowPaymentCapture(false);
            setSelectedPayment(null);
          }}
        />
      )}

      {/* Payment Edit Modal */}
      {showPaymentEdit && selectedPayment && selectedPaymentData && (
        <PaymentEdit
          payment={selectedPaymentData}
          scheduleId={selectedScheduleId}
          monthKey={selectedPayment.month}
          onSuccess={() => {
            setShowPaymentEdit(false);
            setSelectedPayment(null);
            setSelectedPaymentData(null);
            loadPayments();
          }}
          onCancel={() => {
            setShowPaymentEdit(false);
            setSelectedPayment(null);
            setSelectedPaymentData(null);
          }}
        />
      )}
      
      {/* Loading overlay for payment data */}
      {isLoadingPaymentData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-white">Loading payment details...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobilePayments;

