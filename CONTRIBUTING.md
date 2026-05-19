# Contributing

## Development Setup

```bash
git clone git@github.com:max-rousseau/har-analyser.git
cd har-analyser
npm install
npm run dev
```

`npm run dev` starts Electron with hot module reload for the renderer and live-reload for the main / preload processes.

### Electron postinstall caveat

On some networks the post-install download of the Electron binary (`node_modules/electron/dist/`) can be blocked or skipped. If `npm run dev` errors with `Electron uninstall`, finish the install manually:

```bash
node node_modules/electron/install.js
```

## Project layout

Standard `electron-vite` shape:

```
src/
├── main/        # Electron main process (Node)
├── preload/     # contextBridge IPC surface
└── renderer/
    └── src/     # React app — Vite + Tailwind v4
```

- HAR data model + parsing: `src/renderer/src/lib/har.ts`
- HAR spec reference: `docs/har-spec.md`
- Column widths / visibility / aliases hook: `src/renderer/src/hooks/use-column-widths.ts`

## Testing

```bash
npm test
npm run test:watch
```

Vitest runs in jsdom (`vitest.config.ts`). UI tests use `@testing-library/react`; matchers come from `@testing-library/jest-dom`.

## Typechecking

```bash
npm run typecheck         # node + web projects
npm run typecheck:node
npm run typecheck:web
```

`tsconfig.node.json` covers `src/main` + `src/preload`; `tsconfig.web.json` covers `src/renderer`. They are referenced from the root `tsconfig.json`.

## Packaging

```bash
npm run package:mac:dev   # unsigned .dmg + .zip — local install only
npm run package:mac       # signed + notarized release (requires Apple creds)
```

Both targets emit Apple-Silicon-only artifacts to `release/`.

## Release pipeline

CI: `.github/workflows/release.yml`. Tag-driven, mirrors the markdownpad pipeline.

To cut a release:

```bash
# bump the version, then tag
npm version 1.1.0
git push --follow-tags
```

Pushing a `v*` tag triggers the workflow on a `macos-14` (arm64) runner: `npm ci` → typecheck → vitest → `electron-vite build` → `electron-builder --mac --arm64 --publish always`.

The signing and notarization step runs in the `release` GitHub Environment, which is gated on required-reviewer approval — the workflow pauses on the "Sign, notarize, publish" step until a reviewer approves it. This prevents accidental tag pushes from leaking signing material.

### Required GitHub Secrets

Configure these in the **`release`** environment (Repository → Settings → Environments → release):

| Secret name              | Contents                                                                          |
| ------------------------ | --------------------------------------------------------------------------------- |
| `MAC_CERTIFICATE`        | Base64-encoded Developer ID Application `.p12` certificate (`base64 -i cert.p12`) |
| `MAC_CERTIFICATE_PASSWORD` | Password set when the `.p12` was exported                                       |
| `APPLE_ID`               | Apple ID email used for notarization                                              |
| `APPLE_ID_PASSWORD`      | App-Specific Password generated at appleid.apple.com                              |
| `APPLE_TEAM_ID`          | Ten-character Team ID from the Apple Developer portal                             |

`GH_TOKEN` is supplied automatically by `secrets.GITHUB_TOKEN`.

### Packaging notes

- The packaged binary has the Electron `EnableCookieEncryption` fuse disabled (`build/afterPack.cjs`) — the app has no credentials to encrypt, so the first-launch Keychain prompt is gratuitous.
- `build/icon.png` is referenced from `src/main/index.ts` in dev only; in packaged builds electron-builder bakes the icon into the `.app` bundle. Drop a 1024×1024 PNG at that path before packaging if you want a custom dock icon in dev.
- `.har` files are gitignored — large captures should never land in the repo.
