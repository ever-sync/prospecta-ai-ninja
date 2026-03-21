# Design Log

**Project:** prospecta-ai-ninja-main / envPRO
**Started:** 2026-03-20
**Method:** Whiteport Design Studio (WDS)

---

## Backlog

- [x] Implement outbound campaign webhook dispatch
- [x] Fix scheduler so unsupported channels do not get stuck in `sending`

---

## Current

| Task | Started | Agent |
|---|---|---|
| Campaign webhook to n8n | 2026-03-21 | Codex |

---

## Design Loop Status

| Scenario | Step | Page | Status | Updated |
|---|---|---|---|---|
| Campaign delivery | Analysis | Webhook sending | analyzed | 2026-03-20 |
| Campaign delivery | Fix | Webhook routing | built | 2026-03-20 |
| Campaign delivery | Evolution | WhatsApp readiness | built | 2026-03-20 |
| Campaign delivery | Evolution | WhatsApp official-only | built | 2026-03-21 |
| Navigation | Evolution | Documentation shortcut | built | 2026-03-21 |
| Documentation | Evolution | Webhook guide | built | 2026-03-21 |
| Campaign delivery | Evolution | Webhook n8n dispatch | built | 2026-03-21 |
| Platform | Analysis | End-to-end architecture | analyzed | 2026-03-21 |

---

## Progress

### 2026-03-20 - Analysis: campaign webhook flow audited
- Outbound campaign `webhook` is exposed in the schema and UI, but it does not have an execution path.
- `whatsapp-status-webhook` is the real webhook boundary; it handles inbound Meta callbacks and delivery reconciliation.
- The cron scheduler claims due campaigns before filtering channel, so scheduled `email` and `webhook` campaigns can be stranded in `sending`.

### 2026-03-20 - Bugfix: campaign routing hardened
- Added shared dispatch target helper for campaign channels.
- Blocked unsupported `webhook` campaigns in the UI and confirm flow.
- Routed scheduled `email` and `whatsapp` campaigns through their dedicated edge functions.
- Added regression coverage for the channel routing decision.

### 2026-03-20 - Evolution: official WhatsApp readiness diagnostics added
- Added a shared readiness helper for official WhatsApp configuration.
- `validate-meta-whatsapp` now returns readiness state, checks, issues, and summary.
- Settings now surfaces a structured checklist for access token, phone number ID, WABA ID, webhook, verify token, and app secret.
- Added regression tests for ready, partial, and blocked official WhatsApp states.

### 2026-03-20 - Adjustment: readiness issues made actionable
- Added recommended actions to each official WhatsApp readiness issue.
- Settings now shows a next-step hint for each blocking or warning condition.

### 2026-03-21 - Evolution: official WhatsApp path made exclusive
- Removed the non-official WhatsApp configuration path from Settings.
- `whatsapp-send-batch` now accepts only Meta Cloud API credentials and returns a blocked error when they are missing.
- The campaign scheduler cancels due campaigns when the official WhatsApp integration is not configured.
- Campaign sending now detects the blocked official WhatsApp state and stops before falling back to the manual path.

### 2026-03-21 - Enhancement: documentation shortcut added above sign out
- Added a `Documentação` entry in the sidebar footer above the sign-out button.
- Created a dedicated documentation page with operational shortcuts and reference files.

### 2026-03-21 - Evolution: webhook documentation expanded
- Added a dedicated webhook guide to the documentation page.
- Documented the inbound Meta callback flow, endpoints, required secrets, processed statuses, and common failure modes.
- Clarified that the campaign `webhook` channel is not an outbound dispatcher.

### 2026-03-21 - Evolution: campaign webhook now dispatches to n8n
- Added a shared webhook payload helper and enabled `webhook` as a dispatchable campaign channel.
- Created `send-campaign-webhooks` to POST each pending lead to the configured n8n URL with traceable headers and payload.
- Added campaign-level webhook settings in Integrations for the URL and optional shared secret.
- Updated campaign preview, scheduler routing, and documentation to reflect the n8n outbound flow.

### 2026-03-21 - Evolution: webhook usage guide expanded in Documentation
- Added an explicit "Como usar" section to the Documentation page for campaign webhooks.
- Included a step-by-step setup flow, n8n checklist, and payload example directly in the page.

### 2026-03-21 - Analysis: end-to-end platform architecture mapped
- Reviewed the full product surface across frontend, edge functions, migrations, configuration, and validation tooling.
- Documented the main flows for scanner, proposal generation, campaign dispatch, CRM consolidation, and billing.
- Identified the main engineering risks: broad public edge-function surface, oversized modules, weak static quality gates, and sparse automated coverage.

### 2026-03-21 - Planning: end-to-end remediation plan created
- Converted the architecture analysis into a phased execution plan with security, refactor, quality, performance, and CI workstreams.
- Prioritized baseline stabilization and auth hardening before large-scale refactors.
- Added explicit acceptance criteria and immediate backlog items for execution.
