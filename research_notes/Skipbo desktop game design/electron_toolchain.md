# Electron + TypeScript desktop game toolchain (macOS + Windows), as of 2026-10-30

Provenance legend: "[npm]" = `npm view` run against the live registry on 2026-10-30 on this machine (Node v24.14.0, npm 11.9.0, darwin arm64). Items marked UNVERIFIED come from my own background knowledge and were not confirmed against a current source in this session.

## 1. Versions, compatibility, scaffold, security

### Takeaway
Use Electron 45.x (latest stable, Chromium M156, Node 24.22) with electron-vite 6 + Vite 8, Vitest 5, Playwright 1.64, and keep contextIsolation/sandbox on (both defaults). TypeScript 7 (native Go compiler) went stable in July 2026 but lacks a stable programmatic API until 7.1, so TypeScript 6 (or `@typescript/typescript6` alongside) is the safer pin if any tool imports `typescript`.

### Cited Findings
- Registry "latest" tags on 2026-10-30: electron 45.2.0, typescript 7.0.2, vite 8.3.5, electron-vite 6.0.0, vitest 5.0.5, @playwright/test 1.64.1, electron-builder 26.18.0 (dist-tag `v26` = 26.18.1, `next` = 27.0.0-alpha.14), pixi.js 8.22.0, gsap 3.15.0, electron-store 12.0.0, @electron/notarize 3.1.2, @electron/fuses 2.1.3, @vitejs/plugin-react 6.1.2, vite-plugin-electron 1.1.2, zustand 5.0.16, motion 14.9.0, howler 2.2.4 — [npm registry](https://registry.npmjs.org/) (via `npm view`)
- Electron release schedule: 42.0.0 stable May 5 2026 (EOL Oct 20 2026, Chromium M148, Node 24.15.0); 43 Jun 29 2026 (EOL Jan 5 2027, M150, Node 24.17.0); 44 Aug 24 2026 (EOL Mar 2 2027, M152, Node 24.18.1); 45 Oct 20 2026 (EOL Apr 27 2027, M156, Node 24.22.0); 46 Jan 5 2027 tentative (M160). Dates marked tentative for 43+ on the page — [Electron release schedule](https://releases.electronjs.org/schedule)
- Electron supports the latest three stable majors; majors ship every 8 weeks — [Electron timelines](https://www.electronjs.org/docs/latest/tutorial/electron-timelines)
- electron@45.2.0 depends on `@types/node ^24.9.0`; engines node >= 22.12.0 — [npm]
- electron-vite 6.0.0 (2026-10-15): peer deps `vite ^6 || ^7 || ^8`, `@swc/core ^1`; engines node `^20.19.0 || >=22.12.0`. v6 updates to Vite 8, uses rolldown to bundle config, adds build targets for Electron 42-44, fixes bytecode builds on Node 24. v5 (2025-12-07) restructured config: `externalizeDepsPlugin`/`bytecodePlugin` deprecated in favour of `build.externalizeDeps` / `build.bytecode`; `isolatedEntries` added — [electron-vite CHANGELOG](https://raw.githubusercontent.com/alex8088/electron-vite/master/CHANGELOG.md), [npm]
- electron-vite scaffold: `npm create @quick-start/electron@latest` (templates vanilla/vue/react/svelte/solid, each with TS variant); config file `electron.vite.config.*` with `main`, `preload`, `renderer` sections; default outDir `out`; package.json `"main": "./out/main/index.js"`; scripts `electron-vite dev | preview | build` — [electron-vite guide](https://electron-vite.org/guide/)
- Vite 8 engines: node `^20.19.0 || >=22.12.0`; Vitest 5.0.5 engines node `^22.12.0 || ^24.0.0 || >=26.0.0`, peer vite `^6.4 || ^7 || ^8`, @types/node `^22 || >=24` — [npm]
- Playwright 1.64.1 depends on `playwright` 1.64.1; bundles Chromium 156 (matches Electron 45's M156); Docker images moved to Node 24 in 1.57; release notes 1.56-1.64 do not mention Electron — [Playwright release notes](https://playwright.dev/docs/release-notes), [npm]
- TypeScript 7.0 stable announced 2026-07-08: native (Go) compiler ~10x faster, shipped as the normal `typescript` package; no stable programmatic API until 7.1 (so tools importing `typescript`, e.g. typescript-eslint, depend on 7.1); compat package `@typescript/typescript6` — [InfoQ](https://infoq.com/news/2026/08/typescript-7-released/), [TypeScript devblog](https://devblogs.microsoft.com/typescript/?p=5246) (secondary summary; I found no source on Vite/Vitest interplay. Vite/Vitest transpile via esbuild/oxc not tsc, so typecheck-only use of `tsc` is the main touchpoint — my inference.)
- Electron security checklist: `contextIsolation: true` (default since 12), `sandbox: true` (default since 20), `nodeIntegration: false`, `webSecurity: true`, deny-by-default `setPermissionRequestHandler`, define a CSP (preferably via `webRequest.onHeadersReceived`), restrict `will-navigate` by comparing `URL.origin`, `setWindowOpenHandler` returning `{action:'deny'}`, never pass untrusted URLs to `shell.openExternal`, validate `event.senderFrame` in IPC handlers, serve local content via `protocol.handle` rather than `file://`, disable unneeded fuses (`runAsNode`, `nodeCliInspect`) with `@electron/fuses`, don't expose raw `ipcRenderer` (wrap callbacks so the event object isn't passed) — [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)

### Recommended scaffold (my recommendation, built from the above)
```
skipbo/
  electron.vite.config.ts
  electron-builder.yml
  playwright.config.ts
  vitest.config.ts
  tsconfig.json  tsconfig.node.json  tsconfig.web.json
  build/            # icon.icns, icon.ico, icon.png (1024), entitlements.mac.plist
  src/
    main/index.ts          # app lifecycle, BrowserWindow, settings IPC, CSP
    preload/index.ts       # contextBridge API (typed)
    shared/                # pure TS: game rules/engine, types, IPC channel names (unit-tested by Vitest, no DOM)
    renderer/index.html, src/main.ts, ...
  tests/unit/  tests/e2e/
```
Keep game rules in `src/shared` (pure TS, no Electron/DOM imports) so Vitest tests it in plain node.

`package.json` essentials:
```json
{
  "type": "module",
  "main": "./out/main/index.js",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "typecheck": "tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json",
    "test": "vitest run",
    "e2e": "npm run build && playwright test",
    "dist:mac": "npm run build && electron-builder --mac --universal",
    "dist:win": "npm run build && electron-builder --win"
  }
}
```
`electron.vite.config.ts` (v5+/v6 style; with v5+ main/preload deps are externalized via `build.externalizeDeps`, default behaviour should suffice — check the v5 migration guide before adding options):
```ts
import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: { alias: { '@shared': resolve('src/shared') } },
  },
})
```
Window creation with secure defaults (BrowserWindow options names verified in the Electron docs; `show:false` + `ready-to-show`, `backgroundColor`, `setAspectRatio`, `setMinimumSize`, `setFullScreen` are documented in [BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)):
```ts
const win = new BrowserWindow({
  width: 1280, height: 800, minWidth: 960, minHeight: 600,
  useContentSize: true, show: false, backgroundColor: '#1b3a2a',
  webPreferences: { preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true, sandbox: true, nodeIntegration: false }
})
win.once('ready-to-show', () => win.show())
win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
win.webContents.on('will-navigate', e => e.preventDefault())
session.defaultSession.setPermissionRequestHandler((_wc, _p, cb) => cb(false))
```
Note: with `sandbox: true` the preload may only `require('electron')` and a few built-ins; an ESM preload (`"type":"module"`) is not supported in sandboxed preloads (UNVERIFIED for Electron 45 -- check; electron-vite emits CJS preload `.js`/`.cjs` for this reason; verify the output filename in `out/preload`).

CSP (meta tag in `index.html` is simplest and also works in dev; for production prefer header via `onHeadersReceived`; dev needs `'unsafe-inline'`/ws for Vite HMR so use a separate dev CSP or only apply the strict one when `app.isPackaged`):
```
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self'; base-uri 'none'; form-action 'none'
```
(`style-src 'unsafe-inline'` is commonly required by CSS-in-JS/GSAP/inline style attributes; the exact string is my recommendation, not from a source.)

### Inferences
- Pin Electron to `^45` now; per the schedule Electron 42 is already EOL (Oct 20 2026) and only 43/44/45 are supported; 46 lands ~Jan 2027, so budget a bump.
- Playwright's Chromium (156) matching Electron 45's M156 is coincidence but means renderer behaviour in plain-browser tests (if used) closely tracks the app.
- Because this is an offline game that loads only local files, a very strict CSP (`default-src 'none'`) is realistic.
- Safer TS choice: `typescript@^6` until ecosystem tools support 7.1 API; TS 7 for `tsc --noEmit` only is plausible (inference).

### Gaps
- Did not verify electron-vite 6 template contents (React/Vue TS) or that its template works with Vite 8 + TS 7 out of the box.
- Did not verify ESM-main/ESM-preload support status in Electron 45 from docs.
- Did not verify Vitest 5 breaking changes vs 3/4.

## 2. Playwright end-to-end tests for Electron

### Takeaway
Use `_electron.launch({ args: ['.'] })` from `@playwright/test` against the built output (`out/main/index.js`), `electronApp.firstWindow()` for the Page, `page.screenshot()` for images. Electron support is still labelled experimental (Electron v21+). There is no true headless Electron; windows will appear on macOS, but this can be minimised.

### Cited Findings
- Electron's guide: install `@playwright/test`, `import { _electron as electron } from '@playwright/test'`, `electron.launch({ args: ['.'] })`, `electronApp.evaluate(({app}) => app.isPackaged)` (runs in main process; arg is `require('electron')`), `electronApp.firstWindow()` -> Page, screenshot, always `electronApp.close()`. Playwright Electron support is called "experimental"; `launch` runs dev-mode (`isPackaged` false) — [Electron automated testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- `electron.launch` options: `args`, `executablePath` (default: Electron binary installed with the package; use this to test a packaged app), `cwd`, `env`, `timeout` (default 30000), `recordVideo`, `recordHar`, `tracesDir`, `colorScheme` (default light), `locale`, `timezoneId`, `bypassCSP`; supports Electron v21+ — [Playwright Electron API](https://playwright.dev/docs/api/class-electron)
- Pitfall: launch timeouts can occur if the `nodeCliInspect` fuse (`EnableNodeCliInspectArguments`) is set to false -- Playwright relies on it. This conflicts with the security-checklist advice to disable `nodeCliInspect`; so only flip that fuse in release builds, not in the build that E2E launches — [Playwright Electron API](https://playwright.dev/docs/api/class-electron), [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
- Pitfall: native dialogs (`dialog.showOpenDialog` etc.) are not intercepted; stub them via `electronApp.evaluate()` — [Playwright Electron API](https://playwright.dev/docs/api/class-electron)

### Config / test snippets (my recommendation; API names per sources above)
```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/e2e', timeout: 60_000, workers: 1, retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure' },
})
```
```ts
// tests/e2e/smoke.spec.ts
import { test, expect, _electron as electron } from '@playwright/test'
test('launches and renders', async () => {
  const app = await electron.launch({
    args: ['.'],
    env: { ...process.env, NODE_ENV: 'production', SKIPBO_E2E: '1' },
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await expect(page.locator('#game-root')).toBeVisible()
  await page.screenshot({ path: 'test-results/main-menu.png' })
  await app.close()
})
```
Practical advice (UNVERIFIED, from experience): use `SKIPBO_E2E=1` in main to create the window with `show:false` (or `paintWhenInitiallyHidden` left default so screenshots still work -- the Electron docs note `ready-to-show` never fires if `paintWhenInitiallyHidden` is false), fixed window size and `app.commandLine.appendSwitch('force-device-scale-factor','1')` for deterministic pixel screenshots; set a deterministic RNG seed through an env var/IPC so the shuffled deck is reproducible; expose test hooks (`window.__game`) only when the E2E flag is on; point `userData` at a temp dir (`app.setPath('userData', ...)` from env) so tests don't touch real settings; use `page.screenshot()` (renderer capture) rather than OS screen capture so it works without screen-recording permission on macOS; run on a logged-in macOS GUI session in CI (needs a window server; Linux CI needs xvfb).
- If the game draws on `<canvas>`/WebGL, DOM assertions can't see cards; either keep game state in DOM/data attributes or expose a state query for tests (another point for DOM-based rendering).

### Inferences
- Since `launch` runs unpackaged by default, add a second smoke project that uses `executablePath` pointing at the electron-builder `--dir` output (`dist/mac-arm64/Skipbo.app/Contents/MacOS/Skipbo`) to catch packaging errors (asar paths, missing assets).

### Gaps
- No source found confirming a "headless" mode for Electron under Playwright; all headless-ish tips above are unverified experience.
- Not verified whether Playwright 1.64 has any Electron 45-specific regressions (release notes show no Electron items).

## 3. electron-builder: macOS, Windows, signing, cross-building

### Takeaway
Stay on electron-builder 26.x (27 is still alpha; it will require `migrate-schema` for config and explicit `--publish`). Build the universal mac DMG on the Mac, and build Windows NSIS/portable on a Windows runner (GitHub Actions `windows-latest`) rather than on macOS: official docs only document cross-building Windows from macOS via a Wine Docker image, and Wine is not installed here.

### Cited Findings
- electron-builder dist-tags: `latest` 26.18.0, `v26` 26.18.1, `next` 27.0.0-alpha.14; engines node >=14 — [npm]
- Docs now describe v27 as unreleased ("next"); v27 requires Node >=22.12.0, adds `migrate-schema`, removes `--em.*` flags and implicit publishing (must pass `--publish`), adds a `verify` command, and Windows ia32 needs Electron <=43 — [electron.build CLI docs](https://www.electron.build/docs/cli/)
- Universal macOS: `electron-builder --mac --universal` (or `arch: universal`); downloads x64 and arm64 Electron and merges with `lipo`; `mergeASARs: true` default; `singleArchFiles` and `x64ArchFiles` for native files; verify with `lipo -info`; roughly twice the size; separate x64/arm64 builds mean smaller downloads — [electron-builder architecture docs (v26)](https://www.electron.build/v26/docs/architecture), [scheme.json](https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/app-builder-lib/scheme.json)
- macOS `identity`: if unset, searches keychain; `null` skips signing; `"-"` ad-hoc signs. `hardenedRuntime` defaults true (required for notarization) — [electron-builder scheme.json](https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/app-builder-lib/scheme.json)
- Windows from macOS/Linux: the docs say Wine runs NSIS ("Wine is only needed for the installer tool"; the Electron binary is not compiled); recommended route is Docker image `electronuserland/builder:wine` running `npx electron-builder --win`. AppX needs Windows (Parallels Windows VM can be detected). The page does not document running Wine natively on macOS — [electron-builder architecture docs (v26)](https://www.electron.build/v26/docs/architecture)
- Official CI example: matrix of `macos-latest` (`--mac --universal`), `windows-latest` (`--win --x64 --arm64`), `ubuntu-latest` — same page
- Windows ARM64 builds: `--win --arm64`; cross-compiling from x64 Windows documented — same page
- This machine: arm64, no `wine`/`wine64` on PATH (verified via `which`).
- Notarization library `@electron/notarize` 3.1.2 [npm]

### Config (my recommendation; key names for `identity`, `hardenedRuntime`, `mergeASARs`, `x64ArchFiles`, `singleArchFiles` verified in scheme.json; others, e.g. `dmg`, `nsis`, `portable`, `artifactName`, from memory -- validate with `electron-builder --help`/schema because the docs pages I fetched were truncated)
```yaml
# electron-builder.yml
appId: org.thepearsonfamily.skipbo
productName: Skipbo
directories: { buildResources: build, output: dist }
files: ["out/**", "package.json"]
asar: true
mac:
  target: [{ target: dmg, arch: [universal] }]   # or [arm64, x64] for two smaller DMGs
  category: public.app-category.card-games
  icon: build/icon.icns
  identity: null          # unsigned local build; remove (or set Developer ID) for release
  hardenedRuntime: true   # with a real identity
dmg:
  title: Skipbo
win:
  target: [nsis, portable]  # per-arch via CLI: --x64 / --arm64
  icon: build/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
artifactName: "${productName}-${version}-${os}-${arch}.${ext}"
```
- Icons (UNVERIFIED specifics): provide a 1024x1024 PNG at `build/icon.png`; electron-builder can derive .icns/.ico, but ship explicit `icon.icns` (from an iconset up to 1024 px) and a multi-size `icon.ico` (256 px minimum, include 16/32/48/256).
- Unsigned local mac builds (UNVERIFIED, from experience): with `identity: null` an arm64 app can fail to launch because arm64 macOS requires at least ad-hoc signature; use `identity: "-"` for ad-hoc or run `codesign --force --deep --sign - Skipbo.app`. Downloaded/AirDropped unsigned apps are quarantined by Gatekeeper (users right-click -> Open or `xattr -dr com.apple.quarantine`); a locally built app that was never downloaded has no quarantine flag and runs. Distributing to others without a Developer ID ($99/yr Apple Developer Program) + notarization triggers Gatekeeper warnings. Unsigned Windows installers show SmartScreen "unknown publisher" warnings; no cost-free way around that.
- Fuses: use `@electron/fuses` 2.1.3 [npm] (or electron-builder's `electronFuses` option, UNVERIFIED) to turn off `runAsNode` in release builds.

### Inferences
- For a hobby/family game, simplest dependable pipeline: develop on Mac; `npm run dist:mac` locally; GitHub Actions matrix for Windows artifacts. Docker+Wine from an Apple Silicon Mac adds emulation (x86 container) and is likely slow/flaky (inference; one search found no confirmation either way about Wine 11 or Apple Silicon issues).
- Prefer two arch-specific DMGs only if download size matters; universal is simplest for a game with no native modules.

### Gaps
- Could not fetch electron.build's MacConfiguration/NSIS/portable pages in full (content truncated or 404), so `dmg`, `nsis`, `portable`, notarize option syntax are unverified against current docs.
- No confirmation of actual success/failure of Windows cross-builds from Apple Silicon with Wine; no current-issue evidence found.
- Not verified how v26 `notarize` config is expressed (env vars `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` or API key) -- check docs when signing is needed.

## 4. Settings persistence, window sizing, fullscreen, HiDPI

### Takeaway
Use a tiny hand-rolled JSON settings module in `app.getPath('userData')` (atomic write, schema-validated with a default merge) rather than electron-store: electron-store 12 is ESM-only and needs Node >=22, which is fine, but it's an unneeded dependency for a handful of settings. Let Chromium handle HiDPI; design the renderer in CSS pixels and scale with a fixed logical stage.

### Cited Findings
- electron-store 12.0.0: `type: module`, engines node >=22 — [npm]
- `BrowserWindow`: create with `show:false` and show on `ready-to-show` to avoid flash; or show immediately with `backgroundColor`; `setFullScreen`, `isFullScreen`, events `enter-full-screen`/`leave-full-screen` (macOS transitions are async); `setSimpleFullScreen` (macOS non-Space fullscreen); `setAspectRatio` is not respected for programmatic `setSize`; `setMinimumSize`; `zoomFactor` webPreference default 1.0 — [BrowserWindow docs](https://www.electronjs.org/docs/latest/api/browser-window)
- Window sizes in Electron are in DIPs (device-independent pixels) and the docs recommend `screen.screenToDipPoint` conversions for some Windows/Linux cases — [BrowserWindow docs](https://www.electronjs.org/docs/latest/api/browser-window) (page had little else on DPI).

### Suggested implementation (my recommendation)
```ts
// src/main/settings.ts
import { app } from 'electron'; import { join } from 'node:path'
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs'
const file = () => join(app.getPath('userData'), 'settings.json')
const defaults = { fullscreen: false, volume: 0.8, bounds: { width: 1280, height: 800 } }
export const load = () => { try { return { ...defaults, ...JSON.parse(readFileSync(file(), 'utf8')) } } catch { return { ...defaults } } }
export const save = (s: typeof defaults) => { mkdirSync(app.getPath('userData'), { recursive: true }); const t = file() + '.tmp'; writeFileSync(t, JSON.stringify(s, null, 2)); renameSync(t, file()) }
```
Save bounds debounced on `resize`/`move`/`close` using `win.getNormalBounds()` (UNVERIFIED API detail; exists in Electron); validate saved bounds still intersect a display via `screen.getAllDisplays()`. Toggle fullscreen with F11/Cmd+Ctrl+F; macOS native fullscreen via `win.setFullScreen`.
Scaling for a card game: author a fixed logical stage (e.g. 1920x1080 or 1600x900) and scale it to the window with CSS `transform: scale()` (letterbox) or use responsive units/`vmin`; set `devicePixelRatio`-aware canvas only if using Canvas/Pixi (Pixi: `resolution: devicePixelRatio, autoDensity: true`). DOM/SVG elements are crisp at any DPR automatically.

### Gaps
- No source fetched on Electron HiDPI specifics (`force-device-scale-factor` switch, per-monitor DPI behaviour on Windows) -- the above is from background knowledge.
- electron-store alternatives beyond a hand-rolled JSON file (e.g. `conf`, `electron-settings`) not researched.

## 5. Rendering approach: DOM+SVG+CSS vs Canvas 2D vs PixiJS; animation libraries

### Takeaway
Recommendation: DOM + SVG + CSS for a Skip-Bo-style card game, with GSAP (or Web Animations API / the `motion` library) for choreographed animation; reserve PixiJS for a particle/effects overlay only if needed. A card game has dozens of elements, not thousands, so DOM gives crisp resolution-independent art, free text layout/accessibility/hit-testing, easy Playwright assertions, and the lowest implementation cost. NOTE: this section is mostly judgment; I did not fetch sources comparing renderers in this session.

### Cited Findings
- Current versions: pixi.js 8.22.0, gsap 3.15.0, motion 14.9.0 (Motion One / Framer Motion lineage; UNVERIFIED which packages it supersedes), howler 2.2.4, zustand 5.0.16 — [npm]
- Playwright can only assert on DOM (`page.locator`) -- canvas contents are opaque except via screenshots (general Playwright behaviour; see [Playwright Electron API](https://playwright.dev/docs/api/class-electron) for `page` access).

### Inferences / reasoned tradeoffs (unsourced judgment, flagged)
- DOM+SVG+CSS: + vector art stays sharp on any DPR; + CSS transforms/opacity are GPU-composited so 60 fps is easy at ~100 elements; + drag-and-drop via pointer events, text, a11y, devtools, e2e tests via locators; + cartoony effects (drop-shadow, gradients, clip-path, filters) are cheap. - Heavy filters (blur/drop-shadow on many layers) and thousands of particles will lag; complex shuffling/fan animations need care with layout thrash (animate `transform` only; use FLIP technique for moving cards between piles).
- Canvas 2D: + total pixel control; - you rebuild hit-testing, text, layers, DPR handling; - no declarative styling; little advantage at this scale.
- PixiJS 8: + WebGL/WebGPU batching, filters, particles, spritesheets, great for hundreds of animated sprites; - bitmaps need multiple resolutions for crispness, text rendering is weaker, DOM-free tests are harder, more code and bundle (~hundreds of KB). Overkill unless the game wants heavy VFX.
- Animation: GSAP (now free for all uses incl. commercial since the Webflow acquisition -- UNVERIFIED, check the license) gives timelines, easing (incl. `back`, `elastic` for cartoony squash/stretch), Flip plugin for FLIP card moves, and works with DOM/SVG; Web Animations API is built in (Chromium 156), zero dependency, good for simple tweens but lacks timeline orchestration; CSS keyframes for idle loops (hover wiggle, glow). Practical stack: TypeScript + Vite + (optionally Svelte/React/Solid or vanilla) + GSAP (Flip) + SVG card art + Howler for audio + a small state store; game logic as a pure reducer in `src/shared`.
- Hybrid: DOM for cards/UI, a transparent `<canvas>` Pixi layer on top for confetti/sparkles on stock-pile completion.

### Gaps
- No benchmarks or primary-source comparison of DOM vs Canvas vs Pixi performance retrieved.
- GSAP licensing and `motion` package lineage not verified.
- Did not research `@pixi/react` or Pixi v8 specifics (version listed in registry only for pixi.js).
