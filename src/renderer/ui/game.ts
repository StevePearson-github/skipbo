import { gsap } from 'gsap'
import { planTurn } from '../../shared/ai'
import {
  Action,
  Card,
  GameState,
  PlaySource,
  WILD,
  applyAction,
  canPlayCard,
  cardAt,
  configFor,
  mustEndTurn,
  newGame,
  roundPoints,
} from '../../shared/engine'
import { cardBackSvg, cardSvg, emptySlotSvg } from './cards'
import { Env, SEAT_COLORS, Seat, SetupOptions, esc, sleep } from './env'
import { openSettingsOverlay } from './menu'

type Step = 'win' | 'turn' | 'same'

/** "You win" but "Pixel wins". */
const verb = (name: string): string => (name.trim().toLowerCase() === 'you' ? 'win' : 'wins')

export class GameController {
  state!: GameState
  scores: number[]
  wins: number[]
  round = 0
  private first: number | undefined
  history: GameState[] = []
  selected: PlaySource | null = null
  busy = false
  streak = 0
  private run = 0
  private hintTimer: ReturnType<typeof setTimeout> | undefined
  private readonly el: HTMLElement
  private readonly humans: number

  constructor(
    private readonly root: HTMLElement,
    private readonly env: Env,
    private readonly opts: SetupOptions,
    private readonly onExit: () => void,
  ) {
    this.humans = opts.seats.filter((s) => s.kind === 'human').length
    this.scores = opts.seats.map(() => 0)
    this.wins = opts.seats.map(() => 0)
    this.el = document.createElement('section')
    this.el.id = 'game'
    this.el.className = 'screen'
    this.el.addEventListener('click', (e) => this.onClick(e))
    this.el.addEventListener('contextmenu', (e) => this.onContext(e))
    root.appendChild(this.el)
  }

  get seats(): Seat[] {
    return this.opts.seats
  }

  destroy(): void {
    this.run++
    clearTimeout(this.hintTimer)
    this.el.remove()
    this.root.querySelectorAll('.overlay,.fly,.confetti').forEach((n) => n.remove())
  }

  // ---------- flow ----------

  startRound(): void {
    this.run++
    const n = this.seats.length
    const cfg = configFor(n, this.opts.stockSize ? { stockSize: this.opts.stockSize } : {})
    const seed = this.env.seed !== undefined ? this.env.seed + this.round : (Math.random() * 2 ** 32) >>> 0
    this.first = this.round === 0 ? undefined : ((this.first ?? 0) + 1) % n
    this.state = newGame(n, cfg, seed, this.first)
    this.first = this.state.current
    this.env.sound.play('shuffle')
    for (let i = 0; i < 4; i++) setTimeout(() => this.env.sound.play('deal'), 150 + i * 90 * (this.env.speed ? 1 : 0))
    this.beginTurn()
  }

  private async beginTurn(): Promise<void> {
    this.history = []
    this.selected = null
    this.streak = 0
    this.busy = false
    const seat = this.seats[this.state.current] as Seat
    this.render()
    if (seat.kind === 'cpu') {
      void this.runCpu()
      return
    }
    if (this.humans > 1 && this.opts.passScreen) await this.passScreen(seat)
  }

  private passScreen(seat: Seat): Promise<void> {
    this.busy = true
    return new Promise((resolve) => {
      const o = document.createElement('div')
      o.className = 'overlay opaque'
      o.id = 'pass'
      o.innerHTML = `<p>Pass the device to</p><h2>${esc(seat.name)}</h2><button class="btn" id="ready">I'm ready!</button>`
      this.root.appendChild(o)
      const btn = o.querySelector('#ready') as HTMLButtonElement
      btn.focus()
      btn.onclick = () => {
        this.env.sound.unlock()
        this.env.sound.play('turnChange')
        o.remove()
        this.busy = false
        resolve()
      }
    })
  }

  private async runCpu(): Promise<void> {
    const token = ++this.run
    this.busy = true
    const seat = this.seats[this.state.current] as Seat
    await this.wait(550)
    while (token === this.run && this.state.winner === null) {
      const me = this.state.current
      const plan = planTurn(this.state, seat.level)
      for (const a of plan) {
        if (token !== this.run) return
        const step = await this.perform(a)
        if (step !== 'same') return
        await this.wait(320)
      }
      if (this.state.current !== me) return
    }
  }

  private wait(ms: number): Promise<void> {
    return this.env.speed ? sleep(ms / this.env.speed) : Promise.resolve()
  }

  /** Apply one action with animation and sound. */
  private async perform(a: Action): Promise<Step> {
    const before = this.state
    const prev = before.current
    const player = before.players[prev]!
    const card: Card | undefined =
      a.type === 'play' ? cardAt(before, a) : a.type === 'discard' ? player.hand[a.index] : undefined
    this.busy = true
    if (a.type !== 'endTurn' && card !== undefined) await this.fly(a, card)
    if (a.type === 'play' && this.seats[prev]!.kind === 'human') this.history.push(before)
    const next = applyAction(before, a)
    this.state = next
    this.selected = null
    const snd = this.env.sound
    if (a.type === 'play') {
      snd.play(card === WILD ? 'wild' : 'place', this.streak++)
      if (next.build[a.to]!.length === 0) {
        setTimeout(() => snd.play('pileComplete'), 120)
        this.burstAt(`[data-build="${a.to}"]`)
      }
      if (a.src === 'hand' && player.hand.length === 1 && next.players[prev]!.hand.length > 0) setTimeout(() => snd.play('draw'), 200)
    } else if (a.type === 'discard') snd.play('discard')
    this.render()
    const turnChanged = next.winner === null && next.current !== prev
    // stay locked across a turn change until beginTurn has redrawn the board for the next player,
    // otherwise a fast click lands on the stale screen and is wiped by the redraw
    if (!turnChanged) this.busy = false
    if (next.winner !== null) {
      await this.win()
      return 'win'
    }
    if (turnChanged) {
      snd.play('turnChange')
      await this.wait(250)
      void this.beginTurn()
      return 'turn'
    }
    return 'same'
  }

  private async win(): Promise<void> {
    const s = this.state
    const w = s.winner as number
    const pts = roundPoints(s)
    this.scores[w] = (this.scores[w] ?? 0) + pts
    this.wins[w] = (this.wins[w] ?? 0) + 1
    const winner = this.seats[w] as Seat
    const humanWon = winner.kind === 'human' || this.humans === 0
    this.env.sound.play(humanWon ? 'win' : 'lose')
    const target = this.opts.target
    const matchWinner = target > 0 ? this.scores.findIndex((p) => p >= target) : -1
    const best = target > 0 ? this.scores.indexOf(Math.max(...this.scores)) : w
    const over = target === 0 || matchWinner >= 0
    const lines = this.seats.map((st, i) => {
      const left = s.players[i]!.stock.length
      return `${esc(st.name)}: ${left} card${left === 1 ? '' : 's'} left in stock${target ? ` — total ${this.scores[i]} pts` : ''}`
    })
    await this.wait(400)
    this.render()
    const o = document.createElement('div')
    o.className = 'overlay'
    o.id = 'winner'
    const title = s.stalled
      ? `Stalemate — ${esc(winner.name)} is closest!`
      : over && target
        ? `${esc((this.seats[best] as Seat).name)} ${verb((this.seats[best] as Seat).name)} the match!`
        : `${esc(winner.name)} ${verb(winner.name)}!`
    o.innerHTML = `<h2>${title}</h2>
      <p class="results">${s.stalled ? 'Nobody could play any more cards.' : `+${pts} points this round`}<br>${lines.join('<br>')}</p>
      <div class="menu-buttons">
        <button class="btn green" id="again">${over ? 'Play again' : 'Next round'}</button>
        <button class="btn" id="tomenu">Main menu</button></div>`
    this.root.appendChild(o)
    if (!this.env.reduced && this.env.speed) this.confetti()
    ;(o.querySelector('#again') as HTMLButtonElement).onclick = () => {
      o.remove()
      this.env.sound.play('click')
      if (over) {
        this.scores = this.seats.map(() => 0)
        this.wins = this.seats.map(() => 0)
        this.round = 0
      } else this.round++
      this.root.querySelectorAll('.confetti').forEach((n) => n.remove())
      this.startRound()
    }
    ;(o.querySelector('#tomenu') as HTMLButtonElement).onclick = () => {
      this.env.sound.play('click')
      this.onExit()
    }
  }

  // ---------- input ----------

  private canAct(): boolean {
    return !this.busy && this.state.winner === null && this.seats[this.state.current]!.kind === 'human'
  }

  private onClick(e: MouseEvent): void {
    this.env.sound.unlock()
    const t = e.target as HTMLElement
    const btn = t.closest('[data-act]') as HTMLElement | null
    if (btn) return void this.onButton(btn.dataset.act as string)
    if (!this.canAct()) return
    const hand = t.closest('[data-hand]') as HTMLElement | null
    const stock = t.closest('[data-stock]')
    const disc = t.closest('[data-discard]') as HTMLElement | null
    const build = t.closest('[data-build]') as HTMLElement | null
    const me = this.state.players[this.state.current]!
    if (hand && hand.closest('.tray-hand')) {
      const index = Number(hand.dataset.hand)
      this.select(this.same({ src: 'hand', index }) ? null : { src: 'hand', index })
    } else if (stock && stock.closest('.tray-left')) {
      if (!me.stock.length) return
      this.select(this.same({ src: 'stock' }) ? null : { src: 'stock' })
    } else if (disc && disc.closest('.tray-left')) {
      const pile = Number(disc.dataset.discard)
      const sel = this.selected
      if (sel && sel.src === 'hand') void this.perform({ type: 'discard', index: sel.index, pile })
      else if (sel) {
        if (this.same({ src: 'discard', pile })) this.select(null)
        else this.invalid(disc)
      } else if (me.discards[pile]!.length) this.select({ src: 'discard', pile })
    } else if (build) {
      const to = Number(build.dataset.build)
      const sel = this.selected
      if (!sel) return
      const card = cardAt(this.state, sel)
      if (card !== undefined && canPlayCard(this.state, card, to)) void this.perform({ type: 'play', to, ...sel } as Action)
      else this.invalid(build)
    }
  }

  /** Right-click a discard pile (yours or an opponent's) to see every card in it. */
  private onContext(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest('[data-peek]') as HTMLElement | null
    if (!el) return
    e.preventDefault()
    const [pi, pile] = (el.dataset.peek as string).split(':').map(Number) as [number, number]
    this.peek(pi, pile)
  }

  peek(playerIndex: number, pile: number): void {
    this.root.querySelector('#peek')?.remove()
    const cards = this.state.players[playerIndex]?.discards[pile]
    if (!cards) return
    this.env.sound.play('pickup')
    const seat = this.seats[playerIndex] as Seat
    const o = document.createElement('div')
    o.className = 'overlay'
    o.id = 'peek'
    const w = Math.min(130, Math.floor(1500 / Math.max(1, cards.length)) - 6)
    const list = cards.length
      ? cards
          .map((c, i) => `<div class="peek-card" style="width:${w}px">${cardSvg(c)}${i === cards.length - 1 ? '<span class="peek-top">TOP</span>' : ''}</div>`)
          .join('')
      : '<p>This pile is empty.</p>'
    o.innerHTML = `<p><b>${esc(seat.name)}</b> — discard pile ${pile + 1} (${cards.length} card${cards.length === 1 ? '' : 's'}, oldest first)</p><div class="peek-row">${list}</div><p style="font-size:24px;opacity:.8">Click anywhere or press Esc to close</p>`
    const close = (): void => {
      o.remove()
      window.removeEventListener('keydown', onKey)
    }
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    o.addEventListener('click', close)
    o.addEventListener('contextmenu', (ev) => {
      ev.preventDefault()
      close()
    })
    this.root.appendChild(o)
  }

  private same(src: PlaySource): boolean {
    const s = this.selected
    if (!s || s.src !== src.src) return false
    if (s.src === 'hand') return s.index === (src as { index: number }).index
    if (s.src === 'discard') return s.pile === (src as { pile: number }).pile
    return true
  }

  private select(src: PlaySource | null): void {
    this.selected = src
    if (src) this.env.sound.play('pickup')
    this.render()
  }

  private invalid(el: HTMLElement): void {
    this.env.sound.play('invalid')
    this.streak = 0
    el.classList.remove('shake')
    void el.offsetWidth
    el.classList.add('shake')
  }

  private onButton(act: string): void {
    this.env.sound.play('click')
    if (act === 'menu') return void this.confirmExit()
    if (act === 'settings') return this.openSettings()
    if (!this.canAct()) return
    if (act === 'undo') {
      const prev = this.history.pop()
      if (prev) {
        this.state = prev
        this.selected = null
        this.streak = Math.max(0, this.streak - 1)
        this.render()
      }
    } else if (act === 'hint') this.showHint()
    else if (act === 'end') void this.perform({ type: 'endTurn' })
  }

  private showHint(): void {
    const first = planTurn(this.state, 'hard')[0]
    if (!first) return
    const pick: string[] = []
    if (first.type === 'play') {
      pick.push(first.src === 'hand' ? `.tray-hand [data-hand="${first.index}"]` : first.src === 'stock' ? '.tray-left [data-stock]' : `.tray-left [data-discard="${first.pile}"]`)
      pick.push(`[data-build="${first.to}"]`)
    } else if (first.type === 'discard') pick.push(`.tray-hand [data-hand="${first.index}"]`, `.tray-left [data-discard="${first.pile}"]`)
    else pick.push('[data-act="end"]')
    for (const sel of pick) this.el.querySelector(sel)?.classList.add('hint')
    clearTimeout(this.hintTimer)
    this.hintTimer = setTimeout(() => this.el.querySelectorAll('.hint').forEach((n) => n.classList.remove('hint')), 2600)
  }

  private confirmExit(): void {
    const o = document.createElement('div')
    o.className = 'overlay'
    o.innerHTML = `<h2>Leave game?</h2><p>The current game will be lost.</p><div class="menu-buttons"><button class="btn red" id="yes">Leave</button><button class="btn green" id="no">Keep playing</button></div>`
    this.root.appendChild(o)
    ;(o.querySelector('#no') as HTMLButtonElement).onclick = () => o.remove()
    ;(o.querySelector('#yes') as HTMLButtonElement).onclick = () => {
      o.remove()
      this.onExit()
    }
  }

  private openSettings(): void {
    openSettingsOverlay(this.root, this.env)
  }

  // ---------- rendering ----------

  private pile(cards: Card[], width: number, opt: { data?: string; cascade?: number; maxShow?: number; extra?: string; buildCount?: boolean } = {}): string {
    const casc = opt.cascade ?? 0
    const show = Math.min(cards.length, opt.maxShow ?? 5)
    const h = width * 1.4
    const top = cards[cards.length - 1]
    const under: string[] = []
    for (let i = 0; i < show - 1; i++) {
      const c = cards[cards.length - show + i] as Card
      under.push(`<div class="under" style="top:${i * casc}px">${cardSvg(c)}</div>`)
    }
    const face = top === undefined ? emptySlotSvg(opt.buildCount ? '1' : '') : cardSvg(top)
    const total = show > 0 ? h + (show - 1) * casc : h
    return `<div class="pile ${opt.extra ?? ''}" ${opt.data ?? ''} style="width:${width}px;height:${total}px">${under.join('')}<div style="position:absolute;left:0;top:${Math.max(0, show - 1) * casc}px;width:100%">${face}</div></div>`
  }

  private buildPile(i: number): string {
    const pile = this.state.build[i] as Card[]
    const top = pile[pile.length - 1]
    const width = 130
    let face: string
    if (top === undefined) face = emptySlotSvg('1')
    else face = top === WILD ? cardSvg(WILD, pile.length) : cardSvg(top)
    const sel = this.selected
    const card = sel ? cardAt(this.state, sel) : undefined
    const legal = card !== undefined && canPlayCard(this.state, card, i)
    return `<div class="pile targetable ${legal ? 'legal' : ''}" data-build="${i}" style="width:${width}px;height:${width * 1.4}px">${face}</div>`
  }

  render(): void {
    const s = this.state
    const cur = s.current
    const me = s.players[cur]!
    const seat = this.seats[cur] as Seat
    const humanTurn = seat.kind === 'human'
    const sel = this.selected
    const n = s.players.length
    const opps = Array.from({ length: n - 1 }, (_, k) => (cur + 1 + k) % n)
    const POS: Record<number, [number, number][]> = {
      1: [[760, 30]],
      2: [[440, 30], [1080, 30]],
      3: [[24, 330], [760, 30], [1496, 330]],
      4: [[24, 330], [440, 30], [1080, 30], [1496, 330]],
      5: [[24, 330], [340, 30], [760, 30], [1180, 30], [1496, 330]],
    }
    const seatsHtml = opps
      .map((pi, k) => {
        const p = s.players[pi]!
        const [x, y] = (POS[opps.length] as [number, number][])[k] as [number, number]
        const st = this.seats[pi] as Seat
        const discs = p.discards.map((d, di) => this.pile(d, 62, { cascade: 12, maxShow: 4, data: `data-peek="${pi}:${di}"` })).join('')
        const stock = this.pile(p.stock, 62, { extra: 'stockp' }).replace('</div></div>', `</div><span class="badge stock">${p.stock.length}</span></div>`)
        return `<div class="seat" style="left:${x}px;top:${y}px"><div class="name"><span style="width:18px;height:18px;border-radius:50%;background:${SEAT_COLORS[pi]};border:2px solid #1c2a4a;display:inline-block"></span>${esc(st.name)}${st.kind === 'cpu' ? ' 🤖' : ''}</div><span class="meta">✋ ${p.hand.length}</span><div class="row-cards">${stock}<div style="width:6px"></div>${discs}</div></div>`
      })
      .join('')

    const handW = Math.min(150, Math.floor((1000 - (me.hand.length - 1) * 14) / Math.max(1, me.hand.length)))
    const hand = me.hand
      .map((c, i) => {
        const face = humanTurn ? cardSvg(c) : cardBackSvg()
        return `<div class="pile ${humanTurn ? 'selectable' : ''} ${sel && sel.src === 'hand' && sel.index === i ? 'sel' : ''}" data-hand="${i}" style="width:${handW}px">${face}</div>`
      })
      .join('')
    const selDiscard = sel && sel.src === 'hand'
    const discards = me.discards
      .map((d, i) => {
        const isSel = sel && sel.src === 'discard' && sel.pile === i
        return this.pile(d, 120, {
          data: `data-discard="${i}" data-peek="${cur}:${i}"`,
          cascade: 26,
          maxShow: 6,
          extra: `targetable ${d.length && humanTurn ? 'selectable' : ''} ${selDiscard ? 'legal' : ''} ${isSel ? 'sel' : ''}`,
        })
      })
      .join('')
    const stockSel = sel && sel.src === 'stock'
    const stockPile = this.pile(me.stock, 130, {
      data: 'data-stock',
      extra: `${humanTurn && me.stock.length ? 'selectable' : ''} ${stockSel ? 'sel' : ''}`,
    }).replace(/<\/div><\/div>$/, `</div><span class="badge stock">${me.stock.length}</span></div>`)
    const builds = s.build.map((_, i) => this.buildPile(i)).join('')
    const drawCount = s.draw.length
    const banner = s.winner !== null ? '' : humanTurn ? (mustEndTurn(s) ? 'No cards in hand — end your turn' : sel ? 'Now pick a building pile (or a discard pile for a hand card)' : 'Pick a card to play') : `${esc(seat.name)} is thinking…`
    const board = this.opts.target
      ? this.seats.map((st, i) => `${esc(st.name)}: ${this.scores[i]}`).join('<br>')
      : this.wins.some((w) => w > 0)
        ? this.seats.map((st, i) => `${esc(st.name)}: ${this.wins[i]} win${this.wins[i] === 1 ? '' : 's'}`).join('<br>')
        : ''
    this.el.innerHTML = `<div class="felt-rim"></div>
      ${board ? `<div class="scoreboard">${this.opts.target ? `First to ${this.opts.target}<br>` : ''}${board}</div>` : ''}
      <div class="hud"><button class="btn small" data-act="settings" aria-label="Sound settings">🔊 Sound</button><button class="btn small red" data-act="menu">Menu</button></div>
      ${seatsHtml}
      <div id="center"><div class="center-label">BUILD 1 → 12</div>
        <div class="pile" style="width:130px;height:182px;position:relative">${cardBackSvg()}<span class="badge">${drawCount}</span></div>
        <div class="build-wrap">${builds}</div></div>
      <div class="banner" id="banner">${banner}</div>
      <div id="tray">
        <div class="tray-left turn"><div class="tray-name"><span class="name"><span style="width:20px;height:20px;border-radius:50%;background:${SEAT_COLORS[cur]};border:2px solid #1c2a4a;display:inline-block;margin-right:8px;align-self:center"></span>${esc(seat.name)}${seat.kind === 'cpu' ? ' 🤖' : ''}</span></div>
          <div class="row-cards">${stockPile}<div style="width:10px"></div>${discards}</div></div>
        <div class="hand tray-hand">${hand}</div>
        <div class="side-actions">
          ${humanTurn ? `<button class="btn small" data-act="hint">💡 Hint</button><button class="btn small" data-act="undo" ${this.history.length ? '' : 'disabled'}>↩ Undo</button>` : ''}
          ${humanTurn && mustEndTurn(s) ? '<button class="btn small green" data-act="end">End turn</button>' : ''}
        </div>
      </div>`
  }

  // ---------- animation ----------

  private rectIn(el: Element): { x: number; y: number; w: number; h: number } {
    const r = el.getBoundingClientRect()
    const st = this.root.getBoundingClientRect()
    const sc = this.env.scale()
    return { x: (r.left - st.left) / sc, y: (r.top - st.top) / sc, w: r.width / sc, h: r.height / sc }
  }

  private async fly(a: Action, card: Card): Promise<void> {
    if (!this.env.speed) return
    let from: Element | null = null
    let to: Element | null = null
    if (a.type === 'play') {
      from = a.src === 'hand' ? this.el.querySelector(`.tray-hand [data-hand="${a.index}"]`) : a.src === 'stock' ? this.el.querySelector('.tray-left [data-stock]') : this.el.querySelector(`.tray-left [data-discard="${a.pile}"]`)
      to = this.el.querySelector(`[data-build="${a.to}"]`)
    } else if (a.type === 'discard') {
      from = this.el.querySelector(`.tray-hand [data-hand="${a.index}"]`)
      to = this.el.querySelector(`.tray-left [data-discard="${a.pile}"]`)
    }
    if (!from || !to) return
    const f = this.rectIn(from)
    const t = this.rectIn(to)
    const fly = document.createElement('div')
    fly.className = 'fly'
    const asVal = a.type === 'play' && card === WILD ? this.state.build[a.to]!.length + 1 : undefined
    fly.innerHTML = cardSvg(card, asVal)
    const w = Math.min(f.w, 150)
    fly.style.cssText = `left:${f.x}px;top:${f.y}px;width:${w}px`
    this.root.appendChild(fly)
    const dur = this.env.reduced ? 0.12 : 0.38 / this.env.speed
    await new Promise<void>((resolve) => {
      gsap.to(fly, {
        x: t.x + (t.w - w) / 2 - f.x,
        y: t.y + Math.max(0, t.h - w * 1.4) / 2 - f.y,
        scale: 1,
        rotation: this.env.reduced ? 0 : (Math.random() - 0.5) * 10,
        duration: dur,
        ease: 'power2.inOut',
        onComplete: () => {
          fly.remove()
          resolve()
        },
      })
    })
  }

  private burstAt(selector: string): void {
    if (!this.env.speed || this.env.reduced) return
    const el = this.el.querySelector(selector)
    if (!el) return
    const r = this.rectIn(el)
    const colors = ['#ffd23f', '#ff6b6b', '#4dabf7', '#69db7c', '#da77f2', '#fff']
    for (let i = 0; i < 36; i++) {
      const p = document.createElement('div')
      p.className = 'confetti'
      p.style.cssText = `left:${r.x + r.w / 2}px;top:${r.y + r.h / 2}px;background:${colors[i % colors.length]}`
      this.root.appendChild(p)
      const ang = Math.random() * Math.PI * 2
      const dist = 90 + Math.random() * 190
      gsap.to(p, { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist + 70, rotation: Math.random() * 720, opacity: 0, duration: 0.9 + Math.random() * 0.5, ease: 'power2.out', onComplete: () => p.remove() })
    }
  }

  private confetti(): void {
    const colors = ['#ffd23f', '#ff6b6b', '#4dabf7', '#69db7c', '#da77f2', '#fff']
    for (let i = 0; i < 90; i++) {
      const p = document.createElement('div')
      p.className = 'confetti'
      p.style.cssText = `left:${Math.random() * 1900}px;top:-30px;background:${colors[i % colors.length]}`
      this.root.appendChild(p)
      gsap.to(p, { y: 1150, x: (Math.random() - 0.5) * 300, rotation: Math.random() * 900, duration: 2.5 + Math.random() * 2, delay: Math.random() * 1.2, ease: 'none', repeat: -1, repeatDelay: 0 })
    }
  }
}

