# Rental Management Application — Software Requirements Specification (SRS)

**Version:** 0.3 (Draft, Updated with Suggestions & Tech Stack)
**Date:** 15 Sep 2025
**Owner:** Arno Jansen van Renesburg

---

## 1. Purpose & Scope

This SRS defines the functional and non-functional requirements for a Rental Management Application that manages facilities and rooms, tenants, rentals, payments, penalties, refunds, and complaints across **multiple properties (facilities)**. It introduces **role-based access control (RBAC)** with approval workflows, partial payments, deposit management, receipts, and extended reporting. It also specifies the target **tech stack** and delivery approach (progressive web app).

---

## 2. Glossary

* **Facility**: A property or building containing multiple rentable rooms/units
* **Room/Unit**: Individual rentable space within a facility
* **Tenant**: Person or entity renting a room
* **Rental**: Active lease agreement between facility owner and tenant
* **Payment**: Money received from tenant (rent, fees, deposits)
* **Proposal**: Pending change requiring admin approval
* **Posted**: Approved and finalized record
* **Partial Payment**: Payment less than full monthly amount due
* **Late Fee**: Penalty charged for payments after grace period
* **Child Surcharge**: Additional monthly fee per child
* **Deposit**: Security deposit held against damages/unpaid rent
* **Refund**: Return of deposit minus deductions
* **Complaint**: Tenant-reported issue requiring resolution
* **Penalty**: Fine for lease violations
* **RBAC**: Role-Based Access Control
* **PWA**: Progressive Web Application

---

## 3. High-Level Goals

1. Streamline rent collection and tracking across multiple facilities.
2. Enforce consistent business rules (late fees, child surcharge).
3. Maintain data integrity with RBAC and approval workflows.
4. Provide dashboards, reports, and exports for decision-making.
5. Enable mobile-first access through a **Progressive Web App (PWA)**.
6. Support offline capture and sync.

---

## 4. User Roles & Permissions

### 4.1 Role Definitions

**Super Admin**
- Full system access across all facilities
- User management and role assignment
- System configuration and feature flags
- Global reporting and analytics

**Facility Admin**
- Full access to assigned facilities only
- Approve/reject proposals from Standard Users
- Manage facility settings and business rules
- Generate reports for assigned facilities
- User management within assigned facilities

**Standard User**
- Create proposals (payments, rentals, refunds, penalties)
- View and manage existing records
- Generate receipts and basic reports
- Cannot directly post financial transactions
- Limited to assigned facilities

**Read-Only User**
- View-only access to assigned facilities
- Generate reports and exports
- Cannot create or modify any records

### 4.2 Permission Matrix

| Action | Super Admin | Facility Admin | Standard User | Read-Only |
|--------|-------------|----------------|---------------|-----------|
| Create Payment | ✓ | ✓ | Proposal Only | ✗ |
| Approve Proposals | ✓ | ✓ (own facilities) | ✗ | ✗ |
| Create Rental | ✓ | ✓ | Proposal Only | ✗ |
| Manage Users | ✓ | ✓ (own facilities) | ✗ | ✗ |
| System Config | ✓ | ✗ | ✗ | ✗ |
| View Reports | ✓ | ✓ (own facilities) | ✓ (own facilities) | ✓ (own facilities) |
| Manage Facilities | ✓ | ✓ (assigned) | ✗ | ✗ |

---

## 5. Multi-Property Model

### 5.1 Hierarchy Structure
```
Organization (Super Admin level)
├── Facility A (Admin + Users)
│   ├── Room 101
│   ├── Room 102
│   └── Room 103
├── Facility B (Admin + Users)
│   ├── Room 201
│   └── Room 202
└── Facility C (Admin + Users)
    └── Room 301
```

### 5.2 Facility Configuration
- **Business Rules**: Late fee amounts, grace periods, child surcharge rates
- **Branding**: Logo, colors, contact information
- **Payment Methods**: Enabled payment types per facility
- **Notification Settings**: Email templates, SMS preferences
- **Feature Flags**: Enable/disable modules per facility

---

## 6. Functional Requirements

### 6.1 Dashboard (Home)

* **FR-01** Summary cards: facilities, rooms, occupied, available, pending approvals, open complaints.
* **FR-02** Financial widgets: expected monthly income, collected-to-date, overdue count.
* **FR-03** Quick actions: capture payment, add rental, add complaint, view approvals queue.
* **FR-04** Notifications: lease expiry, unpaid rent, bulk reminders.

### 6.2 Rental Payments

* **FR-10** Capture payment by rental + month.
* **FR-11** Prevent duplicate posted payments for the same rental & month.
* **FR-12** Input fields: Room, Month, Date, Method (cash/EFT/mobile/card), Other Fees, Gross, Total.
* **FR-13** **Auto Late Penalty**: R20/day after the 4th (configurable).
* **FR-14** Generate **receipts** with unique reference (auto, printable, shareable).
* **FR-15** One posted payment per rental per month (Standard User).
* **FR-16** Edits/voids → **Proposal → Admin approval**.
* **FR-17** Support **partial payments**, track balances, and apply late fees on remaining balance.

### 6.3 New Rentals (Onboarding)

* **FR-20** Show available rooms per facility.
* **FR-21** Inputs: Room, Tenant, Move-in Date, First Payment Month, Children, Monthly Rent, Contact, Deposit Amount, Documents.
* **FR-22** Auto **child surcharge** at R10/child/month.
* **FR-23** Generate **rental agreement PDF** with tenant details.
* **FR-24** Standard User proposals require Admin approval.
* **FR-25** Upload **ID/lease scans** into tenant record.

### 6.4 Refunds

* **FR-30** Record deposit + deductions (damages, cleaning, unpaid rent).
* **FR-31** Workflow: Proposal → Approval → Posted.
* **FR-32** Link refunds to **original deposit**.
* **FR-33** Track refund status (Pending, Approved, Paid).

### 6.5 Penalties

* **FR-40** Categories: late, noise, damage, other.
* **FR-41** Link penalties to **complaints/inspections**.
* **FR-42** Standard User proposals require Admin approval.
* **FR-43** Auto-generated late penalties editable via approval.

### 6.6 Complaints & Suggestions

*(unchanged)*

### 6.7 Manage Existing Rentals

* **FR-60** Rental dashboard: tenant, rent, move-in date, status; quick stats.
* **FR-61** Search/filter (facility, room, overdue).
* **FR-62** Individual rental: details, payment history, lease, docs, notes.
* **FR-63** Lease tracking: renewals, expiries, reminders, pro-rata terminations.
* **FR-64** Payment tracking: full/partial history, overdue, statements.
* **FR-65** Actions: edit, terminate, generate statements, reminders.
* **FR-66** Bulk reminders to overdue tenants.
* **FR-67** Monthly landlord/facility financial summaries.

### 6.8 Reporting & Exports

* Monthly financial summary.
* Overdue aging.
* Tenant occupancy, complaint resolution.
* Exports: PDF, Excel, CSV.

---

## 7. Approval Workflow & Data Integrity

### 7.1 Workflow States

**Standard User Actions:**
1. Create proposal → Status: `pending`
2. Admin reviews → Status: `approved` or `rejected`
3. If approved → Record becomes `posted`
4. If rejected → Record remains `proposed` with reason

**Admin Actions:**
1. Direct creation → Status: `posted` (immediate)
2. Edit existing → Creates proposal for approval
3. Bulk operations → Individual proposals per record

### 7.2 Audit Trail

Every record includes:
- `createdBy`: User ID who created the record
- `createdAt`: Timestamp of creation
- `updatedBy`: User ID who last modified
- `updatedAt`: Timestamp of last modification
- `approvedBy`: User ID who approved (if applicable)
- `approvedAt`: Timestamp of approval

### 7.3 Data Integrity Checks

- **Duplicate Prevention**: Unique constraints on critical fields
- **Referential Integrity**: Foreign key validation
- **Business Rule Validation**: Late fees, payment limits
- **Concurrent Modification**: Optimistic locking with version fields

---

## 8. Business Rules

* **BR-01 Late Fee:** (PaymentDate − 4th) × R20.
* **BR-02 Child Surcharge:** R10/child/month.
* **BR-03 Duplicate Payments:** One posted per rental + month.
* **BR-04 Partial Payments:** Allowed; balances accrue late fees.
* **BR-05 Termination Pro-rata:** Optional rule, configurable.

---

## 9. Data Model (Firestore-Oriented)

### 9.1 Collections Structure

**organizations**
```typescript
{
  id: string;
  name: string;
  settings: {
    currency: 'ZAR';
    timezone: string;
    features: {
      complaints: boolean;
      penalties: boolean;
      refunds: boolean;
    };
  };
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**facilities**
```typescript
{
  id: string;
  organizationId: string;
  name: string;
  address: string;
  contactInfo: {
    phone: string;
    email: string;
  };
  settings: {
    lateFeeAmount: number; // R20
    lateFeeStartDay: number; // 4th of month
    childSurcharge: number; // R10
    gracePeriodDays: number;
    paymentMethods: string[];
  };
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
  };
  status: 'active' | 'inactive';
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**rooms**
```typescript
{
  id: string;
  facilityId: string;
  roomNumber: string;
  type: 'single' | 'double' | 'family' | 'studio';
  capacity: number;
  monthlyRent: number;
  depositAmount: number;
  amenities: string[];
  status: 'available' | 'occupied' | 'maintenance' | 'unavailable';
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**tenants**
```typescript
{
  id: string;
  facilityId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    idNumber: string;
    phone: string;
    email: string;
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  documents: {
    idCopy?: string;
    proofOfIncome?: string;
    references?: string[];
  };
  status: 'active' | 'inactive' | 'blacklisted';
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**rentals**
```typescript
{
  id: string;
  facilityId: string;
  roomId: string;
  tenantId: string;
  startDate: timestamp;
  endDate?: timestamp;
  monthlyRent: number;
  depositAmount: number;
  children: number;
  status: 'active' | 'terminated' | 'expired';
  terms: {
    leaseType: 'monthly' | 'fixed-term';
    renewalTerms: string;
    terminationNotice: number; // days
  };
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**payments**
```typescript
{
  id: string;
  facilityId: string;
  rentalId: string;
  tenantId: string;
  month: string; // YYYY-MM format
  amount: number;
  method: 'cash' | 'eft' | 'mobile' | 'card';
  otherFees: number;
  lateFee: number;
  total: number;
  status: 'posted' | 'proposed' | 'partial';
  receiptNumber: string;
  notes?: string;
  createdBy: string; // userId
  approvedBy?: string; // userId
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**proposals**
```typescript
{
  id: string;
  facilityId: string;
  type: 'payment' | 'rental' | 'refund' | 'penalty';
  entityId: string; // ID of the record being modified
  changes: Record<string, any>; // Field changes
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  reviewedBy?: string;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**complaints**
```typescript
{
  id: string;
  facilityId: string;
  rentalId: string;
  tenantId: string;
  type: 'maintenance' | 'noise' | 'damage' | 'other';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  assignedTo?: string; // userId
  resolution?: string;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**penalties**
```typescript
{
  id: string;
  facilityId: string;
  rentalId: string;
  tenantId: string;
  type: 'late' | 'noise' | 'damage' | 'other';
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'paid' | 'waived';
  complaintId?: string; // Link to complaint if applicable
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**refunds**
```typescript
{
  id: string;
  facilityId: string;
  rentalId: string;
  tenantId: string;
  originalDeposit: number;
  deductions: {
    damages: number;
    cleaning: number;
    unpaidRent: number;
    other: number;
  };
  refundAmount: number;
  status: 'pending' | 'approved' | 'paid';
  notes?: string;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**users**
```typescript
{
  id: string;
  email: string;
  role: 'super-admin' | 'facility-admin' | 'standard-user' | 'read-only';
  facilities: string[]; // Array of facility IDs
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: timestamp;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### 9.2 Subcollections

**rentals/{rentalId}/paymentHistory**
- Historical payment records for each rental
- Indexed by month for quick lookups

**rentals/{rentalId}/documents**
- Lease agreements, amendments, notices
- File metadata and download links

**facilities/{facilityId}/notifications**
- Facility-specific notification settings
- User preferences and subscription topics

---

## 10. APIs

### 10.1 Cloud Functions Endpoints

**Authentication**
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh token
- `POST /auth/reset-password` - Password reset

**Facilities**
- `GET /facilities` - List user's facilities
- `GET /facilities/{id}` - Get facility details
- `PUT /facilities/{id}` - Update facility settings
- `POST /facilities` - Create new facility (Super Admin only)

**Rooms**
- `GET /facilities/{facilityId}/rooms` - List rooms
- `POST /facilities/{facilityId}/rooms` - Create room
- `PUT /rooms/{id}` - Update room
- `DELETE /rooms/{id}` - Delete room

**Tenants**
- `GET /facilities/{facilityId}/tenants` - List tenants
- `POST /facilities/{facilityId}/tenants` - Create tenant
- `PUT /tenants/{id}` - Update tenant
- `GET /tenants/{id}` - Get tenant details

**Rentals**
- `GET /facilities/{facilityId}/rentals` - List rentals
- `POST /facilities/{facilityId}/rentals` - Create rental
- `PUT /rentals/{id}` - Update rental
- `POST /rentals/{id}/terminate` - Terminate rental

**Payments**
- `GET /facilities/{facilityId}/payments` - List payments
- `POST /facilities/{facilityId}/payments` - Create payment
- `PUT /payments/{id}` - Update payment
- `POST /payments/{id}/receipt` - Generate receipt

**Proposals**
- `GET /facilities/{facilityId}/proposals` - List pending proposals
- `POST /proposals/{id}/approve` - Approve proposal
- `POST /proposals/{id}/reject` - Reject proposal

**Reports**
- `GET /facilities/{facilityId}/reports/financial` - Financial summary
- `GET /facilities/{facilityId}/reports/occupancy` - Occupancy report
- `GET /facilities/{facilityId}/reports/overdue` - Overdue report

**Notifications**
- `POST /notifications/send` - Send notification
- `GET /notifications/history` - Notification history
- `PUT /notifications/preferences` - Update preferences

### 10.2 Real-time Subscriptions

- **Dashboard Updates**: Live facility statistics
- **Payment Notifications**: Real-time payment confirmations
- **Proposal Updates**: Live approval queue updates
- **Complaint Status**: Real-time complaint resolution updates

---

## 11. UI/UX

* Responsive (desktop/tablet/phone).
* Navigation: Facilities → Rooms → Rentals → Tenant → Payments/History.
* Inline validation; prevent duplicates; show computed fees in real-time.
* Approval banners on proposed records.
* **Receipts & Agreements:** auto-generated, shareable.
* Accessible (contrast, keyboard nav).

---

## 12. Security & Compliance

*(unchanged)*

---

## 13. Notifications & Reminders

* Lease expiry, overdue rent, approval queue.
* Bulk overdue reminders.
* Admin digest emails.
* Branded templates.

---

## 14. Reporting KPIs

*(unchanged)*

---

## 15. Non-Functional Requirements

* **Performance:** Dashboard <2s for ≤5k rentals.
* **Availability:** 99.5% uptime.
* **Scalability:** Multi-facility default.
* **Auditability:** All sensitive changes logged.
* **Maintainability:** Modular, config-driven.
* **Internationalization:** ZAR default; extensible.
* **Delivery:** PWA, installable on mobile/tablet, with offline sync.

---

## 16. Tech Stack

* **Frontend:** React + TypeScript (PWA enabled), React Router, React Query for data caching, form libs (React Hook Form + Zod), Tailwind CSS for styling.
* **Build Tooling:** Vite for dev/build; ESLint/Prettier.
* **PWA:** Workbox service worker (precaching + runtime caching), background sync, offline fallbacks, install prompts.
* **Backend / Hosting:** Firebase — Cloud Firestore (DB), Firebase Auth (email/phone/SSO), Cloud Functions (Node.js) for business rules/approvals/PDF generation, Firebase Storage (docs/photos), Firebase Hosting (CDN).
* **Notifications:** Firebase Cloud Messaging (push), Email/SMS via SendGrid/Twilio integrations.
* **Reports & PDFs:** Headless Chromium (Puppeteer) in Cloud Functions.
* **CI/CD:** GitHub Actions with preview channels (Firebase Hosting/Functions).
* **Testing:** Jest + React Testing Library (unit), Cypress (e2e), Playwright (PDF/regression) optional.
* **Optional Payments:** Integration adapters for local payment methods (EFT reference, card gateways, mobile wallet).

---

## 17. Acceptance Criteria (Samples)

* Creating a payment on 10th of month auto-applies late fee of (10 − 4) × R20 = R120.
* Attempting a second **Posted** payment for the same rental & month is blocked; additional entries remain **Proposed** or **Partial** until consolidated.
* Partial payment reduces outstanding balance; system shows remaining due and continues late fee on the remaining balance if configured.
* Receipt PDF is generated with unique reference, facility branding, line items (base rent, child surcharge, late fee, other fees) and is downloadable/shareable.
* Standard User edits a payment → record enters **Proposed**; Admin approves → state becomes **Posted**; audit log stores field deltas and user IDs.
* New rental cannot be created for a room with status **occupied**.
* Facility-level change to late fee start day affects new payments created after the change, not historical ones.
* PWA installs on Android/iOS/desktop; when offline, user can capture a payment which is queued and later synced as **Proposed**.

---

## 18. Open Questions
```
Organization (Super Admin level)
├── Facility A (Admin + Users)
│   ├── Room 101
│   ├── Room 102
│   └── Room 103
├── Facility B (Admin + Users)
│   ├── Room 201
│   └── Room 202
└── Facility C (Admin + Users)
    └── Room 301
```

---

## 19. Security Rules

### 19.1 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    function getUserFacilities() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.facilities;
    }
    
    function isSuperAdmin() {
      return getUserRole() == 'super-admin';
    }
    
    function isFacilityAdmin() {
      return getUserRole() == 'facility-admin';
    }
    
    function canAccessFacility(facilityId) {
      return isSuperAdmin() || facilityId in getUserFacilities();
    }
    
    function canModify() {
      return getUserRole() in ['super-admin', 'facility-admin'];
    }
    
    function canPropose() {
      return getUserRole() in ['super-admin', 'facility-admin', 'standard-user'];
    }
    
    // Organizations
    match /organizations/{orgId} {
      allow read, write: if isSuperAdmin();
    }
    
    // Facilities
    match /facilities/{facilityId} {
      allow read: if isAuthenticated() && canAccessFacility(facilityId);
      allow write: if isAuthenticated() && canModify() && canAccessFacility(facilityId);
    }
    
    // Rooms
    match /rooms/{roomId} {
      allow read: if isAuthenticated() && canAccessFacility(resource.data.facilityId);
      allow write: if isAuthenticated() && canModify() && canAccessFacility(resource.data.facilityId);
    }
    
    // Tenants
    match /tenants/{tenantId} {
      allow read: if isAuthenticated() && canAccessFacility(resource.data.facilityId);
      allow write: if isAuthenticated() && canModify() && canAccessFacility(resource.data.facilityId);
    }
    
    // Rentals
    match /rentals/{rentalId} {
      allow read: if isAuthenticated() && canAccessFacility(resource.data.facilityId);
      allow write: if isAuthenticated() && canModify() && canAccessFacility(resource.data.facilityId);
      
      // Payment history subcollection
      match /paymentHistory/{paymentId} {
        allow read: if isAuthenticated() && canAccessFacility(get(/databases/$(database)/documents/rentals/$(rentalId)).data.facilityId);
        allow write: if isAuthenticated() && canModify() && canAccessFacility(get(/databases/$(database)/documents/rentals/$(rentalId)).data.facilityId);
      }
      
      // Documents subcollection
      match /documents/{docId} {
        allow read: if isAuthenticated() && canAccessFacility(get(/databases/$(database)/documents/rentals/$(rentalId)).data.facilityId);
        allow write: if isAuthenticated() && canModify() && canAccessFacility(get(/databases/$(database)/documents/rentals/$(rentalId)).data.facilityId);
      }
    }
    
    // Payments
    match /payments/{paymentId} {
      allow read: if isAuthenticated() && canAccessFacility(resource.data.facilityId);
      allow create: if isAuthenticated() && canPropose() && canAccessFacility(resource.data.facilityId);
      allow update: if isAuthenticated() && canModify() && canAccessFacility(resource.data.facilityId);
    }
    
    // Proposals
    match /proposals/{proposalId} {
      allow read: if isAuthenticated() && canAccessFacility(resource.data.facilityId);
      allow create: if isAuthenticated() && canPropose() && canAccessFacility(resource.data.facilityId);
      allow update: if isAuthenticated() && canModify() && canAccessFacility(resource.data.facilityId);
    }
    
    // Complaints
    match /complaints/{complaintId} {
      allow read: if isAuthenticated() && canAccessFacility(resource.data.facilityId);
      allow write: if isAuthenticated() && canPropose() && canAccessFacility(resource.data.facilityId);
    }
    
    // Penalties
    match /penalties/{penaltyId} {
      allow read: if isAuthenticated() && canAccessFacility(resource.data.facilityId);
      allow write: if isAuthenticated() && canPropose() && canAccessFacility(resource.data.facilityId);
    }
    
    // Refunds
    match /refunds/{refundId} {
      allow read: if isAuthenticated() && canAccessFacility(resource.data.facilityId);
      allow write: if isAuthenticated() && canPropose() && canAccessFacility(resource.data.facilityId);
    }
    
    // Users
    match /users/{userId} {
      allow read: if isAuthenticated() && (isSuperAdmin() || userId == request.auth.uid);
      allow write: if isAuthenticated() && (isSuperAdmin() || (isFacilityAdmin() && userId != request.auth.uid));
    }
  }
}
```

### 19.2 Authentication Rules

- **Email/Password**: Primary authentication method
- **Phone Authentication**: Optional for tenant self-service
- **Multi-Factor Authentication**: Required for admin users
- **Session Management**: 30-day sessions with refresh tokens
- **Password Policy**: Minimum 8 characters, complexity requirements

### 19.3 Data Validation Rules

- **Required Fields**: Enforced at database level
- **Data Types**: Strict typing with Firestore rules
- **Business Logic**: Validated in Cloud Functions
- **File Uploads**: Size limits, type restrictions, virus scanning

---

## 20. Implementation Notes

### 20.1 Development Phases

**Phase 1: Core Foundation**
- Authentication and user management
- Basic facility and room management
- Simple payment capture
- Basic reporting

**Phase 2: Advanced Features**
- Approval workflows
- Partial payments and late fees
- Document management
- Enhanced reporting

**Phase 3: PWA & Offline**
- Service worker implementation
- Offline data sync
- Push notifications
- Mobile optimization

**Phase 4: Integrations**
- Payment gateways
- Email/SMS providers
- Accounting software exports
- Advanced analytics

### 20.2 Technical Considerations

- **State Management**: Redux Toolkit for complex state
- **Form Handling**: React Hook Form with Zod validation
- **Error Handling**: Global error boundary with user-friendly messages
- **Loading States**: Skeleton screens and progress indicators
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Code splitting and lazy loading
- **Testing**: 80%+ code coverage target

### 20.3 Deployment Strategy

- **Environment Separation**: Dev, staging, production
- **Feature Flags**: Gradual rollout of new features
- **Monitoring**: Error tracking and performance monitoring
- **Backup**: Automated daily backups with point-in-time recovery
```

---

## 21. Implementation Notes

### 21.1 Development Phases

**Phase 1: Core Foundation**
- Authentication and user management
- Basic facility and room management
- Simple payment capture
- Basic reporting

**Phase 2: Advanced Features**
- Approval workflows
- Partial payments and late fees
- Document management
- Enhanced reporting

**Phase 3: PWA & Offline**
- Service worker implementation
- Offline data sync
- Push notifications
- Mobile optimization

**Phase 4: Integrations**
- Payment gateways
- Email/SMS providers
- Accounting software exports
- Advanced analytics

### 21.2 Technical Considerations

- **State Management**: Redux Toolkit for complex state
- **Form Handling**: React Hook Form with Zod validation
- **Error Handling**: Global error boundary with user-friendly messages
- **Loading States**: Skeleton screens and progress indicators
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Code splitting and lazy loading
- **Testing**: 80%+ code coverage target

### 21.3 Deployment Strategy

- **Environment Separation**: Dev, staging, production
- **Feature Flags**: Gradual rollout of new features
- **Monitoring**: Error tracking and performance monitoring
- **Backup**: Automated daily backups with point-in-time recovery

1. **Payment Gateway Integration**: Which local payment providers to integrate?
2. **SMS Notifications**: Cost implications and provider selection?
3. **Document Storage**: Cloud storage limits and backup strategy?
4. **Multi-tenancy**: Single organization vs. multi-organization architecture?
5. **Offline Sync**: Conflict resolution strategy for concurrent edits?
6. **Reporting**: Real-time vs. batch processing for large datasets?
7. **Compliance**: Data protection regulations and retention policies?
8. **Scalability**: Performance optimization for 10k+ rentals?
9. **Backup Strategy**: Disaster recovery and data migration plans?
10. **Feature Rollout**: Gradual feature deployment and A/B testing?

---

## 21. Implementation Notes

### 21.1 Development Phases

**Phase 1: Core Foundation**
- Authentication and user management
- Basic facility and room management
- Simple payment capture
- Basic reporting

**Phase 2: Advanced Features**
- Approval workflows
- Partial payments and late fees
- Document management
- Enhanced reporting

**Phase 3: PWA & Offline**
- Service worker implementation
- Offline data sync
- Push notifications
- Mobile optimization

**Phase 4: Integrations**
- Payment gateways
- Email/SMS providers
- Accounting software exports
- Advanced analytics

### 21.2 Technical Considerations

- **State Management**: Redux Toolkit for complex state
- **Form Handling**: React Hook Form with Zod validation
- **Error Handling**: Global error boundary with user-friendly messages
- **Loading States**: Skeleton screens and progress indicators
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Code splitting and lazy loading
- **Testing**: 80%+ code coverage target

### 21.3 Deployment Strategy

- **Environment Separation**: Dev, staging, production
- **Feature Flags**: Gradual rollout of new features
- **Monitoring**: Error tracking and performance monitoring
- **Backup**: Automated daily backups with point-in-time recovery

---

*End of SRS v0.4*
