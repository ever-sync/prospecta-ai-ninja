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

### 2026-03-21 - Bugfix: Settings integrations isolated per card
- Reworked the Integrations screen so WhatsApp, E-Mail, Webhook, Domain, Firecrawl, and ElevenLabs no longer share the same save side effects.
- Added per-modal draft state reset on cancel/close so badges reflect persisted values instead of unsaved edits.
- Removed the company settings side effect that could persist `elevenlabs_voice_id` from outside the ElevenLabs modal.
- Added payload contract tests to guarantee each integration save only updates its own profile fields.
- Firecrawl now requires an explicit validation step before saving a replacement key.

### 2026-03-21 - Analysis: email campaign flow audited
- Mapped the email campaign path from preview and sender settings through `send-campaign-emails` and the scheduler.
- Identified a preview-vs-send mismatch for A/B variants, silent skips for leads without email, and incomplete failure telemetry.
- Documented missing server-side plan enforcement and sender-domain validation as operational risks.

### 2026-03-21 - Planning: client-owned campaign email implementation outlined
- Created a phased plan to support customer-branded campaign sending using verified sender domains and reply-to routing first.
- Scoped backend validation, Settings UX, persistence model, and sender readiness enforcement.
- Deferred SMTP and OAuth mailbox integration to a second phase due to higher operational complexity.

### 2026-03-21 - Implementation: customer-branded email sender readiness shipped
- Added sender-readiness persistence for campaign email with `reply-to`, Resend domain state, validation timestamps, and blocking errors.
- Created `validate-campaign-email-sender` to register or revalidate sender domains in Resend and surface DNS records back to Settings.
- Upgraded the E-Mail integration modal with isolated `reply-to`, readiness diagnostics, and an explicit `Validar remetente` workflow.
- Hardened `send-campaign-emails` and the campaign scheduler so blocked sender domains cancel scheduled runs instead of silently failing later.

### 2026-03-21 - Follow-up: email campaign preview and backend routing aligned
- Extracted the A/B variant picker to a shared helper so Campaigns preview and `send-campaign-emails` use the same targeting rule.
- Added a pre-send guard in Campaigns to redirect the user to Integracoes when the customer sender domain is still pending or blocked.
- Normalized the failure dialog to show readable operational reasons instead of raw backend codes.

### 2026-03-21 - Follow-up: campaign cards now surface email sender readiness
- Added email-sender status badges directly on campaign cards when a custom sender is configured.
- Blocked the primary `Enviar` CTA for email campaigns when the customer sender is pending DNS or blocked, replacing it with a direct path back to Integracoes.
- Kept the fallback default sender path available when no custom customer sender is configured.

### 2026-03-21 - Follow-up: scheduled campaigns now check channel prerequisites earlier
- Added campaign-card readiness badges for webhook and scheduled WhatsApp campaigns, not just email.
- Blocked scheduling of webhook, scheduled WhatsApp, and custom-sender email campaigns when their required integrations are still incomplete.
- Added direct configuration shortcuts from blocked campaign cards back to Integracoes to reduce operator error.

### 2026-03-21 - Follow-up: campaign blocking reasons now persist and surface in the UI
- Added `blocking_reason` and `last_blocked_at` to campaigns so scheduler-level cancellations are audit-friendly instead of silent.
- Extended the create/edit campaign modal with a channel-readiness panel that shows blockers before the user saves or schedules.
- Surfaced cancellation reasons directly on campaign cards so operators can distinguish config issues from runtime delivery failures.

### 2026-03-21 - Follow-up: campaign history now records manual and scheduled operational events
- Added `campaign_operation_events` as a campaign-level audit trail for blocks, cancellations, failures, manual resend actions, and completed dispatches.
- Logged scheduler cancellations and dispatch outcomes into that history so support can see why a scheduled campaign was blocked or retried.
- Added a `Historico` dialog on each campaign card and started recording manual preflight blocks and manual dispatch failures directly from the UI.

### 2026-03-21 - Follow-up: dispatchers now emit backend operation events directly
- Added a shared campaign-operation logger for edge functions so backend results no longer depend on frontend-only instrumentation.
- `send-campaign-emails` and `send-campaign-webhooks` now log blocked, failed, and completed dispatch summaries with sent/failed counts and provider context.
- Reduced duplicate history entries by keeping manual UI logs focused on preflight/manual actions while backend dispatchers record actual execution outcomes.

### 2026-03-21 - Follow-up: WhatsApp dispatcher and campaign cards now show the latest operational signal
- Extended `whatsapp-send-batch` with the same campaign-operation history used by email and webhook dispatchers, including blocked, failed, and completed summaries.
- Avoided duplicate success entries by letting backend API-mode WhatsApp dispatches own their operational result logs.
- Surfaced the latest operational event directly on each campaign card so operators can spot the current state without opening the full history dialog.

### 2026-03-21 - Follow-up: campaigns list now highlights attention states faster
- Added quick filters for `Todas`, `Acao necessaria`, and `Concluidas`, driven by the latest operational event on each campaign.
- Added a severity badge for the latest operational event directly in the campaign header to reduce scanning time.
- Added an empty state for filtered results so operators understand when the list is clean versus unconfigured.

### 2026-03-21 - Follow-up: campaign list now prioritizes action by urgency
- Added campaign sorting by operational priority and recency so blocked or recently failed items rise to the top automatically.
- Added a top-of-page panel for the most urgent campaigns, with direct shortcuts to configuration, history, or editing.
- Kept the existing filters but made them feed from the same priority model to avoid divergent operator views.

### 2026-03-21 - Follow-up: operational summary cards now expose queue health at a glance
- Added summary cards for `Acao necessaria`, `Bloqueadas`, `Falha recente`, and `Aguardando configuracao` above the campaign filters.
- Wired the cards to the same campaign-priority logic already used by filters and sorting, so counts stay consistent with the list below.
- Added direct navigation from the configuration summary card to `Integracoes`, turning the dashboard into a quicker triage surface.

### 2026-03-21 - Follow-up: campaign filters now persist and support channel/status slicing
- Added persistent list filters for operational view, channel, and status using local storage so operators keep context across reloads.
- Added channel and status selectors beside the operational filters, plus a one-click `Limpar filtros` reset.
- Kept filtering serverless and local, reusing the same dataset already loaded for the campaign list to avoid extra round trips.

### 2026-03-21 - Follow-up: campaign list now supports search and removable filter chips
- Added persistent free-text search by campaign name and description alongside the existing operational filters.
- Added removable chips for the active view, channel, status, and search filters so operators can clear context surgically instead of resetting everything.
- Kept the chips and search bound to the same local-storage state used by the filter selectors to avoid mismatch after reloads.

### 2026-03-21 - Follow-up: campaign list now supports persistent manual sorting
- Added a persisted `Ordenacao` selector so operators can switch from automatic priority to recency, oldest-first, lead volume, or conversion rate.
- Kept `Prioridade operacional` as the default sort while treating manual sort as part of the active filter context, including chip removal and reset.
- Reused the existing local campaign dataset for sorting so the new control does not add extra queries or backend load.

### 2026-03-21 - Follow-up: campaign operators can now save reusable views
- Added local `views` salvas for campaign triage so each operator can persist combinations of filter, search, and sorting without backend dependencies.
- Added apply/remove controls directly above the filters, keeping active views visually distinct and fast to reuse.
- Extracted saved-view normalization and deduplication into a shared helper with contract tests to keep the UI logic small and deterministic.

### 2026-03-21 - Follow-up: campaign list now ships with default operational views
- Added built-in operational presets such as `Acao imediata`, `Webhook recente`, `Email agendado`, and `Concluidas por conversao` so new operators do not need to create their own shortcuts first.
- Kept the default presets non-destructive and local, reusing the same filter snapshot contract already used by saved views.
- Extended the saved-view helper tests to validate that the shipped presets remain stable and valid over time.

### 2026-03-21 - Follow-up: saved campaign views can now be reordered
- Added left/right reordering controls directly on user-saved campaign views so operators can keep their most-used shortcuts first.
- Extracted the move logic to the shared saved-view helper and covered it with a contract test to keep the UI behavior deterministic.
- Kept the default system views fixed while allowing only the operator-owned views to be rearranged locally.

### 2026-03-21 - Follow-up: campaign views now expose live counts
- Added live counters to both default and user-saved campaign views so operators can see queue size before applying a shortcut.
- Reused the same filter-matching logic from the main campaign list to avoid count/list drift between the shortcut bar and the actual results.
- Kept the counting local over the already loaded campaign dataset, adding zero extra network round trips.

### 2026-03-21 - Follow-up: saved campaign views are now fully manageable
- Added rename support for operator-saved views while preserving the original saved filters and the chip order in the bar.
- Added a muted visual treatment for views with zero matching campaigns so empty shortcuts stop competing with active queues.
- Extended the saved-view helper tests to cover in-place updates by `id`, closing the contract for create, rename, reorder, and preset usage.
