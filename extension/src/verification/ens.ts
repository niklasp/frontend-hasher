import { createPublicClient, http, namehash, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { CID } from "multiformats/cid";
import { base32 } from "multiformats/bases/base32";
import type { ENSResult } from "./types";
import { LOG_PREFIX } from "../shared/constants";

const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const;

const REGISTRY_ABI = [
  {
    name: "resolver",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const RESOLVER_ABI = [
  {
    name: "contenthash",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes" }],
  },
] as const;

/** Decode ENSIP-7 contenthash to IPFS CID string */
function decodeContenthash(contenthash: Hex): string | null {
  if (!contenthash || contenthash === "0x") return null;

  const bytes = hexToBytes(contenthash);

  // Check for IPFS (0xe3, 0x01)
  if (bytes[0] === 0xe3 && bytes[1] === 0x01) {
    // Extract CID bytes (skip namespace prefix)
    const cidBytes = bytes.slice(2);
    const cid = CID.decode(cidBytes);
    return cid.toString(base32);
  }

  // Check for Swarm (0xe4, 0x01)
  if (bytes[0] === 0xe4 && bytes[1] === 0x01) {
    console.warn(`${LOG_PREFIX} Swarm contenthash not yet supported`);
    return null;
  }

  console.warn(`${LOG_PREFIX} Unknown contenthash format:`, contenthash);
  return null;
}

/** Convert hex string to Uint8Array */
function hexToBytes(hex: Hex): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Create viem public client for Sepolia */
function createClient() {
  return createPublicClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC),
  });
}

/** Resolve ENS domain to contenthash CID */
export async function resolveENSContenthash(
  domain: string
): Promise<ENSResult> {
  const client = createClient();
  const node = namehash(domain);

  try {
    // Get resolver address
    const resolverAddress = await client.readContract({
      address: ENS_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "resolver",
      args: [node],
    });

    if (
      !resolverAddress ||
      resolverAddress === "0x0000000000000000000000000000000000000000"
    ) {
      return {
        domain,
        rootCid: null,
        owner: null,
        error: "No resolver set for this domain",
      };
    }

    // Get owner
    const owner = await client.readContract({
      address: ENS_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "owner",
      args: [node],
    });

    // Get contenthash
    const contenthash = await client.readContract({
      address: resolverAddress,
      abi: RESOLVER_ABI,
      functionName: "contenthash",
      args: [node],
    });

    const rootCid = decodeContenthash(contenthash as Hex);

    return {
      domain,
      rootCid,
      owner: owner as string,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`${LOG_PREFIX} ENS resolution failed:`, message);
    return {
      domain,
      rootCid: null,
      owner: null,
      error: message,
    };
  }
}

/** Check if a domain might be ENS-registered */
export function isENSCompatibleDomain(domain: string): boolean {
  // ENS supports .eth domains and DNS domains with DNSSEC
  return domain.endsWith(".eth") || domain.includes(".");
}

/** Normalize domain for ENS lookup (strip www prefix) */
export function normalizeDomain(domain: string): string {
  // Remove www. prefix - ENS typically registers the apex domain
  if (domain.startsWith("www.")) {
    return domain.slice(4);
  }
  return domain;
}
