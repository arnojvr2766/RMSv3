# Database Entity Relationship Diagram

## Overview
This Mermaid diagram shows the relationships between all collections in the Rental Management System database.

## Mermaid ERD Diagram

```mermaid
erDiagram
    users {
        string id PK
        string firstName
        string lastName
        string email
        string role
        string status
        boolean emailVerified
        string invitationToken
        timestamp invitationExpires
        timestamp lastLoginAt
        number loginCount
        timestamp createdAt
        timestamp updatedAt
    }

    userSettings {
        string userId PK
        string defaultViewMode
        number itemsPerPage
        boolean showAdvancedOptions
        boolean emailNotifications
        boolean pushNotifications
        string notificationFrequency
        timestamp createdAt
        timestamp updatedAt
    }

    organizationSettings {
        string id PK
        string paymentDueDate
        boolean allowStandardUserPastPayments
        boolean requireAdminApprovalForPastPayments
        number maxPastPaymentDays
        boolean allowStandardUserFacilities
        boolean allowStandardUserRooms
        boolean allowStandardUserLeases
        boolean allowStandardUserPayments
        boolean allowStandardUserRenters
        boolean allowStandardUserMaintenance
        boolean allowStandardUserPenalties
        number defaultLateFee
        number defaultChildSurcharge
        timestamp createdAt
        timestamp updatedAt
        string updatedBy
    }

    facilities {
        string id PK
        string organizationId
        string name
        string address
        string billingEntity
        object contactInfo
        object defaultBusinessRules
        string primaryColor
        string status
        timestamp createdAt
        timestamp updatedAt
    }

    rooms {
        string id PK
        string facilityId FK
        string roomNumber
        string type
        number capacity
        number monthlyRent
        number depositAmount
        array amenities
        string status
        string description
        number floorLevel
        number squareMeters
        object businessRules
        timestamp createdAt
        timestamp updatedAt
    }

    renters {
        string id PK
        string facilityId FK
        object personalInfo
        object documents
        string status
        timestamp createdAt
        timestamp updatedAt
    }

    leases {
        string id PK
        string facilityId FK
        string roomId FK
        string renterId FK
        number childrenCount
        object terms
        object businessRules
        string additionalTerms
        string status
        timestamp createdAt
        timestamp updatedAt
    }

    paymentSchedules {
        string id PK
        string leaseId FK
        string facilityId FK
        string roomId FK
        string renterId FK
        string paymentDueDateSetting
        array payments
        object aggregatedPenalty
        number totalAmount
        number totalPaid
        number outstandingAmount
        timestamp updatedAt
    }

    paymentApprovals {
        string id PK
        string paymentScheduleId FK
        number paymentIndex
        string leaseId FK
        string facilityId FK
        string roomId FK
        string renterId FK
        object originalValues
        object newValues
        string editedBy FK
        timestamp editedAt
        string status
        string reviewedBy FK
        timestamp reviewedAt
        string reviewNotes
        timestamp createdAt
        timestamp updatedAt
    }

    %% Relationships
    users ||--o| userSettings : "has settings"
    users ||--o{ paymentApprovals : "edits/reviews"
    users ||--o{ organizationSettings : "updates"
    
    facilities ||--o{ rooms : "contains"
    facilities ||--o{ renters : "manages"
    facilities ||--o{ leases : "hosts"
    facilities ||--o{ paymentSchedules : "tracks"
    facilities ||--o{ paymentApprovals : "approves"
    
    rooms ||--o{ leases : "rented in"
    rooms ||--o{ paymentSchedules : "scheduled for"
    rooms ||--o{ paymentApprovals : "approved for"
    
    renters ||--o{ leases : "signs"
    renters ||--o{ paymentSchedules : "pays for"
    renters ||--o{ paymentApprovals : "approval for"
    
    leases ||--|| paymentSchedules : "generates"
    leases ||--o{ paymentApprovals : "requires approval"
    
    paymentSchedules ||--o{ paymentApprovals : "creates"
```

## Key Relationships

### Core Business Entities
- **Facilities** are the top-level entities that contain **Rooms** and manage **Renters**
- **Rooms** are rented by **Renters** through **Leases**
- **Leases** generate **Payment Schedules** automatically

### Payment Flow
- **Payment Schedules** contain individual payment records
- **Payment Approvals** are created when payment modifications need review
- **Users** can edit payments and approve modifications

### User Management
- **Users** have personal **User Settings** for UI preferences
- **Organization Settings** control system-wide permissions
- **Users** update organization settings and review payment approvals

### Data Integrity
- All entities maintain audit trails with `createdAt` and `updatedAt` timestamps
- Foreign key relationships ensure data consistency
- Business rules are inherited from facility to room to lease level
