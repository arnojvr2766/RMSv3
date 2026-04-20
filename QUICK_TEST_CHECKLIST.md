# Quick Test Checklist

Use this checklist for rapid smoke testing of critical features.

## Pre-Test Setup

- [ ] Firebase emulators running (`npm run dev:all`)
- [ ] Test users created:
  - [ ] System Admin: `system_admin@test.com`
  - [ ] Standard User: `standard_user@test.com`

---

## Critical Path Tests (15 minutes)

### 1. Authentication & Permissions
- [ ] ✅ Login as system admin
- [ ] ✅ Login as standard user
- [ ] ✅ Logout works

### 2. Room Management
- [ ] ✅ View rooms list
- [ ] ✅ Create new room (system admin - all fields editable)
- [ ] ✅ Edit room (standard user - financial fields read-only)
- [ ] ✅ Update room status to "Locked"
- [ ] ✅ Update room status to "Empty"
- [ ] ✅ All status badges display with correct colors

### 3. Payment Controls
- [ ] ✅ Capture payment (full amount)
- [ ] ✅ Room status auto-switches from "Locked" → "Occupied" after payment
- [ ] ✅ Validation: Cannot pay rent if deposit required first (room was Empty)
- [ ] ✅ Validation: Cannot pay new month if previous month outstanding
- [ ] ✅ Validation: Cannot pay duplicate (when partial payments disabled)
- [ ] ✅ Penalty auto-calculated for late payments

### 4. Lease Documents
- [ ] ✅ Upload signed lease photo
- [ ] ✅ Upload ID document photo
- [ ] ✅ Enter tenant name
- [ ] ✅ Enter caretaker name
- [ ] ✅ Accept lease

### 5. Inspection Form
- [ ] ✅ Open pre-inspection form
- [ ] ✅ All 5 sections present (37 items total)
- [ ] ✅ YES/NO buttons work (green = good, red = issue)
- [ ] ✅ Negative questions work correctly (e.g., "Are there holes?" - NO = good)
- [ ] ✅ Repair cost input appears when issue detected
- [ ] ✅ Total repair cost calculates correctly
- [ ] ✅ Upload before photos
- [ ] ✅ Upload signature photos
- [ ] ✅ Save inspection

### 6. Notifications
- [ ] ✅ Notification bell shows in header
- [ ] ✅ Unread count displays correctly
- [ ] ✅ Notifications page accessible
- [ ] ✅ Mark notification as read

---

## Extended Tests (30 minutes)

### Financial Controls
- [ ] ✅ System admin can edit: rent, deposit, fees, rules
- [ ] ✅ Standard user CANNOT edit financial fields
- [ ] ✅ Standard user CAN edit: dates, children count
- [ ] ✅ Partial payments toggle works (org setting)

### Room Status Transitions
- [ ] ✅ Locked → Occupied (auto after payment)
- [ ] ✅ Empty → Occupied (after new lease + deposit)
- [ ] ✅ Available → Occupied (after lease)
- [ ] ✅ Occupied → Maintenance
- [ ] ✅ Status history tracked (`lastOccupancyState`)

### Payment Validations
- [ ] ✅ One payment per month (enforced when partial disabled)
- [ ] ✅ Deposit before rent (if room was Empty)
- [ ] ✅ Outstanding rent check (prevents future payments)
- [ ] ✅ Late payment penalties (auto-calculated)

### Inspection System
- [ ] ✅ Pre-inspection: All 37 items, photos, signatures
- [ ] ✅ Post-inspection: Compare before/after
- [ ] ✅ Deposit refund = deposit - repair costs
- [ ] ✅ Cannot request deposit without inspection
- [ ] ✅ Mobile form works smoothly

### Lease Expiry
- [ ] ✅ Notification created 1 month before expiry
- [ ] ✅ Weekly notifications until expiry (4 total)
- [ ] ✅ Notifications appear for system admin
- [ ] ✅ Notifications appear for standard user

---

## Edge Cases (10 minutes)

- [ ] ✅ Error messages are clear and actionable
- [ ] ✅ Empty states display correctly
- [ ] ✅ Form validation prevents invalid data
- [ ] ✅ Real-time updates work (no refresh needed)
- [ ] ✅ Photos upload from mobile camera
- [ ] ✅ Large forms scroll smoothly

---

## Browser Compatibility (5 minutes)

- [ ] ✅ Chrome/Edge (desktop)
- [ ] ✅ Safari (desktop)
- [ ] ✅ Mobile Chrome
- [ ] ✅ Mobile Safari

---

## Performance Check

- [ ] ✅ Page loads in < 3 seconds
- [ ] ✅ Forms are responsive (< 1s interactions)
- [ ] ✅ Images load efficiently
- [ ] ✅ No console errors

---

## Quick Test Command Reference

```bash
# Start everything
npm run dev:all

# Create test users
npm run create:users

# Run linter
npm run lint
```

---

## Test Data Requirements

For full testing, ensure you have:
- Room with status "Locked"
- Room with status "Empty"
- Room with `lastMonthStatus = 'empty'`
- Active lease with payment schedule
- Lease expiring within 1 month (for notifications)

---

**Pass Criteria**: All critical path tests (✅) must pass
**Time Estimate**: 15-45 minutes depending on thoroughness

