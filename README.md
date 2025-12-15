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

## Demo Page

A Vite + React demo page is included in `../demo-page/` with edge cases for resource detection.

```bash
cd demo-page
pnpm install
pnpm dev      # Dev server at http://localhost:5173
pnpm build    # Production build
pnpm preview  # Preview production build
```

## Test

1. Open any website (e.g. demo page)
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
