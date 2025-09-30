# User Settings Collection

## Overview
The `userSettings` collection stores user-specific preferences and settings for UI customization and notification preferences.

## Field Definitions

| Field | Data Type | Description |
|-------|-----------|-------------|
| `defaultViewMode` | string | Default view mode: 'cards' or 'table' |
| `itemsPerPage` | number | Number of items to display per page |
| `showAdvancedOptions` | boolean | Whether to show advanced options in UI |
| `emailNotifications` | boolean | Whether to receive email notifications |
| `pushNotifications` | boolean | Whether to receive push notifications |
| `notificationFrequency` | string | Notification frequency: 'immediate', 'daily', 'weekly' |
| `createdAt` | Timestamp | Date and time when settings were created |
| `updatedAt` | Timestamp | Date and time when settings were last updated |

## Relationships
- **One-to-One** with `users` (document ID matches user ID)

## Business Rules
- Each user has their own settings document
- Document ID matches the user's ID
- Settings are user-specific and don't affect other users
- UI settings control how data is displayed to the user
- Notification settings control communication preferences
- Settings can be migrated from localStorage for existing users
- Default settings are applied when a user first accesses the system
