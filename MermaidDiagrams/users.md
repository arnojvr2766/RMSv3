# Users Collection

## Overview
The `users` collection stores information about system users, including authentication details, roles, and profile information.

## Field Definitions

| Field | Data Type | Description |
|-------|-----------|-------------|
| `id` | string | Unique identifier for the user |
| `firstName` | string | User's first name |
| `lastName` | string | User's last name |
| `email` | string | User's email address |
| `role` | string | User role: 'system_admin' or 'standard_user' |
| `status` | string | User status: 'pending', 'active', 'disabled' |
| `emailVerified` | boolean | Whether email address is verified |
| `invitationToken` | string | Invitation token for new users (optional) |
| `invitationExpires` | Timestamp | Expiration date for invitation token (optional) |
| `lastLoginAt` | Timestamp | Date and time of last login (optional) |
| `loginCount` | number | Number of times user has logged in (optional) |
| `createdAt` | Timestamp | Date and time when user was created |
| `updatedAt` | Timestamp | Date and time when user was last updated |

## Relationships
- **One-to-One** with `userSettings` (via user ID)
- **One-to-Many** with `payment_approvals` (via `editedBy` and `reviewedBy`)
- **One-to-Many** with `organizationSettings` (via `updatedBy`)

## Business Rules
- User ID is used as the document ID
- Email addresses must be unique across the system
- User roles determine system permissions and access levels
- System admins have full access to all features
- Standard users have limited access based on organization settings
- User status controls login ability
- Invitation tokens are used for new user onboarding
- Login tracking helps monitor user activity
- Email verification is required for account activation
