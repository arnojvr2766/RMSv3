import React, { useState, useEffect } from 'react';
import { DollarSign, X, Calendar, CreditCard, Camera, Upload, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import BottomSheet from './BottomSheet';
import CameraCapture from '../forms/CameraCapture';
import { paymentScheduleService, leaseService, renterService, roomService, facilityService } from '../../services/firebaseService';
import { Timestamp } from 'firebase/firestore';
import { usePaymentValidation, validateOnePaymentPerMonth, validateDepositBeforeRent, validateOutstandingRent } from '../../utils/paymentValidation';
import { useOrganizationSettings } from '../../contexts/OrganizationSettingsContext';
import { useAuth } from '../../contexts/AuthContext';

interface MobilePaymentCaptureProps {
  paymentTransaction: {
    id: string;
    leaseId: string;
    facilityId: string;
    roomId: string;
    renterId: string;
    month: string;
    amount: number;
    type: 'rent' | 'deposit' | 'late_fee' | 'deposit_payout' | 'maintenance';
    status: 'pending' | 'paid' | 'overdue' | 'partial';
  };
  scheduleId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const MobilePaymentCapture: React.FC<MobilePaymentCaptureProps> = ({
  paymentTransaction,
  scheduleId,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const { validatePayment } = usePaymentValidation();
  const { allowPartialPayments } = useOrganizationSettings();
  
  const [paymentSchedule, setPaymentSchedule] = useState<any>(null);
  const [lease, setLease] = useState<any>(null);
  const [renter, setRenter] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [facility, setFacility] = useState<any>(null);
  
  const [paymentAmount, setPaymentAmount] = useState<number>(paymentTransaction.amount);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [paymentValidation, setPaymentValidation] = useState<{ isValid: boolean; requiresApproval: boolean; errorMessage?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: '💵' },
    { value: 'eft', label: 'EFT', icon: '🏦' },
    { value: 'mobile', label: 'Mobile Payment', icon: '📱' },
    { value: 'card', label: 'Card', icon: '💳' },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: '🔄' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (paymentDate) {
      const validation = validatePayment(new Date(paymentDate));
      setPaymentValidation(validation);
    }
  }, [paymentDate, validatePayment]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [scheduleData, leaseData, renterData, roomData, facilityData] = await Promise.all([
        paymentScheduleService.getPaymentScheduleById(scheduleId),
        leaseService.getLeaseById(paymentTransaction.leaseId),
        renterService.getRenterById(paymentTransaction.renterId),
        roomService.getRoomById(paymentTransaction.roomId),
        facilityService.getFacilityById(paymentTransaction.facilityId)
      ]);

      setPaymentSchedule(scheduleData);
      setLease(leaseData);
      setRenter(renterData);
      setRoom(roomData);
      setFacility(facilityData);

      // Set payment amount from the payment in schedule
      if (scheduleData?.payments) {
        const payment = scheduleData.payments.find((p: any) => p.month === paymentTransaction.month);
        if (payment) {
          // If already paid partially, set remaining amount
          if (payment.status === 'partial' && payment.paidAmount) {
            setPaymentAmount(payment.amount - payment.paidAmount);
          } else {
            setPaymentAmount(payment.amount);
          }
        }
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      alert('Failed to load payment details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProofUpload = (file: File) => {
    setPaymentProof(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setProofPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (imageDataUrl: string) => {
    // Convert data URL to File
    fetch(imageDataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `payment-proof-${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleProofUpload(file);
        setShowCamera(false);
      });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (paymentAmount <= 0) {
      newErrors.paymentAmount = 'Payment amount must be greater than 0';
    }

    const existingPayment = paymentSchedule?.payments?.find((p: any) => p.month === paymentTransaction.month);
    const fullAmount = existingPayment?.amount || paymentTransaction.amount;
    const alreadyPaid = existingPayment?.paidAmount || 0;
    const remainingAmount = fullAmount - alreadyPaid;
    
    if (paymentAmount > remainingAmount) {
      newErrors.paymentAmount = `Amount cannot exceed R${remainingAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
    }

    if (!paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }

    if (!paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!paymentSchedule) {
      alert('Payment schedule not loaded');
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate: Only one payment per month per room (unless partial payments allowed)
      const onePaymentValidation = await validateOnePaymentPerMonth(
        scheduleId,
        paymentTransaction.month,
        allowPartialPayments
      );
      if (!onePaymentValidation.isValid) {
        alert(onePaymentValidation.errorMessage || 'Payment validation failed.');
        setIsSubmitting(false);
        return;
      }

      // Validate: If room was Empty last month → deposit must be taken before rent
      const depositValidation = await validateDepositBeforeRent(
        paymentTransaction.roomId,
        scheduleId,
        paymentTransaction.type
      );
      if (!depositValidation.isValid) {
        alert(depositValidation.errorMessage || 'Deposit validation failed.');
        setIsSubmitting(false);
        return;
      }

      // Validate: Outstanding rent from previous month must be settled first
      const outstandingValidation = await validateOutstandingRent(
        scheduleId,
        paymentTransaction.month
      );
      if (!outstandingValidation.isValid) {
        alert(outstandingValidation.errorMessage || 'Outstanding rent validation failed.');
        setIsSubmitting(false);
        return;
      }

      // Determine payment status
      const existingPayment = paymentSchedule.payments.find((p: any) => p.month === paymentTransaction.month);
      const fullAmount = existingPayment?.amount || paymentTransaction.amount;
      let paymentStatus: 'paid' | 'partial' | 'pending_approval';

      if (paymentValidation && paymentValidation.requiresApproval) {
        paymentStatus = 'pending_approval';
      } else {
        const totalPaid = (existingPayment?.paidAmount || 0) + paymentAmount;
        paymentStatus = totalPaid >= fullAmount ? 'paid' : 'partial';
      }

      const paymentUpdate: any = {
        status: paymentStatus,
        paidAmount: (existingPayment?.paidAmount || 0) + paymentAmount,
        paymentMethod: paymentMethod,
        requiresApproval: paymentValidation?.requiresApproval || false,
        capturedBy: user?.uid || 'unknown',
        capturedAt: Timestamp.now(),
        paidDate: Timestamp.fromDate(new Date(paymentDate)),
      };

      // Add payment proof if provided
      if (paymentProof) {
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(paymentProof);
        });

        paymentUpdate.paymentProof = {
          fileName: paymentProof.name,
          fileType: paymentProof.type,
          fileSize: paymentProof.size,
          data: base64String,
          uploadedAt: Timestamp.now()
        };
      }

      // Add notes if provided
      if (notes.trim()) {
        paymentUpdate.notes = notes.trim();
      }

      // Update payment in schedule
      await paymentScheduleService.updatePaymentInSchedule(
        scheduleId,
        paymentTransaction.month,
        paymentUpdate
      );

      // Auto-switch room status from 'locked' to 'occupied' after payment
      if (paymentStatus !== 'pending_approval' && room) {
        try {
          if (room.status === 'locked' || room.lastOccupancyState === 'locked') {
            await roomService.updateRoom(paymentTransaction.roomId, {
              status: 'occupied',
              updatedAt: Timestamp.now(),
            });
          }
        } catch (error) {
          console.error('Error auto-switching room status:', error);
        }
      }

      alert('Payment captured successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error capturing payment:', error);
      alert(error.message || 'Failed to capture payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <BottomSheet isOpen={true} onClose={onCancel} title="Capture Payment">
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading payment details...</p>
        </div>
      </BottomSheet>
    );
  }

  const existingPayment = paymentSchedule?.payments?.find((p: any) => p.month === paymentTransaction.month);
  const fullAmount = existingPayment?.amount || paymentTransaction.amount;
  const alreadyPaid = existingPayment?.paidAmount || 0;
  const remainingAmount = fullAmount - alreadyPaid;

  return (
    <>
      <BottomSheet 
        isOpen={true} 
        onClose={onCancel} 
        title="Capture Payment" 
        maxHeight="95vh"
        footer={
          <div className="p-4 bg-gray-800 border-t-2 border-gray-700">
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1 py-3 text-base font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isSubmitting}
                className="flex-1 py-3 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e as any);
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Save Payment
                  </span>
                )}
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Scrollable Content */}
          <div className="p-4 space-y-6">
          {/* Payment Summary */}
          <Card className="p-4 bg-blue-500/10 border-blue-500/30">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Renter:</span>
              <span className="text-white font-semibold">
                {renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : 'Loading...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Room:</span>
              <span className="text-white font-semibold">{room?.roomNumber || 'Loading...'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Month:</span>
              <span className="text-white font-semibold">{paymentTransaction.month}</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-700 pt-2 mt-2">
              <span className="text-gray-400">Total Due:</span>
              <span className="text-white font-bold text-lg">
                R{fullAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {alreadyPaid > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Already Paid:</span>
                <span className="text-green-400">R{alreadyPaid.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-gray-700 pt-2 mt-2">
              <span className="text-gray-400">Remaining:</span>
              <span className="text-yellow-400 font-bold text-lg">
                R{remainingAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </Card>

        {/* Payment Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Payment Amount (R)
          </label>
          <Input
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
            error={errors.paymentAmount}
            required
            min="0"
            max={remainingAmount}
            step="0.01"
            placeholder="0.00"
            className="text-lg"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum: R{remainingAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Payment Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Payment Date
          </label>
          <Input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            error={errors.paymentDate}
            required
            className="text-lg"
          />
          {paymentValidation && !paymentValidation.isValid && (
            <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <p className="text-yellow-400 text-xs">{paymentValidation.errorMessage}</p>
              </div>
            </div>
          )}
          {paymentValidation && paymentValidation.requiresApproval && (
            <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-start space-x-2">
                <Clock className="w-4 h-4 text-orange-400 mt-0.5" />
                <p className="text-orange-400 text-xs">This payment requires admin approval</p>
              </div>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Payment Method
          </label>
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 -mx-4 px-4">
            {paymentMethods.map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  paymentMethod === method.value
                    ? 'bg-primary-500 text-gray-900 shadow-lg'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{method.icon}</span>
                <span>{method.label}</span>
              </button>
            ))}
          </div>
          {errors.paymentMethod && (
            <p className="text-red-400 text-xs mt-1">{errors.paymentMethod}</p>
          )}
        </div>

        {/* Payment Proof */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Payment Proof (Optional)
          </label>
          {proofPreview ? (
            <div className="relative">
              <img src={proofPreview} alt="Payment proof" className="w-full h-48 object-contain rounded-lg border border-gray-600" />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setProofPreview(null);
                  setPaymentProof(null);
                }}
                className="absolute top-2 right-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCamera(true)}
                className="flex items-center justify-center space-x-2"
              >
                <Camera className="w-5 h-5" />
                <span>Camera</span>
              </Button>
              <label className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                <Upload className="w-5 h-5 text-gray-300" />
                <span className="text-gray-300">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProofUpload(file);
                  }}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Add any notes about this payment..."
          />
        </div>
          </div>
        </form>
      </BottomSheet>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50">
          <CameraCapture
            onCapture={handleCameraCapture}
            onCancel={() => setShowCamera(false)}
          />
        </div>
      )}
    </>
  );
};

export default MobilePaymentCapture;

