/**
 * Lease Termination Service
 * Handles lease termination, outstanding payment calculation, and deposit refunds
 */

import { Timestamp } from 'firebase/firestore';
import { calculateProratedRent, checkProrationNeeded } from '../utils/prorationUtils';
import { leaseService, paymentScheduleService, roomService } from './firebaseService';

export interface LeaseTerminationData {
  leaseId: string;
  terminationDate: Date;
  terminationReason: 'end_of_term' | 'mid_term' | 'breach' | 'mutual_agreement' | 'other';
  terminationNotes?: string;
  outstandingPayments: OutstandingPayment[];
  depositRefund: DepositRefundData;
  additionalCharges: AdditionalCharge[];
  finalSettlement: FinalSettlement;
}

export interface OutstandingPayment {
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

export interface DepositRefundData {
  originalDepositAmount: number;
  refundAmount: number;
  deductions: DepositDeduction[];
  refundMethod: 'cash' | 'bank_transfer' | 'check';
  refundDate?: Date;
  refundNotes?: string;
}

export interface DepositDeduction {
  reason: string;
  amount: number;
  description?: string;
}

export interface AdditionalCharge {
  description: string;
  amount: number;
  category: 'cleaning' | 'repairs' | 'utilities' | 'other';
  notes?: string;
}

export interface FinalSettlement {
  totalOutstanding: number;
  totalAdditionalCharges: number;
  depositRefundAmount: number;
  netAmount: number; // Positive = tenant owes, Negative = landlord owes
  settlementNotes?: string;
}

export interface TerminationCalculationResult {
  terminationData: LeaseTerminationData;
  canTerminate: boolean;
  warnings: string[];
  recommendations: string[];
}

export const leaseTerminationService = {
  /**
   * Calculate termination details for a lease
   */
  async calculateTermination(
    leaseId: string,
    terminationDate: Date,
    terminationReason: LeaseTerminationData['terminationReason'],
    terminationNotes?: string
  ): Promise<TerminationCalculationResult> {
    try {
      // Get lease and payment schedule data
      const lease = await this.getLeaseWithSchedule(leaseId);
      if (!lease) {
        throw new Error('Lease not found');
      }

      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Calculate outstanding payments
      const outstandingPayments = await this.calculateOutstandingPayments(
        lease,
        terminationDate
      );

      // Calculate deposit refund
      const depositRefund = await this.calculateDepositRefund(
        lease,
        terminationDate,
        terminationReason
      );

      // Calculate additional charges (default empty, can be added manually)
      const additionalCharges: AdditionalCharge[] = [];

      // Calculate final settlement
      const finalSettlement = this.calculateFinalSettlement(
        outstandingPayments,
        additionalCharges,
        depositRefund
      );

      // Generate warnings and recommendations
      if (outstandingPayments.length > 0) {
        warnings.push(`${outstandingPayments.length} outstanding payments totaling R${finalSettlement.totalOutstanding.toLocaleString()}`);
        recommendations.push('Collect outstanding payments before processing termination');
      }

      if (depositRefund.refundAmount < depositRefund.originalDepositAmount) {
        warnings.push(`Deposit deductions of R${(depositRefund.originalDepositAmount - depositRefund.refundAmount).toLocaleString()} applied`);
      }

      if (finalSettlement.netAmount > 0) {
        recommendations.push(`Tenant owes R${finalSettlement.netAmount.toLocaleString()} after settlement`);
      } else if (finalSettlement.netAmount < 0) {
        recommendations.push(`Landlord owes tenant R${Math.abs(finalSettlement.netAmount).toLocaleString()} after settlement`);
      }

      const terminationData: LeaseTerminationData = {
        leaseId,
        terminationDate,
        terminationReason,
        terminationNotes,
        outstandingPayments,
        depositRefund,
        additionalCharges,
        finalSettlement
      };

      return {
        terminationData,
        canTerminate: true,
        warnings,
        recommendations
      };

    } catch (error) {
      console.error('Error calculating termination:', error);
      throw error;
    }
  },

  /**
   * Calculate outstanding payments up to termination date
   */
  async calculateOutstandingPayments(
    lease: any,
    terminationDate: Date
  ): Promise<OutstandingPayment[]> {
    const outstandingPayments: OutstandingPayment[] = [];
    const schedule = lease.paymentSchedule;

    if (!schedule || !schedule.payments) {
      return outstandingPayments;
    }

    for (const payment of schedule.payments) {
      // Skip deposit payments and already paid payments
      if (payment.type === 'deposit' || payment.status === 'paid') {
        continue;
      }

      const dueDate = payment.dueDate instanceof Timestamp 
        ? payment.dueDate.toDate() 
        : new Date(payment.dueDate);

      // Only include payments due before or on termination date
      if (dueDate <= terminationDate) {
        const daysOverdue = Math.max(0, Math.floor(
          (terminationDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        ));

        outstandingPayments.push({
          month: payment.month,
          dueDate,
          amount: payment.amount,
          type: payment.type as 'rent' | 'late_fee' | 'penalty',
          status: daysOverdue > 0 ? 'overdue' : 'pending',
          daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
          prorationDetails: payment.prorationDetails
        });
      }
    }

    return outstandingPayments;
  },

  /**
   * Calculate deposit refund with potential deductions
   */
  async calculateDepositRefund(
    lease: any,
    terminationDate: Date,
    terminationReason: LeaseTerminationData['terminationReason']
  ): Promise<DepositRefundData> {
    const originalDepositAmount = lease.terms.depositAmount;
    const deductions: DepositDeduction[] = [];

    // Apply deductions based on termination reason
    if (terminationReason === 'breach') {
      deductions.push({
        reason: 'Lease breach penalty',
        amount: originalDepositAmount * 0.5, // 50% penalty for breach
        description: 'Penalty for breach of lease agreement'
      });
    }

    // Add cleaning deduction if mid-term termination
    if (terminationReason === 'mid_term') {
      deductions.push({
        reason: 'Cleaning fee',
        amount: 500, // R500 cleaning fee
        description: 'Professional cleaning required for mid-term termination'
      });
    }

    const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
    const refundAmount = Math.max(0, originalDepositAmount - totalDeductions);

    return {
      originalDepositAmount,
      refundAmount,
      deductions,
      refundMethod: 'bank_transfer', // Default method
      refundNotes: `Refund for lease termination on ${terminationDate.toLocaleDateString()}`
    };
  },

  /**
   * Calculate final settlement amounts
   */
  calculateFinalSettlement(
    outstandingPayments: OutstandingPayment[],
    additionalCharges: AdditionalCharge[],
    depositRefund: DepositRefundData
  ): FinalSettlement {
    const totalOutstanding = outstandingPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalAdditionalCharges = additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
    const depositRefundAmount = depositRefund.refundAmount;

    // Net amount: Positive = tenant owes, Negative = landlord owes
    const netAmount = totalOutstanding + totalAdditionalCharges - depositRefundAmount;

    return {
      totalOutstanding,
      totalAdditionalCharges,
      depositRefundAmount,
      netAmount,
      settlementNotes: `Settlement calculated on ${new Date().toLocaleDateString()}`
    };
  },

  /**
   * Process lease termination
   */
  async processTermination(
    terminationData: LeaseTerminationData,
    processedBy: string
  ): Promise<string> {
    try {
      console.log('Processing termination:', terminationData);
      
      // 1. Update lease status to 'terminated'
      await leaseService.updateLease(terminationData.leaseId, {
        status: 'terminated',
        terminationDate: Timestamp.fromDate(terminationData.terminationDate),
        terminationReason: terminationData.terminationReason,
        terminationNotes: terminationData.terminationNotes,
        updatedAt: Timestamp.now()
      });

      // 2. Update room status to 'available'
      const lease = await leaseService.getLeaseById(terminationData.leaseId);
      if (lease) {
        await roomService.updateRoom(lease.roomId, {
          status: 'available',
          updatedAt: Timestamp.now()
        });
      }

      // 3. Create termination record (you might want to create a separate collection for this)
      // For now, we'll just log it
      console.log('Termination record created:', {
        leaseId: terminationData.leaseId,
        terminationDate: terminationData.terminationDate,
        terminationReason: terminationData.terminationReason,
        outstandingPayments: terminationData.outstandingPayments,
        depositRefund: terminationData.depositRefund,
        finalSettlement: terminationData.finalSettlement,
        processedBy,
        processedAt: new Date()
      });

      // 4. Process any refunds (this would integrate with your payment system)
      if (terminationData.depositRefund.refundAmount > 0) {
        console.log('Deposit refund processed:', terminationData.depositRefund);
      }

      return 'Termination processed successfully';
    } catch (error) {
      console.error('Error processing termination:', error);
      throw error;
    }
  },

  /**
   * Get lease with payment schedule data
   */
  async getLeaseWithSchedule(leaseId: string): Promise<any> {
    try {
      // Get lease data
      const lease = await leaseService.getLeaseById(leaseId);
      if (!lease) {
        throw new Error('Lease not found');
      }

      // Get payment schedule
      const paymentSchedule = await paymentScheduleService.getPaymentScheduleByLease(leaseId);
      
      return {
        ...lease,
        paymentSchedule
      };
    } catch (error) {
      console.error('Error getting lease with schedule:', error);
      throw error;
    }
  },

  /**
   * Add additional charge to termination
   */
  addAdditionalCharge(
    terminationData: LeaseTerminationData,
    charge: AdditionalCharge
  ): LeaseTerminationData {
    const updatedData = {
      ...terminationData,
      additionalCharges: [...terminationData.additionalCharges, charge]
    };

    // Recalculate final settlement
    updatedData.finalSettlement = this.calculateFinalSettlement(
      updatedData.outstandingPayments,
      updatedData.additionalCharges,
      updatedData.depositRefund
    );

    return updatedData;
  },

  /**
   * Update deposit refund details
   */
  updateDepositRefund(
    terminationData: LeaseTerminationData,
    refundUpdates: Partial<DepositRefundData>
  ): LeaseTerminationData {
    const updatedData = {
      ...terminationData,
      depositRefund: {
        ...terminationData.depositRefund,
        ...refundUpdates
      }
    };

    // Recalculate final settlement
    updatedData.finalSettlement = this.calculateFinalSettlement(
      updatedData.outstandingPayments,
      updatedData.additionalCharges,
      updatedData.depositRefund
    );

    return updatedData;
  }
};
