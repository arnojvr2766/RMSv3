import React, { useState } from 'react';
import { X, DollarSign, Receipt, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';

interface DepositRefundCaptureProps {
  refundAmount: number;
  refundMethod: 'cash' | 'bank_transfer' | 'check';
  onSuccess: (refundData: DepositRefundData) => void;
  onCancel: () => void;
}

interface DepositRefundData {
  refundAmount: number;
  refundMethod: 'cash' | 'bank_transfer' | 'check';
  refundDate: Date;
  refundNotes?: string;
  paymentProof?: string;
}

const DepositRefundCapture: React.FC<DepositRefundCaptureProps> = ({
  refundAmount,
  refundMethod,
  onSuccess,
  onCancel
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    refundAmount,
    refundMethod,
    refundDate: new Date().toISOString().split('T')[0],
    refundNotes: '',
    paymentProof: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const refundMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'check', label: 'Check' }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.refundDate) {
      newErrors.refundDate = 'Refund date is required';
    }

    if (formData.refundAmount <= 0) {
      newErrors.refundAmount = 'Refund amount must be greater than 0';
    }

    if (!formData.refundMethod) {
      newErrors.refundMethod = 'Refund method is required';
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
      const refundData: DepositRefundData = {
        refundAmount: formData.refundAmount,
        refundMethod: formData.refundMethod,
        refundDate: new Date(formData.refundDate),
        refundNotes: formData.refundNotes,
        paymentProof: formData.paymentProof
      };

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSuccess(refundData);
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('Failed to process refund. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{zIndex: 9999}}>
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-8 h-8 text-green-500" />
            <div>
              <h2 className="text-2xl font-semibold text-white">Deposit Refund Capture</h2>
              <p className="text-gray-400">Process deposit refund payment</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Refund Summary */}
          <Card className="border-green-500/50 bg-green-500/10">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Refund Summary</h3>
                <p className="text-green-300">Amount to be refunded: <span className="font-bold">R{refundAmount.toLocaleString()}</span></p>
              </div>
            </div>
          </Card>

          {/* Refund Details */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Refund Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Refund Amount (R)"
                  type="number"
                  value={formData.refundAmount}
                  onChange={(e) => handleInputChange('refundAmount', parseFloat(e.target.value) || 0)}
                  error={errors.refundAmount}
                  min="0"
                  step="0.01"
                  required
                />
                <Input
                  label="Refund Date"
                  type="date"
                  value={formData.refundDate}
                  onChange={(e) => handleInputChange('refundDate', e.target.value)}
                  error={errors.refundDate}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Refund Method
                </label>
                <select
                  value={formData.refundMethod}
                  onChange={(e) => handleInputChange('refundMethod', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {refundMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Refund Notes"
                type="textarea"
                value={formData.refundNotes}
                onChange={(e) => handleInputChange('refundNotes', e.target.value)}
                placeholder="Additional notes about the refund..."
                rows={3}
              />

              <Input
                label="Payment Proof (Optional)"
                value={formData.paymentProof}
                onChange={(e) => handleInputChange('paymentProof', e.target.value)}
                placeholder="Reference number, receipt number, etc."
              />
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Process Refund'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepositRefundCapture;
