import { shuffle, nextRandom } from './rng'
import {
  Action,
  Card,
  DEFAULT_CONFIG,
  GameConfig,
  GameState,
  IllegalMoveError,
  PlayMove,
  PlaySource,
  PlayerState,
  WILD,
} from './types'

/** Turns without a single play, per player, after which the game is declared a stalemate. */
export const MAX_DRY_TURNS_PER_PLAYER = 40

export function deckSize(config: GameConfig): number {
  return config.topValue * config.copiesPerNumber + config.wildCount
}

/** Default stock size per official rules: 30 for 2-4 players, 20 for 5-6. */
export function defaultStockSize(playerCount: number): number {
  return playerCount <= 4 ? 30 : 20
}

export function configFor(playerCount: number, overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, stockSize: defaultStockSize(playerCount), ...overrides }
}

/** Throws IllegalMoveError-free plain Error with a human-readable reason if the setup is unplayable. */
export function validateConfig(config: GameConfig, playerCount: number): void {
  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 6)
    throw new Error('Skip-Bo supports 2 to 6 players')
  for (const [k, min] of [
    ['stockSize', 1],
    ['handSize', 1],
    ['discardPiles', 1],
    ['buildPiles', 1],
    ['topValue', 2],
    ['copiesPerNumber', 1],
    ['wildCount', 0],
  ] as const) {
    const v = config[k]
    if (!Number.isInteger(v) || v < min) throw new Error(`${k} must be an integer >= ${min}`)
  }
  const needed = playerCount * (config.stockSize + config.handSize)
  if (needed > deckSize(config))
    throw new Error(
      `Not enough cards: ${playerCount} players need ${needed} cards for stock and hands, deck has ${deckSize(config)}`,
    )
}

export function buildDeck(config: GameConfig): Card[] {
  const deck: Card[] = []
  for (let v = 1; v <= config.topValue; v++)
    for (let c = 0; c < config.copiesPerNumber; c++) deck.push(v)
  for (let w = 0; w < config.wildCount; w++) deck.push(WILD)
  return deck
}

function emptyPlayer(config: GameConfig): PlayerState {
  return { stock: [], hand: [], discards: Array.from({ length: config.discardPiles }, () => []) }
}

export function cloneState(s: GameState): GameState {
  return {
    ...s,
    players: s.players.map((p) => ({
      stock: p.stock.slice(),
      hand: p.hand.slice(),
      discards: p.discards.map((d) => d.slice()),
    })),
    build: s.build.map((b) => b.slice()),
    draw: s.draw.slice(),
    completed: s.completed.slice(),
  }
}

export function newGame(
  playerCount: number,
  config: GameConfig = configFor(playerCount),
  seed = 1,
  firstPlayer?: number,
): GameState {
  validateConfig(config, playerCount)
  let rng = seed >>> 0
  let deck: Card[]
  ;[deck, rng] = shuffle(buildDeck(config), rng)
  const players = Array.from({ length: playerCount }, () => emptyPlayer(config))
  for (const p of players) p.stock = deck.splice(deck.length - config.stockSize, config.stockSize)
  let first = firstPlayer
  if (first === undefined) {
    const [r, next] = nextRandom(rng)
    rng = next
    first = Math.floor(r * playerCount)
  }
  if (first < 0 || first >= playerCount) throw new Error('firstPlayer out of range')
  const state: GameState = {
    config,
    players,
    build: Array.from({ length: config.buildPiles }, () => []),
    draw: deck,
    completed: [],
    current: first,
    winner: null,
    stalled: false,
    rng,
    turnCount: 0,
    idleTurns: 0,
    dryTurns: 0,
  }
  drawUp(state, first)
  return state
}

/** Draw the current player's hand up to handSize, recycling completed piles if needed. Mutates. */
function drawUp(s: GameState, player: number): void {
  const p = s.players[player] as PlayerState
  const need = s.config.handSize - p.hand.length
  for (let i = 0; i < need; i++) {
    if (s.draw.length === 0) {
      if (s.completed.length === 0 && s.config.recycleDiscards) {
        for (const pl of s.players)
          for (const d of pl.discards) if (d.length > 1) s.completed.push(...d.splice(0, d.length - 1))
      }
      if (s.completed.length === 0) break
      const [shuffled, rng] = shuffle(s.completed, s.rng)
      s.rng = rng
      s.draw = shuffled
      s.completed = []
    }
    p.hand.push(s.draw.pop() as Card)
  }
}

export function canPlayCard(state: GameState, card: Card, pile: number): boolean {
  const b = state.build[pile]
  if (!b) return false
  return card === WILD || card === b.length + 1
}

export function cardAt(state: GameState, from: PlaySource, player = state.current): Card | undefined {
  const p = state.players[player]
  if (!p) return undefined
  switch (from.src) {
    case 'hand':
      return p.hand[from.index]
    case 'stock':
      return p.stock[p.stock.length - 1]
    case 'discard': {
      const d = p.discards[from.pile]
      return d ? d[d.length - 1] : undefined
    }
  }
}

/** All distinct legal plays onto building piles for the current player. */
export function legalPlays(state: GameState): PlayMove[] {
  if (state.winner !== null) return []
  const p = state.players[state.current] as PlayerState
  const sources: PlaySource[] = []
  p.hand.forEach((_, index) => sources.push({ src: 'hand', index }))
  if (p.stock.length) sources.push({ src: 'stock' })
  p.discards.forEach((d, pile) => {
    if (d.length) sources.push({ src: 'discard', pile })
  })
  const moves: PlayMove[] = []
  for (const from of sources) {
    const card = cardAt(state, from) as Card
    for (let to = 0; to < state.build.length; to++)
      if (canPlayCard(state, card, to)) moves.push({ type: 'play', from, to })
  }
  return moves
}

/** Hand indices that may be discarded (any card, when the hand is non-empty). */
export function legalDiscards(state: GameState): { index: number; pile: number }[] {
  if (state.winner !== null) return []
  const p = state.players[state.current] as PlayerState
  const out: { index: number; pile: number }[] = []
  p.hand.forEach((_, index) => p.discards.forEach((_d, pile) => out.push({ index, pile })))
  return out
}

/** True if the current player has nothing to discard and so must call endTurn. */
export function mustEndTurn(state: GameState): boolean {
  return state.winner === null && (state.players[state.current] as PlayerState).hand.length === 0
}

function advance(s: GameState): void {
  s.current = (s.current + 1) % s.players.length
  drawUp(s, s.current)
  checkStall(s)
}

/** Nothing left to draw and nobody holds a hand card: no discard can ever happen again. */
function checkStall(s: GameState): void {
  if (s.draw.length || s.completed.length) return
  if (s.players.some((p) => p.hand.length)) return
  // any player who can still play a stock or discard top keeps the game alive
  for (const p of s.players) {
    const tops = [p.stock[p.stock.length - 1], ...p.discards.map((d) => d[d.length - 1])]
    for (const c of tops) {
      if (c === undefined) continue
      for (const b of s.build) if (c === WILD || c === b.length + 1) return
    }
  }
  declareStalemate(s)
}

function declareStalemate(s: GameState): void {
  s.stalled = true
  let best = 0
  s.players.forEach((p, i) => {
    if (p.stock.length < (s.players[best] as PlayerState).stock.length) best = i
  })
  s.winner = best
}

/** Apply an action and return the new state. Throws IllegalMoveError for illegal actions. */
export function applyAction(state: GameState, action: Action): GameState {
  if (state.winner !== null) throw new IllegalMoveError('The game is over')
  const s = cloneState(state)
  s.turnCount++
  const p = s.players[s.current] as PlayerState
  if (action.type === 'endTurn') s.idleTurns++
  else s.idleTurns = 0
  if (action.type === 'play') s.dryTurns = 0
  else s.dryTurns++

  if (action.type === 'play') {
    const from: PlaySource =
      action.src === 'hand'
        ? { src: 'hand', index: action.index }
        : action.src === 'discard'
          ? { src: 'discard', pile: action.pile }
          : { src: 'stock' }
    const card = cardAt(s, from)
    if (card === undefined) throw new IllegalMoveError('No card at that source')
    if (!canPlayCard(s, card, action.to))
      throw new IllegalMoveError(`Card ${card} cannot be played on building pile ${action.to}`)
    // remove from source
    if (from.src === 'hand') p.hand.splice(from.index, 1)
    else if (from.src === 'stock') p.stock.pop()
    else (p.discards[from.pile] as Card[]).pop()
    const pile = s.build[action.to] as Card[]
    pile.push(card)
    if (pile.length === s.config.topValue) {
      s.completed.push(...pile)
      s.build[action.to] = []
    }
    if (p.stock.length === 0) {
      s.winner = s.current
      return s
    }
    if (from.src === 'hand' && p.hand.length === 0) drawUp(s, s.current)
    return s
  }

  if (action.type === 'discard') {
    const card = p.hand[action.index]
    const pile = p.discards[action.pile]
    if (card === undefined) throw new IllegalMoveError('No such hand card')
    if (!pile) throw new IllegalMoveError('No such discard pile')
    p.hand.splice(action.index, 1)
    pile.push(card)
    advance(s)
    if (s.winner === null && s.dryTurns >= MAX_DRY_TURNS_PER_PLAYER * s.players.length) declareStalemate(s)
    return s
  }

  // endTurn
  if (p.hand.length > 0) throw new IllegalMoveError('You must discard a card to end your turn')
  advance(s)
  if (s.winner === null && s.idleTurns >= s.players.length) declareStalemate(s)
  return s
}

/** Total cards across every zone: must always equal deckSize(config). */
export function totalCards(s: GameState): number {
  return (
    s.draw.length +
    s.completed.length +
    s.build.reduce((n, b) => n + b.length, 0) +
    s.players.reduce(
      (n, p) => n + p.stock.length + p.hand.length + p.discards.reduce((m, d) => m + d.length, 0),
      0,
    )
  )
}

/** Official match scoring: 25 for the win, plus 5 per card left in each opponent's stock. */
export function roundPoints(s: GameState): number {
  if (s.winner === null || s.stalled) return 0
  const left = s.players.reduce((n, p, i) => (i === s.winner ? n : n + p.stock.length), 0)
  return 25 + 5 * left
}
