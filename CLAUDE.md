# RentDesk — CLAUDE.md

This file gives AI assistants (Claude) the context needed to work on this codebase effectively without re-reading everything from scratch.

---

## Project Overview

**RentDesk** (codebase: RMSv3) is a multi-facility rental management system for South African boarding houses, lodges, and residential properties. It manages rooms, renters, leases, payments, penalties, maintenance, and complaints.

- **Frontend**: React + TypeScript + Vite + Tailwind CSS (dark theme)
- **Backend**: Firebase (Firestore database, Firebase Auth, Firebase Storage)
- **Hosting**: Firebase Hosting
- **Functions**: Firebase Cloud Functions (`functions/src/index.ts`)

---

## Role System

Four roles, enforced via `RoleContext` and Firestore user documents:

| Role | Access |
|------|--------|
| `super-admin` | Full access across all organizations |
| `facility-admin` (System Admin in UI) | Full access within their org; sees `SystemAdminDashboardSimple.tsx` instead of regular dashboard |
| `standard-user` | Day-to-day operations; some actions require approval |
| `read-only` | View only |

`isSystemAdmin = role === 'facility-admin' || role === 'super-admin'`

**Important**: System Admins land on `src/pages/SystemAdminDashboardSimple.tsx`, NOT `src/pages/Dashboard.tsx`. Any quick-action feature added to the dashboard must also be added to the System Admin dashboard separately.

---

## Key Data Model

### Firestore Collections
- `facilities` — buildings/properties
- `rooms` — individual rentable units within a facility
- `renters` — tenant personal info (replaces old `tenants`)
- `leases` — rental agreements linking renter + room
- `payment_schedules` — one per lease; contains the full array of monthly payment entries
- `users` — staff accounts

### Payment Schedule Structure
A single `payment_schedules` document contains:
```
{
  leaseId, facilityId, roomId, renterId,
  payments: [{ month, dueDate, amount, type, status, paidAmount, paidDate, paymentMethod, ... }],
  totalAmount, totalPaid, outstandingAmount,
  aggregatedPenalty: { totalAmount, paidAmount, outstandingAmount, ... }  // may be absent
}
```
`payments[].month` format: `"YYYY-MM"` (e.g. `"2026-03"`). `payments[].type`: `'rent' | 'deposit' | 'late_fee' | 'deposit_payout' | 'maintenance'`.

---

## Key Business Logic

### Late Fees (Auto-Calculated)
Late fees are **not entered manually** — they are calculated and logged automatically when a payment is captured late.

**How it works:**
1. In `PaymentCapture.tsx`, when the user enters a payment date later than the grace period, an orange warning banner appears: *"Late fee: R460 (23 days × R20/day) — will be added to penalties automatically."*
2. When the user clicks "Process Payment", `aggregatedPenaltyService.updateAggregatedPenalty()` is called automatically. This records the penalty in `paymentSchedule.aggregatedPenalty`.
3. The penalty does NOT exist until the payment is first submitted. So on the **first** late payment for a renter, the "Outstanding Penalties" section will not yet be visible — it appears on subsequent visits after the first late fee has been logged.

**Late fee formula**: `daysLate × lateFeeAmount` where `daysLate` = days past `lateFeeStartDay` (or due date + grace period days). Configured per facility in Settings > Organization Settings.

### Collecting a Penalty Alongside Rent
After at least one late payment has been recorded, an **"Outstanding Penalties"** section appears in `PaymentCapture`. It shows the accumulated penalty balance with:
- A checkbox: *"Include penalty payment with this transaction"*
- If checked: penalty amount and payment method fields appear
- The penalty is processed via `aggregatedPenaltyService.processPenaltyPayment()`

### Payment Approval Workflow
Backdated payments (entering a payment date in the past beyond the allowed window) are set to `status: 'pending_approval'` and require admin review. Controlled by `paymentValidation` via `usePaymentValidation()` hook in `src/utils/paymentValidation.ts`.

### Room Status States
`'available' | 'occupied' | 'maintenance' | 'unavailable' | 'locked' | 'empty'`

- `locked` = renter's lease expired/terminated but deposit not yet refunded; room cannot be re-rented
- `empty` = room is vacant and available again after clearance
- `lastOccupancyState` tracks previous state for history
- Room auto-switches `locked → occupied` when a payment is successfully captured

### Deposit Before Rent Rule
If a room was in `empty` status last month, the deposit must be captured before rent. Enforced by `validateDepositBeforeRent()` in `paymentValidation.ts`.

---

## Key Flows

### New Rental Agreement (Wizard)
`src/components/forms/NewRentalWizard.tsx` — 4-step wizard:
1. **Room** — select room (all rooms shown; non-available grayed out with status badge)
2. **Renter** — search existing or create new (new renters added to `localRenters` state so they appear immediately without reloading)
3. **Lease Terms** — rent, deposit, dates, lease type, children
4. **Review & Confirm** — summary before saving

Entry points:
- `Dashboard.tsx` → "New Rental Agreement" quick action button
- `SystemAdminDashboardSimple.tsx` → same button in quick actions grid
- `Rooms.tsx` → clicking "Add Renter" on a room row opens wizard pre-filled with that room

### Payment Capture
`src/components/forms/PaymentCapture.tsx`

- Header shows **Room number · Renter name** (loaded on mount)
- "Paying for" dropdown lists all payments in the schedule
- Inline late fee warning (orange banner) appears if payment date is past grace period
- Outstanding penalties section appears if `aggregatedPenalty.outstandingAmount > 0`
- Payment proof: upload file or take photo via camera

### Lease Termination
`src/components/forms/LeaseTerminationForm.tsx` — handles termination, sets room to `locked` status, calculates deposit refund.

### Deposit Payout
`src/components/forms/DepositPayout.tsx` — captures deposit refund after termination, transitions room from `locked` to `empty`.

---

## Context & Settings

- `OrganizationSettingsContext` — global org settings (late fees, payment due day, partial payment toggle, etc.)
- `RoleContext` — current user's role and permissions
- `AuthContext` — Firebase auth user
- `ToastContext` — `showSuccess()` / `showError()` for notifications
- `DeviceContext` — mobile/desktop detection for responsive layout

---

## Services (src/services/)

| Service | Purpose |
|---------|---------|
| `firebaseService.ts` | All Firestore CRUD — `roomService`, `renterService`, `leaseService`, `paymentScheduleService`, etc. |
| `aggregatedPenaltyService.ts` | Late fee calculation and penalty ledger management |
| `paymentApprovalService.ts` | Payment approval workflow |
| `organizationSettingsService.ts` | Org settings read/write |
| `dashboardService.ts` | Dashboard metrics aggregation |
| `storageService.ts` | Firebase Storage file uploads |
| `notificationService.ts` | In-app notifications |
| `inspectionService.ts` | Room inspection records |

---

## File Locations — Quick Reference

| What | Where |
|------|-------|
| Types | `src/types/index.ts` |
| Routes / App shell | `src/App.tsx` |
| Auth guard | `src/components/auth/AdminRoute.tsx` |
| System Admin dashboard | `src/pages/SystemAdminDashboardSimple.tsx` |
| Regular dashboard | `src/pages/Dashboard.tsx` |
| Rooms page | `src/pages/Rooms.tsx` |
| Payments page | `src/pages/Payments.tsx` |
| Leases page | `src/pages/Leases.tsx` |
| Training content | `src/training/content/` |
| Payment validation utils | `src/utils/paymentValidation.ts` |
| Global CSS / theme | `src/index.css` |

---

## Coding Conventions

- Dark theme throughout — `bg-gray-800`, `bg-gray-700`, `text-white`, `text-gray-400`
- Primary colour: `primary-500` (yellow/gold — defined in Tailwind config)
- Status badges: `bg-green-500/20 text-green-400`, `bg-red-500/20 text-red-400`, etc.
- Forms use the custom `Input`, `Button`, `Card` components from `src/components/ui/`
- `Timestamp` from `firebase/firestore` — always use `.toDate()` to convert; use `parseDateLocal()` pattern for date inputs to avoid UTC off-by-one-day issues
- Firebase listeners are rarely used — most data is fetched once on mount with `async/await`

---

## Known Gotchas

- **System Admin sees a different dashboard** — any new feature on Dashboard.tsx must also be added to SystemAdminDashboardSimple.tsx
- **`getMonthName()` was renamed to `getMonthLabel()`** in PaymentCapture.tsx — returns "April 2025" not "Month 2025-04 (April)"
- **`Room` type has optional `businessRules?`** — always use `?.` when accessing, not direct access
- **New renters in wizard** — not yet in Firestore query results; stored in `localRenters` state in `StepRenter`
- **`parseDateLocal(dateString)`** — use this when converting date input strings to avoid UTC midnight → previous day bug
