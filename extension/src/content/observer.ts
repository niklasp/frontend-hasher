import { LOG_PREFIX } from "../shared/constants";
import { storeVerificationState } from "../shared/storage";
import { getVerificationState, getCollectedResources } from "./state";
import { recordResource } from "./collectors";
import { verifyResource } from "../verification/verify";
import { logVerificationSummary } from "./index";

/** Start observing for newly loaded resources */
export function startResourceObserver(): void {
  if (typeof PerformanceObserver !== "function") {
    console.warn(`${LOG_PREFIX} PerformanceObserver is not available.`);
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceResourceTiming[];

      (async () => {
        for (const entry of entries) {
          const state = getVerificationState();
          if (
            !state ||
            state.status === "not-ens" ||
            state.status === "failed"
          ) {
            continue;
          }

          // Record resource (fetches and stores bytes)
          const path = await recordResource(entry.name);
          if (!path) continue;

          // Get the already-fetched resource from state
          const resource = getCollectedResources().get(path);
          if (!resource) continue;

          // Verify and update state
          await verifyResource(state, resource);
          await storeVerificationState(state);

          // Log updated summary
          console.log(`${LOG_PREFIX} 🔄 Dynamic resource loaded: ${path}`);
          logVerificationSummary(state);
        }
      })();
    });

    // buffered: true picks up resources that loaded before observer started
    observer.observe({ type: "resource", buffered: true });
  } catch (error) {
    console.warn(`${LOG_PREFIX} Failed to start PerformanceObserver`, error);
  }
}
