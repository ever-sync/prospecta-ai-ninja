export function getCampaignDispatchTarget(channel) {
  if (channel === 'whatsapp' || channel === 'email' || channel === 'webhook') {
    return channel;
  }

  return null;
}

export function isDispatchableCampaignChannel(channel) {
  return getCampaignDispatchTarget(channel) !== null;
}
