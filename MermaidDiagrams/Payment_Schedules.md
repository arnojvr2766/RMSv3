# Payment Schedules Collection

## Overview
The `Payment_Schedules` collection stores comprehensive payment schedules for lease agreements, including individual payment records and aggregated penalty information.

## Field Definitions

| Field | Data Type | Description |
|-------|-----------|-------------|
| `id` | string | Unique identifier for the payment schedule |
| `leaseId` | string | Reference to the lease agreement document |
| `facilityId` | string | Reference to the facility document |
| `roomId` | string | Reference to the room document |
| `renterId` | string | Reference to the renter document |
| `paymentDueDateSetting` | string | Payment due date setting: 'first_day' or 'last_day' |
| `payments` | array | Array of individual payment records |
| `payments[].month` | string | Payment month in "YYYY-MM" format |
| `payments[].dueDate` | Timestamp | Due date for the payment |
| `payments[].amount` | number | Payment amount |
| `payments[].type` | string | Payment type: 'rent', 'deposit', 'late_fee', 'deposit_payout', 'maintenance' |
| `payments[].status` | string | Payment status: 'pending', 'paid', 'overdue', 'partial', 'pending_approval' |
| `payments[].paidAmount` | number | Amount actually paid (optional) |
| `payments[].paidDate` | Timestamp | Date when payment was made (optional) |
| `payments[].lateFee` | number | Late fee amount (optional) |
| `payments[].paymentMethod` | string | Payment method used (optional) |
| `payments[].editedBy` | string | User who edited the payment (optional) |
| `payments[].editedAt` | Timestamp | When payment was edited (optional) |
| `payments[].originalValues` | object | Original values before editing (optional) |
| `payments[].requiresApproval` | boolean | Whether payment requires approval (optional) |
| `payments[].approvedBy` | string | User who approved the payment (optional) |
| `payments[].approvedAt` | Timestamp | When payment was approved (optional) |
| `payments[].approvalNotes` | string | Notes from approver (optional) |
| `payments[].capturedBy` | string | User who captured the payment (optional) |
| `payments[].capturedAt` | Timestamp | When payment was captured (optional) |
| `payments[].prorationDetails` | object | Proration details for partial month payments (optional) |
| `payments[].prorationDetails.isProrated` | boolean | Whether payment is prorated |
| `payments[].prorationDetails.daysOccupied` | number | Number of days occupied |
| `payments[].prorationDetails.daysInMonth` | number | Total days in the month |
| `payments[].prorationDetails.dailyRate` | number | Daily rental rate |
| `payments[].prorationDetails.fullMonthAmount` | number | Full month amount |
| `payments[].prorationDetails.prorationType` | string | Type of proration: 'first_month' or 'last_month' |
| `aggregatedPenalty` | object | Aggregated penalty information (optional) |
| `aggregatedPenalty.totalAmount` | number | Total penalty amount |
| `aggregatedPenalty.paidAmount` | number | Amount of penalties paid |
| `aggregatedPenalty.outstandingAmount` | number | Outstanding penalty amount |
| `aggregatedPenalty.lastCalculated` | Timestamp | When penalties were last calculated |
| `aggregatedPenalty.calculationHistory` | array | History of penalty calculations |
| `totalAmount` | number | Total amount for all payments |
| `totalPaid` | number | Total amount paid |
| `outstandingAmount` | number | Outstanding amount |
| `updatedAt` | Timestamp | Date and time when the record was last updated |

## Relationships
- **One-to-One** with `leases` (via `leaseId`)
- **Many-to-One** with `facilities` (via `facilityId`)
- **Many-to-One** with `Rooms` (via `roomId`)
- **Many-to-One** with `renters` (via `renterId`)
- **One-to-Many** with `payment_approvals` (via `paymentScheduleId`)

## Business Rules
- Payment schedules are automatically generated when lease agreements are created
- Each payment schedule contains monthly payment records for the lease duration
- Payment due dates are calculated based on the `paymentDueDateSetting`
- Late fees are automatically calculated based on business rules
- Proration is applied for partial month occupancy
- Payment modifications may require approval based on user permissions
