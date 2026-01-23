# Supabase Functions Documentation

## Overview

GateKpr is a comprehensive HOA (Homeowners Association) management platform built with Supabase Edge Functions. The system consists of 22 serverless functions that handle authentication, payments, communications, AI-powered document generation, and administrative tasks.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │────│   Supabase      │────│   External      │
│   (React)       │    │   Functions     │    │   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Database      │    │   Stripe        │
                       │   (PostgreSQL)  │    │   Connect       │
                       └─────────────────┘    └─────────────────┘
                                                │
                                                ▼
                                       ┌─────────────────┐
                                       │   Lovable AI    │
                                       │   Gateway       │
                                       └─────────────────┘
```

## Core Components

### 1. Authentication & User Management

Functions handling user registration, verification, and access control.

### 2. Payment & Billing System

Comprehensive Stripe integration for subscriptions and resident payments.

### 3. Communication Services

Email and SMS notifications for various system events.

### 4. AI & Document Services

AI-powered document generation for HOA management.

### 5. Administrative & Utility

Functions for system administration and testing.

## Function Reference

### Authentication & User Management

#### `complete-invite`

**Purpose**: Validates and marks resident invites as used
**Triggers**: Called when residents accept email invitations
**Database**: Updates `resident_invites` table
**Security**: Service role access (no user auth required)

#### `validate-invite`

**Purpose**: Validates invite tokens before allowing signup
**Triggers**: During resident signup process
**Database**: Reads `resident_invites` table
**Security**: Service role access

#### `verify-code`

**Purpose**: Verifies phone/email verification codes
**Triggers**: After sending verification codes
**Database**: Updates user verification status
**Security**: User authentication required

#### `send-verification-code`

**Purpose**: Sends SMS verification codes
**Triggers**: User requests phone verification
**External**: Twilio SMS service
**Security**: User authentication required

#### `create-super-admin`

**Purpose**: Creates super administrator accounts
**Triggers**: System initialization or admin creation
**Database**: Updates `user_roles` table
**Security**: Service role access

### Payment & Billing System

#### `create-subscription`

**Purpose**: Creates Stripe subscriptions for HOA plans
**Triggers**: HOA signs up for paid plans
**External**: Stripe Checkout API
**Database**: Updates `hoas` table with `stripe_customer_id`
**Security**: User authentication + admin role check

#### `create-resident-payment`

**Purpose**: Creates Stripe checkout sessions for HOA dues
**Triggers**: Residents initiate payments
**External**: Stripe Checkout API
**Database**: Reads `payment_requests` and `payment_schedules`
**Security**: User authentication + ownership validation

#### `verify-resident-payment`

**Purpose**: Verifies completed Stripe payments and records them
**Triggers**: After Stripe checkout completion
**External**: Stripe API for session verification
**Database**: Inserts into `payments`, updates `payment_requests`
**Security**: User authentication + ownership validation

#### `stripe-webhook`

**Purpose**: Central webhook handler for all Stripe events
**Triggers**: Stripe sends webhook events
**External**: Stripe Webhooks API
**Database**: Updates multiple tables based on event type:

- `hoa_subscriptions` (subscription events)
- `hoas` (Connect account updates)
- `hoa_fund_transfers` (payment events)
  **Security**: Webhook signature verification

#### `transfer-funds`

**Purpose**: Transfers collected funds to HOA bank accounts
**Triggers**: Super admin initiates fund transfers
**External**: Stripe Transfers API
**Database**: Updates `hoa_fund_transfers` status
**Security**: Super admin authentication required

#### `create-connect-account`

**Purpose**: Sets up Stripe Connect accounts for HOAs
**Triggers**: HOA enables payment collection
**External**: Stripe Connect API
**Database**: Updates `hoas` with Connect account details
**Security**: User authentication + admin role check

#### `get-connect-status`

**Purpose**: Checks Stripe Connect account status
**Triggers**: Admin dashboard loads
**External**: Stripe API
**Database**: Reads `hoas` table
**Security**: User authentication + admin role check

### Communication Services

#### `send-email`

**Purpose**: Comprehensive email service for all notifications
**Triggers**: Called by various functions for different email types
**External**: Resend email service
**Database**: Logs to `notification_logs` table
**Email Types**:

- `invite`: Resident invitations
- `announcement`: Community announcements
- `document`: New document notifications
- `payment_reminder`: Overdue payment alerts
- `join_request_approved/denied`: Join request responses
- `payment_success/due`: Payment confirmations
- `maintenance_request_submitted/updated`: Maintenance updates
- `reservation_submitted/approved/denied`: Reservation updates
- `fund_transfer_complete/failed`: Transfer notifications

#### `send-email-digest`

**Purpose**: Sends periodic email digests
**Triggers**: Scheduled execution
**External**: Resend email service
**Database**: Reads various tables for digest content
**Security**: Service role access

#### `send-payment-reminders`

**Purpose**: Automated overdue payment notifications
**Triggers**: Scheduled execution for overdue payments
**External**: Resend email service
**Database**: Reads `payment_requests`, sends to residents and admins
**Security**: Service role access

#### `send-sms`

**Purpose**: SMS notification service
**Triggers**: Various system events requiring SMS
**External**: SMS service provider
**Database**: Logs to `notification_logs`
**Security**: Service role access

### AI & Document Services

#### `ai-document-generator`

**Purpose**: Generates HOA documents using AI
**Triggers**: Admin requests document generation
**External**: Lovable AI Gateway (Google Gemini)
**Database**: Logs to `ai_document_requests` table
**Document Types**:

- `violation_notice`: Formal violation letters
- `meeting_minutes`: Meeting minute formatting
- `bylaws_recommendation`: Bylaw improvement suggestions
- `inquiry_response`: Professional response drafting
  **Security**: Admin authentication required

### Administrative & Utility

#### `create-test-accounts`

**Purpose**: Creates test accounts for development
**Triggers**: Development/testing setup
**Database**: Creates test users and data
**Security**: Service role access

#### `seed-test-data`

**Purpose**: Seeds database with test data
**Triggers**: Development environment setup
**Database**: Inserts test records across multiple tables
**Security**: Service role access

#### `manage-subscription`

**Purpose**: Manages existing subscriptions
**Triggers**: Admin subscription management
**External**: Stripe API
**Database**: Updates `hoa_subscriptions`
**Security**: Admin authentication required

#### `submit-support-ticket`

**Purpose**: Submits support tickets
**Triggers**: Users submit support requests
**External**: Support ticket system
**Database**: Creates support tickets
**Security**: User authentication required

#### `process-scheduled-transfers`

**Purpose**: Automated processing of scheduled fund transfers
**Triggers**: Scheduled execution
**External**: Stripe API
**Database**: Updates `hoa_fund_transfers`
**Security**: Service role access

## Key Data Flows

### Resident Payment Flow

```
1. Resident clicks "Pay" → create-resident-payment
2. Function creates Stripe checkout session
3. Resident completes payment on Stripe
4. Stripe sends webhook → stripe-webhook
5. Webhook updates hoa_fund_transfers
6. Resident redirected → verify-resident-payment
7. Function records payment in database
8. Email confirmation sent via send-email
9. Super admin → transfer-funds (manual)
10. Funds transferred to HOA bank account
```

### Subscription Flow

```
1. HOA selects plan → create-subscription
2. Function creates Stripe subscription
3. Stripe processes payment
4. Webhook events → stripe-webhook
5. Subscription status updated in hoa_subscriptions
```

### Invitation Flow

```
1. Admin sends invite → send-email (type: "invite")
2. Resident clicks link → validate-invite
3. Resident completes signup
4. Resident clicks "Complete" → complete-invite
5. Invite marked as used in database
```

### Document Generation Flow

```
1. Admin requests document → ai-document-generator
2. Function calls Lovable AI Gateway
3. AI generates content
4. Response logged to ai_document_requests
5. Generated document returned to admin
```

## Database Relationships

### Core Tables

- `hoas`: HOA information, Stripe Connect details
- `profiles`: User profiles linked to HOAs
- `user_roles`: User permissions (admin, super_admin, resident)

### Payment Tables

- `hoa_subscriptions`: Subscription details
- `payment_schedules`: Recurring payment definitions
- `payment_requests`: Individual payment requests
- `payments`: Completed payment records
- `hoa_fund_transfers`: Fund transfer tracking

### Communication Tables

- `notification_logs`: Email/SMS delivery logs
- `resident_invites`: Invitation tracking

### AI Tables

- `ai_document_requests`: AI usage logging

## Security Model

### Authentication Levels

1. **User Authentication**: Standard JWT tokens
2. **Role-based Access**: Admin, super_admin checks
3. **Service Role**: Internal operations
4. **Webhook Verification**: Stripe signature validation

### Key Security Functions

- `has_role()`: Checks user roles
- `is_super_admin()`: Verifies super admin status
- `get_user_hoa_id()`: Ensures users only access their HOA data

## External Service Integrations

### Stripe

- **Checkout**: Payment processing
- **Connect**: Bank account connections
- **Webhooks**: Event handling
- **Transfers**: Fund movements

### Communication

- **Resend**: Email delivery
- **SMS Provider**: Text messaging
- **Lovable AI**: Document generation

## Monitoring & Logging

### Audit Trails

- Payment events logged via webhooks
- Email deliveries tracked in `notification_logs`
- AI usage monitored in `ai_document_requests`

### Error Handling

- Functions include comprehensive error logging
- Failed operations recorded with error messages
- Email failures don't break payment flows

## Deployment & Configuration

### Environment Variables

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `LOVABLE_API_KEY`

### Function Deployment

All functions are deployed as Supabase Edge Functions using Deno runtime.

## Future Considerations

### Scalability

- Webhook processing is asynchronous
- Email sending is batched where possible
- AI calls are rate-limited by external service

### Monitoring

- Consider adding more detailed metrics
- Implement alerting for failed payments/transfers
- Add performance monitoring for AI calls

This documentation provides a comprehensive overview of the GateKpr Supabase Functions architecture, showing how all components work together to create a robust HOA management platform.
