import type { PageManifest } from "../shared/types";
import { LOG_PREFIX } from "../shared/constants";
import { storeManifest } from "../shared/storage";
import { getCurrentManifest, setCurrentManifest } from "./state";
import { createEmptyManifest } from "./manifest";
import { recordResource } from "./collectors";

/** Ensure we have a current manifest, creating one if needed */
function ensureCurrentManifest(): PageManifest {
  const manifest = getCurrentManifest();
  if (manifest) return manifest;

  const newManifest = createEmptyManifest();
  setCurrentManifest(newManifest);
  return newManifest;
}

/** Debounce storage updates to avoid excessive writes */
let storageUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingManifest: PageManifest | null = null;

function scheduleStorageUpdate(manifest: PageManifest): void {
  pendingManifest = manifest;

  if (storageUpdateTimeout) return; // Already scheduled

  storageUpdateTimeout = setTimeout(async () => {
    storageUpdateTimeout = null;
    if (pendingManifest) {
      await storeManifest(pendingManifest);
      pendingManifest = null;
    }
  }, 100); // Batch updates within 100ms
}

/** Start observing for newly loaded resources */
export function startResourceObserver(): void {
  if (typeof PerformanceObserver !== "function") {
    console.warn(`${LOG_PREFIX} PerformanceObserver is not available.`);
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceResourceTiming[];

      // Process entries sequentially to avoid race conditions
      (async () => {
        for (const entry of entries) {
          const manifest = ensureCurrentManifest();
          const key = await recordResource(entry.name, "resource", manifest);

          if (key && manifest.entries[key]) {
            console.log(
              `${LOG_PREFIX} New resource discovered`,
              manifest.entries[key],
            );
            scheduleStorageUpdate(manifest);
          }
        }
      })();
    });

    // buffered: true picks up resources that loaded before observer started
    observer.observe({ type: "resource", buffered: true });
  } catch (error) {
    console.warn(`${LOG_PREFIX} Failed to start PerformanceObserver`, error);
  }
}
