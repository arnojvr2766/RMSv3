#  Data Takeover — Client Data Request

To migrate your existing records into the system accurately we need you to provide your data in spreadsheet format (Excel `.xlsx` or Google Sheets exported as `.xlsx`).

Please provide **one tab per section** listed below in a single Excel workbook, or as separate files named exactly as shown.

---

## Glossary — Key Terms Explained

Before filling in the sheets, please read these definitions so you know exactly what we are asking for.

**Facility**
A facility is a single physical property or building that you manage. If you own or manage multiple buildings, each one is a separate facility. For example, if you have a block of rooms in Johannesburg and another in Pretoria, those are two facilities. If you have one building with two wings (Block A and Block B) and you manage them separately, those could also be two facilities. Think of a facility as the top-level address your rooms belong to.

**Room**
A room is any individual rentable unit inside a facility. It could be a bedroom, studio flat, bachelor unit, or any space you charge rent for. Every room belongs to one facility. Rooms have their own rent amount, deposit, and occupancy status.

**Renter (Tenant)**
A renter is the person who lives in or rents a room. Each renter has their own profile in the system — their personal details, ID number, and contact information. One person can only have one renter profile, even if they have rented multiple rooms over time.

**Lease**
A lease is the agreement between you and a renter for a specific room. It records the start date, end date, monthly rent, and deposit. If the same person has rented two different rooms at different times, that is two separate leases — but still one renter profile.

**Billing Entity**
The billing entity is the registered legal name of the company or person that receives the rental income and issues receipts. This is often different from the building name. For example, your building might be called "Sunrise Apartments" but the company that owns it and handles the money is "Sunrise Properties (Pty) Ltd". If you operate as a sole proprietor under your own name, your name is the billing entity. If you are unsure, use the name that appears on your bank account or tax documents.

**Monthly Rent**
The fixed amount the tenant pays each month, excluding any penalties or extra charges. Enter this as a number only — no "R" symbol, no spaces, no commas. Example: `3500` means R3,500.

**Deposit Amount**
The once-off security deposit paid by the tenant when they move in. This is held and returned (minus any deductions) when they move out. Enter as a number only.

**Payment Due Day**
The day of the month by which the tenant must pay rent. For example, if rent is due on the 1st of each month, enter `1`. If it is due on the 5th, enter `5`.

**Grace Period Days**
The number of days after the payment due day before the account is considered overdue. For example, if the due day is the 1st and your grace period is 3 days, the account only becomes overdue from the 4th. If you do not have a grace period, enter `0`.

**Late Fee**
A fixed rand amount automatically added to a tenant's account when they pay late (after the grace period). If you do not charge late fees, leave this blank.

**Child Surcharge**
An extra monthly charge per child living in the unit, if applicable. If you do not charge this, leave it blank.

**Payment Method**
How the tenant paid their rent. Options are: `cash`, `eft` (bank transfer), `mobile_money`, or `card`.

**Lease Status**
- `active` — the tenant is currently living in the room under this lease
- `terminated` — the tenant has moved out before the lease end date
- `expired` — the lease reached its end date naturally

**Renter Status**
- `active` — the person is a current tenant
- `inactive` — the person has moved out and is no longer renting from you

---

## How to Submit

1. Fill in each sheet as described below.
2. **Do not change column header names** — the import tool matches on these exactly.
3. Leave a cell blank if you don't have that information — do not write "N/A" or "-".
4. Dates must be in **YYYY-MM-DD** format (e.g. 2024-03-15). Not "March 2024" or "15/03/24".
5. Currency amounts must be **numbers only** — no "R", commas, or spaces (e.g. `3500` not `R 3,500`).

---

## Sheet 1: Facilities

One row per building / property / block.

| Column               | Required?   | Description                                                       | Example                         |
| -------------------- | ----------- | ----------------------------------------------------------------- | ------------------------------- |
| `facility_name`      | ✅ Required  | Full name of the property                                         | Sunrise Apartments Block A      |
| `address`            | ✅ Required  | Physical street address                                           | 12 Bree Street, Cape Town, 8001 |
| `contact_phone`      | ✅ Required  | Main contact phone number                                         | 0211234567                      |
| `contact_email`      | Recommended | Main contact email                                                | admin@sunriseapts.co.za         |
| `billing_entity`     | Optional    | Legal entity name for invoicing (if different from facility name) | Sunrise Properties (Pty) Ltd    |
| `late_fee_amount`    | Optional    | Default late fee charged (rands)                                  | 150                             |
| `late_fee_start_day` | Optional    | Day of month late fee kicks in                                    | 7                               |
| `grace_period_days`  | Optional    | Days after due date before overdue                                | 3                               |
| `child_surcharge`    | Optional    | Extra charge per child                                            | 50                              |
| `notes`              | Optional    | Any notes                                                         | Ground floor only               |
|                      |             |                                                                   |                                 |

---

## Sheet 2: Rooms

One row per rentable unit. Every room must link to a facility via `facility_name` (must match Sheet 1 exactly).

| Column           | Required?   | Description                                            | Example                    |
| ---------------- | ----------- | ------------------------------------------------------ | -------------------------- |
| `facility_name`  | ✅ Required  | Must match a name in Sheet 1                           | Sunrise Apartments Block A |
| `room_number`    | ✅ Required  | Room number or name                                    | 101                        |
| `room_type`      | ✅ Required  | One of: `single`, `double`, `family`, `studio`         | single                     |
| `monthly_rent`   | ✅ Required  | Current monthly rent amount (rands)                    | 3500                       |
| `deposit_amount` | ✅ Required  | Deposit amount required                                | 3500                       |
| `capacity`       | Recommended | Max number of occupants                                | 1                          |
| `status`         | Recommended | Current status: `available`, `occupied`, `maintenance` | occupied                   |
| `floor`          | Optional    | Floor number                                           | 1                          |
| `amenities`      | Optional    | Comma-separated list                                   | Wifi, En-suite bathroom    |
| `notes`          | Optional    | Any notes about the room                               | North facing, large window |

---

## Sheet 3: Renters (Tenants)

One row per person — current tenants AND past tenants (for history).

| Column                           | Required?   | Description                               | Example               |
| -------------------------------- | ----------- | ----------------------------------------- | --------------------- |
| `first_name`                     | ✅ Required  | First name                                | Thabo                 |
| `last_name`                      | ✅ Required  | Last name / surname                       | Nkosi                 |
| `email`                          | ✅ Required  | Email address (must be unique per person) | thabo.nkosi@gmail.com |
| `phone`                          | ✅ Required  | Mobile number                             | 0821234567            |
| `id_number`                      | Recommended | SA ID number or passport number           | 9001015800086         |
| `status`                         | Recommended | `active` or `inactive`                    | active                |
| `emergency_contact_name`         | Recommended | Full name of emergency contact            | Mary Nkosi            |
| `emergency_contact_phone`        | Recommended | Emergency contact phone                   | 0731234567            |
| `emergency_contact_relationship` | Optional    | Relationship to tenant                    | Mother                |
| `notes`                          | Optional    | Any notes                                 | Works night shift     |

---

## Sheet 4: Leases

One row per lease agreement — current AND past leases. Links to rooms and renters via matching columns.

| Column               | Required?   | Description                                                | Example                    |
| -------------------- | ----------- | ---------------------------------------------------------- | -------------------------- |
| `facility_name`      | ✅ Required  | Must match Sheet 1                                         | Sunrise Apartments Block A |
| `room_number`        | ✅ Required  | Must match Sheet 2                                         | 101                        |
| `renter_email`       | ✅ Required  | Must match Sheet 3                                         | thabo.nkosi@gmail.com      |
| `start_date`         | ✅ Required  | Lease start date (YYYY-MM-DD)                              | 2023-06-01                 |
| `end_date`           | Recommended | Lease end date (YYYY-MM-DD). Leave blank if month-to-month | 2024-05-31                 |
| `monthly_rent`       | ✅ Required  | Agreed monthly rent                                        | 3500                       |
| `deposit_amount`     | ✅ Required  | Deposit paid at signing                                    | 3500                       |
| `deposit_paid`       | Recommended | Was the deposit actually paid? `yes` or `no`               | yes                        |
| `payment_due_day`    | Recommended | Day of month rent is due                                   | 1                          |
| `payment_frequency`  | Optional    | `monthly` (default)                                        | monthly                    |
| `lease_type`         | Optional    | `monthly` or `fixed-term`                                  | fixed-term                 |
| `status`             | ✅ Required  | `active`, `terminated`, or `expired`                       | active                     |
| `termination_date`   | Conditional | Required if status is `terminated` (YYYY-MM-DD)            | 2024-02-28                 |
| `termination_reason` | Optional    | Reason for termination                                     | End of term                |
| `children`           | Optional    | Number of children in unit                                 | 0                          |
| `notes`              | Optional    | Any special terms                                          | Includes parking bay 5     |

---

## Sheet 5: Payment History

One row per payment received. This is the most important history sheet — it tells the system what has been paid and when. Links to leases via room + renter.

| Column             | Required?   | Description                            | Example                     |
| ------------------ | ----------- | -------------------------------------- | --------------------------- |
| `facility_name`    | ✅ Required  | Must match Sheet 1                     | Sunrise Apartments Block A  |
| `room_number`      | ✅ Required  | Must match Sheet 2                     | 101                         |
| `renter_email`     | ✅ Required  | Must match Sheet 3                     | thabo.nkosi@gmail.com       |
| `payment_date`     | ✅ Required  | Date payment was received (YYYY-MM-DD) | 2024-03-03                  |
| `amount_paid`      | ✅ Required  | Amount received                        | 3500                        |
| `payment_month`    | ✅ Required  | Which month this covers (YYYY-MM)      | 2024-03                     |
| `payment_method`   | Recommended | `cash`, `eft`, `mobile_money`, `card`  | eft                         |
| `reference_number` | Optional    | Bank reference or receipt number       | EFT-20240303-001            |
| `status`           | Optional    | `approved` (default for historical)    | approved                    |
| `notes`            | Optional    | Any notes                              | Paid via FNB online banking |

---

## Sheet 6: Outstanding Balances (Current Only)

If any tenants owe money right now, list them here. This creates their opening balance in the app.

| Column | Required? | Description | Example |
|---|---|---|---|
| `facility_name` | ✅ Required | Must match Sheet 1 | Sunrise Apartments Block A |
| `room_number` | ✅ Required | Must match Sheet 2 | 101 |
| `renter_email` | ✅ Required | Must match Sheet 3 | thabo.nkosi@gmail.com |
| `outstanding_amount` | ✅ Required | Total amount currently owed | 7000 |
| `months_overdue` | Recommended | How many months behind | 2 |
| `description` | Optional | Details of what is owed | March + April 2024 rent unpaid |

---

## Sheet 7: Penalties (Optional)

Past fines or charges that should appear in the tenant's history.

| Column | Required? | Description | Example |
|---|---|---|---|
| `facility_name` | ✅ Required | Must match Sheet 1 | Sunrise Apartments Block A |
| `room_number` | ✅ Required | Must match Sheet 2 | 101 |
| `renter_email` | ✅ Required | Must match Sheet 3 | thabo.nkosi@gmail.com |
| `penalty_date` | ✅ Required | Date penalty was issued (YYYY-MM-DD) | 2024-01-10 |
| `amount` | ✅ Required | Penalty amount | 150 |
| `type` | Recommended | `late_payment`, `damage`, `noise`, `other` | late_payment |
| `description` | ✅ Required | What the penalty is for | Late payment fee — January |
| `status` | Optional | `paid`, `pending`, `waived` | paid |

---

## Sheet 8: Deposit Refunds (Past Tenants — Optional)

If you have records of deposit refunds paid to past tenants, include them here.

| Column | Required? | Description | Example |
|---|---|---|---|
| `facility_name` | ✅ Required | Must match Sheet 1 | Sunrise Apartments Block A |
| `room_number` | ✅ Required | Must match Sheet 2 | 101 |
| `renter_email` | ✅ Required | Must match Sheet 3 | thabo.nkosi@gmail.com |
| `original_deposit` | ✅ Required | Deposit amount originally held | 3500 |
| `deduction_damages` | Optional | Deducted for damages | 500 |
| `deduction_cleaning` | Optional | Deducted for cleaning | 200 |
| `deduction_unpaid_rent` | Optional | Deducted for unpaid rent | 0 |
| `deduction_other` | Optional | Any other deductions | 0 |
| `refund_amount` | ✅ Required | Final amount refunded | 2800 |
| `refund_date` | Recommended | Date refund was paid (YYYY-MM-DD) | 2024-02-29 |
| `notes` | Optional | Notes | Damage to bathroom tiles |

---

## Minimum Required to Get Started

If you have limited records, we can still import with just these three sheets:

1. **Sheet 1** — Facilities (at least names and addresses)
2. **Sheet 2** — Rooms (room numbers, types, monthly rent)
3. **Sheet 3 + 4** — Renters and their current active leases

Payment history and penalties are optional but highly recommended for accurate reporting.

---
