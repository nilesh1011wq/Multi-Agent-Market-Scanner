/**
 * Institutional Resilient API Client
 * Prevents "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 * by safely inspecting HTTP status, Content-Type, and empty response bodies.
 * Supports static host routing (e.g. Netlify/Vercel) to Cloud Run backend.
 */

const CLOUD_BACKEND_FALLBACK = 'https://ais-pre-g3ruhljtf6nyyvw7uadmsk-555271435241.europe-west3.run.app';

export function getApiBaseUrl(): string {
  // 1. Explicit environment variable override
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return (import.meta.env.VITE_API_BASE_URL as string).replace(/\/$/, '');
  }

  // 2. If running on Netlify or external static host and not proxied, allow cloud fallback
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host.includes('netlify.app') || host.includes('vercel.app') || host.includes('github.io')) {
      // Netlify will proxy /api/* via _redirects; if that fails, CLOUD_BACKEND_FALLBACK can be used
      return '';
    }
  }

  return '';
}

export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function safeFetchJson<T = any>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${normalizedPath}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (!text || text.trim() === '') {
      // If we got an empty response from Netlify, retry against the direct Cloud Run backend
      if (res.status === 404 || res.status === 502 || res.status === 0) {
        if (typeof window !== 'undefined' && window.location?.hostname?.includes('netlify.app')) {
          try {
            const fallbackRes = await fetch(`${CLOUD_BACKEND_FALLBACK}${normalizedPath}`, options);
            const fallbackText = await fallbackRes.text();
            if (fallbackText && fallbackText.trim()) {
              const fallbackParsed = JSON.parse(fallbackText);
              return {
                success: fallbackRes.ok,
                status: fallbackRes.status,
                data: fallbackParsed,
                error: fallbackParsed.error,
              };
            }
          } catch {
            // Fall through to original response handling
          }
        }
      }

      return {
        success: false,
        status: res.status,
        error: `Server returned empty response (HTTP ${res.status}). Verify backend service is running.`,
      };
    }

    if (!contentType.includes('application/json') && (text.startsWith('<!DOCTYPE') || text.startsWith('<html'))) {
      // Netlify or static host returned an HTML fallback page instead of JSON API response
      // Automatically attempt direct fallback to the Cloud Run backend
      try {
        const fallbackRes = await fetch(`${CLOUD_BACKEND_FALLBACK}${normalizedPath}`, options);
        const fallbackText = await fallbackRes.text();
        if (fallbackText && fallbackText.trim()) {
          const fallbackParsed = JSON.parse(fallbackText);
          return {
            success: fallbackRes.ok,
            status: fallbackRes.status,
            data: fallbackParsed,
            error: fallbackParsed.error,
          };
        }
      } catch {
        // Fall through
      }

      return {
        success: false,
        status: res.status,
        error: `Endpoint returned HTML instead of JSON (HTTP ${res.status}). On static hosts like Netlify, ensure API proxying to backend is active.`,
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        success: false,
        status: res.status,
        error: `Failed to parse response JSON: ${text.slice(0, 120)}...`,
      };
    }

    return {
      success: res.ok && parsed.success !== false,
      status: res.status,
      data: parsed,
      error: parsed.error || (!res.ok ? `HTTP ${res.status}: ${res.statusText}` : undefined),
    };
  } catch (err: any) {
    // If local network failed on Netlify, try direct cloud fallback
    if (typeof window !== 'undefined' && window.location?.hostname?.includes('netlify.app')) {
      try {
        const fallbackRes = await fetch(`${CLOUD_BACKEND_FALLBACK}${normalizedPath}`, options);
        const fallbackText = await fallbackRes.text();
        if (fallbackText && fallbackText.trim()) {
          const fallbackParsed = JSON.parse(fallbackText);
          return {
            success: fallbackRes.ok,
            status: fallbackRes.status,
            data: fallbackParsed,
            error: fallbackParsed.error,
          };
        }
      } catch {
        // Continue
      }
    }

    return {
      success: false,
      status: 0,
      error: `Network request failed: ${err.message}`,
    };
  }
}
