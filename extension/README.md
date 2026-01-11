# Frontend Verification Extension

Chrome extension (Manifest V3) that verifies decentralized app frontends against
ENS contenthash using IPFS CID verification.

## Features

- **ENS Resolution**: Resolves domain contenthash from ENS (Sepolia)
- **IPFS DAG Traversal**: Fetches and verifies directory structure from IPFS
- **Block Verification**: Cryptographically verifies each IPFS block matches its
  CID
- **CID Comparison**: Computes CID for loaded resources and compares against
  expected
- **Dynamic Loading**: Verifies code-split chunks and lazily loaded resources
- **Gateway Fallback**: Tries multiple IPFS gateways with verification

## Trust Model

```
ENS (Sepolia RPC)     →  Root CID          ⚠️ Trusts RPC (light client TODO)
IPFS Gateways         →  DAG blocks        ✅ Trustless (blocks verified)
Loaded Resources      →  File verification ✅ Trustless (CIDs computed locally)
```

**Key insight**: IPFS gateways are untrusted transports. Every block fetched is
verified by computing its hash and comparing to the expected CID. A malicious
gateway cannot serve fake content.

## Verification Flow

1. User navigates to `peter.blue`
2. Extension resolves ENS domain → gets contenthash (root CID)
3. Extension fetches IPFS DAG, **verifying each block**
4. Extension builds map of `path → expected CID`
5. As resources load, extension computes their CID
6. Extension compares computed vs expected CID
7. Shows status: ✅ Verified / ⏳ Partial / ❌ Failed

## Build

```bash
pnpm install
pnpm run build
```

Output: `dist/` (manifest.json, content.js, popup.js, popup.html)

## Install in Chrome

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `dist/`

## Test

1. Navigate to https://peter.blue
2. Click extension icon → see verification status
3. Check DevTools Console for `[Frontend Verification]` and `[IPFS]` logs

Expected logs:

```
[Frontend Verification] Resolving ENS: peter.blue
[IPFS] Fetching and verifying directory DAG for: bafybeig...
[IPFS] ✅ Block verified: bafybeig...
[Frontend Verification] ✅ Verified: /index.html
```

## Commands

| Command              | Description         |
| -------------------- | ------------------- |
| `pnpm run build`     | Build extension     |
| `pnpm run typecheck` | TypeScript checking |

## Structure

```
src/
├── content/          # Content script
│   ├── index.ts      # Entry point, orchestration
│   ├── collectors.ts # Resource collection
│   ├── observer.ts   # PerformanceObserver for dynamic loads
│   └── hash.ts       # Fetch and hash utilities
├── popup/            # Extension popup UI
│   ├── index.ts      # Popup logic
│   ├── render.ts     # UI rendering
│   └── popup.html    # Popup markup
├── shared/           # Shared utilities
│   ├── types.ts      # TypeScript interfaces
│   ├── storage.ts    # Chrome storage helpers
│   └── constants.ts  # Constants
└── verification/     # Core verification
    ├── ens.ts        # ENS resolution (viem)
    ├── ipfs-dag.ts   # IPFS DAG fetch + verification
    ├── cid.ts        # CID computation
    ├── verify.ts     # Verification orchestration
    └── types.ts      # Verification types
```

## Dependencies

| Package              | Purpose                              |
| -------------------- | ------------------------------------ |
| viem                 | ENS resolution, Ethereum interaction |
| multiformats         | CID encoding/decoding, hashing       |
| @ipld/dag-pb         | IPFS DAG-PB block parsing            |
| ipfs-unixfs-importer | CID computation for files            |
| blockstore-core      | In-memory blockstore                 |

## TODO

- [ ] Light client for ENS (replace RPC trust)
- [ ] P2P IPFS retrieval (replace gateway trust for transport)
- [ ] Signature verification (deployer attestation)
- [ ] If a provider does not support DNSSEC we can find several workarounds
  (e.g. Cloudflare or eth.limo)
