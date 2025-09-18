import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

// Initialize Firebase Admin
admin.initializeApp();

// Export functions
export const helloWorld = onRequest((request, response) => {
  response.json({ message: 'Hello from Firebase Functions!' });
});

// Payment processing function
export const processPayment = onDocumentCreated(
  {
    document: 'payments/{paymentId}',
    region: 'us-central1',
  },
  async (event) => {
    const payment = event.data?.data();
    const paymentId = event.params.paymentId;

    if (!payment) {
      console.error('No payment data found');
      return;
    }

    try {
      // Generate receipt number
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Update payment with receipt number
      await admin.firestore().collection('payments').doc(paymentId).update({
        receiptNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Payment ${paymentId} processed with receipt ${receiptNumber}`);
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  }
);

// Late fee calculation function
export const calculateLateFee = onDocumentUpdated(
  {
    document: 'payments/{paymentId}',
    region: 'us-central1',
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) {
      console.error('No payment data found');
      return;
    }

    // Check if payment date changed
    if (before.paymentDate !== after.paymentDate) {
      try {
        // Get facility settings
        const facilityDoc = await admin.firestore()
          .collection('facilities')
          .doc(after.facilityId)
          .get();

        if (!facilityDoc.exists) {
          console.error('Facility not found');
          return;
        }

        const facility = facilityDoc.data();
        const lateFeeStartDay = facility?.settings?.lateFeeStartDay || 4;
        const lateFeeAmount = facility?.settings?.lateFeeAmount || 20;

        // Calculate late fee
        const paymentDate = new Date(after.paymentDate);
        const dayOfMonth = paymentDate.getDate();
        
        let lateFee = 0;
        if (dayOfMonth > lateFeeStartDay) {
          const daysLate = dayOfMonth - lateFeeStartDay;
          lateFee = daysLate * lateFeeAmount;
        }

        // Update payment with late fee
        await admin.firestore().collection('payments').doc(event.params.paymentId).update({
          lateFee,
          total: after.amount + after.otherFees + lateFee,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Late fee calculated for payment ${event.params.paymentId}: R${lateFee}`);
      } catch (error) {
        console.error('Error calculating late fee:', error);
      }
    }
  }
);

// Send notification function
export const sendNotification = onRequest(
  {
    region: 'us-central1',
    cors: true,
  },
  async (request, response) => {
    try {
      const { token, title, body, data } = request.body;

      if (!token || !title || !body) {
        response.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token,
      };

      const result = await admin.messaging().send(message);
      response.json({ success: true, messageId: result });
    } catch (error) {
      console.error('Error sending notification:', error);
      response.status(500).json({ error: 'Failed to send notification' });
    }
  }
);

// Daily overdue payment check function
export const checkOverduePayments = onSchedule(
  {
    schedule: '0 9 * * *', // Run daily at 9 AM
    region: 'us-central1',
    timeZone: 'Africa/Johannesburg',
  },
  async () => {
    try {
      console.log('Starting daily overdue payment check...');
      
      // Get all payment schedules
      const schedulesSnapshot = await admin.firestore()
        .collection('payment_schedules')
        .get();
      
      const batch = admin.firestore().batch();
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
            const dueDate = payment.dueDate.toDate();
            const today = new Date();
            
            // Check if payment is overdue (past due date)
            if (dueDate < today) {
              updatedPayments[i] = {
                ...payment,
                status: 'overdue'
              };
              hasUpdates = true;
              overdueCount++;
              console.log(`Payment ${payment.month} for lease ${schedule.leaseId} is now overdue`);
            }
          }
        }

        // Update the schedule if there were changes
        if (hasUpdates) {
          // Recalculate totals
          const totalAmount = updatedPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
          const totalPaid = updatedPayments.reduce((sum: number, p: any) => sum + (p.paidAmount || 0), 0);
          const outstandingAmount = totalAmount - totalPaid;

          batch.update(scheduleDoc.ref, {
            payments: updatedPayments,
            totalAmount,
            totalPaid,
            outstandingAmount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
    }
  }
);
