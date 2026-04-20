import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Phone, Mail, Building2, DoorClosed, Search, X, DollarSign, FileText } from 'lucide-react';
import { renterService, leaseService, facilityService, roomService } from '../../services/firebaseService';
import MobileCard from '../../components/mobile/MobileCard';
import BottomSheet from '../../components/mobile/BottomSheet';
import PaymentCapture from '../../components/forms/PaymentCapture';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Timestamp } from 'firebase/firestore';

interface Renter {
  id?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  status: 'active' | 'inactive' | 'blacklisted';
}

/**
 * MobileRenters - Mobile-optimized renters page
 * Features:
 * - Card list of renters
 * - Search functionality
 * - Bottom sheet for details
 * - Quick actions
 */
const MobileRenters: React.FC = () => {
  const navigate = useNavigate();
  const [renters, setRenters] = useState<Renter[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRenter, setSelectedRenter] = useState<Renter | null>(null);
  const [selectedLease, setSelectedLease] = useState<any>(null);
  const [showPaymentCapture, setShowPaymentCapture] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rentersData, leasesData, facilitiesData, roomsData] = await Promise.all([
        renterService.getAllRenters(),
        leaseService.getAllLeases(),
        facilityService.getFacilities(),
        roomService.getAllRooms()
      ]);
      setRenters(rentersData);
      setLeases(leasesData);
      setFacilities(facilitiesData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading renters data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRenterLease = (renterId: string) => {
    return leases.find(lease => lease.renterId === renterId && lease.status === 'active');
  };

  const getFacilityName = (facilityId: string) => {
    return facilities.find(f => f.id === facilityId)?.name || 'Unknown Facility';
  };

  const getRoomNumber = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.roomNumber || 'Unknown Room';
  };

  const getRenterDisplayStatus = (renter: Renter) => {
    const activeLease = getRenterLease(renter.id!);
    if (renter.status === 'blacklisted') return 'blacklisted';
    if (activeLease) return 'active';
    return 'inactive';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'inactive': return 'bg-gray-500/20 text-gray-400';
      case 'blacklisted': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const filteredRenters = renters.filter(renter => {
    const matchesSearch = !searchTerm || 
      renter.personalInfo.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      renter.personalInfo.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      renter.personalInfo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      renter.personalInfo.phone.includes(searchTerm);
    
    const displayStatus = getRenterDisplayStatus(renter);
    const matchesStatus = !filterStatus || filterStatus === 'all' || displayStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleRenterClick = (renter: Renter) => {
    setSelectedRenter(renter);
    const lease = getRenterLease(renter.id!);
    if (lease) {
      setSelectedLease(lease);
    }
  };

  const handleCapturePayment = () => {
    if (selectedLease) {
      setShowPaymentCapture(true);
    }
  };

  return (
    <div className="p-4 pt-20 pb-24 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search renters..."
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
          {['all', 'active', 'inactive', 'blacklisted'].map((status) => (
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

      {/* Renters List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading renters...</p>
        </div>
      ) : filteredRenters.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No renters found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRenters.map((renter) => {
            const displayStatus = getRenterDisplayStatus(renter);
            const lease = getRenterLease(renter.id!);
            return (
              <MobileCard
                key={renter.id}
                onClick={() => handleRenterClick(renter)}
                className="cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(displayStatus)}`}>
                        {displayStatus}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-1">
                      {renter.personalInfo.firstName} {renter.personalInfo.lastName}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" />
                        <span>{renter.personalInfo.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{renter.personalInfo.email}</span>
                      </div>
                      {lease && (
                        <>
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-4 h-4" />
                            <span>{getFacilityName(lease.facilityId)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <DoorClosed className="w-4 h-4" />
                            <span>Room {getRoomNumber(lease.roomId)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </MobileCard>
            );
          })}
        </div>
      )}

      {/* Renter Details Bottom Sheet */}
      {selectedRenter && !showPaymentCapture && (
        <BottomSheet
          isOpen={true}
          onClose={() => setSelectedRenter(null)}
          title={`${selectedRenter.personalInfo.firstName} ${selectedRenter.personalInfo.lastName}`}
        >
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm">Phone</p>
                <a href={`tel:${selectedRenter.personalInfo.phone}`} className="text-white font-medium flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>{selectedRenter.personalInfo.phone}</span>
                </a>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Email</p>
                <a href={`mailto:${selectedRenter.personalInfo.email}`} className="text-white font-medium flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{selectedRenter.personalInfo.email}</span>
                </a>
              </div>
              {selectedLease && (
                <>
                  <div>
                    <p className="text-gray-400 text-sm">Facility</p>
                    <p className="text-white font-medium">{getFacilityName(selectedLease.facilityId)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Room</p>
                    <p className="text-white font-medium">{getRoomNumber(selectedLease.roomId)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Monthly Rent</p>
                    <p className="text-white font-medium">
                      R{selectedLease.terms.monthlyRent.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </>
              )}
            </div>
            {selectedLease && (
              <div className="flex space-x-2 pt-4 border-t border-gray-700">
                <Button
                  variant="primary"
                  onClick={handleCapturePayment}
                  className="flex-1"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Capture Payment
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigate(`/mobile/leases?leaseId=${selectedLease.id}`);
                  }}
                  className="flex-1"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Lease
                </Button>
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* Payment Capture Modal */}
      {showPaymentCapture && selectedLease && (
        <PaymentCapture
          lease={selectedLease}
          onSuccess={() => {
            setShowPaymentCapture(false);
            setSelectedRenter(null);
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

export default MobileRenters;
