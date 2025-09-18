import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, User, Building2, DoorClosed, DollarSign, Calendar, CreditCard, FileText } from 'lucide-react';
import { paymentScheduleService, facilityService, renterService, roomService } from '../services/firebaseService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Timestamp } from 'firebase/firestore';
import { useRole } from '../contexts/RoleContext';

// Temporary inline type definitions
interface PaymentApproval {
  id?: string;
  paymentScheduleId: string;
  paymentIndex: number;
  leaseId: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  originalValues: {
    paidAmount?: number;
    paidDate?: any;
    paymentMethod?: string;
  };
  newValues: {
    paidAmount?: number;
    paidDate?: any;
    paymentMethod?: string;
  };
  editedBy: string;
  editedAt: any;
  status: 'pending' | 'approved' | 'declined';
  reviewedBy?: string;
  reviewedAt?: any;
  reviewNotes?: string;
  createdAt: any;
  updatedAt: any;
}

interface Facility {
  id?: string;
  name: string;
  address: string;
}

interface Renter {
  id?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
  };
}

interface Room {
  id?: string;
  roomNumber: string;
}

const PaymentApprovals: React.FC = () => {
  const { isSystemAdmin } = useRole();
  const [approvals, setApprovals] = useState<PaymentApproval[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [renters, setRenters] = useState<Renter[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isSystemAdmin) {
      loadData();
    }
  }, [isSystemAdmin]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [approvalsData, facilitiesData, rentersData, roomsData] = await Promise.all([
        paymentScheduleService.getPendingPaymentApprovals(),
        facilityService.getFacilities(),
        renterService.getAllRenters(),
        roomService.getAllRooms()
      ]);

      setApprovals(approvalsData);
      setFacilities(facilitiesData);
      setRenters(rentersData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFacilityName = (facilityId: string) => {
    return facilities.find(f => f.id === facilityId)?.name || 'Unknown Facility';
  };

  const getRenterName = (renterId: string) => {
    const renter = renters.find(r => r.id === renterId);
    return renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : 'Unknown Renter';
  };

  const getRoomNumber = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.roomNumber || 'Unknown Room';
  };

  const formatDate = (date: any) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date: any) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleString();
    }
    return new Date(date).toLocaleString();
  };

  const handleApprove = async (approvalId: string) => {
    setIsProcessing({ ...isProcessing, [approvalId]: true });
    try {
      await paymentScheduleService.reviewPaymentApproval(
        approvalId,
        'approved',
        'system_admin',
        reviewNotes[approvalId]
      );
      
      // Reload data to show updated status
      await loadData();
      
      // Clear review notes
      setReviewNotes({ ...reviewNotes, [approvalId]: '' });
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('Failed to approve payment. Please try again.');
    } finally {
      setIsProcessing({ ...isProcessing, [approvalId]: false });
    }
  };

  const handleDecline = async (approvalId: string) => {
    setIsProcessing({ ...isProcessing, [approvalId]: true });
    try {
      await paymentScheduleService.reviewPaymentApproval(
        approvalId,
        'declined',
        'system_admin',
        reviewNotes[approvalId]
      );
      
      // Reload data to show updated status
      await loadData();
      
      // Clear review notes
      setReviewNotes({ ...reviewNotes, [approvalId]: '' });
    } catch (error) {
      console.error('Error declining payment:', error);
      alert('Failed to decline payment. Please try again.');
    } finally {
      setIsProcessing({ ...isProcessing, [approvalId]: false });
    }
  };

  if (!isSystemAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <XCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">Only system administrators can access payment approvals.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading payment approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Clock className="w-8 h-8 text-warning" />
          <div>
            <h1 className="text-3xl font-bold text-white">Payment Approvals</h1>
            <p className="text-gray-400">Review and approve payment changes made by standard users</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-warning rounded-full"></div>
            <span className="text-gray-400">Pending Approvals: {approvals.length}</span>
          </div>
        </div>
      </div>

      {/* Approvals List */}
      {approvals.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">All Caught Up!</h3>
            <p className="text-gray-400">There are no pending payment approvals at this time.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {approvals.map((approval) => (
            <Card key={approval.id}>
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-warning/20 rounded-lg">
                      <Clock className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Payment Change Request</h3>
                      <p className="text-gray-400">
                        Edited by {approval.editedBy} • {formatDateTime(approval.editedAt)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-warning/20 text-warning">
                    PENDING APPROVAL
                  </span>
                </div>

                {/* Context Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-5 h-5 text-primary-500" />
                    <div>
                      <p className="text-sm text-gray-400">Facility</p>
                      <p className="text-white font-medium">{getFacilityName(approval.facilityId)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <DoorClosed className="w-5 h-5 text-accent-blue-500" />
                    <div>
                      <p className="text-sm text-gray-400">Room</p>
                      <p className="text-white font-medium">Room {getRoomNumber(approval.roomId)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-accent-green-500" />
                    <div>
                      <p className="text-sm text-gray-400">Renter</p>
                      <p className="text-white font-medium">{getRenterName(approval.renterId)}</p>
                    </div>
                  </div>
                </div>

                {/* Changes Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Original Values */}
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Original Values</span>
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Paid Amount:</span>
                        <span className="text-white font-medium">
                          R {approval.originalValues.paidAmount?.toLocaleString() || '0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Payment Date:</span>
                        <span className="text-white font-medium">
                          {approval.originalValues.paidDate ? formatDate(approval.originalValues.paidDate) : 'Not set'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Payment Method:</span>
                        <span className="text-white font-medium">
                          {approval.originalValues.paymentMethod || 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* New Values */}
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>New Values</span>
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Paid Amount:</span>
                        <span className="text-white font-medium">
                          R {approval.newValues.paidAmount?.toLocaleString() || '0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Payment Date:</span>
                        <span className="text-white font-medium">
                          {approval.newValues.paidDate ? formatDate(approval.newValues.paidDate) : 'Not set'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Payment Method:</span>
                        <span className="text-white font-medium">
                          {approval.newValues.paymentMethod || 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Review Notes (Optional)
                  </label>
                  <textarea
                    value={reviewNotes[approval.id!] || ''}
                    onChange={(e) => setReviewNotes({ ...reviewNotes, [approval.id!]: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                    placeholder="Add notes about your decision..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                  <Button
                    variant="secondary"
                    onClick={() => handleDecline(approval.id!)}
                    disabled={isProcessing[approval.id!]}
                  >
                    {isProcessing[approval.id!] ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Declining...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Decline
                      </>
                    )}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleApprove(approval.id!)}
                    disabled={isProcessing[approval.id!]}
                  >
                    {isProcessing[approval.id!] ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentApprovals;
