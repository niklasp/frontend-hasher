import type { PageManifest } from "../shared/types";
import { MANIFEST_VERSION } from "../shared/constants";

/** Create a new empty manifest for the current page */
export function createEmptyManifest(): PageManifest {
  return {
    manifestVersion: MANIFEST_VERSION,
    createdAt: new Date().toISOString(),
    pageUrl: window.location.href,
    origin: window.location.origin,
    entries: {},
  };
}
