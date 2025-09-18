import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
  facilityService, 
  roomService, 
  renterService, 
  leaseService, 
  paymentScheduleService
} from '../services/firebaseService';
import { overdueService } from '../services/overdueService';
import { Timestamp } from 'firebase/firestore';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import PaymentCapture from '../components/forms/PaymentCapture';
import PaymentEdit from '../components/forms/PaymentEdit';
import QuickPaymentCapture from '../components/forms/QuickPaymentCapture';

// Interfaces
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Room {
  id?: string;
  facilityId: string;
  roomNumber: string;
  type: 'single' | 'double' | 'family';
  capacity: number;
  monthlyRent: number;
  deposit: number;
  businessRules: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    childSurcharge: number;
    gracePeriodDays: number;
    paymentMethods: string[];
  };
  status: 'available' | 'occupied' | 'maintenance';
  description?: string;
  floorLevel?: number;
  squareMeters?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Renter {
  id?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    idNumber: string;
    dateOfBirth: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  employmentInfo: {
    employer: string;
    position: string;
    monthlyIncome: number;
    employmentType: 'full-time' | 'part-time' | 'contract' | 'self-employed';
  };
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface LeaseAgreement {
  id?: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  monthlyRent: number;
  deposit: number;
  depositPaidDate?: Timestamp;
  status: 'active' | 'expired' | 'terminated';
  terms: {
    leaseDuration: number;
    renewalTerms: string;
    terminationNotice: number;
    specialConditions?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

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
  paymentProof?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    data: string; // base64
    uploadedAt: any;
  };
  facilityName?: string;
  roomNumber?: string;
  renterName?: string;
}

const Payments: React.FC = () => {
  const { currentRole, isSystemAdmin } = useRole();
  const { allowStandardUserRooms } = useSettings();
  const [searchParams] = useSearchParams();
  
  // State
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [renters, setRenters] = useState<Renter[]>([]);
  const [leases, setLeases] = useState<LeaseAgreement[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states - multi-select arrays
  const [filterFacilities, setFilterFacilities] = useState<string[]>([]);
  const [filterRooms, setFilterRooms] = useState<string[]>([]);
  const [filterRenters, setFilterRenters] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{key: string; direction: 'asc' | 'desc'} | null>(null);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]); // No default selection
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false); // Default collapsed
  
  // Modal states
  const [showQuickPaymentCapture, setShowQuickPaymentCapture] = useState(false);
  const [showPaymentEdit, setShowPaymentEdit] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentTransaction | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string>('');

  // Check permissions
  const canManagePayments = isSystemAdmin || (currentRole === 'standard_user' && allowStandardUserRooms);

  // Load all data
  useEffect(() => {
    loadData();
  }, []);

  // Check for overdue payments when component mounts
  useEffect(() => {
    const checkOverduePayments = async () => {
      try {
        await overdueService.checkAndUpdateOverduePayments();
      } catch (error) {
        console.error('Error checking overdue payments:', error);
      }
    };
    
    checkOverduePayments();
  }, []);

  // Handle URL parameters for cross-navigation
  useEffect(() => {
    const facilityId = searchParams.get('facility');
    const roomId = searchParams.get('room');
    const renterId = searchParams.get('renter');
    
    if (facilityId && facilities.length > 0) {
      // Auto-apply facility filter when navigating from Facilities page
      setFilterFacilities([facilityId]);
    }
    
    if (roomId && rooms.length > 0) {
      // Auto-apply room filter when navigating from Rooms page
      setFilterRooms([roomId]);
    }
    
    if (renterId && renters.length > 0) {
      // Auto-apply renter filter when navigating from Renters page
      setFilterRenters([renterId]);
    }
  }, [searchParams, facilities, rooms, renters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [facilitiesData, leasesData, rentersData] = await Promise.all([
        facilityService.getFacilities(),
        leaseService.getAllLeases(),
        renterService.getAllRenters()
      ]);

      setFacilities(facilitiesData);
      setLeases(leasesData);
      setRenters(rentersData);

      // Load rooms for all facilities
      const roomsPromises = facilitiesData.map(facility => 
        roomService.getRooms(facility.id)
      );
      const roomsArrays = await Promise.all(roomsPromises);
      const allRooms = roomsArrays.flat();
      setRooms(allRooms);

      // Load payment schedules and create transactions
      await loadPaymentTransactions(leasesData, facilitiesData, allRooms, rentersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPaymentTransactions = async (leasesData: LeaseAgreement[], facilitiesData: Facility[], roomsData: Room[], rentersData: Renter[]) => {
    try {
      const transactions: PaymentTransaction[] = [];
      console.log('Loading payment transactions for', leasesData.length, 'leases');
      console.log('Available facilities:', facilitiesData.length, 'rooms:', roomsData.length, 'renters:', rentersData.length);
      
      for (const lease of leasesData) {
        try {
          console.log('Fetching payment schedule for lease:', lease.id, 'facility:', lease.facilityId, 'room:', lease.roomId, 'renter:', lease.renterId);
          const schedule = await paymentScheduleService.getPaymentScheduleByLease(lease.id);
          if (schedule) {
            console.log('Found payment schedule with', schedule.payments.length, 'payments for lease:', lease.id);
            const facility = facilitiesData.find(f => f.id === lease.facilityId);
            const room = roomsData.find(r => r.id === lease.roomId);
            const renter = rentersData.find(r => r.id === lease.renterId);
            
            console.log('Found facility:', facility?.name, 'room:', room?.roomNumber, 'renter:', renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : 'Not found');
            
            schedule.payments.forEach(payment => {
              console.log('Payment data for', payment.month, ':', payment);
              transactions.push({
                id: `${schedule.id}_${payment.month}`,
                leaseId: lease.id,
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
                paymentProof: payment.paymentProof,
                facilityName: facility?.name || 'Unknown Facility',
                roomNumber: room?.roomNumber || 'Unknown Room',
                renterName: renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : 'Unknown Renter'
              });
            });

            // Add aggregated penalty transaction if it exists and has been paid or has outstanding amount
            if (schedule.aggregatedPenalty && (schedule.aggregatedPenalty.outstandingAmount > 0 || schedule.aggregatedPenalty.paidAmount > 0)) {
              // Determine penalty status based on payment amounts
              let penaltyStatus: 'pending' | 'paid' | 'partial' | 'overdue' = 'pending';
              if (schedule.aggregatedPenalty.paidAmount >= schedule.aggregatedPenalty.totalAmount) {
                penaltyStatus = 'paid';
              } else if (schedule.aggregatedPenalty.paidAmount > 0) {
                penaltyStatus = 'partial';
              } else {
                // Check if penalty is overdue based on last calculation date
                const lastCalculated = schedule.aggregatedPenalty.lastCalculated.toDate();
                const daysSinceCalculation = Math.floor((new Date().getTime() - lastCalculated.getTime()) / (1000 * 60 * 60 * 24));
                penaltyStatus = daysSinceCalculation > 7 ? 'overdue' : 'pending';
              }

              transactions.push({
                id: `${schedule.id}_penalty`,
                leaseId: lease.id,
                facilityId: lease.facilityId,
                roomId: lease.roomId,
                renterId: lease.renterId,
                month: 'Penalties',
                dueDate: schedule.aggregatedPenalty.lastCalculated,
                amount: schedule.aggregatedPenalty.outstandingAmount,
                type: 'penalty',
                status: penaltyStatus,
                paidAmount: schedule.aggregatedPenalty.paidAmount,
                paidDate: undefined,
                paymentMethod: undefined,
                lateFee: 0,
                notes: `Aggregated penalties - ${schedule.aggregatedPenalty.calculationHistory.length} calculations`,
                paymentProof: undefined,
                facilityName: facility?.name || 'Unknown Facility',
                roomNumber: room?.roomNumber || 'Unknown Room',
                renterName: renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : 'Unknown Renter'
              });
            }
          } else {
            console.log('No payment schedule found for lease:', lease.id);
          }
        } catch (error) {
          console.error(`Error loading payment schedule for lease ${lease.id}:`, error);
        }
      }
      
      console.log('Total payment transactions loaded:', transactions.length);
      setPaymentTransactions(transactions);
    } catch (error) {
      console.error('Error loading payment transactions:', error);
    }
  };

  // Filter transactions
  const filteredTransactions = paymentTransactions.filter(transaction => {
    if (filterFacilities.length > 0 && !filterFacilities.includes(transaction.facilityId)) return false;
    if (filterRooms.length > 0 && !filterRooms.includes(transaction.roomId)) return false;
    if (filterRenters.length > 0 && !filterRenters.includes(transaction.renterId)) return false;
    if (filterStatuses.length > 0 && !filterStatuses.includes(transaction.status)) return false;
    if (filterTypes.length > 0 && !filterTypes.includes(transaction.type)) return false;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        transaction.facilityName?.toLowerCase().includes(searchLower) ||
        transaction.roomNumber?.toLowerCase().includes(searchLower) ||
        transaction.renterName?.toLowerCase().includes(searchLower) ||
        transaction.month.toLowerCase().includes(searchLower)
      );
    }
    
    if (dateFrom || dateTo) {
      const transactionDate = transaction.paidDate ? 
        new Date(transaction.paidDate.toDate ? transaction.paidDate.toDate() : transaction.paidDate) :
        new Date(transaction.dueDate.toDate ? transaction.dueDate.toDate() : transaction.dueDate);
      
      if (dateFrom && transactionDate < new Date(dateFrom)) return false;
      if (dateTo && transactionDate > new Date(dateTo)) return false;
    }
    
    return true;
  });

  // Get filtered rooms based on selected facility
  const filteredRooms = filterFacilities.length > 0 ? 
    rooms.filter(room => filterFacilities.includes(room.facilityId)) : 
    rooms;

  // Get filtered renters based on selected facilities
  const filteredRenters = filterFacilities.length > 0 ? 
    renters.filter(renter => 
      leases.some(lease => 
        filterFacilities.includes(lease.facilityId) && lease.renterId === renter.id
      )
    ) : 
    renters;

  // Statistics
  const totalTransactions = filteredTransactions.length;
  const paidTransactions = filteredTransactions.filter(t => t.status === 'paid').length;
  const pendingTransactions = filteredTransactions.filter(t => t.status === 'pending').length;
  const overdueTransactions = filteredTransactions.filter(t => t.status === 'overdue').length;
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + (t.paidAmount || 0), 0);

  // Get active filter summary
  const getActiveFiltersSummary = () => {
    const activeFilters = [];
    
    if (filterFacilities.length > 0) {
      const facilityNames = filterFacilities.map(id => 
        facilities.find(f => f.id === id)?.name || id
      );
      activeFilters.push(`Facilities: ${facilityNames.join(', ')}`);
    }
    
    if (filterRooms.length > 0) {
      const roomNumbers = filterRooms.map(id => 
        rooms.find(r => r.id === id)?.roomNumber || id
      );
      activeFilters.push(`Rooms: ${roomNumbers.join(', ')}`);
    }
    
    if (filterRenters.length > 0) {
      const renterNames = filterRenters.map(id => {
        const renter = renters.find(r => r.id === id);
        return renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : id;
      });
      activeFilters.push(`Renters: ${renterNames.join(', ')}`);
    }
    
    if (filterStatuses.length > 0) {
      activeFilters.push(`Status: ${filterStatuses.join(', ')}`);
    }
    
    if (filterTypes.length > 0) {
      activeFilters.push(`Types: ${filterTypes.join(', ')}`);
    }
    
    return activeFilters;
  };

  // Multi-select filter handlers
  const toggleFilter = (filterType: 'facilities' | 'rooms' | 'renters' | 'types' | 'statuses', value: string) => {
    const setterMap = {
      facilities: setFilterFacilities,
      rooms: setFilterRooms,
      renters: setFilterRenters,
      types: setFilterTypes,
      statuses: setFilterStatuses
    };
    
    const currentFilters = {
      facilities: filterFacilities,
      rooms: filterRooms,
      renters: filterRenters,
      types: filterTypes,
      statuses: filterStatuses
    };
    
    const setter = setterMap[filterType];
    const current = currentFilters[filterType];
    
    if (current.includes(value)) {
      setter(current.filter(item => item !== value));
    } else {
      setter([...current, value]);
    }
  };

  const clearAllFilters = () => {
    setFilterFacilities([]);
    setFilterRooms([]);
    setFilterRenters([]);
    setFilterTypes([]);
    setFilterStatuses([]);
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
  };

  // Sorting functionality
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedTransactions = () => {
    if (!sortConfig) return filteredTransactions;

    return [...filteredTransactions].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'facility':
          aValue = a.facilityName || '';
          bValue = b.facilityName || '';
          break;
        case 'room':
          aValue = a.roomNumber || '';
          bValue = b.roomNumber || '';
          break;
        case 'renter':
          aValue = a.renterName || '';
          bValue = b.renterName || '';
          break;
        case 'month':
          aValue = a.month || '';
          bValue = b.month || '';
          break;
        case 'type':
          aValue = a.type || '';
          bValue = b.type || '';
          break;
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'paidDate':
          aValue = a.paidDate ? (a.paidDate.toDate ? a.paidDate.toDate() : new Date(a.paidDate)) : new Date(0);
          bValue = b.paidDate ? (b.paidDate.toDate ? b.paidDate.toDate() : new Date(b.paidDate)) : new Date(0);
          break;
        case 'method':
          aValue = a.paymentMethod || '';
          bValue = b.paymentMethod || '';
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Handlers
  const handleCapturePayment = () => {
    setShowQuickPaymentCapture(true);
  };

  const handleCaptureSpecificPayment = (transaction: PaymentTransaction) => {
    // For specific payment capture, we'll use the QuickPaymentCapture with pre-filled data
    setEditingPayment(transaction);
    setEditingScheduleId(transaction.id.split('_')[0]); // Extract schedule ID
    setShowQuickPaymentCapture(true);
  };

  const handleEditPayment = (transaction: PaymentTransaction) => {
    setEditingPayment(transaction);
    setEditingScheduleId(transaction.id.split('_')[0]); // Extract schedule ID
    setShowPaymentEdit(true);
  };

  const handlePaymentSuccess = () => {
    setShowQuickPaymentCapture(false);
    setShowPaymentEdit(false);
    setEditingPayment(null);
    loadData(); // Reload all data
  };

  const handlePaymentCancel = () => {
    setShowQuickPaymentCapture(false);
    setShowPaymentEdit(false);
    setEditingPayment(null);
  };

  const handleCheckOverdue = async () => {
    try {
      await overdueService.checkAndUpdateOverduePayments();
      // Reload data to show updated statuses
      await loadData();
    } catch (error) {
      console.error('Error checking overdue payments:', error);
      alert('Failed to check overdue payments. Please try again.');
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'overdue': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'partial': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending_approval': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'rent': return 'bg-blue-500/20 text-blue-400';
      case 'deposit': return 'bg-green-500/20 text-green-400';
      case 'late_fee': return 'bg-red-500/20 text-red-400';
      case 'penalty': return 'bg-red-600/20 text-red-500';
      case 'deposit_payout': return 'bg-purple-500/20 text-purple-400';
      case 'maintenance': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      return date.toDate ? date.toDate().toLocaleDateString() : new Date(date).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading payment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-secondary-900" />
              </div>
              <h1 className="text-3xl font-bold text-white">Payments</h1>
            </div>
            {canManagePayments && (
              <Button onClick={handleCapturePayment}>
                <Plus className="w-4 h-4 mr-2" />
                Capture Payment
              </Button>
            )}
          </div>
          <p className="text-gray-400 text-lg">
            Manage rental payments, track income, and handle payment processing
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Transactions</p>
                <p className="text-white text-xl font-semibold">{totalTransactions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Paid</p>
                <p className="text-white text-xl font-semibold">{paidTransactions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-white text-xl font-semibold">{pendingTransactions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Overdue</p>
                <p className="text-white text-xl font-semibold">{overdueTransactions}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Collected</p>
                <p className="text-white text-xl font-semibold">R{totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Collapsible Filters */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Filter className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-white">Filters</h2>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
              <button
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <span className="text-sm">{isFiltersExpanded ? 'Hide' : 'Show'} Filters</span>
                {isFiltersExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          
          {/* Active Filters Summary - Always Visible */}
          {getActiveFiltersSummary().length > 0 && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Active Filters:</span>
                </div>
                <button
                  onClick={() => {
                    setFilterFacilities([]);
                    setFilterRooms([]);
                    setFilterRenters([]);
                    setFilterStatuses([]);
                    setFilterTypes([]);
                  }}
                  className="text-xs text-gray-400 hover:text-white flex items-center space-x-1"
                >
                  <X className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {getActiveFiltersSummary().map((filter, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30"
                  >
                    {filter}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Status Badge Filters - Always Visible */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['paid', 'pending', 'overdue', 'partial'].map(status => (
              <button
                key={status}
                onClick={() => toggleFilter('statuses', status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filterStatuses.includes(status)
                    ? status === 'paid' ? 'bg-green-500 text-white' :
                      status === 'pending' ? 'bg-yellow-500 text-white' :
                      status === 'overdue' ? 'bg-red-500 text-white' :
                      'bg-orange-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Collapsible Filter Content */}
          {isFiltersExpanded && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Facility Multi-Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Facilities</label>
                  <div className="max-h-32 overflow-y-auto border border-gray-600 rounded-lg bg-gray-700 p-2">
                    {facilities.sort((a, b) => a.name.localeCompare(b.name)).map(facility => (
                      <label key={facility.id} className="flex items-center space-x-2 text-sm text-white hover:bg-gray-600 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filterFacilities.includes(facility.id || '')}
                          onChange={() => toggleFilter('facilities', facility.id || '')}
                          className="rounded border-gray-500"
                        />
                        <span>{facility.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Room Multi-Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Rooms</label>
                  <div className="max-h-32 overflow-y-auto border border-gray-600 rounded-lg bg-gray-700 p-2">
                    {filteredRooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, {numeric: true})).map(room => (
                      <label key={room.id} className="flex items-center space-x-2 text-sm text-white hover:bg-gray-600 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filterRooms.includes(room.id || '')}
                          onChange={() => toggleFilter('rooms', room.id || '')}
                          className="rounded border-gray-500"
                        />
                        <span>{room.roomNumber}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Renter Multi-Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Renters</label>
                  <div className="max-h-32 overflow-y-auto border border-gray-600 rounded-lg bg-gray-700 p-2">
                    {filteredRenters.sort((a, b) => {
                      const nameA = `${a.personalInfo.firstName} ${a.personalInfo.lastName}`;
                      const nameB = `${b.personalInfo.firstName} ${b.personalInfo.lastName}`;
                      return nameA.localeCompare(nameB);
                    }).map(renter => (
                      <label key={renter.id} className="flex items-center space-x-2 text-sm text-white hover:bg-gray-600 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filterRenters.includes(renter.id || '')}
                          onChange={() => toggleFilter('renters', renter.id || '')}
                          className="rounded border-gray-500"
                        />
                        <span>{renter.personalInfo.firstName} {renter.personalInfo.lastName}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Type Multi-Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Payment Types</label>
                  <div className="max-h-32 overflow-y-auto border border-gray-600 rounded-lg bg-gray-700 p-2">
                    {['rent', 'deposit', 'late_fee', 'deposit_payout', 'maintenance', 'penalty'].map(type => (
                      <label key={type} className="flex items-center space-x-2 text-sm text-white hover:bg-gray-600 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={filterTypes.includes(type)}
                          onChange={() => toggleFilter('types', type)}
                          className="rounded border-gray-500"
                        />
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date Range and Search */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date From */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">From Date</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="Start date"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">To Date</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    placeholder="End date"
                  />
                </div>

                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Search</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <Input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search transactions..."
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Transactions Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Payment Transactions ({filteredTransactions.length})
            </h2>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handleCheckOverdue}>
                <Calendar className="w-4 h-4 mr-2" />
                Check Overdue
              </Button>
              <Button variant="ghost" size="sm" onClick={loadData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Transactions Found</h3>
              <p className="text-gray-400">
                {paymentTransactions.length === 0 
                  ? 'No payment transactions have been recorded yet.'
                  : 'No transactions match your current filters.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th 
                      className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('facility')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Facility</span>
                        {sortConfig?.key === 'facility' && (
                          sortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('room')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Room</span>
                        {sortConfig?.key === 'room' && (
                          sortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('renter')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Renter</span>
                        {sortConfig?.key === 'renter' && (
                          sortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('month')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Month</span>
                        {sortConfig?.key === 'month' && (
                          sortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Type</span>
                        {sortConfig?.key === 'type' && (
                          sortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Amount</span>
                        {sortConfig?.key === 'amount' && (
                          sortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Status</span>
                        {sortConfig?.key === 'status' && (
                          sortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('paidDate')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Paid Date</span>
                        {sortConfig?.key === 'paidDate' && (
                          sortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort('method')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Method</span>
                        {sortConfig?.key === 'method' && (
                          sortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedTransactions().map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-4 text-white">{transaction.facilityName}</td>
                      <td className="py-3 px-4 text-white">{transaction.roomNumber}</td>
                      <td className="py-3 px-4 text-white">{transaction.renterName}</td>
                      <td className="py-3 px-4 text-white">{transaction.month}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(transaction.type)}`}>
                          {transaction.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white">
                        R{transaction.amount.toLocaleString()}
                        {transaction.status === 'partial' && transaction.paidAmount && (
                          <div className="text-xs text-gray-400">
                            Paid: R{transaction.paidAmount.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                          {transaction.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white">{formatDate(transaction.paidDate)}</td>
                      <td className="py-3 px-4 text-white capitalize">
                        {transaction.paymentMethod?.replace('_', ' ') || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {/* View button - always available */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPayment(transaction)}
                            title="View Payment Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {/* Capture Payment button - for overdue, pending, and partial payments */}
                          {canManagePayments && (transaction.status === 'overdue' || transaction.status === 'pending' || transaction.status === 'partial') && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleCaptureSpecificPayment(transaction)}
                              title="Capture Payment"
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {/* Edit button - for paid and partial payments */}
                          {canManagePayments && (transaction.status === 'paid' || transaction.status === 'partial') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPayment(transaction)}
                              title="Edit Payment"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Quick Payment Capture Modal */}
        {showQuickPaymentCapture && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <QuickPaymentCapture
                onClose={handlePaymentCancel}
                onSuccess={handlePaymentSuccess}
                preSelectedTransaction={editingPayment ? {
                  facilityId: editingPayment.facilityId,
                  roomId: editingPayment.roomId,
                  renterId: editingPayment.renterId,
                  month: editingPayment.month,
                  amount: editingPayment.amount,
                  type: editingPayment.type
                } : undefined}
              />
            </div>
          </div>
        )}

        {/* Payment Edit Modal */}
        {showPaymentEdit && editingPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <PaymentEdit
                payment={editingPayment}
                scheduleId={editingScheduleId}
                monthKey={editingPayment.month}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;