# Payment Approvals Collection

## Overview
The `payment_approvals` collection stores payment approval requests that require administrative review before being finalized.

## Field Definitions

| Field | Data Type | Description |
|-------|-----------|-------------|
| `id` | string | Unique identifier for the payment approval record |
| `paymentScheduleId` | string | Reference to the payment schedule document |
| `paymentIndex` | number | Index of the payment in the payments array within the payment schedule |
| `leaseId` | string | Reference to the lease agreement document |
| `facilityId` | string | Reference to the facility document |
| `roomId` | string | Reference to the room document |
| `renterId` | string | Reference to the renter document |
| `originalValues` | object | Original payment values before modification |
| `originalValues.paidAmount` | number | Original paid amount |
| `originalValues.paidDate` | Timestamp | Original payment date |
| `originalValues.paymentMethod` | string | Original payment method |
| `newValues` | object | New payment values after modification |
| `newValues.paidAmount` | number | New paid amount |
| `newValues.paidDate` | Timestamp | New payment date |
| `newValues.paymentMethod` | string | New payment method |
| `editedBy` | string | User ID who made the changes |
| `editedAt` | Timestamp | Date and time when changes were made |
| `status` | string | Approval status: 'pending', 'approved', 'declined' |
| `reviewedBy` | string | User ID who reviewed the approval (optional) |
| `reviewedAt` | Timestamp | Date and time when review was completed (optional) |
| `reviewNotes` | string | Notes from the reviewer (optional) |
| `createdAt` | Timestamp | Date and time when the approval record was created |
| `updatedAt` | Timestamp | Date and time when the record was last updated |

## Relationships
- **Many-to-One** with `Payment_Schedules` (via `paymentScheduleId`)
- **Many-to-One** with `leases` (via `leaseId`)
- **Many-to-One** with `facilities` (via `facilityId`)
- **Many-to-One** with `Rooms` (via `roomId`)
- **Many-to-One** with `renters` (via `renterId`)
- **Many-to-One** with `users` (via `editedBy` and `reviewedBy`)

## Business Rules
- Payment approvals are created when standard users modify payment information
- Only system administrators can approve or decline payment approvals
- Original values are preserved for audit trail purposes
- Approval status determines whether changes are applied to the payment schedule
