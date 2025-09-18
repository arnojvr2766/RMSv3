import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  Timestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculatePaymentDueDate, isPaymentOverdue } from '../utils/paymentUtils';

// Overdue Service
export const overdueService = {
  // Check and update overdue payments
  checkAndUpdateOverduePayments: async (): Promise<void> => {
    try {
      console.log('Checking for overdue payments...');
      
      // Get all payment schedules
      const schedulesQuery = query(
        collection(db, 'payment_schedules')
      );
      
      const schedulesSnapshot = await getDocs(schedulesQuery);
      const batch = writeBatch(db);
      let overdueCount = 0;

      for (const scheduleDoc of schedulesSnapshot.docs) {
        const schedule = scheduleDoc.data();
        const payments = schedule.payments || [];
        let hasUpdates = false;
        const updatedPayments = [...payments];

        for (let i = 0; i < updatedPayments.length; i++) {
          const payment = updatedPayments[i];
          
          // Only check pending payments
          if (payment.status === 'pending') {
            // Get the payment due date setting for this schedule
            const paymentDueDateSetting = schedule.paymentDueDateSetting || 'first_day';
            
            // Parse the month key (e.g., "2025-09")
            const monthMatch = payment.month.match(/^(\d{4})-(\d{2})$/);
            if (!monthMatch) {
              console.warn(`Invalid month format: ${payment.month}`);
              continue;
            }

            const year = parseInt(monthMatch[1]);
            const month = parseInt(monthMatch[2]);
            
            // Calculate the correct due date based on the schedule's setting
            const correctDueDate = calculatePaymentDueDate(year, month, paymentDueDateSetting);
            
            // Check if payment is overdue using the correct due date
            if (isPaymentOverdue(correctDueDate)) {
              updatedPayments[i] = {
                ...payment,
                status: 'overdue'
              };
              hasUpdates = true;
              overdueCount++;
              console.log(`Payment ${payment.month} for lease ${schedule.leaseId} is now overdue (due date: ${correctDueDate.toDateString()})`);
            }
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
        }
      }

      if (overdueCount > 0) {
        await batch.commit();
        console.log(`Updated ${overdueCount} payments to overdue status`);
      } else {
        console.log('No overdue payments found');
      }
    } catch (error) {
      console.error('Error checking overdue payments:', error);
      throw error;
    }
  },

  // Check if a specific payment is overdue
  isPaymentOverdue: (dueDate: Date): boolean => {
    const today = new Date();
    return dueDate < today;
  },

  // Get days overdue for a payment
  getDaysOverdue: (dueDate: Date): number => {
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
};
