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

### 2026-03-21 - Follow-up: route chunks and vendor splitting now remove the bundle warning
- Converted the main router to lazy-load pages and even the authenticated shell, so protected features stop inflating the first application chunk.
- Added manual vendor chunking in Vite for React, Supabase, Radix/UI, charts, motion, and XLSX, which removed the previous chunk-size warning from the production build.
- Moved XLSX loading in Admin to an on-demand import and extracted the campaign views card out of `Campaigns.tsx`, starting the modularization pass while keeping tests and build green.

### 2026-03-21 - Follow-up: campaign page summary and filter bars are now modularized
- Extracted the top summary cards and the campaign filter toolbar into dedicated campaign components to keep `Campaigns.tsx` focused on orchestration logic.
- Reduced `Campaigns.tsx` further while preserving the same filter state, counters, and quick triage behavior already implemented.
- Corrected an accidental typo in the campaign operation events migration during the refactor pass so the SQL artifact stays deployable.

### 2026-03-21 - Follow-up: campaign dialogs are now modularized too
- Extracted the remaining campaign dialogs into dedicated components so `Campaigns.tsx` keeps orchestration logic separate from modal rendering.
- Kept tests and build green while continuing the modularization pass.

### 2026-03-21 - Bugfix: vendor chunk cycle removed from Vite build
- Reproduced a runtime failure where `vendor-*.js` tried to access `forwardRef` from an uninitialized `react-vendor` chunk.
- Identified the root cause as a circular dependency created by the custom `manualChunks` split between `vendor` and `react-vendor`.
- Removed the dedicated React vendor bucket, rebuilt successfully, and added a regression test to block reintroduction of the `react-vendor` split.

### 2026-03-21 - Bugfix: Supabase vendor cycle removed from Vite build
- Reproduced a second runtime failure where `supabase-vendor-*.js` tried to read an uninitialized helper imported from `vendor-*.js`.
- Identified the root cause as another circular dependency created by the custom `manualChunks` split between `vendor` and `supabase-vendor`.
- Removed the dedicated Supabase vendor bucket, rebuilt successfully, and extended the regression test to block reintroduction of both `react-vendor` and `supabase-vendor`.

### 2026-03-21 - Evolution: mobile PWA shell added
- Added `vite-plugin-pwa` with auto-updating service worker, generated manifest, and installable mobile metadata.
- Generated branded install icons for Android and iOS and exposed `manifest.webmanifest`, `sw.js`, and `apple-touch-icon.png`.
- Added a mobile install prompt inside the app for Android install flow and iOS home-screen guidance.
- Verified the delivery with `npm test`, `npm run build`, and local preview serving both `manifest.webmanifest` and `sw.js`.
- Extracted the saved-view, campaign form, add-presentations, failures, and operation-history dialogs into dedicated components under `src/components/campaigns/`.
- Removed another large JSX block from `Campaigns.tsx`, keeping the page centered on state orchestration and dispatcher actions instead of dialog markup.
- Re-ran the full local verification after the extraction and kept `npm test` plus `npm run build` green with the split-chunk build still healthy.

### 2026-03-21 - Follow-up: urgent queue and campaign cards are now extracted
- Moved the urgent operational panel and the individual campaign card rendering out of `Campaigns.tsx` into dedicated components, isolating the heaviest remaining UI loops.
- Reduced `Campaigns.tsx` below the 2k-line mark while preserving the existing actions, readiness badges, and operational messaging on each campaign card.
- Verified the refactor again with `npm test` and `npm run build`, keeping the chunked build healthy and without reintroducing the old size warning.

### 2026-03-21 - Follow-up: simple settings dialogs are now modularized
- Extracted the simpler `Settings` modals for webhook, domain, Firecrawl, ElevenLabs, email change, and the Firecrawl guide into dedicated components under `src/components/settings/`.
- Kept the draft state and persistence logic inside `Settings.tsx`, while moving repetitive dialog markup out of the page so the file can be reduced incrementally without changing behavior.
- Re-ran `npm test` and `npm run build` after the extraction and kept the build stable with the chunk-splitting work still intact.

### 2026-03-21 - Follow-up: heavy WhatsApp and email settings flows are now extracted too
- Extracted the heavier `Settings` integration surfaces for the Meta WhatsApp dialog, the client email sender dialog, and the integrations grid into dedicated components under `src/components/settings/`.
- Moved the email sender badge/panel UI rules into `src/lib/settings/email-sender-ui.ts` so the page, cards, and dialog reuse the same readiness presentation contract.
- Reduced `Settings.tsx` again while preserving the page-owned draft state and handler logic, preparing the file for the next pass over the APIs section.

### 2026-03-21 - Follow-up: the Settings API keys section is now modularized
- Extracted the full `APIs` tab into `src/components/settings/SettingsApiKeysSection.tsx`, isolating provider selection, key creation, and provider list rendering from the page shell.
- Moved provider labels and API key masking into `src/lib/settings/api-keys-ui.ts`, so the same display contract can be reused across settings surfaces instead of staying embedded in `Settings.tsx`.
- Kept the persistence handlers and user-bound state inside `Settings.tsx`, but removed another large JSX block so the page is now closer to orchestration than rendering.

### 2026-03-21 - Follow-up: company and billing settings are now extracted too
- Moved the `Empresa` tab into `src/components/settings/SettingsCompanySection.tsx`, keeping logo upload, profile fields, and guarded access-email actions out of the page shell.
- Moved the `Faturamento` tab into `src/components/settings/SettingsBillingSection.tsx`, isolating monthly usage and plan upgrade rendering from the subscription handlers that still live in `Settings.tsx`.
- Reduced `Settings.tsx` again so the remaining page code is increasingly about state, handlers, and dialog orchestration instead of large tab bodies.

### 2026-03-21 - Follow-up: settings dialogs now render through a dedicated wrapper
- Added `src/components/settings/SettingsDialogs.tsx` to own the full dialog composition layer for WhatsApp, email sender, webhook, domain, Firecrawl, ElevenLabs, access-email change, and the Firecrawl guide.
- Replaced the long dialog block in `Settings.tsx` with a single wrapper call and removed the leftover generic `handleSaveIntegrations` path that was no longer part of the isolated-save model.
- Reduced `Settings.tsx` to 1119 lines while keeping `npm test` and `npm run build` green after the extraction.

### 2026-03-21 - Follow-up: settings API key state is now extracted into a hook
- Moved the API-key domain state, loading, save, delete, and provider-selection logic into `src/hooks/settings/useSettingsApiKeys.ts`, removing another IO-heavy cluster from `Settings.tsx`.
- Moved the Firecrawl onboarding steps into `src/lib/settings/firecrawl-guide.tsx`, so the settings page no longer owns that static JSX payload.
- Reduced `Settings.tsx` further to 897 lines and kept both `npm test` and `npm run build` green after the hook extraction.

### 2026-03-21 - Follow-up: profile-backed settings now live in a dedicated hook
- Added `src/hooks/settings/useSettingsProfile.ts` to own the profile-backed state, profile hydration, company save flow, access-email change flow, Firecrawl key lifecycle, and the full integrations orchestration that persists to `profiles`.
- Rewired `Settings.tsx` to consume `useSettingsProfile` plus `useSettingsApiKeys`, leaving the page focused on tabs, subscription state, and high-level composition instead of direct profile IO and draft orchestration.
- Reduced `Settings.tsx` to 315 lines and verified the refactor with `npm test` plus `npm run build` still green.

### 2026-03-21 - Follow-up: admin feedbacks now hydrate user data without a fragile join
- Reworked `src/components/admin/FeedbacksManager.tsx` to fetch `feedbacks` first and hydrate `profiles` in a second explicit query by `user_id`, instead of relying on a PostgREST relationship that is not defined in the generated Supabase types.
- This keeps the superadmin feedback panel stable and ensures each feedback row can show name, email, and company whenever the matching profile exists.

### 2026-03-21 - Follow-up: go-live hardening package applied locally
- Added a new billing access contract on top of Stripe status, including a shared helper in `supabase/functions/_shared/billing.js`, a new migration for `profiles.billing_access_*`, a stricter `check-subscription` response, and `stripe-webhook` updates to maintain grace and blocked states for inadimplencia.
- Updated the frontend to enforce billing access through `useSubscription`, `ProtectedRoute`, billing warnings in the app shell, and richer billing visibility in settings and admin.
- Hardened `supabase/config.toml` for critical authenticated functions, expanded the onboarding checklist toward real activation steps, strengthened the marketing landing offer, and added `README.md`, `.env.example`, and `docs/architecture/go-live-checklist.md` for repeatable production setup.
- Validation stayed green with `npm test` and `npm run build`, but remote `supabase db push` and `supabase functions deploy` were blocked by CLI auth (`403 Forbidden resource`) and missing `SUPABASE_DB_PASSWORD`.

### 2026-03-21 - Follow-up: go-live publication now has a single operational entrypoint
- Added `scripts/publish-go-live.ps1` to apply the latest migrations and deploy the critical Supabase functions in sequence, reducing the chance of partial production rollout.
- Exposed the same flow through `npm run deploy:go-live`, documented the required `SUPABASE_DB_PASSWORD`, and added the exact command block to the root `README.md` and `docs/architecture/go-live-checklist.md`.

### 2026-03-21 - Follow-up: billing enforcement now reaches the backend too
- Extended the shared auth helper to expose normalized billing access state and to block authenticated calls with `402` when the account is in a hard billing block.
- Applied the billing guard to the main value-generating Supabase functions (search, analysis, presentation generation, sender/integration validation, campaign dispatch, and ElevenLabs TTS), instead of relying only on the frontend gate.
- Updated the campaign scheduler and campaign UI reason mapping to recognize `billing_blocked`, so blocked accounts do not keep retrying scheduled sends in the background.

### 2026-03-21 - Follow-up: remote Supabase publish succeeded for functions, but migration history still needs repair
- Logged into the correct Supabase account, linked the local repo to project `cccakxnoptrtdzdlwyju`, and published the critical go-live edge functions to the remote project.
- Confirmed the public app at `https://envpro.com.br` is serving the new build with the PWA manifest and without the old broken vendor chunk references.
- Confirmed the remote database already exposes the critical new schema pieces used by the current code (`profiles.billing_access_*` and `feedbacks`) through the REST surface.
- `db push` is still blocked because the remote migration history uses legacy versions `001..030` while the local repo uses timestamped migrations, so schema history repair remains a separate task.
- Production probing shows the hardened functions are live; however, two campaign dispatchers (`send-campaign-webhooks` and `whatsapp-send-batch`) still answer malformed anonymous probes with `campaign_id is required` instead of a clean auth error, so their public error surface still needs one more pass.

### 2026-03-21 - Bugfix: go-live publish script is now strict and supports functions-only deploys
- Reproduced that `npm run deploy:go-live` kept publishing edge functions even after `supabase db push` failed, because the PowerShell script did not stop on non-zero CLI exit codes.
- Confirmed the remote dispatcher auth surface is now hardened: malformed anonymous probes return `401 Invalid JWT` on the campaign dispatchers instead of falling through to body validation.
- Updated `scripts/publish-go-live.ps1` to check `$LASTEXITCODE`, fail hard on migration/function deploy errors, and expose an explicit `-SkipMigrations` path for code-only publishes.
- Added `npm run deploy:functions-only`, updated the README/go-live checklist, and added a regression test to prevent the publish script from silently ignoring failed Supabase CLI commands.

### 2026-03-21 - Follow-up: migration history repair is now mapped and scriptable
- Added `scripts/check-migration-history-drift.ps1` plus `npm run supabase:check-drift` to fail fast when local and remote migration histories diverge.
- Captured the current drift explicitly: remote legacy versions `001..030` versus local timestamped migrations `202603...`.
- Documented the safe repair workflow, rollback path, and the exact `migration repair` commands for this repository in `docs/architecture/supabase-migration-history-repair-plan.md`.

### 2026-03-21 - Follow-up: remote migration history backup is now scriptable
- Added `scripts/backup-remote-migration-history.ps1` plus `npm run supabase:backup-history` to dump the remote `supabase_migrations` schema before any repair step.
- Ignored `backups/` in git so operational dumps can be created locally without polluting the repository.
- Added a fallback path for environments without Docker: the backup script now generates a SQL Editor backup file instead of failing silently.

### 2026-03-21 - Bugfix: Supabase migration history drift repaired
- Added `scripts/repair-migration-history.ps1` plus `npm run supabase:repair-history` to derive local-only and remote-only versions from `supabase migration list`, repair both sides, and validate with `db push`.
- Executed the repair against the linked remote project: remote legacy entries `001..030` were marked reverted, local timestamped migrations were marked applied, and the recheck came back empty on both sides.
- Confirmed the operational outcome with `db push`, which now reports `Remote database is up to date`, closing the migration-history drift that was blocking normal schema publication.

### 2026-03-21 - Follow-up: comercial da envPRO foi fechado para a semana de venda
- Ajustei a landing para posicionar a envPRO como sistema operacional de prospeccao consultiva para agencias, consultores e operacoes B2B que vendem servicos digitais.
- Subi o preco de lancamento na comunicacao para `R$ 297/mes`, com onboarding guiado incluso e APIs cobradas direto pelos provedores.
- Documentei o checklist comercial da semana e a oferta final em `docs/commercial/`.
