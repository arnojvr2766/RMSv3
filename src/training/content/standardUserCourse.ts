import type { Course } from '../types';

export const standardUserCourse: Course = {
  id: 'course-standard-user-essentials',
  title: 'Standard User Essentials',
  description:
    'Everything a property manager or staff member needs to confidently handle day-to-day operations — tenants, leases, payments, inspections, and more.',
  track: 'standard_user',
  estimatedHours: 2,
  certificateTitle: 'Certified RentDesk Property Manager',
  modules: [
    // ──────────────────────────────────────────────────────────────────────────
    // Module 1 — Getting Started
    // ──────────────────────────────────────────────────────────────────────────
    {
      id: 'mod-su-getting-started',
      title: 'Getting Started',
      description: 'Log in, navigate the interface, and understand what you can do in RentDesk.',
      icon: 'Play',
      lessons: [
        {
          id: 'lesson-su-overview',
          title: 'Welcome to RentDesk',
          estimatedMinutes: 5,
          objective: 'Understand what RentDesk does and how your role fits into the system.',
          blocks: [
            {
              type: 'paragraph',
              content:
                'RentDesk is a property management platform built to make your daily work easier. As a Standard User (property manager or staff), you are the heart of operations — you manage tenants, record payments, conduct room inspections, and communicate issues up the chain.',
            },
            {
              type: 'heading',
              content: 'What you can do',
            },
            {
              type: 'checklist',
              items: [
                'Add and manage renters (tenants)',
                'Create and manage leases',
                'Record rent payments and expenses',
                'Conduct room inspections and update room status',
                'Submit complaints for escalation',
                'View your facility\'s rooms and their current status',
                'Access reports (read-only)',
              ],
            },
            {
              type: 'heading',
              content: 'What only Admins can do',
            },
            {
              type: 'checklist',
              items: [
                'Approve or reject payment submissions',
                'Delete records (rooms, renters, leases, payments)',
                'Create and manage other user accounts',
                'Change organization-wide settings',
                'Access the full Reports dashboard',
              ],
            },
            {
              type: 'tip',
              content:
                'If you try to do something and get a "permission denied" message, it\'s likely an admin-only action. Contact your System Administrator.',
            },
          ],
        },
        {
          id: 'lesson-su-navigation',
          title: 'Navigating the Interface',
          estimatedMinutes: 5,
          objective: 'Find your way around RentDesk quickly and efficiently.',
          blocks: [
            {
              type: 'paragraph',
              content:
                'RentDesk has a sidebar on the left with all the main sections. Here\'s what each one does:',
            },
            {
              type: 'key_term',
              term: 'Dashboard',
              content: 'Your home screen. Shows today\'s key numbers at a glance — occupied rooms, pending payments, upcoming lease expirations, and recent activity.',
            },
            {
              type: 'key_term',
              term: 'Rooms',
              content: 'A list of all rooms across all facilities. You can see each room\'s current status, assigned tenant, and monthly rate.',
            },
            {
              type: 'key_term',
              term: 'Renters',
              content: 'A directory of all current and past tenants. Click any renter to view their contact info, lease history, and payment status.',
            },
            {
              type: 'key_term',
              term: 'Leases',
              content: 'All active and past lease agreements. From here you can create new leases, view existing ones, and process lease terminations.',
            },
            {
              type: 'key_term',
              term: 'Payments',
              content: 'Record incoming rent payments, view payment history, and track which accounts are overdue.',
            },
            {
              type: 'key_term',
              term: 'Complaints',
              content: 'Log tenant complaints or facility issues. Track their status from open through resolution.',
            },
            {
              type: 'key_term',
              term: 'Training',
              content: 'This section — your learning hub for courses and how-to reference guides.',
            },
            {
              type: 'tip',
              content: 'Click your name in the top-right header to access your Profile page, where you can update your password and contact information.',
            },
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────────
    // Module 2 — Managing Renters
    // ──────────────────────────────────────────────────────────────────────────
    {
      id: 'mod-su-renters',
      title: 'Managing Renters',
      description: 'Add new tenants, update their information, and keep their profiles accurate.',
      icon: 'Users',
      lessons: [
        {
          id: 'lesson-su-add-renter',
          title: 'Adding a New Renter',
          estimatedMinutes: 8,
          objective: 'Successfully create a new renter profile with all required information.',
          blocks: [
            {
              type: 'paragraph',
              content:
                'Before a tenant can be assigned to a room and given a lease, they need a renter profile in the system. This profile stores their personal information and acts as the anchor for all their leases and payments.',
            },
            {
              type: 'heading',
              content: 'Step-by-step: Adding a renter',
            },
            {
              type: 'numbered_steps',
              items: [
                'Click "Renters" in the left sidebar.',
                'Click the blue "+ Add Renter" button in the top-right corner.',
                'Fill in the renter\'s full name (required).',
                'Enter their email address — this is used for communications and must be unique.',
                'Add their phone number (include country code if international).',
                'Enter their ID number (national ID, passport, etc.) for record-keeping.',
                'Add an emergency contact name and phone number.',
                'Click "Save Renter" to create the profile.',
              ],
            },
            {
              type: 'tip',
              content:
                'Always double-check the email address. It\'s used to match the renter to any portal communications and must be accurate.',
            },
            {
              type: 'warning',
              content:
                'Do not create duplicate renter profiles. Before adding a new renter, search for their name or email to confirm they don\'t already exist in the system.',
            },
            {
              type: 'heading',
              content: 'After creating the renter',
            },
            {
              type: 'paragraph',
              content:
                'Once saved, you\'ll be able to create a lease for this renter. The renter profile page also shows their complete history — all past and current leases, payment records, and any complaints filed.',
            },
          ],
        },
        {
          id: 'lesson-su-update-renter',
          title: 'Updating Renter Information',
          estimatedMinutes: 5,
          objective: 'Edit a renter\'s contact details and keep records current.',
          blocks: [
            {
              type: 'paragraph',
              content:
                'Tenant information changes — people move, change phone numbers, or you discover a typo. Keeping records accurate is important for communications and legal documentation.',
            },
            {
              type: 'numbered_steps',
              items: [
                'Go to "Renters" in the sidebar.',
                'Search for the renter by name or scroll to find them.',
                'Click on the renter\'s name or row to open their profile.',
                'Click the "Edit" button (pencil icon).',
                'Update the relevant fields.',
                'Click "Save Changes" to confirm.',
              ],
            },
            {
              type: 'note',
              content:
                'Changes to renter information take effect immediately and are reflected everywhere in the system — leases, payment records, and reports.',
            },
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────────
    // Module 3 — Leases
    // ──────────────────────────────────────────────────────────────────────────
    {
      id: 'mod-su-leases',
      title: 'Creating & Managing Leases',
      description: 'Create leases, handle deposits, process renewals, and manage terminations.',
      icon: 'FileText',
      lessons: [
        {
          id: 'lesson-su-create-lease',
          title: 'Creating a New Lease',
          estimatedMinutes: 10,
          objective: 'Create a complete lease agreement linking a renter to a room.',
          blocks: [
            {
              type: 'paragraph',
              content:
                'A lease is the formal agreement that assigns a room to a renter for a specified period. Once a lease is active, the room becomes "Occupied" and a payment schedule can be generated.',
            },
            {
              type: 'heading',
              content: 'Before you start',
            },
            {
              type: 'checklist',
              items: [
                'The renter profile must already exist in the system',
                'The room must be in "Available" or "Ready" status (not already occupied)',
                'You have the agreed monthly rent amount and lease dates',
                'You know the deposit amount required',
              ],
            },
            {
              type: 'heading',
              content: 'Step-by-step: Creating the lease',
            },
            {
              type: 'numbered_steps',
              items: [
                'Click "Leases" in the sidebar, then click "+ New Lease".',
                'Select the Facility from the dropdown — this filters the available rooms.',
                'Select the Room you are leasing to this tenant.',
                'Select the Renter from the dropdown (search by name if needed).',
                'Set the Lease Start Date — the first day the tenant occupies the room.',
                'Set the Lease End Date — the last day of the agreed term.',
                'Enter the Monthly Rent amount (numbers only, no currency symbol).',
                'Enter the Deposit Amount collected upfront.',
                'Select the Payment Frequency (monthly is most common).',
                'Set the Payment Due Day — e.g., "5" means rent is due on the 5th of each month.',
                'Add any special notes or terms in the Notes field (optional).',
                'Click "Create Lease" to save.',
              ],
            },
            {
              type: 'tip',
              content:
                'After the lease is created, the room status automatically changes to "Occupied". You don\'t need to update the room manually.',
            },
            {
              type: 'warning',
              content:
                'Double-check the rent amount and dates before saving. While admins can edit these, changes to financial amounts require careful review of any existing payment schedule.',
            },
          ],
        },
        {
          id: 'lesson-su-lease-acceptance',
          title: 'Documenting Lease Acceptance',
          estimatedMinutes: 6,
          objective: 'Record that a tenant has accepted their lease terms and moved in.',
          blocks: [
            {
              type: 'paragraph',
              content:
                'After creating a lease, you may need to record proof of acceptance — for example, when the tenant has signed a physical contract or verbally agreed to terms.',
            },
            {
              type: 'numbered_steps',
              items: [
                'Open the lease from the Leases page.',
                'Click "Mark as Accepted" or the acceptance action button.',
                'Optionally upload a signed lease document (PDF or image).',
                'Confirm the acceptance date.',
                'Click "Save" to record the acceptance.',
              ],
            },
            {
              type: 'note',
              content:
                'Lease acceptance is a record-keeping step. It does not change the room status or payment schedule — those were set when the lease was created.',
            },
          ],
        },
        {
          id: 'lesson-su-lease-termination',
          title: 'Processing a Lease Termination',
          estimatedMinutes: 8,
          objective: 'Properly terminate a lease and handle the deposit refund process.',
          blocks: [
            {
              type: 'paragraph',
              content:
                'When a tenant moves out — whether at the end of their term or early — the lease must be terminated in the system. This frees up the room and triggers the deposit refund workflow.',
            },
            {
              type: 'heading',
              content: 'Step-by-step: Terminating a lease',
            },
            {
              type: 'numbered_steps',
              items: [
                'Go to Leases and find the active lease you need to terminate.',
                'Open the lease detail view.',
                'Click "Terminate Lease".',
                'Enter the actual move-out date.',
                'Select the termination reason (e.g., end of term, early exit, eviction).',
                'Record any deductions from the deposit — damages, cleaning fees, outstanding rent.',
                'Enter the refund amount (deposit minus deductions).',
                'Add notes explaining any deductions for audit purposes.',
                'Click "Confirm Termination".',
              ],
            },
            {
              type: 'tip',
              content:
                'After termination, conduct a final inspection of the room and record it before changing the room status. This creates a permanent record of the room\'s condition at move-out.',
            },
            {
              type: 'warning',
              content:
                'Terminating a lease changes the room status to "Vacant" or triggers a cleaning workflow depending on your organization\'s settings. Do not terminate a lease until the tenant has physically moved out.',
            },
            {
              type: 'heading',
              content: 'Deposit refund',
            },
            {
              type: 'paragraph',
              content:
                'Once a lease is terminated, a deposit payout record is created. Your admin will review and approve the actual refund transfer. Your job is to accurately record the amounts and any deductions.',
            },
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────────
    // Module 4 — Payments
    // ──────────────────────────────────────────────────────────────────────────
    {
      id: 'mod-su-payments',
      title: 'Recording Payments',
      description: 'Capture rent payments, handle receipts, and understand the approval workflow.',
      icon: 'CreditCard',
      lessons: [
        {
          id: 'lesson-su-record-payment',
          title: 'Recording a Rent Payment',
          estimatedMinutes: 8,
          objective: 'Accurately record a tenant\'s rent payment and submit it for approval.',
          blocks: [
            {
              type: 'paragraph',
              content:
                'When a tenant pays rent — by cash, bank transfer, mobile money, or any other method — you record that payment in RentDesk. The payment then goes through an approval process before it\'s finalized.',
            },
            {
              type: 'heading',
              content: 'Step-by-step: Recording a payment',
            },
            {
              type: 'numbered_steps',
              items: [
                'Click "Payments" in the sidebar.',
                'Click "+ Record Payment" or the equivalent button.',
                'Select the Facility and Room for this payment.',
                'The system will auto-fill the renter\'s name and lease details.',
                'Enter the Amount Paid by the tenant.',
                'Select the Payment Date (when you received the money, not today if different).',
                'Select the Payment Method (cash, mobile money, bank transfer, etc.).',
                'Enter a Reference Number if the tenant provided one (e.g., bank transfer ID).',
                'Optionally add notes (e.g., "Partial payment — tenant will pay balance Friday").',
                'Upload a receipt photo if you have one (recommended for cash payments).',
                'Click "Submit Payment" to send for admin approval.',
              ],
            },
            {
              type: 'tip',
              content:
                'Always record the payment on the date you actually received it, not when you enter it into the system. This is important for accurate financial records.',
            },
            {
              type: 'warning',
              content:
                'Payments you submit are not finalized until approved by a System Administrator. Do not give the tenant a "cleared" confirmation until the payment shows "Approved" status.',
            },
            {
              type: 'heading',
              content: 'Payment statuses explained',
            },
            {
              type: 'key_term',
              term: 'Pending',
              content: 'You submitted the payment; waiting for admin approval.',
            },
            {
              type: 'key_term',
              term: 'Approved',
              content: 'Admin confirmed the payment. The tenant\'s account is updated.',
            },
            {
              type: 'key_term',
              term: 'Rejected',
              content: 'Admin rejected the payment (usually due to an error). You\'ll need to re-submit with corrections.',
            },
          ],
        },
        {
          id: 'lesson-su-overdue-accounts',
          title: 'Handling Overdue Accounts',
          estimatedMinutes: 6,
          objective: 'Identify tenants with overdue rent and understand what steps to take.',
          blocks: [
            {
              type: 'paragraph',
              content:
                'Some tenants miss payment deadlines. RentDesk tracks overdue accounts automatically and may lock rooms depending on your organization\'s settings.',
            },
            {
              type: 'heading',
              content: 'How to identify overdue accounts',
            },
            {
              type: 'numbered_steps',
              items: [
                'Check the Dashboard — it shows a count of overdue accounts in the summary cards.',
                'Go to Payments and filter by "Overdue" status.',
                'The Rooms page also shows room status — "Locked" rooms are typically overdue.',
              ],
            },
            {
              type: 'heading',
              content: 'What you can do',
            },
            {
              type: 'checklist',
              items: [
                'Contact the tenant directly and remind them of outstanding balance',
                'Record any partial payment they make',
                'Add a note to their renter profile documenting your communication attempts',
                'File a complaint if the situation needs escalation to management',
              ],
            },
            {
              type: 'key_term',
              term: 'Auto-lock',
              content: 'Your organization may have an automatic room lock feature enabled. After a set number of days overdue, the system locks the room automatically. Only an admin can unlock it.',
            },
            {
              type: 'note',
              content:
                'You cannot waive late fees or unlock rooms — these are admin-only actions. If a tenant is disputing a lock, escalate to your System Administrator.',
            },
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────────
    // Module 5 — Room Inspections
    // ──────────────────────────────────────────────────────────────────────────
    {
      id: 'mod-su-inspections',
      title: 'Conducting Room Inspections',
      description: 'Record move-in, move-out, and periodic room inspections with photos and notes.',
      icon: 'ClipboardCheck',
      lessons: [
        {
          id: 'lesson-su-why-inspections',
          title: 'Why Inspections Matter',
          estimatedMinutes: 4,
          objective: 'Understand the purpose of inspections and when to conduct them.',
          blocks: [
            {
              type: 'paragraph',
              content:
                'Inspections protect both the property owner and the tenant. A documented record of a room\'s condition prevents disputes about damage deposits and creates accountability.',
            },
            {
              type: 'heading',
              content: 'Types of inspections',
            },
            {
              type: 'key_term',
              term: 'Move-in Inspection',
              content: 'Conducted before or on the tenant\'s first day. Documents the room\'s condition at the start of the lease. Both you and the tenant should ideally be present.',
            },
            {
              type: 'key_term',
              term: 'Periodic Inspection',
              content: 'Done during the tenancy (monthly or quarterly). Checks that the room is being maintained and identifies maintenance needs early.',
            },
            {
              type: 'key_term',
              term: 'Move-out Inspection',
              content: 'Conducted after the tenant vacates. Compares current condition to the move-in inspection. Forms the basis for any deposit deductions.',
            },
            {
              type: 'tip',
              content:
                'Photos are your best friend. Take clear photos of every room corner, fixture, and any damage. These are stored permanently in RentDesk and protect you from disputes.',
            },
          ],
        },
        {
          id: 'lesson-su-conduct-inspection',
          title: 'Recording an Inspection',
          estimatedMinutes: 8,
          objective: 'Complete an inspection record with all required details and photos.',
          blocks: [
            {
              type: 'paragraph',
              content: 'You can record inspections directly from a room\'s detail page or from the main navigation.',
            },
            {
              type: 'heading',
              content: 'Step-by-step: Conducting an inspection',
            },
            {
              type: 'numbered_steps',
              items: [
                'Navigate to the room you are inspecting (via Rooms in the sidebar).',
                'Open the room detail page.',
                'Click "New Inspection" or the equivalent button.',
                'Select the Inspection Type (move-in, periodic, or move-out).',
                'Enter the Inspection Date.',
                'Walk through each area: walls, floor, ceiling, windows, door, bathroom, kitchen (if applicable).',
                'For each area, select its condition: Excellent, Good, Fair, or Poor.',
                'Add notes for anything that needs attention or explanation.',
                'Take and upload photos — especially for any damage or concerns.',
                'Check the overall cleanliness rating.',
                'Add a general notes/summary section.',
                'Click "Save Inspection" to submit.',
              ],
            },
            {
              type: 'tip',
              content:
                'If you\'re doing a move-in inspection, have the tenant review and sign off (physically or digitally) before they move in. This prevents future "it was already like that" disputes.',
            },
            {
              type: 'warning',
              content:
                'Never skip the move-in inspection, even if the tenant is in a hurry. Without a baseline record, you have no evidence if damage occurs during the tenancy.',
            },
            {
              type: 'heading',
              content: 'After the inspection',
            },
            {
              type: 'paragraph',
              content:
                'Inspection records are stored permanently. They appear in the room\'s history and are accessible from the lease record. For move-out inspections, the findings feed directly into the deposit deduction calculation.',
            },
          ],
        },
      ],
    },

    // ──────────────────────────────────────────────────────────────────────────
    // Module 6 — Complaints & Escalations
    // ──────────────────────────────────────────────────────────────────────────
    {
      id: 'mod-su-complaints',
      title: 'Complaints & Escalations',
      description: 'Log and track tenant complaints, maintenance issues, and escalations.',
      icon: 'AlertTriangle',
      lessons: [
        {
          id: 'lesson-su-log-complaint',
          title: 'Logging a Complaint',
          estimatedMinutes: 6,
          objective: 'Record a tenant complaint or facility issue with all relevant details.',
          blocks: [
            {
              type: 'paragraph',
              content:
                'Complaints can come from tenants (about a room condition, a neighbor, or service quality) or from you (about a maintenance issue or policy concern). Logging them creates a traceable record.',
            },
            {
              type: 'numbered_steps',
              items: [
                'Click "Complaints" in the sidebar.',
                'Click "+ New Complaint".',
                'Select the Facility and Room the complaint relates to.',
                'Enter the Renter\'s name if it\'s a tenant complaint.',
                'Select the Category (e.g., maintenance, noise, billing, cleanliness).',
                'Set the Priority: Low, Medium, High, or Urgent.',
                'Enter a short Subject line summarizing the issue.',
                'Write a detailed Description — the more detail, the faster it can be resolved.',
                'Click "Submit Complaint".',
              ],
            },
            {
              type: 'key_term',
              term: 'Priority: Urgent',
              content: 'Use for safety hazards, broken locks, water leaks, or anything requiring immediate attention. Urgent complaints should also be verbally escalated to your admin.',
            },
            {
              type: 'tip',
              content:
                'Be as specific as possible in the description. Instead of "bathroom problem", write "Toilet cistern leaking — water dripping constantly since 14 March. Tenant called twice about this."',
            },
            {
              type: 'heading',
              content: 'Tracking complaint status',
            },
            {
              type: 'paragraph',
              content:
                'After submitting, your complaint will show as "Open". An admin will update it to "In Progress" when action is being taken, and "Resolved" when the issue is closed. You can filter complaints by status from the Complaints page.',
            },
          ],
        },
      ],
    },
  ],
};
