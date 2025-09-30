# Facilities Collection

## Overview
The `facilities` collection stores information about rental facilities, including contact details, business rules, and branding information.

## Field Definitions

| Field | Data Type | Description |
|-------|-----------|-------------|
| `id` | string | Unique identifier for the facility |
| `organizationId` | string | Reference to the organization document |
| `name` | string | Name of the facility |
| `address` | string | Physical address of the facility |
| `billingEntity` | string | Billing entity name (optional) |
| `contactInfo` | object | Contact information for the facility |
| `contactInfo.phone` | string | Primary phone number |
| `contactInfo.email` | string | Primary email address |
| `defaultBusinessRules` | object | Default business rules for the facility |
| `defaultBusinessRules.lateFeeAmount` | number | Default late fee amount (e.g., R20) |
| `defaultBusinessRules.lateFeeStartDay` | number | Day of month when late fees start (e.g., 4th) |
| `defaultBusinessRules.childSurcharge` | number | Surcharge per child per month (e.g., R10) |
| `defaultBusinessRules.gracePeriodDays` | number | Grace period in days before late fees apply |
| `defaultBusinessRules.paymentMethods` | array | Accepted payment methods |
| `primaryColor` | string | Primary color for branding |
| `status` | string | Facility status: 'active' or 'inactive' |
| `createdAt` | Timestamp | Date and time when the facility was created |
| `updatedAt` | Timestamp | Date and time when the facility was last updated |

## Relationships
- **Many-to-One** with `organizations` (via `organizationId`)
- **One-to-Many** with `Rooms` (via `facilityId`)
- **One-to-Many** with `renters` (via `facilityId`)
- **One-to-Many** with `leases` (via `facilityId`)
- **One-to-Many** with `Payment_Schedules` (via `facilityId`)
- **One-to-Many** with `payment_approvals` (via `facilityId`)

## Business Rules
- Each facility belongs to one organization
- Facilities can have multiple rooms
- Business rules defined at facility level apply to all rooms unless overridden
- Facility status determines availability for new leases
- Contact information is used for communication with renters
