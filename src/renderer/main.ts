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

let scale = 1
function fit(): void {
  scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
  stage.style.transform = `scale(${scale}) translate(-50%, -50%)`
  stage.style.transformOrigin = '0 0'
  stage.style.left = '50%'
  stage.style.top = '50%'
  // translate(-50%,-50%) is applied in unscaled space, so offset manually for crisp centring
  stage.style.transform = `translate(${-960 * scale}px, ${-540 * scale}px) scale(${scale})`
}
window.addEventListener('resize', fit)
fit()

const sound = new SoundManager()
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const env: Env = {
  sound,
  speed: testMode && params.get('fast') === '1' ? 0 : 1,
  reduced,
  seed: params.has('seed') ? Number(params.get('seed')) : undefined,
  save: (patch) => void window.skipboApi?.setSettings(patch),
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
    saved = (await window.skipboApi?.getSettings()) ?? {}
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
}
void boot()
