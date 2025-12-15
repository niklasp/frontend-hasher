import type { PageManifest } from "../shared/types";

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Escape HTML special characters */
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/** Get DOM elements */
function getElements(): { content: HTMLElement; stats: HTMLElement } | null {
  const content = document.getElementById("content");
  const stats = document.getElementById("stats");
  if (!content || !stats) return null;
  return { content, stats };
}

/** Render empty state */
function renderEmptyState(content: HTMLElement, stats: HTMLElement): void {
  content.innerHTML = `
    <div class="no-data">
      No manifest data available.<br />
      Navigate to a page and wait for resources to load.
    </div>
  `;
  stats.textContent = "No data";
}

/** Render error state */
export function renderError(message: string): void {
  const els = getElements();
  if (!els) return;
  els.content.innerHTML = `<div class="no-data">${escapeHtml(message)}</div>`;
  els.stats.textContent = "Error";
}

/** Render loading state */
export function renderLoading(): void {
  const els = getElements();
  if (!els) return;
  els.stats.textContent = "Refreshing...";
}

/** Render the manifest data */
export function renderManifest(manifest: PageManifest | null): void {
  const els = getElements();
  if (!els) return;

  if (!manifest || Object.keys(manifest.entries).length === 0) {
    renderEmptyState(els.content, els.stats);
    return;
  }

  const entries = Object.entries(manifest.entries);
  const totalSize = entries.reduce(
    (sum, [, entry]) => sum + entry.sizeBytes,
    0,
  );

  els.stats.innerHTML = `
    <strong>${entries.length}</strong> files detected · 
    <strong>${formatBytes(totalSize)}</strong> total · 
    ${new Date(manifest.createdAt).toLocaleTimeString()}
  `;

  const listHtml = entries
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([path, entry]) => {
      return `
        <div class="file-item">
          <div class="file-path">${escapeHtml(path)}</div>
          <div class="file-hash">${entry.hashSha256}</div>
          <div class="file-meta">
            <span class="kind ${entry.kind}">${entry.kind}</span>
            <span>${formatBytes(entry.sizeBytes)}</span>
            <span>${entry.contentType || "unknown"}</span>
          </div>
        </div>
      `;
    })
    .join("");

  els.content.innerHTML = `<div class="file-list">${listHtml}</div>`;
}
