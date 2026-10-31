# Skip-Bo

A cartoony desktop Skip-Bo for macOS and Windows (Electron + TypeScript). 2-6 players on one shared screen, any mix of humans and computer players (Easy / Medium / Hard). All art is SVG generated in code and all sound and music is synthesized with Web Audio.

> **Unofficial fan project.** This is an independent, non-commercial recreation of a classic card game. It is not affiliated with, endorsed by, or sponsored by Mattel, Inc. "Skip-Bo" is a trademark of Mattel, Inc. and is used here only to name the game being recreated. All artwork and sound in this repository are original and generated in code; no Mattel artwork or assets are used.

## Install
Download the latest build from the [Releases page](https://github.com/StevePearson-github/skipbo/releases/latest).

**Windows**
- *Stand-alone, no install:* download `Skip-Bo-<version>-windows-portable.exe` and double-click it.
- *Installer:* download `Skip-Bo-Setup-<version>.exe`, run it, and pick an install folder (no admin rights needed).

**macOS** (Apple Silicon and Intel)
- *Installer:* open `Skip-Bo-<version>-mac-universal.dmg` and drag Skip-Bo to Applications.
- *Stand-alone:* unzip `Skip-Bo-<version>-mac-universal.zip` and run the app from anywhere.

The builds are not code-signed, so your OS will warn you the first time:
- **Windows:** if SmartScreen says "Windows protected your PC", click **More info**, then **Run anyway**.
- **macOS:** right-click the app and choose **Open**, then confirm. If it is still blocked, run `xattr -dr com.apple.quarantine /Applications/Skip-Bo.app` in Terminal.

Settings (names, options, volume) are saved per user: `%APPDATA%\Skip-Bo` on Windows, `~/Library/Application Support/Skip-Bo` on macOS.

## Build from source
Requires Node 22+ (developed on Node 24).

## Commands
- `npm install`, then `npm run dev` to run in development
- `npm test` unit, AI, audio and simulation tests (Vitest). `SIM_GAMES=2000 npm test` for a longer simulation
- `npm run test:e2e` build and run the Electron end-to-end tests (Playwright)
- `npm run dist:mac` universal DMG into `dist/` (unsigned)
- `npm run dist:win` Windows installer; build on Windows (see `.github/workflows/build.yml`)

## Rules implemented
Mattel rules: 162 cards (12 each of 1-12 plus 18 Skip-Bo wilds), stock of 30 (2-4 players) or 20 (5-6), hand of 5, four shared building piles (1 to 12, then removed and recycled) and four personal discard piles. First to empty their stock wins; optional match scoring (25 + 5 per card left in opponents' stocks, first to 100/250/500).

House rule (Mattel is silent): if the draw pile and completed piles are both empty, discards except each pile's top card are reshuffled so games cannot deadlock. A game with no possible progress ends as a stalemate and the player with the fewest stock cards is named closest.

Options: stock size (10-30), match target, pass-the-device screen between human turns, hint, undo within a turn.

## Layout
`src/shared/engine` rules, `src/shared/ai` computer players, `src/renderer` UI and audio, `src/main` Electron shell, `tests/` unit, simulation and e2e tests. Research is in `reports/`.

## License
The code is released under the [MIT License](LICENSE). Third-party components keep their own licenses: Electron (MIT), GSAP (the [GSAP standard license](https://gsap.com/standard-license/)) and the Fredoka font (SIL Open Font License 1.1).
