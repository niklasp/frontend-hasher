import type { PageManifest } from "./types";
import { STORAGE_KEY, LOG_PREFIX } from "./constants";

/** Store manifest in chrome.storage.local */
export async function storeManifest(manifest: PageManifest): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: manifest });
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to store manifest:`, error);
  }
}

/** Load manifest from chrome.storage.local */
export async function loadManifest(): Promise<PageManifest | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as PageManifest) ?? null;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to load manifest:`, error);
    return null;
  }
}
