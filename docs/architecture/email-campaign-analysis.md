# Email Campaign Analysis

Date: 2026-03-21
Scope: campaign creation, preview, manual send, scheduled send, sender configuration, tracking, and failure handling for `channel = email`

## End-to-end flow

1. The campaign is created or edited in [Campaigns.tsx](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/src/pages/Campaigns.tsx).
2. The preview flow loads pending `campaign_presentations`, selected `message_templates`, and profile data, then renders per-lead previews and subjects. See [Campaigns.tsx](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/src/pages/Campaigns.tsx#L429).
3. Manual confirmation invokes `send-campaign-emails`. See [Campaigns.tsx](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/src/pages/Campaigns.tsx#L627).
4. Scheduled campaigns are claimed by `campaign-scheduler`, which dispatches the same edge function. See [campaign-scheduler/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/campaign-scheduler/index.ts#L48).
5. `send-campaign-emails` loads pending rows, profile sender settings, and campaign template, then sends via Resend. See [send-campaign-emails/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/send-campaign-emails/index.ts#L88).
6. Sender configuration comes from Settings. See [Settings.tsx](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/src/pages/Settings.tsx#L697).

## Strengths

- The product already has a dedicated edge function for email campaigns instead of mixing email logic into the page.
- Manual and scheduled dispatch converge on the same backend path, which is the right architecture.
- Tracking parameters for `cid`, `cpid`, and `ch=email` are present in generated presentation links.
- Successful sends create `campaign_message_attempts` and `message_conversion_events`.

## Findings

### 1. Previewed A/B email content can differ from what is actually sent

The preview path chooses variants per lead via `pickVariantForLead`, including `experiment_group` support and `vid` tracking. The backend sender does not replicate that logic; it loads only `campaign.template_id` and sends that template for every lead.

- Preview variant selection: [Campaigns.tsx](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/src/pages/Campaigns.tsx#L476)
- Preview tracks the chosen variant id: [Campaigns.tsx](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/src/pages/Campaigns.tsx#L533)
- Backend loads only one template: [send-campaign-emails/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/send-campaign-emails/index.ts#L97)
- Backend records `variant_id` as `campaign.template_id`: [send-campaign-emails/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/send-campaign-emails/index.ts#L247)

Impact:
- The operator can preview one subject/body and send another.
- A/B attribution becomes invalid for email campaigns.

### 2. Leads without email are silently skipped, but the campaign is still closed as `sent`

The sender skips any lead that has no `business_email`, leaving `campaign_presentations.send_status` untouched. After the loop, the campaign is still globally updated to `sent`.

- Silent skip: [send-campaign-emails/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/send-campaign-emails/index.ts#L154)
- Global campaign close-out: [send-campaign-emails/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/send-campaign-emails/index.ts#L300)

The preview does not load `business_email`, so the operator cannot see that these leads are unsendable before dispatch.

- Preview query omits `business_email`: [Campaigns.tsx](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/src/pages/Campaigns.tsx#L453)

Impact:
- Campaign cards can show `sent` while some leads remain pending forever.
- Users do not get an actionable explanation for skipped rows.

### 3. Failure telemetry is incomplete and inconsistent

On Resend non-200 responses, the code marks `campaign_presentations.send_status = failed` but does not create a failed `campaign_message_attempts` row or preserve the provider error. On thrown exceptions, it only logs to console and leaves the row pending.

- Non-200 failure path: [send-campaign-emails/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/send-campaign-emails/index.ts#L282)
- Exception path with no state update: [send-campaign-emails/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/send-campaign-emails/index.ts#L290)
- Failure viewer depends on `campaign_message_attempts.error_reason`: [Campaigns.tsx](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/src/pages/Campaigns.tsx#L858)

Impact:
- Email failures are hard to diagnose from the UI.
- Network or timeout failures can leave pending rows that were already attempted.

### 4. Plan limits are enforced only in the page, not in the backend

The UI blocks sending when `canUse('emails')` returns false, but `send-campaign-emails` itself does not validate plan limits. Scheduled campaigns and direct function calls bypass the frontend guard.

- Frontend-only limit guard: [Campaigns.tsx](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/src/pages/Campaigns.tsx#L432)
- Scheduler invokes the email dispatcher directly: [campaign-scheduler/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/campaign-scheduler/index.ts#L91)
- Backend has no limit check in `send-campaign-emails`: [send-campaign-emails/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/send-campaign-emails/index.ts#L38)

Impact:
- Subscription enforcement is not defensible server-side.

### 5. Sender configuration is format-validated, but not operationally validated

Settings validates the sender email shape, but it does not verify that the sender domain is authorized in Resend. The runtime function can still fail if the user saves an unverified sender address.

- Settings format validation: [Settings.tsx](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/src/pages/Settings.tsx#L697)
- Runtime sender resolution: [send-campaign-emails/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/send-campaign-emails/index.ts#L135)

Impact:
- The configuration looks valid in the UI but can fail at send time.

### 6. Tracking metadata uses `vid = template_id` instead of the actual variant id

Even in the backend, the tracking URL sets `vid` equal to `campaign.template_id`. This is only correct if there is never more than one variant in play, which the preview logic disproves.

- Tracking bug: [send-campaign-emails/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/send-campaign-emails/index.ts#L167)

Impact:
- Attribution data is misleading even if email experiments are added later.

### 7. Email HTML is assembled with unescaped interpolated business data

Business fields and template replacements are inserted directly into HTML without escaping.

- Variable replacement: [send-campaign-emails/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/send-campaign-emails/index.ts#L139)
- HTML assembly: [send-campaign-emails/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/send-campaign-emails/index.ts#L180)

Impact:
- Scraped or malformed business data can break layout or inject unwanted HTML into outbound emails.

### 8. The send loop is fully sequential

Each email is sent one at a time in a single request cycle.

- Sequential loop: [send-campaign-emails/index.ts](C:/Users/rapha/OneDrive/Documentos/prospecta-ai-ninja-main/supabase/functions/send-campaign-emails/index.ts#L154)

Impact:
- Larger campaigns risk slow execution and timeout pressure.

## Operational read

Today, email campaigns are functional for a straightforward single-template path. The architecture is serviceable, but the flow is not yet reliable enough for A/B testing, failure triage, or strong billing enforcement.

## Recommended order of fixes

1. Make backend variant resolution match preview, and store the actual `variant_id`.
2. Mark skipped `no-email` leads explicitly as failed with an error reason, and do not close campaigns while pending rows remain unexplained.
3. Record failed `campaign_message_attempts` for both Resend rejections and thrown exceptions.
4. Enforce subscription limits inside `send-campaign-emails`.
5. Add operational validation for sender domains or expose a clear “Resend sender not verified” error path in Settings.
6. Escape interpolated HTML fields before assembling email body.
