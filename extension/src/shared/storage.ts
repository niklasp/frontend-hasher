import type { VerificationState } from "../verification/types";
import { LOG_PREFIX } from "./constants";

const VERIFICATION_KEY = "verificationState";

/** Convert VerificationState to storable format (Maps to arrays) */
function serializeVerificationState(state: VerificationState): object {
  return {
    ...state,
    expectedFiles: Array.from(state.expectedFiles.entries()),
    verifiedFiles: Array.from(state.verifiedFiles.entries()),
  };
}

/** Convert stored format back to VerificationState */
function deserializeVerificationState(data: object): VerificationState {
  const raw = data as Record<string, unknown>;
  return {
    domain: raw.domain as string,
    rootCid: raw.rootCid as string,
    expectedFiles: new Map(raw.expectedFiles as [string, string][]),
    verifiedFiles: new Map(raw.verifiedFiles as [string, unknown][]),
    status: raw.status as VerificationState["status"],
    error: raw.error as string | undefined,
    startedAt: raw.startedAt as number,
    completedAt: raw.completedAt as number | undefined,
  } as VerificationState;
}

/** Store verification state in chrome.storage.local */
export async function storeVerificationState(
  state: VerificationState
): Promise<void> {
  try {
    const serialized = serializeVerificationState(state);
    await chrome.storage.local.set({ [VERIFICATION_KEY]: serialized });
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to store verification state:`, error);
  }
}

/** Load verification state from chrome.storage.local */
export async function loadVerificationState(): Promise<VerificationState | null> {
  try {
    const result = await chrome.storage.local.get(VERIFICATION_KEY);
    const data = result[VERIFICATION_KEY];
    if (!data) return null;
    return deserializeVerificationState(data as object);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to load verification state:`, error);
    return null;
  }
}
