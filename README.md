# Page Resource Hash Logger

Chrome extension (Manifest V3) that builds a **tamper-detection manifest** of all loaded page resources with SHA-256 hashes.

## Build

```bash
pnpm install
pnpm run build
```

Output goes to `dist/` (manifest.json, content.js, popup.js, popup.html).

## Load in Chrome

1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** → select the `dist/` folder

## Test

1. Open any website
2. Click the extension icon → see the resource manifest
3. Open DevTools Console → see `[HashLogger]` logs

## Dev Commands

| Command              | Description                   |
| -------------------- | ----------------------------- |
| `pnpm run build`     | Build content + popup scripts |
| `pnpm run typecheck` | Run TypeScript type checking  |

## Structure

```
src/
├── shared/      # Types, constants, storage helpers
├── content/     # Content script (resource collection)
└── popup/       # Extension popup UI
```
