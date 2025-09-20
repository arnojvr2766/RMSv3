import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { paymentScheduleService } from './firebaseService';

export interface PaymentApproval {
  id: string;
  paymentScheduleId: string;
  leaseId: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  month: string;
  amount: number;
  paidAmount: number;
  paymentMethod: string;
  paidDate: Timestamp;
  capturedBy: string;
  capturedAt: Timestamp;
  notes?: string;
  paymentProof?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    data: string;
    uploadedAt: Timestamp;
  };
  approvalNotes?: string;
  approvedBy?: string;
  approvedAt?: Timestamp;
}

class PaymentApprovalService {
  /**
   * Get all payments pending approval
   */
  async getPendingApprovals(): Promise<PaymentApproval[]> {
    try {
      const paymentSchedules = await paymentScheduleService.getAllPaymentSchedules();
      const pendingApprovals: PaymentApproval[] = [];

      for (const schedule of paymentSchedules) {
        const pendingPayments = schedule.payments.filter(p => p.status === 'pending_approval');
        
        for (const payment of pendingPayments) {
          pendingApprovals.push({
            id: `${schedule.id}_${payment.month}`,
            paymentScheduleId: schedule.id!,
            leaseId: schedule.leaseId,
            facilityId: schedule.facilityId,
            roomId: schedule.roomId,
            renterId: schedule.renterId,
            month: payment.month,
            amount: payment.amount,
            paidAmount: payment.paidAmount || 0,
            paymentMethod: payment.paymentMethod || '',
            paidDate: payment.paidDate || Timestamp.now(),
            capturedBy: payment.capturedBy || 'unknown',
            capturedAt: payment.capturedAt || Timestamp.now(),
            notes: payment.notes,
            paymentProof: payment.paymentProof,
            approvalNotes: payment.approvalNotes,
            approvedBy: payment.approvedBy,
            approvedAt: payment.approvedAt
          });
        }
      }

      // Sort by capture date (newest first)
      return pendingApprovals.sort((a, b) => b.capturedAt.toMillis() - a.capturedAt.toMillis());
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw error;
    }
  }

  /**
   * Approve a payment
   */
  async approvePayment(
    paymentScheduleId: string, 
    month: string, 
    approvedBy: string, 
    approvalNotes?: string
  ): Promise<void> {
    try {
      const schedule = await paymentScheduleService.getPaymentScheduleById(paymentScheduleId);
      if (!schedule) {
        throw new Error('Payment schedule not found');
      }

      const paymentIndex = schedule.payments.findIndex(p => p.month === month);
      if (paymentIndex === -1) {
        throw new Error('Payment not found');
      }

      const payment = schedule.payments[paymentIndex];
      
      // Update payment status to paid/partial based on amount
      const newStatus = payment.paidAmount && payment.paidAmount >= payment.amount ? 'paid' : 'partial';
      
      const updatedPayment = {
        ...payment,
        status: newStatus,
        approvedBy,
        approvedAt: Timestamp.now(),
        approvalNotes: approvalNotes || ''
      };

      // Update the payment in the schedule
      await paymentScheduleService.updatePaymentInSchedule(
        paymentScheduleId,
        month,
        updatedPayment
      );

      console.log(`Payment ${month} approved by ${approvedBy}`);
    } catch (error) {
      console.error('Error approving payment:', error);
      throw error;
    }
  }

  /**
   * Reject a payment
   */
  async rejectPayment(
    paymentScheduleId: string, 
    month: string, 
    rejectedBy: string, 
    rejectionNotes?: string
  ): Promise<void> {
    try {
      const schedule = await paymentScheduleService.getPaymentScheduleById(paymentScheduleId);
      if (!schedule) {
        throw new Error('Payment schedule not found');
      }

      const paymentIndex = schedule.payments.findIndex(p => p.month === month);
      if (paymentIndex === -1) {
        throw new Error('Payment not found');
      }

      const payment = schedule.payments[paymentIndex];
      
      // Reset payment to pending status and clear payment data
      const updatedPayment = {
        ...payment,
        status: 'pending' as const,
        paidAmount: undefined,
        paidDate: undefined,
        paymentMethod: undefined,
        notes: undefined,
        paymentProof: undefined,
        capturedBy: undefined,
        capturedAt: undefined,
        requiresApproval: undefined,
        approvedBy: rejectedBy,
        approvedAt: Timestamp.now(),
        approvalNotes: `REJECTED: ${rejectionNotes || 'Payment rejected by admin'}`
      };

      // Update the payment in the schedule
      await paymentScheduleService.updatePaymentInSchedule(
        paymentScheduleId,
        month,
        updatedPayment
      );

      console.log(`Payment ${month} rejected by ${rejectedBy}`);
    } catch (error) {
      console.error('Error rejecting payment:', error);
      throw error;
    }
  }

  /**
   * Get approval statistics
   */
  async getApprovalStats(): Promise<{
    totalPending: number;
    pendingToday: number;
    pendingThisWeek: number;
  }> {
    try {
      const pendingApprovals = await this.getPendingApprovals();
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const pendingToday = pendingApprovals.filter(p => {
        const capturedDate = p.capturedAt.toDate();
        return capturedDate.toDateString() === today.toDateString();
      }).length;

      const pendingThisWeek = pendingApprovals.filter(p => {
        const capturedDate = p.capturedAt.toDate();
        return capturedDate >= weekAgo;
      }).length;

      return {
        totalPending: pendingApprovals.length,
        pendingToday,
        pendingThisWeek
      };
    } catch (error) {
      console.error('Error getting approval stats:', error);
      throw error;
    }
  }
}

export const paymentApprovalService = new PaymentApprovalService();
