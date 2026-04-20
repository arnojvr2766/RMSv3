import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, X, Edit, Camera, Upload, Image, Trash2, AlertTriangle, Clock } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { paymentScheduleService, roomService, renterService, facilityService, type PaymentSchedule } from '../../services/firebaseService';
import { aggregatedPenaltyService } from '../../services/aggregatedPenaltyService';
import PaymentEdit from './PaymentEdit';
import CameraCapture from './CameraCapture';
import PaymentReceiptModal from './PaymentReceiptModal';
import { Timestamp } from 'firebase/firestore';
import { usePaymentValidation, validateOnePaymentPerMonth, validateDepositBeforeRent, validateOutstandingRent } from '../../utils/paymentValidation';
import { useOrganizationSettings } from '../../contexts/OrganizationSettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

// Temporary inline type definitions
// PaymentSchedule type is imported from firebaseService

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
  businessRules?: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    gracePeriodDays: number;
  };
  status: 'active' | 'expired' | 'terminated' | 'pending';
}

interface PaymentCaptureProps {
  lease: LeaseAgreement;
  onSuccess?: () => void;
  onCancel?: () => void;
  preSelectedPayment?: {
    month: string;
    amount: number;
  };
}

const PaymentCapture: React.FC<PaymentCaptureProps> = ({ lease, onSuccess, onCancel, preSelectedPayment }) => {
  const { validatePayment } = usePaymentValidation();
  const { allowPartialPayments } = useOrganizationSettings();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [renterName, setRenterName] = useState<string>('');
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [paymentValidation, setPaymentValidation] = useState<{ isValid: boolean; requiresApproval: boolean; errorMessage?: string } | null>(null);
  
  // Penalty payment state
  const [includePenaltyPayment, setIncludePenaltyPayment] = useState(false);
  const [penaltyPaymentAmount, setPenaltyPaymentAmount] = useState(0);
  const [penaltyPaymentMethod, setPenaltyPaymentMethod] = useState('cash');

  // Duplicate payment guard
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [bypassDuplicate, setBypassDuplicate] = useState(false);

  // Inline form error (shown above submit button)
  const [formError, setFormError] = useState<string | null>(null);
  // File upload error (shown near upload button)
  const [fileError, setFileError] = useState<string | null>(null);

  const [facilityName, setFacilityName] = useState<string>('');
  // Receipt modal state
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    amount: number;
    method: string;
    date: string;
    month: string;
    paymentSchedule: any;
    renterName: string;
    roomNumber: string;
    facilityName: string;
    penaltyPaid: number;
    penaltyMethod: string;
  } | null>(null);

  useEffect(() => {
    loadPaymentSchedule();
    // Load room and renter info for display
    roomService.getRoomById(lease.roomId).then(r => { if (r) setRoomNumber(r.roomNumber); }).catch(() => {});
    renterService.getRenterById(lease.renterId).then(r => {
      if (r) setRenterName(`${r.personalInfo.firstName} ${r.personalInfo.lastName}`);
    }).catch(() => {});
    facilityService.getFacilityById(lease.facilityId).then(f => { if (f) setFacilityName(f.name); }).catch(() => {});
  }, [lease]);

  // Reset duplicate warning when selected payment changes
  useEffect(() => {
    setDuplicateWarning(null);
    setBypassDuplicate(false);
  }, [selectedPayment]);

  // Validate payment date whenever it changes
  useEffect(() => {
    if (paymentDate) {
      const validation = validatePayment(new Date(paymentDate));
      setPaymentValidation(validation);
    }
  }, [paymentDate, validatePayment]);

  const loadPaymentSchedule = async () => {
    try {
      setIsLoading(true);
      const schedule = await paymentScheduleService.getPaymentScheduleByLease(lease.id!);
      setPaymentSchedule(schedule);
      
      // Set default payment - use preSelectedPayment if provided, otherwise use smart default
      if (schedule) {
        // Helper: amount still owed on a payment entry
        const remaining = (p: typeof schedule.payments[0]) =>
          p.status === 'partial' ? Math.max(0, p.amount - (p.paidAmount || 0)) : p.amount;

        if (preSelectedPayment) {
          // Use the pre-selected payment
          setSelectedPayment(preSelectedPayment.month);
          setPaymentAmount(remaining(preSelectedPayment));
        } else {
          // Priority 1: unpaid/partial deposit — must always be collected before rent
          const unpaidDeposit = schedule.payments.find(
            p => p.type === 'deposit' && (p.status === 'pending' || p.status === 'overdue' || p.status === 'partial')
          );
          if (unpaidDeposit) {
            setSelectedPayment(unpaidDeposit.month);
            setPaymentAmount(remaining(unpaidDeposit));
          } else {
            // Priority 2: first pending/overdue/partial payment chronologically after the last fully paid one
            const fullyPaid = schedule.payments.filter(p => p.status === 'paid');
            const byDate = (a: typeof schedule.payments[0], b: typeof schedule.payments[0]) =>
              a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime();

            let defaultPayment = null;

            if (fullyPaid.length > 0) {
              const lastPaidDate = fullyPaid
                .sort((a, b) => b.dueDate.toDate().getTime() - a.dueDate.toDate().getTime())[0]
                .dueDate.toDate();
              const due = schedule.payments
                .filter(p => p.dueDate.toDate() > lastPaidDate && (p.status === 'pending' || p.status === 'overdue' || p.status === 'partial'))
                .sort(byDate);
              defaultPayment = due[0] ?? null;
            } else {
              const due = schedule.payments
                .filter(p => p.status === 'pending' || p.status === 'overdue' || p.status === 'partial')
                .sort(byDate);
              defaultPayment = due[0] ?? null;
            }

            if (defaultPayment) {
              setSelectedPayment(defaultPayment.month);
              setPaymentAmount(remaining(defaultPayment));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading payment schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: any) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const getMonthLabel = (monthKey: string) => {
    const parts = monthKey.split('-');
    if (parts.length === 2) {
      const month = parseInt(parts[1]);
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${monthNames[month - 1] || monthKey} ${parts[0]}`;
    }
    return monthKey;
  };

  const getPaymentOptionLabel = (payment: PaymentSchedule['payments'][0]) => {
    if (payment.type === 'deposit') return `Deposit — R${payment.amount.toLocaleString()} (${payment.status})`;
    return `${getMonthLabel(payment.month)} — R${payment.amount.toLocaleString()} (${payment.status.replace('_', ' ')})`;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setFormError(null);
    if (!selectedPayment || !paymentSchedule) {
      setFormError('Please select a payment to process.');
      return;
    }

    if (paymentAmount <= 0) {
      setFormError('Please enter a valid payment amount.');
      return;
    }

    if (!paymentDate) {
      setFormError('Please select a payment date.');
      return;
    }

    // Validate payment date
    if (paymentValidation && !paymentValidation.isValid) {
      setFormError(paymentValidation.errorMessage || 'Invalid payment date.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get payment type for validation
      const selectedPaymentData = paymentSchedule.payments.find(p => p.month === selectedPayment);
      if (!selectedPaymentData) {
        setFormError('Selected payment not found in schedule.');
        setIsSubmitting(false);
        return;
      }

      // Validate: Only one payment per month per room (unless partial payments allowed)
      const onePaymentValidation = await validateOnePaymentPerMonth(
        paymentSchedule.id!,
        selectedPayment,
        allowPartialPayments
      );
      if (!onePaymentValidation.isValid && !bypassDuplicate) {
        setDuplicateWarning(onePaymentValidation.errorMessage || 'A payment already exists for this month.');
        setIsSubmitting(false);
        return;
      }

      // Validate: If room was Empty last month → deposit must be taken before rent
      const depositValidation = await validateDepositBeforeRent(
        lease.roomId,
        paymentSchedule.id!,
        selectedPaymentData.type
      );
      if (!depositValidation.isValid) {
        setFormError(depositValidation.errorMessage || 'Deposit validation failed.');
        setIsSubmitting(false);
        return;
      }

      // Validate: Outstanding rent from previous month must be settled first
      const outstandingValidation = await validateOutstandingRent(
        paymentSchedule.id!,
        selectedPayment
      );
      if (!outstandingValidation.isValid) {
        setFormError(outstandingValidation.errorMessage || 'Outstanding rent validation failed.');
        setIsSubmitting(false);
        return;
      }
      // Accumulate if this is a top-up on a partial payment
      const existingPaid = selectedPaymentData.status === 'partial'
        ? (selectedPaymentData.paidAmount || 0)
        : 0;
      const totalPaid = existingPaid + paymentAmount;

      // Determine payment status based on validation
      let paymentStatus: 'paid' | 'partial' | 'pending_approval';
      if (paymentValidation && paymentValidation.requiresApproval) {
        paymentStatus = 'pending_approval';
      } else {
        paymentStatus = totalPaid >= selectedPaymentData.amount ? 'paid' : 'partial';
      }

      const paymentUpdate: any = {
        status: paymentStatus,
        paidAmount: totalPaid,
        paymentMethod: paymentMethod,
        requiresApproval: paymentValidation?.requiresApproval || false,
        capturedBy: user?.uid || '',
        capturedAt: Timestamp.now(),
      };

      // Only add paidDate if paymentDate is valid
      if (paymentDate) {
        paymentUpdate.paidDate = Timestamp.fromDate(new Date(paymentDate));
      }

      // Add payment proof if provided
      if (paymentProof) {
        // Convert file to base64 for storage (in a real app, you'd upload to cloud storage)
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

      await paymentScheduleService.updatePaymentInSchedule(
        paymentSchedule.id!,
        selectedPayment,
        paymentUpdate
      );

      // Calculate penalty for this late payment
      // Note: selectedPaymentData is already declared above (line 215), reuse it
      if (selectedPaymentData && paymentDate) {
        const dueDate = selectedPaymentData.dueDate.toDate();
        const paidDate = new Date(paymentDate);
        
        // Check if payment is late
        if (paidDate > dueDate) {
          const penaltyCalc = aggregatedPenaltyService.calculatePenalty(
            dueDate,
            paidDate,
            {
              lateFeeAmount: lease.businessRules?.lateFeeAmount || 0,
              lateFeeStartDay: lease.businessRules?.lateFeeStartDay || 0,
              gracePeriodDays: lease.businessRules?.gracePeriodDays || 0,
            },
            selectedPaymentData.amount
          );
          
          // Add penalty to aggregated penalty if applicable
          if (penaltyCalc.isLate && penaltyCalc.penaltyAmount > 0) {
            await aggregatedPenaltyService.updateAggregatedPenalty(
              paymentSchedule.id!,
              selectedPayment,
              penaltyCalc.penaltyAmount,
              `Late payment penalty for ${selectedPayment} - ${penaltyCalc.daysLate} days overdue`,
              {
                lateFeeAmount: lease.businessRules?.lateFeeAmount || 0,
                lateFeeStartDay: lease.businessRules?.lateFeeStartDay || 0,
                gracePeriodDays: lease.businessRules?.gracePeriodDays || 0,
              }
            );
          }
        }
      }

      // Carry over overpayment credit to the next pending month
      if (paymentStatus === 'paid') {
        const credit = totalPaid - selectedPaymentData.amount;
        if (credit > 0) {
          const nextPending = [...paymentSchedule.payments]
            .filter(p => p.month !== selectedPayment && (p.status === 'pending' || p.status === 'overdue'))
            .sort((a, b) => a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime())[0];
          if (nextPending) {
            const creditStatus = credit >= nextPending.amount ? 'paid' : 'partial';
            await paymentScheduleService.updatePaymentInSchedule(
              paymentSchedule.id!,
              nextPending.month,
              {
                status: creditStatus,
                paidAmount: Math.min(credit, nextPending.amount),
                paidDate: Timestamp.fromDate(new Date(paymentDate)),
                paymentMethod,
                notes: `Credit carried over from overpayment on ${selectedPayment}`,
              }
            );
          }
        }
      }

      // Process penalty payment if included
      if (includePenaltyPayment && penaltyPaymentAmount > 0) {
        await aggregatedPenaltyService.processPenaltyPayment(
          paymentSchedule.id!,
          penaltyPaymentAmount,
          penaltyPaymentMethod,
          `Penalty payment captured with ${selectedPayment} payment`
        );
      }

      // Reload payment schedule
      await loadPaymentSchedule();
      
      // Auto-switch room status from 'locked' to 'occupied' after payment
      if (paymentStatus !== 'pending_approval') {
        try {
          const room = await roomService.getRoomById(lease.roomId);
          if (room) {
            // Check if room was locked (either status or lastOccupancyState)
            if (room.status === 'locked' || room.lastOccupancyState === 'locked') {
              await roomService.updateRoom(lease.roomId, {
                status: 'occupied',
                updatedAt: Timestamp.now(),
                // Keep lastOccupancyState for history tracking
              });
              // Room status auto-switched from locked to occupied after payment;
            }
          }
        } catch (error) {
          console.error('Error auto-switching room status:', error);
          // Don't block payment success if room update fails
        }
      }
      
      // Reload schedule so receipt reflects the just-saved state
      const freshSchedule = await paymentScheduleService.getPaymentScheduleByLease(lease.id!);
      // Show receipt modal (onSuccess is called when receipt is closed)
      setReceiptData({
        amount: paymentAmount,
        method: paymentMethod,
        date: paymentDate,
        month: selectedPayment,
        paymentSchedule: freshSchedule ?? paymentSchedule,
        renterName,
        roomNumber,
        facilityName,
        penaltyPaid: includePenaltyPayment ? penaltyPaymentAmount : 0,
        penaltyMethod: penaltyPaymentMethod,
      });
      setShowReceipt(true);

      if (paymentValidation && paymentValidation.requiresApproval) {
        showSuccess('Payment sent for admin approval.');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      showError('Failed to process payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setShowEditForm(true);
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    setEditingPayment(null);
    loadPaymentSchedule(); // Reload to show updated data
  };

  const handleEditCancel = () => {
    setShowEditForm(false);
    setEditingPayment(null);
  };

  // Photo handling functions
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileError(null);
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setFileError('Please select an image file.');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFileError('File size must be less than 5MB.');
        return;
      }
      
      setPaymentProof(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProofPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    setShowCamera(true);
  };

  const handleCameraClose = () => {
    setShowCamera(false);
  };

  const handleCameraCaptureSuccess = (file: File) => {
    setPaymentProof(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setProofPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    setShowCamera(false);
  };

  const removeProof = () => {
    setPaymentProof(null);
    setProofPreview(null);
  };

  // Compute the late fee that WILL be charged when this payment is submitted.
  // Used both for the orange banner and to pre-fill the penalty collection section
  // even before the penalty record exists (i.e. on the first-ever late payment).
  const computePendingLateFee = (): { fee: number; daysLate: number; lateFeeAmount: number } => {
    if (!selectedPayment || !paymentDate || !paymentSchedule) return { fee: 0, daysLate: 0, lateFeeAmount: 0 };
    const payment = paymentSchedule.payments.find(p => p.month === selectedPayment);
    if (!payment) return { fee: 0, daysLate: 0, lateFeeAmount: 0 };
    const lateFeeAmount = lease.businessRules?.lateFeeAmount || 0;
    if (lateFeeAmount <= 0) return { fee: 0, daysLate: 0, lateFeeAmount: 0 };
    const dueDate = payment.dueDate.toDate();
    const paid = new Date(paymentDate);
    const lateFeeStartDay = lease.businessRules?.lateFeeStartDay || 0;
    const startDay = lateFeeStartDay || (dueDate.getDate() + (lease.businessRules?.gracePeriodDays || 0));
    let startDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), startDay);
    // If startDate falls before (or on) dueDate, it refers to the NEXT month.
    // e.g. rent due Mar 28, lateFeeStartDay=4 → late fee starts Apr 4, not Mar 4.
    if (startDate <= dueDate) {
      startDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, startDay);
    }
    if (paid <= startDate) return { fee: 0, daysLate: 0, lateFeeAmount };
    const daysLate = Math.ceil((paid.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    return { fee: daysLate * lateFeeAmount, daysLate, lateFeeAmount };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Capture Payment</h3>
          <Button variant="ghost" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading payment schedule...</p>
        </div>
      </div>
    );
  }

  if (!paymentSchedule) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Capture Payment</h3>
          <Button variant="ghost" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <Card className="text-center py-8">
          <DollarSign className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Payment Schedule Found</h2>
          <p className="text-gray-400">This lease does not have an associated payment schedule.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <DollarSign className="w-8 h-8 text-primary-500" />
          <div>
            <h3 className="text-xl font-semibold text-white">Capture Payment</h3>
            <p className="text-gray-400">
              {roomNumber ? `Room ${roomNumber}` : '—'}
              {renterName ? ` · ${renterName}` : ''}
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary-500/10 border-primary-500/30">
          <div className="text-center">
            <h4 className="text-white font-medium">Total Amount</h4>
            <p className="text-2xl font-bold text-primary-500">R{paymentSchedule.totalAmount.toLocaleString()}</p>
          </div>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <div className="text-center">
            <h4 className="text-white font-medium">Total Paid</h4>
            <p className="text-2xl font-bold text-green-500">R{paymentSchedule.totalPaid.toLocaleString()}</p>
          </div>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <div className="text-center">
            <h4 className="text-white font-medium">Outstanding</h4>
            <p className="text-2xl font-bold text-red-500">R{paymentSchedule.outstandingAmount.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Selection */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Paying for</label>
              <select
                value={selectedPayment}
                onChange={(e) => {
                  const p = paymentSchedule.payments.find(p => p.month === e.target.value);
                  setSelectedPayment(e.target.value);
                  if (p) {
                    const remaining = p.status === 'partial'
                      ? Math.max(0, p.amount - (p.paidAmount || 0))
                      : p.amount;
                    setPaymentAmount(remaining);
                  }
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">— Select payment —</option>
                {paymentSchedule.payments.map((payment) => (
                  <option key={payment.month} value={payment.month}>
                    {getPaymentOptionLabel(payment)}
                  </option>
                ))}
              </select>
            </div>
            {selectedPayment && (() => {
              const p = paymentSchedule.payments.find(p => p.month === selectedPayment);
              if (!p) return null;
              return (
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>Due: {formatDate(p.dueDate)}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(p.status)}`}>
                      {p.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {(p.status === 'paid' || p.status === 'partial' || p.status === 'pending_approval') && (
                      <Button variant="ghost" size="sm" onClick={() => handleEditPayment(p)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                    )}
                    {p.status === 'partial' && p.paidAmount != null && (
                      <span className="text-yellow-400 text-xs">
                        {(p as any).notes?.includes('Credit carried over')
                          ? `Credit R${p.paidAmount.toLocaleString()} applied — R${(p.amount - p.paidAmount).toLocaleString()} due`
                          : `R${p.paidAmount.toLocaleString()} paid — R${(p.amount - p.paidAmount).toLocaleString()} still owed`
                        }
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>

        {/* Payment Details + Penalties — merged card */}
        {(() => {
          const { fee: pendingFee, daysLate, lateFeeAmount: lfAmount } = computePendingLateFee();
          const existingOutstanding = paymentSchedule?.aggregatedPenalty?.outstandingAmount || 0;
          const totalPenaltyOwed = existingOutstanding + pendingFee;
          const totalCollecting = paymentAmount + (includePenaltyPayment ? penaltyPaymentAmount : 0);

          // Context banner for short/over payments
          const selectedP = paymentSchedule?.payments.find(p => p.month === selectedPayment);
          const isCredit = selectedP?.status === 'partial' && (selectedP as any).notes?.includes('Credit carried over');
          const isShortPaid = selectedP?.status === 'partial' && !isCredit;
          const existingPaid = selectedP?.paidAmount || 0;

          return (
            <Card>
              <h4 className="text-lg font-semibold text-white mb-4">Payment Details</h4>

              {/* Short-payment context banner */}
              {isShortPaid && selectedP && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
                  <span className="text-yellow-300 font-medium">Short payment: </span>
                  <span className="text-yellow-200">
                    Actual amount due is R{selectedP.amount.toLocaleString()}, but only R{existingPaid.toLocaleString()} was paid — R{(selectedP.amount - existingPaid).toLocaleString()} is still outstanding for this month.
                  </span>
                </div>
              )}

              {/* Overpayment credit banner */}
              {isCredit && selectedP && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
                  <span className="text-blue-300 font-medium">Overpayment credit: </span>
                  <span className="text-blue-200">
                    Actual amount due is R{selectedP.amount.toLocaleString()}, but a credit of R{existingPaid.toLocaleString()} carried over from a previous overpayment — only R{(selectedP.amount - existingPaid).toLocaleString()} remains due this month.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Payment Amount (R)"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  required
                />
                <div>
                  <Input
                    label="Payment Date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                  {paymentValidation && (
                    <div className="mt-2">
                      {!paymentValidation.isValid && (
                        <div className="flex items-center space-x-2 text-red-400 text-sm">
                          <AlertTriangle className="w-4 h-4" />
                          <span>{paymentValidation.errorMessage}</span>
                        </div>
                      )}
                      {paymentValidation.isValid && paymentValidation.requiresApproval && (
                        <div className="flex items-center space-x-2 text-yellow-400 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>This payment will require admin approval</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="eft">EFT</option>
                    <option value="card">Card Payment</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                    rows={1}
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>

              {/* Penalty section — inline when applicable */}
              {totalPenaltyOwed > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-700 space-y-3">
                  {/* Breakdown */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-sm text-orange-300">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Late fee: <strong>R{totalPenaltyOwed.toLocaleString()}</strong>
                        {pendingFee > 0 && ` (${daysLate} day${daysLate !== 1 ? 's' : ''} × R${lfAmount}/day)`}
                        {existingOutstanding > 0 && pendingFee > 0 && ` + R${existingOutstanding.toLocaleString()} outstanding`}
                        {existingOutstanding > 0 && pendingFee === 0 && ` outstanding`}
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer ml-4 flex-shrink-0">
                      <input
                        type="checkbox"
                        id="includePenaltyPayment"
                        checked={includePenaltyPayment}
                        onChange={(e) => {
                          setIncludePenaltyPayment(e.target.checked);
                          setPenaltyPaymentAmount(e.target.checked ? totalPenaltyOwed : 0);
                        }}
                        className="w-4 h-4 text-primary-500 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-white">Collect now</span>
                    </label>
                  </div>

                  {/* Penalty amount + method — only when collecting */}
                  {includePenaltyPayment && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                      <Input
                        label="Penalty Amount (R)"
                        type="number"
                        value={penaltyPaymentAmount}
                        onChange={(e) => setPenaltyPaymentAmount(parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        max={totalPenaltyOwed.toString()}
                        placeholder="Enter penalty amount"
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Penalty Method</label>
                        <select
                          value={penaltyPaymentMethod}
                          onChange={(e) => setPenaltyPaymentMethod(e.target.value)}
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
              )}

              {/* Total line — only when collecting penalty */}
              {includePenaltyPayment && penaltyPaymentAmount > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-600">
                  <div className="space-y-1 text-sm text-gray-400">
                    <div className="flex justify-between">
                      <span>Rent</span>
                      <span>R{paymentAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-orange-300">
                      <span>Penalty</span>
                      <span>R{penaltyPaymentAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-600">
                    <span className="text-white font-semibold">Total collecting today</span>
                    <span className="text-primary-500 font-bold text-xl">R{totalCollecting.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </Card>
          );
        })()}

        {/* Payment Proof Section */}
        <Card>
          <div className="flex items-center space-x-3 mb-4">
            <Image className="w-5 h-5 text-primary-500" />
            <h4 className="text-lg font-semibold text-white">Payment Proof (Optional)</h4>
          </div>
          
          {proofPreview ? (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={proofPreview}
                  alt="Payment proof"
                  className="w-full h-48 object-cover rounded-lg border border-gray-600"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeProof}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-400">
                Payment proof attached: {paymentProof?.name}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Upload a photo or take a picture of the payment receipt/proof
              </p>
              
              {fileError && (
                <p className="text-red-400 text-sm">{fileError}</p>
              )}
              <div className="flex space-x-3">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="proof-upload"
                  />
                  <label
                    htmlFor="proof-upload"
                    className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Photo</span>
                  </label>
                </div>
                
                <Button
                  variant="accent"
                  onClick={handleCameraCapture}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Duplicate payment warning */}
        {duplicateWarning && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-yellow-300 text-sm font-medium">Duplicate Payment Warning</p>
                <p className="text-yellow-400/80 text-sm mt-1">{duplicateWarning}</p>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bypassDuplicate}
                    onChange={e => setBypassDuplicate(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-yellow-300 text-sm">I understand — record this payment anyway</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Inline form error banner */}
        {formError && (
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-red-300 text-sm">{formError}</span>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || (!!duplicateWarning && !bypassDuplicate)}>
            <CheckCircle className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Processing...' : 'Process Payment'}
          </Button>
        </div>
      </form>

      {/* Payment Edit Modal */}
      {showEditForm && editingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <PaymentEdit
              payment={editingPayment}
              scheduleId={paymentSchedule!.id!}
              monthKey={editingPayment.month}
              onSuccess={handleEditSuccess}
              onCancel={handleEditCancel}
            />
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCaptureSuccess}
          onClose={handleCameraClose}
        />
      )}

      {/* Payment Receipt Modal */}
      {showReceipt && receiptData && (
        <PaymentReceiptModal
          amount={receiptData.amount}
          paymentMethod={receiptData.method}
          paymentDate={receiptData.date}
          monthCovered={receiptData.month}
          leaseId={lease.id ?? ''}
          paymentSchedule={receiptData.paymentSchedule}
          renterName={receiptData.renterName}
          roomNumber={receiptData.roomNumber}
          facilityName={receiptData.facilityName}
          penaltyPaid={receiptData.penaltyPaid}
          penaltyMethod={receiptData.penaltyMethod}
          onClose={() => {
            setShowReceipt(false);
            setReceiptData(null);
            onSuccess?.();
          }}
        />
      )}
    </div>
  );
};

export default PaymentCapture;
