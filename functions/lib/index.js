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
exports.sendInvitationEmail = exports.helloWorld = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
// Initialize Firebase Admin
admin.initializeApp();
// Gmail SMTP configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'arnoj17@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'wlxi tjcd jzps rvhj',
    },
});
// Export functions
exports.helloWorld = functions.https.onRequest((request, response) => {
    response.json({ message: 'Hello from Firebase Functions!' });
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
            from: 'RentDesk <arnoj17@gmail.com>',
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
//# sourceMappingURL=index.js.map