/** Verification status for the entire page */
export type VerificationStatus =
  | "pending"
  | "loading"
  | "verified"
  | "partial"
  | "failed"
  | "not-ens";

/** Result of ENS resolution */
export interface ENSResult {
  domain: string;
  rootCid: string | null;
  owner: string | null;
  error?: string;
}

/** Single file entry from IPFS DAG */
export interface FileEntry {
  path: string;
  cid: string;
  size: number;
  isDirectory: boolean;
}

/** Verification result for a single file */
export interface FileVerification {
  path: string;
  expectedCid: string;
  actualCid: string | null;
  verified: boolean;
  loaded: boolean;
}

/** Complete verification state for a page */
export interface VerificationState {
  domain: string;
  rootCid: string;
  expectedFiles: Map<string, string>;
  verifiedFiles: Map<string, FileVerification>;
  status: VerificationStatus;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

/** Summary for display in popup */
export interface VerificationSummary {
  domain: string;
  rootCid: string;
  status: VerificationStatus;
  totalFiles: number;
  loadedFiles: number;
  verifiedFiles: number;
  failedFiles: number;
  error?: string;
}

/** Collected resource with bytes for CID computation */
export interface CollectedResource {
  path: string;
  url: string;
  bytes: Uint8Array;
  size: number;
}
