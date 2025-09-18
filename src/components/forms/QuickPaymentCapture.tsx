import React, { useState, useEffect } from 'react';
import { DollarSign, Building2, DoorClosed, Search, X } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import PaymentCapture from './PaymentCapture';
import { facilityService, roomService, leaseService } from '../../services/firebaseService';

// Temporary inline type definitions
interface Facility {
  id?: string;
  name: string;
  address: string;
}

interface Room {
  id?: string;
  facilityId: string;
  roomNumber: string;
  type: 'single' | 'double' | 'family' | 'studio';
  status: 'available' | 'occupied' | 'maintenance' | 'unavailable';
}

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
    depositPaidDate?: any;
  };
  status: 'active' | 'expired' | 'terminated' | 'pending';
}

interface QuickPaymentCaptureProps {
  onClose: () => void;
  onSuccess?: () => void;
  preSelectedTransaction?: {
    facilityId: string;
    roomId: string;
    renterId: string;
    month: string;
    amount: number;
    type: string;
  };
}

const QuickPaymentCapture: React.FC<QuickPaymentCaptureProps> = ({ onClose, onSuccess, preSelectedTransaction }) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedLease, setSelectedLease] = useState<LeaseAgreement | null>(null);
  const [showPaymentCapture, setShowPaymentCapture] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Pre-fill form when preSelectedTransaction is provided
  useEffect(() => {
    if (preSelectedTransaction && facilities.length > 0 && rooms.length > 0) {
      const facility = facilities.find(f => f.id === preSelectedTransaction.facilityId);
      const room = rooms.find(r => r.id === preSelectedTransaction.roomId);
      
      if (facility && room) {
        setSelectedFacility(facility);
        setSelectedRoom(room);
        
        // Load the lease for this room
        leaseService.getLeaseByRoom(room.id!).then(lease => {
          if (lease) {
            setSelectedLease(lease);
            setShowPaymentCapture(true);
          }
        }).catch(error => {
          console.error('Error fetching lease:', error);
        });
      }
    }
  }, [preSelectedTransaction, facilities, rooms]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [facilitiesData, roomsData] = await Promise.all([
        facilityService.getFacilities(),
        roomService.getAllRooms()
      ]);

      setFacilities(facilitiesData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacilitySelect = (facility: Facility) => {
    setSelectedFacility(facility);
    setSelectedRoom(null);
    setSelectedLease(null);
  };

  const handleRoomSelect = async (room: Room) => {
    setSelectedRoom(room);
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
  };

  const getRoomsForFacility = (facilityId: string) => {
    return rooms.filter(room => room.facilityId === facilityId && room.status === 'occupied');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Quick Payment Capture</h3>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading data...</p>
        </div>
      </div>
    );
  }

  if (showPaymentCapture && selectedLease) {
    return (
      <PaymentCapture
        lease={selectedLease}
        preSelectedPayment={preSelectedTransaction ? {
          month: preSelectedTransaction.month,
          amount: preSelectedTransaction.amount
        } : undefined}
        onSuccess={() => {
          setShowPaymentCapture(false);
          setSelectedLease(null);
          setSelectedRoom(null);
          setSelectedFacility(null);
          onSuccess?.(); // Call the parent's onSuccess to reload payment data
          onClose();
        }}
        onCancel={() => {
          setShowPaymentCapture(false);
          setSelectedLease(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <DollarSign className="w-8 h-8 text-primary-500" />
          <div>
            <h3 className="text-xl font-semibold text-white">Quick Payments</h3>
            <p className="text-gray-400">Select a facility and room to manage payments</p>
          </div>
        </div>
        <Button variant="ghost" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Step 1: Select Facility */}
      {!selectedFacility && (
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">Step 1: Select Facility</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facilities.map((facility) => (
              <div
                key={facility.id}
                className="p-4 border border-gray-600 rounded-lg hover:border-primary-500 cursor-pointer transition-colors"
                onClick={() => handleFacilitySelect(facility)}
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="w-6 h-6 text-primary-500" />
                  <div>
                    <h5 className="text-white font-medium">{facility.name}</h5>
                    <p className="text-gray-400 text-sm">{facility.address}</p>
                    <p className="text-gray-500 text-xs">
                      {getRoomsForFacility(facility.id!).length} occupied rooms
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Step 2: Select Room */}
      {selectedFacility && !selectedRoom && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Step 2: Select Room</h4>
            <Button variant="ghost" onClick={() => setSelectedFacility(null)}>
              Back to Facilities
            </Button>
          </div>
          
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Building2 className="w-5 h-5 text-primary-500" />
              <div>
                <h5 className="text-white font-medium">{selectedFacility.name}</h5>
                <p className="text-gray-400 text-sm">{selectedFacility.address}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getRoomsForFacility(selectedFacility.id!).map((room) => (
              <div
                key={room.id}
                className="p-4 border border-gray-600 rounded-lg hover:border-accent-blue-500 cursor-pointer transition-colors"
                onClick={() => handleRoomSelect(room)}
              >
                <div className="flex items-center space-x-3">
                  <DoorClosed className="w-6 h-6 text-accent-blue-500" />
                  <div>
                    <h5 className="text-white font-medium">Room {room.roomNumber}</h5>
                    <p className="text-gray-400 text-sm capitalize">{room.type}</p>
                    <p className="text-gray-500 text-xs">Status: {room.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {getRoomsForFacility(selectedFacility.id!).length === 0 && (
            <div className="text-center py-8">
              <DoorClosed className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Occupied Rooms</h3>
              <p className="text-gray-400">This facility has no rooms with active leases.</p>
            </div>
          )}
        </Card>
      )}

      {/* Step 3: Processing */}
      {selectedRoom && !showPaymentCapture && (
        <Card className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-white mb-2">Loading Lease Agreement</h3>
          <p className="text-gray-400">Preparing payment capture for Room {selectedRoom.roomNumber}</p>
        </Card>
      )}
    </div>
  );
};

export default QuickPaymentCapture;
