import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Penalty Management Interfaces
export interface Penalty {
  id?: string;
  leaseId: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  paymentScheduleId: string;
  paymentMonth: string; // e.g., "2024-09"
  originalDueDate: Timestamp;
  penaltyAmount: number;
  penaltyType: 'late_payment' | 'overdue' | 'breach_of_contract' | 'damage' | 'other';
  reason: string;
  status: 'pending' | 'applied' | 'waived' | 'disputed';
  appliedDate?: Timestamp;
  waivedDate?: Timestamp;
  waivedBy?: string;
  waivedReason?: string;
  disputedDate?: Timestamp;
  disputedBy?: string;
  disputedReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PenaltyCalculation {
  isLate: boolean;
  daysLate: number;
  penaltyAmount: number;
  gracePeriodUsed: boolean;
  calculation: {
    baseAmount: number;
    penaltyRate: number;
    daysOverdue: number;
    calculatedAmount: number;
  };
}

export interface PenaltySummary {
  totalPenalties: number;
  pendingPenalties: number;
  appliedPenalties: number;
  waivedPenalties: number;
  disputedPenalties: number;
  totalAmount: number;
  pendingAmount: number;
  appliedAmount: number;
  waivedAmount: number;
  disputedAmount: number;
}

// Penalty Service
export const penaltyService = {
  // Calculate penalty for a specific payment
  calculatePenalty: (
    dueDate: Date,
    paidDate: Date,
    businessRules: {
      lateFeeAmount: number;
      lateFeeStartDay: number;
      gracePeriodDays: number;
    },
    baseAmount: number
  ): PenaltyCalculation => {
    const today = new Date();
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const paidDateOnly = new Date(paidDate.getFullYear(), paidDate.getMonth(), paidDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Calculate days late
    const daysLate = Math.floor((paidDateOnly.getTime() - dueDateOnly.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if grace period applies
    const gracePeriodUsed = daysLate <= businessRules.gracePeriodDays;
    
    // Determine if penalty should be applied
    const isLate = daysLate > businessRules.lateFeeStartDay && !gracePeriodUsed;
    
    let penaltyAmount = 0;
    if (isLate) {
      const daysOverdue = daysLate - businessRules.lateFeeStartDay;
      penaltyAmount = daysOverdue * businessRules.lateFeeAmount;
    }

    return {
      isLate,
      daysLate,
      penaltyAmount,
      gracePeriodUsed,
      calculation: {
        baseAmount,
        penaltyRate: businessRules.lateFeeAmount,
        daysOverdue: Math.max(0, daysLate - businessRules.lateFeeStartDay),
        calculatedAmount: penaltyAmount,
      },
    };
  },

  // Check for overdue payments and create penalties
  checkOverduePayments: async (): Promise<void> => {
    try {
      console.log('Checking for overdue payments...');
      
      // Get all active payment schedules
      const schedulesQuery = query(
        collection(db, 'paymentSchedules'),
        where('payments', '!=', [])
      );
      
      const schedulesSnapshot = await getDocs(schedulesQuery);
      const batch = writeBatch(db);
      let penaltiesCreated = 0;

      for (const scheduleDoc of schedulesSnapshot.docs) {
        const schedule = scheduleDoc.data();
        const payments = schedule.payments || [];

        for (const payment of payments) {
          // Skip if payment is already paid or has penalty
          if (payment.status === 'paid' || payment.type === 'late_fee') {
            continue;
          }

          const dueDate = payment.dueDate.toDate();
          const today = new Date();
          
          // Check if payment is overdue
          if (dueDate < today) {
            // Get lease agreement for business rules
            const leaseDoc = await getDoc(doc(db, 'leaseAgreements', schedule.leaseId));
            if (!leaseDoc.exists()) continue;

            const lease = leaseDoc.data();
            const businessRules = lease.businessRules;

            // Calculate penalty
            const penaltyCalc = penaltyService.calculatePenalty(
              dueDate,
              today,
              businessRules,
              payment.amount
            );

            // Create penalty if applicable
            if (penaltyCalc.isLate && penaltyCalc.penaltyAmount > 0) {
              const penaltyData: Omit<Penalty, 'id' | 'createdAt' | 'updatedAt'> = {
                leaseId: schedule.leaseId,
                facilityId: schedule.facilityId,
                roomId: schedule.roomId,
                renterId: schedule.renterId,
                paymentScheduleId: scheduleDoc.id,
                paymentMonth: payment.month,
                originalDueDate: payment.dueDate,
                penaltyAmount: penaltyCalc.penaltyAmount,
                penaltyType: 'late_payment',
                reason: `Late payment penalty for ${payment.month} - ${penaltyCalc.daysLate} days overdue`,
                status: 'pending',
              };

              const penaltyRef = doc(collection(db, 'penalties'));
              batch.set(penaltyRef, {
                ...penaltyData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });

              penaltiesCreated++;
            }
          }
        }
      }

      if (penaltiesCreated > 0) {
        await batch.commit();
        console.log(`Created ${penaltiesCreated} penalties for overdue payments`);
      } else {
        console.log('No overdue payments found');
      }
    } catch (error) {
      console.error('Error checking overdue payments:', error);
      throw error;
    }
  },

  // Get penalties for a specific lease
  getPenaltiesByLease: async (leaseId: string): Promise<Penalty[]> => {
    try {
      const penaltiesQuery = query(
        collection(db, 'penalties'),
        where('leaseId', '==', leaseId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(penaltiesQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Penalty[];
    } catch (error) {
      console.error('Error fetching penalties by lease:', error);
      throw error;
    }
  },

  // Get penalties for a specific facility
  getPenaltiesByFacility: async (facilityId: string): Promise<Penalty[]> => {
    try {
      const penaltiesQuery = query(
        collection(db, 'penalties'),
        where('facilityId', '==', facilityId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(penaltiesQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Penalty[];
    } catch (error) {
      console.error('Error fetching penalties by facility:', error);
      throw error;
    }
  },

  // Get penalty summary for a facility
  getPenaltySummary: async (facilityId: string): Promise<PenaltySummary> => {
    try {
      const penalties = await penaltyService.getPenaltiesByFacility(facilityId);
      
      const summary: PenaltySummary = {
        totalPenalties: penalties.length,
        pendingPenalties: 0,
        appliedPenalties: 0,
        waivedPenalties: 0,
        disputedPenalties: 0,
        totalAmount: 0,
        pendingAmount: 0,
        appliedAmount: 0,
        waivedAmount: 0,
        disputedAmount: 0,
      };

      penalties.forEach(penalty => {
        summary.totalAmount += penalty.penaltyAmount;
        
        switch (penalty.status) {
          case 'pending':
            summary.pendingPenalties++;
            summary.pendingAmount += penalty.penaltyAmount;
            break;
          case 'applied':
            summary.appliedPenalties++;
            summary.appliedAmount += penalty.penaltyAmount;
            break;
          case 'waived':
            summary.waivedPenalties++;
            summary.waivedAmount += penalty.penaltyAmount;
            break;
          case 'disputed':
            summary.disputedPenalties++;
            summary.disputedAmount += penalty.penaltyAmount;
            break;
        }
      });

      return summary;
    } catch (error) {
      console.error('Error calculating penalty summary:', error);
      throw error;
    }
  },

  // Apply a penalty (add to payment schedule)
  applyPenalty: async (penaltyId: string, appliedBy: string): Promise<void> => {
    try {
      const penaltyDoc = await getDoc(doc(db, 'penalties', penaltyId));
      if (!penaltyDoc.exists()) {
        throw new Error('Penalty not found');
      }

      const penalty = penaltyDoc.data() as Penalty;
      
      // Get payment schedule
      const scheduleDoc = await getDoc(doc(db, 'paymentSchedules', penalty.paymentScheduleId));
      if (!scheduleDoc.exists()) {
        throw new Error('Payment schedule not found');
      }

      const schedule = scheduleDoc.data();
      const payments = schedule.payments || [];

      // Add penalty payment to schedule
      const penaltyPayment = {
        month: `${penalty.paymentMonth}-penalty`,
        dueDate: Timestamp.now(),
        amount: penalty.penaltyAmount,
        type: 'late_fee' as const,
        status: 'pending' as const,
      };

      payments.push(penaltyPayment);

      // Update payment schedule
      await updateDoc(doc(db, 'paymentSchedules', penalty.paymentScheduleId), {
        payments,
        totalAmount: schedule.totalAmount + penalty.penaltyAmount,
        outstandingAmount: schedule.outstandingAmount + penalty.penaltyAmount,
        updatedAt: Timestamp.now(),
      });

      // Update penalty status
      await updateDoc(doc(db, 'penalties', penaltyId), {
        status: 'applied',
        appliedDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(`Penalty ${penaltyId} applied to payment schedule`);
    } catch (error) {
      console.error('Error applying penalty:', error);
      throw error;
    }
  },

  // Waive a penalty
  waivePenalty: async (
    penaltyId: string, 
    waivedBy: string, 
    reason: string
  ): Promise<void> => {
    try {
      await updateDoc(doc(db, 'penalties', penaltyId), {
        status: 'waived',
        waivedDate: Timestamp.now(),
        waivedBy,
        waivedReason: reason,
        updatedAt: Timestamp.now(),
      });

      console.log(`Penalty ${penaltyId} waived by ${waivedBy}`);
    } catch (error) {
      console.error('Error waiving penalty:', error);
      throw error;
    }
  },

  // Dispute a penalty
  disputePenalty: async (
    penaltyId: string, 
    disputedBy: string, 
    reason: string
  ): Promise<void> => {
    try {
      await updateDoc(doc(db, 'penalties', penaltyId), {
        status: 'disputed',
        disputedDate: Timestamp.now(),
        disputedBy,
        disputedReason: reason,
        updatedAt: Timestamp.now(),
      });

      console.log(`Penalty ${penaltyId} disputed by ${disputedBy}`);
    } catch (error) {
      console.error('Error disputing penalty:', error);
      throw error;
    }
  },

  // Create manual penalty
  createManualPenalty: async (
    penaltyData: Omit<Penalty, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, 'penalties'), {
        ...penaltyData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(`Manual penalty created with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating manual penalty:', error);
      throw error;
    }
  },

  // Update penalty
  updatePenalty: async (
    penaltyId: string, 
    updates: Partial<Penalty>
  ): Promise<void> => {
    try {
      await updateDoc(doc(db, 'penalties', penaltyId), {
        ...updates,
        updatedAt: Timestamp.now(),
      });

      console.log(`Penalty ${penaltyId} updated`);
    } catch (error) {
      console.error('Error updating penalty:', error);
      throw error;
    }
  },

  // Delete penalty
  deletePenalty: async (penaltyId: string): Promise<void> => {
    try {
      await updateDoc(doc(db, 'penalties', penaltyId), {
        status: 'waived', // Soft delete by marking as waived
        waivedDate: Timestamp.now(),
        waivedReason: 'Deleted by system admin',
        updatedAt: Timestamp.now(),
      });

      console.log(`Penalty ${penaltyId} deleted`);
    } catch (error) {
      console.error('Error deleting penalty:', error);
      throw error;
    }
  },
};
