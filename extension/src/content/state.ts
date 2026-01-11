import type {
  VerificationState,
  CollectedResource,
} from "../verification/types";

/** Private state - not directly exported */
let _processedUrls: Set<string> = new Set();
let _verificationState: VerificationState | null = null;
let _collectedResources: Map<string, CollectedResource> = new Map();

/** Check if a URL has already been processed */
export function isUrlProcessed(url: string): boolean {
  return _processedUrls.has(url);
}

/** Mark a URL as processed */
export function markUrlProcessed(url: string): void {
  _processedUrls.add(url);
}

/** Clear the processed URLs set */
export function clearProcessedUrls(): void {
  _processedUrls.clear();
}

/** Get the current verification state */
export function getVerificationState(): VerificationState | null {
  return _verificationState;
}

/** Set the current verification state */
export function setVerificationState(state: VerificationState | null): void {
  _verificationState = state;
}

/** Get all collected resources */
export function getCollectedResources(): Map<string, CollectedResource> {
  return _collectedResources;
}

/** Add a collected resource */
export function addCollectedResource(resource: CollectedResource): void {
  _collectedResources.set(resource.path, resource);
}

/** Clear collected resources */
export function clearCollectedResources(): void {
  _collectedResources.clear();
}

/** Reset all state */
export function resetState(): void {
  _processedUrls = new Set();
  _verificationState = null;
  _collectedResources = new Map();
}
