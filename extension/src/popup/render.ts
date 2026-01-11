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
      failed: { class: "failed", icon: "❌", text: "Failed" },
      loading: { class: "loading", icon: "⏳", text: "Loading..." },
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
  const unloadedCount = summary.totalFiles - summary.loadedFiles;
  const statsHtml =
    summary.status !== "not-ens"
      ? `
    <div class="verification-stats">
      <div class="stat verified">✅ ${summary.verifiedFiles} verified</div>
      <div class="stat failed">❌ ${summary.failedFiles} failed</div>
      <div class="stat info">📁 ${summary.totalFiles} in deployment${unloadedCount > 0 ? ` (${unloadedCount} not loaded)` : ""}</div>
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

  // Get file status for sorting
  type FileStatus = "failed" | "verified" | "pending";
  const verifiedFiles = state.verifiedFiles;
  function getFileStatus(path: string): FileStatus {
    const verification = verifiedFiles.get(path);
    if (!verification?.loaded) return "pending";
    return verification.verified ? "verified" : "failed";
  }

  // Priority order: failed (0) → verified (1) → pending (2)
  const statusPriority: Record<FileStatus, number> = {
    failed: 0,
    verified: 1,
    pending: 2,
  };

  // Sort files by priority, then by path
  const allPaths = Array.from(state.expectedFiles.keys()).sort((a, b) => {
    const priorityA = statusPriority[getFileStatus(a)];
    const priorityB = statusPriority[getFileStatus(b)];
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.localeCompare(b);
  });

  const listHtml = allPaths
    .map((path) => {
      const verification = state.verifiedFiles.get(path);
      const expectedCid = state.expectedFiles.get(path) || "";
      const status = getFileStatus(path);

      const statusConfig = {
        failed: { class: "failed", icon: "❌", text: "CID mismatch" },
        verified: { class: "verified", icon: "✅", text: "Verified" },
        pending: { class: "pending", icon: "📁", text: "Not loaded" },
      };

      const {
        class: statusClass,
        icon: statusIcon,
        text: statusText,
      } = statusConfig[status];

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
