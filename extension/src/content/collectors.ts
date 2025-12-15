import type {
  ManifestEntry,
  ManifestEntryKind,
  PageManifest,
} from "../shared/types";
import { LOG_PREFIX } from "../shared/constants";
import { fetchAndHash, toAbsoluteUrl, computeManifestKey } from "./hash";
import { isUrlProcessed, markUrlProcessed } from "./state";

/** Record a resource in the manifest (handles deduplication) */
async function recordResource(
  url: string,
  kind: ManifestEntryKind,
  manifest: PageManifest,
  keyOverride?: string,
): Promise<string | null> {
  if (isUrlProcessed(url)) return null;
  markUrlProcessed(url);

  const result = await fetchAndHash(url);
  if (!result) return null;

  const { key: computedKey, isSameOrigin } = computeManifestKey(url);
  const key = keyOverride ?? computedKey;
  const absoluteUrl = new URL(url, window.location.href).href;

  const entry: ManifestEntry = {
    url: absoluteUrl,
    kind,
    hashSha256: result.hashSha256,
    sizeBytes: result.sizeBytes,
    contentType: result.contentType,
    status: result.status,
    isSameOrigin,
  };

  manifest.entries[key] = entry;
  return key;
}

/** Collect the HTML document itself */
export async function collectDocumentHtml(
  manifest: PageManifest,
): Promise<void> {
  const url = window.location.href;
  const pathname = new URL(url).pathname;

  // Normalize root path "/" to "/index.html" for clarity
  const key = pathname === "/" || pathname === "" ? "/index.html" : undefined;

  await recordResource(url, "document", manifest, key);
}

/** Collect all assets referenced in the DOM (images, icons, scripts, stylesheets, media) */
export async function collectDomReferencedAssets(
  manifest: PageManifest,
): Promise<void> {
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
  await Promise.all(
    Array.from(urls).map((url) => recordResource(url, "dom-asset", manifest)),
  );
}

/** Collect all resources loaded by the page via Resource Timing API */
export async function collectLoadedResources(
  manifest: PageManifest,
): Promise<void> {
  if (typeof performance?.getEntriesByType !== "function") {
    console.warn(
      `${LOG_PREFIX} Resource Timing API not supported in this browser.`,
    );
    return;
  }

  const resources = performance.getEntriesByType(
    "resource",
  ) as PerformanceResourceTiming[];

  console.log(
    `${LOG_PREFIX} Found ${resources.length} loaded resource entries.`,
  );

  // Process all resources in parallel
  await Promise.all(
    resources.map((entry) => recordResource(entry.name, "resource", manifest)),
  );
}

/** Collect all resources from the page */
export async function collectResources(
  manifest: PageManifest,
): Promise<PageManifest> {
  await collectDocumentHtml(manifest);
  await collectDomReferencedAssets(manifest);
  await collectLoadedResources(manifest);
  return manifest;
}

/** Record a single resource (exported for use by observer) */
export { recordResource };
