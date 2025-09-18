import React, { useState } from 'react';
import { FileText, Calendar, DollarSign, Save, X, User, Building2, DoorClosed } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { leaseService, paymentScheduleService, generatePaymentSchedule, roomService } from '../../services/firebaseService';
import { Timestamp } from 'firebase/firestore';
import { useSettings } from '../../contexts/SettingsContext';

// Temporary inline type definitions
interface Facility {
  id?: string;
  name: string;
  address: string;
  billingEntity: string;
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
  squareMeters?: number;
  createdAt: any;
  updatedAt: any;
}

interface Renter {
  id?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    idNumber: string;
    dateOfBirth: any;
    phone: string;
    email: string;
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  employment: {
    employer: string;
    position: string;
    monthlyIncome: number;
    workPhone?: string;
  };
  status: 'active' | 'inactive' | 'blacklisted';
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

interface PaymentSchedule {
  id?: string;
  leaseId: string;
  facilityId: string;
  roomId: string;
  renterId: string;
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
  createdAt: any;
  updatedAt: any;
}

interface LeaseFormProps {
  facility: Facility;
  room: Room;
  renter: Renter;
  onSuccess?: () => void;
  onCancel?: () => void;
  onBack?: () => void;
}

const LeaseForm: React.FC<LeaseFormProps> = ({ 
  facility, 
  room, 
  renter, 
  onSuccess, 
  onCancel, 
  onBack 
}) => {
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    monthlyRent: room.monthlyRent,
    depositAmount: room.depositAmount,
    depositPaid: false,
    depositPaidDate: '',
    depositPaymentMethod: 'cash',
    additionalTerms: '',
    childrenCount: 0, // Number of children
    // Business rules inherited from room
    lateFeeAmount: room.businessRules.lateFeeAmount,
    lateFeeStartDay: room.businessRules.lateFeeStartDay,
    childSurcharge: room.businessRules.childSurcharge,
    gracePeriodDays: room.businessRules.gracePeriodDays,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewSchedule, setPreviewSchedule] = useState<PaymentSchedule | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { paymentDueDate } = useSettings();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // If children count changes, recalculate monthly rent
      if (field === 'childrenCount') {
        const childSurchargeTotal = value * prev.childSurcharge;
        newData.monthlyRent = room.monthlyRent + childSurchargeTotal;
      }
      
      return newData;
    });
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-generate preview when dates change
    if (field === 'startDate' || field === 'endDate') {
      generatePreview({ ...formData, [field]: value });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    if (formData.monthlyRent <= 0) {
      newErrors.monthlyRent = 'Monthly rent must be greater than 0';
    }

    if (formData.depositAmount < 0) {
      newErrors.depositAmount = 'Deposit amount cannot be negative';
    }

    if (formData.depositPaid && !formData.depositPaidDate) {
      newErrors.depositPaidDate = 'Deposit paid date is required when deposit is marked as paid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generatePreview = (data = formData) => {
    if (!data.startDate || !data.endDate) return;

    try {
      const mockTerms: any = {
        startDate: Timestamp.fromDate(new Date(data.startDate)),
        endDate: Timestamp.fromDate(new Date(data.endDate)),
        monthlyRent: data.monthlyRent,
        depositAmount: data.depositAmount,
        depositPaid: data.depositPaid,
      };

      // Only add depositPaidDate if it exists
      if (data.depositPaidDate) {
        mockTerms.depositPaidDate = Timestamp.fromDate(new Date(data.depositPaidDate));
      }

      const mockLease = {
        id: 'preview',
        facilityId: facility.id!,
        roomId: room.id!,
        renterId: renter.id!,
        terms: mockTerms,
        businessRules: {
          lateFeeAmount: data.lateFeeAmount,
          lateFeeStartDay: data.lateFeeStartDay,
          childSurcharge: data.childSurcharge,
          gracePeriodDays: data.gracePeriodDays,
          paymentMethods: room.businessRules.paymentMethods,
        },
        additionalTerms: data.additionalTerms,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const schedule = generatePaymentSchedule(mockLease, !data.depositPaid, paymentDueDate);
      setPreviewSchedule({
        ...schedule,
        id: 'preview',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error generating preview:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Create lease agreement
      const terms: any = {
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        monthlyRent: formData.monthlyRent,
        depositAmount: formData.depositAmount,
        depositPaid: formData.depositPaid,
      };

      // Only add depositPaidDate if it exists
      if (formData.depositPaidDate) {
        terms.depositPaidDate = Timestamp.fromDate(new Date(formData.depositPaidDate));
      }

      const leaseData = {
        facilityId: facility.id!,
        roomId: room.id!,
        renterId: renter.id!,
        terms,
        childrenCount: formData.childrenCount, // Add children count to lease
        businessRules: {
          lateFeeAmount: formData.lateFeeAmount,
          lateFeeStartDay: formData.lateFeeStartDay,
          childSurcharge: formData.childSurcharge,
          gracePeriodDays: formData.gracePeriodDays,
          paymentMethods: room.businessRules.paymentMethods,
        },
        additionalTerms: formData.additionalTerms,
        status: 'active' as const,
      };

      const leaseId = await leaseService.createLease(leaseData);
      console.log('Lease created with ID:', leaseId);

      // Generate and create payment schedule
      const scheduleData = generatePaymentSchedule({
        ...leaseData,
        id: leaseId,
        depositPaymentMethod: formData.depositPaymentMethod, // Add payment method for deposit
      }, !formData.depositPaid, paymentDueDate);

      await paymentScheduleService.createPaymentSchedule(scheduleData);
      console.log('Payment schedule created');

      // Update room status to occupied
      await roomService.updateRoom(room.id!, { status: 'occupied' });
      console.log('Room status updated to occupied');

      onSuccess?.();
    } catch (error) {
      console.error('Error creating lease:', error);
      alert('Failed to create lease agreement. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate preview when component mounts
  React.useEffect(() => {
    generatePreview();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="w-8 h-8 text-primary-500" />
          <div>
            <h3 className="text-xl font-semibold text-white">Create Lease Agreement</h3>
            <p className="text-gray-400">Final step: Set lease terms and generate payment schedule</p>
          </div>
        </div>
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            Back to Renter Selection
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary-500/10 border-primary-500/30">
          <div className="flex items-center space-x-3">
            <Building2 className="w-8 h-8 text-primary-500" />
            <div>
              <h4 className="text-white font-medium">{facility.name}</h4>
              <p className="text-gray-400 text-sm">{facility.address}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-accent-blue-500/10 border-accent-blue-500/30">
          <div className="flex items-center space-x-3">
            <DoorClosed className="w-8 h-8 text-accent-blue-500" />
            <div>
              <h4 className="text-white font-medium">Room {room.roomNumber}</h4>
              <p className="text-gray-400 text-sm">{room.type} - {room.capacity} guests</p>
            </div>
          </div>
        </Card>

        <Card className="bg-green-500/10 border-green-500/30">
          <div className="flex items-center space-x-3">
            <User className="w-8 h-8 text-green-500" />
            <div>
              <h4 className="text-white font-medium">{renter.personalInfo.firstName} {renter.personalInfo.lastName}</h4>
              <p className="text-gray-400 text-sm">{renter.personalInfo.phone}</p>
            </div>
          </div>
        </Card>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lease Terms */}
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">Lease Terms</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              error={errors.startDate}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
              error={errors.endDate}
              required
            />
            <Input
              label="Monthly Rent (R)"
              type="number"
              value={formData.monthlyRent}
              onChange={(e) => handleInputChange('monthlyRent', parseFloat(e.target.value) || 0)}
              error={errors.monthlyRent}
              required
              min="0"
            />
            <Input
              label="Deposit Amount (R)"
              type="number"
              value={formData.depositAmount}
              onChange={(e) => handleInputChange('depositAmount', parseFloat(e.target.value) || 0)}
              error={errors.depositAmount}
              min="0"
            />
            <Input
              label="Number of Children"
              type="number"
              value={formData.childrenCount}
              onChange={(e) => handleInputChange('childrenCount', parseInt(e.target.value) || 0)}
              error={errors.childrenCount}
              min="0"
              max="10"
            />
          </div>
          
          {/* Child Surcharge Breakdown */}
          {formData.childrenCount > 0 && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h5 className="text-white font-medium mb-2">Child Surcharge Breakdown</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Base Monthly Rent:</span>
                  <span className="text-white ml-2">R{room.monthlyRent.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Children ({formData.childrenCount}):</span>
                  <span className="text-white ml-2">R{(formData.childrenCount * formData.childSurcharge).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Total Monthly Rent:</span>
                  <span className="text-white font-semibold ml-2">R{formData.monthlyRent.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="depositPaid"
                checked={formData.depositPaid}
                onChange={(e) => handleInputChange('depositPaid', e.target.checked)}
                className="w-4 h-4 text-primary-500 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="depositPaid" className="text-white">
                Deposit has been paid
              </label>
            </div>

            {formData.depositPaid && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Deposit Paid Date"
                  type="date"
                  value={formData.depositPaidDate}
                  onChange={(e) => handleInputChange('depositPaidDate', e.target.value)}
                  error={errors.depositPaidDate}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
                  <select
                    value={formData.depositPaymentMethod || 'cash'}
                    onChange={(e) => handleInputChange('depositPaymentMethod', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="eft">EFT</option>
                    <option value="card">Card Payment</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Business Rules */}
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">Business Rules (Inherited from Room)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Late Fee Amount (R)"
              type="number"
              value={formData.lateFeeAmount}
              onChange={(e) => handleInputChange('lateFeeAmount', parseFloat(e.target.value) || 0)}
              min="0"
            />
            <Input
              label="Late Fee Start Day"
              type="number"
              value={formData.lateFeeStartDay}
              onChange={(e) => handleInputChange('lateFeeStartDay', parseInt(e.target.value) || 1)}
              min="1"
            />
            <Input
              label="Child Surcharge (R)"
              type="number"
              value={formData.childSurcharge}
              onChange={(e) => handleInputChange('childSurcharge', parseFloat(e.target.value) || 0)}
              min="0"
            />
            <Input
              label="Grace Period (Days)"
              type="number"
              value={formData.gracePeriodDays}
              onChange={(e) => handleInputChange('gracePeriodDays', parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>
        </Card>

        {/* Additional Terms */}
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">Additional Terms</h4>
          <textarea
            value={formData.additionalTerms}
            onChange={(e) => handleInputChange('additionalTerms', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={4}
            placeholder="Any additional terms or conditions for this lease agreement..."
          />
        </Card>

        {/* Payment Schedule Preview */}
        {previewSchedule && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">Payment Schedule Preview</h4>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide' : 'Show'} Details
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <h5 className="text-white font-medium">Total Amount</h5>
                <p className="text-2xl font-bold text-primary-500">R{previewSchedule.totalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <h5 className="text-white font-medium">Total Payments</h5>
                <p className="text-2xl font-bold text-accent-blue-500">{previewSchedule.payments.length}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <h5 className="text-white font-medium">Monthly Rent</h5>
                <p className="text-2xl font-bold text-green-500">R{formData.monthlyRent.toLocaleString()}</p>
              </div>
            </div>

            {showPreview && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {previewSchedule.payments.map((payment, index) => (
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
                          Due: {payment.dueDate instanceof Timestamp 
                            ? payment.dueDate.toDate().toLocaleDateString()
                            : new Date(payment.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-white font-medium">R{payment.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Creating Lease...' : 'Create Lease Agreement'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LeaseForm;
