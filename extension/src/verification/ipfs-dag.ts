import * as dagPb from "@ipld/dag-pb";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import type { FileEntry } from "./types";
import { LOG_PREFIX } from "../shared/constants";

const IPFS_GATEWAYS = [
  "https://ipfs.io",
  "https://dweb.link",
  "https://cloudflare-ipfs.com",
];

/** Verify that bytes hash to the expected CID */
async function verifyBlock(
  bytes: Uint8Array,
  expectedCid: string
): Promise<boolean> {
  const parsedCid = CID.parse(expectedCid);
  const hash = await sha256.digest(bytes);
  const computedCid = CID.create(parsedCid.version, parsedCid.code, hash);

  const matches = computedCid.toString() === parsedCid.toString();

  if (!matches) {
    console.error(
      `${LOG_PREFIX} Block verification FAILED!\n` +
        `  Expected: ${expectedCid}\n` +
        `  Computed: ${computedCid.toString()}`
    );
  }

  return matches;
}

/** Fetch IPFS block as raw bytes */
async function fetchBlock(cid: string, gateway: string): Promise<Uint8Array> {
  const url = `${gateway}/ipfs/${cid}?format=raw`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch block: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/** Fetch IPFS block with gateway fallback AND verify integrity */
async function fetchAndVerifyBlock(cid: string): Promise<Uint8Array> {
  let lastError: Error | null = null;

  for (const gateway of IPFS_GATEWAYS) {
    try {
      const bytes = await fetchBlock(cid, gateway);

      const isValid = await verifyBlock(bytes, cid);
      if (!isValid) {
        throw new Error(`Gateway ${gateway} returned invalid block for ${cid}`);
      }

      return bytes;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error("All IPFS gateways failed");
}

/** Check if a DAG-PB node is a directory (has Links with names) */
function isDirectory(node: dagPb.PBNode): boolean {
  return node.Links.length > 0 && node.Links.some((link) => link.Name);
}

/** Recursively fetch directory structure from IPFS with verification */
async function traverseDirectory(
  cid: string,
  basePath: string,
  entries: FileEntry[]
): Promise<void> {
  const bytes = await fetchAndVerifyBlock(cid);

  let node: dagPb.PBNode;
  try {
    node = dagPb.decode(bytes);
  } catch {
    entries.push({
      path: basePath || "/",
      cid,
      size: bytes.length,
      isDirectory: false,
    });
    return;
  }

  if (!isDirectory(node)) {
    entries.push({
      path: basePath || "/",
      cid,
      size: node.Data?.length || 0,
      isDirectory: false,
    });
    return;
  }

  for (const link of node.Links) {
    if (!link.Name) continue;

    const childPath = basePath ? `${basePath}/${link.Name}` : `/${link.Name}`;
    const childCid = link.Hash.toString();

    try {
      const childBytes = await fetchAndVerifyBlock(childCid);

      let childNode: dagPb.PBNode;
      try {
        childNode = dagPb.decode(childBytes);
      } catch {
        entries.push({
          path: childPath,
          cid: childCid,
          size: link.Tsize || 0,
          isDirectory: false,
        });
        continue;
      }

      if (isDirectory(childNode)) {
        await traverseDirectory(childCid, childPath, entries);
      } else {
        entries.push({
          path: childPath,
          cid: childCid,
          size: link.Tsize || 0,
          isDirectory: false,
        });
      }
    } catch (error) {
      console.warn(`${LOG_PREFIX} Failed to fetch ${childPath}:`, error);
      entries.push({
        path: childPath,
        cid: childCid,
        size: link.Tsize || 0,
        isDirectory: false,
      });
    }
  }
}

/** Fetch all files from an IPFS directory CID (with verification) */
export async function fetchDirectoryDAG(rootCid: string): Promise<FileEntry[]> {
  console.log(`${LOG_PREFIX} Fetching IPFS DAG...`);
  console.log(`${LOG_PREFIX} Root CID: ${rootCid}`);

  const entries: FileEntry[] = [];
  await traverseDirectory(rootCid, "", entries);

  // Build a clean object for logging
  const expectedFiles: Record<string, string> = {};
  for (const entry of entries) {
    if (!entry.isDirectory) {
      expectedFiles[entry.path] = entry.cid;
    }
  }

  const fileCount = Object.keys(expectedFiles).length;
  console.log(`${LOG_PREFIX} Expected ${fileCount} files:`, expectedFiles);

  return entries;
}

/** Build a map of path → CID for quick lookup */
export function buildFileMap(entries: FileEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.isDirectory) {
      map.set(entry.path, entry.cid);
    }
  }
  return map;
}
