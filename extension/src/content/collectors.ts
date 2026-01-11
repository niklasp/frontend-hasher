import type { CollectedResource } from "../verification/types";
import { LOG_PREFIX } from "../shared/constants";
import { fetchWithBytes, toAbsoluteUrl, computeManifestKey } from "./hash";
import {
  isUrlProcessed,
  markUrlProcessed,
  addCollectedResource,
} from "./state";

/** Record a resource for verification (handles deduplication) */
async function recordResource(url: string): Promise<string | null> {
  if (isUrlProcessed(url)) return null;
  markUrlProcessed(url);

  const { key, isSameOrigin } = computeManifestKey(url);

  // Skip cross-origin resources
  if (!isSameOrigin) return null;

  const result = await fetchWithBytes(url);
  if (!result) return null;

  const resource: CollectedResource = {
    path: key,
    url: new URL(url, window.location.href).href,
    bytes: result.bytes,
    size: result.sizeBytes,
  };

  addCollectedResource(resource);
  return key;
}

/** Collect the HTML document itself */
async function collectDocumentHtml(): Promise<void> {
  const url = window.location.href;
  await recordResource(url);
}

/** Collect all assets referenced in the DOM */
async function collectDomReferencedAssets(): Promise<void> {
  const urls: Set<string> = new Set();

  // Favicon and icons
  document
    .querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
    .forEach((el) => {
      const abs = toAbsoluteUrl(el.getAttribute("href"));
      if (abs) urls.add(abs);
    });

  // Stylesheets
  document
    .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    .forEach((el) => {
      const abs = toAbsoluteUrl(el.getAttribute("href"));
      if (abs) urls.add(abs);
    });

  // Images
  document.querySelectorAll<HTMLImageElement>("img[src]").forEach((el) => {
    const abs = toAbsoluteUrl(el.getAttribute("src"));
    if (abs) urls.add(abs);
  });

  // Scripts
  document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((el) => {
    const abs = toAbsoluteUrl(el.getAttribute("src"));
    if (abs) urls.add(abs);
  });

  // Video sources
  document.querySelectorAll<HTMLVideoElement>("video[src]").forEach((el) => {
    const abs = toAbsoluteUrl(el.getAttribute("src"));
    if (abs) urls.add(abs);
  });

  // Audio sources
  document.querySelectorAll<HTMLAudioElement>("audio[src]").forEach((el) => {
    const abs = toAbsoluteUrl(el.getAttribute("src"));
    if (abs) urls.add(abs);
  });

  // Source elements (inside video/audio)
  document.querySelectorAll<HTMLSourceElement>("source[src]").forEach((el) => {
    const abs = toAbsoluteUrl(el.getAttribute("src"));
    if (abs) urls.add(abs);
  });

  // Process all URLs in parallel
  await Promise.all(Array.from(urls).map((url) => recordResource(url)));
}

/** Collect all resources loaded by the page via Resource Timing API */
async function collectLoadedResources(): Promise<void> {
  if (typeof performance?.getEntriesByType !== "function") {
    console.warn(
      `${LOG_PREFIX} Resource Timing API not supported in this browser.`
    );
    return;
  }

  const resources = performance.getEntriesByType(
    "resource"
  ) as PerformanceResourceTiming[];

  console.log(
    `${LOG_PREFIX} Found ${resources.length} loaded resource entries.`
  );

  // Process all resources in parallel
  await Promise.all(resources.map((entry) => recordResource(entry.name)));
}

/** Collect all resources from the page */
export async function collectResources(): Promise<void> {
  await collectDocumentHtml();
  await collectDomReferencedAssets();
  await collectLoadedResources();
}

/** Record a single resource (exported for use by observer) */
export { recordResource };
