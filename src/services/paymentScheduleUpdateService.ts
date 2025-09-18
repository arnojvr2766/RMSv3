import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculatePaymentDueDate } from '../utils/paymentUtils';

export interface PaymentScheduleUpdateResult {
  totalSchedules: number;
  updatedSchedules: number;
  updatedPayments: number;
  errors: string[];
}

/**
 * Service to handle bulk updates of payment schedules when settings change
 */
export const paymentScheduleUpdateService = {
  /**
   * Update all payment schedules to use the new due date setting
   * @param newPaymentDueDate - The new payment due date setting
   * @returns Promise with update results
   */
  async updateAllPaymentSchedules(newPaymentDueDate: 'first_day' | 'last_day'): Promise<PaymentScheduleUpdateResult> {
    try {
      console.log(`Updating all payment schedules to use ${newPaymentDueDate} due date setting...`);
      
      const result: PaymentScheduleUpdateResult = {
        totalSchedules: 0,
        updatedSchedules: 0,
        updatedPayments: 0,
        errors: []
      };

      // Get all payment schedules
      const schedulesSnapshot = await getDocs(collection(db, 'payment_schedules'));
      result.totalSchedules = schedulesSnapshot.docs.length;

      if (result.totalSchedules === 0) {
        console.log('No payment schedules found to update');
        return result;
      }

      // Process in batches to avoid Firestore limits
      const batchSize = 500;
      const batches = [];
      
      for (let i = 0; i < schedulesSnapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = schedulesSnapshot.docs.slice(i, i + batchSize);
        
        for (const scheduleDoc of batchDocs) {
          try {
            const schedule = scheduleDoc.data();
            const payments = schedule.payments || [];
            let hasUpdates = false;
            const updatedPayments = [...payments];

            // Update each payment's due date
            for (let j = 0; j < updatedPayments.length; j++) {
              const payment = updatedPayments[j];
              
              // Skip deposit payments (they should keep their original due date)
              if (payment.type === 'deposit') {
                continue;
              }

              // Parse the month key (e.g., "2025-09")
              const monthMatch = payment.month.match(/^(\d{4})-(\d{2})$/);
              if (!monthMatch) {
                console.warn(`Invalid month format: ${payment.month}`);
                continue;
              }

              const year = parseInt(monthMatch[1]);
              const month = parseInt(monthMatch[2]);
              
              // Calculate new due date
              const newDueDate = calculatePaymentDueDate(year, month, newPaymentDueDate);
              const currentDueDate = payment.dueDate.toDate();
              
              // Only update if the due date would actually change
              if (newDueDate.getTime() !== currentDueDate.getTime()) {
                updatedPayments[j] = {
                  ...payment,
                  dueDate: Timestamp.fromDate(newDueDate),
                  // Update status if payment was overdue but now wouldn't be
                  status: this.updatePaymentStatusIfNeeded(payment, newDueDate)
                };
                hasUpdates = true;
                result.updatedPayments++;
              }
            }

            // Update the schedule if there were changes
            if (hasUpdates) {
              // Recalculate totals
              const totalAmount = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
              const totalPaid = updatedPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
              const outstandingAmount = totalAmount - totalPaid;

              batch.update(doc(db, 'payment_schedules', scheduleDoc.id), {
                payments: updatedPayments,
                totalAmount,
                totalPaid,
                outstandingAmount,
                updatedAt: Timestamp.now(),
              });
              
              result.updatedSchedules++;
            }
          } catch (error) {
            const errorMsg = `Error updating schedule ${scheduleDoc.id}: ${error}`;
            console.error(errorMsg);
            result.errors.push(errorMsg);
          }
        }
        
        batches.push(batch);
      }

      // Execute all batches
      for (const batch of batches) {
        await batch.commit();
      }

      console.log(`Payment schedule update completed:`, result);
      return result;
    } catch (error) {
      console.error('Error updating payment schedules:', error);
      throw error;
    }
  },

  /**
   * Update payment status if needed based on new due date
   * @param payment - The payment object
   * @param newDueDate - The new due date
   * @returns Updated status
   */
  updatePaymentStatusIfNeeded(payment: any, newDueDate: Date): string {
    const today = new Date();
    
    // If payment was overdue but new due date is in the future, make it pending
    if (payment.status === 'overdue' && newDueDate > today) {
      return 'pending';
    }
    
    // If payment was pending but new due date is in the past, make it overdue
    if (payment.status === 'pending' && newDueDate < today) {
      return 'overdue';
    }
    
    // Otherwise, keep the current status
    return payment.status;
  },

  /**
   * Get a preview of what would change without actually updating
   * @param newPaymentDueDate - The new payment due date setting
   * @returns Preview of changes
   */
  async previewPaymentScheduleUpdates(newPaymentDueDate: 'first_day' | 'last_day'): Promise<{
    totalSchedules: number;
    schedulesToUpdate: number;
    paymentsToUpdate: number;
    statusChanges: {
      overdueToPending: number;
      pendingToOverdue: number;
    };
  }> {
    try {
      const schedulesSnapshot = await getDocs(collection(db, 'payment_schedules'));
      const totalSchedules = schedulesSnapshot.docs.length;
      
      let schedulesToUpdate = 0;
      let paymentsToUpdate = 0;
      const statusChanges = {
        overdueToPending: 0,
        pendingToOverdue: 0
      };

      for (const scheduleDoc of schedulesSnapshot.docs) {
        const schedule = scheduleDoc.data();
        const payments = schedule.payments || [];
        let scheduleHasUpdates = false;

        for (const payment of payments) {
          // Skip deposit payments
          if (payment.type === 'deposit') {
            continue;
          }

          // Parse the month key
          const monthMatch = payment.month.match(/^(\d{4})-(\d{2})$/);
          if (!monthMatch) {
            continue;
          }

          const year = parseInt(monthMatch[1]);
          const month = parseInt(monthMatch[2]);
          
          // Calculate new due date
          const newDueDate = calculatePaymentDueDate(year, month, newPaymentDueDate);
          const currentDueDate = payment.dueDate.toDate();
          
          // Check if due date would change
          if (newDueDate.getTime() !== currentDueDate.getTime()) {
            paymentsToUpdate++;
            scheduleHasUpdates = true;
            
            // Check status changes
            const today = new Date();
            if (payment.status === 'overdue' && newDueDate > today) {
              statusChanges.overdueToPending++;
            } else if (payment.status === 'pending' && newDueDate < today) {
              statusChanges.pendingToOverdue++;
            }
          }
        }

        if (scheduleHasUpdates) {
          schedulesToUpdate++;
        }
      }

      return {
        totalSchedules,
        schedulesToUpdate,
        paymentsToUpdate,
        statusChanges
      };
    } catch (error) {
      console.error('Error previewing payment schedule updates:', error);
      throw error;
    }
  }
};
