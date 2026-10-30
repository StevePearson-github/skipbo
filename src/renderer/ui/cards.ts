import { WILD } from '../../shared/engine'

/** Number bands: colour + shape badge + pattern, so colour is never the only cue (Okabe-Ito based). */
export interface Band {
  name: string
  color: string
  dark: string
  light: string
  shape: 'circle' | 'diamond' | 'star'
}
export const BANDS: Band[] = [
  { name: 'blue', color: '#56B4E9', dark: '#1d6f9e', light: '#bfe5f8', shape: 'circle' },
  { name: 'green', color: '#2fbf8f', dark: '#0b6e50', light: '#b8efdb', shape: 'diamond' },
  { name: 'red', color: '#ee7a3c', dark: '#a8400f', light: '#fbcdb2', shape: 'star' },
]
export const WILD_BAND = { color: '#b06cf0', dark: '#5b2a99', light: '#e6cdfb' }
const NAVY = '#1c2a4a'
const CREAM = '#fff8e7'

export function bandFor(value: number): Band {
  return BANDS[value <= 4 ? 0 : value <= 8 ? 1 : 2] as Band
}

function badge(shape: Band['shape'], cx: number, cy: number, r: number, fill: string): string {
  switch (shape) {
    case 'circle':
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${NAVY}" stroke-width="1.5"/>`
    case 'diamond':
      return `<path d="M${cx} ${cy - r * 1.15} L${cx + r} ${cy} L${cx} ${cy + r * 1.15} L${cx - r} ${cy} Z" fill="${fill}" stroke="${NAVY}" stroke-width="1.5" stroke-linejoin="round"/>`
    case 'star': {
      const pts: string[] = []
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 ? r * 0.5 : r * 1.15
        const a = (Math.PI / 5) * i - Math.PI / 2
        pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`)
      }
      return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${NAVY}" stroke-width="1.5" stroke-linejoin="round"/>`
    }
  }
}

let uid = 0

/**
 * A card as an SVG string (100x140 viewBox).
 * `asValue` draws a wild standing in for a number (as it appears on a building pile).
 */
export function cardSvg(value: number, asValue?: number): string {
  const id = `c${uid++}`
  if (value === WILD) {
    const w = WILD_BAND
    const num = asValue ? `<text x="50" y="86" text-anchor="middle" class="cnum" font-size="46" fill="#fff" stroke="${NAVY}" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${asValue}</text>` : ''
    const star = (cx: number, cy: number, r: number) => badge('star', cx, cy, r, '#ffd23f')
    return `<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" class="card wild" aria-label="Skip-Bo wild card${asValue ? ' as ' + asValue : ''}">
<defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${w.color}"/><stop offset="1" stop-color="#e45a9b"/></linearGradient>
<pattern id="${id}p" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="none"/><rect width="4" height="10" fill="#fff" opacity=".13"/></pattern></defs>
<rect x="3" y="3" width="94" height="134" rx="12" fill="${CREAM}" stroke="${NAVY}" stroke-width="3"/>
<rect x="9" y="9" width="82" height="122" rx="8" fill="url(#${id}g)" stroke="${NAVY}" stroke-width="2"/>
<rect x="9" y="9" width="82" height="122" rx="8" fill="url(#${id}p)"/>
${star(24, 25, 9)}${star(76, 115, 9)}
<g transform="rotate(-8 50 62)"><rect x="12" y="${asValue ? 28 : 48}" width="76" height="26" rx="6" fill="#ffd23f" stroke="${NAVY}" stroke-width="2.5"/>
<text x="50" y="${asValue ? 47 : 67}" text-anchor="middle" class="cnum" font-size="17" fill="${NAVY}">SKIP-BO</text></g>
${asValue ? num : `<text x="50" y="110" text-anchor="middle" class="cnum" font-size="20" fill="#fff" stroke="${NAVY}" stroke-width="4" paint-order="stroke" stroke-linejoin="round">WILD</text>`}
<path d="M18 18 Q50 8 82 18" stroke="#fff" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/>
</svg>`
  }
  const b = bandFor(value)
  const size = value >= 10 ? 52 : 62
  return `<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" class="card" aria-label="Card ${value}">
<defs><pattern id="${id}p" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#fff" opacity=".28"/></pattern>
<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b.light}"/><stop offset="1" stop-color="${b.color}"/></linearGradient></defs>
<rect x="3" y="3" width="94" height="134" rx="12" fill="${CREAM}" stroke="${NAVY}" stroke-width="3"/>
<rect x="9" y="9" width="82" height="122" rx="8" fill="url(#${id}g)" stroke="${NAVY}" stroke-width="2"/>
<rect x="9" y="9" width="82" height="122" rx="8" fill="url(#${id}p)"/>
<ellipse cx="50" cy="70" rx="33" ry="40" fill="${CREAM}" opacity=".92" stroke="${b.dark}" stroke-width="2"/>
<text x="50" y="${70 + size * 0.35}" text-anchor="middle" class="cnum" font-size="${size}" fill="${b.dark}" stroke="${NAVY}" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${value}</text>
${badge(b.shape, 22, 24, 7.5, b.color)}${badge(b.shape, 78, 116, 7.5, b.color)}
<text x="22" y="49" text-anchor="middle" class="cnum" font-size="${value >= 10 ? 14 : 16}" fill="${NAVY}">${value}</text>
<text x="78" y="103" text-anchor="middle" class="cnum" font-size="${value >= 10 ? 14 : 16}" fill="${NAVY}" transform="rotate(180 78 97)">${value}</text>
<path d="M18 17 Q50 7 82 17" stroke="#fff" stroke-width="3" fill="none" opacity=".4" stroke-linecap="round"/>
</svg>`
}

export function cardBackSvg(): string {
  const id = `b${uid++}`
  return `<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" class="card back" aria-label="Face-down card">
<defs><pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><rect width="14" height="14" fill="#2b3f75"/><circle cx="7" cy="7" r="3" fill="#ffd23f" opacity=".85"/></pattern></defs>
<rect x="3" y="3" width="94" height="134" rx="12" fill="${CREAM}" stroke="${NAVY}" stroke-width="3"/>
<rect x="9" y="9" width="82" height="122" rx="8" fill="url(#${id})" stroke="${NAVY}" stroke-width="2"/>
<ellipse cx="50" cy="70" rx="26" ry="30" fill="#e8452c" stroke="${NAVY}" stroke-width="3"/>
<text x="50" y="66" text-anchor="middle" class="cnum" font-size="15" fill="#fff" stroke="${NAVY}" stroke-width="3" paint-order="stroke">SKIP</text>
<text x="50" y="84" text-anchor="middle" class="cnum" font-size="15" fill="#fff" stroke="${NAVY}" stroke-width="3" paint-order="stroke">BO</text>
</svg>`
}

export function emptySlotSvg(label: string): string {
  return `<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" class="card slot" aria-label="Empty pile">
<rect x="4" y="4" width="92" height="132" rx="12" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.4)" stroke-width="3" stroke-dasharray="9 7"/>
<text x="50" y="82" text-anchor="middle" class="cnum" font-size="40" fill="rgba(255,255,255,.45)">${label}</text></svg>`
}
