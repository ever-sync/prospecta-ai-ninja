export type EmailSenderStatus = 'not_configured' | 'pending' | 'ready' | 'blocked';
export type EmailSenderReadinessLevel = 'ready' | 'partial' | 'blocked';

export const emailSenderBadgeLabel = (status: EmailSenderStatus) => {
  if (status === 'ready') return 'Configurado';
  if (status === 'pending') return 'Aguardando DNS';
  if (status === 'blocked') return 'Bloqueado';
  return 'Nao configurado';
};

export const emailSenderBadgeClass = (status: EmailSenderStatus) => {
  if (status === 'ready') return 'rounded-full border-[#cde8d9] bg-[#f0faf4] text-[10px] text-[#2d7a4a]';
  if (status === 'pending') return 'rounded-full border-[#f5c842]/40 bg-[#fffbeb] text-[10px] text-[#8b5e00]';
  if (status === 'blocked') return 'rounded-full border-[#f2d4d8] bg-[#fff3f5] text-[10px] text-[#8c2535]';
  return 'rounded-full border-[#e6e6eb] bg-[#fafafd] text-[10px] text-[#7b7b83]';
};

export const emailSenderPanelClass = (
  readiness?: EmailSenderReadinessLevel,
  status?: EmailSenderStatus,
) => {
  if (readiness === 'ready' || status === 'ready') return 'border-[#cde8d9] bg-[#eef8f3]';
  if (readiness === 'partial' || status === 'pending') return 'border-[#f5c842]/40 bg-[#fffbeb]';
  if (readiness === 'blocked' || status === 'blocked') return 'border-[#f2d4d8] bg-[#fff3f5]';
  return 'border-[#e7e7ee] bg-[#f8f8fd]';
};
