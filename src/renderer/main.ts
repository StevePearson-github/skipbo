import './styles.css'
import { SoundManager } from './audio/sound'
import { Env, SetupOptions, defaultSetup } from './ui/env'
import { GameController } from './ui/game'
import { Menu } from './ui/menu'

interface Api {
  getSettings(): Promise<Record<string, unknown>>
  setSettings(patch: Record<string, unknown>): Promise<void>
}
declare global {
  interface Window {
    skipboApi?: Api
    __skipbo?: { game: () => GameController | null; startGame: (o: SetupOptions) => void }
  }
}

const params = new URLSearchParams(location.search)
const testMode = params.get('test') === '1'
const stage = document.getElementById('stage') as HTMLElement

// Without the Electron bridge (Android, plain browser) settings live in localStorage.
const LS_KEY = 'skipbo-settings'
function loadLocal(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as Record<string, unknown>
  } catch {
    return {}
  }
}
function saveLocal(patch: Record<string, unknown>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...loadLocal(), ...patch }))
  } catch {
    /* storage unavailable */
  }
}

// Touch devices (no Electron bridge) get the fluid layout: the stage takes the screen's aspect ratio,
// the table is three flowing rows, and pinching changes card size (--cs) within limits that keep the rows from overlapping.
const fluid = navigator.maxTouchPoints > 0 && !window.skipboApi
if (fluid) document.body.classList.add('fluid')
const CS_KEY = 'skipbo-card-scale'
const CS_MIN = 0.5
const CS_MAX = 2.6
let wantCs = ((): number => {
  try {
    const v = Number(localStorage.getItem(CS_KEY))
    return v >= CS_MIN && v <= CS_MAX ? v : CS_MAX // default: use all the room
  } catch {
    return CS_MAX
  }
})()
let effCs = 1
let scale = 1 // CSS scale of the stage

function overlaps(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}
/** True when the table at the current --cs fits the screen with nothing overflowing or overlapping. */
function fits(g: HTMLElement): boolean {
  const tol = 1
  if (g.scrollHeight > g.clientHeight + tol || g.scrollWidth > g.clientWidth + tol) return false
  for (const id of ['opps', 'center', 'tray']) {
    const el = document.getElementById(id)
    if (el && el.scrollWidth > el.clientWidth + tol) return false
  }
  const hud = [g.querySelector('.hud'), g.querySelector('.scoreboard')].filter(Boolean) as Element[]
  for (const seat of Array.from(g.querySelectorAll('.seat'))) {
    const r = seat.getBoundingClientRect()
    if (hud.some((h) => overlaps(r, h.getBoundingClientRect()))) return false
  }
  return true
}
/** Largest card scale <= wantCs at which the table fits. */
function applyCs(): void {
  const g = document.getElementById('game')
  let c = wantCs
  stage.style.setProperty('--cs', c.toFixed(3))
  if (g) {
    while (c > CS_MIN && !fits(g)) {
      c = Math.max(CS_MIN, c - 0.03)
      stage.style.setProperty('--cs', c.toFixed(3))
    }
  }
  effCs = c
}

function fit(): void {
  if (fluid) {
    // logical height stays 1080; logical width follows the screen's aspect ratio
    scale = window.innerHeight / 1080
    stage.style.width = `${window.innerWidth / scale}px`
    stage.style.height = '1080px'
    stage.style.transformOrigin = '0 0'
    stage.style.transform = `scale(${scale})`
    applyCs()
    return
  }
  scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
  stage.style.transformOrigin = '0 0'
  stage.style.left = '50%'
  stage.style.top = '50%'
  // translate(-50%,-50%) is applied in unscaled space, so offset manually for crisp centring
  stage.style.transform = `translate(${-960 * scale}px, ${-540 * scale}px) scale(${scale})`
}

/** Two-finger pinch changes card size; the fit check above keeps it inside what the screen can hold. */
function setupPinch(): void {
  let lastD = 0
  let suppressClick = false
  const dist = (t: TouchList): number => Math.hypot((t[0] as Touch).clientX - (t[1] as Touch).clientX, (t[0] as Touch).clientY - (t[1] as Touch).clientY)
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      lastD = dist(e.touches)
      wantCs = effCs // continue from what is actually shown
      suppressClick = true
    }
  }, { passive: true })
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2 || !lastD) return
    const d = dist(e.touches)
    wantCs = Math.min(CS_MAX, Math.max(CS_MIN, wantCs * (d / lastD)))
    lastD = d
    applyCs()
    wantCs = Math.min(wantCs, effCs) // pinching past the limit does nothing, and pinching back responds at once
    e.preventDefault()
  }, { passive: false })
  window.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) lastD = 0
    if (e.touches.length === 0 && suppressClick) {
      try {
        localStorage.setItem(CS_KEY, String(wantCs))
      } catch {
        /* storage unavailable */
      }
      setTimeout(() => (suppressClick = false), 350)
    }
  }, { passive: true })
  // a pinch must not also count as a tap
  window.addEventListener('click', (e) => {
    if (suppressClick) {
      e.stopPropagation()
      e.preventDefault()
    }
  }, true)
  // the table is redrawn on every move: re-check the fit (e.g. discard piles growing)
  let queued = false
  new MutationObserver(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      applyCs()
    })
  }).observe(stage, { childList: true, subtree: true })
}
if (fluid) setupPinch()
window.addEventListener('resize', fit)
fit()

const sound = new SoundManager()
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const env: Env = {
  sound,
  speed: testMode && params.get('fast') === '1' ? 0 : 1,
  reduced,
  seed: params.has('seed') ? Number(params.get('seed')) : undefined,
  save: (patch) => void (window.skipboApi ? window.skipboApi.setSettings(patch) : saveLocal(patch)),
  scale: () => scale,
}

let menu: Menu
let game: GameController | null = null

function startGame(opts: SetupOptions): void {
  menu.hide()
  game?.destroy()
  game = new GameController(stage, env, opts, () => {
    game?.destroy()
    game = null
    menu.show()
  })
  game.startRound()
  sound.startMusic()
}

async function boot(): Promise<void> {
  let saved: Record<string, unknown> = {}
  try {
    saved = (await window.skipboApi?.getSettings()) ?? loadLocal()
  } catch {
    saved = {}
  }
  const audio = saved.audio as Partial<typeof sound.settings> | undefined
  if (audio) sound.settings = { ...sound.settings, ...audio }
  menu = new Menu(stage, env, (saved.setup as Partial<SetupOptions> & { count?: number }) ?? defaultSetup(), startGame)
  window.__skipbo = testMode ? { game: () => game, startGame } : undefined
  document.body.dataset.ready = '1'
  // browsers/Electron start audio on the first interaction
  window.addEventListener('pointerdown', () => sound.unlock(), { once: true })
  // silence the music when the app is backgrounded (Android home/app switcher)
  document.addEventListener('visibilitychange', () => sound.setSuspended(document.hidden))
}
void boot()
