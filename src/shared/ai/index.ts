import {
  Action,
  Card,
  GameState,
  PlayerState,
  WILD,
  applyAction,
  legalDiscards,
  legalPlays,
  mustEndTurn,
} from '../engine'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface AIWeights {
  stockCard: number
  handEmptied: number
  keepWild: number
  blockPenalty: number
  /** Reward per card played onto the building piles (keeps cards flowing). */
  progress: number
  /** Extra reward per card in a completed pile (it returns to the draw pile). */
  recycle: number
  nodeCap: number
}

export const HARD_WEIGHTS: AIWeights = {
  stockCard: 60,
  handEmptied: 30,
  keepWild: 9,
  blockPenalty: 14,
  progress: 5,
  recycle: 4,
  nodeCap: 2500,
}

export type Rand = () => number

function playToAction(m: ReturnType<typeof legalPlays>[number]): Action {
  return { type: 'play', to: m.to, ...m.from } as Action
}

/** Value of a hand card before it is discarded onto `pile` (higher is a better discard). */
export function discardScore(player: PlayerState, card: Card, pile: Card[]): number {
  let s = 0
  if (card === WILD) s -= 100
  const top = pile[pile.length - 1]
  if (top === undefined) s -= 2
  else if (top === card) s += 6
  else if (top === card + 1) s += 10
  else if (top > card + 1) s += 10 - (top - card - 1)
  else s -= 8 + (card - top)
  // do not bury cards the stock will soon need
  const need = new Set(player.stock.slice(-4).filter((c) => c !== WILD))
  for (const c of pile) if (need.has(c)) s -= 6
  if (need.has(card)) s -= 2
  // low cards start building piles; keep them in hand
  if (card <= 2) s -= 3
  return s
}

function bestDiscard(state: GameState): { index: number; pile: number; score: number } | null {
  const p = state.players[state.current] as PlayerState
  let best: { index: number; pile: number; score: number } | null = null
  for (const d of legalDiscards(state)) {
    const score = discardScore(p, p.hand[d.index] as Card, p.discards[d.pile] as Card[])
    if (!best || score > best.score) best = { ...d, score }
  }
  return best
}

function finish(state: GameState): Action {
  if (mustEndTurn(state)) return { type: 'endTurn' }
  const d = bestDiscard(state) as { index: number; pile: number }
  return { type: 'discard', index: d.index, pile: d.pile }
}

/** Plan a complete turn for the current player. Ends with a discard/endTurn, a win, or a hand refill. */
export function planTurn(state: GameState, level: Difficulty, rand: Rand = Math.random): Action[] {
  if (state.winner !== null) return []
  if (level === 'easy') return planEasy(state, rand)
  if (level === 'medium') return planMedium(state)
  return planHard(state, HARD_WEIGHTS)
}

function randomDiscard(state: GameState, rand: Rand): Action {
  if (mustEndTurn(state)) return { type: 'endTurn' }
  const ds = legalDiscards(state)
  const d = ds[Math.floor(rand() * ds.length)] as { index: number; pile: number }
  return { type: 'discard', index: d.index, pile: d.pile }
}

function planEasy(start: GameState, rand: Rand): Action[] {
  const actions: Action[] = []
  let s = start
  for (let guard = 0; guard < 60; guard++) {
    const plays = legalPlays(s)
    const handEmpty = (s.players[s.current] as PlayerState).hand.length === 0
    if (plays.length === 0 || (!handEmpty && rand() > 0.6)) break
    // easy players notice stock plays most of the time, otherwise they pick any legal play
    const stockPlays = plays.filter((m) => m.from.src === 'stock')
    const pool = stockPlays.length && rand() < 0.75 ? stockPlays : plays
    const a = playToAction(pool[Math.floor(rand() * pool.length)] as ReturnType<typeof legalPlays>[number])
    const handBefore = (s.players[s.current] as PlayerState).hand.length
    s = applyAction(s, a)
    actions.push(a)
    if (s.winner !== null) return actions
    if (a.type === 'play' && a.src === 'hand' && handBefore === 1) return actions // refilled
  }
  actions.push(randomDiscard(s, rand))
  return actions
}

function planMedium(start: GameState): Action[] {
  const actions: Action[] = []
  let s = start
  for (let guard = 0; guard < 60; guard++) {
    const p = s.players[s.current] as PlayerState
    const plays = legalPlays(s)
    if (plays.length === 0) break
    const cardOf = (m: (typeof plays)[number]): Card =>
      m.from.src === 'hand'
        ? (p.hand[m.from.index] as Card)
        : m.from.src === 'stock'
          ? (p.stock[p.stock.length - 1] as Card)
          : ((p.discards[m.from.pile] as Card[]).at(-1) as Card)
    const stockPlays = plays.filter((m) => m.from.src === 'stock')
    let choice: (typeof plays)[number] | undefined = stockPlays[0]
    if (!choice) {
      const stockTop = p.stock[p.stock.length - 1]
      // a wild is worth spending if it makes the stock card playable next
      const enabling = plays.find(
        (m) =>
          cardOf(m) === WILD &&
          stockTop !== undefined &&
          stockTop !== WILD &&
          (s.build[m.to] as Card[]).length + 2 === stockTop,
      )
      const numbered = plays.filter((m) => cardOf(m) !== WILD)
      choice =
        enabling ??
        numbered.find((m) => m.from.src === 'discard') ??
        numbered[0]
      // spend a wild only to empty the hand when it is the last hand card
      if (!choice) {
        const wilds = plays.filter((m) => m.from.src === 'hand')
        if (wilds.length && p.hand.length === 1) choice = wilds[0]
        // nothing else to do this turn: a wild on a discard top may as well be used
        else if (p.hand.length === 0) choice = plays[0]
      }
    }
    if (!choice) break
    const a = playToAction(choice)
    const handBefore = p.hand.length
    s = applyAction(s, a)
    actions.push(a)
    if (s.winner !== null) return actions
    if (a.type === 'play' && a.src === 'hand' && handBefore === 1) return actions
  }
  actions.push(finish(s))
  return actions
}

function stateKey(s: GameState): string {
  const p = s.players[s.current] as PlayerState
  return [
    s.build.map((b) => b.length).join(','),
    p.hand.slice().sort().join(','),
    p.stock.length,
    p.discards.map((d) => d.join('.')).join('|'),
  ].join('/')
}

function evaluate(s: GameState, me: number, w: AIWeights, handEmptied: boolean): number {
  const p = s.players[me] as PlayerState
  if (s.winner === me) return 1e6
  let score = -w.stockCard * p.stock.length
  if (handEmptied) score += w.handEmptied
  score += w.keepWild * p.hand.filter((c) => c === WILD).length
  const inPlay = s.build.reduce((n, b) => n + b.length, 0) + s.completed.length
  score += w.progress * inPlay + w.recycle * s.completed.length
  // blocking: do not leave building piles one short of an opponent's stock card
  s.players.forEach((o, i) => {
    if (i === me) return
    const top = o.stock[o.stock.length - 1]
    if (top === undefined || top === WILD) return
    const urgency = 1 + (o.stock.length <= 5 ? 1 : 0)
    for (const b of s.build) if (b.length + 1 === top) score -= w.blockPenalty * urgency
  })
  return score
}

function planHard(start: GameState, w: AIWeights): Action[] {
  const me = start.current
  let nodes = 0
  const seen = new Map<string, number>()
  let best: { score: number; actions: Action[] } = { score: -Infinity, actions: [] }

  const dfs = (s: GameState, acts: Action[]): void => {
    nodes++
    // option 1: stop here
    if (s.winner === me) {
      if (1e6 > best.score) best = { score: 1e6, actions: acts.slice() }
      return
    }
    const p = s.players[me] as PlayerState
    if (p.hand.length > 0 || mustEndTurn(s)) {
      const stop = finish(s)
      const after = applyAction(s, stop)
      let sc = evaluate(after, me, w, false)
      if (stop.type === 'discard') sc += (bestDiscard(s) as { score: number }).score
      if (sc > best.score) best = { score: sc, actions: [...acts, stop] }
    }
    if (nodes >= w.nodeCap) return
    const key = stateKey(s)
    const prev = seen.get(key)
    if (prev !== undefined && prev <= acts.length) return
    seen.set(key, acts.length)

    const plays = legalPlays(s)
    const cardOf = (m: (typeof plays)[number]): Card =>
      m.from.src === 'hand'
        ? (p.hand[m.from.index] as Card)
        : m.from.src === 'stock'
          ? (p.stock[p.stock.length - 1] as Card)
          : ((p.discards[m.from.pile] as Card[]).at(-1) as Card)
    const tried = new Set<string>()
    // stock plays first, then discards, then hand; wilds last
    const order = plays.slice().sort((a, b) => {
      const rank = (m: (typeof plays)[number]) =>
        (cardOf(m) === WILD ? 10 : 0) + (m.from.src === 'stock' ? 0 : m.from.src === 'discard' ? 1 : 2)
      return rank(a) - rank(b)
    })
    for (const m of order) {
      const sig = `${m.from.src}:${cardOf(m)}:${(s.build[m.to] as Card[]).length}:${m.from.src === 'discard' ? (m.from as { pile: number }).pile : ''}`
      if (tried.has(sig)) continue
      tried.add(sig)
      const a = playToAction(m)
      const handBefore = p.hand.length
      const next = applyAction(s, a)
      if (next.winner === me) {
        if (1e6 > best.score) best = { score: 1e6, actions: [...acts, a] }
        continue
      }
      if (m.from.src === 'hand' && handBefore === 1) {
        // hand refilled: cannot see the new cards, so the plan ends here
        const sc = evaluate(next, me, w, true) - w.keepWild * 0
        if (sc > best.score) best = { score: sc, actions: [...acts, a] }
        continue
      }
      dfs(next, [...acts, a])
      if (nodes >= w.nodeCap) return
    }
  }
  dfs(start, [])
  return best.actions
}
