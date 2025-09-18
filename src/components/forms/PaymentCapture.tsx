import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, CreditCard, CheckCircle, X, Edit, Camera, Upload, Image, Trash2, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { paymentScheduleService, leaseService } from '../../services/firebaseService';
import { aggregatedPenaltyService } from '../../services/aggregatedPenaltyService';
import PaymentEdit from './PaymentEdit';
import CameraCapture from './CameraCapture';
import PenaltyCalculator from './PenaltyCalculator';
import { Timestamp } from 'firebase/firestore';

// Temporary inline type definitions
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
  const [isPaymentSelectionExpanded, setIsPaymentSelectionExpanded] = useState(false);
  
  // Penalty payment state
  const [includePenaltyPayment, setIncludePenaltyPayment] = useState(false);
  const [penaltyPaymentAmount, setPenaltyPaymentAmount] = useState(0);
  const [penaltyPaymentMethod, setPenaltyPaymentMethod] = useState('cash');

  useEffect(() => {
    loadPaymentSchedule();
  }, [lease]);

  const loadPaymentSchedule = async () => {
    try {
      setIsLoading(true);
      const schedule = await paymentScheduleService.getPaymentScheduleByLease(lease.id!);
      setPaymentSchedule(schedule);
      
      // Set default payment - use preSelectedPayment if provided, otherwise use smart default
      if (schedule) {
        if (preSelectedPayment) {
          // Use the pre-selected payment
          setSelectedPayment(preSelectedPayment.month);
          setPaymentAmount(preSelectedPayment.amount);
        } else {
          // Find the last paid payment (by due date)
          const paidPayments = schedule.payments.filter(p => p.status === 'paid' || p.status === 'partial');
          let lastPaidPayment = null;
          
          if (paidPayments.length > 0) {
            // Sort by due date to find the chronologically last paid payment
            lastPaidPayment = paidPayments.sort((a, b) => {
              const dateA = a.dueDate.toDate();
              const dateB = b.dueDate.toDate();
              return dateB.getTime() - dateA.getTime(); // Sort descending to get the latest
            })[0];
          }
          
          // Find the first payment due after the last paid payment
          let defaultPayment = null;
          
          if (lastPaidPayment) {
            // Find payments that are due after the last paid payment's due date
            const paymentsAfterLastPaid = schedule.payments.filter(p => {
              const paymentDueDate = p.dueDate.toDate();
              const lastPaidDueDate = lastPaidPayment.dueDate.toDate();
              return paymentDueDate > lastPaidDueDate && (p.status === 'pending' || p.status === 'overdue');
            });
            
            if (paymentsAfterLastPaid.length > 0) {
              // Sort by due date ascending to get the first one
              defaultPayment = paymentsAfterLastPaid.sort((a, b) => {
                const dateA = a.dueDate.toDate();
                const dateB = b.dueDate.toDate();
                return dateA.getTime() - dateB.getTime(); // Sort ascending to get the earliest
              })[0];
            }
          } else {
            // If no payments have been paid yet, find the first pending/overdue payment
            const unpaidPayments = schedule.payments.filter(p => p.status === 'pending' || p.status === 'overdue');
            if (unpaidPayments.length > 0) {
              // Sort by due date ascending to get the earliest due payment
              defaultPayment = unpaidPayments.sort((a, b) => {
                const dateA = a.dueDate.toDate();
                const dateB = b.dueDate.toDate();
                return dateA.getTime() - dateB.getTime(); // Sort ascending to get the earliest
              })[0];
            }
          }
          
          // Set the default payment
          if (defaultPayment) {
            setSelectedPayment(defaultPayment.month);
            setPaymentAmount(defaultPayment.amount);
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

  const getMonthName = (monthKey: string) => {
    // Extract year and month from keys like "2025-04"
    const parts = monthKey.split('-');
    if (parts.length === 2) {
      const year = parts[0];
      const month = parseInt(parts[1]);
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return monthNames[month - 1] || monthKey;
    }
    return monthKey;
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
    
    if (!selectedPayment || !paymentSchedule) {
      alert('Please select a payment to process.');
      return;
    }

    if (paymentAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    if (!paymentDate) {
      alert('Please select a payment date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentUpdate: any = {
        status: paymentAmount >= paymentSchedule.payments.find(p => p.month === selectedPayment)?.amount! 
          ? 'paid' : 'partial',
        paidAmount: paymentAmount,
        paymentMethod: paymentMethod,
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

      console.log('PaymentCapture - paymentUpdate:', paymentUpdate);
      console.log('PaymentCapture - selectedPayment:', selectedPayment);
      console.log('PaymentCapture - paymentSchedule.id:', paymentSchedule.id);

      await paymentScheduleService.updatePaymentInSchedule(
        paymentSchedule.id!,
        selectedPayment,
        paymentUpdate
      );

      // Calculate penalty for this late payment
      const selectedPaymentData = paymentSchedule.payments.find(p => p.month === selectedPayment);
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
      
      onSuccess?.();
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Failed to process payment. Please try again.');
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
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB.');
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
    console.log('Camera capture success, file:', file);
    setPaymentProof(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('Preview created:', e.target?.result);
      setProofPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    setShowCamera(false);
  };

  const removeProof = () => {
    setPaymentProof(null);
    setProofPreview(null);
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
            <p className="text-gray-400">Lease ID: {lease.id}</p>
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
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Payment Selection</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaymentSelectionExpanded(!isPaymentSelectionExpanded)}
              className="flex items-center space-x-2"
            >
              <span className="text-sm">
                {isPaymentSelectionExpanded ? 'Collapse' : 'Change Payment'}
              </span>
              {isPaymentSelectionExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Selected Payment Display */}
          {selectedPayment && (
            <div className="mb-4 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-primary-500" />
                  <div>
                    <span className="text-white font-medium text-lg">
                      {paymentSchedule.payments.find(p => p.month === selectedPayment)?.type === 'deposit' 
                        ? 'Deposit' 
                        : `Month ${selectedPayment} (${getMonthName(selectedPayment)})`
                      }
                    </span>
                    <p className="text-sm text-gray-400">
                      Due: {formatDate(paymentSchedule.payments.find(p => p.month === selectedPayment)?.dueDate)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-white font-bold text-lg">
                    R{paymentSchedule.payments.find(p => p.month === selectedPayment)?.amount.toLocaleString()}
                  </span>
                  <div className="mt-1">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getPaymentStatusColor(paymentSchedule.payments.find(p => p.month === selectedPayment)?.status || 'pending')
                    }`}>
                      {paymentSchedule.payments.find(p => p.month === selectedPayment)?.status.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Collapsible Payment List */}
          {isPaymentSelectionExpanded && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {paymentSchedule.payments.map((payment) => (
                <div 
                  key={payment.month} 
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPayment === payment.month 
                      ? 'border-primary-500 bg-primary-500/10' 
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => {
                    setSelectedPayment(payment.month);
                    setPaymentAmount(payment.amount);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        payment.type === 'deposit' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <span className="text-white font-medium">
                          {payment.type === 'deposit' ? 'Deposit' : `Month ${payment.month} (${getMonthName(payment.month)})`}
                        </span>
                        <p className="text-xs text-gray-400">
                          Due: {formatDate(payment.dueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-center">
                        <span className="text-white font-medium">R{payment.amount.toLocaleString()}</span>
                        
                        {/* Payment Status with Details */}
                        <div className="mt-1 space-y-1">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                            {payment.status.replace('_', ' ').toUpperCase()}
                          </div>
                          
                          {/* Show paid amount and remaining for partial payments */}
                          {payment.status === 'partial' && payment.paidAmount && (
                            <div className="text-xs text-gray-400">
                              Paid: R{payment.paidAmount.toLocaleString()}
                              <br />
                              Owed: R{(payment.amount - payment.paidAmount).toLocaleString()}
                            </div>
                          )}
                          
                          {/* Show payment date for paid/partial payments */}
                          {(payment.status === 'paid' || payment.status === 'partial') && payment.paidDate && (
                            <div className="text-xs text-gray-400">
                              Paid: {formatDate(payment.paidDate)}
                            </div>
                          )}
                          
                          {/* Show payment method if available */}
                          {payment.paymentMethod && (payment.status === 'paid' || payment.status === 'partial') && (
                            <div className="text-xs text-gray-400 capitalize">
                              {payment.paymentMethod.replace('_', ' ')}
                            </div>
                          )}
                        </div>
                      </div>
                      {(payment.status === 'paid' || payment.status === 'partial' || payment.status === 'pending_approval') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPayment(payment)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payment Details */}
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">
            Payment Details for {selectedPayment ? (
              paymentSchedule.payments.find(p => p.month === selectedPayment)?.type === 'deposit' 
                ? 'Deposit' 
                : `Month ${selectedPayment} (${getMonthName(selectedPayment)})`
            ) : 'Selected Payment'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Payment Amount (R)"
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              min="0"
              required
            />
            <Input
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
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
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="Any additional notes about this payment..."
              />
            </div>
          </div>
        </Card>

        {/* Penalty Calculator */}
        {selectedPayment && paymentDate && (
          <PenaltyCalculator
            dueDate={paymentSchedule.payments.find(p => p.month === selectedPayment)?.dueDate.toDate() || new Date()}
            paidDate={new Date(paymentDate)}
            businessRules={{
              lateFeeAmount: lease.businessRules?.lateFeeAmount || 0,
              lateFeeStartDay: lease.businessRules?.lateFeeStartDay || 0,
              gracePeriodDays: lease.businessRules?.gracePeriodDays || 0,
            }}
            baseAmount={paymentAmount}
            showDetails={true}
          />
        )}

        {/* Aggregated Penalty Payment Section */}
        {paymentSchedule.aggregatedPenalty && paymentSchedule.aggregatedPenalty.outstandingAmount > 0 && (
          <Card>
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <h4 className="text-lg font-semibold text-white">Outstanding Penalties</h4>
            </div>
            
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-yellow-400 font-medium">Total Outstanding Penalties:</span>
                  <span className="text-yellow-400 font-bold text-lg">R{paymentSchedule.aggregatedPenalty.outstandingAmount.toLocaleString()}</span>
                </div>
                <div className="text-sm text-gray-400">
                  Paid: R{paymentSchedule.aggregatedPenalty.paidAmount.toLocaleString()} | 
                  Total: R{paymentSchedule.aggregatedPenalty.totalAmount.toLocaleString()}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="includePenaltyPayment"
                  checked={includePenaltyPayment}
                  onChange={(e) => {
                    setIncludePenaltyPayment(e.target.checked);
                    if (e.target.checked) {
                      setPenaltyPaymentAmount(paymentSchedule.aggregatedPenalty.outstandingAmount);
                    } else {
                      setPenaltyPaymentAmount(0);
                    }
                  }}
                  className="w-4 h-4 text-primary-500 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="includePenaltyPayment" className="text-white">
                  Include penalty payment with this transaction
                </label>
              </div>

              {includePenaltyPayment && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Penalty Payment Amount (R)"
                    type="number"
                    value={penaltyPaymentAmount}
                    onChange={(e) => setPenaltyPaymentAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    max={paymentSchedule.aggregatedPenalty.outstandingAmount}
                    placeholder="Enter penalty amount"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
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
          </Card>
        )}

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

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
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
    </div>
  );
};

export default PaymentCapture;
