import type {
  VerificationState,
  VerificationSummary,
} from "../verification/types";

/** Escape HTML special characters */
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/** Truncate CID for display */
function truncateCid(cid: string, length = 20): string {
  if (cid.length <= length * 2) return cid;
  return `${cid.slice(0, length)}...${cid.slice(-length)}`;
}

/** Get status badge HTML */
function getStatusBadge(status: VerificationSummary["status"]): string {
  const badges: Record<string, { class: string; icon: string; text: string }> =
    {
      verified: { class: "verified", icon: "✅", text: "Verified" },
      partial: { class: "partial", icon: "⏳", text: "Partial" },
      failed: { class: "failed", icon: "❌", text: "Failed" },
      loading: { class: "loading", icon: "⏳", text: "Loading..." },
      pending: { class: "loading", icon: "⏳", text: "Pending..." },
      "not-ens": { class: "not-ens", icon: "ℹ️", text: "Not ENS" },
    };

  const badge = badges[status] || badges.loading;
  return `
    <div class="verification-badge ${badge.class}">
      <span>${badge.icon}</span> ${badge.text}
    </div>
  `;
}

/** Render verification status section */
export function renderVerificationStatus(
  summary: VerificationSummary | null
): void {
  const container = document.getElementById("verification-status");
  if (!container) return;

  if (!summary) {
    container.innerHTML = `
      <div class="verification-badge loading">
        <span>⏳</span> Checking...
      </div>
    `;
    return;
  }

  const badge = getStatusBadge(summary.status);
  const statsHtml =
    summary.status !== "not-ens"
      ? `
    <div class="verification-stats">
      <div class="stat verified">✅ ${summary.verifiedFiles} verified</div>
      <div class="stat failed">❌ ${summary.failedFiles} failed</div>
      <div class="stat pending">⏳ ${summary.totalFiles - summary.loadedFiles} pending</div>
    </div>
  `
      : "";

  const errorHtml = summary.error
    ? `
    <div class="verification-info" style="color: #fca5a5; margin-top: 8px;">
      ${escapeHtml(summary.error)}
    </div>
  `
    : "";

  container.innerHTML = `
    ${badge}
    <div class="verification-info">
      <span class="domain">${escapeHtml(summary.domain)}</span>
      ${summary.rootCid ? `<div class="cid">CID: ${truncateCid(summary.rootCid)}</div>` : ""}
    </div>
    ${statsHtml}
    ${errorHtml}
  `;
}

/** Render verification file list */
export function renderVerificationList(state: VerificationState | null): void {
  const container = document.getElementById("verification-content");
  if (!container) return;

  if (!state || state.status === "not-ens") {
    container.innerHTML = `
      <div class="no-data">
        No ENS verification available for this domain.<br />
        ${state?.error ? escapeHtml(state.error) : "Domain may not have contenthash set."}
      </div>
    `;
    return;
  }

  if (state.expectedFiles.size === 0) {
    container.innerHTML = `
      <div class="no-data">
        No files found in IPFS directory.
      </div>
    `;
    return;
  }

  // Sort files by path
  const allPaths = Array.from(state.expectedFiles.keys()).sort();

  const listHtml = allPaths
    .map((path) => {
      const verification = state.verifiedFiles.get(path);
      const expectedCid = state.expectedFiles.get(path) || "";

      let statusClass = "pending";
      let statusIcon = "⏳";
      let statusText = "Not loaded";

      if (verification?.loaded) {
        if (verification.verified) {
          statusClass = "verified";
          statusIcon = "✅";
          statusText = "Verified";
        } else {
          statusClass = "failed";
          statusIcon = "❌";
          statusText = "CID mismatch";
        }
      }

      return `
        <div class="file-item ${statusClass}">
          <div class="file-path">
            <span class="status-icon">${statusIcon}</span>
            ${escapeHtml(path)}
          </div>
          <div class="file-hash">${truncateCid(expectedCid)}</div>
          <div class="file-meta">
            <span>${statusText}</span>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `<div class="file-list">${listHtml}</div>`;
}

/** Render loading state */
export function renderLoading(): void {
  const container = document.getElementById("verification-status");
  if (!container) return;
  container.innerHTML = `
    <div class="verification-badge loading">
      <span>⏳</span> Refreshing...
    </div>
  `;
}
