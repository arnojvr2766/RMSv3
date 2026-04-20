import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { roomService } from '../../services/firebaseService';
import Button from '../ui/Button';

// --- Types ---
interface Facility {
  id?: string;
  name: string;
  address: string;
  billingEntity: string;
  contactInfo: { phone: string; email: string; };
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
  status: 'available' | 'occupied' | 'maintenance' | 'unavailable' | 'locked' | 'empty';
  description?: string;
  floorLevel?: number;
  squareMeters?: number;
  businessRules?: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    childSurcharge: number;
    gracePeriodDays: number;
    paymentMethods: string[];
    usesFacilityDefaults: boolean;
  };
  createdAt: any;
  updatedAt: any;
}

interface FacilityStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  roomsWithPenalties: number;
  penaltyRate: number;
}

interface FacilityDetailModalProps {
  facility: Facility;
  stats?: FacilityStats;
  onClose: () => void;
}

// --- Helpers ---
const formatDate = (ts: any): string => {
  if (!ts) return '—';
  try {
    if (ts?.toDate) return ts.toDate().toLocaleDateString('en-ZA');
    if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleDateString('en-ZA');
    return new Date(ts).toLocaleDateString('en-ZA');
  } catch {
    return '—';
  }
};

const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || amount === null) return 'R0';
  return `R${amount.toLocaleString('en-ZA')}`;
};

const getOrdinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const getRoomStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'available': return 'bg-green-500/20 text-green-400';
    case 'occupied': return 'bg-blue-500/20 text-blue-400';
    case 'maintenance': return 'bg-yellow-500/20 text-yellow-400';
    case 'locked': return 'bg-orange-500/20 text-orange-400';
    case 'empty': return 'bg-purple-500/20 text-purple-400';
    case 'unavailable': return 'bg-gray-500/20 text-gray-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

// --- Component ---
const FacilityDetailModal: React.FC<FacilityDetailModalProps> = ({ facility, stats, onClose }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const roomsData = await roomService.getRoomsByFacility(facility.id!);
      // Sort by room number
      const sorted = [...roomsData].sort((a, b) =>
        a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
      );
      setRooms(sorted);
    } catch (err) {
      console.error('Error loading facility detail data:', err);
      setError('Failed to load facility details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [facility.id]);

  // Compute stats from rooms if not provided
  const computedStats: FacilityStats = stats ?? {
    totalRooms: rooms.length,
    occupiedRooms: rooms.filter(r => r.status === 'occupied').length,
    availableRooms: rooms.filter(r => r.status === 'available').length,
    maintenanceRooms: rooms.filter(r => r.status === 'maintenance').length,
    roomsWithPenalties: 0,
    penaltyRate: 0,
  };

  const lockedRooms = rooms.filter(r => r.status === 'locked').length;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="max-w-4xl mx-auto my-6 bg-gray-800 rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-start space-x-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: facility.primaryColor }}
            >
              <span className="text-white font-bold text-lg">
                {facility.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{facility.name}</h1>
              <p className="text-gray-400 text-sm mt-0.5">{facility.address}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
              facility.status === 'active'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {facility.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={loadData} variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="p-6 space-y-6">

            {/* Section 1: Contact & Identity */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact & Identity</h2>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Phone</p>
                    <p className="text-white">{facility.contactInfo.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Email</p>
                    <p className="text-white">{facility.contactInfo.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Billing Entity</p>
                    <p className="text-white">{facility.billingEntity || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Primary Color</p>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-5 h-5 rounded border border-gray-600"
                        style={{ backgroundColor: facility.primaryColor }}
                      />
                      <span className="text-white font-mono text-sm">{facility.primaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Occupancy Stats */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Occupancy Overview</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs mb-1">Total Rooms</p>
                  <p className="text-white text-xl font-bold">{computedStats.totalRooms}</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                  <p className="text-green-400 text-xs mb-1">Occupied</p>
                  <p className="text-white text-xl font-bold">{computedStats.occupiedRooms}</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                  <p className="text-blue-400 text-xs mb-1">Available</p>
                  <p className="text-white text-xl font-bold">{computedStats.availableRooms}</p>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                  <p className="text-yellow-400 text-xs mb-1">Maintenance</p>
                  <p className="text-white text-xl font-bold">{computedStats.maintenanceRooms}</p>
                </div>
                <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs mb-1">Locked</p>
                  <p className="text-white text-xl font-bold">{lockedRooms}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                  <p className="text-red-400 text-xs mb-1">With Penalties</p>
                  <p className="text-white text-xl font-bold">{computedStats.roomsWithPenalties}</p>
                </div>
              </div>
            </section>

            {/* Section 3: Business Rules */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Default Business Rules</h2>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Late Fee</p>
                    <p className="text-white">{formatCurrency(facility.defaultBusinessRules?.lateFeeAmount)}/day</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Late Fee Start</p>
                    <p className="text-white">{getOrdinal(facility.defaultBusinessRules?.lateFeeStartDay ?? 1)} of month</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Grace Period</p>
                    <p className="text-white">{facility.defaultBusinessRules?.gracePeriodDays ?? 0} days</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Child Surcharge</p>
                    <p className="text-white">{formatCurrency(facility.defaultBusinessRules?.childSurcharge)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-400 text-xs mb-1">Payment Methods</p>
                    <div className="flex flex-wrap gap-1.5">
                      {facility.defaultBusinessRules?.paymentMethods?.length > 0 ? (
                        facility.defaultBusinessRules.paymentMethods.map((m, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
                            {m}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Rooms List */}
            {rooms.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Rooms</h2>
                <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-800">
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Room</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Type</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Status</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Rent</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Deposit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {rooms.map((room) => (
                          <tr key={room.id} className="hover:bg-gray-800/50">
                            <td className="py-2 px-3 text-white font-medium">Room {room.roomNumber}</td>
                            <td className="py-2 px-3 text-gray-300 capitalize">{room.type}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoomStatusBadgeClass(room.status)}`}>
                                {room.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-white">{formatCurrency(room.monthlyRent)}</td>
                            <td className="py-2 px-3 text-white">{formatCurrency(room.depositAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* Section 5: Dates */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Dates</h2>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Created</p>
                    <p className="text-white">{formatDate(facility.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-0.5">Last Updated</p>
                    <p className="text-white">{formatDate(facility.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
};

export default FacilityDetailModal;
