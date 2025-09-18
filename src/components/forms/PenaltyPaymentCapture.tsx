import React, { useState } from 'react';
import { DollarSign, X, AlertTriangle, Calendar, CreditCard } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { aggregatedPenaltyService } from '../../services/aggregatedPenaltyService';
import { paymentScheduleService } from '../../services/firebaseService';

interface PenaltyPaymentCaptureProps {
  penaltyTransaction: {
    id: string;
    leaseId: string;
    facilityId: string;
    roomId: string;
    renterId: string;
    amount: number;
    paidAmount: number;
    outstandingAmount: number;
    facilityName: string;
    roomNumber: string;
    renterName: string;
  };
  scheduleId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PenaltyPaymentCapture: React.FC<PenaltyPaymentCaptureProps> = ({
  penaltyTransaction,
  scheduleId,
  onSuccess,
  onCancel
}) => {
  const [penaltyAmount, setPenaltyAmount] = useState<number>(penaltyTransaction.outstandingAmount);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'eft', label: 'EFT' },
    { value: 'mobile', label: 'Mobile Payment' },
    { value: 'card', label: 'Card Payment' },
    { value: 'bank_transfer', label: 'Bank Transfer' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (penaltyAmount <= 0) {
      alert('Please enter a valid penalty amount');
      return;
    }

    if (penaltyAmount > penaltyTransaction.outstandingAmount) {
      alert('Penalty amount cannot exceed outstanding amount');
      return;
    }

    setIsSubmitting(true);
    try {
      // Process penalty payment using the aggregated penalty service
      await aggregatedPenaltyService.processPenaltyPayment(
        scheduleId,
        penaltyAmount,
        paymentMethod,
        notes || `Penalty payment for ${penaltyTransaction.facilityName} - Room ${penaltyTransaction.roomNumber}`
      );

      console.log('Penalty payment processed successfully');
      onSuccess?.();
    } catch (error) {
      console.error('Error processing penalty payment:', error);
      alert('Failed to process penalty payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                {penaltyTransaction.paidAmount > 0 ? 'Additional Penalty Payment' : 'Penalty Payment Capture'}
              </h2>
              <p className="text-gray-400">{penaltyTransaction.facilityName} - Room {penaltyTransaction.roomNumber}</p>
              <p className="text-gray-400">{penaltyTransaction.renterName}</p>
              {penaltyTransaction.paidAmount > 0 && (
                <p className="text-yellow-400 text-sm mt-1">
                  Partial payment already made: {formatCurrency(penaltyTransaction.paidAmount)}
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Penalty Summary */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Penalty Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-medium">Outstanding Penalty</span>
                </div>
                <p className="text-red-400 font-bold text-2xl">{formatCurrency(penaltyTransaction.outstandingAmount)}</p>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Already Paid</span>
                </div>
                <p className="text-green-400 font-bold text-2xl">{formatCurrency(penaltyTransaction.paidAmount)}</p>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                  <span className="text-blue-400 font-medium">Total Penalties</span>
                </div>
                <p className="text-blue-400 font-bold text-2xl">{formatCurrency(penaltyTransaction.amount + penaltyTransaction.paidAmount)}</p>
              </div>
            </div>
          </Card>

          {/* Payment Details */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Payment Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {penaltyTransaction.paidAmount > 0 ? 'Additional Penalty Amount to Pay *' : 'Penalty Amount to Pay *'}
                </label>
                <Input
                  type="number"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                  placeholder={penaltyTransaction.paidAmount > 0 ? "Enter additional penalty amount" : "Enter penalty amount"}
                  min="0"
                  max={penaltyTransaction.outstandingAmount}
                  required
                />
                <p className="text-sm text-gray-400 mt-1">
                  {penaltyTransaction.paidAmount > 0 ? 'Remaining amount: ' : 'Maximum: '}{formatCurrency(penaltyTransaction.outstandingAmount)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  {paymentMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Date *
                </label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes about this penalty payment..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || penaltyAmount <= 0}
            >
              {isSubmitting ? 'Processing...' : 
                penaltyTransaction.paidAmount > 0 ? 
                  `Pay Additional ${formatCurrency(penaltyAmount)}` : 
                  `Pay ${formatCurrency(penaltyAmount)} Penalty`
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PenaltyPaymentCapture;
