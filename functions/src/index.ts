import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';

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
