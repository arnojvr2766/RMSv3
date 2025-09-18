import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calculator,
  Eye,
  DollarSign
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { facilityService, roomService, paymentScheduleService, leaseService, renterService } from '../services/firebaseService';
import { aggregatedPenaltyService } from '../services/aggregatedPenaltyService';
import { useRole } from '../contexts/RoleContext';
import PenaltyBreakdown from '../components/forms/PenaltyBreakdown';
import PaymentCapture from '../components/forms/PaymentCapture';

interface Facility {
  id?: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
}

interface AggregatedPenaltyTransaction {
  id: string;
  leaseId: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  facilityName: string;
  roomNumber: string;
  renterName: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  lastCalculated: any;
  calculationHistory: any[];
}

interface LeaseAgreement {
  id?: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  childrenCount?: number;
  terms: {
    startDate: any;
    endDate: any;
    monthlyRent: number;
    depositAmount: number;
    depositPaid: boolean;
    depositPaidDate?: any;
  };
  businessRules: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    childSurcharge: number;
    gracePeriodDays: number;
    paymentMethods: string[];
  };
  additionalTerms?: string;
  status: 'active' | 'expired' | 'terminated' | 'pending';
  createdAt: any;
  updatedAt: any;
}

const Penalties: React.FC = () => {
  const { currentRole } = useRole();
  const [penaltyTransactions, setPenaltyTransactions] = useState<AggregatedPenaltyTransaction[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showPenaltyBreakdown, setShowPenaltyBreakdown] = useState(false);
  const [selectedPenaltyTransaction, setSelectedPenaltyTransaction] = useState<AggregatedPenaltyTransaction | null>(null);
  const [showPaymentCapture, setShowPaymentCapture] = useState(false);
  const [selectedLease, setSelectedLease] = useState<LeaseAgreement | null>(null);

  const isSystemAdmin = currentRole === 'system_admin';

  useEffect(() => {
    loadData();
  }, [selectedFacility]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load facilities
      const facilitiesData = await facilityService.getFacilities();
      setFacilities(facilitiesData);

      // Load aggregated penalty transactions
      const transactions: AggregatedPenaltyTransaction[] = [];
      
      // Get all payment schedules with aggregated penalties
      const schedules = await paymentScheduleService.getAllPaymentSchedules();
      
      for (const schedule of schedules) {
        // Filter by facility if specified
        if (selectedFacility !== 'all' && schedule.facilityId !== selectedFacility) {
          continue;
        }
        
        // Check if this schedule has aggregated penalties
        if (schedule.aggregatedPenalty && schedule.aggregatedPenalty.outstandingAmount > 0) {
          // Get lease details
          const lease = await leaseService.getLeaseById(schedule.leaseId);
          if (!lease) continue;
          
          // Get facility and room details
          const facility = facilitiesData.find(f => f.id === schedule.facilityId);
          const room = await roomService.getRoomById(schedule.roomId);
          
          // Get renter details
          const renter = await renterService.getRenterById(schedule.renterId);
          
          transactions.push({
            id: `${schedule.id}_penalty`,
            leaseId: schedule.leaseId,
            facilityId: schedule.facilityId,
            roomId: schedule.roomId,
            renterId: schedule.renterId,
            facilityName: facility?.name || 'Unknown Facility',
            roomNumber: room?.roomNumber || 'Unknown Room',
            renterName: renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : 'Unknown Renter',
            totalAmount: schedule.aggregatedPenalty.totalAmount,
            paidAmount: schedule.aggregatedPenalty.paidAmount,
            outstandingAmount: schedule.aggregatedPenalty.outstandingAmount,
            lastCalculated: schedule.aggregatedPenalty.lastCalculated,
            calculationHistory: schedule.aggregatedPenalty.calculationHistory
          });
        }
      }
      
      setPenaltyTransactions(transactions);
    } catch (error) {
      console.error('Error loading penalties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculatePenalties = async () => {
    try {
      await aggregatedPenaltyService.calculateDailyPenalties();
      await loadData();
      alert('Penalty calculation completed!');
    } catch (error) {
      console.error('Error calculating penalties:', error);
      alert('Failed to calculate penalties');
    }
  };

  const handleViewPenaltyBreakdown = (transaction: AggregatedPenaltyTransaction) => {
    setSelectedPenaltyTransaction(transaction);
    setShowPenaltyBreakdown(true);
  };

  const handleCapturePayment = async (transaction: AggregatedPenaltyTransaction) => {
    try {
      // Get the lease details for this penalty transaction
      const lease = await leaseService.getLeaseById(transaction.leaseId);
      if (lease) {
        setSelectedLease(lease);
        setShowPaymentCapture(true);
      } else {
        alert('Lease not found for this penalty transaction');
      }
    } catch (error) {
      console.error('Error loading lease for payment capture:', error);
      alert('Failed to load lease details');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Penalty Management</h1>
            <p className="text-gray-400">Manage late payment penalties and disputes</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {isSystemAdmin && (
            <Button
              variant="primary"
              onClick={handleCalculatePenalties}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Calculate Penalties
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-red-500/10 border-red-500/30">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {penaltyTransactions.reduce((sum, t) => sum + t.totalAmount, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total Penalties (R)</div>
          </div>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {penaltyTransactions.reduce((sum, t) => sum + t.paidAmount, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Paid Amount (R)</div>
          </div>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {penaltyTransactions.reduce((sum, t) => sum + t.outstandingAmount, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Outstanding (R)</div>
          </div>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{penaltyTransactions.length}</div>
            <div className="text-sm text-gray-400">Active Penalties</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Filters</h3>
          <Button
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Facility</label>
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Facilities</option>
                {facilities.map(facility => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* Penalties List */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Penalties ({penaltyTransactions.length})</h3>
        
        {penaltyTransactions.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No penalties found</p>
            <p className="text-gray-500 text-sm mt-2">
              {isSystemAdmin ? 'Click "Calculate Penalties" to generate penalties for overdue payments' : 'No penalties have been calculated yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {penaltyTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="p-4 bg-gray-700 rounded-lg border border-gray-600"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                    <div>
                      <h4 className="text-white font-medium">
                        {transaction.facilityName} - Room {transaction.roomNumber}
                      </h4>
                      <p className="text-gray-400 text-sm">{transaction.renterName}</p>
                      <p className="text-gray-500 text-xs">
                        Last calculated: {formatDate(transaction.lastCalculated)} | 
                        Outstanding: {formatCurrency(transaction.outstandingAmount)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-yellow-400 font-bold text-lg">
                        {formatCurrency(transaction.outstandingAmount)}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Paid: {formatCurrency(transaction.paidAmount)} / {formatCurrency(transaction.totalAmount)}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPenaltyBreakdown(transaction)}
                        title="View Penalty Breakdown"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleCapturePayment(transaction)}
                        title="Capture Payment"
                      >
                        <DollarSign className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Penalty Breakdown Modal */}
      {showPenaltyBreakdown && selectedPenaltyTransaction && (
        <PenaltyBreakdown
          penalty={{
            totalAmount: selectedPenaltyTransaction.totalAmount,
            paidAmount: selectedPenaltyTransaction.paidAmount,
            outstandingAmount: selectedPenaltyTransaction.outstandingAmount,
            lastCalculated: selectedPenaltyTransaction.lastCalculated,
            calculationHistory: selectedPenaltyTransaction.calculationHistory
          }}
          leaseId={selectedPenaltyTransaction.leaseId}
          facilityName={selectedPenaltyTransaction.facilityName}
          roomNumber={selectedPenaltyTransaction.roomNumber}
          renterName={selectedPenaltyTransaction.renterName}
          onClose={() => {
            setShowPenaltyBreakdown(false);
            setSelectedPenaltyTransaction(null);
          }}
        />
      )}

      {/* Payment Capture Modal */}
      {showPaymentCapture && selectedLease && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <PaymentCapture
              lease={selectedLease}
              onSuccess={() => {
                setShowPaymentCapture(false);
                setSelectedLease(null);
                // Reload data to update penalty amounts
                loadData();
              }}
              onCancel={() => {
                setShowPaymentCapture(false);
                setSelectedLease(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Penalties;