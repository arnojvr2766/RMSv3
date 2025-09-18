import React from 'react';
import { AlertTriangle, Clock, Calculator } from 'lucide-react';
import Card from '../ui/Card';
import { penaltyService } from '../../services/penaltyService';
import type { PenaltyCalculation } from '../../services/penaltyService';

interface PenaltyCalculatorProps {
  dueDate: Date;
  paidDate: Date;
  businessRules: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    gracePeriodDays: number;
  };
  baseAmount: number;
  showDetails?: boolean;
}

const PenaltyCalculator: React.FC<PenaltyCalculatorProps> = ({
  dueDate,
  paidDate,
  businessRules,
  baseAmount,
  showDetails = true
}) => {
  const penaltyCalc = penaltyService.calculatePenalty(
    dueDate,
    paidDate,
    businessRules,
    baseAmount
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  if (!penaltyCalc.isLate) {
    return (
      <Card className="bg-green-500/10 border-green-500/30">
        <div className="flex items-center space-x-3">
          <Clock className="w-5 h-5 text-green-500" />
          <div>
            <h4 className="text-green-400 font-medium">No Penalty Required</h4>
            <p className="text-gray-400 text-sm">
              Payment is on time or within grace period
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-red-500/10 border-red-500/30">
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <h4 className="text-red-400 font-medium">Late Payment Penalty</h4>
            <p className="text-gray-400 text-sm">
              Payment is {penaltyCalc.daysLate} days late
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Due Date:</span>
              <span className="text-white">{formatDate(dueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Paid Date:</span>
              <span className="text-white">{formatDate(paidDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Days Late:</span>
              <span className="text-white">{penaltyCalc.daysLate}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Grace Period:</span>
              <span className="text-white">{businessRules.gracePeriodDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Penalty Rate:</span>
              <span className="text-white">R{businessRules.lateFeeAmount}/day</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Days Overdue:</span>
              <span className="text-white">{penaltyCalc.calculation.daysOverdue}</span>
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="border-t border-gray-600 pt-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calculator className="w-4 h-4 text-primary-500" />
              <h5 className="text-white font-medium">Penalty Calculation</h5>
            </div>
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Days Overdue:</span>
                  <span className="text-white">{penaltyCalc.calculation.daysOverdue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Penalty Rate:</span>
                  <span className="text-white">R{penaltyCalc.calculation.penaltyRate}/day</span>
                </div>
                <div className="flex justify-between border-t border-gray-600 pt-1">
                  <span className="text-gray-400 font-medium">Total Penalty:</span>
                  <span className="text-red-400 font-bold">
                    R{penaltyCalc.calculation.calculatedAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <p className="text-yellow-400 text-sm">
            <strong>Note:</strong> This penalty will be automatically added to the payment schedule 
            and can be waived or disputed if necessary.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default PenaltyCalculator;
