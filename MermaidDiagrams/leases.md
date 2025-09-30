# Leases Collection

## Overview
The `leases` collection stores lease agreement information, including terms, business rules, and status details.

## Field Definitions

| Field | Data Type | Description |
|-------|-----------|-------------|
| `id` | string | Unique identifier for the lease |
| `facilityId` | string | Reference to the facility document |
| `roomId` | string | Reference to the room document |
| `renterId` | string | Reference to the renter document |
| `childrenCount` | number | Number of children in the lease (optional) |
| `terms` | object | Lease terms and conditions |
| `terms.startDate` | Timestamp | Lease start date |
| `terms.endDate` | Timestamp | Lease end date |
| `terms.monthlyRent` | number | Monthly rental amount |
| `terms.depositAmount` | number | Security deposit amount |
| `terms.depositPaid` | boolean | Whether deposit has been paid |
| `terms.depositPaidDate` | Timestamp | Date when deposit was paid (optional) |
| `businessRules` | object | Business rules specific to this lease |
| `businessRules.lateFeeAmount` | number | Late fee amount for this lease |
| `businessRules.lateFeeStartDay` | number | Day of month when late fees start |
| `businessRules.childSurcharge` | number | Surcharge per child per month |
| `businessRules.gracePeriodDays` | number | Grace period in days |
| `businessRules.paymentMethods` | array | Accepted payment methods |
| `additionalTerms` | string | Additional lease terms (optional) |
| `status` | string | Lease status: 'active', 'expired', 'terminated', 'pending' |
| `createdAt` | Timestamp | Date and time when the lease was created |
| `updatedAt` | Timestamp | Date and time when the lease was last updated |

## Relationships
- **Many-to-One** with `facilities` (via `facilityId`)
- **Many-to-One** with `Rooms` (via `roomId`)
- **Many-to-One** with `renters` (via `renterId`)
- **One-to-One** with `Payment_Schedules` (via `leaseId`)
- **One-to-Many** with `payment_approvals` (via `leaseId`)

## Business Rules
- Each lease is associated with one room and one renter
- Lease terms define the rental period and amounts
- Business rules can override facility defaults
- Lease status determines payment schedule generation
- Deposit payment tracking is maintained separately from rent payments
- Children count affects monthly rent calculation through surcharges
