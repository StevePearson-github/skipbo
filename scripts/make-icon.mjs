// Renders build/icon.png (1024x1024) from an SVG using Electron's own Chromium via Playwright.
import { _electron as electron } from '@playwright/test'
import { writeFileSync } from 'fs'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2fae7d"/><stop offset="1" stop-color="#0e3b3a"/></linearGradient>
<linearGradient id="w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b06cf0"/><stop offset="1" stop-color="#e45a9b"/></linearGradient></defs>
<rect x="40" y="40" width="944" height="944" rx="210" fill="url(#bg)" stroke="#1c2a4a" stroke-width="22"/>
<g transform="rotate(-14 330 540)"><rect x="150" y="250" width="340" height="476" rx="40" fill="#fff8e7" stroke="#1c2a4a" stroke-width="14"/>
<rect x="180" y="280" width="280" height="416" rx="26" fill="#56B4E9" stroke="#1c2a4a" stroke-width="8"/>
<text x="320" y="560" text-anchor="middle" font-family="Fredoka, Arial Rounded MT Bold, Arial" font-weight="700" font-size="250" fill="#fff8e7" stroke="#1c2a4a" stroke-width="16" paint-order="stroke">1</text></g>
<g transform="rotate(12 660 540)"><rect x="500" y="230" width="360" height="504" rx="42" fill="#fff8e7" stroke="#1c2a4a" stroke-width="14"/>
<rect x="532" y="262" width="296" height="440" rx="28" fill="url(#w)" stroke="#1c2a4a" stroke-width="8"/>
<rect x="520" y="420" width="320" height="110" rx="26" fill="#ffd23f" stroke="#1c2a4a" stroke-width="10" transform="rotate(-8 680 475)"/>
<text x="680" y="505" text-anchor="middle" font-family="Fredoka, Arial Rounded MT Bold, Arial" font-weight="700" font-size="76" fill="#1c2a4a" transform="rotate(-8 680 475)">SKIP-BO</text></g>
</svg>`
const app = await electron.launch({ args: ['.'], env: { ...process.env, SKIPBO_TEST: '1' } })
const page = await app.firstWindow()
await page.setViewportSize({ width: 1024, height: 1024 })
await page.setContent(`<body style="margin:0;background:transparent">${svg}</body>`)
const png = await page.screenshot({ clip: { x: 0, y: 0, width: 1024, height: 1024 }, omitBackground: true })
writeFileSync('build/icon.png', png)
await app.close()
