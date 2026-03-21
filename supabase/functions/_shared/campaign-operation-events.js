const ALLOWED_CHANNELS = new Set(["whatsapp", "email", "webhook"]);

export async function logCampaignOperationEvent(
  supabase,
  {
    userId,
    campaignId,
    channel,
    eventType,
    source,
    reasonCode = null,
    message = null,
    metadata = {},
  },
) {
  const normalizedChannel = ALLOWED_CHANNELS.has(channel) ? channel : "unknown";

  const { error } = await supabase.from("campaign_operation_events").insert({
    user_id: userId,
    campaign_id: campaignId,
    channel: normalizedChannel,
    event_type: eventType,
    source,
    reason_code: reasonCode,
    message,
    metadata,
  });

  if (error) {
    console.warn("Failed to log campaign operation event:", error);
  }
}
