# Client Email Implementation Plan

Date: 2026-03-21
Goal: allow each customer to send campaign emails with their own business email, safely and with operational clarity.

## Recommendation

Implement in two phases:

1. Phase 1: custom sender domain via Resend plus `reply_to`
2. Phase 2: optional direct provider integration via SMTP or OAuth

Reason:
- Phase 1 fits the current architecture and can be deployed with limited risk.
- Phase 2 is only justified if customers explicitly need mail to originate from their own mailbox infrastructure instead of a verified domain on the platform sender stack.

## Target Outcome

Each customer should be able to:
- configure a sender email like `comercial@cliente.com.br`
- validate whether that sender is operational
- send campaigns with that sender
- receive replies in their own inbox
- understand why sending is blocked if DNS or provider validation is incomplete

## Phase 1: Verified Domain + Reply-To

### Scope

Use the existing `send-campaign-emails` edge function and keep Resend as the delivery provider, but add domain verification workflow and a dedicated `reply_to` field.

### Data Model

Extend `profiles` with:
- `campaign_reply_to_email`
- `email_sender_status`
- `email_sender_provider`
- `email_sender_domain`
- `email_sender_last_checked_at`
- `email_sender_error`

Optional:
- `email_sender_verified_at`
- `email_sender_mode` with values like `resend_domain`, `smtp`, `google_oauth`, `microsoft_oauth`

### Settings UX

In `Configurações > Integrações > E-Mail`, expose:
- sender email
- sender name
- reply-to email
- delivery mode
- operational status badge
- validation result
- next action if blocked

Statuses:
- `Configurado`
- `Aguardando validação`
- `Domínio não verificado`
- `Bloqueado`

### Backend Changes

Update `send-campaign-emails` to:
- use `reply_to` when present
- reject sending when sender status is not operational
- return structured errors like:
  - `missing_sender_email`
  - `sender_domain_unverified`
  - `reply_to_invalid`

Recommended payload shape to Resend:
- `from`
- `reply_to`
- `to`
- `subject`
- `html`

### Validation Flow

Add a new edge function, for example:
- `validate-campaign-email-sender`

Responsibilities:
- parse sender email
- extract domain
- check whether the domain is verified in the configured sending provider
- persist operational status to `profiles`
- return a structured readiness response to the UI

### Operational Flow

1. Customer informs sender email
2. System extracts sender domain
3. System shows DNS records required for verification
4. Customer configures DNS
5. System validates domain status
6. Only then campaigns can be sent

### Acceptance Criteria

- A customer with verified domain can send email campaigns with `From: Nome <email@dominio>`
- A customer without verified domain cannot send and sees the exact reason
- Replies go to the configured `reply_to`
- UI status matches backend enforcement

## Phase 2: Direct Customer Mailbox Integration

### When to do it

Only if customers require messages to originate from:
- their Gmail account
- their Microsoft 365 mailbox
- their SMTP server

### Scope

Support one or more provider modes:
- SMTP
- Google OAuth
- Microsoft OAuth

### Additional Data Needed

For SMTP:
- host
- port
- username
- encrypted password
- TLS mode

For OAuth:
- provider account id
- access token
- refresh token
- token expiry
- scopes

### Extra Risks

- secret storage complexity
- token refresh lifecycle
- provider-specific quotas and spam controls
- multi-tenant support burden
- more support load

### Recommendation

Do not start here unless Phase 1 proves insufficient.

## Rollout Plan

### Step 1: Data and Contracts

- create migration for sender status and `reply_to`
- add TypeScript types
- add helper validators for sender email and reply-to

### Step 2: Settings

- extend the E-Mail integration modal
- add separate save for sender and reply-to
- add sender readiness card and validation action

### Step 3: Validation Function

- create `validate-campaign-email-sender`
- return readiness, checks, issues, and recommended action

### Step 4: Sending Enforcement

- update `send-campaign-emails`
- block sends when sender is not operational
- include `reply_to`
- return explicit error codes

### Step 5: Observability

- persist failure reasons in `campaign_message_attempts`
- surface sender-domain problems in campaign failure UI
- log provider response metadata

### Step 6: Regression Coverage

Add tests for:
- valid sender email
- invalid sender email
- unverified sender domain
- valid reply-to
- blocked send when sender is unverified
- successful send payload includes `reply_to`

## Proposed Order of Implementation

1. Add `reply_to` and sender status fields
2. Add validation endpoint and Settings status UI
3. Enforce sender readiness in `send-campaign-emails`
4. Improve failure telemetry for email campaigns
5. Only then consider SMTP or OAuth modes

## Immediate Deliverables

### Deliverable A

Custom sender with verified domain via Resend

Includes:
- sender email
- sender name
- reply-to
- readiness validation
- backend enforcement

### Deliverable B

Email failure diagnostics

Includes:
- proper failed attempts
- explicit provider errors
- visible campaign failure reasons

## Non-Goals for Phase 1

- Gmail OAuth
- Microsoft 365 OAuth
- direct SMTP relay
- inbox sync
- email open tracking overhaul

## Risks if Implemented Poorly

- customers think they are sending from their domain but are not
- replies go to the wrong inbox
- campaigns fail at runtime with no explanation
- platform billing and delivery support become noisy

## Final Recommendation

Build Phase 1 first.

That gives you a professional implementation with:
- customer-branded sender identity
- reply routing to the customer inbox
- backend-enforced readiness
- much lower complexity than full mailbox integration
