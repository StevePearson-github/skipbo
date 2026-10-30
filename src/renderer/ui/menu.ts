import { Difficulty } from '../../shared/ai'
import { Env, SEAT_COLORS, SetupOptions, defaultSetup, esc } from './env'

const LEVELS: { v: Difficulty; label: string }[] = [
  { v: 'easy', label: 'Easy' },
  { v: 'medium', label: 'Medium' },
  { v: 'hard', label: 'Hard' },
]

export class Menu {
  private count = 2
  private opts: SetupOptions
  readonly el: HTMLElement

  constructor(
    private readonly root: HTMLElement,
    private readonly env: Env,
    saved: Partial<SetupOptions> & { count?: number },
    private readonly onStart: (o: SetupOptions) => void,
  ) {
    this.opts = { ...defaultSetup(), ...saved }
    if (!Array.isArray(this.opts.seats) || this.opts.seats.length !== 6) this.opts.seats = defaultSetup().seats
    this.count = Math.min(6, Math.max(2, saved.count ?? 2))
    this.el = document.createElement('section')
    this.el.id = 'menu'
    this.el.className = 'screen'
    root.appendChild(this.el)
    this.render()
  }

  show(): void {
    this.el.classList.remove('hidden')
  }
  hide(): void {
    this.el.classList.add('hidden')
  }
  destroy(): void {
    this.el.remove()
  }

  private render(): void {
    const o = this.opts
    const seats = o.seats
      .slice(0, this.count)
      .map(
        (s, i) => `<div class="seat-row"><span class="dot" style="background:${SEAT_COLORS[i]}"></span>
        <input type="text" maxlength="12" value="${esc(s.name)}" data-name="${i}" aria-label="Player ${i + 1} name">
        <select data-kind="${i}" aria-label="Player ${i + 1} type"><option value="human" ${s.kind === 'human' ? 'selected' : ''}>Human</option><option value="cpu" ${s.kind === 'cpu' ? 'selected' : ''}>Computer</option></select>
        <select data-level="${i}" ${s.kind === 'human' ? 'disabled style="opacity:.35"' : ''} aria-label="Player ${i + 1} difficulty">${LEVELS.map((l) => `<option value="${l.v}" ${s.level === l.v ? 'selected' : ''}>${l.label}</option>`).join('')}</select></div>`,
      )
      .join('')
    const auto = this.count <= 4 ? 30 : 20
    this.el.innerHTML = `<h1 class="logo">SKIP-BO</h1><p class="tagline">Race to empty your stock pile!</p>
      <div class="panel" id="setup">
        <div class="row"><label>Players</label>${[2, 3, 4, 5, 6].map((n) => `<button class="chip ${n === this.count ? 'on' : ''}" data-count="${n}" aria-label="${n} players">${n}</button>`).join('')}</div>
        <div class="seats">${seats}</div>
        <div class="row"><label>Stock pile</label><select id="stock"><option value="0" ${o.stockSize === 0 ? 'selected' : ''}>Standard (${auto} cards)</option>${[10, 15, 20, 25, 30].map((n) => `<option value="${n}" ${o.stockSize === n ? 'selected' : ''}>${n} cards${n === 10 ? ' (quick game)' : ''}</option>`).join('')}</select>
          <label style="width:auto;margin-left:30px">Game</label><select id="target"><option value="0" ${o.target === 0 ? 'selected' : ''}>Single game</option>${[100, 250, 500].map((n) => `<option value="${n}" ${o.target === n ? 'selected' : ''}>First to ${n} pts</option>`).join('')}</select></div>
        <div class="row"><label>Pass screen</label><input type="checkbox" id="passopt" ${o.passScreen ? 'checked' : ''} style="width:30px;height:30px"> <span style="font-size:22px">Hide hands between human turns</span></div>
      </div>
      <div class="menu-buttons" style="margin-top:26px"><button class="btn green" id="play">▶ Play</button><button class="btn" id="rules">How to play</button><button class="btn" id="snd">🔊 Sound</button></div>`
    this.bind()
  }

  private value(): SetupOptions {
    return { ...this.opts, seats: this.opts.seats.map((s) => ({ ...s })) }
  }

  private bind(): void {
    const q = <T extends HTMLElement>(s: string): T => this.el.querySelector(s) as T
    this.el.querySelectorAll<HTMLElement>('[data-count]').forEach((b) => {
      b.onclick = () => {
        this.count = Number(b.dataset.count)
        this.env.sound.play('click')
        this.render()
      }
    })
    this.el.querySelectorAll<HTMLInputElement>('[data-name]').forEach((i) => {
      i.oninput = () => (this.opts.seats[Number(i.dataset.name)]!.name = i.value.trim() || `Player ${Number(i.dataset.name) + 1}`)
    })
    this.el.querySelectorAll<HTMLSelectElement>('[data-kind]').forEach((s) => {
      s.onchange = () => {
        this.opts.seats[Number(s.dataset.kind)]!.kind = s.value as 'human' | 'cpu'
        this.render()
      }
    })
    this.el.querySelectorAll<HTMLSelectElement>('[data-level]').forEach((s) => {
      s.onchange = () => (this.opts.seats[Number(s.dataset.level)]!.level = s.value as Difficulty)
    })
    q<HTMLSelectElement>('#stock').onchange = (e) => (this.opts.stockSize = Number((e.target as HTMLSelectElement).value))
    q<HTMLSelectElement>('#target').onchange = (e) => (this.opts.target = Number((e.target as HTMLSelectElement).value))
    q<HTMLInputElement>('#passopt').onchange = (e) => (this.opts.passScreen = (e.target as HTMLInputElement).checked)
    q<HTMLButtonElement>('#play').onclick = () => {
      this.env.sound.unlock()
      this.env.sound.play('click')
      const v = this.value()
      this.env.save({ setup: { ...v, count: this.count } })
      this.onStart({ ...v, seats: v.seats.slice(0, this.count) })
    }
    q<HTMLButtonElement>('#rules').onclick = () => {
      this.env.sound.play('click')
      openRules(this.root)
    }
    q<HTMLButtonElement>('#snd').onclick = () => {
      this.env.sound.play('click')
      openSettingsOverlay(this.root, this.env)
    }
  }
}

export function openRules(root: HTMLElement): void {
  const o = document.createElement('div')
  o.className = 'overlay'
  o.id = 'rules-overlay'
  o.innerHTML = `<div class="panel"><h3>Goal</h3><p style="text-align:left;font-size:26px">Be the first to play every card from your <b>stock pile</b>.</p>
    <h3>On your turn</h3><ul>
    <li>Draw until you hold 5 cards. If you play all 5, draw 5 more and keep going.</li>
    <li>Play cards to the shared <b>building piles</b> in order, <b>1 → 12</b>. Only a <b>1</b> or a <b>SKIP-BO</b> wild can start a pile.</li>
    <li>You can play from your hand, the top of your stock pile, or the top of any of your 4 discard piles.</li>
    <li>End your turn by <b>discarding</b> one hand card onto one of your discard piles.</li>
    <li>A <b>SKIP-BO</b> wild counts as whatever number the pile needs next.</li>
    <li>A finished pile (12) is removed and later reshuffled into the draw pile.</li></ul>
    <h3>Controls</h3><ul><li>Click a card (hand, stock or a discard pile), then click a glowing building pile. To discard, click a hand card, then one of your discard piles.</li>
    <li><b>Right-click</b> any discard pile (yours or an opponent's) to see every card in it.</li>
    <li>💡 Hint suggests a move, ↩ Undo takes back a play within your turn.</li></ul>
    <h3>House rule</h3><ul><li>If the draw pile and finished piles both run out, discards (except each pile's top card) are reshuffled so the game never gets stuck.</li></ul></div>
    <button class="btn" id="close">Got it!</button>`
  root.appendChild(o)
  ;(o.querySelector('#close') as HTMLButtonElement).onclick = () => o.remove()
}

export function openSettingsOverlay(root: HTMLElement, env: Env): void {
  const a = env.sound.settings
  const o = document.createElement('div')
  o.className = 'overlay'
  o.id = 'settings-overlay'
  o.innerHTML = `<h2>Sound</h2><div class="panel" style="display:grid;gap:18px;font-size:30px">
    <div class="row"><label>Effects</label><input type="range" id="sfx" min="0" max="100" value="${Math.round(a.sfxVolume * 100)}"></div>
    <div class="row"><label>Music</label><input type="range" id="mus" min="0" max="100" value="${Math.round(a.musicVolume * 400)}"></div>
    <div class="row"><label>Mute all</label><input type="checkbox" id="mute" ${a.muted ? 'checked' : ''} style="width:30px;height:30px"></div></div>
    <button class="btn" id="close">Done</button>`
  root.appendChild(o)
  const persist = () => env.save({ audio: env.sound.settings })
  const g = <T extends HTMLElement>(s: string) => o.querySelector(s) as T
  g<HTMLInputElement>('#sfx').oninput = (e) => {
    env.sound.set({ sfxVolume: Number((e.target as HTMLInputElement).value) / 100 })
    persist()
  }
  g<HTMLInputElement>('#sfx').onchange = () => env.sound.play('place')
  g<HTMLInputElement>('#mus').oninput = (e) => {
    env.sound.set({ musicVolume: Number((e.target as HTMLInputElement).value) / 400 })
    persist()
  }
  g<HTMLInputElement>('#mute').onchange = (e) => {
    env.sound.set({ muted: (e.target as HTMLInputElement).checked })
    persist()
  }
  g<HTMLButtonElement>('#close').onclick = () => o.remove()
}
