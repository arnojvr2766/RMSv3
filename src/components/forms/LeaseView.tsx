import React, { useState, useEffect } from 'react';
import { FileText, Calendar, DollarSign, User, Building2, DoorClosed, X, Eye, CreditCard } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { renterService, facilityService, roomService, paymentScheduleService } from '../../services/firebaseService';
import { Timestamp } from 'firebase/firestore';

// Temporary inline type definitions
interface LeaseAgreement {
  id?: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  childrenCount?: number; // Number of children in the lease
  terms: {
    startDate: any;
    endDate: any;
    monthlyRent: number;
    depositAmount: number;
    depositPaid: boolean;
    depositPaidDate?: any;
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
  createdAt: any;
  updatedAt: any;
}

interface Renter {
  id?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    idNumber: string;
    phone: string;
    email: string;
  };
  status: 'active' | 'inactive' | 'blacklisted';
}

interface Facility {
  id?: string;
  name: string;
  address: string;
  billingEntity: string;
}

interface Room {
  id?: string;
  roomNumber: string;
  type: 'single' | 'double' | 'family' | 'studio';
  capacity: number;
  monthlyRent: number;
  depositAmount: number;
}

interface PaymentSchedule {
  id?: string;
  payments: {
    month: string;
    dueDate: any;
    amount: number;
    type: 'rent' | 'deposit' | 'late_fee';
    status: 'pending' | 'paid' | 'overdue' | 'partial';
    paidAmount?: number;
    paidDate?: any;
    lateFee?: number;
  }[];
  totalAmount: number;
  totalPaid: number;
  outstandingAmount: number;
}

interface LeaseViewProps {
  lease: LeaseAgreement;
  onClose: () => void;
  onCapturePayment?: () => void;
}

const LeaseView: React.FC<LeaseViewProps> = ({ lease, onClose, onCapturePayment }) => {
  const [renter, setRenter] = useState<Renter | null>(null);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLeaseDetails = async () => {
      try {
        setIsLoading(true);
        
        // Load all related data in parallel
        const [renterData, facilityData, roomData, scheduleData] = await Promise.all([
          renterService.getAllRenters().then(renters => renters.find(r => r.id === lease.renterId)),
          facilityService.getFacilities().then(facilities => facilities.find(f => f.id === lease.facilityId)),
          roomService.getAllRooms().then(rooms => rooms.find(r => r.id === lease.roomId)),
          paymentScheduleService.getPaymentScheduleByLease(lease.id!)
        ]);

        setRenter(renterData || null);
        setFacility(facilityData || null);
        setRoom(roomData || null);
        setPaymentSchedule(scheduleData);
      } catch (error) {
        console.error('Error loading lease details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaseDetails();
  }, [lease]);

  const formatDate = (date: any) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/20 text-green-400';
      case 'overdue': return 'bg-red-500/20 text-red-400';
      case 'partial': return 'bg-yellow-500/20 text-yellow-400';
      case 'pending': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Lease Agreement Details</h3>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading lease details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="w-8 h-8 text-primary-500" />
          <div>
            <h3 className="text-xl font-semibold text-white">Lease Agreement Details</h3>
            <p className="text-gray-400">Lease ID: {lease.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lease.status)}`}>
            {lease.status.toUpperCase()}
          </span>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {facility && (
          <Card className="bg-primary-500/10 border-primary-500/30">
            <div className="flex items-center space-x-3">
              <Building2 className="w-8 h-8 text-primary-500" />
              <div>
                <h4 className="text-white font-medium">{facility.name}</h4>
                <p className="text-gray-400 text-sm">{facility.address}</p>
                <p className="text-gray-500 text-xs">Billing: {facility.billingEntity}</p>
              </div>
            </div>
          </Card>
        )}

        {room && (
          <Card className="bg-accent-blue-500/10 border-accent-blue-500/30">
            <div className="flex items-center space-x-3">
              <DoorClosed className="w-8 h-8 text-accent-blue-500" />
              <div>
                <h4 className="text-white font-medium">Room {room.roomNumber}</h4>
                <p className="text-gray-400 text-sm">{room.type} - {room.capacity} guests</p>
                <p className="text-gray-500 text-xs">R{room.monthlyRent}/month</p>
              </div>
            </div>
          </Card>
        )}

        {renter && (
          <Card className="bg-green-500/10 border-green-500/30">
            <div className="flex items-center space-x-3">
              <User className="w-8 h-8 text-green-500" />
              <div>
                <h4 className="text-white font-medium">{renter.personalInfo.firstName} {renter.personalInfo.lastName}</h4>
                <p className="text-gray-400 text-sm">{renter.personalInfo.phone}</p>
                <p className="text-gray-500 text-xs">ID: {renter.personalInfo.idNumber}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Lease Terms */}
      <Card>
        <h4 className="text-lg font-semibold text-white mb-4">Lease Terms</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Start Date:</span>
              <span className="text-white">{formatDate(lease.terms.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">End Date:</span>
              <span className="text-white">{formatDate(lease.terms.endDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Monthly Rent:</span>
              <span className="text-white font-medium">R{lease.terms.monthlyRent.toLocaleString()}</span>
            </div>
            {lease.childrenCount && lease.childrenCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Children:</span>
                <span className="text-white">{lease.childrenCount}</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Deposit Amount:</span>
              <span className="text-white">R{lease.terms.depositAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Deposit Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                lease.terms.depositPaid ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
              }`}>
                {lease.terms.depositPaid ? 'PAID' : 'PENDING'}
              </span>
            </div>
            {lease.terms.depositPaidDate && (
              <div className="flex justify-between">
                <span className="text-gray-400">Paid Date:</span>
                <span className="text-white">{formatDate(lease.terms.depositPaidDate)}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Child Surcharge Breakdown */}
      {lease.childrenCount && lease.childrenCount > 0 && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <h4 className="text-lg font-semibold text-white mb-4">Child Surcharge Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-gray-400 text-sm">Base Monthly Rent</div>
              <div className="text-white font-medium text-lg">
                R{(lease.terms.monthlyRent - (lease.childrenCount * lease.businessRules.childSurcharge)).toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-sm">Child Surcharge ({lease.childrenCount} children)</div>
              <div className="text-white font-medium text-lg">
                R{(lease.childrenCount * lease.businessRules.childSurcharge).toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400 text-sm">Total Monthly Rent</div>
              <div className="text-white font-bold text-xl">
                R{lease.terms.monthlyRent.toLocaleString()}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Business Rules */}
      <Card>
        <h4 className="text-lg font-semibold text-white mb-4">Business Rules</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Late Fee:</span>
              <span className="text-white">R{lease.businessRules.lateFeeAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Late Fee Start Day:</span>
              <span className="text-white">Day {lease.businessRules.lateFeeStartDay}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Child Surcharge:</span>
              <span className="text-white">R{lease.businessRules.childSurcharge}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Grace Period:</span>
              <span className="text-white">{lease.businessRules.gracePeriodDays} days</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment Schedule */}
      {paymentSchedule && (
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">Payment Schedule</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h5 className="text-white font-medium">Total Amount</h5>
              <p className="text-2xl font-bold text-primary-500">R{paymentSchedule.totalAmount.toLocaleString()}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <h5 className="text-white font-medium">Total Paid</h5>
              <p className="text-2xl font-bold text-green-500">R{paymentSchedule.totalPaid.toLocaleString()}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <h5 className="text-white font-medium">Outstanding</h5>
              <p className="text-2xl font-bold text-red-500">R{paymentSchedule.outstandingAmount.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {paymentSchedule.payments.map((payment, index) => (
              <div key={payment.month} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    payment.type === 'deposit' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div>
                    <span className="text-white font-medium">
                      {payment.type === 'deposit' ? 'Deposit' : `Month ${index + (payment.type === 'deposit' ? 0 : 1)}`}
                    </span>
                    <p className="text-xs text-gray-400">
                      Due: {formatDate(payment.dueDate)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-white font-medium">R{payment.amount.toLocaleString()}</span>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium mt-1 ${getPaymentStatusColor(payment.status)}`}>
                    {payment.status.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Additional Terms */}
      {lease.additionalTerms && (
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">Additional Terms</h4>
          <p className="text-gray-300 whitespace-pre-wrap">{lease.additionalTerms}</p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        {onCapturePayment && (
          <Button variant="primary" onClick={onCapturePayment}>
            <CreditCard className="w-4 h-4 mr-2" />
            Payments
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default LeaseView;
