import { LOG_PREFIX } from "../shared/constants";
import { storeManifest } from "../shared/storage";
import { collectResources } from "./collectors";
import { createEmptyManifest } from "./manifest";
import { startResourceObserver } from "./observer";
import {
  clearProcessedUrls,
  getCurrentManifest,
  setCurrentManifest,
} from "./state";

/** Build the manifest and store it in chrome.storage */
async function buildAndStoreManifest(): Promise<void> {
  clearProcessedUrls();
  const manifest = createEmptyManifest();

  setCurrentManifest(manifest);
  await collectResources(manifest);

  console.log(`${LOG_PREFIX} Page manifest object`, manifest);
  await storeManifest(manifest);
  console.log(`${LOG_PREFIX} Manifest stored in chrome.storage.local`);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "rebuildManifest") {
    buildAndStoreManifest().then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }

  if (message.action === "getManifest") {
    sendResponse({ manifest: getCurrentManifest() });
    return false;
  }
});

// Run once when the content script is injected
void buildAndStoreManifest();
startResourceObserver();
