import { LOG_PREFIX } from "../shared/constants";

/** Result of fetching a resource with bytes */
export interface FetchResult {
  bytes: Uint8Array;
  sizeBytes: number;
  contentType: string | null;
  status: number;
}

/** Convert a potentially relative URL to an absolute URL */
export function toAbsoluteUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return null;

  try {
    return new URL(rawUrl, window.location.href).href;
  } catch {
    return null;
  }
}

/** Compute the path key for a URL (path for same-origin, full URL otherwise) */
export function computeManifestKey(url: string): {
  key: string;
  isSameOrigin: boolean;
} {
  const u = new URL(url, window.location.href);
  const isSameOrigin = u.origin === window.location.origin;

  // Normalize path - treat "/" as "/index.html"
  let path = u.pathname;
  if (path === "/" || path === "") {
    path = "/index.html";
  }

  const key = isSameOrigin ? path : u.href;
  return { key, isSameOrigin };
}

/** Fetch a resource and return raw bytes */
export async function fetchWithBytes(url: string): Promise<FetchResult | null> {
  try {
    const response = await fetch(url, { cache: "no-cache" });

    if (!response.ok) {
      console.warn(
        `${LOG_PREFIX} Failed to fetch ${url}: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    return {
      bytes,
      sizeBytes: buffer.byteLength,
      contentType: response.headers.get("content-type"),
      status: response.status,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching ${url}:`, error);
    return null;
  }
}
