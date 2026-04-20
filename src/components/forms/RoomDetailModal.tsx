import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { leaseService, renterService, paymentScheduleService } from '../../services/firebaseService';
import { Timestamp } from 'firebase/firestore';
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

interface RenterPersonalInfo {
  firstName: string;
  lastName: string;
  idNumber: string;
  dateOfBirth: Timestamp | null;
  phone: string;
  email: string;
  emergencyContact: { name: string; phone: string; relationship: string; };
}

interface Renter {
  id?: string;
  personalInfo: RenterPersonalInfo;
  address: { street: string; city: string; province: string; postalCode: string; };
  employment: { employer: string; position: string; monthlyIncome: number; };
  status: 'active' | 'inactive' | 'blacklisted';
  notes?: string;
}

interface LeaseAgreement {
  id?: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  childrenCount?: number;
  terms: {
    startDate: Timestamp;
    endDate: Timestamp;
    monthlyRent: number;
    depositAmount: number;
    depositPaid: boolean;
  };
  businessRules: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    childSurcharge: number;
    gracePeriodDays: number;
    paymentMethods: string[];
  };
  additionalTerms?: string;
  status: 'active' | 'expired' | 'terminated' | 'pending';
}

interface PaymentEntry {
  month: string;
  dueDate: Timestamp;
  amount: number;
  type: 'rent' | 'deposit' | 'late_fee' | 'deposit_payout' | 'maintenance';
  status: 'pending' | 'paid' | 'overdue' | 'partial' | 'pending_approval';
  paidAmount?: number;
  paidDate?: Timestamp;
  paymentMethod?: string;
}

interface PaymentSchedule {
  id?: string;
  leaseId: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  payments: PaymentEntry[];
  totalAmount: number;
  totalPaid: number;
  outstandingAmount: number;
  aggregatedPenalty?: { totalAmount: number; paidAmount: number; outstandingAmount: number; };
}

// --- Props ---
interface RoomDetailModalProps {
  room: Room;
  facility: Facility | null;
  onClose: () => void;
}

// --- Helpers ---
const formatDate = (ts: any): string => {
  if (!ts) return '—';
  try {
    if (ts instanceof Timestamp) return ts.toDate().toLocaleDateString('en-ZA');
    if (ts?.toDate) return ts.toDate().toLocaleDateString('en-ZA');
    if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleDateString('en-ZA');
    return new Date(ts).toLocaleDateString('en-ZA');
  } catch {
    return '—';
  }
};

const getMonthLabel = (monthStr: string): string => {
  if (!monthStr) return '—';
  const [year, month] = monthStr.split('-');
  if (!year || !month) return monthStr;
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const idx = parseInt(month, 10) - 1;
  return `${months[idx] ?? month} ${year}`;
};

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'paid': return 'bg-green-500/20 text-green-400';
    case 'pending': return 'bg-yellow-500/20 text-yellow-400';
    case 'pending_approval': return 'bg-yellow-500/20 text-yellow-400';
    case 'overdue': return 'bg-red-500/20 text-red-400';
    case 'partial': return 'bg-orange-500/20 text-orange-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

const getRoomStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'available': return 'bg-green-500/20 text-green-400';
    case 'occupied': return 'bg-blue-500/20 text-blue-400';
    case 'maintenance': return 'bg-yellow-500/20 text-yellow-400';
    case 'locked': return 'bg-orange-500/20 text-orange-400';
    case 'empty': return 'bg-purple-500/20 text-purple-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
};

const getRenterStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'active': return 'bg-green-500/20 text-green-400';
    case 'inactive': return 'bg-gray-500/20 text-gray-400';
    case 'blacklisted': return 'bg-red-500/20 text-red-400';
    default: return 'bg-gray-500/20 text-gray-400';
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

// --- Component ---
const RoomDetailModal: React.FC<RoomDetailModalProps> = ({ room, facility, onClose }) => {
  const [lease, setLease] = useState<LeaseAgreement | null>(null);
  const [renter, setRenter] = useState<Renter | null>(null);
  const [schedule, setSchedule] = useState<PaymentSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeLease = await leaseService.getLeaseByRoom(room.id!);
      setLease(activeLease);

      if (activeLease) {
        const [renterData, scheduleData] = await Promise.all([
          renterService.getRenterById(activeLease.renterId),
          paymentScheduleService.getPaymentScheduleByLease(activeLease.id!),
        ]);
        setRenter(renterData);
        setSchedule(scheduleData);
      }
    } catch (err) {
      console.error('Error loading room detail data:', err);
      setError('Failed to load room details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [room.id]);

  // Sort payments: deposit first, then chronological
  const sortedPayments = schedule
    ? [...schedule.payments].sort((a, b) => {
        if (a.type === 'deposit') return -1;
        if (b.type === 'deposit') return 1;
        return a.month.localeCompare(b.month);
      })
    : [];

  // Determine business rules source
  const usesDefaults = room.businessRules?.usesFacilityDefaults ?? true;
  const businessRules = room.businessRules ?? facility?.defaultBusinessRules;

  // Effective rules for display
  const effectiveRules = usesDefaults
    ? facility?.defaultBusinessRules
    : room.businessRules;

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
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Room {room.roomNumber}</h1>
              {facility && (
                <p className="text-gray-400 text-sm mt-0.5">{facility.name}</p>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoomStatusBadgeClass(room.status)}`}>
              {room.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
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

            {/* Section 1: Room Info */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Room Information</h2>
              <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Type</p>
                    <p className="text-white capitalize">{room.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Capacity</p>
                    <p className="text-white">{room.capacity} {room.capacity === 1 ? 'person' : 'people'}</p>
                  </div>
                  {room.floorLevel !== undefined && room.floorLevel !== null && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Floor Level</p>
                      <p className="text-white">{room.floorLevel}</p>
                    </div>
                  )}
                  {room.squareMeters !== undefined && room.squareMeters !== null && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Size</p>
                      <p className="text-white">{room.squareMeters} m²</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Monthly Rent</p>
                    <p className="text-white font-medium">{formatCurrency(room.monthlyRent)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Deposit Amount</p>
                    <p className="text-white font-medium">{formatCurrency(room.depositAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Added</p>
                    <p className="text-white">{formatDate(room.createdAt)}</p>
                  </div>
                </div>

                {room.amenities && room.amenities.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs mb-2">Amenities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {room.amenities.map((a, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {room.description && (
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Description</p>
                    <p className="text-gray-300 text-sm">{room.description}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Section 2: Current Tenant */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Current Tenant</h2>

              {room.status === 'locked' ? (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 flex items-start space-x-3">
                  <span className="text-orange-400 text-lg mt-0.5">🔒</span>
                  <p className="text-orange-300 text-sm">Room is locked — awaiting deposit payout</p>
                </div>
              ) : !lease || !renter ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start space-x-3">
                  <span className="text-green-400 text-lg mt-0.5">✓</span>
                  <p className="text-green-300 text-sm">Room is currently vacant</p>
                </div>
              ) : (
                <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
                  {/* Renter Identity */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white text-lg font-semibold">
                        {renter.personalInfo.firstName} {renter.personalInfo.lastName}
                      </p>
                      <p className="text-gray-400 text-sm">ID: {renter.personalInfo.idNumber}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRenterStatusBadgeClass(renter.status)}`}>
                      {renter.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Phone</p>
                      <p className="text-white">{renter.personalInfo.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Email</p>
                      <p className="text-white">{renter.personalInfo.email}</p>
                    </div>
                  </div>

                  {/* Employment */}
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Employment</p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">Employer</p>
                        <p className="text-white">{renter.employment.employer || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">Position</p>
                        <p className="text-white">{renter.employment.position || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">Monthly Income</p>
                        <p className="text-white">{formatCurrency(renter.employment.monthlyIncome)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Emergency Contact</p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">Name</p>
                        <p className="text-white">{renter.personalInfo.emergencyContact?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">Phone</p>
                        <p className="text-white">{renter.personalInfo.emergencyContact?.phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">Relationship</p>
                        <p className="text-white">{renter.personalInfo.emergencyContact?.relationship || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Lease Details */}
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Lease</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">Start Date</p>
                        <p className="text-white">{formatDate(lease.terms.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">End Date</p>
                        <p className="text-white">{formatDate(lease.terms.endDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">Children</p>
                        <p className="text-white">{lease.childrenCount ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">Deposit</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          lease.terms.depositPaid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {lease.terms.depositPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Section 3: Payment Overview */}
            {schedule && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                    <p className="text-blue-400 text-xs mb-1">Total</p>
                    <p className="text-white font-bold">{formatCurrency(schedule.totalAmount)}</p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                    <p className="text-green-400 text-xs mb-1">Paid</p>
                    <p className="text-white font-bold">{formatCurrency(schedule.totalPaid)}</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                    <p className="text-red-400 text-xs mb-1">Outstanding</p>
                    <p className="text-white font-bold">{formatCurrency(schedule.outstandingAmount)}</p>
                  </div>
                  {schedule.aggregatedPenalty && schedule.aggregatedPenalty.outstandingAmount > 0 && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
                      <p className="text-orange-400 text-xs mb-1">Penalties</p>
                      <p className="text-white font-bold">{formatCurrency(schedule.aggregatedPenalty.outstandingAmount)}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Section 4: Payment History */}
            {schedule && sortedPayments.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment History</h2>
                <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-800">
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Month / Type</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Due Date</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Amount</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Status</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Paid Date</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium text-xs">Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {sortedPayments.map((payment, idx) => (
                          <tr key={idx} className="hover:bg-gray-800/50">
                            <td className="py-2 px-3 text-white">
                              {payment.type === 'deposit'
                                ? 'Deposit'
                                : payment.type === 'late_fee'
                                ? `Penalty - ${getMonthLabel(payment.month)}`
                                : payment.type === 'deposit_payout'
                                ? 'Deposit Payout'
                                : payment.type === 'maintenance'
                                ? 'Maintenance'
                                : getMonthLabel(payment.month)}
                            </td>
                            <td className="py-2 px-3 text-gray-300">{formatDate(payment.dueDate)}</td>
                            <td className="py-2 px-3 text-white">{formatCurrency(payment.amount)}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(payment.status)}`}>
                                {payment.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-300">{payment.paidDate ? formatDate(payment.paidDate) : '—'}</td>
                            <td className="py-2 px-3 text-gray-300">{payment.paymentMethod || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* Section 5: Business Rules */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Business Rules</h2>
              <div className="bg-gray-900/50 rounded-lg p-4">
                {effectiveRules ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        usesDefaults ? 'bg-blue-500/20 text-blue-400' : 'bg-primary-500/20 text-primary-400'
                      }`}>
                        {usesDefaults ? 'Using facility defaults' : 'Room-specific rules'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">Late Fee</p>
                        <p className="text-white">{formatCurrency(effectiveRules.lateFeeAmount)}/day</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">Late Fee Start</p>
                        <p className="text-white">{getOrdinal(effectiveRules.lateFeeStartDay)} of month</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">Grace Period</p>
                        <p className="text-white">{effectiveRules.gracePeriodDays} days</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs mb-0.5">Child Surcharge</p>
                        <p className="text-white">{formatCurrency(effectiveRules.childSurcharge)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-400 text-xs mb-0.5">Payment Methods</p>
                        <p className="text-white">
                          {effectiveRules.paymentMethods?.join(', ') || '—'}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">No business rules configured</p>
                )}
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
};

export default RoomDetailModal;
