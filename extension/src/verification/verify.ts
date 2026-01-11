import type {
  VerificationState,
  VerificationSummary,
  FileVerification,
  CollectedResource,
} from "./types";
import {
  resolveENSContenthash,
  isENSCompatibleDomain,
  normalizeDomain,
} from "./ens";
import { fetchDirectoryDAG, buildFileMap } from "./ipfs-dag";
import { computeFileCID, urlToPath, isSameOrigin } from "./cid";
import { LOG_PREFIX } from "../shared/constants";

/** Initialize verification for a domain */
export async function initVerification(
  domain: string
): Promise<VerificationState> {
  // Normalize domain (strip www prefix)
  const normalizedDomain = normalizeDomain(domain);

  const state: VerificationState = {
    domain: normalizedDomain,
    rootCid: "",
    expectedFiles: new Map(),
    verifiedFiles: new Map(),
    status: "loading",
    startedAt: Date.now(),
  };

  // Check if domain could be ENS-registered
  if (!isENSCompatibleDomain(normalizedDomain)) {
    state.status = "not-ens";
    state.error = "Domain is not ENS-compatible";
    return state;
  }

  try {
    // Resolve ENS to get root CID
    console.log(`${LOG_PREFIX} Resolving ENS:`, normalizedDomain);
    const ensResult = await resolveENSContenthash(normalizedDomain);

    if (!ensResult.rootCid) {
      state.status = "not-ens";
      state.error = ensResult.error || "No contenthash found";
      return state;
    }

    state.rootCid = ensResult.rootCid;

    // Fetch IPFS directory structure
    const entries = await fetchDirectoryDAG(state.rootCid);
    state.expectedFiles = buildFileMap(entries);

    state.status = "partial";
    return state;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`${LOG_PREFIX} Initialization failed:`, message);
    state.status = "failed";
    state.error = message;
    return state;
  }
}

/** Verify a single resource against expected CID */
export async function verifyResource(
  state: VerificationState,
  resource: CollectedResource
): Promise<boolean> {
  const { path, bytes } = resource;

  // Get expected CID
  const expectedCid = state.expectedFiles.get(path);

  if (!expectedCid) {
    // File not in expected list - might be external or unknown
    console.log(`${LOG_PREFIX} Unknown file (not in DAG):`, path);
    return false;
  }

  try {
    // Compute actual CID
    const actualCid = await computeFileCID(bytes);

    const verified = actualCid === expectedCid;
    const fileVerification: FileVerification = {
      path,
      expectedCid,
      actualCid,
      verified,
      loaded: true,
    };

    state.verifiedFiles.set(path, fileVerification);

    if (verified) {
      console.log(`${LOG_PREFIX} ✅ Verified:`, path);
    } else {
      console.warn(
        `${LOG_PREFIX} ❌ CID mismatch:`,
        path,
        "\n  Expected:",
        expectedCid,
        "\n  Actual:",
        actualCid
      );
    }

    // Update overall status
    updateStatus(state);

    return verified;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to verify:`, path, error);

    const fileVerification: FileVerification = {
      path,
      expectedCid,
      actualCid: null,
      verified: false,
      loaded: true,
    };

    state.verifiedFiles.set(path, fileVerification);
    updateStatus(state);

    return false;
  }
}

/** Update overall verification status based on file results */
function updateStatus(state: VerificationState): void {
  const verified = Array.from(state.verifiedFiles.values());
  const loadedCount = verified.length;
  const verifiedCount = verified.filter((f) => f.verified).length;
  const failedCount = verified.filter((f) => f.loaded && !f.verified).length;

  if (failedCount > 0) {
    state.status = "failed";
  } else if (
    loadedCount === state.expectedFiles.size &&
    verifiedCount === loadedCount
  ) {
    state.status = "verified";
    state.completedAt = Date.now();
  } else if (verifiedCount > 0) {
    state.status = "partial";
  } else {
    state.status = "loading";
  }
}

/** Get verification summary for display */
export function getVerificationSummary(
  state: VerificationState
): VerificationSummary {
  const verified = Array.from(state.verifiedFiles.values());

  return {
    domain: state.domain,
    rootCid: state.rootCid,
    status: state.status,
    totalFiles: state.expectedFiles.size,
    loadedFiles: verified.filter((f) => f.loaded).length,
    verifiedFiles: verified.filter((f) => f.verified).length,
    failedFiles: verified.filter((f) => f.loaded && !f.verified).length,
    error: state.error,
  };
}

/** Convert collected resources to the format needed for verification */
export function prepareResource(
  url: string,
  bytes: Uint8Array,
  origin: string
): CollectedResource | null {
  // Skip cross-origin resources
  if (!isSameOrigin(url, origin)) {
    return null;
  }

  const path = urlToPath(url, origin);

  return {
    path,
    url,
    bytes,
    size: bytes.length,
  };
}
