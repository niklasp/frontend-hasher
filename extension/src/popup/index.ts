import type {
  VerificationState,
  FileVerification,
} from "../verification/types";
import { loadVerificationState } from "../shared/storage";
import { getVerificationSummary } from "../verification/verify";
import {
  renderVerificationStatus,
  renderVerificationList,
  renderLoading,
} from "./render";

const VERIFICATION_KEY = "verificationState";

/** Deserialize state from storage format */
function deserializeState(data: unknown): VerificationState | null {
  if (!data || typeof data !== "object") return null;

  const raw = data as Record<string, unknown>;

  try {
    return {
      domain: raw.domain as string,
      rootCid: raw.rootCid as string,
      expectedFiles: new Map(raw.expectedFiles as [string, string][]),
      verifiedFiles: new Map(raw.verifiedFiles as [string, FileVerification][]),
      status: raw.status as VerificationState["status"],
      error: raw.error as string | undefined,
      startedAt: raw.startedAt as number,
      completedAt: raw.completedAt as number | undefined,
    };
  } catch {
    return null;
  }
}

/** Load verification state and render it */
async function loadAndRenderVerification(): Promise<void> {
  try {
    const state = await loadVerificationState();
    if (state) {
      const summary = getVerificationSummary(state);
      renderVerificationStatus(summary);
      renderVerificationList(state);
    } else {
      renderVerificationStatus(null);
      renderVerificationList(null);
    }
  } catch (error) {
    console.error("[Popup] Error loading verification:", error);
    renderVerificationStatus(null);
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

    await chrome.tabs.sendMessage(tab.id, { action: "refresh" });
    return true;
  } catch (error) {
    console.warn("[Popup] Could not send refresh message:", error);
    return false;
  }
}

/** Refresh verification by asking content script to rebuild */
async function refreshVerification(): Promise<void> {
  renderLoading();

  const success = await sendRebuildMessage();

  if (success) {
    await loadAndRenderVerification();
  } else {
    await loadAndRenderVerification();
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  loadAndRenderVerification();

  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshVerification);
  }
});

// Listen for storage changes to update in real-time
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[VERIFICATION_KEY]) {
    const state = deserializeState(changes[VERIFICATION_KEY].newValue);
    if (state) {
      const summary = getVerificationSummary(state);
      renderVerificationStatus(summary);
      renderVerificationList(state);
    }
  }
});
