import type { PageManifest } from "../shared/types";

/** Private state - not directly exported */
let _processedUrls: Set<string> = new Set();
let _currentManifest: PageManifest | null = null;

/** Get the set of already-processed URLs */
export function getProcessedUrls(): Set<string> {
  return _processedUrls;
}

/** Check if a URL has already been processed */
export function isUrlProcessed(url: string): boolean {
  return _processedUrls.has(url);
}

/** Mark a URL as processed */
export function markUrlProcessed(url: string): void {
  _processedUrls.add(url);
}

/** Get the current manifest */
export function getCurrentManifest(): PageManifest | null {
  return _currentManifest;
}

/** Set the current manifest */
export function setCurrentManifest(manifest: PageManifest | null): void {
  _currentManifest = manifest;
}

/** Clear the processed URLs set */
export function clearProcessedUrls(): void {
  _processedUrls.clear();
}

/** Reset all state (useful for testing or full refresh) */
export function resetState(): void {
  _processedUrls = new Set();
  _currentManifest = null;
}
