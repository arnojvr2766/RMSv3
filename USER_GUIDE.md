# RentDesk RMS — Complete User Guide

> **Version 3** · Last updated March 2026

---

## Table of Contents

1. [What is RentDesk?](#1-what-is-rentdesk)
2. [Roles & Permissions](#2-roles--permissions)
3. [Getting Started — First Login](#3-getting-started--first-login)
4. [The Dashboard](#4-the-dashboard)
5. [Facilities](#5-facilities)
6. [Rooms](#6-rooms)
7. [Renters (Tenants)](#7-renters-tenants)
8. [Leases](#8-leases)
9. [Payments](#9-payments)
10. [Payment Approvals *(Admin)*](#10-payment-approvals-admin)
11. [Maintenance & Expenses](#11-maintenance--expenses)
12. [Penalties](#12-penalties)
13. [Complaints](#13-complaints)
14. [Notifications](#14-notifications)
15. [Reports *(Admin)*](#15-reports-admin)
16. [Training Center](#16-training-center)
17. [Settings *(Admin)*](#17-settings-admin)
18. [Your Profile & Password](#18-your-profile--password)
19. [Quick Reference — Room Statuses](#19-quick-reference--room-statuses)
20. [Quick Reference — Payment Statuses](#20-quick-reference--payment-statuses)
21. [Common Questions & Troubleshooting](#21-common-questions--troubleshooting)

---

## 1. What is RentDesk?

RentDesk is a web-based **Rental Management System** for managing residential rooms, tenants, leases, and payments across one or more properties.

It is designed for property management teams of any size — from a single manager running a small boarding house to a multi-property operation with several staff members.

**Core capabilities:**
- Manage multiple facilities (buildings/properties) and all their rooms
- Onboard renters and create legally-traceable lease agreements
- Record and track rent payments with an approval workflow
- Conduct and store room inspections at move-in, mid-term, and move-out
- Log and resolve tenant complaints
- Track maintenance expenses and late-payment penalties
- Generate income and occupancy reports
- Train new staff with built-in interactive courses

---

## 2. Roles & Permissions

Every user in RentDesk has one of two roles:

### System Administrator
Full access to everything. Responsible for:
- Setting up and configuring the system
- Creating and managing staff accounts
- Approving payment submissions from staff
- Deleting records
- Accessing reports and financial data
- Managing organization-wide settings

### Standard User
Day-to-day operations access. Responsible for:
- Adding and managing renters and their leases
- Recording rent payments (submitted for admin approval)
- Conducting room inspections
- Logging complaints and maintenance issues
- Viewing rooms, facilities, and lease details

> **Note:** If you try to perform an action and receive a "Permission Denied" error, it is an admin-only function. Contact your System Administrator.

---

## 3. Getting Started — First Login

### Step 1 — Receive your invitation
Your System Administrator creates your account and sends you a welcome email with your login credentials or a password-setup link.

### Step 2 — Set your password
If you received a setup link, click it and choose a secure password (minimum 8 characters, mix of letters and numbers recommended).

### Step 3 — Log in
1. Open RentDesk in your browser.
2. Enter your **email address** and **password**.
3. Click **Sign In**.

You will land on the **Dashboard** — your home screen.

### Step 4 — Update your profile
Click your name in the top-right corner to open your Profile page. Confirm your display name, add a phone number, and change your password if you haven't already.

---

## 4. The Dashboard

The Dashboard is your at-a-glance view of what's happening across all properties.

### Summary Cards
At the top you'll see key numbers:
- **Total Rooms** — how many rooms are in the system
- **Occupied** — rooms with active tenants
- **Available** — rooms ready to be leased
- **Overdue Accounts** — tenants who have missed payment

### Activity Feed
A live feed of recent actions in the system — new leases, payments recorded, inspections completed, complaints filed.

### Upcoming Expirations
Leases expiring in the next 30 days are flagged here so you can proactively contact tenants about renewals.

> **Tip:** Check the Dashboard every morning. Overdue accounts and expiring leases are the two things that need the most proactive attention.

---

## 5. Facilities

Facilities are the top-level grouping — each facility represents a building, complex, or property location. All rooms belong to a facility.

### Viewing Facilities
Click **Facilities** in the sidebar to see all your properties, their room counts, and occupancy rates.

### Adding a Facility *(Admin only)*
1. Click **+ Add Facility**.
2. Enter the **Facility Name** (e.g., "Sunrise Apartments Block A").
3. Enter the full **Address**.
4. Optionally add a description or notes.
5. Click **Save Facility**.

### Editing a Facility *(Admin only)*
Click the facility name → click the **Edit** button → update details → **Save**.

> **Tip:** Use clear, descriptive names. If you manage multiple blocks or types, include that in the name (e.g., "Green Valley — Studio Block").

---

## 6. Rooms

Rooms are the individual rentable units within a facility.

### Viewing Rooms
Click **Rooms** in the sidebar. You'll see a list of all rooms across all facilities with:
- Room number/name
- Facility it belongs to
- Current status (Available, Occupied, Locked, etc.)
- Monthly rate
- Current tenant name (if occupied)

Use the **filter bar** to filter by facility, status, or search by room number.

### Adding a Room *(Admin only)*
1. Click **+ Add Room**.
2. Select the **Facility**.
3. Enter the **Room Number or Name** (e.g., "101" or "Studio 4B").
4. Select the **Room Type** (single, double, studio, etc.).
5. Enter the **Monthly Rate**.
6. Set the initial **Status** (usually "Available").
7. Add any notes (floor, features, furnishing, etc.).
8. Click **Save Room**.

### Updating Room Status
Some status changes happen automatically (e.g., a room becomes Occupied when a lease is created). You can also change status manually:

1. Click on the room to open its detail page.
2. Click the current **status badge** or **Update Status** button.
3. Select the new status.
4. Add a note explaining the reason.
5. Click **Confirm**.

> **Warning:** Changing an Occupied room's status manually does NOT terminate the lease. Always process a lease termination first through the Leases page.

### Room Status Reference
| Status | Meaning |
|---|---|
| Available | Clean, ready to lease |
| Occupied | Active tenant with current lease |
| Locked | Occupied but access restricted due to overdue rent |
| Maintenance | Undergoing repairs, unavailable |
| Cleaning | Vacant, being prepared after move-out |
| Vacant | Empty, not yet ready |

---

## 7. Renters (Tenants)

A renter profile stores everything about a tenant — their personal details, documents, lease history, and payment records.

### Viewing Renters
Click **Renters** in the sidebar. Search by name or scroll to find a tenant. Click any renter to open their full profile.

### Adding a New Renter
Before a tenant can be given a lease, they need a renter profile.

1. Click **+ Add Renter**.
2. Enter their **Full Name** (required).
3. Enter their **Email Address** — must be unique and accurate.
4. Enter their **Phone Number**.
5. Enter their **ID Number** (national ID, passport, etc.).
6. Add an **Emergency Contact** name and phone number.
7. Click **Save Renter**.

> **Important:** Always search for the renter first to avoid duplicate profiles. Duplicates cause confusion in payment records and reports.

### Editing a Renter
Open the renter's profile → click **Edit** → update fields → **Save Changes**.

### Viewing a Renter's History
The renter detail page shows:
- All past and current leases
- Complete payment history
- Any complaints filed
- Notes added by staff

---

## 8. Leases

A lease links a renter to a room for a defined period. It is the foundation of all financial tracking for that tenant.

### Viewing Leases
Click **Leases** in the sidebar. Filter by status (Active, Expired, Terminated) or search by tenant name or room.

### Creating a New Lease

**Before you start, confirm:**
- The renter profile exists in the system
- The room is in Available or Ready status (not already occupied)
- You have the agreed rent amount, deposit amount, and lease dates

**Steps:**
1. Click **+ New Lease**.
2. Select the **Facility**.
3. Select the **Room**.
4. Select the **Renter** (type to search by name).
5. Set the **Lease Start Date**.
6. Set the **Lease End Date**.
7. Enter the **Monthly Rent** amount.
8. Enter the **Deposit Amount** collected upfront.
9. Select the **Payment Frequency** (monthly is most common).
10. Set the **Payment Due Day** (e.g., "5" = rent due on 5th of each month).
11. Add any special notes or terms (optional).
12. Click **Create Lease**.

The room status automatically changes to **Occupied** once the lease is saved.

> **Warning:** Double-check the rent amount and dates before saving. Changes to financial amounts after creation require careful review.

### Uploading a Signed Lease Document
1. Open the lease.
2. Click **Upload Document** (attachment icon).
3. Select your file (PDF, JPG, or PNG — max 10MB).
4. Click **Upload**.

### Processing a Lease Termination
When a tenant moves out:

1. Open the active lease.
2. Click **Terminate Lease**.
3. Enter the **move-out date** and **termination reason**.
4. Record any **deposit deductions** (damages, cleaning fees, unpaid rent). Be specific.
5. Enter the **refund amount** (deposit minus deductions).
6. Add notes explaining any deductions for audit records.
7. Click **Confirm Termination**.

The room status will update to Vacant or Cleaning automatically.

> **Tip:** Conduct a move-out inspection before terminating the lease so the room condition is documented.

> **Warning:** Do not terminate a lease until the tenant has physically moved out. Termination is a permanent action.

---

## 9. Payments

All rent payments are recorded by staff and submitted for admin approval before being finalized.

### Viewing Payments
Click **Payments** in the sidebar. You'll see a list of all payment records with their amounts, dates, methods, and approval status.

Filter by:
- **Status** (Pending, Approved, Rejected, Overdue)
- **Facility** or **Room**
- **Date range**

### Recording a Payment

1. Click **+ Record Payment**.
2. Select the **Facility** and **Room**.
3. The system auto-fills the tenant's name and lease details.
4. Enter the **Amount Paid** (exact amount received).
5. Set the **Payment Date** — the date you received the money (not today if different).
6. Select the **Payment Method** (Cash, Mobile Money, Bank Transfer, etc.).
7. Enter a **Reference Number** if available (bank transfer ID, receipt number).
8. Add **Notes** for any context (e.g., "Partial payment, balance promised Friday").
9. Optionally **upload a receipt photo** — strongly recommended for cash payments.
10. Click **Submit Payment**.

The payment will show as **Pending** until approved by an admin.

> **Important:** Do not tell the tenant their payment is confirmed until it shows **Approved** status. Only approved payments update the account balance.

### Handling Partial Payments
Record the actual amount received. In the Notes field, write the outstanding balance and promised date. When the balance arrives, record it as a separate payment.

### Overdue Accounts
Accounts become overdue when rent passes the due date without an approved payment. You can:
- View all overdue accounts via the **Payments → Overdue** filter
- Check the **Dashboard** overdue count card
- Filter Rooms by **Locked** status to see auto-locked accounts

If a room is auto-locked by the system, only an admin can unlock it.

---

## 10. Payment Approvals *(Admin only)*

All payments submitted by staff appear in the Payment Approvals queue for admin review.

### Reviewing Payments
1. Click **Payment Approvals** in the sidebar.
2. You'll see all **Pending** submissions.
3. Click any payment to view full details — amount, date, method, receipt photo, and who submitted it.
4. Click **Approve** to finalize, or **Reject** and enter a reason.

Approved payments immediately update the tenant's account balance and payment history.

> **Tip:** Always review the attached receipt photo when present. For large or unusual amounts, verify with the staff member who submitted it before approving.

Rejected payments return to the staff member with your reason. They will need to re-submit with corrections.

---

## 11. Maintenance & Expenses

Track the cost of repairs and maintenance work on rooms and facilities.

### Recording a Maintenance Expense
1. Navigate to **Maintenance** in the sidebar.
2. Click **+ Add Expense**.
3. Select the **Facility** and **Room** the expense relates to.
4. Describe the **Work Done**.
5. Enter the **Cost**.
6. Set the **Date** the work was completed.
7. Upload a **Receipt or Invoice** if available.
8. Click **Save**.

Maintenance records appear in the room's history and feed into financial reporting.

---

## 12. Penalties

Penalties are charges added to a tenant's account — late payment fees, damage charges, or other fines.

### Adding a Penalty
1. Open the relevant **Lease** or **Renter** profile.
2. Click **Add Penalty**.
3. Select the **Penalty Type** (Late Payment, Damage, Other).
4. Enter the **Amount**.
5. Write a clear **Description** explaining the reason.
6. Click **Save Penalty**.

Penalties increase the tenant's outstanding balance and are visible in their payment history.

> **Note:** Penalties factor into overdue calculations. A tenant with approved rent payments but an unpaid penalty may still show an outstanding balance.

---

## 13. Complaints

Log and track tenant complaints, facility issues, or any matter needing management attention.

### Logging a Complaint
1. Click **Complaints** in the sidebar.
2. Click **+ New Complaint**.
3. Select the **Facility** and **Room**.
4. Enter the **Renter's Name** if it's a tenant complaint.
5. Select the **Category** (Maintenance, Noise, Billing, Cleanliness, Other).
6. Set the **Priority**: Low, Medium, High, or Urgent.
7. Write a short **Subject** line.
8. Write a detailed **Description** — the more detail, the faster it can be resolved.
9. Click **Submit**.

### Priority Guide
| Priority | Use When |
|---|---|
| Low | Minor inconvenience, no urgency |
| Medium | Needs attention within a few days |
| High | Impacting tenant comfort or ability to use the room |
| Urgent | Safety hazard, broken lock, flooding, power failure — also call your admin immediately |

### Tracking Complaints
Complaints move through these statuses:
- **Open** — submitted, not yet actioned
- **In Progress** — admin/management is working on it
- **Resolved** — issue has been closed

Filter by status on the Complaints page to see what's open vs. resolved.

### Resolving a Complaint *(Admin only)*
1. Open the complaint detail.
2. Update the **Status** to "In Progress" when action begins.
3. Add **Resolution Notes** describing what was done.
4. Change **Status** to "Resolved" when complete.
5. Click **Save**.

---

## 14. Notifications

RentDesk sends automatic notifications to keep you informed of important events.

### Viewing Notifications
Click the **bell icon** in the top header, or click **Notifications** in the sidebar.

### Types of Notifications
- **Lease expiring soon** — 30, 21, 14, and 7 days before a lease end date
- **Payment approved or rejected** — when an admin acts on your submission
- **Room auto-locked** — when the system locks a room due to overdue rent
- **Complaint status update** — when a complaint you filed is updated

### Marking as Read
Click any notification to mark it as read. Unread notifications show a badge count on the bell icon.

---

## 15. Reports *(Admin only)*

The Reports page gives a full financial picture of your properties.

### Accessing Reports
Click **Reports** in the sidebar. This section is visible to System Administrators only.

### Monthly Income Report
The default view shows the **current month's** income summary:
- **Total Collected** — all approved payments this month
- **Outstanding** — rent due but not yet paid
- **Occupancy Rate** — percentage of rooms currently occupied
- **Deposit Liability** — total deposits held across all active leases

Use the **← →** arrows to navigate to previous months (up to 12 months back).

Click any **bar in the chart** to select that month and see its breakdown below.

### Per-Facility Breakdown
Scroll down to see income figures split by facility — useful for comparing property performance.

### Room Status Summary
A count of how many rooms are in each status (Occupied, Available, Locked, Vacant, Maintenance, Cleaning).

### Overdue Accounts
A list of all tenants with outstanding balances, showing:
- Tenant name and room
- Amount owed
- Number of days overdue

### Exporting Data
Two CSV exports are available:
- **Export Income CSV** — all approved payments for the selected month
- **Export Overdue CSV** — current list of all overdue accounts

Both are compatible with Excel, Google Sheets, and most accounting software.

---

## 16. Training Center

The Training Center is built into RentDesk to help all staff learn the system at their own pace.

### Accessing Training
Click **Training** in the sidebar. Available to all users.

### Courses Tab
Your role determines which courses appear:
- **System Administrators** see the *System Administrator Fundamentals* course
- **Standard Users** see the *Standard User Essentials* course

Each course is broken into **Modules**, and each module into **Lessons**.

**To complete a lesson:**
1. Click on a course to open it.
2. Expand a module and click a lesson.
3. Read through the lesson content.
4. Click **Mark as Complete** at the bottom.

Your progress is saved automatically. A progress bar shows how far through each course you are.

Upon completing all lessons in a course, you receive a **certification badge**.

### Reference Docs Tab
A searchable library of step-by-step how-to guides covering every common task. Use the search bar to find guides by keyword, or browse by category:
- Facilities & Rooms
- Renters & Leases
- Payments
- Admin & Approvals
- Maintenance & Penalties
- System Settings
- Reports

### Team Progress Tab *(Admin only)*
See all staff members' training completion status at a glance — which courses they've started, their percentage progress, and who has been certified.

---

## 17. Settings *(Admin only)*

Click **Settings** in the sidebar to configure the system.

### User Management Tab
**Creating a new staff account:**
1. Click **+ Invite User**.
2. Enter their **Full Name** and **Email**.
3. Select their **Role** (System Admin or Standard User).
4. Click **Send Invitation**.

The staff member receives an email with login instructions.

**Enabling or disabling a user:**
- Find the user in the list.
- Click the **Enable/Disable** toggle or action button.
- Disabled users cannot log in immediately.

> **Action required when staff leave:** Disable their account the same day they leave the organization.

**Deleting a user:**
User accounts can be permanently deleted. Historical records they created (payments, leases, etc.) are preserved for audit purposes.

### Payment Settings Tab
Configure the financial rules for your organization:

| Setting | Description |
|---|---|
| Payment Due Date | Default day of month rent is due |
| Allow Past Payments | Whether staff can record payments with past dates |
| Max Past Payment Days | How many days back a past payment can be dated |
| Require Admin Approval for Past Payments | Adds approval step for backdated entries |
| Default Late Fee | Auto-applied late fee amount |
| Child Surcharge | Additional charge per child occupant |
| Auto-lock After Days | Days overdue before a room is automatically locked |

### Standard User Permissions Tab
Control what Standard Users can access:

| Permission | Effect |
|---|---|
| Access Facilities | Standard users can view/add facilities |
| Access Rooms | Standard users can view/update rooms |
| Access Leases | Standard users can create and manage leases |
| Access Payments | Standard users can record payments |
| Access Renters | Standard users can add and edit renters |
| Access Maintenance | Standard users can log maintenance expenses |
| Access Penalties | Standard users can add penalties |

### UI Preferences Tab
Personal display preferences (per-user, not organization-wide):
- Default view mode (list vs. grid)
- Items per page
- Show/hide advanced options

### Notifications Tab
Control which notification types you receive and how frequently.

---

## 18. Your Profile & Password

### Accessing Your Profile
Click your **name or avatar** in the top-right corner of the header.

### Updating Contact Information
On the Profile page you can update:
- **Display Name** — the name shown throughout the system
- **Phone Number** — for internal directory purposes

Click **Save Changes** to update.

### Changing Your Password
1. Scroll to the **Change Password** section.
2. Enter your **Current Password**.
3. Enter your **New Password** (minimum 8 characters).
4. Confirm the new password.
5. Click **Update Password**.

> **Security tip:** Use a unique password that you don't use for other services. Never share your RentDesk password with colleagues — each person must have their own account for audit trail purposes.

---

## 19. Quick Reference — Room Statuses

| Status | What it means | How it's set |
|---|---|---|
| Available | Clean and ready to lease | Manually or after cleaning complete |
| Occupied | Active lease in place | Auto — when lease is created |
| Locked | Occupied, overdue rent | Auto (after X days) or manually by admin |
| Maintenance | Under repair | Manually by staff |
| Cleaning | Being prepared after move-out | Auto after lease termination or manually |
| Vacant | Empty, not yet ready | Auto after lease termination |

---

## 20. Quick Reference — Payment Statuses

| Status | What it means |
|---|---|
| Pending | Submitted by staff, awaiting admin approval |
| Approved | Confirmed by admin, account updated |
| Rejected | Declined by admin — re-submit with corrections |
| Overdue | Due date passed with no approved payment recorded |

---

## 21. Common Questions & Troubleshooting

**Q: I submitted a payment but it disappeared.**
A: It's likely in Pending status. Filter payments by "Pending" to find it. It hasn't been approved yet.

**Q: A tenant says their room is locked but they paid rent.**
A: Check if the payment is Approved or still Pending. If it's Pending, escalate to an admin to approve it. If approved, the admin will need to manually unlock the room.

**Q: I can't find a renter when creating a lease.**
A: The renter profile must be created first. Go to Renters → + Add Renter, save their profile, then return to create the lease.

**Q: I entered the wrong rent amount on a lease.**
A: Contact your System Administrator. Financial amounts on active leases should only be edited by admins to maintain audit integrity.

**Q: I get "Permission Denied" when trying to do something.**
A: This is an admin-only action. Contact your System Administrator.

**Q: The app is showing outdated data.**
A: Refresh the page. If you're on a slow connection, some data loads may take a few seconds. Check if you're in offline mode (the app will show a warning banner).

**Q: I forgot my password.**
A: On the login screen, click **Forgot Password** and enter your email. You'll receive a reset link. If you don't receive it, contact your System Administrator.

**Q: A lease termination was done by mistake.**
A: Contact your System Administrator immediately. Termination actions affect the payment schedule and room status — admin can review and correct.

**Q: How do I record a deposit refund?**
A: Deposit refunds are handled as part of the lease termination process. When terminating, enter the deductions and refund amount. A payout record is created automatically for admin review.

---

*For additional help, use the built-in Training Center — it contains interactive courses and step-by-step guides for every feature described in this document.*
