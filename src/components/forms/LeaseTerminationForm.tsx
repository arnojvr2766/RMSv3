import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, DollarSign, Receipt, User, Calendar, FileText, ClipboardCheck } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { leaseTerminationService } from '../../services/leaseTerminationService';
import InspectionForm from './InspectionForm';

// Define interfaces locally to avoid import issues
interface LeaseTerminationData {
  leaseId: string;
  terminationDate: Date;
  terminationReason: 'end_of_term' | 'mid_term' | 'breach' | 'mutual_agreement' | 'other';
  terminationNotes?: string;
  outstandingPayments: OutstandingPayment[];
  depositRefund: DepositRefundData;
  additionalCharges: AdditionalCharge[];
  finalSettlement: FinalSettlement;
}

interface OutstandingPayment {
  month: string;
  dueDate: Date;
  amount: number;
  type: 'rent' | 'late_fee' | 'penalty';
  status: 'pending' | 'overdue';
  daysOverdue?: number;
  prorationDetails?: {
    isProrated: boolean;
    daysOccupied: number;
    daysInMonth: number;
    dailyRate: number;
    fullMonthAmount: number;
  };
}

interface DepositRefundData {
  originalDepositAmount: number;
  refundAmount: number;
  deductions: DepositDeduction[];
  refundMethod: 'cash' | 'bank_transfer' | 'check';
  refundDate?: Date;
  refundNotes?: string;
}

interface DepositDeduction {
  reason: string;
  amount: number;
  description?: string;
}

interface AdditionalCharge {
  description: string;
  amount: number;
  category: 'cleaning' | 'repairs' | 'utilities' | 'other';
  notes?: string;
}

interface FinalSettlement {
  totalOutstanding: number;
  totalAdditionalCharges: number;
  depositRefundAmount: number;
  netAmount: number; // Positive = tenant owes, Negative = landlord owes
  settlementNotes?: string;
}

interface LeaseTerminationFormProps {
  leaseId: string;
  roomId: string;
  facilityId: string;
  renterId: string;
  renterName: string;
  roomNumber: string;
  facilityName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const LeaseTerminationForm: React.FC<LeaseTerminationFormProps> = ({
  leaseId,
  roomId,
  facilityId,
  renterId,
  renterName,
  roomNumber,
  facilityName,
  onSuccess,
  onCancel
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showInspection, setShowInspection] = useState(false);
  const [terminationData, setTerminationData] = useState<LeaseTerminationData | null>(null);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    terminationDate: new Date().toISOString().split('T')[0],
    terminationReason: 'end_of_term' as const,
    terminationNotes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Additional charges
  const [newCharge, setNewCharge] = useState({
    description: '',
    amount: 0,
    category: 'other' as const,
    notes: ''
  });

  // Deposit refund updates
  const [depositUpdates, setDepositUpdates] = useState<Partial<DepositRefundData>>({});

  const terminationReasons = [
    { value: 'end_of_term', label: 'End of Term' },
    { value: 'mid_term', label: 'Mid-Term Termination' },
    { value: 'breach', label: 'Lease Breach' },
    { value: 'mutual_agreement', label: 'Mutual Agreement' },
    { value: 'other', label: 'Other' }
  ];

  const chargeCategories = [
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'repairs', label: 'Repairs' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'other', label: 'Other' }
  ];

  const refundMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'check', label: 'Check' }
  ];

  // Calculate termination when form data changes
  useEffect(() => {
    if (formData.terminationDate && formData.terminationReason) {
      calculateTermination();
    }
  }, [formData.terminationDate, formData.terminationReason]);

  const calculateTermination = async () => {
    setIsCalculating(true);
    try {
      const result = await leaseTerminationService.calculateTermination(
        leaseId,
        new Date(formData.terminationDate),
        formData.terminationReason,
        formData.terminationNotes
      );
      
      setCalculationResult(result);
      setTerminationData(result.terminationData);
    } catch (error) {
      console.error('Error calculating termination:', error);
      alert('Failed to calculate termination. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addAdditionalCharge = () => {
    if (!newCharge.description || newCharge.amount <= 0) {
      alert('Please enter description and amount for the charge');
      return;
    }

    if (!terminationData) return;

    const charge: AdditionalCharge = {
      description: newCharge.description,
      amount: newCharge.amount,
      category: newCharge.category,
      notes: newCharge.notes
    };

    const updatedData = leaseTerminationService.addAdditionalCharge(terminationData, charge);
    setTerminationData(updatedData);

    // Reset form
    setNewCharge({
      description: '',
      amount: 0,
      category: 'other',
      notes: ''
    });
  };

  const removeAdditionalCharge = (index: number) => {
    if (!terminationData) return;

    const updatedCharges = terminationData.additionalCharges.filter((_, i) => i !== index);
    const updatedData = {
      ...terminationData,
      additionalCharges: updatedCharges
    };

    // Recalculate settlement
    updatedData.finalSettlement = leaseTerminationService.calculateFinalSettlement(
      updatedData.outstandingPayments,
      updatedData.additionalCharges,
      updatedData.depositRefund
    );

    setTerminationData(updatedData);
  };

  const updateDepositRefund = (updates: Partial<DepositRefundData>) => {
    if (!terminationData) return;

    const updatedData = leaseTerminationService.updateDepositRefund(terminationData, updates);
    setTerminationData(updatedData);
    setDepositUpdates(updates);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.terminationDate) {
      newErrors.terminationDate = 'Termination date is required';
    }

    if (!formData.terminationReason) {
      newErrors.terminationReason = 'Termination reason is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !terminationData) {
      return;
    }

    setIsLoading(true);
    try {
      await leaseTerminationService.processTermination(terminationData, 'current_user');
      onSuccess();
    } catch (error) {
      console.error('Error processing termination:', error);
      alert('Failed to process termination. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{zIndex: 9999}}>
      <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white">Lease Termination</h2>
          <Button variant="ghost" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Lease Info */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Renter</p>
                <p className="text-white font-medium">{renterName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">Room</p>
                <p className="text-white font-medium">{roomNumber}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Facility</p>
                <p className="text-white font-medium">{facilityName}</p>
              </div>
            </div>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Termination Details */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Termination Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Termination Date"
                type="date"
                value={formData.terminationDate}
                onChange={(e) => handleInputChange('terminationDate', e.target.value)}
                error={errors.terminationDate}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Termination Reason
                </label>
                <select
                  value={formData.terminationReason}
                  onChange={(e) => handleInputChange('terminationReason', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {terminationReasons.map(reason => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <Input
                label="Termination Notes"
                type="textarea"
                value={formData.terminationNotes}
                onChange={(e) => handleInputChange('terminationNotes', e.target.value)}
                placeholder="Additional notes about the termination..."
              />
            </div>
          </Card>

          {/* Post-Inspection Prompt */}
          <Card className="border-blue-500/50 bg-blue-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <ClipboardCheck className="w-6 h-6 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-blue-400 font-medium">Post-Inspection Required</h4>
                  <p className="text-blue-300 text-sm mt-1">
                    A post-inspection documents the room's condition at move-out. Inspection costs are automatically deducted from the deposit refund.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowInspection(true)}
                className="ml-4 flex-shrink-0"
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Start Inspection
              </Button>
            </div>
          </Card>

          {/* Calculation Results */}
          {isCalculating && (
            <Card>
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-white">Calculating termination...</span>
              </div>
            </Card>
          )}

          {calculationResult && terminationData && (
            <>
              {/* Warnings and Recommendations */}
              {calculationResult.warnings.length > 0 && (
                <Card className="border-yellow-500/50 bg-yellow-500/10">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div>
                      <h4 className="text-yellow-400 font-medium mb-2">Warnings</h4>
                      <ul className="text-yellow-300 text-sm space-y-1">
                        {calculationResult.warnings.map((warning: string, index: number) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              {calculationResult.recommendations.length > 0 && (
                <Card className="border-blue-500/50 bg-blue-500/10">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="text-blue-400 font-medium mb-2">Recommendations</h4>
                      <ul className="text-blue-300 text-sm space-y-1">
                        {calculationResult.recommendations.map((rec: string, index: number) => (
                          <li key={index}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              {/* Outstanding Payments */}
              {terminationData.outstandingPayments.length > 0 && (
                <Card>
                  <h3 className="text-lg font-semibold text-white mb-4">Outstanding Payments</h3>
                  <div className="space-y-3">
                    {terminationData.outstandingPayments.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                        <div>
                          <p className="text-white font-medium">{payment.month}</p>
                          <p className="text-sm text-gray-400">
                            Due: {payment.dueDate.toLocaleDateString()}
                            {payment.daysOverdue && (
                              <span className="ml-2 text-red-400">
                                ({payment.daysOverdue} days overdue)
                              </span>
                            )}
                          </p>
                          {payment.prorationDetails?.isProrated && (
                            <p className="text-xs text-blue-400">
                              Prorated: {payment.prorationDetails.daysOccupied}/{payment.prorationDetails.daysInMonth} days
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">R{payment.amount.toLocaleString()}</p>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            payment.status === 'overdue' 
                              ? 'bg-red-500/20 text-red-400' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Deposit Refund */}
              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Deposit Refund</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Original Deposit</p>
                      <p className="text-white font-semibold">R{terminationData.depositRefund.originalDepositAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Refund Amount</p>
                      <p className="text-white font-semibold">R{terminationData.depositRefund.refundAmount.toLocaleString()}</p>
                    </div>
                  </div>

                  {terminationData.depositRefund.deductions.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Deductions</p>
                      <div className="space-y-2">
                        {terminationData.depositRefund.deductions.map((deduction, index) => (
                          <div key={index} className="flex justify-between bg-gray-700 rounded p-2">
                            <div>
                              <p className="text-white text-sm">{deduction.reason}</p>
                              {deduction.description && (
                                <p className="text-gray-400 text-xs">{deduction.description}</p>
                              )}
                            </div>
                            <p className="text-red-400 font-medium">-R{deduction.amount.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Refund Method
                      </label>
                      <select
                        value={terminationData.depositRefund.refundMethod}
                        onChange={(e) => updateDepositRefund({ refundMethod: e.target.value as any })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {refundMethods.map(method => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Input
                        label="Refund Notes"
                        value={terminationData.depositRefund.refundNotes || ''}
                        onChange={(e) => updateDepositRefund({ refundNotes: e.target.value })}
                        placeholder="Notes about the refund..."
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Additional Charges */}
              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Additional Charges</h3>
                
                {/* Add New Charge */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <Input
                    label="Description"
                    value={newCharge.description}
                    onChange={(e) => setNewCharge(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Cleaning fee"
                  />
                  <Input
                    label="Amount (R)"
                    type="number"
                    value={newCharge.amount}
                    onChange={(e) => setNewCharge(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={newCharge.category}
                      onChange={(e) => setNewCharge(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {chargeCategories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addAdditionalCharge}
                      disabled={!newCharge.description || newCharge.amount <= 0}
                    >
                      Add Charge
                    </Button>
                  </div>
                </div>

                {/* Existing Charges */}
                {terminationData.additionalCharges.length > 0 && (
                  <div className="space-y-2">
                    {terminationData.additionalCharges.map((charge, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                        <div>
                          <p className="text-white font-medium">{charge.description}</p>
                          <p className="text-sm text-gray-400 capitalize">{charge.category}</p>
                          {charge.notes && (
                            <p className="text-xs text-gray-500">{charge.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <p className="text-white font-semibold">R{charge.amount.toLocaleString()}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAdditionalCharge(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Final Settlement */}
              <Card className="border-green-500/50 bg-green-500/10">
                <h3 className="text-lg font-semibold text-white mb-4">Final Settlement</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Outstanding Payments:</span>
                    <span className="text-white">R{terminationData.finalSettlement.totalOutstanding.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Additional Charges:</span>
                    <span className="text-white">R{terminationData.finalSettlement.totalAdditionalCharges.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Deposit Refund:</span>
                    <span className="text-green-400">-R{terminationData.finalSettlement.depositRefundAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-3">
                    <div className="flex justify-between">
                      <span className="text-white font-semibold">Net Amount:</span>
                      <span className={`font-bold text-lg ${
                        terminationData.finalSettlement.netAmount > 0 
                          ? 'text-red-400' 
                          : terminationData.finalSettlement.netAmount < 0 
                            ? 'text-green-400' 
                            : 'text-white'
                      }`}>
                        {terminationData.finalSettlement.netAmount > 0 
                          ? `R${terminationData.finalSettlement.netAmount.toLocaleString()} (Tenant owes)`
                          : terminationData.finalSettlement.netAmount < 0 
                            ? `R${Math.abs(terminationData.finalSettlement.netAmount).toLocaleString()} (Landlord owes)`
                            : 'R0 (Settled)'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !terminationData}
            >
              {isLoading ? 'Processing...' : 'Process Termination'}
            </Button>
          </div>
        </form>
      </div>

      {/* Post-Inspection Modal */}
      {showInspection && (
        <InspectionForm
          leaseId={leaseId}
          facilityId={facilityId}
          roomId={roomId}
          renterId={renterId}
          inspectionType="post"
          onSuccess={() => setShowInspection(false)}
          onCancel={() => setShowInspection(false)}
        />
      )}
    </div>
  );
};

export default LeaseTerminationForm;
