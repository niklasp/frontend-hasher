import type { PageManifest } from "../shared/types";
import { loadManifest as loadManifestFromStorage } from "../shared/storage";
import { STORAGE_KEY } from "../shared/constants";
import { renderManifest, renderError, renderLoading } from "./render";

/** Load manifest from storage and render it */
async function loadAndRenderManifest(): Promise<void> {
  try {
    const manifest = await loadManifestFromStorage();
    renderManifest(manifest);
  } catch (error) {
    console.error("[Popup] Error loading manifest:", error);
    renderError("Error loading manifest data.");
  }
}

/** Send rebuild message to content script and wait for completion */
async function sendRebuildMessage(): Promise<boolean> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      console.warn("[Popup] No active tab found");
      return false;
    }

    // sendMessage returns when the content script calls sendResponse
    await chrome.tabs.sendMessage(tab.id, { action: "rebuildManifest" });
    return true;
  } catch (error) {
    console.warn("[Popup] Could not send refresh message:", error);
    return false;
  }
}

/** Refresh the manifest by asking content script to rebuild */
async function refreshManifest(): Promise<void> {
  renderLoading();

  const success = await sendRebuildMessage();

  if (success) {
    // Content script updates storage, which triggers our listener below
    // But also load directly in case the listener fires before we're ready
    await loadAndRenderManifest();
  } else {
    // Fallback: just reload from storage
    await loadAndRenderManifest();
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  loadAndRenderManifest();

  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshManifest);
  }
});

// Listen for storage changes to update in real-time
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[STORAGE_KEY]) {
    renderManifest(changes[STORAGE_KEY].newValue as PageManifest);
  }
});
