# RMSv3 Regression Testing Guide

This document provides comprehensive test scenarios for all implemented features.

## Prerequisites

1. **Firebase Emulator Running**
   ```bash
   npm run firebase:emulators
   ```

2. **Development Server Running**
   ```bash
   npm run dev
   ```

3. **Test Users Created**
   - System Admin: `system_admin@test.com` / `password123`
   - Standard User: `standard_user@test.com` / `password123`

---

## Test Suite 1: Room Occupation Controls

### Test 1.1: Room Status Quick Update
**Objective**: Verify room status can be updated via quick action

**Steps**:
1. Log in as `system_admin@test.com`
2. Navigate to **Rooms** page
3. Find any room and click the **Status Update** button (refresh icon)
4. Select "Locked" status
5. Click "Update Status"
6. Verify room status changes to "Locked" in the room list

**Expected Result**: 
- Status updates successfully
- Room displays with "Locked" badge (orange color)
- Status is persisted after page refresh

---

### Test 1.2: Auto-Switch from Locked to Occupied After Payment
**Objective**: Verify room auto-switches from "Locked" to "Occupied" after successful payment

**Prerequisites**:
- Room with status "Locked"
- Active lease for that room
- Payment schedule exists

**Steps**:
1. Set a room status to "Locked" (Test 1.1)
2. Navigate to **Leases** page
3. Find lease for the locked room
4. Open payment capture for the current month
5. Enter payment amount = full rent amount
6. Select payment method
7. Set payment date
8. Submit payment

**Expected Result**:
- Payment is captured successfully
- Room status automatically changes from "Locked" to "Occupied"
- Room status persists as "Occupied"

---

### Test 1.3: Room Status Display
**Objective**: Verify all room statuses display correctly with appropriate colors

**Steps**:
1. Navigate to **Rooms** page
2. Check status badges for different rooms:
   - Available (green)
   - Occupied (blue)
   - Maintenance (yellow)
   - Locked (orange)
   - Empty (purple)
   - Unavailable (gray)

**Expected Result**: All status badges display with correct colors

---

## Test Suite 2: Room Rental Controls (Financial)

### Test 2.1: Role-Based Access - System Admin
**Objective**: Verify system admin can edit all financial fields

**Steps**:
1. Log in as `system_admin@test.com`
2. Navigate to **Rooms** page
3. Click "Add Room" or edit existing room
4. Verify the following fields are **editable**:
   - Monthly Rent
   - Deposit Amount
   - Late Fee Amount
   - Late Fee Start Day
   - Child Surcharge
   - Grace Period Days
   - Payment Methods

**Expected Result**: All financial fields are editable input fields

---

### Test 2.2: Role-Based Access - Standard User
**Objective**: Verify standard user CANNOT edit financial fields

**Steps**:
1. Log in as `standard_user@test.com`
2. Navigate to **Rooms** page
3. Click "Add Room" or edit existing room
4. Verify the following fields are **read-only** (display as gray disabled fields):
   - Monthly Rent (shows as read-only with "Only system admin can edit" message)
   - Deposit Amount (shows as read-only with "Only system admin can edit" message)
   - Business Rules section (all fields read-only)
5. Verify the following fields ARE editable:
   - Room number, type, capacity, amenities
   - Status (can change dates)

**Expected Result**: 
- Financial fields are read-only for standard users
- Non-financial fields remain editable

---

### Test 2.3: One Payment Per Month Validation
**Objective**: Verify system prevents multiple payments in same month (when partial payments disabled)

**Prerequisites**:
- Room with active lease
- Organization settings: `allowPartialPayments = false`
- Existing payment for current month already captured

**Steps**:
1. Navigate to lease payment schedule
2. Try to capture payment for a month that already has a payment
3. Submit payment form

**Expected Result**: 
- Validation error: "Only one payment per month per room is allowed"
- Payment is NOT saved

**Test 2.3b: With Partial Payments Enabled**
1. Change organization setting: `allowPartialPayments = true` (system admin only)
2. Try to capture multiple payments for same month
3. Submit payment form

**Expected Result**: Multiple payments allowed for same month

---

### Test 2.4: Deposit Before Rent Validation
**Objective**: Verify deposit must be paid before rent if room was "Empty" last month

**Prerequisites**:
- Room that had status "Empty" last month (set `lastMonthStatus = 'empty'` or `lastOccupancyState = 'empty'`)
- Active lease for that room
- Deposit not yet paid

**Steps**:
1. Navigate to lease payment schedule
2. Try to capture a "rent" payment for current month
3. Submit payment

**Expected Result**: 
- Validation error: "Deposit must be paid before rent can be captured for rooms that were Empty last month"
- Payment is NOT saved

**Follow-up Steps**:
1. Capture deposit payment first
2. Then try to capture rent payment

**Expected Result**: Rent payment is now allowed after deposit is paid

---

### Test 2.5: Outstanding Rent Validation
**Objective**: Verify previous month's outstanding rent must be settled before new month

**Prerequisites**:
- Lease with payment schedule
- Previous month has outstanding balance (partial payment or unpaid)

**Steps**:
1. Navigate to payment schedule
2. Verify previous month shows outstanding balance
3. Try to capture payment for current/next month
4. Submit payment

**Expected Result**: 
- Validation error: "Outstanding rent from previous month must be settled first"
- Payment is NOT saved

**Follow-up Steps**:
1. Complete payment for previous month (full amount)
2. Then try to capture payment for new month

**Expected Result**: New month payment is now allowed

---

### Test 2.6: Auto Penalty Calculation
**Objective**: Verify penalties are auto-calculated based on payment date vs cutoff date

**Prerequisites**:
- Lease with business rules:
  - `lateFeeStartDay = 4` (cutoff day of month)
  - `lateFeeAmount = 20` (R20 per day late)
  - `gracePeriodDays = 5`

**Steps**:
1. Navigate to payment capture
2. Set payment date to **after cutoff day** (e.g., payment due on 1st, paid on 10th)
3. Submit payment
4. Check aggregated penalty section

**Expected Result**: 
- Penalty auto-calculated: `(10 - 4) × 20 = R120`
- Penalty appears in aggregated penalty
- Penalty amount added to total due

**Test 2.6b: Payment Before Cutoff (No Penalty)**
1. Set payment date to **before cutoff day** (e.g., paid on 2nd, cutoff is 4th)
2. Submit payment

**Expected Result**: No penalty applied

---

## Test Suite 3: Lease Controls

### Test 3.1: Lease Document Upload
**Objective**: Verify signed lease and ID document can be uploaded

**Steps**:
1. Navigate to **Leases** page
2. Open/create a lease
3. Click "Upload Documents" or similar action
4. Upload signed lease photo (camera or file)
5. Upload ID document photo (camera or file)
6. Enter tenant name
7. Enter caretaker name
8. Save

**Expected Result**: 
- Both photos upload successfully
- Photos are stored in Firebase Storage
- Photos are linked to lease document
- Tenant and caretaker names saved

---

### Test 3.2: Lease Acceptance Flow
**Objective**: Verify lease can be accepted without e-signature

**Steps**:
1. Complete document upload (Test 3.1)
2. Click "Accept Lease" button
3. Verify acceptance is recorded

**Expected Result**: 
- Lease status changes to "accepted"
- `acceptedAt` timestamp is set
- `acceptedBy` field populated

---

### Test 3.3: Lease Expiry Notifications
**Objective**: Verify lease expiry notifications are created and displayed

**Prerequisites**:
- Active lease expiring within 1 month
- Cloud Function scheduled job running (or manual trigger)

**Steps**:
1. Check notifications bell icon in header
2. Navigate to **Notifications** page
3. Verify lease expiry notifications appear:
   - 1 month before expiry
   - Weekly until expiry (4 total)

**Expected Result**: 
- Notification badge shows unread count
- Notifications appear in list
- Clicking notification navigates to lease detail
- Notifications can be marked as read

**Note**: For manual testing, you may need to:
1. Create a lease with `endDate` = 1 month from now
2. Manually trigger `leaseReminderService.checkAndCreateLeaseReminders()` or wait for scheduled function

---

## Test Suite 4: Pre/Post Inspection System

### Test 4.1: Inspection Form - Meta Fields
**Objective**: Verify inspection meta fields are captured correctly

**Steps**:
1. Navigate to lease detail
2. Click "Create Pre-Inspection" or "Create Post-Inspection"
3. Verify form opens with:
   - Room Number (auto-filled from room)
   - Date picker (defaults to today)
   - Form Number (optional field)

**Expected Result**: All meta fields display correctly

---

### Test 4.2: Inspection Form - Checklist Items
**Objective**: Verify all 37 checklist items are present and functional

**Steps**:
1. Open inspection form
2. Verify all 5 sections are present:
   - Section 1: Room Inside (5 items)
   - Section 2: Doors (6 items)
   - Section 3: Toilet / Shower / Washbasin (10 items)
   - Section 4: Windows and Frames (5 items)
   - Section 5: Lights and Plugs (11 items)
3. Expand each section
4. For each item, test YES/NO buttons:
   - Click YES → button turns green (if positive question) or red (if negative question)
   - Click NO → button turns green/red appropriately

**Expected Result**: 
- All 37 items present
- YES/NO buttons work correctly
- Button colors reflect good (green) vs issue (red) states

---

### Test 4.3: Inspection Form - Negative Questions Logic
**Objective**: Verify negative questions (e.g., "Are there holes?") work correctly

**Test Cases**:
- Question: "Are there holes in the walls?"
  - Click NO → Should show GREEN (no holes = good)
  - Click YES → Should show RED (has holes = bad)

- Question: "Is the toilet working?"
  - Click YES → Should show GREEN (working = good)
  - Click NO → Should show RED (not working = bad)

**Expected Result**: Negative and positive questions are interpreted correctly

---

### Test 4.4: Inspection Form - Repair Cost
**Objective**: Verify repair cost input appears when issue is detected

**Steps**:
1. For any checklist item, click button that indicates issue (red)
2. Verify repair cost input field appears
3. Enter repair cost (e.g., R150.00)
4. Enter notes (optional)
5. Click button that indicates good (green) for same item

**Expected Result**: 
- Repair cost input appears only when issue detected
- Repair cost saved when item has issue
- Repair cost resets to 0 when item marked as good

---

### Test 4.5: Inspection Form - Total Repair Cost
**Objective**: Verify total repair cost is calculated correctly

**Steps**:
1. Set multiple items to have issues
2. Enter repair costs for each:
   - Item 1: R100
   - Item 2: R50
   - Item 3: R200
3. Verify total repair cost displays: R350

**Expected Result**: Total repair cost = sum of all item repair costs

---

### Test 4.6: Inspection Form - Photos
**Objective**: Verify before/after photos can be uploaded

**Steps**:
1. Upload before photos (for pre-inspection)
2. Verify photos appear in grid
3. Upload after photos (for post-inspection only)
4. Remove a photo by clicking X button

**Expected Result**: 
- Photos upload successfully
- Photos display in grid
- Photos can be removed

---

### Test 4.7: Inspection Form - Signatures
**Objective**: Verify tenant and caretaker signatures can be captured

**Steps**:
1. Enter tenant name
2. Upload tenant signature photo
3. Enter caretaker name
4. Upload caretaker signature photo
5. Verify signatures display correctly

**Expected Result**: 
- Signature photos upload successfully
- Signature photos display in form
- Signatures saved with inspection

---

### Test 4.8: Inspection Form - Comments
**Objective**: Verify comments field works

**Steps**:
1. Scroll to comments section
2. Enter text: "Any other comments from TENANT please write here:"
3. Save inspection

**Expected Result**: Comments saved with inspection

---

### Test 4.9: Inspection Form - Progress Indicator
**Objective**: Verify progress tracking works

**Steps**:
1. Start filling inspection form
2. Complete 10 items → Verify progress shows 10/37
3. Complete 20 items → Verify progress shows 20/37
4. Complete all items → Verify progress shows 37/37 (100%)

**Expected Result**: Progress bar updates in real-time as items are completed

---

### Test 4.10: Inspection Form - Mobile Optimization
**Objective**: Verify form is optimized for mobile capture

**Steps**:
1. Open inspection form on mobile device or narrow browser window
2. Verify:
   - Buttons are large enough to tap easily (60px+ height)
   - Sections are collapsible
   - "Expand All" / "Collapse All" buttons work
   - Form scrolls smoothly
   - Photos upload from mobile camera

**Expected Result**: Form is mobile-friendly and efficient for on-site capture

---

### Test 4.11: Inspection - Deposit Refund Calculation
**Objective**: Verify deposit refund = deposit - repair costs

**Prerequisites**:
- Post-inspection completed
- Total repair cost = R500
- Original deposit = R2000

**Steps**:
1. Navigate to deposit payout
2. Verify deposit refund shows: R2000 - R500 = R1500
3. Verify inspection is required before deposit payout

**Expected Result**: 
- Deposit refund correctly calculated
- Cannot request deposit payout without inspection

---

## Test Suite 5: Integration Tests

### Test 5.1: Complete Lease Flow
**Objective**: Verify end-to-end lease lifecycle

**Steps**:
1. **Create Lease**
   - Create new lease
   - Upload signed lease and ID documents
   - Accept lease

2. **Pre-Inspection**
   - Complete pre-inspection form
   - All 37 items checked
   - Some issues noted with repair costs

3. **Payment Capture**
   - Capture deposit payment
   - Capture first month rent
   - Verify room status switches to "Occupied"

4. **Monthly Payments**
   - Capture payments for multiple months
   - Test late payment penalty calculation

5. **Post-Inspection**
   - Complete post-inspection when lease ends
   - Compare before/after conditions
   - Calculate final repair costs

6. **Deposit Refund**
   - Request deposit payout
   - Verify refund = deposit - repair costs

**Expected Result**: Complete flow works end-to-end

---

### Test 5.2: Multiple Users - Permission Checks
**Objective**: Verify role-based permissions work across features

**Steps**:
1. **As System Admin**:
   - Verify can edit all room financial fields
   - Verify can approve payments requiring approval
   - Verify can access all features

2. **As Standard User**:
   - Verify cannot edit room financial fields
   - Verify can only change dates and capture children count
   - Verify can capture payments (subject to validation rules)

**Expected Result**: Permissions enforced correctly per role

---

## Test Suite 6: Error Handling & Edge Cases

### Test 6.1: Validation Error Messages
**Objective**: Verify all validation errors display user-friendly messages

**Test Cases**:
- Try to capture payment when deposit required first → Clear error message
- Try to capture payment when outstanding rent exists → Clear error message
- Try to capture duplicate payment → Clear error message
- Try to save inspection without room number → Validation error

**Expected Result**: All errors have clear, actionable messages

---

### Test 6.2: Empty States
**Objective**: Verify empty states display correctly

**Test Cases**:
- No rooms → Appropriate empty state
- No leases → Appropriate empty state
- No notifications → Appropriate empty state
- No inspections → Appropriate empty state

**Expected Result**: All empty states provide helpful messaging

---

### Test 6.3: Date Edge Cases
**Objective**: Verify date handling works correctly

**Test Cases**:
- Payment date before lease start → Validation error
- Payment date far in future → Validation error or warning
- Inspection date on lease end date → Should work

**Expected Result**: Date validations prevent invalid entries

---

## Quick Smoke Test Checklist

For rapid testing, verify these critical paths:

- [ ] Login as system admin
- [ ] Create room with financial fields
- [ ] Login as standard user
- [ ] Verify financial fields are read-only
- [ ] Update room status to "Locked"
- [ ] Capture payment → Verify room auto-switches to "Occupied"
- [ ] Create pre-inspection → Complete all 37 items
- [ ] Upload inspection photos
- [ ] Complete signatures
- [ ] Save inspection
- [ ] Check notifications appear
- [ ] Verify deposit refund calculation

---

## Test Data Setup

For comprehensive testing, create test data:

1. **Rooms**:
   - Room with status "Locked"
   - Room with status "Empty"
   - Room with `lastMonthStatus = 'empty'`
   - Room with active lease

2. **Leases**:
   - Lease expiring in 25 days (for notification testing)
   - Lease with outstanding balance
   - Lease with completed pre-inspection
   - Lease with completed post-inspection

3. **Payment Schedules**:
   - Schedule with previous month unpaid
   - Schedule with partial payment
   - Schedule with late payment (for penalty testing)

---

## Reporting Issues

When reporting bugs, include:
1. Test case number
2. Steps to reproduce
3. Expected vs actual result
4. Browser/device information
5. Console errors (if any)
6. Screenshots (if applicable)

---

## Notes

- **Cloud Functions**: Some features (lease reminders) require Cloud Functions to be deployed or manually triggered
- **Firebase Storage**: Ensure Storage emulator is running for photo uploads
- **Real-time Updates**: Some features use Firestore real-time listeners - verify updates appear without refresh
- **Mobile Testing**: Test critical flows on actual mobile devices for true mobile UX validation

---

**Last Updated**: $(date)
**Version**: 1.0

