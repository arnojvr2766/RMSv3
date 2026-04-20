import type { HowToDoc } from '../types';

export const howToDocs: HowToDoc[] = [
  // ─── FACILITIES & ROOMS ───────────────────────────────────────────────────
  {
    id: 'htd-create-facility',
    title: 'How to Create a New Facility',
    category: 'facilities_rooms',
    summary: 'Add a new building, property, or location to RentDesk.',
    tags: ['facility', 'building', 'setup', 'admin'],
    roles: 'system_admin',
    blocks: [
      {
        type: 'paragraph',
        content: 'Facilities are the top-level grouping in RentDesk — they represent a building, complex, or property location. All rooms belong to a facility.',
      },
      {
        type: 'numbered_steps',
        items: [
          'Click "Settings" in the sidebar (admin only).',
          'Go to the Facilities section.',
          'Click "+ Add Facility".',
          'Enter the Facility Name (e.g., "Sunrise Apartments Block A").',
          'Enter the full Address.',
          'Optionally add a Description or notes.',
          'Click "Save Facility".',
        ],
      },
      {
        type: 'tip',
        content: 'Use clear, descriptive names. If you manage multiple buildings, include the block or unit type in the name (e.g., "Green Valley — Studio Block").',
      },
    ],
  },
  {
    id: 'htd-add-room',
    title: 'How to Add a Room',
    category: 'facilities_rooms',
    summary: 'Create a new room record within a facility.',
    tags: ['room', 'unit', 'add', 'admin'],
    roles: 'system_admin',
    blocks: [
      {
        type: 'paragraph',
        content: 'Rooms are the individual rentable units within a facility. Each room has its own status, rate, and occupancy history.',
      },
      {
        type: 'numbered_steps',
        items: [
          'Click "Rooms" in the sidebar.',
          'Click "+ Add Room".',
          'Select the Facility this room belongs to.',
          'Enter the Room Number or Name (e.g., "101" or "Studio 4B").',
          'Select the Room Type (single, double, studio, etc.).',
          'Enter the Monthly Rate.',
          'Set the initial Status (usually "Available" or "Ready").',
          'Add any notes (floor, features, etc.).',
          'Click "Save Room".',
        ],
      },
      {
        type: 'note',
        content: 'Room status will update automatically when a lease is created or terminated. You typically only need to manually set status for maintenance/cleaning workflows.',
      },
    ],
  },
  {
    id: 'htd-room-statuses',
    title: 'Understanding Room Statuses',
    category: 'facilities_rooms',
    summary: 'What each room status means and when they change.',
    tags: ['room', 'status', 'occupied', 'vacant', 'locked'],
    roles: 'both',
    blocks: [
      {
        type: 'paragraph',
        content: 'Every room has a status that reflects its current state. Here\'s what each status means:',
      },
      {
        type: 'key_term',
        term: 'Available',
        content: 'The room is clean, ready, and can be leased immediately.',
      },
      {
        type: 'key_term',
        term: 'Occupied',
        content: 'The room has an active tenant with a current lease.',
      },
      {
        type: 'key_term',
        term: 'Locked',
        content: 'The room is occupied but access has been restricted due to overdue rent. The tenant still lives there but the system flags this account.',
      },
      {
        type: 'key_term',
        term: 'Maintenance',
        content: 'The room is undergoing repairs or maintenance and is temporarily unavailable.',
      },
      {
        type: 'key_term',
        term: 'Cleaning',
        content: 'The room is vacant and being cleaned/prepared after a tenant move-out.',
      },
      {
        type: 'key_term',
        term: 'Vacant',
        content: 'The room is empty but not yet ready (needs inspection, cleaning, or repairs).',
      },
      {
        type: 'tip',
        content: 'The Rooms page lets you filter by status so you can quickly see all available rooms or all locked accounts.',
      },
    ],
  },
  {
    id: 'htd-update-room-status',
    title: 'How to Update a Room\'s Status',
    category: 'facilities_rooms',
    summary: 'Manually change a room status for maintenance, cleaning, or availability.',
    tags: ['room', 'status', 'update', 'maintenance', 'cleaning'],
    roles: 'both',
    blocks: [
      {
        type: 'paragraph',
        content: 'Some status changes happen automatically (e.g., Occupied when a lease is created), but you can also change status manually when needed.',
      },
      {
        type: 'numbered_steps',
        items: [
          'Go to "Rooms" in the sidebar.',
          'Find and click the room you need to update.',
          'Click the current status badge or the "Update Status" button.',
          'Select the new status from the dropdown.',
          'Add a note explaining the reason for the change (optional but recommended).',
          'Click "Confirm".',
        ],
      },
      {
        type: 'warning',
        content: 'Changing an Occupied room to any other status does NOT terminate the lease. Always process a lease termination through the Leases page first.',
      },
    ],
  },

  // ─── RENTERS & LEASES ────────────────────────────────────────────────────
  {
    id: 'htd-add-renter',
    title: 'How to Add a New Renter',
    category: 'renters_leases',
    summary: 'Create a tenant profile before assigning them a room.',
    tags: ['renter', 'tenant', 'add', 'profile'],
    roles: 'both',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Click "Renters" in the sidebar.',
          'Click "+ Add Renter".',
          'Fill in: Full Name, Email, Phone, ID Number, Emergency Contact.',
          'Click "Save Renter".',
        ],
      },
      {
        type: 'warning',
        content: 'Search for the renter first to avoid duplicates. Duplicate profiles cause confusion in payment records and reporting.',
      },
    ],
  },
  {
    id: 'htd-create-lease',
    title: 'How to Create a Lease',
    category: 'renters_leases',
    summary: 'Link a renter to a room with a formal lease agreement.',
    tags: ['lease', 'create', 'agreement', 'tenant'],
    roles: 'both',
    blocks: [
      {
        type: 'paragraph',
        content: 'A lease must exist before any payments can be recorded for a tenant.',
      },
      {
        type: 'numbered_steps',
        items: [
          'Go to "Leases" → "+ New Lease".',
          'Select Facility → Room → Renter.',
          'Set Start Date, End Date, Monthly Rent, Deposit Amount.',
          'Set Payment Due Day (e.g., 5 = rent due on 5th of each month).',
          'Click "Create Lease".',
        ],
      },
      {
        type: 'tip',
        content: 'The room status changes to "Occupied" automatically when the lease is saved.',
      },
    ],
  },
  {
    id: 'htd-terminate-lease',
    title: 'How to Terminate a Lease',
    category: 'renters_leases',
    summary: 'Process a tenant move-out and handle the deposit refund.',
    tags: ['lease', 'termination', 'move-out', 'deposit', 'refund'],
    roles: 'both',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Go to "Leases" and open the active lease.',
          'Click "Terminate Lease".',
          'Enter the move-out date and reason.',
          'Record any deposit deductions (damages, cleaning, unpaid rent).',
          'Enter the refund amount.',
          'Click "Confirm Termination".',
        ],
      },
      {
        type: 'tip',
        content: 'Conduct a move-out inspection before terminating the lease to document the room\'s condition.',
      },
    ],
  },
  {
    id: 'htd-lease-document-upload',
    title: 'How to Upload a Signed Lease Document',
    category: 'renters_leases',
    summary: 'Attach a signed lease PDF or photo to the lease record.',
    tags: ['lease', 'document', 'upload', 'scan', 'signature'],
    roles: 'both',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Open the lease from the Leases page.',
          'Click "Upload Document" or the attachment icon.',
          'Select the file (PDF, JPG, or PNG).',
          'Click "Upload".',
        ],
      },
      {
        type: 'note',
        content: 'Maximum file size is 10MB. For physical documents, take a clear photo with your phone camera in good lighting.',
      },
    ],
  },

  // ─── PAYMENTS ────────────────────────────────────────────────────────────
  {
    id: 'htd-record-payment',
    title: 'How to Record a Rent Payment',
    category: 'payments',
    summary: 'Capture a tenant\'s rent payment and submit it for approval.',
    tags: ['payment', 'rent', 'record', 'capture'],
    roles: 'both',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Go to "Payments" → "+ Record Payment".',
          'Select Facility and Room.',
          'Enter Amount Paid, Payment Date, and Payment Method.',
          'Add a Reference Number if available.',
          'Optionally upload a receipt photo.',
          'Click "Submit Payment".',
        ],
      },
      {
        type: 'warning',
        content: 'The payment is not finalized until approved by an admin. Status will show "Pending" until then.',
      },
    ],
  },
  {
    id: 'htd-approve-payment',
    title: 'How to Approve or Reject a Payment (Admin)',
    category: 'admin_approvals',
    summary: 'Review and approve or reject payment submissions from staff.',
    tags: ['payment', 'approval', 'approve', 'reject', 'admin'],
    roles: 'system_admin',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Click "Payment Approvals" in the sidebar.',
          'Review the pending payment details — amount, date, method, and any attached receipt.',
          'Click "Approve" to finalize, or "Reject" with a reason.',
          'Approved payments immediately update the tenant\'s account balance.',
        ],
      },
      {
        type: 'tip',
        content: 'Always check the receipt photo if provided. For large or unusual payments, verify with your staff member before approving.',
      },
    ],
  },
  {
    id: 'htd-partial-payment',
    title: 'How to Handle a Partial Payment',
    category: 'payments',
    summary: 'Record when a tenant pays less than the full amount due.',
    tags: ['payment', 'partial', 'balance', 'outstanding'],
    roles: 'both',
    blocks: [
      {
        type: 'paragraph',
        content: 'If a tenant pays part of their rent, record the actual amount received. The system will calculate and show the remaining balance.',
      },
      {
        type: 'numbered_steps',
        items: [
          'Record the payment as normal with the actual amount paid.',
          'In the Notes field, write: "Partial payment. Balance of [amount] promised by [date]."',
          'Submit for approval as usual.',
          'When the balance is paid, record it as a separate payment.',
        ],
      },
      {
        type: 'note',
        content: 'The system tracks outstanding balances automatically. You don\'t need to create a special "balance due" record — just record each payment as it comes in.',
      },
    ],
  },
  {
    id: 'htd-deposit-refund',
    title: 'How to Process a Deposit Refund',
    category: 'payments',
    summary: 'Record the deposit refund after a tenant moves out.',
    tags: ['deposit', 'refund', 'payout', 'move-out'],
    roles: 'both',
    blocks: [
      {
        type: 'paragraph',
        content: 'Deposit refunds are processed as part of the lease termination workflow.',
      },
      {
        type: 'numbered_steps',
        items: [
          'During lease termination, enter any deposit deductions and the final refund amount.',
          'A Deposit Payout record is created automatically.',
          'The admin reviews and approves the payout.',
          'Record the actual refund transfer once completed.',
        ],
      },
    ],
  },

  // ─── ADMIN APPROVALS ──────────────────────────────────────────────────────
  {
    id: 'htd-invite-user',
    title: 'How to Invite a New Staff Member (Admin)',
    category: 'admin_approvals',
    summary: 'Create a new user account for a staff member.',
    tags: ['user', 'staff', 'invite', 'create', 'admin'],
    roles: 'system_admin',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Go to "Settings" → "Users & Permissions".',
          'Click "+ Invite User".',
          'Enter their full name and email address.',
          'Select their Role: System Admin or Standard User.',
          'Click "Send Invitation".',
          'The staff member receives an email with login instructions.',
        ],
      },
      {
        type: 'warning',
        content: 'Only grant System Admin role to trusted staff who need full access. Standard User is appropriate for most property managers.',
      },
    ],
  },
  {
    id: 'htd-deactivate-user',
    title: 'How to Deactivate a User Account (Admin)',
    category: 'admin_approvals',
    summary: 'Remove access for a staff member who has left.',
    tags: ['user', 'deactivate', 'remove', 'access', 'admin'],
    roles: 'system_admin',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Go to "Settings" → "Users & Permissions".',
          'Find the user and click on their name.',
          'Click "Deactivate Account".',
          'Confirm the action.',
        ],
      },
      {
        type: 'warning',
        content: 'Deactivating a user prevents them from logging in immediately. Do this as soon as a staff member leaves to protect your data.',
      },
      {
        type: 'note',
        content: 'Deactivated accounts are not deleted — their historical records (payments they recorded, etc.) are preserved for audit purposes.',
      },
    ],
  },

  // ─── AUTO LATE FEE DOCS (under payments) ─────────────────────────────────
  {
    id: 'htd-late-fee-explained',
    title: 'Understanding Automatic Late Fees',
    category: 'payments',
    summary: 'How the system calculates and records late fees when a payment is captured late.',
    tags: ['late fee', 'penalty', 'automatic', 'overdue', 'payment capture'],
    roles: 'both',
    blocks: [
      {
        type: 'paragraph',
        content: 'RentDesk automatically calculates and records late fees — you do not need to enter them manually. Here is how it works.',
      },
      {
        type: 'heading',
        content: 'The Orange Warning Banner',
      },
      {
        type: 'paragraph',
        content: 'When you open a payment and the payment date is past the grace period, an orange warning banner appears in the Payment Details section. Example: "Late fee: R460 (23 days × R20/day) — will be added to penalties automatically." This is the system telling you what penalty it will record when you submit.',
      },
      {
        type: 'heading',
        content: 'What happens when you click Process Payment',
      },
      {
        type: 'numbered_steps',
        items: [
          'The rent payment is recorded as normal (e.g. R387 for March).',
          'The system automatically calculates the late fee based on how many days past the grace period the payment date is.',
          'The late fee is added to the renter\'s Outstanding Penalties balance — a separate ledger from their rent.',
          'You do not need to do anything extra — the penalty is logged automatically.',
        ],
      },
      {
        type: 'key_term',
        term: 'Late Fee Formula',
        content: 'Days past grace period × Late Fee Amount per day. Example: 23 days × R20/day = R460. The late fee amount and grace period are configured in Settings → Organization Settings.',
      },
      {
        type: 'warning',
        content: 'The first time a renter pays late, the Outstanding Penalties section will not yet appear on screen — because the penalty does not exist until you submit the payment. On the next visit to their payment screen, the R460 will be visible as an outstanding balance.',
      },
      {
        type: 'tip',
        content: 'If the renter is paying their late fee at the same time as their rent, see "How to Collect a Penalty with a Rent Payment".',
      },
    ],
  },
  {
    id: 'htd-collect-penalty-with-rent',
    title: 'How to Collect a Penalty with a Rent Payment',
    category: 'payments',
    summary: 'Collect outstanding penalty fees in the same transaction as the rent payment.',
    tags: ['penalty', 'late fee', 'outstanding', 'collect', 'payment capture'],
    roles: 'both',
    blocks: [
      {
        type: 'paragraph',
        content: 'Once a renter has an outstanding penalty balance (from a previous late payment), you can collect it at the same time as their rent — no need for a separate transaction.',
      },
      {
        type: 'numbered_steps',
        items: [
          'Open the renter\'s payment screen (from Payments or the lease).',
          'Select the month you are collecting rent for.',
          'Scroll down past Payment Details.',
          'If an outstanding penalty exists, you will see a yellow "Outstanding Penalties" section showing the balance.',
          'Tick "Include penalty payment with this transaction".',
          'Enter the amount the renter is paying toward the penalty (can be partial).',
          'Select the payment method for the penalty (may differ from rent — e.g. rent by EFT, penalty by cash).',
          'Click "Process Payment" — both the rent and penalty are recorded together.',
        ],
      },
      {
        type: 'note',
        content: 'The Outstanding Penalties section only appears after at least one late payment has been processed. If a renter is paying late for the very first time, process the rent payment first — the penalty section will appear on the next visit.',
      },
      {
        type: 'tip',
        content: 'Partial penalty payments are allowed. If the renter can only pay R200 of a R460 penalty, enter R200. The remaining R260 stays on their balance for next time.',
      },
    ],
  },

  // ─── MAINTENANCE & PENALTIES ─────────────────────────────────────────────
  {
    id: 'htd-record-inspection',
    title: 'How to Record a Room Inspection',
    category: 'maintenance_penalties',
    summary: 'Document a room\'s condition at move-in, during tenancy, or at move-out.',
    tags: ['inspection', 'room', 'condition', 'photos', 'move-in', 'move-out'],
    roles: 'both',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Open the room from the Rooms page.',
          'Click "New Inspection".',
          'Select the Inspection Type (move-in, periodic, move-out).',
          'Rate each area: walls, floor, ceiling, bathroom, etc.',
          'Upload photos of any damage or notable condition.',
          'Add notes.',
          'Click "Save Inspection".',
        ],
      },
      {
        type: 'tip',
        content: 'Take photos with your phone. Even if a room is in perfect condition, photos of cleanliness and intact fixtures are valuable baseline evidence.',
      },
    ],
  },
  {
    id: 'htd-maintenance-expense',
    title: 'How to Record a Maintenance Expense',
    category: 'maintenance_penalties',
    summary: 'Log the cost of repairs or maintenance work on a room or facility.',
    tags: ['maintenance', 'expense', 'repair', 'cost'],
    roles: 'both',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Navigate to the room or facility the expense relates to.',
          'Click "Add Maintenance Expense".',
          'Describe the work done.',
          'Enter the cost.',
          'Upload a receipt or invoice if available.',
          'Set the date the work was completed.',
          'Click "Save".',
        ],
      },
    ],
  },
  {
    id: 'htd-add-penalty',
    title: 'How to Add a Penalty to a Tenant',
    category: 'maintenance_penalties',
    summary: 'Record a fine, late fee, or damage charge against a tenant.',
    tags: ['penalty', 'fine', 'late fee', 'damage', 'charge'],
    roles: 'both',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Open the relevant lease or renter profile.',
          'Click "Add Penalty".',
          'Select the penalty type (late payment, damage, other).',
          'Enter the amount.',
          'Add a description explaining the reason.',
          'Click "Save Penalty".',
        ],
      },
      {
        type: 'note',
        content: 'Penalties increase the tenant\'s outstanding balance. They are visible in the payment history and included in any overdue calculations.',
      },
    ],
  },

  // ─── SYSTEM SETTINGS ─────────────────────────────────────────────────────
  {
    id: 'htd-org-settings',
    title: 'How to Configure Organization Settings (Admin)',
    category: 'system_settings',
    summary: 'Set organization-wide defaults for payments, late fees, and auto-lock.',
    tags: ['settings', 'organization', 'configuration', 'admin', 'auto-lock', 'late fees'],
    roles: 'system_admin',
    blocks: [
      {
        type: 'paragraph',
        content: 'Organization settings control how the entire system behaves. Changes here affect all facilities and all staff.',
      },
      {
        type: 'numbered_steps',
        items: [
          'Go to "Settings" in the sidebar.',
          'Click "Organization Settings".',
          'Review and update the following:',
        ],
      },
      {
        type: 'checklist',
        items: [
          'Organization Name and Currency',
          'Grace Period Days (how many days after due date before a payment is overdue)',
          'Late Fee Amount or Percentage',
          'Auto-lock: Enable/Disable and set threshold days',
          'Lease Expiry Reminder Days (when to send reminders before lease ends)',
          'Default Payment Due Day',
        ],
      },
      {
        type: 'warning',
        content: 'Changes to late fees and auto-lock thresholds take effect immediately for all active leases. Inform your staff before making changes.',
      },
    ],
  },
  {
    id: 'htd-change-password',
    title: 'How to Change Your Password',
    category: 'system_settings',
    summary: 'Update your account password from the Profile page.',
    tags: ['password', 'profile', 'security', 'account'],
    roles: 'both',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Click your name or avatar in the top-right header.',
          'This opens your Profile page.',
          'Scroll to the "Change Password" section.',
          'Enter your current password.',
          'Enter your new password (minimum 8 characters).',
          'Confirm the new password.',
          'Click "Update Password".',
        ],
      },
      {
        type: 'tip',
        content: 'Use a strong password with a mix of letters, numbers, and symbols. Do not share your password with colleagues — each person should have their own account.',
      },
    ],
  },

  // ─── REPORTS ─────────────────────────────────────────────────────────────
  {
    id: 'htd-income-report',
    title: 'How to View and Export the Income Report (Admin)',
    category: 'reports',
    summary: 'Analyze monthly rental income and export to CSV.',
    tags: ['reports', 'income', 'export', 'csv', 'admin'],
    roles: 'system_admin',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Click "Reports" in the sidebar.',
          'The Income Report loads by default showing the current month.',
          'Use the ← → arrows to navigate to a different month.',
          'Click on a bar in the chart to select that month\'s data.',
          'Review the KPIs: Total Collected, Outstanding, Occupancy Rate, Deposit Liability.',
          'Scroll down to see the per-facility breakdown.',
          'Click "Export CSV" to download the data as a spreadsheet.',
        ],
      },
      {
        type: 'tip',
        content: 'The CSV export includes all individual payment records for the selected month, making it easy to import into accounting software.',
      },
    ],
  },
  {
    id: 'htd-overdue-report',
    title: 'How to View Overdue Accounts (Admin)',
    category: 'reports',
    summary: 'See all tenants with outstanding balances.',
    tags: ['reports', 'overdue', 'outstanding', 'arrears', 'admin'],
    roles: 'system_admin',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Click "Reports" in the sidebar.',
          'Scroll down to the "Overdue Accounts" section.',
          'Each row shows the tenant name, room, amount owed, and days overdue.',
          'Click "Export Overdue CSV" to download the list.',
        ],
      },
      {
        type: 'note',
        content: 'The overdue list is based on approved payments only. Pending payments are not counted until an admin approves them.',
      },
    ],
  },
  {
    id: 'htd-occupancy-report',
    title: 'How to View Occupancy Statistics (Admin)',
    category: 'reports',
    summary: 'Check room occupancy rates and availability across facilities.',
    tags: ['reports', 'occupancy', 'vacant', 'rooms', 'admin'],
    roles: 'system_admin',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Click "Reports" in the sidebar.',
          'View the "Room Status Summary" section.',
          'This shows counts of Occupied, Locked, Available, and other statuses.',
          'The Occupancy Rate KPI card shows your overall occupancy percentage.',
        ],
      },
    ],
  },

  // ─── COMPLAINTS ───────────────────────────────────────────────────────────
  {
    id: 'htd-log-complaint',
    title: 'How to Log a Complaint',
    category: 'renters_leases',
    summary: 'Record a tenant complaint or facility issue for tracking and resolution.',
    tags: ['complaint', 'issue', 'tenant', 'escalate'],
    roles: 'both',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Click "Complaints" in the sidebar.',
          'Click "+ New Complaint".',
          'Select Facility, Room, and Renter.',
          'Choose Category and Priority.',
          'Write a clear Subject and detailed Description.',
          'Click "Submit".',
        ],
      },
      {
        type: 'key_term',
        term: 'Priority: Urgent',
        content: 'Safety hazards, broken locks, flooding — anything needing same-day attention. Always call your admin for Urgent issues, don\'t just log it.',
      },
    ],
  },
  {
    id: 'htd-resolve-complaint',
    title: 'How to Resolve a Complaint (Admin)',
    category: 'admin_approvals',
    summary: 'Update a complaint status and document the resolution.',
    tags: ['complaint', 'resolve', 'update', 'admin'],
    roles: 'system_admin',
    blocks: [
      {
        type: 'numbered_steps',
        items: [
          'Click "Complaints" in the sidebar.',
          'Find the complaint (filter by "Open" or "In Progress").',
          'Click on the complaint to open the detail view.',
          'Update the Status to "In Progress" when action is being taken.',
          'Add resolution notes explaining what was done.',
          'Change Status to "Resolved" when complete.',
          'Click "Save".',
        ],
      },
    ],
  },
];
