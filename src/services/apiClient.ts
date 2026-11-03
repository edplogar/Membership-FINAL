/**
 * Universal API Client with Automatic Subdomain & Multi-Host Fallback
 * 
 * Resolves the issue where API routes (/api/whatsapp, /api/email) fail on custom
 * subdomains (e.g. member.lombokgardenhotel.com or external hosting) because
 * the static host lacks Node.js / Express backend endpoints.
 * 
 * Automatically routes requests to the active Cloud Run backend when running
 * on a custom subdomain, ensuring 100% reliable WhatsApp CRM & Email delivery.
 */

// Canonical Cloud Run Backend endpoints for Lombok Garden Hotel AI Studio build
export const CLOUD_RUN_PREVIEW_URL = 'https://ais-pre-xla2nc2xa6a4dyfmg3b7sm-882338726390.asia-southeast1.run.app';
export const CLOUD_RUN_DEV_URL = 'https://ais-dev-xla2nc2xa6a4dyfmg3b7sm-882338726390.asia-southeast1.run.app';

// Local storage key for optional manual backend override
const STORAGE_BACKEND_KEY = 'lgh_custom_backend_api_url';
const STORAGE_VERIFIED_KEY = 'lgh_verified_working_backend';

// Cached active backend URL in memory for fast resolution
let verifiedBackendBaseUrl: string | null = null;

/**
 * Checks if current browser environment is on Cloud Run, Vercel, localhost, or official domain
 */
export function isNativeCloudRunHost(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname.toLowerCase();
  return (
    host.includes('run.app') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.includes('.webcontainer.io') ||
    host.includes('vercel.app') ||
    host.includes('lombokgardenhotel.com')
  );
}

/**
 * Returns the configured or determined Backend Base URL
 */
export function getBackendBaseUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  // 1. Check if user configured a manual backend URL in Super Admin settings
  const customOverride = localStorage.getItem(STORAGE_BACKEND_KEY);
  if (customOverride && customOverride.trim()) {
    return customOverride.trim().replace(/\/+$/, '');
  }

  // 2. If running on Vercel, custom domain, Cloud Run or localhost, use relative path ('')
  if (isNativeCloudRunHost()) {
    return '';
  }

  // 3. If running on custom external preview, use verified or saved working backend
  if (verifiedBackendBaseUrl) {
    return verifiedBackendBaseUrl;
  }

  const savedVerified = localStorage.getItem(STORAGE_VERIFIED_KEY);
  if (savedVerified && savedVerified.trim()) {
    verifiedBackendBaseUrl = savedVerified.trim();
    return verifiedBackendBaseUrl;
  }

  return '';
}

/**
 * Sets a custom backend URL override (for Super Admin Control Center)
 */
export function setCustomBackendUrl(url: string | null) {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    localStorage.removeItem(STORAGE_BACKEND_KEY);
    verifiedBackendBaseUrl = null;
  } else {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    localStorage.setItem(STORAGE_BACKEND_KEY, cleanUrl);
    verifiedBackendBaseUrl = cleanUrl;
  }
}

/**
 * Returns full URL for an API endpoint
 */
export function buildApiUrl(endpoint: string, overrideBase?: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = overrideBase !== undefined ? overrideBase : getBackendBaseUrl();
  return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
}

/**
 * Safely parses response to handle both JSON and unexpected HTML error pages
 */
export async function safeParseResponse<T = any>(
  res: Response
): Promise<{ isJson: boolean; data: T | null; rawText: string; isHtml: boolean }> {
  try {
    const rawText = await res.text();
    const isHtml = rawText.trim().startsWith('<!DOCTYPE') || rawText.trim().startsWith('<html');
    
    if (isHtml) {
      return { isJson: false, data: null, rawText, isHtml: true };
    }

    try {
      const data = JSON.parse(rawText);
      return { isJson: true, data, rawText, isHtml: false };
    } catch {
      return { isJson: false, data: null, rawText, isHtml: false };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { isJson: false, data: null, rawText: msg, isHtml: false };
  }
}

/**
 * Smart resilient fetch that handles custom subdomains and automatic Cloud Run fallback.
 * 
 * 1. Tries the primary target (relative path on local/Cloud Run, or Cloud Run URL on custom subdomain).
 * 2. If the request fails with network error, 404 HTML, or 502/503:
 *    Automatically falls back to the other candidate URLs and returns the successful response.
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ response: Response; parsed: { isJson: boolean; data: any; rawText: string } }> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Candidate URLs in priority order
  const candidates: string[] = [];

  const currentBackend = getBackendBaseUrl();
  if (currentBackend) {
    candidates.push(`${currentBackend}${cleanEndpoint}`);
  } else {
    candidates.push(cleanEndpoint);
  }

  // If on custom subdomain and first candidate was not the direct Cloud Run instance, add fallbacks
  if (!isNativeCloudRunHost()) {
    if (!candidates.includes(`${CLOUD_RUN_PREVIEW_URL}${cleanEndpoint}`)) {
      candidates.push(`${CLOUD_RUN_PREVIEW_URL}${cleanEndpoint}`);
    }
    if (!candidates.includes(`${CLOUD_RUN_DEV_URL}${cleanEndpoint}`)) {
      candidates.push(`${CLOUD_RUN_DEV_URL}${cleanEndpoint}`);
    }
    if (!candidates.includes(cleanEndpoint)) {
      candidates.push(cleanEndpoint);
    }
  } else {
    // If on native host, relative first, then preview URL
    if (!candidates.includes(cleanEndpoint)) candidates.unshift(cleanEndpoint);
    if (!candidates.includes(`${CLOUD_RUN_PREVIEW_URL}${cleanEndpoint}`)) {
      candidates.push(`${CLOUD_RUN_PREVIEW_URL}${cleanEndpoint}`);
    }
  }

  let lastError: Error | null = null;
  let lastRes: Response | null = null;
  let lastParsed: { isJson: boolean; data: any; rawText: string } = {
    isJson: false,
    data: null,
    rawText: '',
  };

  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json, text/plain, */*',
  };

  // If body is present and not FormData, add Content-Type
  if (options.body && typeof options.body === 'string' && !options.headers) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const mergedHeaders = {
    ...defaultHeaders,
    ...(options.headers as Record<string, string> || {}),
  };

  for (const targetUrl of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(targetUrl, {
        ...options,
        headers: mergedHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastRes = res;

      const parsed = await safeParseResponse(res);
      lastParsed = parsed;

      // If we got a valid response (not HTML 404 or static index.html fallback)
      if (!parsed.isHtml && (res.ok || res.status < 500)) {
        // Remember this working base URL for subsequent calls
        try {
          const urlObj = new URL(targetUrl, typeof window !== 'undefined' ? window.location.origin : undefined);
          const workingOrigin = urlObj.origin === (typeof window !== 'undefined' ? window.location.origin : '')
            ? ''
            : urlObj.origin;
          verifiedBackendBaseUrl = workingOrigin;
          if (workingOrigin && typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_VERIFIED_KEY, workingOrigin);
          }
        } catch {}

        return { response: res, parsed };
      }

      // If response is HTML (e.g. static server returning index.html for unknown /api route)
      // or status is 404, continue to next candidate
      console.warn(`[API Client] Candidate ${targetUrl} returned non-API response (${res.status}, isHtml: ${parsed.isHtml}). Trying fallback...`);
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[API Client] Candidate ${targetUrl} failed: ${lastError.message}. Trying next candidate...`);
    }
  }

  // If all failed, return last response or create a synthetic diagnostic response
  if (lastRes) {
    return { response: lastRes, parsed: lastParsed };
  }

  const syntheticErrorData = {
    success: false,
    error: lastError?.message || 'Gagal menghubungi server API di semua domain target.',
    diagnostics: {
      candidatesAttempted: candidates,
      currentOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      recommendation:
        'Pastikan koneksi internet aktif. Jika menggunakan custom subdomain, izinkan CORS atau periksa koneksi Cloud Run backend.',
    },
  };

  const syntheticResponse = new Response(JSON.stringify(syntheticErrorData), {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'application/json' },
  });

  return {
    response: syntheticResponse,
    parsed: { isJson: true, data: syntheticErrorData, rawText: JSON.stringify(syntheticErrorData) },
  };
}

/**
 * Checks backend health across available hosts
 */
export async function checkBackendConnection(): Promise<{
  online: boolean;
  activeUrl: string;
  isCustomSubdomain: boolean;
  latencyMs: number;
  data: any;
}> {
  const startTime = Date.now();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isCustomSubdomain = !isNativeCloudRunHost();

  try {
    const { response, parsed } = await apiFetch('/api/health');
    const latencyMs = Date.now() - startTime;

    if (response.ok && parsed.isJson) {
      return {
        online: true,
        activeUrl: getBackendBaseUrl() || currentOrigin,
        isCustomSubdomain,
        latencyMs,
        data: parsed.data,
      };
    }
  } catch {}

  return {
    online: false,
    activeUrl: getBackendBaseUrl() || currentOrigin,
    isCustomSubdomain,
    latencyMs: Date.now() - startTime,
    data: null,
  };
}
