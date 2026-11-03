import { apiFetch } from './apiClient';

export const MEMBER_CUSTOM_DOMAIN = 'member.lombokgardenhotel.com';
export const HOTEL_OFFICIAL_NAME = 'Lombok Garden Hotel';
export const FIRESTORE_DATABASE_ID = 'ai-studio-lombokgardenhote-6c919a5f-b175-40b5-b5a7-13f33d1558ca';

export interface DomainSyncInfo {
  domain: string;
  isCustomDomain: boolean;
  subdomain: string;
  databaseId: string;
  firestoreConnected: boolean;
  status: 'connected' | 'simulated' | 'fallback';
  verifiedAt: string;
  dnsTarget: string;
  recommendedCname: string;
}

const STORAGE_SIMULATE_KEY = 'lgh_simulate_member_subdomain';

/**
 * Checks if the current page is accessed via member.lombokgardenhotel.com
 * or via simulated member subdomain mode.
 */
export function isMemberSubdomain(): boolean {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname === MEMBER_CUSTOM_DOMAIN.toLowerCase()) {
    return true;
  }
  
  if (hostname.startsWith('member.') || hostname.includes('member-')) {
    return true;
  }

  // Allow simulation mode for preview/staging environments
  try {
    const sim = localStorage.getItem(STORAGE_SIMULATE_KEY);
    if (sim === 'true') {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

/**
 * Enable or disable subdomain simulation in the preview environment
 */
export function setSimulateMemberSubdomain(enable: boolean): void {
  try {
    if (enable) {
      localStorage.setItem(STORAGE_SIMULATE_KEY, 'true');
    } else {
      localStorage.removeItem(STORAGE_SIMULATE_KEY);
    }
    // Dispatch storage event so all components react immediately
    window.dispatchEvent(new Event('domain_mode_changed'));
  } catch {
    // ignore
  }
}

export function isSimulationActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_SIMULATE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Returns the effective base domain
 */
export function getEffectiveDomain(): string {
  if (typeof window === 'undefined') return MEMBER_CUSTOM_DOMAIN;
  if (isMemberSubdomain()) {
    return MEMBER_CUSTOM_DOMAIN;
  }
  return window.location.hostname || MEMBER_CUSTOM_DOMAIN;
}

/**
 * Returns the effective base URL / origin (e.g. https://member.lombokgardenhotel.com)
 */
export function getEffectiveOrigin(): string {
  if (typeof window === 'undefined') return `https://${MEMBER_CUSTOM_DOMAIN}`;
  
  if (isMemberSubdomain()) {
    return `https://${MEMBER_CUSTOM_DOMAIN}`;
  }
  return window.location.origin;
}

/**
 * Generate Member Digital Card link pointing directly to the member login portal
 * at https://member.lombokgardenhotel.com
 */
export function getDigitalCardUrl(membershipNumber?: string): string {
  return `https://${MEMBER_CUSTOM_DOMAIN}`;
}

/**
 * Generate Password Reset link using custom domain
 */
export function getResetPasswordUrl(token: string, email: string): string {
  const origin = getEffectiveOrigin();
  return `${origin}/?mode=resetPassword&reset_token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

/**
 * Fetches server domain & database synchronization diagnostics
 */
export async function fetchServerDomainStatus(): Promise<DomainSyncInfo> {
  const isCustom = isMemberSubdomain();
  const fallbackInfo: DomainSyncInfo = {
    domain: MEMBER_CUSTOM_DOMAIN,
    isCustomDomain: isCustom,
    subdomain: 'member',
    databaseId: FIRESTORE_DATABASE_ID,
    firestoreConnected: true,
    status: isCustom ? 'connected' : 'simulated',
    verifiedAt: new Date().toISOString(),
    dnsTarget: 'member.lombokgardenhotel.com',
    recommendedCname: 'member CNAME ais-pre-xla2nc2xa6a4dyfmg3b7sm-882338726390.asia-southeast1.run.app.',
  };

  try {
    const { response, parsed } = await apiFetch('/api/domain/status');
    if (response.ok && parsed.isJson && parsed.data) {
      return {
        ...fallbackInfo,
        ...parsed.data,
      };
    }
  } catch {
    // fallback
  }

  return fallbackInfo;
}
