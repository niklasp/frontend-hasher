import { importer, type ImportCandidate } from "ipfs-unixfs-importer";
import { MemoryBlockstore } from "blockstore-core";

/** Compute IPFS CID for a single file's bytes */
export async function computeFileCID(bytes: Uint8Array): Promise<string> {
  const blockstore = new MemoryBlockstore();

  const content: ImportCandidate = {
    content: bytes,
  };

  let resultCid: string | null = null;

  for await (const entry of importer([content], blockstore, {
    cidVersion: 1,
    rawLeaves: true,
  })) {
    resultCid = entry.cid.toString();
  }

  if (!resultCid) {
    throw new Error("Failed to compute CID");
  }

  return resultCid;
}

/** Compute CID for a directory of files (for verification of root) */
export async function computeDirectoryCID(
  files: Array<{ path: string; content: Uint8Array }>
): Promise<string> {
  const blockstore = new MemoryBlockstore();

  const candidates: ImportCandidate[] = files
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(({ path, content }) => ({
      path: path.startsWith("/") ? path.slice(1) : path,
      content,
    }));

  let rootCid: string | null = null;

  for await (const entry of importer(candidates, blockstore, {
    wrapWithDirectory: true,
    cidVersion: 1,
    rawLeaves: true,
  })) {
    rootCid = entry.cid.toString();
  }

  if (!rootCid) {
    throw new Error("Failed to compute directory CID");
  }

  return rootCid;
}

/** Normalize a URL to an IPFS-style path */
export function urlToPath(url: string, origin: string): string {
  try {
    const urlObj = new URL(url);

    // Only handle same-origin resources
    if (urlObj.origin !== origin) {
      return url; // Return full URL for cross-origin
    }

    // Get pathname, normalize root to /index.html
    let path = urlObj.pathname;
    if (path === "/" || path === "") {
      path = "/index.html";
    }

    return path;
  } catch {
    return url;
  }
}

/** Check if a URL is same-origin */
export function isSameOrigin(url: string, origin: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.origin === origin;
  } catch {
    return false;
  }
}
