import { BRAND } from '@/config/brand';

const LOCAL_AUTH_HOSTS = new Set(['localhost', '127.0.0.1']);

const getBrowserOrigin = () => {
  if (typeof window === 'undefined') return null;
  return window.location.origin;
};

export const getAuthBaseUrl = () => {
  const origin = getBrowserOrigin();
  if (!origin || typeof window === 'undefined') return BRAND.websiteUrl;

  return LOCAL_AUTH_HOSTS.has(window.location.hostname) ? origin : BRAND.websiteUrl;
};

export const getSignUpRedirectUrl = () => `${getAuthBaseUrl()}/auth`;

export const getPasswordResetRedirectUrl = () => `${getAuthBaseUrl()}/esqueci-minha-senha`;

export const getEmailChangeRedirectUrl = () => `${getAuthBaseUrl()}/settings?tab=empresa`;
