# Frontend Verification

A Chrome extension that verifies decentralized app frontends against ENS
contenthash using IPFS CID verification.

## Overview

This project enables trustless verification of web application frontends by:

1. **Resolving ENS contenthash** to get the expected IPFS root CID
2. **Fetching and verifying IPFS DAG** to build a map of expected file CIDs
3. **Computing CIDs for loaded resources** and comparing against expected values
4. **Displaying verification status** to users

## Project Structure

```
.
├── extension/          # Chrome extension (verification logic)
│   ├── src/
│   │   ├── content/    # Content script (resource collection + verification)
│   │   ├── popup/      # Extension popup UI
│   │   ├── shared/     # Types, constants, storage
│   │   └── verification/ # ENS, IPFS DAG, CID computation
│   └── dist/           # Built extension
│
└── demo-page/          # Vite + React demo for testing
    └── src/
```

## Quick Start

### Build Extension

```bash
cd extension
pnpm install
pnpm run build
```

### Load in Chrome

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `extension/dist/`

### Test

1. Navigate to https://peter.blue (ENS domain with IPFS contenthash)
2. Click extension icon → see verification status
3. Check DevTools Console for `[Frontend Verification]` and `[IPFS]` logs

## Demo Page

A demo page is included for local testing:

```bash
cd demo-page
pnpm install
pnpm dev
```

## Trust Model

| Component         | Trust Level  | Notes                            |
| ----------------- | ------------ | -------------------------------- |
| ENS Resolution    | ⚠️ Trusted   | Uses RPC; light client TODO      |
| IPFS Gateways     | ✅ Trustless | Every block verified against CID |
| File Verification | ✅ Trustless | CIDs computed locally            |

## See Also

- [Extension README](./extension/README.md) for detailed documentation
