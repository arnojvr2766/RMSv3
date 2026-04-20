import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Building2, DoorClosed, User, Calendar, DollarSign, Search, X, CreditCard, Eye } from 'lucide-react';
import { leaseService, facilityService, renterService, roomService } from '../../services/firebaseService';
import MobileCard from '../../components/mobile/MobileCard';
import BottomSheet from '../../components/mobile/BottomSheet';
import LeaseView from '../../components/forms/LeaseView';
import PaymentCapture from '../../components/forms/PaymentCapture';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Timestamp } from 'firebase/firestore';

interface LeaseAgreement {
  id?: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  terms: {
    startDate: any;
    endDate: any;
    monthlyRent: number;
    depositAmount: number;
    depositPaid: boolean;
  };
  status: 'active' | 'expired' | 'terminated' | 'pending';
}

/**
 * MobileLeases - Mobile-optimized leases page
 * Features:
 * - Card list of leases
 * - Status filters
 * - Quick actions
 * - Bottom sheet for details
 */
const MobileLeases: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [leases, setLeases] = useState<LeaseAgreement[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [renters, setRenters] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedLease, setSelectedLease] = useState<LeaseAgreement | null>(null);
  const [showLeaseView, setShowLeaseView] = useState(false);
  const [showPaymentCapture, setShowPaymentCapture] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const leaseId = searchParams.get('leaseId');
    if (leaseId && leases.length > 0) {
      const lease = leases.find(l => l.id === leaseId);
      if (lease) {
        setSelectedLease(lease);
        setShowLeaseView(true);
      }
    }
  }, [searchParams, leases]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leasesData, facilitiesData, rentersData, roomsData] = await Promise.all([
        leaseService.getAllLeases(),
        facilityService.getFacilities(),
        renterService.getAllRenters(),
        roomService.getAllRooms()
      ]);
      setLeases(leasesData);
      setFacilities(facilitiesData);
      setRenters(rentersData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading leases data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'expired': return 'bg-gray-500/20 text-gray-400';
      case 'terminated': return 'bg-red-500/20 text-red-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getFacilityName = (facilityId: string) => {
    return facilities.find(f => f.id === facilityId)?.name || 'Unknown Facility';
  };

  const getRenterName = (renterId: string) => {
    const renter = renters.find(r => r.id === renterId);
    return renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : 'Unknown Renter';
  };

  const getRoomNumber = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.roomNumber || 'Unknown Room';
  };

  const formatDate = (date: any) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const filteredLeases = leases.filter(lease => {
    const matchesStatus = !filterStatus || filterStatus === 'all' || lease.status === filterStatus;
    const matchesSearch = !searchTerm || 
      getFacilityName(lease.facilityId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getRenterName(lease.renterId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getRoomNumber(lease.roomId).toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const handleLeaseClick = (lease: LeaseAgreement) => {
    setSelectedLease(lease);
    setShowLeaseView(true);
  };

  return (
    <div className="p-4 pt-20 pb-24 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search leases..."
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
          {['all', 'active', 'expired', 'terminated', 'pending'].map((status) => (
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

      {/* Leases List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading leases...</p>
        </div>
      ) : filteredLeases.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No leases found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeases.map((lease) => (
            <MobileCard
              key={lease.id}
              onClick={() => handleLeaseClick(lease)}
              className="cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lease.status)}`}>
                      {lease.status}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-1">
                    {getRenterName(lease.renterId)}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-400">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4" />
                      <span>{getFacilityName(lease.facilityId)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DoorClosed className="w-4 h-4" />
                      <span>Room {getRoomNumber(lease.roomId)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4" />
                      <span>R{lease.terms.monthlyRent.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}/month</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(lease.terms.startDate)} - {formatDate(lease.terms.endDate)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    handleLeaseClick(lease);
                  }}>
                    <Eye className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </MobileCard>
          ))}
        </div>
      )}

      {/* Lease View Modal */}
      {showLeaseView && selectedLease && (
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
          onTerminateLease={() => {
            // Handle lease termination
            setShowLeaseView(false);
            loadData();
          }}
        />
      )}

      {/* Payment Capture Modal */}
      {showPaymentCapture && selectedLease && (
        <PaymentCapture
          lease={selectedLease}
          onSuccess={() => {
            setShowPaymentCapture(false);
            setSelectedLease(null);
            loadData();
          }}
          onCancel={() => {
            setShowPaymentCapture(false);
          }}
        />
      )}
    </div>
  );
};

export default MobileLeases;
