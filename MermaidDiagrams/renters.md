# Renters Collection

## Overview
The `renters` collection stores information about tenants/renters, including personal details, contact information, and documents.

## Field Definitions

| Field | Data Type | Description |
|-------|-----------|-------------|
| `id` | string | Unique identifier for the renter |
| `facilityId` | string | Reference to the facility document |
| `personalInfo` | object | Personal information of the renter |
| `personalInfo.firstName` | string | Renter's first name |
| `personalInfo.lastName` | string | Renter's last name |
| `personalInfo.idNumber` | string | South African ID number |
| `personalInfo.phone` | string | Primary phone number |
| `personalInfo.email` | string | Email address |
| `personalInfo.emergencyContact` | object | Emergency contact information |
| `personalInfo.emergencyContact.name` | string | Emergency contact name |
| `personalInfo.emergencyContact.phone` | string | Emergency contact phone |
| `personalInfo.emergencyContact.relationship` | string | Relationship to renter |
| `documents` | object | Document references (optional) |
| `documents.idCopy` | string | Reference to ID copy document (optional) |
| `documents.proofOfIncome` | string | Reference to proof of income document (optional) |
| `documents.references` | array | References to reference documents (optional) |
| `status` | string | Renter status: 'active', 'inactive', 'blacklisted' |
| `createdAt` | Timestamp | Date and time when the renter was created |
| `updatedAt` | Timestamp | Date and time when the renter was last updated |

## Relationships
- **Many-to-One** with `facilities` (via `facilityId`)
- **One-to-Many** with `leases` (via `renterId`)
- **One-to-Many** with `Payment_Schedules` (via `renterId`)
- **One-to-Many** with `payment_approvals` (via `renterId`)

## Business Rules
- Each renter is associated with one facility
- Renters can have multiple lease agreements over time
- Personal information is required for lease agreements
- Emergency contact information is mandatory
- Document references link to files stored in Firebase Storage
- Renter status affects ability to create new leases
- ID number is used for verification and duplicate checking
