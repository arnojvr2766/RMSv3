"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOverdueRoomsAutoLock = exports.checkLeaseExpiryReminders = exports.sendInvitationEmail = exports.helpChat = exports.helloWorld = void 0;
const functions = __importStar(require("firebase-functions"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const genkit_1 = require("genkit");
const googleai_1 = require("@genkit-ai/googleai");
const helpKnowledge_1 = require("./helpKnowledge");
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
// Genkit AI — Google AI Studio key (set via: firebase functions:secrets:set GEMINI_API_KEY)
let _ai = null;
function getAI() {
    if (!_ai) {
        _ai = (0, genkit_1.genkit)({ plugins: [(0, googleai_1.googleAI)({ apiKey: process.env.GEMINI_API_KEY })] });
    }
    return _ai;
}
// Gmail SMTP configuration — credentials must be set via Firebase secrets:
//   firebase functions:secrets:set EMAIL_USER
//   firebase functions:secrets:set EMAIL_PASSWORD
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});
// Export functions
exports.helloWorld = functions.https.onRequest((request, response) => {
    response.json({ message: 'Hello from Firebase Functions!' });
});
exports.helpChat = (0, https_1.onCall)({ secrets: ['GEMINI_API_KEY'] }, async (request) => {
    const { message, history } = request.data;
    if (!message || typeof message !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'message is required');
    }
    const messages = [
        ...((history || []).slice(-10).map((h) => ({
            role: h.role,
            content: [{ text: h.content }],
        }))),
        { role: 'user', content: [{ text: message }] },
    ];
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await getAI().generate({
                model: 'googleai/gemini-2.5-flash-lite',
                system: helpKnowledge_1.HELP_KNOWLEDGE,
                messages,
            });
            return { reply: response.text };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const isRateLimit = msg.includes('429') || msg.includes('quota') || msg.includes('rate');
            console.error(`helpChat attempt ${attempt + 1} error:`, msg);
            if (isRateLimit && attempt < 2) {
                await sleep(1500 * (attempt + 1)); // 1.5s, then 3s
                continue;
            }
            if (isRateLimit) {
                throw new functions.https.HttpsError('resource-exhausted', 'AI service is busy. Please try again in a moment.');
            }
            throw new functions.https.HttpsError('internal', 'Failed to generate a response.');
        }
    }
    throw new functions.https.HttpsError('internal', 'Failed to generate a response.');
});
// Send invitation email function
exports.sendInvitationEmail = functions.https.onRequest(async (request, response) => {
    // Enable CORS
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type');
    if (request.method === 'OPTIONS') {
        response.status(204).send('');
        return;
    }
    try {
        const { firstName, lastName, email, role, invitationLink } = request.body;
        if (!firstName || !lastName || !email || !role || !invitationLink) {
            response.status(400).json({ error: 'Missing required fields' });
            return;
        }
        const roleDisplay = role === 'system_admin' ? 'System Administrator' : 'Standard User';
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to RentDesk - Set Up Your Account</title>
          <style>
            body {
              font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.6;
              color: #333333;
              background-color: #f8f9fa;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #1A1A1A 0%, #333333 100%);
              padding: 40px 30px;
              text-align: center;
            }
            .logo-container {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 80px;
              height: 80px;
              background: linear-gradient(135deg, #FFD300 0%, #FFE55C 100%);
              border-radius: 20px;
              margin-bottom: 20px;
              box-shadow: 0 8px 25px rgba(255, 211, 0, 0.3);
            }
            .logo {
              width: 50px;
              height: 50px;
              border-radius: 10px;
            }
            .header h1 {
              color: #ffffff;
              font-size: 32px;
              font-weight: 700;
              margin: 0 0 8px 0;
              letter-spacing: -0.5px;
            }
            .header p {
              color: #FFD300;
              font-size: 16px;
              font-weight: 500;
              margin: 0;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 24px;
              font-weight: 600;
              color: #1A1A1A;
              margin: 0 0 20px 0;
            }
            .message {
              font-size: 16px;
              color: #666666;
              margin: 0 0 30px 0;
              line-height: 1.7;
            }
            .role-badge {
              display: inline-block;
              background: linear-gradient(135deg, #FFD300 0%, #FFE55C 100%);
              color: #1A1A1A;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin: 20px 0;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #FFD300 0%, #FFE55C 100%);
              color: #1A1A1A;
              text-decoration: none;
              padding: 16px 32px;
              border-radius: 12px;
              font-size: 18px;
              font-weight: 600;
              text-align: center;
              margin: 30px 0;
              box-shadow: 0 4px 15px rgba(255, 211, 0, 0.3);
            }
            .features {
              background-color: #f8f9fa;
              border-radius: 12px;
              padding: 30px;
              margin: 30px 0;
            }
            .features h3 {
              color: #1A1A1A;
              font-size: 20px;
              font-weight: 600;
              margin: 0 0 20px 0;
              text-align: center;
            }
            .feature-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .feature-list li {
              display: flex;
              align-items: center;
              margin: 12px 0;
              font-size: 14px;
              color: #666666;
            }
            .feature-list li::before {
              content: '✓';
              color: #FFD300;
              font-weight: bold;
              margin-right: 12px;
              font-size: 16px;
            }
            .footer {
              background-color: #1A1A1A;
              padding: 30px;
              text-align: center;
            }
            .footer p {
              color: #999999;
              font-size: 14px;
              margin: 0 0 10px 0;
            }
            .footer a {
              color: #FFD300;
              text-decoration: none;
            }
            .expiry-notice {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              text-align: center;
            }
            .expiry-notice p {
              color: #856404;
              font-size: 14px;
              margin: 0;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-container">
                <img src="https://rmsv3-becf7.web.app/RentDesk.png" alt="RentDesk Logo" class="logo">
              </div>
              <h1>RentDesk</h1>
            </div>
            <div class="content">
              <h2 class="greeting">Welcome, ${firstName}!</h2>
              <p class="message">
                You've been invited to join RentDesk, our comprehensive rental management system.
                Your administrator has created an account for you with <strong>${roleDisplay}</strong> privileges.
              </p>
              <div class="role-badge">${roleDisplay}</div>
              <div class="expiry-notice">
                <p>⏰ This invitation expires in 7 days</p>
              </div>
              <div style="text-align: center;">
                <a href="${invitationLink}" class="cta-button">Set Up Your Password</a>
              </div>
              <div class="features">
                <h3>What you can do with RentDesk:</h3>
                <ul class="feature-list">
                  <li>Manage rental facilities and properties</li>
                  <li>Track tenant information and lease agreements</li>
                  <li>Process rent payments and overdue accounts</li>
                  <li>Generate comprehensive property reports</li>
                  <li>Configure business rules and policies</li>
                  <li>Monitor maintenance requests and expenses</li>
                </ul>
              </div>
              <p class="message">
                Once you set up your password, you'll have full access to the RentDesk dashboard
                and can start managing your rental properties immediately.
              </p>
            </div>
            <div class="footer">
              <p>This invitation was sent by your RentDesk administrator.</p>
              <p>If you didn't expect this invitation, please contact your administrator or
                <a href="mailto:support@rentdesk.com">support@rentdesk.com</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px;">© 2025 RentDesk. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
        const mailOptions = {
            from: `RentDesk <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Welcome to RentDesk - Set Up Your Account',
            html: htmlContent,
        };
        await transporter.sendMail(mailOptions);
        console.log(`Invitation email sent to ${email}`);
        response.json({ success: true, message: 'Email sent successfully' });
    }
    catch (error) {
        console.error('Error sending invitation email:', error);
        response.status(500).json({ error: 'Failed to send email' });
    }
});
// ---------------------------------------------------------------------------
// Scheduled: Check lease expiry and send reminder notifications
// Runs daily at 9:00 AM UTC
// ---------------------------------------------------------------------------
exports.checkLeaseExpiryReminders = (0, scheduler_1.onSchedule)({ schedule: '0 9 * * *', timeZone: 'UTC' }, async (_event) => {
    try {
        const today = new Date();
        const oneMonthFromNow = new Date(today);
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
        const leasesSnap = await db.collection('leases')
            .where('status', '==', 'active')
            .get();
        let remindersCreated = 0;
        for (const leaseDoc of leasesSnap.docs) {
            const lease = leaseDoc.data();
            if (!lease.endDate)
                continue;
            const endDate = lease.endDate.toDate ? lease.endDate.toDate() : new Date(lease.endDate);
            const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            // Send reminders at ~30, 21, 14, and 7 days before expiry
            const reminderThresholds = [30, 21, 14, 7];
            const shouldRemind = reminderThresholds.some((threshold) => daysUntilExpiry <= threshold && daysUntilExpiry > threshold - 1);
            if (!shouldRemind)
                continue;
            // Check for existing reminder at this threshold to avoid duplicates
            const existingSnap = await db.collection('notifications')
                .where('relatedId', '==', leaseDoc.id)
                .where('type', '==', 'lease_expiry')
                .get();
            const alreadySentToday = existingSnap.docs.some((doc) => {
                var _a, _b;
                const created = (_b = (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a);
                if (!created)
                    return false;
                return (created.toDateString() === today.toDateString());
            });
            if (alreadySentToday)
                continue;
            // Notify the tenant's assigned users (facility admins / system admins)
            const usersSnap = await db.collection('users')
                .where('status', '==', 'active')
                .where('role', 'in', ['system_admin', 'facility_admin'])
                .get();
            const batch = db.batch();
            for (const userDoc of usersSnap.docs) {
                const notifRef = db.collection('notifications').doc();
                batch.set(notifRef, {
                    userId: userDoc.id,
                    type: 'lease_expiry',
                    title: 'Lease Expiring Soon',
                    message: `Lease ${leaseDoc.id} expires in ${daysUntilExpiry} day(s) (${endDate.toLocaleDateString()}).`,
                    relatedId: leaseDoc.id,
                    read: false,
                    actionUrl: '/leases',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                remindersCreated++;
            }
            await batch.commit();
        }
        console.log(`Lease expiry check complete. Reminders created: ${remindersCreated}`);
    }
    catch (error) {
        console.error('Error in checkLeaseExpiryReminders:', error);
    }
});
// ---------------------------------------------------------------------------
// Scheduled: Auto-lock rooms with overdue rent
// Runs daily at 8:00 AM UTC
// ---------------------------------------------------------------------------
exports.checkOverdueRoomsAutoLock = (0, scheduler_1.onSchedule)({ schedule: '0 8 * * *', timeZone: 'UTC' }, async (_event) => {
    var _a, _b;
    let locked = 0;
    let errors = 0;
    try {
        // Get org settings for autoLockAfterDays threshold
        const settingsSnap = await db.collection('organizationSettings').limit(1).get();
        const autoLockAfterDays = settingsSnap.empty ? 5 : ((_a = settingsSnap.docs[0].data().autoLockAfterDays) !== null && _a !== void 0 ? _a : 5);
        const today = new Date();
        const dayOfMonth = today.getDate();
        if (dayOfMonth <= autoLockAfterDays) {
            console.log(`Auto-lock skipped: day ${dayOfMonth} <= threshold ${autoLockAfterDays}`);
            return;
        }
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        // Get all occupied rooms
        const roomsSnap = await db.collection('rooms').where('status', '==', 'occupied').get();
        if (roomsSnap.empty) {
            console.log('No occupied rooms found.');
            return;
        }
        // Get active leases and build roomId → leaseId map
        const leasesSnap = await db.collection('leases').where('status', '==', 'active').get();
        const leaseByRoom = new Map();
        for (const doc of leasesSnap.docs) {
            leaseByRoom.set(doc.data().roomId, doc.id);
        }
        // Get system admins for notifications
        const adminsSnap = await db.collection('users')
            .where('role', '==', 'system_admin')
            .where('status', '==', 'active')
            .get();
        const adminIds = adminsSnap.docs.map((d) => d.id);
        for (const roomDoc of roomsSnap.docs) {
            try {
                const room = roomDoc.data();
                const roomId = roomDoc.id;
                const leaseId = leaseByRoom.get(roomId);
                if (!leaseId)
                    continue;
                // Check payment schedule for current month
                const scheduleSnap = await db.collection('paymentSchedules')
                    .where('leaseId', '==', leaseId)
                    .limit(1)
                    .get();
                if (scheduleSnap.empty)
                    continue;
                const schedule = scheduleSnap.docs[0].data();
                const payments = (_b = schedule.payments) !== null && _b !== void 0 ? _b : [];
                const currentPayment = payments.find((p) => p.month === currentMonth);
                if (!currentPayment || currentPayment.status !== 'pending')
                    continue;
                // Lock the room
                await roomDoc.ref.update({
                    status: 'locked',
                    lastStatusChange: admin.firestore.FieldValue.serverTimestamp(),
                    lastOccupancyState: 'occupied',
                });
                // Add to room status history
                await db.collection('roomStatusHistory').add({
                    roomId,
                    fromStatus: 'occupied',
                    toStatus: 'locked',
                    changedAt: admin.firestore.FieldValue.serverTimestamp(),
                    changedBy: 'system',
                    reason: `Auto-locked: no payment for ${currentMonth} by day ${dayOfMonth}`,
                });
                // Notify system admins
                const batch = db.batch();
                for (const adminId of adminIds) {
                    const notifRef = db.collection('notifications').doc();
                    batch.set(notifRef, {
                        userId: adminId,
                        type: 'room_locked',
                        title: 'Room Auto-Locked: Overdue Rent',
                        message: `Room ${room.roomNumber} has been automatically locked. No payment received for ${currentMonth} (day ${dayOfMonth} of month).`,
                        relatedId: roomId,
                        read: false,
                        actionUrl: '/rooms',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                await batch.commit();
                locked++;
                console.log(`Locked room ${room.roomNumber} (${roomId})`);
            }
            catch (roomError) {
                console.error(`Error processing room ${roomDoc.id}:`, roomError);
                errors++;
            }
        }
    }
    catch (error) {
        console.error('Error in checkOverdueRoomsAutoLock:', error);
        errors++;
    }
    console.log(`Auto-lock complete. Locked: ${locked}, Errors: ${errors}`);
});
//# sourceMappingURL=index.js.map