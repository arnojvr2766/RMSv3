import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DoorClosed, Plus, Edit, Trash2, Building2, ArrowLeft, UserPlus, FileText, Eye, DollarSign, Grid3X3, List, Filter, ChevronDown, ChevronUp, AlertTriangle, Clock, CheckCircle, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { useSettings } from '../contexts/SettingsContext';
import { facilityService, roomService, leaseService, paymentScheduleService, renterService } from '../services/firebaseService';
import { facilityStatsService } from '../services/facilityStatsService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import RoomForm from '../components/forms/RoomForm';
import RenterSearchForm from '../components/forms/RenterSearchForm';
import LeaseForm from '../components/forms/LeaseForm';
import LeaseView from '../components/forms/LeaseView';
import PaymentCapture from '../components/forms/PaymentCapture';
import PenaltyBreakdown from '../components/forms/PenaltyBreakdown';
import PenaltyPaymentCapture from '../components/forms/PenaltyPaymentCapture';

// Temporary inline type definitions to isolate issues
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
  billingEntity?: string;
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
  squareFootage?: number;
  createdAt: any;
  updatedAt: any;
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
  type: 'rent' | 'deposit' | 'late_fee' | 'maintenance' | 'deposit_payout';
  status: 'pending' | 'paid' | 'partial' | 'overdue';
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
  calculationHistory?: {
    date: any;
    amount: number;
    reason: string;
    paymentMonth: string;
  }[];
}

const Rooms: React.FC = () => {
  console.log('Rooms component is loading...');
  const { currentRole, isSystemAdmin } = useRole();
  const { allowStandardUserRooms } = useSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [showAllFacilities, setShowAllFacilities] = useState(false);
  const [isFilterMode, setIsFilterMode] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [facilityStats, setFacilityStats] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showRenterForm, setShowRenterForm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedRenter, setSelectedRenter] = useState<any>(null);
  const [showLeaseForm, setShowLeaseForm] = useState(false);
  const [renterFormStep, setRenterFormStep] = useState<'search' | 'lease'>('search');
  const [showLeaseView, setShowLeaseView] = useState(false);
  const [selectedLease, setSelectedLease] = useState<any>(null);
  const [showPaymentCapture, setShowPaymentCapture] = useState(false);
  
  const [showPenaltyBreakdown, setShowPenaltyBreakdown] = useState(false);
  const [selectedPenaltyTransaction, setSelectedPenaltyTransaction] = useState<PaymentTransaction | null>(null);
  const [showPenaltyPaymentCapture, setShowPenaltyPaymentCapture] = useState(false);
  const [selectedPenaltyForPayment, setSelectedPenaltyForPayment] = useState<PaymentTransaction | null>(null);
  const [penaltyScheduleId, setPenaltyScheduleId] = useState<string>('');
  
  // Payment view state
  const [viewMode, setViewMode] = useState<'rooms' | 'payments'>('rooms');
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [selectedRoomsForPayments, setSelectedRoomsForPayments] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [paymentFilters, setPaymentFilters] = useState({
    status: [] as string[],
    type: [] as string[],
    room: [] as string[],
    renter: [] as string[],
  });
  
  // Room table filters and sorting
  const [roomFilters, setRoomFilters] = useState({
    status: [] as string[],
    paymentStatus: [] as string[],
    hasPenalties: false,
    hasOverdue: false,
    goodStanding: false,
  });
  const [roomSortConfig, setRoomSortConfig] = useState<{key: string; direction: 'asc' | 'desc'} | null>(null);

  // Check if user can manage rooms
  const canManageRooms = isSystemAdmin || (currentRole === 'standard_user' && allowStandardUserRooms);

  useEffect(() => {
    loadFacilities();
  }, []);

  useEffect(() => {
    const facilityId = searchParams.get('facility');
    const view = searchParams.get('view');
    console.log('Rooms page - facilityId from URL:', facilityId);
    console.log('Rooms page - view from URL:', view);
    console.log('Rooms page - facilities loaded:', facilities.length);
    
    if (facilityId && facilities.length > 0) {
      const facility = facilities.find(f => f.id === facilityId);
      console.log('Rooms page - found facility:', facility);
      if (facility) {
        setSelectedFacility(facility);
        
        // Check if this is cross-navigation (from Facilities page) or individual facility management
        if (view === 'rooms' || !view) {
          // Cross-navigation: stay in filter mode but apply facility filter
          setIsFilterMode(true);
          setShowAllFacilities(false); // This will filter to show only this facility's rooms
        } else {
          // Individual facility management: load rooms and switch to individual view
        loadRooms(facilityId);
          setIsFilterMode(false);
        }
      } else {
        console.log('Rooms page - facility not found with ID:', facilityId);
        console.log('Available facilities:', facilities.map(f => ({ id: f.id, name: f.name })));
        // If facility not found, go back to filter mode
        setIsFilterMode(true);
      }
    } else if (facilityId && facilities.length === 0) {
      console.log('Rooms page - facility ID provided but facilities not loaded yet');
    } else {
      // No facility in URL, stay in filter mode
      setIsFilterMode(true);
    }
  }, [searchParams, facilities]);

  const loadFacilities = async () => {
    try {
      console.log('Loading facilities...');
      const facilitiesData = await facilityService.getFacilities();
      console.log('Facilities loaded:', facilitiesData);
      setFacilities(facilitiesData);
      
      // Load all rooms for all facilities
      const allRoomsData: Room[] = [];
      const statsData: Record<string, any> = {};
      
      for (const facility of facilitiesData) {
        if (facility.id) {
          try {
            const facilityRooms = await roomService.getRooms(facility.id);
            allRoomsData.push(...facilityRooms);
            
            // Get facility stats
            const stats = await facilityStatsService.getFacilityStats(facility.id);
            statsData[facility.id] = stats;
          } catch (error) {
            console.error(`Error loading rooms for facility ${facility.id}:`, error);
          }
        }
      }
      
      setAllRooms(allRoomsData);
      setFacilityStats(statsData);
    } catch (error) {
      console.error('Error loading facilities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRooms = async (facilityId: string) => {
    try {
      console.log('Loading rooms for facility:', facilityId);
      setIsLoading(true);
      const roomsData = await roomService.getRooms(facilityId);
      console.log('Rooms loaded:', roomsData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPaymentTransactions = async (facilityId: string, roomIds?: string[]) => {
    try {
      setIsLoadingPayments(true);
      const transactions: PaymentTransaction[] = [];
      
      // Get all leases for the facility
      const leases = await leaseService.getLeasesByFacility(facilityId);
      
      for (const lease of leases) {
        // Filter by rooms if specified
        if (roomIds && roomIds.length > 0 && !roomIds.includes(lease.roomId)) continue;
        
        // Get payment schedule for this lease
        const schedule = await paymentScheduleService.getPaymentScheduleByLease(lease.id!);
        
        if (schedule) {
          // Get facility and room details
          const facility = facilities.find(f => f.id === facilityId);
          const room = rooms.find(r => r.id === lease.roomId);
          
          // Get renter details
          const renter = await renterService.getRenterById(lease.renterId);
          
          // Process each payment in the schedule
          schedule.payments.forEach(payment => {
            console.log('Payment data for', payment.month, ':', payment); // Added debug log
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
              penaltyStatus = 'pending';
            }

            transactions.push({
              id: `${schedule.id}_penalty`,
              leaseId: lease.id!,
              facilityId: lease.facilityId,
              roomId: lease.roomId,
              renterId: lease.renterId,
              month: 'Penalties',
              dueDate: schedule.aggregatedPenalty.lastCalculated,
              amount: schedule.aggregatedPenalty.outstandingAmount,
              type: 'late_fee',
              status: penaltyStatus,
              paidAmount: schedule.aggregatedPenalty.paidAmount,
              paidDate: undefined,
              paymentMethod: undefined,
              lateFee: 0,
              notes: `Aggregated penalties - ${schedule.aggregatedPenalty.calculationHistory.length} calculations`,
              paymentProof: undefined,
              facilityName: facility?.name || 'Unknown Facility',
              roomNumber: room?.roomNumber || 'Unknown Room',
              renterName: renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : 'Unknown Renter',
              calculationHistory: schedule.aggregatedPenalty.calculationHistory || []
            });
          }
        }
      }
      
      setPaymentTransactions(transactions);
    } catch (error) {
      console.error('Error loading payment transactions:', error);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const handleFacilitySelect = (facility: Facility) => {
    setSelectedFacility(facility);
    loadRooms(facility.id!);
    navigate(`/rooms?facility=${facility.id}`);
  };

  const handleBackToFacilities = () => {
    setSelectedFacility(null);
    setRooms([]);
    navigate('/rooms');
  };

  const handleRoomFormSuccess = () => {
    setShowRoomForm(false);
    setEditingRoom(null);
    if (selectedFacility?.id) {
      loadRooms(selectedFacility.id);
    }
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setShowRoomForm(true);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      try {
        await roomService.deleteRoom(roomId);
        if (selectedFacility?.id) {
          loadRooms(selectedFacility.id);
        }
      } catch (error) {
        console.error('Error deleting room:', error);
        alert('Failed to delete room. Please try again.');
      }
    }
  };

  const handleAddRenter = (room: Room) => {
    setSelectedRoom(room);
    setSelectedRenter(null);
    setRenterFormStep('search');
    setShowRenterForm(true);
  };

  const handleRenterSelected = (renter: any) => {
    console.log('handleRenterSelected called with:', renter);
    setSelectedRenter(renter);
    setRenterFormStep('lease');
  };

  const handleLeaseSuccess = () => {
    setShowRenterForm(false);
    setSelectedRoom(null);
    setSelectedRenter(null);
    setRenterFormStep('search');
    // Reload rooms to update status
    if (selectedFacility?.id) {
      loadRooms(selectedFacility.id);
    }
  };

  const handleBackToRenterSearch = () => {
    setSelectedRenter(null);
    setRenterFormStep('search');
  };

  const handleViewLease = async (room: Room) => {
    try {
      const lease = await leaseService.getLeaseByRoom(room.id!);
      if (lease) {
        setSelectedLease(lease);
        setShowLeaseView(true);
      } else {
        alert('No active lease found for this room.');
      }
    } catch (error) {
      console.error('Error fetching lease:', error);
      alert('Failed to load lease agreement. Please try again.');
    }
  };

  const handleCapturePayment = async (room: Room) => {
    console.log('handleCapturePayment called for room:', room);
    try {
      const lease = await leaseService.getLeaseByRoom(room.id!);
      console.log('Found lease:', lease);
      if (lease) {
        console.log('Setting selectedLease and showPaymentCapture to true');
        setSelectedLease(lease);
        setShowPaymentCapture(true);
        console.log('Payment capture modal should be opening');
        
        // Debug: Check state after setting
        setTimeout(() => {
          console.log('Current showPaymentCapture state:', showPaymentCapture);
          console.log('Current selectedLease state:', selectedLease);
        }, 100);
      } else {
        alert('No active lease found for this room.');
      }
    } catch (error) {
      console.error('Error fetching lease:', error);
      alert('Failed to load lease agreement. Please try again.');
    }
  };

  const handleCapturePaymentFromTransaction = async (transaction: PaymentTransaction) => {
    console.log('handleCapturePaymentFromTransaction called with:', transaction);
    try {
      // Get the lease for this transaction
      const lease = await leaseService.getLeaseById(transaction.leaseId);
      console.log('Found lease:', lease);
      if (lease) {
        console.log('Setting selectedLease and showPaymentCapture to true');
        setSelectedLease(lease);
        setShowPaymentCapture(true);
        console.log('Payment capture modal should be opening');
        
        // Debug: Check state after setting
        setTimeout(() => {
          console.log('Current showPaymentCapture state:', showPaymentCapture);
          console.log('Current selectedLease state:', selectedLease);
        }, 100);
      } else {
        alert('No lease found for this transaction.');
      }
    } catch (error) {
      console.error('Error fetching lease for transaction:', error);
      alert('Failed to load lease agreement. Please try again.');
    }
  };

  const handleCapturePenaltyPayment = async (transaction: PaymentTransaction) => {
    console.log('handleCapturePenaltyPayment called with:', transaction);
    try {
      // Get the payment schedule for this transaction to find the schedule ID
      const schedule = await paymentScheduleService.getPaymentScheduleByLease(transaction.leaseId);
      console.log('Found schedule:', schedule);
      if (schedule) {
        setSelectedPenaltyForPayment(transaction);
        setPenaltyScheduleId(schedule.id!);
        setShowPenaltyPaymentCapture(true);
        console.log('Penalty payment capture modal should be opening');
      } else {
        alert('No payment schedule found for this penalty transaction.');
      }
    } catch (error) {
      console.error('Error fetching payment schedule:', error);
      alert('Failed to load payment schedule. Please try again.');
    }
  };

  const handleViewPenaltyBreakdown = (transaction: PaymentTransaction) => {
    setSelectedPenaltyTransaction(transaction);
    setShowPenaltyBreakdown(true);
  };

  const handleRoomToggle = (roomId: string) => {
    setSelectedRoomsForPayments(prev => {
      const newSelection = prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId];
      
      // Reload payments with new room selection
      loadPaymentTransactions(selectedFacility!.id!, newSelection.length > 0 ? newSelection : undefined);
      
      return newSelection;
    });
  };

  const handleViewAllPayments = () => {
    setSelectedRoomsForPayments([]);
    loadPaymentTransactions(selectedFacility!.id!);
  };

  const handleFilterChange = (filterType: string, value: string, checked: boolean) => {
    setPaymentFilters(prev => ({
      ...prev,
      [filterType]: checked 
        ? [...prev[filterType as keyof typeof prev], value]
        : (prev[filterType as keyof typeof prev] as string[]).filter(item => item !== value)
    }));
  };

  const filteredTransactions = (paymentTransactions || []).filter(transaction => {
    if (!transaction || !paymentFilters) return false;
    
    if (paymentFilters.status && paymentFilters.status.length > 0 && !paymentFilters.status.includes(transaction.status)) {
      return false;
    }
    if (paymentFilters.type && paymentFilters.type.length > 0 && !paymentFilters.type.includes(transaction.type)) {
      return false;
    }
    if (paymentFilters.room && paymentFilters.room.length > 0 && transaction.roomId && !paymentFilters.room.includes(transaction.roomId)) {
      return false;
    }
    if (paymentFilters.renter && paymentFilters.renter.length > 0 && transaction.renterId && !paymentFilters.renter.includes(transaction.renterId)) {
      return false;
    }
    return true;
  });

  // Room filtering and sorting logic
  const getRoomPaymentStatus = async (room: Room) => {
    try {
      const lease = await leaseService.getLeaseByRoom(room.id!);
      if (!lease) return 'no_lease';
      
      const schedule = await paymentScheduleService.getPaymentScheduleByLease(lease.id!);
      if (!schedule) return 'no_schedule';
      
      const hasOverdue = schedule.payments.some(p => p.status === 'overdue');
      const hasPending = schedule.payments.some(p => p.status === 'pending');
      const hasPenalties = schedule.aggregatedPenalty && schedule.aggregatedPenalty.outstandingAmount > 0;
      
      if (hasOverdue) return 'overdue';
      if (hasPenalties) return 'penalties';
      if (hasPending) return 'pending';
      return 'good_standing';
    } catch (error) {
      return 'unknown';
    }
  };

  // Get room payment status with lease info
  const getRoomPaymentStatusWithLease = async (room: Room) => {
    try {
      const lease = await leaseService.getLeaseByRoom(room.id!);
      if (!lease) return { status: 'no_lease', lease: null };
      
      const schedule = await paymentScheduleService.getPaymentScheduleByLease(lease.id!);
      if (!schedule) return { status: 'no_schedule', lease };
      
      const hasOverdue = schedule.payments.some(p => p.status === 'overdue');
      const hasPending = schedule.payments.some(p => p.status === 'pending');
      const hasPenalties = schedule.aggregatedPenalty && schedule.aggregatedPenalty.outstandingAmount > 0;
      
      let status = 'good_standing';
      if (hasOverdue) status = 'overdue';
      else if (hasPenalties) status = 'penalties';
      else if (hasPending) status = 'pending';
      
      return { status, lease, schedule };
    } catch (error) {
      return { status: 'unknown', lease: null };
    }
  };

  const filteredRooms = allRooms.filter(room => {
    // Filter by selected facility
    // If showAllFacilities is true, show all rooms
    // If selectedFacility exists, only show rooms from that facility
    if (!showAllFacilities && selectedFacility && room.facilityId !== selectedFacility.id) {
      return false;
    }
    
    // Filter by room status
    if (roomFilters.status.length > 0 && !roomFilters.status.includes(room.status)) {
      return false;
    }
    
    return true;
  });

  // Get active filter summary
  const getActiveFiltersSummary = () => {
    const activeFilters = [];
    
    if (!showAllFacilities && selectedFacility) {
      activeFilters.push(`Facility: ${selectedFacility.name}`);
    }
    
    if (roomFilters.status.length > 0) {
      activeFilters.push(`Status: ${roomFilters.status.join(', ')}`);
    }
    
    if (roomFilters.hasOverdue) {
      activeFilters.push('Payment Status: Overdue');
    }
    
    if (roomFilters.hasPenalties) {
      activeFilters.push('Payment Status: Has Penalties');
    }
    
    if (roomFilters.goodStanding) {
      activeFilters.push('Payment Status: Good Standing');
    }
    
    return activeFilters;
  };

  // Debug logging
  console.log('Filter state:', { showAllFacilities, selectedFacility: selectedFacility?.name, filteredRoomsCount: filteredRooms.length, allRoomsCount: allRooms.length });

  const handleRoomSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (roomSortConfig && roomSortConfig.key === key && roomSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setRoomSortConfig({ key, direction });
  };

  const getSortedRooms = () => {
    if (!roomSortConfig) return filteredRooms;

    return [...filteredRooms].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (roomSortConfig.key) {
        case 'roomNumber':
          aValue = a.roomNumber;
          bValue = b.roomNumber;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'monthlyRent':
          aValue = a.monthlyRent;
          bValue = b.monthlyRent;
          break;
        case 'facility':
          const facilityA = facilities.find(f => f.id === a.facilityId);
          const facilityB = facilities.find(f => f.id === b.facilityId);
          aValue = facilityA?.name || '';
          bValue = facilityB?.name || '';
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return roomSortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) {
        return roomSortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return roomSortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Component for room row with payment status
  const RoomPaymentStatusRow: React.FC<{
    room: Room;
    facility: Facility | undefined;
    onViewRoom: () => void;
    onCapturePayment: () => void;
  }> = ({ room, facility, onViewRoom, onCapturePayment }) => {
    const [paymentStatus, setPaymentStatus] = useState<{
      status: string;
      lease: any;
      schedule?: any;
    } | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);

    useEffect(() => {
      const loadPaymentStatus = async () => {
        if (room.status === 'occupied') {
          setIsLoadingStatus(true);
          const result = await getRoomPaymentStatusWithLease(room);
          setPaymentStatus(result);
          setIsLoadingStatus(false);
        } else {
          setIsLoadingStatus(false);
        }
      };

      loadPaymentStatus();
    }, [room.id, room.status]);

    const getPaymentStatusDisplay = () => {
      if (room.status !== 'occupied') {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-600 text-white">
            N/A
          </span>
        );
      }

      if (isLoadingStatus) {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-600 text-white">
            Loading...
          </span>
        );
      }

      if (!paymentStatus) {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-600 text-white">
            Unknown
          </span>
        );
      }

      const statusConfig = {
        overdue: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Overdue' },
        penalties: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Has Penalties' },
        pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending' },
        good_standing: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Good Standing' },
        no_lease: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'No Lease' },
        no_schedule: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'No Schedule' },
        unknown: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Unknown' }
      };

      const config = statusConfig[paymentStatus.status as keyof typeof statusConfig] || statusConfig.unknown;

      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      );
    };

    return (
      <tr className="border-b border-gray-800 hover:bg-gray-800/50">
        <td className="py-3 px-4 text-white">{facility?.name || 'Unknown'}</td>
        <td className="py-3 px-4 text-white font-medium">Room {room.roomNumber}</td>
        <td className="py-3 px-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            room.status === 'available' 
              ? 'bg-green-500/20 text-green-400' 
              : room.status === 'occupied'
              ? 'bg-blue-500/20 text-blue-400'
              : room.status === 'maintenance'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {room.status}
          </span>
        </td>
        <td className="py-3 px-4 text-white capitalize">{room.type}</td>
        <td className="py-3 px-4 text-white">R{room.monthlyRent.toLocaleString()}</td>
        <td className="py-3 px-4">
          {getPaymentStatusDisplay()}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewRoom}
            >
              <Eye className="w-4 h-4" />
            </Button>
            {room.status === 'occupied' && paymentStatus?.lease && (
              <Button
                variant="primary"
                size="sm"
                onClick={onCapturePayment}
              >
                <DollarSign className="w-4 h-4" />
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // Access control check
  if (!canManageRooms) {
    return (
      <div className="min-h-screen bg-secondary-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <DoorClosed className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Access Restricted</h2>
            <p className="text-gray-400 mb-6">
              You don't have permission to manage rooms. Contact your system administrator for access.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show comprehensive rooms table if we're in filter mode
  if (isFilterMode) {
    return (
      <div className="min-h-screen bg-secondary-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Room Management</h1>
              <p className="text-gray-400">Select a facility to filter rooms or view all rooms</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant={showAllFacilities ? 'primary' : 'ghost'}
                onClick={() => {
                  setShowAllFacilities(true);
                  setSelectedFacility(null);
                }}
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                All Rooms
              </Button>
            </div>
          </div>

          {/* Facility Filter Cards */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Filter by Facility</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card 
                className={`hover:bg-gray-700 transition-all duration-200 ${
                  showAllFacilities ? 'ring-2 ring-primary-500 bg-gray-700' : ''
                }`}
              >
                <button 
                  className="w-full text-left cursor-pointer"
                  onClick={() => {
                    console.log('All Facilities clicked');
                    setShowAllFacilities(true);
                    setSelectedFacility(null);
                    setIsFilterMode(true);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">All Facilities</h3>
                      <p className="text-gray-400 text-sm">{allRooms.length} total rooms</p>
                    </div>
                  </div>
                </button>
              </Card>
              
              {facilities.map((facility) => (
                <Card 
                  key={facility.id} 
                  className={`hover:bg-gray-700 transition-all duration-200 ${
                    selectedFacility?.id === facility.id ? 'ring-2 ring-primary-500 bg-gray-700' : ''
                  }`}
                >
                  <button 
                    className="w-full text-left cursor-pointer"
                    onClick={() => {
                      console.log('Facility clicked:', facility.name);
                      setShowAllFacilities(false);
                      setSelectedFacility(facility);
                      setIsFilterMode(true);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: facility.primaryColor }}
                      >
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{facility.name}</h3>
                        <p className="text-gray-400 text-sm">
                          {facilityStats[facility.id!]?.totalRooms || 0} rooms
                        </p>
                      </div>
                    </div>
                  </button>
                </Card>
              ))}
            </div>
          </div>

          {/* Rooms Table */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                Rooms {showAllFacilities ? '(All Facilities)' : selectedFacility ? `- ${selectedFacility.name}` : '(All Facilities)'}
              </h2>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
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
                      setShowAllFacilities(true);
                      setRoomFilters({
                        status: [],
                        paymentStatus: [],
                        hasPenalties: false,
                        hasOverdue: false,
                        goodStanding: false,
                      });
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

            {/* Room Filters */}
            {showFilters && (
              <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Room Status</label>
                    <div className="flex flex-wrap gap-2">
                      {['available', 'occupied', 'maintenance', 'unavailable'].map(status => (
                        <button
                          key={status}
                          onClick={() => {
                            setRoomFilters(prev => ({
                              ...prev,
                              status: prev.status.includes(status) 
                                ? prev.status.filter(s => s !== status)
                                : [...prev.status, status]
                            }));
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                            roomFilters.status.includes(status)
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Payment Status</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setRoomFilters(prev => ({ ...prev, hasOverdue: !prev.hasOverdue }))}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                          roomFilters.hasOverdue
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Overdue
                      </button>
                      <button
                        onClick={() => setRoomFilters(prev => ({ ...prev, hasPenalties: !prev.hasPenalties }))}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                          roomFilters.hasPenalties
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Has Penalties
                      </button>
                      <button
                        onClick={() => setRoomFilters(prev => ({ ...prev, goodStanding: !prev.goodStanding }))}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                          roomFilters.goodStanding
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        Good Standing
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rooms Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th 
                      className="text-left py-3 px-4 text-gray-300 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleRoomSort('facility')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Facility</span>
                        {roomSortConfig?.key === 'facility' && (
                          roomSortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-gray-300 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleRoomSort('roomNumber')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Room</span>
                        {roomSortConfig?.key === 'roomNumber' && (
                          roomSortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-gray-300 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleRoomSort('status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Status</span>
                        {roomSortConfig?.key === 'status' && (
                          roomSortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-gray-300 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleRoomSort('type')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Type</span>
                        {roomSortConfig?.key === 'type' && (
                          roomSortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-gray-300 cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleRoomSort('monthlyRent')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Rent</span>
                        {roomSortConfig?.key === 'monthlyRent' && (
                          roomSortConfig.direction === 'asc' ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-gray-300">Payment Status</th>
                    <th className="text-left py-3 px-4 text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedRooms().map((room) => {
                    const facility = facilities.find(f => f.id === room.facilityId);
                    
                    // Get payment status for this room
                    const getPaymentStatusDisplay = () => {
                      if (room.status !== 'occupied') {
                        return (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-600 text-white">
                            N/A
                          </span>
                        );
                      }
                      
                      // For occupied rooms, we'll show a loading state initially
                      // In a real implementation, you'd want to load this data asynchronously
                      return (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                          Loading...
                        </span>
                      );
                    };
                    
                    return (
                      <RoomPaymentStatusRow 
                        key={room.id} 
                        room={room} 
                        facility={facility}
                        onViewRoom={() => {
                          setSelectedFacility(facility!);
                          navigate(`/rooms?facility=${facility?.id}`);
                        }}
                        onCapturePayment={async () => {
                          try {
                            const lease = await leaseService.getLeaseByRoom(room.id!);
                            if (lease) {
                              setSelectedLease(lease);
                              setShowPaymentCapture(true);
                            } else {
                              alert('No active lease found for this room.');
                            }
                          } catch (error) {
                            console.error('Error fetching lease:', error);
                            alert('Failed to load lease agreement. Please try again.');
                          }
                        }}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Payment Capture Modal - WITHOUT React Portal */}
        {showPaymentCapture && selectedLease && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{zIndex: 9999}} data-testid="payment-capture-modal">
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Payment Capture</h2>
                <button
                  onClick={() => {
                    console.log('Closing payment capture modal');
                    setShowPaymentCapture(false);
                    setSelectedLease(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <PaymentCapture
                lease={selectedLease}
                onSuccess={() => {
                  console.log('Payment capture success');
                  setShowPaymentCapture(false);
                  setSelectedLease(null);
                  // Reload rooms to update any status changes
                  if (selectedFacility?.id) {
                    loadRooms(selectedFacility.id);
                    // Reload payment transactions to show updated status
                    loadPaymentTransactions(selectedFacility.id, selectedRoomsForPayments.length > 0 ? selectedRoomsForPayments : undefined);
                  }
                }}
                onCancel={() => {
                  console.log('Payment capture cancelled');
                  setShowPaymentCapture(false);
                  setSelectedLease(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Penalty Breakdown Modal */}
        {showPenaltyBreakdown && selectedPenaltyTransaction && (
          <PenaltyBreakdown
            penalty={{
              totalAmount: selectedPenaltyTransaction.amount + (selectedPenaltyTransaction.paidAmount || 0),
              paidAmount: selectedPenaltyTransaction.paidAmount || 0,
              outstandingAmount: selectedPenaltyTransaction.amount,
              transactions: [selectedPenaltyTransaction]
            }}
            onClose={() => {
              setShowPenaltyBreakdown(false);
              setSelectedPenaltyTransaction(null);
            }}
            onCapturePayment={() => {
              setShowPenaltyBreakdown(false);
              handleCapturePenaltyPayment(selectedPenaltyTransaction);
            }}
          />
        )}

        {/* Penalty Payment Capture Modal */}
        {showPenaltyPaymentCapture && selectedPenaltyForPayment && (
          <PenaltyPaymentCapture
            penaltyTransaction={{
              id: selectedPenaltyForPayment.id,
              leaseId: selectedPenaltyForPayment.leaseId,
              amount: selectedPenaltyForPayment.amount,
              paidAmount: selectedPenaltyForPayment.paidAmount || 0,
              outstandingAmount: selectedPenaltyForPayment.amount - (selectedPenaltyForPayment.paidAmount || 0),
              status: selectedPenaltyForPayment.status,
              type: selectedPenaltyForPayment.type,
              month: selectedPenaltyForPayment.month,
              dueDate: selectedPenaltyForPayment.dueDate,
              createdAt: selectedPenaltyForPayment.createdAt,
              updatedAt: selectedPenaltyForPayment.updatedAt
            }}
            scheduleId={penaltyScheduleId}
            onSuccess={() => {
              setShowPenaltyPaymentCapture(false);
              setSelectedPenaltyForPayment(null);
              setPenaltyScheduleId('');
              // Reload payment transactions to show updated status
              if (selectedFacility?.id) {
                loadPaymentTransactions(selectedFacility.id, selectedRoomsForPayments.length > 0 ? selectedRoomsForPayments : undefined);
              }
            }}
            onCancel={() => {
              setShowPenaltyPaymentCapture(false);
              setSelectedPenaltyForPayment(null);
              setPenaltyScheduleId('');
            }}
          />
        )}

      </div>
    );
  }

  // Show individual facility room management (not filter mode)
  if (!isFilterMode && selectedFacility) {
    return (
      <div className="min-h-screen bg-secondary-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => {
                setIsFilterMode(true);
                setSelectedFacility(null);
                navigate('/rooms');
              }}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to All Rooms
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {selectedFacility.name} - Room Management
                </h1>
                <p className="text-gray-400">{selectedFacility.address}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex bg-gray-700 rounded-lg p-1">
                <Button
                  variant={viewMode === 'rooms' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('rooms')}
                  className="px-3"
                >
                  <Grid3X3 className="w-4 h-4 mr-1" />
                  Rooms
                </Button>
                <Button
                  variant={viewMode === 'payments' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setViewMode('payments');
                    loadPaymentTransactions(selectedFacility.id!);
                  }}
                  className="px-3"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Payments
                </Button>
              </div>
              
              {viewMode === 'rooms' && (
                <Button onClick={() => setShowRoomForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Room
                </Button>
              )}
            </div>
          </div>

          {viewMode === 'rooms' ? (
            <>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
              ) : rooms.length === 0 ? (
            <Card className="text-center py-12">
                  <DoorClosed className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-white mb-2">No Rooms Found</h2>
                  <p className="text-gray-400 mb-6">
                    Get started by adding the first room to {selectedFacility.name}
                  </p>
                  <Button onClick={() => setShowRoomForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                    Add Your First Room
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rooms.map((room) => (
                    <Card key={room.id} className="hover:bg-gray-700 transition-colors">
                  <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-lg bg-accent-blue-500 flex items-center justify-center">
                              <DoorClosed className="w-6 h-6 text-white" />
                      </div>
                      <div>
                              <h3 className="text-lg font-semibold text-white">Room {room.roomNumber}</h3>
                              <p className="text-gray-400 text-sm capitalize">{room.type} - {room.capacity} guests</p>
                      </div>
                    </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            room.status === 'available' 
                              ? 'bg-green-500/20 text-green-400' 
                              : room.status === 'occupied'
                              ? 'bg-blue-500/20 text-blue-400'
                              : room.status === 'maintenance'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {room.status}
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Monthly Rent:</span>
                            <span className="text-white">R{room.monthlyRent}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Deposit:</span>
                            <span className="text-white">R{room.depositAmount}</span>
                          </div>
                          {room.description && (
                            <p className="text-gray-400 text-sm">{room.description}</p>
                          )}
                        </div>

                        <div className="border-t border-gray-700 pt-4">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-400">Late Fee:</span>
                              <span className="text-white ml-1">R{room.businessRules.lateFeeAmount}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Child Fee:</span>
                              <span className="text-white ml-1">R{room.businessRules.childSurcharge}</span>
                            </div>
                          </div>
                          {room.businessRules.usesFacilityDefaults && (
                            <p className="text-xs text-gray-500 mt-2">Using facility defaults</p>
                          )}
                        </div>

                        <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-700">
                          {room.status === 'available' && (
                    <Button 
                      variant="primary" 
                              size="sm"
                              onClick={() => handleAddRenter(room)}
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Add Renter
                            </Button>
                          )}
                          {room.status === 'occupied' && (
                            <>
                              <Button 
                                variant="accent" 
                                size="sm"
                                onClick={() => handleViewLease(room)}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                View Lease
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleCapturePayment(room)}
                              >
                                <DollarSign className="w-4 h-4 mr-1" />
                                Payments
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleEditRoom(room)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-400 hover:text-red-300"
                            onClick={() => room.id && handleDeleteRoom(room.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
              ))}
                </div>
              )}
            </>
          ) : (
            /* Payment View for Individual Facility */
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-400 text-sm font-medium">Overdue</p>
                      <p className="text-white text-2xl font-bold">
                        {filteredTransactions.filter(t => t.status === 'overdue').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                  </div>
                </Card>
                
                <Card className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-400 text-sm font-medium">Pending</p>
                      <p className="text-white text-2xl font-bold">
                        {filteredTransactions.filter(t => t.status === 'pending').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-400" />
                    </div>
                  </div>
                </Card>
                
                <Card className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-400 text-sm font-medium">Penalties</p>
                      <p className="text-white text-2xl font-bold">
                        {filteredTransactions.filter(t => t.type === 'late_fee' && t.status !== 'paid').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-orange-400" />
                    </div>
                  </div>
                </Card>
                
                <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-400 text-sm font-medium">Paid</p>
                      <p className="text-white text-2xl font-bold">
                        {filteredTransactions.filter(t => t.status === 'paid').length}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </Card>
              </div>
              {/* Room Selection */}
              {rooms.length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Room Selection</h3>
                    <Button
                      variant={selectedRoomsForPayments.length === 0 ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={handleViewAllPayments}
                    >
                      View All Payments
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Select Rooms:</label>
                    <div className="flex flex-wrap gap-2">
                      {rooms.map((room) => (
                        <button
                          key={room.id}
                          onClick={() => handleRoomToggle(room.id!)}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                            selectedRoomsForPayments.includes(room.id!)
                              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                          }`}
                        >
                          Room {room.roomNumber}
                        </button>
                      ))}
                    </div>
                    {selectedRoomsForPayments.length > 0 && (
                      <div className="mt-2 text-sm text-gray-400">
                        {selectedRoomsForPayments.length} room(s) selected
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Payment Filters */}
              <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Payment Filters</h3>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
                
                {showFilters && (
                  <div className="space-y-4 pt-4 border-t border-gray-700">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Payment Status</label>
                      <div className="flex flex-wrap gap-2">
                        {['pending', 'paid', 'partial', 'overdue'].map(status => (
                          <button
                            key={status}
                            onClick={() => handleFilterChange('status', status, !paymentFilters.status.includes(status))}
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                              paymentFilters.status.includes(status)
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                            }`}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Payment Type</label>
                      <div className="flex flex-wrap gap-2">
                        {['rent', 'deposit', 'late_fee', 'maintenance', 'deposit_payout'].map(type => (
                          <button
                            key={type}
                            onClick={() => handleFilterChange('type', type, !paymentFilters.type.includes(type))}
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                              paymentFilters.type.includes(type)
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                            }`}
                          >
                            {type.replace('_', ' ').split(' ').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Filter Buttons */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Quick Filters</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                      onClick={() => {
                            setPaymentFilters({
                              status: ['overdue'],
                              type: ['rent', 'deposit', 'late_fee', 'maintenance', 'deposit_payout']
                            });
                          }}
                          className="px-3 py-2 rounded-full text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all duration-200 hover:scale-105"
                        >
                          Overdue Only
                        </button>
                        <button
                          onClick={() => {
                            setPaymentFilters({
                              status: ['pending'],
                              type: ['rent', 'deposit', 'late_fee', 'maintenance', 'deposit_payout']
                            });
                          }}
                          className="px-3 py-2 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all duration-200 hover:scale-105"
                        >
                          Pending Only
                        </button>
                        <button
                          onClick={() => {
                            setPaymentFilters({
                              status: ['pending', 'partial', 'overdue'],
                              type: ['late_fee']
                            });
                          }}
                          className="px-3 py-2 rounded-full text-sm font-medium bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-all duration-200 hover:scale-105"
                        >
                          Penalties Only
                        </button>
                        <button
                          onClick={() => {
                            setPaymentFilters({
                              status: ['paid'],
                              type: ['rent', 'deposit', 'late_fee', 'maintenance', 'deposit_payout']
                            });
                          }}
                          className="px-3 py-2 rounded-full text-sm font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all duration-200 hover:scale-105"
                        >
                          Paid Only
                        </button>
                        <button
                          onClick={() => {
                            setPaymentFilters({
                              status: ['pending', 'paid', 'partial', 'overdue'],
                              type: ['rent', 'deposit', 'late_fee', 'maintenance', 'deposit_payout']
                            });
                          }}
                          className="px-3 py-2 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-all duration-200 hover:scale-105"
                        >
                          Clear Filters
                        </button>
                  </div>
                    </div>
                  </div>
                )}
                </Card>

              {/* Payment Transactions Table */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Payment Transactions
                    {selectedRoomsForPayments.length > 0 && (
                      <span className="text-gray-400 ml-2">
                        - {selectedRoomsForPayments.length} room(s) selected
                      </span>
                    )}
                  </h3>
                  <div className="text-sm text-gray-400">
                    {filteredTransactions.length} transactions
                  </div>
                </div>

                {isLoadingPayments ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Payment Transactions</h3>
                    <p className="text-gray-400">
                      {selectedRoomsForPayments.length > 0 
                        ? `No payments found for selected room(s)`
                        : 'No payments found for this facility'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-gray-300">Month</th>
                          <th className="text-left py-3 px-4 text-gray-300">Room</th>
                          <th className="text-left py-3 px-4 text-gray-300">Renter</th>
                          <th className="text-left py-3 px-4 text-gray-300">Type</th>
                          <th className="text-left py-3 px-4 text-gray-300">Amount</th>
                          <th className="text-left py-3 px-4 text-gray-300">Status</th>
                          <th className="text-left py-3 px-4 text-gray-300">Paid Date</th>
                          <th className="text-left py-3 px-4 text-gray-300">Method</th>
                          <th className="text-left py-3 px-4 text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((transaction) => (
                          <tr key={transaction.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                            <td className="py-3 px-4 text-white">{transaction.month}</td>
                            <td className="py-3 px-4 text-white">{transaction.roomNumber}</td>
                            <td className="py-3 px-4 text-white">{transaction.renterName}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-600 text-white capitalize">
                                {transaction.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-white">R{transaction.amount}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                transaction.status === 'paid' 
                                  ? 'bg-green-500/20 text-green-400'
                                  : transaction.status === 'pending'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : transaction.status === 'partial'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {transaction.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-white">
                              {transaction.paidDate ? new Date(transaction.paidDate.toDate()).toLocaleDateString() : '-'}
                            </td>
                            <td className="py-3 px-4 text-white capitalize">
                              {transaction.paymentMethod || '-'}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex space-x-1">
                                {/* Penalty Breakdown Button for Penalty Transactions */}
                                {transaction.type === 'late_fee' && transaction.month === 'Penalties' && (
                                  <button
                                    onClick={() => handleViewPenaltyBreakdown(transaction)}
                                    className="w-8 h-8 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white flex items-center justify-center transition-colors duration-200 hover:scale-105"
                                    title="View Penalty Breakdown"
                                  >
                                    <AlertTriangle className="w-4 h-4" />
                                  </button>
                                )}
                                
                                {/* Payment Capture Button for Penalty Transactions */}
                                {transaction.type === 'late_fee' && transaction.month === 'Penalties' && (transaction.status === 'pending' || transaction.status === 'partial') && (
                                  <button
                                    onClick={() => {
                                      console.log('Penalty payment button clicked for transaction:', transaction);
                                      handleCapturePenaltyPayment(transaction);
                                    }}
                                    className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors duration-200 hover:scale-105"
                                    title={transaction.status === 'partial' ? 'Capture Remaining Penalty Payment' : 'Capture Penalty Payment'}
                                  >
                                    <DollarSign className="w-4 h-4" />
                                  </button>
                                )}
                                
                                {/* Regular Payment Actions */}
                                {transaction.status === 'pending' && transaction.type !== 'late_fee' && (
                                  <button
                                    onClick={() => {
                                      console.log('Regular payment button clicked for transaction:', transaction);
                                      handleCapturePaymentFromTransaction(transaction);
                                    }}
                                    className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors duration-200 hover:scale-105"
                                    title="Capture Payment"
                                  >
                                    <DollarSign className="w-4 h-4" />
                                  </button>
                                )}
                                
                                {/* Status indicators for penalty transactions */}
                                {transaction.type === 'late_fee' && transaction.month === 'Penalties' && transaction.status === 'paid' && (
                                  <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-medium">
                                    ✓
                                  </div>
                                )}
                                {transaction.type === 'late_fee' && transaction.month === 'Penalties' && transaction.status === 'partial' && (
                                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium">
                                    ~
                                  </div>
                                )}
                                
                                {/* Status indicators for regular transactions */}
                                {transaction.status === 'paid' && transaction.type !== 'late_fee' && (
                                  <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-medium">
                                    ✓
                                  </div>
                                )}
                                {transaction.status === 'partial' && transaction.type !== 'late_fee' && (
                                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium">
                                    ~
                                  </div>
                                )}
                                {transaction.status === 'overdue' && transaction.type !== 'late_fee' && (
                                  <button
                                    onClick={() => {
                                      alert('Button clicked!');
                                      console.log('Overdue payment button clicked for transaction:', transaction);
                                      handleCapturePaymentFromTransaction(transaction);
                                    }}
                                    className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors duration-200 hover:scale-105"
                                    title="Capture Overdue Payment"
                                  >
                                    <DollarSign className="w-4 h-4" />
                                  </button>
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
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show room management for selected facility
  return (
    <div className="min-h-screen bg-secondary-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={handleBackToFacilities}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Facilities
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {selectedFacility.name} - {viewMode === 'rooms' ? 'Rooms' : 'Payments'}
              </h1>
              <p className="text-gray-400">{selectedFacility.address}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              <Button
                variant={viewMode === 'rooms' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('rooms')}
                className="px-3"
              >
                <Grid3X3 className="w-4 h-4 mr-1" />
                Rooms
              </Button>
              <Button
                variant={viewMode === 'payments' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setViewMode('payments');
                  loadPaymentTransactions(selectedFacility.id!);
                }}
                className="px-3"
              >
                <DollarSign className="w-4 h-4 mr-1" />
                Payments
              </Button>
            </div>
            
            {viewMode === 'rooms' && (
              <Button onClick={() => setShowRoomForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </Button>
            )}
          </div>
        </div>

        {viewMode === 'rooms' ? (
          <>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : rooms.length === 0 ? (
              <Card className="text-center py-12">
                <DoorClosed className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">No Rooms Found</h2>
                <p className="text-gray-400 mb-6">
                  Get started by adding the first room to {selectedFacility.name}
                </p>
                <Button onClick={() => setShowRoomForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Room
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map((room) => (
                  <Card key={room.id} className="hover:bg-gray-700 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-lg bg-accent-blue-500 flex items-center justify-center">
                            <DoorClosed className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">Room {room.roomNumber}</h3>
                            <p className="text-gray-400 text-sm capitalize">{room.type} - {room.capacity} guests</p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          room.status === 'available' 
                            ? 'bg-green-500/20 text-green-400' 
                            : room.status === 'occupied'
                            ? 'bg-blue-500/20 text-blue-400'
                            : room.status === 'maintenance'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {room.status}
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Monthly Rent:</span>
                          <span className="text-white">R{room.monthlyRent}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Deposit:</span>
                          <span className="text-white">R{room.depositAmount}</span>
                        </div>
                        {room.description && (
                          <p className="text-gray-400 text-sm">{room.description}</p>
                        )}
                      </div>

                      <div className="border-t border-gray-700 pt-4">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">Late Fee:</span>
                            <span className="text-white ml-1">R{room.businessRules.lateFeeAmount}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Child Fee:</span>
                            <span className="text-white ml-1">R{room.businessRules.childSurcharge}</span>
                          </div>
                        </div>
                        {room.businessRules.usesFacilityDefaults && (
                          <p className="text-xs text-gray-500 mt-2">Using facility defaults</p>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-700">
                        {room.status === 'available' && (
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => handleAddRenter(room)}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Add Renter
                          </Button>
                        )}
                        {room.status === 'occupied' && (
                          <>
                            <Button 
                              variant="accent" 
                              size="sm"
                              onClick={() => handleViewLease(room)}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              View Lease
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleCapturePayment(room)}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Payments
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleEditRoom(room)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-400 hover:text-red-300"
                          onClick={() => room.id && handleDeleteRoom(room.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Payment View */
          <div className="space-y-6">
            {/* Room Selection */}
            {rooms.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Room Selection</h3>
                  <Button
                    variant={selectedRoomsForPayments.length === 0 ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={handleViewAllPayments}
                  >
                    View All Payments
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select Rooms:</label>
                  <div className="flex flex-wrap gap-2">
                    {rooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => handleRoomToggle(room.id!)}
                        className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                          selectedRoomsForPayments.includes(room.id!)
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                        }`}
                      >
                        Room {room.roomNumber}
                      </button>
                    ))}
                  </div>
                  {selectedRoomsForPayments.length > 0 && (
                    <div className="mt-2 text-sm text-gray-400">
                      {selectedRoomsForPayments.length} room(s) selected
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Filters */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
              
              {showFilters && (
                <div className="space-y-4 pt-4 border-t border-gray-700">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {['pending', 'paid', 'partial', 'overdue'].map(status => (
                        <button
                          key={status}
                          onClick={() => handleFilterChange('status', status, !paymentFilters.status.includes(status))}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                            paymentFilters.status.includes(status)
                              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Payment Type</label>
                    <div className="flex flex-wrap gap-2">
                      {['rent', 'deposit', 'late_fee', 'maintenance', 'deposit_payout'].map(type => (
                        <button
                          key={type}
                          onClick={() => handleFilterChange('type', type, !paymentFilters.type.includes(type))}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 ${
                            paymentFilters.type.includes(type)
                              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                          }`}
                        >
                          {type.replace('_', ' ').split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Payment Transactions Table */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Payment Transactions
                  {selectedRoomsForPayments.length > 0 && (
                    <span className="text-gray-400 ml-2">
                      - {selectedRoomsForPayments.length} room(s) selected
                    </span>
                  )}
                </h3>
                <div className="text-sm text-gray-400">
                  {filteredTransactions.length} transactions
                </div>
              </div>

              {isLoadingPayments ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Payment Transactions</h3>
                  <p className="text-gray-400">
                    {selectedRoomsForPayments.length > 0 
                      ? `No payments found for selected room(s)`
                      : 'No payments found for this facility'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-300">Month</th>
                        <th className="text-left py-3 px-4 text-gray-300">Room</th>
                        <th className="text-left py-3 px-4 text-gray-300">Renter</th>
                        <th className="text-left py-3 px-4 text-gray-300">Type</th>
                        <th className="text-left py-3 px-4 text-gray-300">Amount</th>
                        <th className="text-left py-3 px-4 text-gray-300">Status</th>
                        <th className="text-left py-3 px-4 text-gray-300">Paid Date</th>
                        <th className="text-left py-3 px-4 text-gray-300">Method</th>
                        <th className="text-left py-3 px-4 text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="py-3 px-4 text-white">{transaction.month}</td>
                          <td className="py-3 px-4 text-white">{transaction.roomNumber}</td>
                          <td className="py-3 px-4 text-white">{transaction.renterName}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-600 text-white capitalize">
                              {transaction.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white">R{transaction.amount}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              transaction.status === 'paid' 
                                ? 'bg-green-500/20 text-green-400'
                                : transaction.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : transaction.status === 'partial'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {transaction.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white">
                            {transaction.paidDate ? new Date(transaction.paidDate.toDate()).toLocaleDateString() : '-'}
                          </td>
                          <td className="py-3 px-4 text-white capitalize">
                            {transaction.paymentMethod || '-'}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex space-x-1">
                              {/* Penalty Breakdown Button for Penalty Transactions */}
                              {transaction.type === 'late_fee' && transaction.month === 'Penalties' && (
                                <button
                                  onClick={() => handleViewPenaltyBreakdown(transaction)}
                                  className="w-8 h-8 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white flex items-center justify-center transition-colors duration-200 hover:scale-105"
                                  title="View Penalty Breakdown"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                              )}
                              
                              {/* Payment Capture Button for Penalty Transactions */}
                              {transaction.type === 'late_fee' && transaction.month === 'Penalties' && (transaction.status === 'pending' || transaction.status === 'partial') && (
                                <button
                                  onClick={() => handleCapturePenaltyPayment(transaction)}
                                  className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors duration-200 hover:scale-105"
                                  title={transaction.status === 'partial' ? 'Capture Remaining Penalty Payment' : 'Capture Penalty Payment'}
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              )}
                              
                              {/* Regular Payment Actions */}
                              {transaction.status === 'pending' && transaction.type !== 'late_fee' && (
                                <button
                                  onClick={() => handleCapturePaymentFromTransaction(transaction)}
                                  className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors duration-200 hover:scale-105"
                                  title="Capture Payment"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              )}
                              {/* Status indicators for penalty transactions */}
                              {transaction.type === 'late_fee' && transaction.month === 'Penalties' && transaction.status === 'paid' && (
                                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-medium">
                                  ✓
                                </div>
                              )}
                              {transaction.type === 'late_fee' && transaction.month === 'Penalties' && transaction.status === 'partial' && (
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium">
                                  ~
                                </div>
                              )}
                              
                              {/* Status indicators for regular transactions */}
                              {transaction.status === 'paid' && transaction.type !== 'late_fee' && (
                                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-medium">
                                  ✓
                                </div>
                              )}
                              {transaction.status === 'partial' && transaction.type !== 'late_fee' && (
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium">
                                  ~
                                </div>
                              )}
                              {transaction.status === 'overdue' && transaction.type !== 'late_fee' && (
                                <button
                                  onClick={() => handleCapturePaymentFromTransaction(transaction)}
                                  className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors duration-200 hover:scale-105"
                                  title="Capture Overdue Payment"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
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
          </div>
        )}

        {/* Room Form */}
        {showRoomForm && selectedFacility && (
          <RoomForm
            facility={selectedFacility}
            room={editingRoom || undefined}
            isEdit={!!editingRoom}
            onSuccess={handleRoomFormSuccess}
            onCancel={() => {
              setShowRoomForm(false);
              setEditingRoom(null);
            }}
          />
        )}

        {/* Add Renter Workflow */}
        {showRenterForm && selectedRoom && selectedFacility && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
              {renterFormStep === 'search' ? (
                <RenterSearchForm
                  onRenterSelected={handleRenterSelected}
                  onCancel={() => {
                    setShowRenterForm(false);
                    setSelectedRoom(null);
                  }}
                />
              ) : renterFormStep === 'lease' && selectedRenter ? (
                <LeaseForm
                  facility={selectedFacility}
                  room={selectedRoom}
                  renter={selectedRenter}
                  onSuccess={handleLeaseSuccess}
                  onCancel={() => {
                    setShowRenterForm(false);
                    setSelectedRoom(null);
                    setSelectedRenter(null);
                    setRenterFormStep('search');
                  }}
                  onBack={handleBackToRenterSearch}
                />
              ) : null}
            </div>
          </div>
        )}

        {/* Lease View Modal */}
        {showLeaseView && selectedLease && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
              <LeaseView
                lease={selectedLease}
                onClose={() => {
                  setShowLeaseView(false);
                  setSelectedLease(null);
                }}
                onCapturePayment={() => {
                  setShowLeaseView(false);
                  setShowPaymentCapture(true);
                }}
              />
            </div>
          </div>
        )}

        {/* Payment Capture Modal - WITHOUT React Portal */}
        {showPaymentCapture && selectedLease && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{zIndex: 9999}} data-testid="payment-capture-modal">
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Payment Capture</h2>
                <button
                  onClick={() => {
                    console.log('Closing payment capture modal');
                    setShowPaymentCapture(false);
                    setSelectedLease(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <PaymentCapture
                lease={selectedLease}
                onSuccess={() => {
                  console.log('Payment capture success');
                  setShowPaymentCapture(false);
                  setSelectedLease(null);
                  // Reload rooms to update any status changes
                  if (selectedFacility?.id) {
                    loadRooms(selectedFacility.id);
                    // Reload payment transactions to show updated status
                    loadPaymentTransactions(selectedFacility.id, selectedRoomsForPayments.length > 0 ? selectedRoomsForPayments : undefined);
                  }
                }}
                onCancel={() => {
                  console.log('Payment capture cancelled');
                  setShowPaymentCapture(false);
                  setSelectedLease(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Penalty Breakdown Modal */}
        {showPenaltyBreakdown && selectedPenaltyTransaction && (
          <PenaltyBreakdown
            penalty={{
              totalAmount: selectedPenaltyTransaction.amount + (selectedPenaltyTransaction.paidAmount || 0),
              paidAmount: selectedPenaltyTransaction.paidAmount || 0,
              outstandingAmount: selectedPenaltyTransaction.amount,
              lastCalculated: selectedPenaltyTransaction.dueDate,
              calculationHistory: selectedPenaltyTransaction.calculationHistory || []
            }}
            leaseId={selectedPenaltyTransaction.leaseId}
            facilityName={selectedPenaltyTransaction.facilityName || 'Unknown Facility'}
            roomNumber={selectedPenaltyTransaction.roomNumber || 'Unknown Room'}
            renterName={selectedPenaltyTransaction.renterName || 'Unknown Renter'}
            onClose={() => {
              setShowPenaltyBreakdown(false);
              setSelectedPenaltyTransaction(null);
            }}
          />
        )}

        {/* Penalty Payment Capture Modal */}
        {showPenaltyPaymentCapture && selectedPenaltyForPayment && (
          <PenaltyPaymentCapture
            penaltyTransaction={{
              id: selectedPenaltyForPayment.id,
              leaseId: selectedPenaltyForPayment.leaseId,
              facilityId: selectedPenaltyForPayment.facilityId,
              roomId: selectedPenaltyForPayment.roomId,
              renterId: selectedPenaltyForPayment.renterId,
              amount: selectedPenaltyForPayment.amount,
              paidAmount: selectedPenaltyForPayment.paidAmount || 0,
              outstandingAmount: selectedPenaltyForPayment.amount,
              facilityName: selectedPenaltyForPayment.facilityName || 'Unknown Facility',
              roomNumber: selectedPenaltyForPayment.roomNumber || 'Unknown Room',
              renterName: selectedPenaltyForPayment.renterName || 'Unknown Renter'
            }}
            scheduleId={penaltyScheduleId}
            onSuccess={() => {
              setShowPenaltyPaymentCapture(false);
              setSelectedPenaltyForPayment(null);
              setPenaltyScheduleId('');
              // Reload payment transactions to show updated penalty amounts
              if (selectedFacility?.id) {
                loadPaymentTransactions(selectedFacility.id, selectedRoomsForPayments.length > 0 ? selectedRoomsForPayments : undefined);
              }
            }}
            onCancel={() => {
              setShowPenaltyPaymentCapture(false);
              setSelectedPenaltyForPayment(null);
              setPenaltyScheduleId('');
            }}
          />
        )}

      </div>
    </div>
  );
};

export default Rooms;