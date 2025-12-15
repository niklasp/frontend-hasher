import type { HashResult } from "../shared/types";
import { LOG_PREFIX } from "../shared/constants";

/** Compute SHA-256 hash of an ArrayBuffer */
export async function hashArrayBuffer(
  arrayBuffer: ArrayBuffer,
): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
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

/** Compute the manifest key for a URL (path for same-origin, full URL otherwise) */
export function computeManifestKey(url: string): {
  key: string;
  isSameOrigin: boolean;
} {
  const u = new URL(url, window.location.href);
  const isSameOrigin = u.origin === window.location.origin;
  const key = isSameOrigin ? `${u.pathname}${u.search}` || "/" : u.href;
  return { key, isSameOrigin };
}

/** Fetch a resource and compute its hash (pure function, no state mutation) */
export async function fetchAndHash(url: string): Promise<HashResult | null> {
  try {
    const response = await fetch(url, { cache: "no-cache" });

    if (!response.ok) {
      console.warn(
        `${LOG_PREFIX} Failed to fetch ${url}: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const buffer = await response.arrayBuffer();
    const hashSha256 = await hashArrayBuffer(buffer);

    return {
      hashSha256,
      sizeBytes: buffer.byteLength,
      contentType: response.headers.get("content-type"),
      status: response.status,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching ${url}:`, error);
    return null;
  }
}
