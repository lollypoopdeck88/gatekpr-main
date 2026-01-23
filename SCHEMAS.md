# Database Schema Documentation

This document outlines the complete database schema for the GateKpr HOA management platform, derived from the Supabase migration files.

## Overview

The database consists of 32 tables and 2 views designed to manage Homeowners Associations (HOAs), including user management, financial operations, community features, maintenance tracking, and administrative functions.

---

## Core Tables

### hoas

Represents Homeowners Association organizations.

| Column                              | Type                     | Constraints                                | Description                      |
| ----------------------------------- | ------------------------ | ------------------------------------------ | -------------------------------- |
| id                                  | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid() | Unique HOA identifier            |
| name                                | TEXT                     | NOT NULL                                   | HOA name                         |
| address                             | TEXT                     |                                            | Physical address                 |
| settings                            | JSONB                    | DEFAULT '{}'                               | HOA-specific configuration       |
| billing_email                       | TEXT                     |                                            | Email for billing communications |
| stripe_customer_id                  | TEXT                     |                                            | Stripe customer ID for billing   |
| stripe_connect_id                   | TEXT                     |                                            | Stripe Connect account ID        |
| stripe_connect_status               | TEXT                     | DEFAULT 'not_connected'                    | Connect account status           |
| stripe_connect_payouts_enabled      | BOOLEAN                  | DEFAULT false                              | Payout capability status         |
| stripe_connect_onboarding_completed | BOOLEAN                  | DEFAULT false                              | Onboarding completion status     |
| welcome_message                     | TEXT                     |                                            | Customizable welcome message     |
| created_at                          | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                    | Creation timestamp               |
| updated_at                          | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                    | Last update timestamp            |

**Relationships:**

- **One-to-many** with profiles (hoa_id) - Each HOA has multiple residents
- **One-to-many** with hoa_subscriptions (hoa_id) - Each HOA has one subscription
- **One-to-many** with announcements (hoa_id) - Each HOA has multiple announcements
- **One-to-many** with documents (hoa_id) - Each HOA has multiple documents
- **One-to-many** with payment_schedules (hoa_id) - Each HOA has multiple payment schedules
- **One-to-many** with community_spaces (hoa_id) - Each HOA has multiple community spaces
- **One-to-many** with maintenance_requests (hoa_id) - Each HOA has multiple maintenance requests
- **One-to-many** with hoa_fund_transfers (hoa_id) - Each HOA has multiple fund transfers
- **One-to-many** with violation_categories (hoa_id) - Each HOA has multiple violation categories
- **One-to-many** with violations (hoa_id) - Each HOA has multiple violations
- **One-to-many** with ai_document_requests (hoa_id) - Each HOA has multiple AI document requests

### profiles

User profiles for residents and administrators.

| Column                        | Type                     | Constraints                                        | Description                   |
| ----------------------------- | ------------------------ | -------------------------------------------------- | ----------------------------- |
| id                            | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()         | Unique profile identifier     |
| user_id                       | UUID                     | **FOREIGN KEY** → auth.users(id), UNIQUE, NOT NULL | Supabase Auth user reference  |
| hoa_id                        | UUID                     | **FOREIGN KEY** → hoas(id), CASCADE on delete      | Associated HOA                |
| name                          | TEXT                     | NOT NULL                                           | Full name                     |
| email                         | TEXT                     | NOT NULL                                           | Email address                 |
| phone                         | TEXT                     |                                                    | Phone number                  |
| unit_number                   | TEXT                     |                                                    | Apartment/unit number         |
| house_number                  | TEXT                     |                                                    | House/street number           |
| street_name                   | TEXT                     |                                                    | Street name                   |
| city                          | TEXT                     |                                                    | City                          |
| state                         | TEXT                     |                                                    | State                         |
| zip_code                      | TEXT                     |                                                    | ZIP code                      |
| avatar_url                    | TEXT                     |                                                    | Profile picture URL           |
| status                        | TEXT                     | NOT NULL, DEFAULT 'active'                         | Account status                |
| email_verified                | BOOLEAN                  | DEFAULT false                                      | Email verification status     |
| email_verification_code       | TEXT                     |                                                    | Email verification code       |
| email_verification_expires_at | TIMESTAMP WITH TIME ZONE |                                                    | Code expiration               |
| phone_verified                | BOOLEAN                  | DEFAULT false                                      | Phone verification status     |
| phone_verification_code       | TEXT                     |                                                    | Phone verification code       |
| phone_verification_expires_at | TIMESTAMP WITH TIME ZONE |                                                    | Code expiration               |
| notify_by_email               | BOOLEAN                  | DEFAULT true                                       | Email notification preference |
| notify_by_sms                 | BOOLEAN                  | DEFAULT false                                      | SMS notification preference   |
| created_at                    | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                            | Creation timestamp            |
| updated_at                    | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                            | Last update timestamp         |

**Relationships:**

- **Many-to-one** with hoas (hoa_id) - Each profile belongs to one HOA
- **One-to-one** with auth.users (user_id) - Each profile links to one auth user
- **One-to-many** with user_roles (user_id) - Each user has multiple roles
- **One-to-many** with announcements (author_id) - Users can author announcements
- **One-to-many** with documents (uploaded_by) - Users can upload documents
- **One-to-many** with join_requests (user_id) - Users can submit join requests
- **One-to-many** with payment_requests (resident_id) - Users have payment requests
- **One-to-many** with payments (resident_id) - Users make payments
- **One-to-many** with resident_invites (created_by, used_by) - Users can create/send invites
- **One-to-many** with space_reservations (resident_id) - Users can make reservations
- **One-to-many** with maintenance_requests (resident_id) - Users can submit maintenance requests
- **One-to-many** with violations (resident_id) - Users can have violations
- **One-to-many** with violation_responses (resident_id) - Users can respond to violations
- **One-to-many** with notification_logs (recipient_id, created_by) - Users receive/send notifications
- **One-to-many** with announcement_votes (user_id) - Users can vote in polls

### user_roles

Role assignments for users (admin, resident, super_admin).

| Column     | Type            | Constraints                                       | Description                              |
| ---------- | --------------- | ------------------------------------------------- | ---------------------------------------- |
| id         | UUID            | **PRIMARY KEY**, DEFAULT gen_random_uuid()        | Unique role assignment identifier        |
| user_id    | UUID            | **FOREIGN KEY** → auth.users(id), NOT NULL        | User reference                           |
| profile_id | UUID            | **FOREIGN KEY** → profiles(id), CASCADE on delete | Associated profile (nullable)            |
| role       | public.app_role | NOT NULL, DEFAULT 'resident'                      | Role type (admin, resident, super_admin) |

**Relationships:**

- **Many-to-one** with auth.users (user_id) - Each role assignment belongs to one user
- **Many-to-one** with profiles (profile_id) - Each role assignment may belong to a profile
- **Unique constraint** on (user_id, role) - Users can only have each role once

### hoa_subscriptions

Subscription information for HOAs.

| Column                 | Type                     | Constraints                                                     | Description                                  |
| ---------------------- | ------------------------ | --------------------------------------------------------------- | -------------------------------------------- |
| id                     | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                      | Unique subscription identifier               |
| hoa_id                 | UUID                     | **FOREIGN KEY** → hoas(id), UNIQUE, NOT NULL, CASCADE on delete | Associated HOA                               |
| stripe_customer_id     | TEXT                     |                                                                 | Stripe customer ID                           |
| stripe_subscription_id | TEXT                     |                                                                 | Stripe subscription ID                       |
| stripe_price_id        | TEXT                     | NOT NULL                                                        | Stripe price ID                              |
| plan_name              | TEXT                     | NOT NULL                                                        | Plan type (starter, standard, plus, partner) |
| status                 | TEXT                     | NOT NULL, DEFAULT 'trialing'                                    | Subscription status                          |
| current_period_start   | TIMESTAMP WITH TIME ZONE |                                                                 | Billing period start                         |
| current_period_end     | TIMESTAMP WITH TIME ZONE |                                                                 | Billing period end                           |
| trial_ends_at          | TIMESTAMP WITH TIME ZONE |                                                                 | Trial end date                               |
| canceled_at            | TIMESTAMP WITH TIME ZONE |                                                                 | Cancellation date                            |
| created_at             | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                         | Creation timestamp                           |
| updated_at             | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                         | Last update timestamp                        |

**Relationships:**

- **One-to-one** with hoas (hoa_id) - Each HOA has one subscription

---

## Communication & Content

### announcements

HOA announcements and communications.

| Column       | Type                     | Constraints                                             | Description                    |
| ------------ | ------------------------ | ------------------------------------------------------- | ------------------------------ |
| id           | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()              | Unique announcement identifier |
| hoa_id       | UUID                     | **FOREIGN KEY** → hoas(id), NOT NULL, CASCADE on delete | Associated HOA                 |
| author_id    | UUID                     | **FOREIGN KEY** → auth.users(id), SET NULL on delete    | Author of announcement         |
| title        | TEXT                     | NOT NULL                                                | Announcement title             |
| body         | TEXT                     | NOT NULL                                                | Announcement content           |
| published_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                 | Publication timestamp          |
| created_at   | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                 | Creation timestamp             |
| updated_at   | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                 | Last update timestamp          |

**Relationships:**

- **Many-to-one** with hoas (hoa_id) - Each announcement belongs to one HOA
- **Many-to-one** with auth.users (author_id) - Each announcement has one author
- **One-to-many** with announcement_polls (announcement_id) - Announcements can have polls

### announcement_polls

Polls attached to announcements.

| Column          | Type                     | Constraints                                                      | Description               |
| --------------- | ------------------------ | ---------------------------------------------------------------- | ------------------------- |
| id              | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                       | Unique poll identifier    |
| announcement_id | UUID                     | **FOREIGN KEY** → announcements(id), NOT NULL, CASCADE on delete | Associated announcement   |
| question        | TEXT                     | NOT NULL                                                         | Poll question             |
| options         | JSONB                    | NOT NULL, DEFAULT '[]'                                           | Array of poll options     |
| allow_multiple  | BOOLEAN                  | NOT NULL, DEFAULT false                                          | Allow multiple selections |
| ends_at         | TIMESTAMP WITH TIME ZONE |                                                                  | Poll end date             |
| created_at      | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                          | Creation timestamp        |

**Relationships:**

- **Many-to-one** with announcements (announcement_id) - Each poll belongs to one announcement
- **One-to-many** with announcement_votes (poll_id) - Each poll has multiple votes

### announcement_votes

Individual votes on announcement polls.

| Column           | Type                     | Constraints                                                           | Description                      |
| ---------------- | ------------------------ | --------------------------------------------------------------------- | -------------------------------- |
| id               | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                            | Unique vote identifier           |
| poll_id          | UUID                     | **FOREIGN KEY** → announcement_polls(id), NOT NULL, CASCADE on delete | Associated poll                  |
| user_id          | UUID                     | NOT NULL                                                              | Voter (references auth.users)    |
| selected_options | JSONB                    | NOT NULL, DEFAULT '[]'                                                | Array of selected option indices |
| created_at       | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                               | Creation timestamp               |

**Relationships:**

- **Many-to-one** with announcement_polls (poll_id) - Each vote belongs to one poll
- **Many-to-one** with auth.users (user_id) - Each vote belongs to one user
- **Unique constraint** on (poll_id, user_id) - Users can only vote once per poll

### documents

File documents uploaded to the HOA.

| Column      | Type                     | Constraints                                             | Description                                                |
| ----------- | ------------------------ | ------------------------------------------------------- | ---------------------------------------------------------- |
| id          | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()              | Unique document identifier                                 |
| hoa_id      | UUID                     | **FOREIGN KEY** → hoas(id), NOT NULL, CASCADE on delete | Associated HOA                                             |
| uploaded_by | UUID                     | **FOREIGN KEY** → auth.users(id), SET NULL on delete    | Uploader                                                   |
| name        | TEXT                     | NOT NULL                                                | Document name                                              |
| description | TEXT                     |                                                         | Document description                                       |
| category    | TEXT                     | NOT NULL                                                | Document category (Bylaws, Rules, Minutes, Notices, Other) |
| file_url    | TEXT                     | NOT NULL                                                | File storage URL                                           |
| file_type   | TEXT                     |                                                         | MIME type                                                  |
| file_size   | INTEGER                  |                                                         | File size in bytes                                         |
| uploaded_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                 | Upload timestamp                                           |

**Relationships:**

- **Many-to-one** with hoas (hoa_id) - Each document belongs to one HOA
- **Many-to-one** with auth.users (uploaded_by) - Each document has one uploader

### notification_logs

Log of all sent notifications.

| Column              | Type                     | Constraints                                             | Description                 |
| ------------------- | ------------------------ | ------------------------------------------------------- | --------------------------- |
| id                  | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()              | Unique log entry identifier |
| hoa_id              | UUID                     | **FOREIGN KEY** → hoas(id), NOT NULL, CASCADE on delete | Associated HOA              |
| recipient_id        | UUID                     | **FOREIGN KEY** → profiles(id), SET NULL on delete      | Recipient profile           |
| recipient_email     | TEXT                     |                                                         | Recipient email             |
| recipient_phone     | TEXT                     |                                                         | Recipient phone             |
| notification_type   | TEXT                     | NOT NULL                                                | Type (email, sms, in_app)   |
| subject             | TEXT                     |                                                         | Email subject               |
| body                | TEXT                     | NOT NULL                                                | Notification content        |
| status              | TEXT                     | NOT NULL, DEFAULT 'pending'                             | Delivery status             |
| error_message       | TEXT                     |                                                         | Error details if failed     |
| related_entity_type | TEXT                     |                                                         | Related object type         |
| related_entity_id   | UUID                     |                                                         | Related object ID           |
| sent_at             | TIMESTAMP WITH TIME ZONE |                                                         | Send timestamp              |
| delivered_at        | TIMESTAMP WITH TIME ZONE |                                                         | Delivery timestamp          |
| created_at          | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                 | Creation timestamp          |
| created_by          | UUID                     | **FOREIGN KEY** → auth.users(id), SET NULL on delete    | Creator                     |

**Relationships:**

- **Many-to-one** with hoas (hoa_id) - Each log belongs to one HOA
- **Many-to-one** with profiles (recipient_id) - Each log has one recipient
- **Many-to-one** with auth.users (created_by) - Each log has one creator

### notification_dismissals

Tracks dismissed/read notifications by users.

| Column           | Type                     | Constraints                                                   | Description                 |
| ---------------- | ------------------------ | ------------------------------------------------------------- | --------------------------- |
| id               | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                    | Unique dismissal identifier |
| user_id          | UUID                     | **FOREIGN KEY** → auth.users(id), NOT NULL, CASCADE on delete | User who dismissed          |
| notification_key | TEXT                     | NOT NULL                                                      | Notification identifier     |
| dismissed_at     | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                       | Dismissal timestamp         |

**Relationships:**

- **Many-to-one** with auth.users (user_id) - Each dismissal belongs to one user
- **Unique constraint** on (user_id, notification_key) - Users can only dismiss each notification once

---

## Financial Management

### payment_schedules

Recurring payment schedule definitions.

| Column      | Type                     | Constraints                                             | Description                                      |
| ----------- | ------------------------ | ------------------------------------------------------- | ------------------------------------------------ |
| id          | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()              | Unique schedule identifier                       |
| hoa_id      | UUID                     | **FOREIGN KEY** → hoas(id), NOT NULL, CASCADE on delete | Associated HOA                                   |
| name        | TEXT                     | NOT NULL                                                | Schedule name                                    |
| description | TEXT                     |                                                         | Schedule description                             |
| amount      | NUMERIC(10,2)            | NOT NULL                                                | Payment amount                                   |
| frequency   | TEXT                     | NOT NULL                                                | Frequency (monthly, quarterly, annual, one-time) |
| due_day     | INTEGER                  | CHECK (1-31)                                            | Day of month due                                 |
| is_active   | BOOLEAN                  | DEFAULT true                                            | Schedule active status                           |
| created_at  | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                 | Creation timestamp                               |
| updated_at  | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                 | Last update timestamp                            |

**Relationships:**

- **Many-to-one** with hoas (hoa_id) - Each schedule belongs to one HOA
- **One-to-many** with payment_requests (schedule_id) - Each schedule generates multiple requests

### payment_requests

Individual payment requests for residents.

| Column      | Type                     | Constraints                                                          | Description                     |
| ----------- | ------------------------ | -------------------------------------------------------------------- | ------------------------------- |
| id          | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                           | Unique request identifier       |
| schedule_id | UUID                     | **FOREIGN KEY** → payment_schedules(id), NOT NULL, CASCADE on delete | Associated schedule             |
| resident_id | UUID                     | **FOREIGN KEY** → auth.users(id), NOT NULL, CASCADE on delete        | Resident to pay                 |
| amount      | NUMERIC(10,2)            | NOT NULL                                                             | Amount due                      |
| due_date    | DATE                     | NOT NULL                                                             | Due date                        |
| status      | TEXT                     | NOT NULL, DEFAULT 'pending'                                          | Status (pending, paid, overdue) |
| created_at  | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                              | Creation timestamp              |
| updated_at  | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                              | Last update timestamp           |

**Relationships:**

- **Many-to-one** with payment_schedules (schedule_id) - Each request belongs to one schedule
- **Many-to-one** with auth.users (resident_id) - Each request is for one resident
- **One-to-many** with payments (request_id) - Each request can have multiple payments
- **One-to-many** with hoa_fund_transfers (payment_request_id) - Each request can have fund transfers

### payments

Completed payment records.

| Column                | Type                     | Constraints                                                   | Description               |
| --------------------- | ------------------------ | ------------------------------------------------------------- | ------------------------- |
| id                    | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                    | Unique payment identifier |
| request_id            | UUID                     | **FOREIGN KEY** → payment_requests(id), SET NULL on delete    | Associated request        |
| resident_id           | UUID                     | **FOREIGN KEY** → auth.users(id), NOT NULL, CASCADE on delete | Payer                     |
| amount                | NUMERIC(10,2)            | NOT NULL                                                      | Payment amount            |
| payment_method        | TEXT                     |                                                               | Payment method            |
| stripe_transaction_id | TEXT                     |                                                               | Stripe transaction ID     |
| paid_at               | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                       | Payment timestamp         |

**Relationships:**

- **Many-to-one** with payment_requests (request_id) - Each payment fulfills one request
- **Many-to-one** with auth.users (resident_id) - Each payment is from one resident
- **One-to-many** with hoa_fund_transfers (payment_id) - Each payment can have fund transfers

### hoa_fund_transfers

Tracks fund transfers from resident payments to HOA accounts.

| Column                   | Type                     | Constraints                                                | Description                 |
| ------------------------ | ------------------------ | ---------------------------------------------------------- | --------------------------- |
| id                       | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                 | Unique transfer identifier  |
| hoa_id                   | UUID                     | **FOREIGN KEY** → hoas(id), NOT NULL, CASCADE on delete    | Associated HOA              |
| payment_id               | UUID                     | **FOREIGN KEY** → payments(id), SET NULL on delete         | Associated payment          |
| payment_request_id       | UUID                     | **FOREIGN KEY** → payment_requests(id), SET NULL on delete | Associated request          |
| stripe_payment_intent_id | TEXT                     |                                                            | Stripe payment intent ID    |
| stripe_transfer_id       | TEXT                     |                                                            | Stripe transfer ID          |
| stripe_payout_id         | TEXT                     |                                                            | Stripe payout ID            |
| amount                   | INTEGER                  | NOT NULL                                                   | Amount in cents             |
| platform_fee             | INTEGER                  | DEFAULT 0                                                  | Platform fee in cents       |
| net_amount               | INTEGER                  | NOT NULL                                                   | Net amount after fees       |
| status                   | TEXT                     | NOT NULL, DEFAULT 'received'                               | Transfer status             |
| received_at              | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                    | Receipt timestamp           |
| transferred_at           | TIMESTAMP WITH TIME ZONE |                                                            | Transfer timestamp          |
| payout_initiated_at      | TIMESTAMP WITH TIME ZONE |                                                            | Payout initiation timestamp |
| payout_completed_at      | TIMESTAMP WITH TIME ZONE |                                                            | Payout completion timestamp |
| failure_reason           | TEXT                     |                                                            | Failure explanation         |
| created_at               | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                    | Creation timestamp          |
| updated_at               | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                    | Last update timestamp       |

**Relationships:**

- **Many-to-one** with hoas (hoa_id) - Each transfer belongs to one HOA
- **Many-to-one** with payments (payment_id) - Each transfer is for one payment
- **Many-to-one** with payment_requests (payment_request_id) - Each transfer is for one request

---

## Community Features

### community_spaces

Amenities and reservable spaces in the HOA.

| Column         | Type                     | Constraints                                             | Description             |
| -------------- | ------------------------ | ------------------------------------------------------- | ----------------------- |
| id             | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()              | Unique space identifier |
| hoa_id         | UUID                     | **FOREIGN KEY** → hoas(id), NOT NULL, CASCADE on delete | Associated HOA          |
| name           | TEXT                     | NOT NULL                                                | Space name              |
| description    | TEXT                     |                                                         | Space description       |
| location_notes | TEXT                     |                                                         | Location details        |
| capacity       | INTEGER                  |                                                         | Maximum capacity        |
| pricing_info   | TEXT                     |                                                         | Pricing information     |
| is_active      | BOOLEAN                  | NOT NULL, DEFAULT true                                  | Space active status     |
| created_at     | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                 | Creation timestamp      |
| updated_at     | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                 | Last update timestamp   |

**Relationships:**

- **Many-to-one** with hoas (hoa_id) - Each space belongs to one HOA
- **One-to-many** with space_availability_rules (space_id) - Each space has availability rules
- **One-to-many** with space_blackout_dates (space_id) - Each space has blackout dates
- **One-to-many** with space_reservations (space_id) - Each space has reservations

### space_availability_rules

Availability schedules for community spaces.

| Column      | Type                     | Constraints                                                         | Description                |
| ----------- | ------------------------ | ------------------------------------------------------------------- | -------------------------- |
| id          | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                          | Unique rule identifier     |
| space_id    | UUID                     | **FOREIGN KEY** → community_spaces(id), NOT NULL, CASCADE on delete | Associated space           |
| day_of_week | INTEGER                  | NOT NULL, CHECK (0-6)                                               | Day (0=Sunday, 6=Saturday) |
| start_time  | TIME                     | NOT NULL                                                            | Start time                 |
| end_time    | TIME                     | NOT NULL                                                            | End time                   |
| created_at  | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                             | Creation timestamp         |

**Relationships:**

- **Many-to-one** with community_spaces (space_id) - Each rule belongs to one space

### space_blackout_dates

Dates when spaces are unavailable.

| Column        | Type                     | Constraints                                                         | Description                |
| ------------- | ------------------------ | ------------------------------------------------------------------- | -------------------------- |
| id            | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                          | Unique blackout identifier |
| space_id      | UUID                     | **FOREIGN KEY** → community_spaces(id), NOT NULL, CASCADE on delete | Associated space           |
| blackout_date | DATE                     | NOT NULL                                                            | Unavailable date           |
| reason        | TEXT                     |                                                                     | Reason for blackout        |
| created_at    | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                             | Creation timestamp         |

**Relationships:**

- **Many-to-one** with community_spaces (space_id) - Each blackout belongs to one space

### space_reservations

Reservations for community spaces.

| Column           | Type                     | Constraints                                                         | Description                                   |
| ---------------- | ------------------------ | ------------------------------------------------------------------- | --------------------------------------------- |
| id               | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                          | Unique reservation identifier                 |
| space_id         | UUID                     | **FOREIGN KEY** → community_spaces(id), NOT NULL, CASCADE on delete | Reserved space                                |
| resident_id      | UUID                     | **FOREIGN KEY** → profiles(id), NOT NULL, CASCADE on delete         | Resident making reservation                   |
| reservation_date | DATE                     | NOT NULL                                                            | Reservation date                              |
| start_time       | TIME                     | NOT NULL                                                            | Start time                                    |
| end_time         | TIME                     | NOT NULL                                                            | End time                                      |
| purpose          | TEXT                     |                                                                     | Reservation purpose                           |
| status           | TEXT                     | NOT NULL, DEFAULT 'pending'                                         | Status (pending, approved, denied, cancelled) |
| reviewed_by      | UUID                     | **FOREIGN KEY** → profiles(id)                                      | Admin who reviewed                            |
| reviewed_at      | TIMESTAMP WITH TIME ZONE |                                                                     | Review timestamp                              |
| admin_notes      | TEXT                     |                                                                     | Admin notes                                   |
| created_at       | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                             | Creation timestamp                            |
| updated_at       | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                             | Last update timestamp                         |

**Relationships:**

- **Many-to-one** with community_spaces (space_id) - Each reservation is for one space
- **Many-to-one** with profiles (resident_id, reviewed_by) - Each reservation has one resident and optional reviewer

---

## Maintenance & Support

### maintenance_requests

Maintenance work order requests.

| Column      | Type                     | Constraints                                                 | Description                                                                           |
| ----------- | ------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| id          | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                  | Unique request identifier                                                             |
| hoa_id      | UUID                     | **FOREIGN KEY** → hoas(id), NOT NULL, CASCADE on delete     | Associated HOA                                                                        |
| resident_id | UUID                     | **FOREIGN KEY** → profiles(id), NOT NULL, CASCADE on delete | Requesting resident                                                                   |
| title       | TEXT                     | NOT NULL                                                    | Request title                                                                         |
| description | TEXT                     | NOT NULL                                                    | Request description                                                                   |
| category    | TEXT                     | NOT NULL                                                    | Category (repair, key_request, common_area, landscaping, pool, parking, noise, other) |
| urgency     | TEXT                     | NOT NULL, DEFAULT 'normal'                                  | Urgency level (low, normal, high, emergency)                                          |
| status      | TEXT                     | NOT NULL, DEFAULT 'open'                                    | Status (open, in_progress, resolved, closed)                                          |
| assigned_to | UUID                     | **FOREIGN KEY** → profiles(id)                              | Assigned staff member                                                                 |
| location    | TEXT                     |                                                             | Location description                                                                  |
| created_at  | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                     | Creation timestamp                                                                    |
| updated_at  | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                     | Last update timestamp                                                                 |
| resolved_at | TIMESTAMP WITH TIME ZONE |                                                             | Resolution timestamp                                                                  |
| closed_at   | TIMESTAMP WITH TIME ZONE |                                                             | Closure timestamp                                                                     |

**Relationships:**

- **Many-to-one** with hoas (hoa_id) - Each request belongs to one HOA
- **Many-to-one** with profiles (resident_id, assigned_to) - Each request has one resident and optional assignee
- **One-to-many** with maintenance_request_updates (request_id) - Each request has multiple updates

### maintenance_request_updates

Comments and status updates on maintenance requests.

| Column      | Type                     | Constraints                                                             | Description              |
| ----------- | ------------------------ | ----------------------------------------------------------------------- | ------------------------ |
| id          | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                              | Unique update identifier |
| request_id  | UUID                     | **FOREIGN KEY** → maintenance_requests(id), NOT NULL, CASCADE on delete | Associated request       |
| author_id   | UUID                     | **FOREIGN KEY** → profiles(id), NOT NULL                                | Update author            |
| message     | TEXT                     | NOT NULL                                                                | Update message           |
| is_internal | BOOLEAN                  | NOT NULL, DEFAULT false                                                 | Internal note flag       |
| old_status  | TEXT                     |                                                                         | Previous status          |
| new_status  | TEXT                     |                                                                         | New status               |
| created_at  | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                                 | Creation timestamp       |

**Relationships:**

- **Many-to-one** with maintenance_requests (request_id) - Each update belongs to one request
- **Many-to-one** with profiles (author_id) - Each update has one author

---

## Violations & Enforcement

### violation_categories

Categories/types of violations.

| Column              | Type                     | Constraints                                             | Description                |
| ------------------- | ------------------------ | ------------------------------------------------------- | -------------------------- |
| id                  | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()              | Unique category identifier |
| hoa_id              | UUID                     | **FOREIGN KEY** → hoas(id), NOT NULL, CASCADE on delete | Associated HOA             |
| name                | TEXT                     | NOT NULL                                                | Category name              |
| description         | TEXT                     |                                                         | Category description       |
| default_fine_amount | INTEGER                  | DEFAULT 0                                               | Default fine in cents      |
| created_at          | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                 | Creation timestamp         |

**Relationships:**

- **Many-to-one** with hoas (hoa_id) - Each category belongs to one HOA
- **Unique constraint** on (hoa_id, name) - Category names unique per HOA
- **One-to-many** with violations (category_id) - Each category has multiple violations

### violations

Violation records and notices.

| Column              | Type                     | Constraints                                                    | Description                                                    |
| ------------------- | ------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------- |
| id                  | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                     | Unique violation identifier                                    |
| hoa_id              | UUID                     | **FOREIGN KEY** → hoas(id), NOT NULL, CASCADE on delete        | Associated HOA                                                 |
| resident_id         | UUID                     | **FOREIGN KEY** → profiles(id), NOT NULL, CASCADE on delete    | Violating resident                                             |
| category_id         | UUID                     | **FOREIGN KEY** → violation_categories(id), SET NULL on delete | Violation category                                             |
| title               | TEXT                     | NOT NULL                                                       | Violation title                                                |
| description         | TEXT                     | NOT NULL                                                       | Violation description                                          |
| location            | TEXT                     |                                                                | Violation location                                             |
| observed_at         | TIMESTAMP WITH TIME ZONE | NOT NULL                                                       | Observation timestamp                                          |
| notice_content      | TEXT                     |                                                                | Generated notice content                                       |
| ai_generated        | BOOLEAN                  | DEFAULT false                                                  | AI-generated flag                                              |
| ai_disclaimer_shown | BOOLEAN                  | DEFAULT false                                                  | Disclaimer shown flag                                          |
| fine_amount         | INTEGER                  | DEFAULT 0                                                      | Fine amount in cents                                           |
| fine_due_date       | DATE                     |                                                                | Fine due date                                                  |
| status              | TEXT                     | NOT NULL, DEFAULT 'draft'                                      | Status (draft, sent, acknowledged, disputed, resolved, waived) |
| created_by          | UUID                     | **FOREIGN KEY** → auth.users(id), NOT NULL                     | Creator                                                        |
| created_at          | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                        | Creation timestamp                                             |
| updated_at          | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                        | Last update timestamp                                          |
| sent_at             | TIMESTAMP WITH TIME ZONE |                                                                | Send timestamp                                                 |
| acknowledged_at     | TIMESTAMP WITH TIME ZONE |                                                                | Acknowledgment timestamp                                       |
| resolved_at         | TIMESTAMP WITH TIME ZONE |                                                                | Resolution timestamp                                           |
| resolution_notes    | TEXT                     |                                                                | Resolution notes                                               |
| resolved_by         | UUID                     | **FOREIGN KEY** → auth.users(id)                               | Resolver                                                       |

**Relationships:**

- **Many-to-one** with hoas (hoa_id) - Each violation belongs to one HOA
- **Many-to-one** with profiles (resident_id) - Each violation involves one resident
- **Many-to-one** with violation_categories (category_id) - Each violation has one category
- **Many-to-one** with auth.users (created_by, resolved_by) - Each violation has creator and optional resolver
- **One-to-many** with violation_evidence (violation_id) - Each violation has multiple evidence files
- **One-to-many** with violation_responses (violation_id) - Each violation has multiple responses

### violation_evidence

Supporting files/evidence for violations.

| Column       | Type                     | Constraints                                                   | Description                |
| ------------ | ------------------------ | ------------------------------------------------------------- | -------------------------- |
| id           | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                    | Unique evidence identifier |
| violation_id | UUID                     | **FOREIGN KEY** → violations(id), NOT NULL, CASCADE on delete | Associated violation       |
| file_url     | TEXT                     | NOT NULL                                                      | File URL                   |
| file_type    | TEXT                     |                                                               | MIME type                  |
| file_size    | INTEGER                  |                                                               | File size                  |
| description  | TEXT                     |                                                               | Evidence description       |
| uploaded_by  | UUID                     | **FOREIGN KEY** → auth.users(id), NOT NULL                    | Uploader                   |
| uploaded_at  | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                       | Upload timestamp           |

**Relationships:**

- **Many-to-one** with violations (violation_id) - Each evidence belongs to one violation
- **Many-to-one** with auth.users (uploaded_by) - Each evidence has one uploader

### violation_responses

Resident responses to violation notices.

| Column        | Type                     | Constraints                                                   | Description                                    |
| ------------- | ------------------------ | ------------------------------------------------------------- | ---------------------------------------------- |
| id            | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                    | Unique response identifier                     |
| violation_id  | UUID                     | **FOREIGN KEY** → violations(id), NOT NULL, CASCADE on delete | Associated violation                           |
| resident_id   | UUID                     | **FOREIGN KEY** → auth.users(id), NOT NULL                    | Responding resident                            |
| response_type | TEXT                     | NOT NULL                                                      | Type (acknowledge, dispute, request_extension) |
| message       | TEXT                     |                                                               | Response message                               |
| created_at    | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                       | Creation timestamp                             |

**Relationships:**

- **Many-to-one** with violations (violation_id) - Each response belongs to one violation
- **Many-to-one** with auth.users (resident_id) - Each response is from one resident

---

## Administrative

### join_requests

Membership application requests.

| Column       | Type                     | Constraints                                                   | Description                          |
| ------------ | ------------------------ | ------------------------------------------------------------- | ------------------------------------ |
| id           | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()                    | Unique request identifier            |
| hoa_id       | UUID                     | **FOREIGN KEY** → hoas(id), NOT NULL, CASCADE on delete       | Target HOA                           |
| user_id      | UUID                     | **FOREIGN KEY** → auth.users(id), NOT NULL, CASCADE on delete | Applicant                            |
| house_number | TEXT                     | NOT NULL                                                      | Property house number                |
| street_name  | TEXT                     | NOT NULL                                                      | Property street name                 |
| city         | TEXT                     | NOT NULL                                                      | Property city                        |
| state        | TEXT                     | NOT NULL                                                      | Property state                       |
| zip_code     | TEXT                     | NOT NULL                                                      | Property ZIP code                    |
| status       | TEXT                     | NOT NULL, DEFAULT 'pending'                                   | Status (pending, approved, rejected) |
| reviewed_by  | UUID                     | **FOREIGN KEY** → auth.users(id)                              | Reviewer                             |
| reviewed_at  | TIMESTAMP WITH TIME ZONE |                                                               | Review timestamp                     |
| created_at   | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                       | Creation timestamp                   |
| updated_at   | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                       | Last update timestamp                |

**Relationships:**

- **Many-to-one** with hoas (hoa_id) - Each request targets one HOA
- **Many-to-one** with auth.users (user_id, reviewed_by) - Each request has one applicant and optional reviewer
- **Unique constraint** on (user_id, hoa_id) - Users can only have one pending request per HOA

### resident_invites

Invitation tokens for new residents.

| Column       | Type                     | Constraints                                             | Description              |
| ------------ | ------------------------ | ------------------------------------------------------- | ------------------------ |
| id           | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()              | Unique invite identifier |
| hoa_id       | UUID                     | **FOREIGN KEY** → hoas(id), NOT NULL, CASCADE on delete | Associated HOA           |
| email        | TEXT                     |                                                         | Invitee email            |
| house_number | TEXT                     | NOT NULL                                                | Property house number    |
| street_name  | TEXT                     | NOT NULL                                                | Property street name     |
| city         | TEXT                     | NOT NULL                                                | Property city            |
| state        | TEXT                     | NOT NULL                                                | Property state           |
| zip_code     | TEXT                     | NOT NULL                                                | Property ZIP code        |
| invite_token | UUID                     | **UNIQUE**, DEFAULT gen_random_uuid()                   | Secure invitation token  |
| created_by   | UUID                     | **FOREIGN KEY** → auth.users(id)                        | Creator                  |
| used_by      | UUID                     | **FOREIGN KEY** → auth.users(id)                        | User who accepted        |
| used_at      | TIMESTAMP WITH TIME ZONE |                                                         | Acceptance timestamp     |
| expires_at   | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT (now() + 30 days)                     | Expiration date          |
| created_at   | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                 | Creation timestamp       |

**Relationships:**

- **Many-to-one** with hoas (hoa_id) - Each invite belongs to one HOA
- **Many-to-one** with auth.users (created_by, used_by) - Each invite has creator and optional accepter

### audit_logs

Audit trail for super admin actions.

| Column      | Type                     | Constraints                                | Description                              |
| ----------- | ------------------------ | ------------------------------------------ | ---------------------------------------- |
| id          | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid() | Unique log entry identifier              |
| actor_id    | UUID                     | NOT NULL                                   | Action performer (references auth.users) |
| actor_name  | TEXT                     |                                            | Actor's full name                        |
| actor_email | TEXT                     |                                            | Actor's email address                    |
| action      | TEXT                     | NOT NULL                                   | Action performed                         |
| entity_type | TEXT                     | NOT NULL                                   | Entity type affected                     |
| entity_id   | UUID                     |                                            | Entity ID affected                       |
| details     | JSONB                    |                                            | Additional details                       |
| ip_address  | TEXT                     |                                            | IP address                               |
| created_at  | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                    | Creation timestamp                       |

**Relationships:**

- **Many-to-one** with auth.users (actor_id) - Each log entry has one actor

### platform_settings

Global platform configuration settings.

| Column      | Type                     | Constraints                                | Description               |
| ----------- | ------------------------ | ------------------------------------------ | ------------------------- |
| id          | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid() | Unique setting identifier |
| key         | TEXT                     | **UNIQUE**, NOT NULL                       | Setting key               |
| value       | JSONB                    | NOT NULL                                   | Setting value             |
| description | TEXT                     |                                            | Setting description       |
| updated_at  | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                    | Last update timestamp     |
| updated_by  | UUID                     | **FOREIGN KEY** → auth.users(id)           | Last updater              |

**Relationships:**

- **Many-to-one** with auth.users (updated_by) - Each setting has one last updater

### ai_document_requests

Audit trail for AI-generated documents.

| Column            | Type                     | Constraints                                             | Description                                                                       |
| ----------------- | ------------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| id                | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid()              | Unique request identifier                                                         |
| hoa_id            | UUID                     | **FOREIGN KEY** → hoas(id), NOT NULL, CASCADE on delete | Associated HOA                                                                    |
| request_type      | TEXT                     | NOT NULL                                                | Type (violation_notice, meeting_minutes, bylaws_recommendation, inquiry_response) |
| input_context     | JSONB                    | NOT NULL                                                | Input data for AI                                                                 |
| generated_content | TEXT                     |                                                         | AI-generated content                                                              |
| created_by        | UUID                     | **FOREIGN KEY** → auth.users(id), NOT NULL              | Request creator                                                                   |
| created_at        | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                                 | Creation timestamp                                                                |

**Relationships:**

- **Many-to-one** with hoas (hoa_id) - Each request belongs to one HOA
- **Many-to-one** with auth.users (created_by) - Each request has one creator

### verification_attempts

Rate limiting for verification attempts.

| Column            | Type                     | Constraints                                | Description                  |
| ----------------- | ------------------------ | ------------------------------------------ | ---------------------------- |
| id                | UUID                     | **PRIMARY KEY**, DEFAULT gen_random_uuid() | Unique attempt identifier    |
| user_id           | UUID                     | NOT NULL                                   | User attempting verification |
| verification_type | TEXT                     | NOT NULL                                   | Type of verification         |
| failed_attempts   | INTEGER                  | DEFAULT 0                                  | Number of failed attempts    |
| locked_until      | TIMESTAMP WITH TIME ZONE |                                            | Lockout expiration           |
| last_attempt      | TIMESTAMP WITH TIME ZONE | DEFAULT now()                              | Last attempt timestamp       |
| created_at        | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT now()                    | Creation timestamp           |

**Relationships:**

- **Many-to-one** with auth.users (user_id) - Each attempt belongs to one user
- **Unique constraint** on (user_id, verification_type) - One record per user per verification type

---

## Views

### directory_profiles

Secure view of resident profiles for directory display (excludes sensitive contact information).

| Column       | Type | Description         |
| ------------ | ---- | ------------------- |
| id           | UUID | Profile ID          |
| user_id      | UUID | Auth user ID        |
| hoa_id       | UUID | Associated HOA      |
| name         | TEXT | Full name           |
| unit_number  | TEXT | Unit number         |
| house_number | TEXT | House number        |
| street_name  | TEXT | Street name         |
| avatar_url   | TEXT | Profile picture URL |
| status       | TEXT | Account status      |

**Source:** SELECT from profiles table with security_invoker=true

### hoa_fund_summary

Aggregated view of fund transfer status by HOA.

| Column              | Type    | Description                   |
| ------------------- | ------- | ----------------------------- |
| hoa_id              | UUID    | HOA identifier                |
| pending_count       | BIGINT  | Count of pending transfers    |
| pending_amount      | NUMERIC | Total pending amount          |
| in_transit_count    | BIGINT  | Count of transfers in transit |
| in_transit_amount   | NUMERIC | Total amount in transit       |
| completed_count     | BIGINT  | Count of completed transfers  |
| completed_amount    | NUMERIC | Total completed amount        |
| total_platform_fees | NUMERIC | Total platform fees collected |

**Source:** Aggregated from hoa_fund_transfers table

---

## Key Relationships Summary

- **HOA Structure**: hoas → profiles → user_roles
- **Financial Flow**: hoas → payment_schedules → payment_requests → payments → hoa_fund_transfers
- **Communication**: hoas → announcements → announcement_polls → announcement_votes
- **Community**: hoas → community_spaces → space_reservations
- **Maintenance**: hoas → maintenance_requests → maintenance_request_updates
- **Violations**: hoas → violation_categories → violations → violation_responses
- **Membership**: join_requests, resident_invites → profiles
- **Security**: audit_logs, platform_settings, verification_attempts

All tables use UUID primary keys and include created_at/updated_at timestamps. Foreign key relationships enforce referential integrity with appropriate CASCADE/SET NULL behaviors. Row Level Security (RLS) policies control access based on user roles and HOA membership.

---

## Row Level Security (RLS) Policies

All tables have Row Level Security enabled with policies that control access based on user roles and HOA membership. The policies follow a consistent pattern:

### Core Access Patterns

- **Residents**: Can view/modify their own data and data related to their HOA
- **Admins**: Can manage data within their assigned HOA, plus additional cross-HOA access for super admins
- **Super Admins**: Have unrestricted access across all HOAs for administrative functions

### Policy Types

#### SELECT Policies (Read Access)

- Users can view records associated with their HOA
- Residents can view their own records and public HOA data
- Admins can view all records in their HOA
- Super admins can view all records across all HOAs

#### INSERT Policies (Create Access)

- Residents can create records associated with themselves and their HOA
- Admins can create records in their HOA or selected HOAs (super admin feature)
- Super admins can create records in any HOA

#### UPDATE Policies (Modify Access)

- Residents can modify their own records
- Admins can modify records in their HOA or selected HOAs
- Super admins can modify records in any HOA

#### DELETE Policies (Remove Access)

- Generally restricted to admins and super admins
- Some tables allow residents to delete their own draft/incomplete records

### Space Management Tables (Updated 2026-01-21)

The following tables have enhanced policies to support super admin HOA switching:

#### community_spaces

```
SELECT: Users in HOA can view spaces
INSERT/UPDATE/DELETE: Admins in HOA OR super admins OR admins with access to selected HOA
```

#### space_availability_rules, space_blackout_dates, space_reservations

```
SELECT: Users in HOA can view rules/dates/reservations
INSERT/UPDATE/DELETE: Admins with space access OR super admins OR admins with selected HOA access
```

### Key Policy Features

- **HOA Membership Check**: Uses `get_user_hoa_id(auth.uid())` to determine user's primary HOA
- **Super Admin Bypass**: `is_super_admin(auth.uid())` allows unrestricted access
- **Admin Role Check**: `has_role(auth.uid(), 'admin'::app_role)` verifies admin status
- **Cross-HOA Admin Access**: Complex subqueries allow admins to work across HOAs when appropriate
- **Secure Fallbacks**: Policies use EXISTS clauses and proper joins to prevent data leakage

### Policy Examples

**Basic HOA-restricted access:**

```sql
USING (hoa_id = public.get_user_hoa_id(auth.uid()))
```

**Admin-only access with super admin override:**

```sql
USING (
  hoa_id = public.get_user_hoa_id(auth.uid())
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_super_admin(auth.uid())
)
```

**Cross-HOA admin access (for space management):**

```sql
USING (
  (cs.hoa_id = public.get_user_hoa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role))
  OR public.is_super_admin(auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
      AND p.hoa_id = cs.hoa_id
    )
  )
)
```
