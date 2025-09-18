import React, { useState } from 'react';
import { Edit, Save, X, DollarSign, Calendar, CreditCard, Trash2, Image } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { paymentScheduleService } from '../../services/firebaseService';
import { useRole } from '../../contexts/RoleContext';
import { Timestamp } from 'firebase/firestore';

// Temporary inline type definitions
interface Payment {
  month: string;
  dueDate: any;
  amount: number;
  type: 'rent' | 'deposit' | 'late_fee';
  status: 'pending' | 'paid' | 'overdue' | 'partial' | 'pending_approval';
  paidAmount?: number;
  paidDate?: any;
  lateFee?: number;
  paymentMethod?: string;
  notes?: string;
  paymentProof?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    data: string; // base64
    uploadedAt: any;
  };
  editedBy?: string;
  editedAt?: any;
  originalValues?: {
    paidAmount?: number;
    paidDate?: any;
    paymentMethod?: string;
  };
}

interface PaymentEditProps {
  payment: Payment;
  scheduleId: string;
  monthKey: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentEdit: React.FC<PaymentEditProps> = ({
  payment,
  scheduleId,
  monthKey,
  onSuccess,
  onCancel
}) => {
  const { currentRole } = useRole();
  
  // Debug: Log the payment data to see what we're receiving
  console.log('PaymentEdit received payment data:', payment);
  console.log('Payment proof data:', payment.paymentProof);
  const [formData, setFormData] = useState({
    paidAmount: payment.paidAmount || 0,
    paidDate: payment.paidDate 
      ? (payment.paidDate instanceof Timestamp 
          ? payment.paidDate.toDate().toISOString().split('T')[0]
          : new Date(payment.paidDate).toISOString().split('T')[0])
      : '',
    paymentMethod: payment.paymentMethod || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.paidAmount < 0) {
      newErrors.paidAmount = 'Paid amount cannot be negative';
    }

    if (formData.paidAmount > payment.amount) {
      newErrors.paidAmount = 'Paid amount cannot exceed the total amount';
    }

    if (formData.paidAmount > 0 && !formData.paidDate) {
      newErrors.paidDate = 'Payment date is required when amount is greater than 0';
    }

    if (formData.paidAmount > 0 && !formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required when amount is greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const originalValues = {
        paidAmount: payment.paidAmount,
        paidDate: payment.paidDate,
        paymentMethod: payment.paymentMethod,
      };

      const newValues: any = {
        paidAmount: formData.paidAmount,
        paymentMethod: formData.paymentMethod,
        status: formData.paidAmount > 0 ? 'paid' : 'pending',
      };

      // Only add paidDate if it has a value
      if (formData.paidDate) {
        newValues.paidDate = Timestamp.fromDate(new Date(formData.paidDate));
      }

      console.log('PaymentEdit - newValues:', newValues);
      console.log('PaymentEdit - originalValues:', originalValues);

      // Check if this is a system admin (can edit directly) or standard user (needs approval)
      if (currentRole === 'system_admin') {
        // System admin can edit directly
        await paymentScheduleService.updatePaymentInSchedule(
          scheduleId,
          monthKey,
          newValues,
          'system_admin'
        );
      } else {
        // Standard user needs approval
        await paymentScheduleService.createPaymentApproval(
          scheduleId,
          monthKey,
          originalValues,
          newValues,
          'standard_user'
        );
        
        // Update the payment status to pending_approval
        await paymentScheduleService.updatePaymentInSchedule(
          scheduleId,
          monthKey,
          { ...newValues, status: 'pending_approval' },
          'standard_user'
        );
      }

      onSuccess();
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Failed to update payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePayment = async () => {
    if (!confirm('Are you sure you want to remove this payment? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      await paymentScheduleService.removePayment(
        scheduleId,
        monthKey,
        'system_admin'
      );
      
      onSuccess();
    } catch (error) {
      console.error('Error removing payment:', error);
      alert('Failed to remove payment. Please try again.');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Edit className="w-8 h-8 text-accent-blue-500" />
          <div>
            <h3 className="text-xl font-semibold text-white">Edit Payment</h3>
            <p className="text-gray-400">
              {payment.month} - {payment.type === 'rent' ? 'Rent' : payment.type === 'deposit' ? 'Deposit' : 'Late Fee'}
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Payment Details */}
      <Card>
        <h4 className="text-lg font-semibold text-white mb-4">Payment Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Due Date
            </label>
            <p className="text-white">{formatDate(payment.dueDate)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Total Amount
            </label>
            <p className="text-white font-semibold">R {payment.amount.toLocaleString()}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Current Status
            </label>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              payment.status === 'paid' 
                ? 'bg-success/20 text-success'
                : payment.status === 'pending_approval'
                ? 'bg-warning/20 text-warning'
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {payment.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          {payment.editedBy && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Last Edited By
              </label>
              <p className="text-white">{payment.editedBy}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Payment Proof Photo */}
      {payment.paymentProof && (
        <Card>
          <div className="flex items-center space-x-3 mb-4">
            <Image className="w-5 h-5 text-primary-500" />
            <h4 className="text-lg font-semibold text-white">Payment Proof</h4>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <img
                src={payment.paymentProof.data}
                alt="Payment proof"
                className="w-full max-w-md h-64 object-cover rounded-lg border border-gray-600"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">File Name</label>
                <p className="text-white">{payment.paymentProof.fileName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">File Size</label>
                <p className="text-white">{(payment.paymentProof.fileSize / 1024).toFixed(1)} KB</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Uploaded</label>
                <p className="text-white">{formatDate(payment.paymentProof.uploadedAt)}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Payment Notes */}
      {payment.notes && (
        <Card>
          <h4 className="text-lg font-semibold text-white mb-4">Payment Notes</h4>
          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-white">{payment.notes}</p>
          </div>
        </Card>
      )}

      {/* Edit Form */}
      <Card>
        <h4 className="text-lg font-semibold text-white mb-4">Edit Payment Information</h4>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Paid Amount (R)
            </label>
            <Input
              type="number"
              value={formData.paidAmount}
              onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
              min="0"
              max={payment.amount}
              step="0.01"
              error={errors.paidAmount}
              placeholder="Enter amount paid"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Date
            </label>
            <Input
              type="date"
              value={formData.paidDate}
              onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
              error={errors.paidDate}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Method
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select payment method</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </select>
            {errors.paymentMethod && (
              <p className="mt-1 text-sm text-error">{errors.paymentMethod}</p>
            )}
          </div>

          {/* Role-based messaging */}
          <div className="p-4 bg-gray-700 rounded-lg">
            {currentRole === 'system_admin' ? (
              <div className="flex items-center space-x-2 text-success">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <p className="text-sm">As a system admin, your changes will be applied immediately.</p>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-warning">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <p className="text-sm">As a standard user, your changes will require system admin approval.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            {/* Remove Payment Button (System Admin only) */}
            {currentRole === 'system_admin' && (payment.status === 'paid' || payment.status === 'partial') && (
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleRemovePayment}
                disabled={isLoading}
                className="text-error hover:bg-error/20"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-error mr-2"></div>
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Payment
                  </>
                )}
              </Button>
            )}
            
            {/* Action Buttons */}
            <div className="flex space-x-4 ml-auto">
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {currentRole === 'system_admin' ? 'Updating...' : 'Submitting for Approval...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {currentRole === 'system_admin' ? 'Update Payment' : 'Submit for Approval'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default PaymentEdit;
