import { LOG_PREFIX } from "../shared/constants";
import { storeVerificationState } from "../shared/storage";
import { collectResources } from "./collectors";
import { startResourceObserver } from "./observer";
import {
  clearProcessedUrls,
  clearCollectedResources,
  getCollectedResources,
  setVerificationState,
  getVerificationState,
} from "./state";
import {
  initVerification,
  verifyResource,
  getVerificationSummary,
} from "../verification/verify";
import type { VerificationState } from "../verification/types";

/** Log verification summary with emojis */
export function logVerificationSummary(state: VerificationState): void {
  const summary = getVerificationSummary(state);
  const unloadedCount = summary.totalFiles - summary.loadedFiles;

  const statusEmoji =
    summary.status === "verified"
      ? "✅"
      : summary.status === "failed"
        ? "❌"
        : "ℹ️";

  console.log(
    `${LOG_PREFIX} ${statusEmoji} Status: ${summary.status.toUpperCase()}`
  );
  console.log(
    `${LOG_PREFIX}    ✅ ${summary.verifiedFiles} verified | ❌ ${summary.failedFiles} failed | 📁 ${summary.totalFiles} in deployment${unloadedCount > 0 ? ` (${unloadedCount} not loaded)` : ""}`
  );
}

/** Run verification against ENS contenthash */
async function runVerification(): Promise<void> {
  clearProcessedUrls();
  clearCollectedResources();

  const domain = window.location.hostname;
  console.log(`${LOG_PREFIX} 🔍 Starting verification for: ${domain}`);

  // Collect resources first
  await collectResources();

  // Initialize verification (ENS → IPFS DAG)
  const state = await initVerification(domain);
  setVerificationState(state);

  if (state.status === "not-ens" || state.status === "failed") {
    console.log(`${LOG_PREFIX} ℹ️ Verification not available:`, state.error);
    await storeVerificationState(state);
    return;
  }

  // Verify collected resources
  const resources = getCollectedResources();
  console.log(
    `${LOG_PREFIX} 🔄 Verifying ${resources.size} collected resources...`
  );

  for (const resource of resources.values()) {
    await verifyResource(state, resource);
  }

  // Store final state
  await storeVerificationState(state);

  // Log summary
  logVerificationSummary(state);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "refresh") {
    runVerification().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === "getVerification") {
    const state = getVerificationState();
    sendResponse({
      state,
      summary: state ? getVerificationSummary(state) : null,
    });
    return false;
  }
});

// Run once when the content script is injected
async function init(): Promise<void> {
  await runVerification();
  startResourceObserver();
}

void init();
