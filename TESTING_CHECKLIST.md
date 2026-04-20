# RentDesk RMS v3 — End-to-End Testing Checklist

> **How to use:** Work through each section in order. Tick each checkbox as you confirm it works. Note any failures with a short comment next to the item.
>
> **Before you start:**
> - Run `npm run dev` and open the app in your browser
> - Open browser DevTools (`F12`) and keep the Console tab visible throughout
> - Have credentials for both a `system_admin` and a `standard_user` account ready
> - Test on desktop (> 1024px) and mobile (< 768px — use DevTools device emulator)

---

## 1. Authentication & Role-Based Access

### Login
- [x] Visiting `/` shows the login screen
- [x] Entering wrong credentials shows an error message (not a blank screen or crash)
- [ ] Logging in as a `standard_user` on desktop redirects to `/dashboard`
- [ ] Logging in as a `standard_user` on mobile (< 768px) redirects to `/mobile/dashboard`
- [x] Logging in as a `system_admin` redirects to `/dashboard` (System Admin view)
- [x] Logging out returns to `/` login screen

### Route Protection
- [x] Visiting `/dashboard` while logged out redirects to `/`
- [x] Visiting `/settings` while logged out redirects to `/`
- [x] Visiting `/reports` while logged out redirects to `/`
- [x] `standard_user` visiting `/settings` is redirected away
- [x] `standard_user` visiting `/reports` is redirected away
- [x] `standard_user` visiting `/payment-approvals` is redirected away
- [x] `system_admin` can access `/settings`, `/reports`, and `/payment-approvals`

### System Admin Dashboard
- [x] Logging in as `system_admin` shows the System Admin Dashboard (not the standard Dashboard)
- [x] System Admin Dashboard displays real organisation-level stats

---

## 2. Navigation & Layout

### Desktop Sidebar
- [x] Sidebar is visible on desktop (≥ 1024px)
- [x] All nav items are present: Dashboard, Facilities, Rooms, Renters, Leases, Payments, Maintenance, Penalties, Complaints, Payment Approvals, Notifications, Reports, Settings
- [x] Active route is highlighted in the sidebar
- [x] Sidebar can be collapsed and expanded via the toggle button
- [x] Sidebar shows red badge counts on: Payments, Payment Approvals, Notifications, Complaints
- [x] Badge counts are real numbers (not zero when data exists)
- [x] Badge counts refresh when navigating between pages

### Mobile Navigation
- [ ] On mobile (< 768px), the sidebar is hidden
- [ ] A hamburger menu icon is visible in the header on mobile
- [ ] Tapping the hamburger opens the sidebar
- [ ] Tapping a nav item in the sidebar closes it automatically
- [ ] The bottom navigation bar is visible on mobile with 5 tabs: Home, Payments, Renters, Leases, Issues
- [ ] Each bottom nav tab navigates to the correct page
- [ ] Active tab is highlighted (yellow)
- [ ] Bottom nav is hidden on desktop (≥ 1024px)
- [ ] Main content has enough bottom padding to not be obscured by the bottom nav

### Header
- [ ] Header is visible on all protected pages
- [ ] Header shows a Search icon — clicking it opens the Global Search modal
- [ ] Header shows a Notifications bell icon
- [ ] User profile/avatar is visible in the header

---

## 3. Global Search (Ctrl+K)

- [ ] Pressing `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac) opens the search modal
- [ ] Clicking the Search icon in the header opens the search modal
- [ ] Modal shows a loading state while fetching data
- [ ] Typing a renter's name filters results in real time
- [ ] Typing a room number filters results in real time
- [ ] Results show type badges (e.g. "Renter", "Room", "Lease")
- [ ] Clicking a result navigates to the correct page and closes the modal
- [ ] Pressing `Escape` closes the modal
- [ ] Clicking the backdrop (outside the modal) closes the modal
- [ ] Searching for something with no results shows an empty state message (not a crash)

---

## 4. Toast Notifications

> These appear bottom-right. Verify throughout all sections below that `alert()` popups are **never** used.

- [ ] Successful actions show a **green** toast (e.g. payment captured, lease created)
- [ ] Failed actions show a **red** toast (e.g. network error)
- [ ] Warning states show a **yellow** toast where applicable
- [ ] Toasts auto-dismiss after ~4 seconds
- [ ] Toasts can be manually dismissed by clicking `✕`
- [ ] Multiple toasts stack without overlapping incorrectly
- [ ] No `alert()`, `confirm()`, or `prompt()` browser dialogs appear anywhere in the app

---

## 5. Dashboard

> Log in as a `standard_user` for this section.

### Stat Cards
- [ ] "Monthly Revenue" shows a real R amount (not R 0 or a hardcoded value like R 45,230)
- [ ] "Occupancy Rate" shows a percentage with "X / Y rooms" subtitle
- [ ] "Overdue Payments" count is correct; number turns red if > 0
- [ ] "Active Tenants" count matches the number of active renters with "X pending payments" subtitle
- [ ] Stat cards show a loading skeleton while data is fetching (not a blank page)
- [ ] If data fails to load, an error banner appears with a Refresh button

### Quick Actions
- [ ] "Record Payment" button navigates to `/payments`
- [ ] "Add Tenant" button navigates to `/renters`
- [ ] "New Complaint" button navigates to `/complaints`
- [ ] "View Leases" button navigates to `/leases`

### Recent Payments Card
- [ ] Shows real payment records (real renter names, room numbers, amounts)
- [ ] Status badges are colour-coded: paid=green, pending=yellow, overdue=red, partial=blue
- [ ] "View All" button navigates to `/payments`
- [ ] Shows an empty state if no payments exist

### Portfolio Summary Card
- [ ] Facilities count is correct
- [ ] Total Rooms count is correct
- [ ] Available Rooms count is correct
- [ ] Collection Rate % is correct
- [ ] "Manage" button navigates to `/facilities`

### Refresh
- [ ] Clicking the Refresh icon in the header re-fetches all dashboard data
- [ ] The icon spins while loading

---

## 6. Facilities

- [ ] Facilities list loads and shows all facilities
- [ ] Creating a new facility (name, address, type) succeeds and it appears in the list
- [ ] Editing a facility updates it correctly
- [ ] Deleting a facility removes it from the list
- [ ] Empty state is shown when no facilities exist

---

## 7. Rooms

### List & Filtering
- [ ] Rooms list loads with correct room numbers, facility, rent, and status
- [ ] Filter by status (Available, Occupied, Maintenance) works
- [ ] Filter by facility works
- [ ] Search by room number works

### Create & Edit
- [ ] Creating a room (attach to facility, room number, rent, status) succeeds
- [ ] New room appears in the list
- [ ] Editing a room updates the details correctly

### Delete Confirmation Dialog
- [ ] Clicking the delete button on a room shows a **confirmation dialog modal** (not a browser `window.confirm()` popup)
- [ ] Clicking "Cancel" in the dialog closes it and the room is NOT deleted
- [ ] Clicking "Confirm" / "Delete" in the dialog deletes the room and it disappears from the list
- [ ] A success toast appears after deletion

---

## 8. Renters

### List & Filtering
- [ ] Renters list loads correctly in both card view and table view
- [ ] Search by name works
- [ ] Filter by status works

### Create
- [ ] Creating a renter with all required fields succeeds
- [ ] New renter appears in the list

### WhatsApp Links
- [ ] Open a renter who has a phone number starting with `0` (e.g. `0821234567`)
- [ ] In **card view**: a WhatsApp icon/link appears next to the phone number
- [ ] In **table view**: a WhatsApp icon/link appears in the Contact column
- [ ] Clicking the link opens `https://wa.me/2782...` (leading `0` replaced with `27`) in a **new tab**
- [ ] Clicking the WhatsApp link does NOT trigger any parent click handler (e.g. opening the renter detail)
- [ ] Phone numbers already starting with `27` are not double-prefixed

---

## 9. Leases

### List & Filtering
- [ ] Leases list loads with renter name, room, facility, dates, rent, and status
- [ ] Filter by status (Active, Expired, Terminated) works
- [ ] Search works

### Create
- [ ] Creating a lease (renter, room, start/end date, rent, deposit) succeeds
- [ ] Lease appears in list as Active

### Rent Increase Workflow
- [ ] An "Update Rent" button (TrendingUp icon) is visible on **active** leases
- [ ] Clicking "Update Rent" opens the Rent Increase modal
- [ ] Modal shows current rent and a field for new rent
- [ ] As you type the new rent, the % increase calculates live
- [ ] Entering a > 15% increase shows a yellow warning banner
- [ ] Effective date defaults to the 1st of next month
- [ ] A reason field is available
- [ ] Submitting updates `terms.monthlyRent` on the Firestore document
- [ ] Submitting appends an entry to the `rentHistory` array in Firestore
- [ ] Success toast appears after submission

### Lease Termination
- [ ] A "Terminate" button is visible on active leases
- [ ] Clicking Terminate opens the termination modal
- [ ] Modal correctly displays: renter name, room number, facility name (no `undefined` values)
- [ ] Adding additional charges works
- [ ] Submitting termination updates the lease status to Terminated
- [ ] Success toast appears

---

## 10. Payments

### List & Overview
- [ ] Payments page loads with all payment schedules
- [ ] Filter by status (Paid, Pending, Overdue, Partial) works
- [ ] Filter by facility works

### Payment Capture — Late Fee Preview
- [ ] Open PaymentCapture for an **overdue** payment (past due date)
- [ ] An orange banner appears inside the form showing:
  - Number of days late
  - Late fee amount (R)
  - Total due including late fee (R)
- [ ] The banner appears **before** submitting — as a preview while filling the form
- [ ] The banner does NOT appear for payments that are not overdue

### Payment Capture — Duplicate Guard
- [ ] Find a renter who already has a payment recorded for the current month
- [ ] Attempt to record another payment for the same renter and month
- [ ] A **yellow inline warning banner** appears in the form (not a browser `alert()`)
- [ ] The submit button is **disabled** until the warning is acknowledged
- [ ] A checkbox labelled "I understand" (or similar) appears
- [ ] Ticking the checkbox enables the submit button
- [ ] Changing the selected payment resets the warning and checkbox

### Payment Capture — Submission
- [ ] Submitting a valid payment shows a **receipt modal** (not just a success toast)
- [ ] Receipt modal shows: receipt number (format: `RD-YYYYMMDD-XXXX`), amount, payment method, date, month
- [ ] A "Print" button in the receipt modal triggers the browser print dialog
- [ ] Closing the receipt modal navigates back correctly

### capturedBy Field (Firestore check)
- [ ] After submitting a payment, open the Firestore console
- [ ] Find the payment document for that month
- [ ] `capturedBy` field contains a real Firebase UID (not the string `"current_user_id"`)

### Payment Approvals
- [ ] Payments requiring approval appear in `/payment-approvals`
- [ ] Approving a payment updates its status (success toast, no `alert()`)
- [ ] Declining a payment updates its status (success toast, no `alert()`)

---

## 11. Complaints (Maintenance)

### List & Filtering
- [ ] Complaints list loads correctly
- [ ] Filter by status (Open, In Progress, Resolved) works
- [ ] Filter by category works

### Create — Maintenance with Photo & Sub-category
- [ ] Creating a complaint with **Category = Maintenance** shows a sub-category dropdown
- [ ] Sub-category options: Plumbing, Electrical, Staff, Paint, Windows/Doors, Other
- [ ] Sub-category dropdown is NOT shown for non-maintenance categories
- [ ] An "Upload Photo" and/or "Take Photo" button is available
- [ ] Selecting a photo shows a preview before submitting
- [ ] Submitting the complaint succeeds (success toast)

### Detail View
- [ ] Opening a maintenance complaint shows the sub-category as a badge
- [ ] The uploaded photo renders correctly in the detail view
- [ ] Photo and sub-category are also visible in the list view subtitle line

---

## 12. Notifications

### Loading & Display
- [ ] Notifications page loads and shows notifications grouped by: Today, Yesterday, This Week, Older
- [ ] Unread count is shown in the page header
- [ ] Unread notifications have a left border or visual highlight

### Filters
- [ ] "All" filter shows all notifications
- [ ] "Unread" filter shows only unread notifications
- [ ] "Lease Expiry" filter shows only lease expiry notifications
- [ ] "Payment Overdue" filter shows only overdue payment notifications

### Actions (no alert() allowed)
- [ ] Clicking the ✓ icon on a notification marks it as read — **no browser `alert()`** appears
- [ ] Clicking the trash icon deletes a notification — **no browser `alert()`** appears
- [ ] Clicking "Mark all as read" marks all as read — **no browser `alert()`** appears
- [ ] If any of the above fail, a **red toast** appears bottom-right (not an `alert()`)
- [ ] Clicking a notification with an `actionUrl` navigates to that page

---

## 13. Reports

> Log in as a `system_admin` for this section.

### Charts
- [ ] Reports page loads with two charts visible:
  - "12-Month Revenue Overview" — vertical bar chart (Collected vs Outstanding)
  - "Facility Performance" — horizontal bar chart (occupancy per facility)
- [ ] Charts render without console errors
- [ ] Charts show real data (not all zeros)
- [ ] Hovering over chart bars shows a tooltip with values

### Facility Table
- [ ] A table below the charts lists each facility with: rooms, occupancy %, revenue, overdue payments

### PDF Export
- [ ] A "PDF" button (Printer icon) is visible on the Reports page
- [ ] Clicking it opens the browser print dialog
- [ ] In the print preview: sidebar and top navigation are **hidden**
- [ ] In the print preview: charts and tables are visible
- [ ] In the print preview: background is white, text is dark (print-friendly)

---

## 14. Maintenance & Penalties

### Maintenance
- [ ] Maintenance page loads without errors
- [ ] Creating a maintenance request succeeds
- [ ] Requests appear in the list with correct status

### Penalties
- [ ] Penalties page loads without errors
- [ ] Penalties are listed per renter/room
- [ ] Aggregated penalties display correctly

---

## 15. Settings (System Admin only)

- [ ] Settings page loads for `system_admin`
- [ ] Organisation settings (late fee amount, grace period, etc.) load correctly
- [ ] Updating a setting saves successfully (success toast)
- [ ] Changes are reflected in the relevant features (e.g. late fee preview in PaymentCapture)

---

## 16. Mobile Pages

> Resize browser to < 768px or use DevTools device emulator.

### Mobile Dashboard (`/mobile/dashboard`)
- [ ] Mobile dashboard loads on login from a mobile-sized viewport
- [ ] Key stats are visible and readable on small screen
- [ ] Tapping Quick Actions navigates correctly

### Mobile Payments (`/mobile/payments`)
- [ ] Payment list loads correctly on mobile
- [ ] Tapping a payment opens the payment capture form
- [ ] Payment can be submitted on mobile

### Mobile Rooms (`/mobile/rooms`)
- [ ] Rooms list loads and is scrollable
- [ ] Room status is visible

### Mobile Renters (`/mobile/renters`)
- [ ] Renters list loads correctly
- [ ] Search works on mobile

### Mobile Leases (`/mobile/leases`)
- [ ] Leases list loads and shows key info

### Mobile Inspections (`/mobile/inspections`)
- [ ] Inspections page loads without errors

---

## 17. Cross-Cutting Concerns

### Console Errors
- [ ] No red errors in the browser console on any page
- [ ] No warnings about missing React keys
- [ ] No TypeScript-related runtime errors

### Loading States
- [ ] Every page that fetches data shows a skeleton or spinner while loading (never a blank page)
- [ ] No page is stuck on a loading spinner indefinitely

### Empty States
- [ ] Pages with no data show a meaningful empty state message (not a blank card)

### Responsive Layout
- [ ] All pages are usable at 375px (iPhone SE size)
- [ ] All pages are usable at 768px (tablet size)
- [ ] All pages are usable at 1280px (desktop size)
- [ ] No horizontal scroll on any page at any of the above widths
- [ ] Text does not overflow outside its containers

### Firestore Data Integrity
- [ ] `capturedBy` on payments = real UID (not `"current_user_id"`)
- [ ] `rentHistory` array on leases is appended (not overwritten) after a rent increase
- [ ] Complaint documents contain `photoData` (base64) and `maintenanceSubCategory` fields when applicable

---

## 18. Regression Check

> Quick smoke test to confirm earlier changes didn't break anything.

- [ ] `facilityService.getFacilities()` is used (not `getAllFacilities`) — Complaints and Reports pages load without "is not a function" error
- [ ] Lease termination modal shows real renter/room/facility names (not `undefined`)
- [ ] Stat cards use a static `grid-cols-4` class (Tailwind JIT safe) — 4 columns render on desktop
- [ ] Training page uses the dark theme (not a white `bg-gray-50` background)
- [ ] Sidebar badge query collection name matches what PaymentApprovals writes to (`payment_approvals`)

---

## Sign-Off

| Section | Tester | Date | Result |
|---|---|---|---|
| Auth & Routing | | | |
| Navigation & Layout | | | |
| Global Search | | | |
| Toast Notifications | | | |
| Dashboard | | | |
| Facilities | | | |
| Rooms | | | |
| Renters & WhatsApp | | | |
| Leases | | | |
| Payments | | | |
| Complaints | | | |
| Notifications | | | |
| Reports | | | |
| Maintenance & Penalties | | | |
| Settings | | | |
| Mobile Pages | | | |
| Cross-Cutting Concerns | | | |
| Regression Check | | | |

---

*Generated for RentDesk RMS v3 — last updated 2026-03-24*
