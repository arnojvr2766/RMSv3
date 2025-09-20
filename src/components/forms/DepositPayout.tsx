import React, { useState, useEffect } from 'react';
import { DollarSign, X, Save, Calculator, FileText, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { 
  depositPayoutService, 
  maintenanceExpenseService,
  paymentScheduleService 
} from '../../services/firebaseService';
import { Timestamp } from 'firebase/firestore';
import { useRole } from '../../contexts/RoleContext';

// Interfaces
interface LeaseAgreement {
  id: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  terms: {
    depositAmount: number;
    startDate: any;
    endDate: any;
  };
}

interface MaintenanceExpense {
  id: string;
  description: string;
  roomCosts: {
    roomId: string;
    amount: number;
    recoverFromDeposit: boolean;
  }[];
  expenseDate: any;
  totalAmount: number;
}

interface DepositPayoutProps {
  lease: LeaseAgreement;
  onSuccess: () => void;
  onCancel: () => void;
}

const DepositPayout: React.FC<DepositPayoutProps> = ({ lease, onSuccess, onCancel }) => {
  const { currentRole } = useRole();
  
  // Form state
  const [formData, setFormData] = useState({
    payoutAmount: lease.terms.depositAmount,
    deductionAmount: 0,
    deductionReason: '',
    payoutDate: new Date().toISOString().split('T')[0],
    payoutMethod: 'bank_transfer',
  });

  // Maintenance expenses for this room
  const [maintenanceExpenses, setMaintenanceExpenses] = useState<MaintenanceExpense[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  useEffect(() => {
    loadMaintenanceExpenses();
  }, []);

  const loadMaintenanceExpenses = async () => {
    try {
      setLoadingExpenses(true);
      const expenses = await maintenanceExpenseService.getMaintenanceExpensesByRoom(lease.roomId);
      
      // Filter expenses that should be recovered from deposit
      const recoverableExpenses = expenses.filter(expense =>
        expense.roomCosts.some(cost => 
          cost.roomId === lease.roomId && cost.recoverFromDeposit
        )
      );
      
      setMaintenanceExpenses(recoverableExpenses);
    } catch (error) {
      console.error('Error loading maintenance expenses:', error);
    } finally {
      setLoadingExpenses(false);
    }
  };

  // Calculate total deductions
  const calculateDeductions = () => {
    const expenseDeductions = selectedExpenses.reduce((total, expenseId) => {
      const expense = maintenanceExpenses.find(e => e.id === expenseId);
      if (expense) {
        const roomCost = expense.roomCosts.find(cost => cost.roomId === lease.roomId);
        return total + (roomCost?.amount || 0);
      }
      return total;
    }, 0);

    const manualDeduction = formData.deductionAmount || 0;
    return expenseDeductions + manualDeduction;
  };

  // Update payout amount when deductions change
  useEffect(() => {
    const totalDeductions = calculateDeductions();
    const newPayoutAmount = Math.max(0, lease.terms.depositAmount - totalDeductions);
    setFormData(prev => ({
      ...prev,
      payoutAmount: newPayoutAmount
    }));
  }, [selectedExpenses, formData.deductionAmount, lease.terms.depositAmount]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExpenseToggle = (expenseId: string) => {
    setSelectedExpenses(prev =>
      prev.includes(expenseId)
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.payoutAmount < 0) {
      alert('Payout amount cannot be negative.');
      return;
    }

    if (!formData.payoutDate) {
      alert('Please select a payout date.');
      return;
    }

    setIsLoading(true);

    try {
      const totalDeductions = calculateDeductions();
      
      // Create deposit payout record
      const payoutData = {
        leaseId: lease.id,
        facilityId: lease.facilityId,
        roomId: lease.roomId,
        renterId: lease.renterId,
        depositAmount: lease.terms.depositAmount,
        payoutAmount: formData.payoutAmount,
        deductionAmount: totalDeductions,
        deductionReason: formData.deductionReason || 'Maintenance expenses and other deductions',
        maintenanceExpenses: selectedExpenses,
        payoutDate: Timestamp.fromDate(new Date(formData.payoutDate)),
        payoutMethod: formData.payoutMethod,
        processedBy: currentRole || 'system_admin',
        status: 'completed' as const,
      };

      await depositPayoutService.createDepositPayout(payoutData);

      // If there's a payout, add it as a payment transaction
      if (formData.payoutAmount > 0) {
        // Create a payment schedule entry for the deposit payout
        const payoutScheduleData = {
          leaseId: lease.id,
          facilityId: lease.facilityId,
          roomId: lease.roomId,
          renterId: lease.renterId,
          paymentDueDateSetting: 'first_day' as const,
          payments: [{
            month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-deposit-payout`,
            dueDate: Timestamp.fromDate(new Date(formData.payoutDate)),
            amount: formData.payoutAmount,
            type: 'deposit_payout' as const,
            status: 'paid' as const,
            paidAmount: formData.payoutAmount,
            paidDate: Timestamp.fromDate(new Date(formData.payoutDate)),
            paymentMethod: formData.payoutMethod,
          }],
          totalAmount: formData.payoutAmount,
          totalPaid: formData.payoutAmount,
          outstandingAmount: 0,
        };

        await paymentScheduleService.createPaymentSchedule(payoutScheduleData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error processing deposit payout:', error);
      alert('Failed to process deposit payout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalDeductions = calculateDeductions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white">Deposit Payout</h2>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Deposit Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Calculator className="w-5 h-5 mr-2 text-purple-500" />
            Deposit Summary
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-700 rounded-lg">
              <p className="text-gray-400 text-sm">Original Deposit</p>
              <p className="text-white text-xl font-semibold">R{lease.terms.depositAmount.toLocaleString()}</p>
            </div>
            
            <div className="text-center p-4 bg-gray-700 rounded-lg">
              <p className="text-gray-400 text-sm">Total Deductions</p>
              <p className="text-red-400 text-xl font-semibold">-R{totalDeductions.toLocaleString()}</p>
            </div>
            
            <div className="text-center p-4 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <p className="text-gray-400 text-sm">Payout Amount</p>
              <p className="text-purple-400 text-xl font-semibold">R{formData.payoutAmount.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* Maintenance Expenses */}
        {loadingExpenses ? (
          <Card className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading maintenance expenses...</p>
            </div>
          </Card>
        ) : maintenanceExpenses.length > 0 ? (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-orange-500" />
              Recoverable Maintenance Expenses
            </h3>
            
            <div className="space-y-3">
              {maintenanceExpenses.map(expense => {
                const roomCost = expense.roomCosts.find(cost => cost.roomId === lease.roomId);
                const isSelected = selectedExpenses.includes(expense.id!);
                
                return (
                  <div 
                    key={expense.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-orange-500/20 border-orange-500/50' 
                        : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => handleExpenseToggle(expense.id!)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">{expense.description}</h4>
                        <p className="text-gray-400 text-sm">
                          {expense.expenseDate?.toDate ? 
                            expense.expenseDate.toDate().toLocaleDateString() : 
                            new Date(expense.expenseDate).toLocaleDateString()
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">R{roomCost?.amount.toLocaleString()}</p>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleExpenseToggle(expense.id!)}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        {/* Manual Deductions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
            Additional Deductions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Additional Deduction Amount"
              type="number"
              value={formData.deductionAmount}
              onChange={(e) => handleInputChange('deductionAmount', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
            
            <Input
              label="Deduction Reason"
              type="text"
              value={formData.deductionReason}
              onChange={(e) => handleInputChange('deductionReason', e.target.value)}
              placeholder="Reason for deduction (optional)"
            />
          </div>
        </Card>

        {/* Payout Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Payout Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Payout Date"
              type="date"
              value={formData.payoutDate}
              onChange={(e) => handleInputChange('payoutDate', e.target.value)}
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Payout Method
              </label>
              <select
                value={formData.payoutMethod}
                onChange={(e) => handleInputChange('payoutMethod', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="eft">EFT</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Warning for negative payout */}
        {formData.payoutAmount < 0 && (
          <Card className="p-4 bg-red-500/10 border border-red-500/30">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-red-400 font-medium">Deductions Exceed Deposit</p>
                <p className="text-gray-400 text-sm">
                  The total deductions (R{totalDeductions.toLocaleString()}) exceed the deposit amount. 
                  No payout will be made.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-purple-500 hover:bg-purple-600"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Process Deposit Payout
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DepositPayout;
