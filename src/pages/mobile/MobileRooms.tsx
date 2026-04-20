import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoorClosed, Plus, Filter, Search, Building2, User, DollarSign, RefreshCw, X } from 'lucide-react';
import { facilityService, roomService, leaseService, paymentScheduleService, renterService } from '../../services/firebaseService';
import MobileCard from '../../components/mobile/MobileCard';
import QuickActions from '../../components/mobile/QuickActions';
import BottomSheet from '../../components/mobile/BottomSheet';
import RoomStatusQuickUpdate from '../../components/forms/RoomStatusQuickUpdate';
import PaymentCapture from '../../components/forms/PaymentCapture';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

interface Room {
  id?: string;
  facilityId: string;
  roomNumber: string;
  type: 'single' | 'double' | 'family' | 'studio';
  status: 'available' | 'occupied' | 'maintenance' | 'unavailable' | 'locked' | 'empty';
  monthlyRent: number;
  depositAmount: number;
}

/**
 * MobileRooms - Mobile-optimized rooms page
 * Features:
 * - Grid layout (2 columns)
 * - Quick status updates
 * - Filter chips
 * - Tap to view details
 */
const MobileRooms: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterFacility, setFilterFacility] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [showPaymentCapture, setShowPaymentCapture] = useState(false);
  const [selectedLease, setSelectedLease] = useState<any>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const [roomsData, facilitiesData] = await Promise.all([
        roomService.getAllRooms(),
        facilityService.getFacilities()
      ]);
      setRooms(roomsData);
      setFacilities(facilitiesData);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!room.roomNumber.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filterStatus !== 'all' && room.status !== filterStatus) {
      return false;
    }
    if (filterFacility !== 'all' && room.facilityId !== filterFacility) {
      return false;
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/20 text-green-400';
      case 'occupied':
        return 'bg-blue-500/20 text-blue-400';
      case 'maintenance':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'locked':
        return 'bg-orange-500/20 text-orange-400';
      case 'empty':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleRoomClick = async (room: Room) => {
    setSelectedRoom(room);
    // Check if room has active lease
    try {
      const leases = await leaseService.getAllLeases();
      const activeLease = leases.find(
        l => l.roomId === room.id && l.status === 'active'
      );
      if (activeLease) {
        setSelectedLease(activeLease);
      }
    } catch (error) {
      console.error('Error loading lease:', error);
    }
  };

  const handleStatusUpdate = (room: Room) => {
    setSelectedRoom(room);
    setShowStatusUpdate(true);
  };

  const getFacilityName = (facilityId: string) => {
    return facilities.find(f => f.id === facilityId)?.name || 'Unknown';
  };

  return (
    <div className="p-4 pt-20 pb-24 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search rooms..."
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
          {['all', 'available', 'occupied', 'locked', 'empty', 'maintenance', 'unavailable'].map((status) => (
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

      {/* Rooms Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading rooms...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-12">
          <DoorClosed className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No rooms found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredRooms.map((room) => (
            <MobileCard
              key={room.id}
              onClick={() => handleRoomClick(room)}
              className="cursor-pointer"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-lg">{room.roomNumber}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                    {room.status}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Building2 className="w-3 h-3" />
                    <span className="truncate">{getFacilityName(room.facilityId)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <DollarSign className="w-3 h-3" />
                    <span>R{room.monthlyRent.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusUpdate(room);
                  }}
                  className="w-full mt-2"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Update Status
                </Button>
              </div>
            </MobileCard>
          ))}
        </div>
      )}

      {/* Room Details Bottom Sheet */}
      {selectedRoom && !showStatusUpdate && !showPaymentCapture && (
        <BottomSheet
          isOpen={true}
          onClose={() => setSelectedRoom(null)}
          title={`Room ${selectedRoom.roomNumber}`}
        >
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <p className={`text-white font-medium ${getStatusColor(selectedRoom.status)}`}>
                  {selectedRoom.status}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Type</p>
                <p className="text-white font-medium capitalize">{selectedRoom.type}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Monthly Rent</p>
                <p className="text-white font-medium">
                  R{selectedRoom.monthlyRent.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Deposit</p>
                <p className="text-white font-medium">
                  R{selectedRoom.depositAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="flex space-x-2 pt-4 border-t border-gray-700">
              <Button
                variant="primary"
                onClick={() => {
                  setShowStatusUpdate(true);
                }}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Status
              </Button>
              {selectedLease && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPaymentCapture(true);
                  }}
                  className="flex-1"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Capture Payment
                </Button>
              )}
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Status Update Modal */}
      {showStatusUpdate && selectedRoom && (
        <RoomStatusQuickUpdate
          room={selectedRoom}
          onSuccess={() => {
            setShowStatusUpdate(false);
            setSelectedRoom(null);
            loadRooms();
          }}
          onCancel={() => {
            setShowStatusUpdate(false);
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
            setSelectedRoom(null);
            loadRooms();
          }}
          onCancel={() => {
            setShowPaymentCapture(false);
          }}
        />
      )}
    </div>
  );
};

export default MobileRooms;
