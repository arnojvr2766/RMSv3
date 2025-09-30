# Rooms Collection

## Overview
The `Rooms` collection stores information about individual rental units within facilities, including room details, pricing, and availability status.

## Field Definitions

| Field | Data Type | Description |
|-------|-----------|-------------|
| `id` | string | Unique identifier for the room |
| `facilityId` | string | Reference to the facility document |
| `roomNumber` | string | Room number or identifier |
| `type` | string | Room type: 'single', 'double', 'family', 'studio' |
| `capacity` | number | Maximum occupancy capacity |
| `monthlyRent` | number | Monthly rental amount |
| `depositAmount` | number | Required security deposit amount |
| `amenities` | array | List of room amenities |
| `status` | string | Room status: 'available', 'occupied', 'maintenance', 'unavailable' |
| `description` | string | Room description (optional) |
| `floorLevel` | number | Floor level of the room (optional) |
| `squareMeters` | number | Room size in square meters (optional) |
| `businessRules` | object | Room-specific business rules (optional) |
| `businessRules.lateFeeAmount` | number | Late fee amount for this room |
| `businessRules.lateFeeStartDay` | number | Day of month when late fees start |
| `businessRules.childSurcharge` | number | Surcharge per child per month |
| `businessRules.gracePeriodDays` | number | Grace period in days |
| `businessRules.paymentMethods` | array | Accepted payment methods |
| `businessRules.usesFacilityDefaults` | boolean | Whether to use facility default rules |
| `createdAt` | Timestamp | Date and time when the room was created |
| `updatedAt` | Timestamp | Date and time when the room was last updated |

## Relationships
- **Many-to-One** with `facilities` (via `facilityId`)
- **One-to-Many** with `leases` (via `roomId`)
- **One-to-Many** with `Payment_Schedules` (via `roomId`)
- **One-to-Many** with `payment_approvals` (via `roomId`)

## Business Rules
- Each room belongs to one facility
- Room status determines availability for new leases
- Room-specific business rules can override facility defaults
- Monthly rent and deposit amounts are used in lease calculations
- Room capacity affects lease terms and pricing
- Amenities are used for marketing and tenant selection
- Room type determines default capacity and pricing structure
