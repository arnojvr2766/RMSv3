import React from 'react';
import { X, AlertTriangle, Calendar, DollarSign, Info } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

// Define interface locally to avoid import issues
interface AggregatedPenalty {
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  lastCalculated: any; // Timestamp
  calculationHistory: {
    date: any; // Timestamp
    amount: number;
    reason: string;
    paymentMonth: string;
  }[];
}

interface PenaltyBreakdownProps {
  penalty: AggregatedPenalty;
  leaseId: string;
  facilityName: string;
  roomNumber: string;
  renterName: string;
  onClose: () => void;
}

const PenaltyBreakdown: React.FC<PenaltyBreakdownProps> = ({
  penalty,
  leaseId,
  facilityName,
  roomNumber,
  renterName,
  onClose
}) => {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <div>
              <h2 className="text-2xl font-bold text-white">Penalty Breakdown</h2>
              <p className="text-gray-400">{facilityName} - Room {roomNumber} - {renterName}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Penalty Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-medium">Total Penalties</span>
                </div>
                <p className="text-red-400 font-bold text-2xl">{formatCurrency(penalty.totalAmount)}</p>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Paid Amount</span>
                </div>
                <p className="text-green-400 font-bold text-2xl">{formatCurrency(penalty.paidAmount)}</p>
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-400 font-medium">Outstanding</span>
                </div>
                <p className="text-yellow-400 font-bold text-2xl">{formatCurrency(penalty.outstandingAmount)}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Calendar className="w-4 h-4" />
                <span>Last calculated: {formatDate(penalty.lastCalculated)}</span>
              </div>
            </div>
          </Card>

          {/* Calculation History */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Calculation History</h3>
            
            {penalty.calculationHistory.length === 0 ? (
              <div className="text-center py-8">
                <Info className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No penalty calculations found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {penalty.calculationHistory.map((calculation, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                          <span className="text-yellow-400 font-bold text-sm">{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{calculation.paymentMonth}</p>
                          <p className="text-gray-400 text-sm">{calculation.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-bold">{formatCurrency(calculation.amount)}</p>
                        <p className="text-gray-400 text-sm">{formatDate(calculation.date)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Payment Progress */}
          {penalty.totalAmount > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Payment Progress</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Penalties</span>
                  <span className="text-white">{formatCurrency(penalty.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Paid Amount</span>
                  <span className="text-green-400">{formatCurrency(penalty.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Outstanding</span>
                  <span className="text-yellow-400">{formatCurrency(penalty.outstandingAmount)}</span>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${penalty.totalAmount > 0 ? (penalty.paidAmount / penalty.totalAmount) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                
                <div className="text-center text-sm text-gray-400">
                  {penalty.totalAmount > 0 ? Math.round((penalty.paidAmount / penalty.totalAmount) * 100) : 0}% Paid
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="flex justify-end mt-6 pt-6 border-t border-gray-700">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PenaltyBreakdown;
