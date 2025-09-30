# Organization Settings Collection

## Overview
The `organizationSettings` collection stores system-wide configuration settings that control user permissions, business rules, and payment settings.

## Field Definitions

| Field | Data Type | Description |
|-------|-----------|-------------|
| `paymentDueDate` | string | Payment due date setting: 'first_day' or 'last_day' |
| `allowStandardUserPastPayments` | boolean | Whether standard users can process past payments |
| `requireAdminApprovalForPastPayments` | boolean | Whether past payments require admin approval |
| `maxPastPaymentDays` | number | Maximum number of days back for past payments |
| `allowStandardUserFacilities` | boolean | Whether standard users can manage facilities |
| `allowStandardUserRooms` | boolean | Whether standard users can manage rooms |
| `allowStandardUserLeases` | boolean | Whether standard users can manage leases |
| `allowStandardUserPayments` | boolean | Whether standard users can manage payments |
| `allowStandardUserRenters` | boolean | Whether standard users can manage renters |
| `allowStandardUserMaintenance` | boolean | Whether standard users can manage maintenance |
| `allowStandardUserPenalties` | boolean | Whether standard users can manage penalties |
| `defaultLateFee` | number | Default late fee amount for the organization |
| `defaultChildSurcharge` | number | Default child surcharge amount for the organization |
| `createdAt` | Timestamp | Date and time when settings were created |
| `updatedAt` | Timestamp | Date and time when settings were last updated |
| `updatedBy` | string | User ID who last updated the settings |

## Relationships
- **One-to-One** with system configuration (single document: 'main')
- **Many-to-One** with `users` (via `updatedBy`)

## Business Rules
- Organization settings are stored in a single document with ID 'main'
- Settings control user permissions across the entire system
- Payment due date setting affects all new payment schedules
- User permission settings determine what actions standard users can perform
- Default business rules apply when facility-specific rules are not set
- Settings changes are tracked with user ID and timestamp
- Settings are applied globally across all facilities in the organization
