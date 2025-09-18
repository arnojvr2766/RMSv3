import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { paymentScheduleService } from './firebaseService';

// Aggregated Penalty Interfaces
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

export interface AggregatedPenalty {
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  lastCalculated: Timestamp;
  calculationHistory: {
    date: Timestamp;
    amount: number;
    reason: string;
    paymentMonth: string;
  }[];
}

// Aggregated Penalty Service
export const aggregatedPenaltyService = {
  // Calculate penalty for a specific payment
  calculatePenalty(
    dueDate: Date,
    paidDate: Date,
    businessRules: {
      lateFeeAmount: number;
      lateFeeStartDay: number;
      gracePeriodDays: number;
    },
    baseAmount: number
  ): PenaltyCalculation {
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const paidDateOnly = new Date(paidDate.getFullYear(), paidDate.getMonth(), paidDate.getDate());

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

  // Update aggregated penalty for a lease
  async updateAggregatedPenalty(
    scheduleId: string,
    paymentMonth: string,
    penaltyAmount: number,
    reason: string,
    businessRules: {
      lateFeeAmount: number;
      lateFeeStartDay: number;
      gracePeriodDays: number;
    }
  ): Promise<void> {
    try {
      console.log('Updating aggregated penalty for schedule:', scheduleId);
      
      // Get current payment schedule
      const scheduleDoc = await getDoc(doc(db, 'payment_schedules', scheduleId));
      if (!scheduleDoc.exists()) {
        throw new Error('Payment schedule not found');
      }

      const schedule = scheduleDoc.data();
      const currentPenalty = schedule.aggregatedPenalty || {
        totalAmount: 0,
        paidAmount: 0,
        outstandingAmount: 0,
        lastCalculated: Timestamp.now(),
        calculationHistory: []
      };

      // Add new penalty calculation to history
      const newCalculation = {
        date: Timestamp.now(),
        amount: penaltyAmount,
        reason,
        paymentMonth
      };

      const updatedPenalty: AggregatedPenalty = {
        totalAmount: currentPenalty.totalAmount + penaltyAmount,
        paidAmount: currentPenalty.paidAmount,
        outstandingAmount: (currentPenalty.totalAmount + penaltyAmount) - currentPenalty.paidAmount,
        lastCalculated: Timestamp.now(),
        calculationHistory: [...currentPenalty.calculationHistory, newCalculation]
      };

      // Update payment schedule with new penalty data
      await updateDoc(doc(db, 'payment_schedules', scheduleId), {
        aggregatedPenalty: updatedPenalty,
        updatedAt: Timestamp.now(),
      });

      console.log('Aggregated penalty updated:', updatedPenalty);
    } catch (error) {
      console.error('Error updating aggregated penalty:', error);
      throw error;
    }
  },

  // Process penalty payment (reduce outstanding penalty)
  async processPenaltyPayment(
    scheduleId: string,
    paymentAmount: number,
    paymentMethod: string,
    notes?: string
  ): Promise<void> {
    try {
      console.log('Processing penalty payment:', { scheduleId, paymentAmount, paymentMethod });

      // Get current payment schedule
      const scheduleDoc = await getDoc(doc(db, 'payment_schedules', scheduleId));
      if (!scheduleDoc.exists()) {
        throw new Error('Payment schedule not found');
      }

      const schedule = scheduleDoc.data();
      const currentPenalty = schedule.aggregatedPenalty;

      if (!currentPenalty) {
        throw new Error('No aggregated penalty found for this lease');
      }

      // Calculate new penalty amounts
      const newPaidAmount = Math.min(
        currentPenalty.paidAmount + paymentAmount,
        currentPenalty.totalAmount
      );
      const newOutstandingAmount = currentPenalty.totalAmount - newPaidAmount;

      const updatedPenalty: AggregatedPenalty = {
        ...currentPenalty,
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstandingAmount,
        lastCalculated: Timestamp.now(),
      };

      // Update payment schedule
      await updateDoc(doc(db, 'payment_schedules', scheduleId), {
        aggregatedPenalty: updatedPenalty,
        updatedAt: Timestamp.now(),
      });

      console.log('Penalty payment processed:', updatedPenalty);
    } catch (error) {
      console.error('Error processing penalty payment:', error);
      throw error;
    }
  },

  // Get penalty breakdown for a lease
  async getPenaltyBreakdown(scheduleId: string): Promise<AggregatedPenalty | null> {
    try {
      const scheduleDoc = await getDoc(doc(db, 'payment_schedules', scheduleId));
      if (!scheduleDoc.exists()) {
        return null;
      }

      const schedule = scheduleDoc.data();
      return schedule.aggregatedPenalty || null;
    } catch (error) {
      console.error('Error getting penalty breakdown:', error);
      throw error;
    }
  },

  // Calculate daily penalties for all active leases
  async calculateDailyPenalties(): Promise<void> {
    try {
      console.log('Starting daily penalty calculation...');
      
      // Get all active payment schedules
      const schedulesQuery = query(
        collection(db, 'payment_schedules'),
        where('outstandingAmount', '>', 0)
      );
      
      const schedulesSnapshot = await getDocs(schedulesQuery);
      const batch = writeBatch(db);
      let penaltiesCalculated = 0;

      for (const scheduleDoc of schedulesSnapshot.docs) {
        const schedule = scheduleDoc.data();
        const payments = schedule.payments || [];
        
        // Check each pending payment for penalties
        for (const payment of payments) {
          if (payment.status === 'pending' || payment.status === 'overdue') {
            const dueDate = payment.dueDate.toDate();
            const today = new Date();
            
            // Skip if payment is not yet due
            if (dueDate > today) continue;
            
            // Get lease for business rules
            const leaseDoc = await getDoc(doc(db, 'leases', schedule.leaseId));
            if (!leaseDoc.exists()) continue;
            
            const lease = leaseDoc.data();
            const businessRules = lease.businessRules;
            
            // Calculate penalty
            const penaltyCalc = this.calculatePenalty(
              dueDate,
              today,
              businessRules,
              payment.amount
            );
            
            // Add penalty if applicable and not already calculated for this payment month
            if (penaltyCalc.isLate && penaltyCalc.penaltyAmount > 0) {
              // Check if penalty has already been calculated for this payment month
              const existingPenalty = schedule.aggregatedPenalty;
              const alreadyCalculated = existingPenalty?.calculationHistory?.some(
                calc => calc.paymentMonth === payment.month
              );
              
              if (!alreadyCalculated) {
                await this.updateAggregatedPenalty(
                  scheduleDoc.id,
                  payment.month,
                  penaltyCalc.penaltyAmount,
                  `Daily penalty for ${payment.month} - ${penaltyCalc.daysLate} days overdue`,
                  businessRules
                );
                
                penaltiesCalculated++;
              } else {
                console.log(`Penalty already calculated for ${payment.month} in schedule ${scheduleDoc.id}`);
              }
            }
          }
        }
      }

      console.log(`Daily penalty calculation completed. ${penaltiesCalculated} penalties calculated.`);
    } catch (error) {
      console.error('Error calculating daily penalties:', error);
      throw error;
    }
  }
};
