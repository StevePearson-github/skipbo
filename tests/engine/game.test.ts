import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  IllegalMoveError,
  WILD,
  applyAction,
  buildDeck,
  canPlayCard,
  configFor,
  deckSize,
  defaultStockSize,
  legalDiscards,
  legalPlays,
  mustEndTurn,
  newGame,
  roundPoints,
  totalCards,
  validateConfig,
} from '../../src/shared/engine'
import { scenario } from './helpers'

describe('deck', () => {
  it('has 162 cards: 12 of each 1-12 plus 18 wilds', () => {
    const d = buildDeck(DEFAULT_CONFIG)
    expect(d).toHaveLength(162)
    expect(deckSize(DEFAULT_CONFIG)).toBe(162)
    for (let v = 1; v <= 12; v++) expect(d.filter((c) => c === v)).toHaveLength(12)
    expect(d.filter((c) => c === WILD)).toHaveLength(18)
  })
})

describe('setup', () => {
  it.each([2, 3, 4, 5, 6])('deals correctly for %i players', (n) => {
    const s = newGame(n, undefined, 42, 0)
    const stock = n <= 4 ? 30 : 20
    expect(defaultStockSize(n)).toBe(stock)
    for (const p of s.players) {
      expect(p.stock).toHaveLength(stock)
      expect(p.discards).toHaveLength(4)
    }
    expect(s.players[0]!.hand).toHaveLength(5)
    expect(s.players[1]!.hand).toHaveLength(0)
    expect(s.build).toHaveLength(4)
    expect(totalCards(s)).toBe(162)
    expect(s.winner).toBeNull()
  })

  it('is deterministic for a given seed and differs across seeds', () => {
    const a = newGame(3, undefined, 99)
    const b = newGame(3, undefined, 99)
    const c = newGame(3, undefined, 100)
    expect(a).toEqual(b)
    expect(a.players[0]!.stock).not.toEqual(c.players[0]!.stock)
  })

  it('picks every possible first player across seeds', () => {
    const seen = new Set<number>()
    for (let seed = 1; seed < 200; seed++) seen.add(newGame(4, undefined, seed).current)
    expect(seen.size).toBe(4)
  })

  it('rejects invalid player counts and impossible configs', () => {
    expect(() => newGame(1)).toThrow()
    expect(() => newGame(7)).toThrow()
    expect(() => validateConfig(configFor(6, { stockSize: 30 }), 6)).toThrow(/Not enough cards/)
    expect(() => validateConfig(configFor(2, { handSize: 0 }), 2)).toThrow()
    expect(() => newGame(2, configFor(2), 1, 5)).toThrow()
  })

  it('supports custom options (quick game, fewer piles)', () => {
    const s = newGame(2, configFor(2, { stockSize: 10, discardPiles: 3, buildPiles: 2, handSize: 6 }), 3, 1)
    expect(s.players[0]!.stock).toHaveLength(10)
    expect(s.players[0]!.discards).toHaveLength(3)
    expect(s.build).toHaveLength(2)
    expect(s.players[1]!.hand).toHaveLength(6)
    expect(totalCards(s)).toBe(162)
  })
})

describe('building piles', () => {
  it('starts only with a 1 or wild', () => {
    const s = scenario({ hand: [2, 1, WILD, 5, 12] })
    expect(canPlayCard(s, 2, 0)).toBe(false)
    expect(canPlayCard(s, 1, 0)).toBe(true)
    expect(canPlayCard(s, WILD, 0)).toBe(true)
  })

  it('builds sequentially and rejects out-of-order cards', () => {
    let s = scenario({ hand: [1, 2, 4, 3, 7] })
    s = applyAction(s, { type: 'play', src: 'hand', index: 0, to: 0 })
    s = applyAction(s, { type: 'play', src: 'hand', index: 0, to: 0 })
    expect(s.build[0]).toEqual([1, 2])
    expect(() => applyAction(s, { type: 'play', src: 'hand', index: 0, to: 0 })).toThrow(IllegalMoveError)
    expect(() => applyAction(s, { type: 'play', src: 'hand', index: 0, to: 1 })).toThrow(IllegalMoveError)
  })

  it('a wild takes the next value and later cards follow it', () => {
    let s = scenario({ hand: [1, WILD, 3, 9, 9] })
    s = applyAction(s, { type: 'play', src: 'hand', index: 0, to: 0 })
    s = applyAction(s, { type: 'play', src: 'hand', index: 0, to: 0 }) // wild acts as 2
    expect(canPlayCard(s, 3, 0)).toBe(true)
    expect(canPlayCard(s, 2, 0)).toBe(false)
    s = applyAction(s, { type: 'play', src: 'hand', index: 0, to: 0 })
    expect(s.build[0]).toEqual([1, WILD, 3])
  })

  it('clears at 12 and moves cards to the completed pile', () => {
    const pile = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    let s = scenario({ hand: [12, 3, 3, 3, 3], build: [pile] })
    const before = totalCards(s)
    s = applyAction(s, { type: 'play', src: 'hand', index: 0, to: 0 })
    expect(s.build[0]).toEqual([])
    expect(s.completed).toHaveLength(12)
    expect(totalCards(s)).toBe(before)
  })

  it('a wild on top of an 11 completes the pile', () => {
    const pile = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    let s = scenario({ hand: [WILD, 3, 3, 3, 3], build: [pile] })
    s = applyAction(s, { type: 'play', src: 'hand', index: 0, to: 0 })
    expect(s.build[0]).toEqual([])
    expect(s.completed).toContain(WILD)
  })

  it('cannot play past 12 (a cleared pile restarts at 1)', () => {
    const s = scenario({ hand: [12, 1, 3, 3, 3], build: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]] })
    expect(canPlayCard(s, 1, 0)).toBe(false)
  })
})

describe('plays from every source', () => {
  it('plays from stock and reveals the next card', () => {
    let s = scenario({ stock: [9, 5, 1], hand: [8, 8, 8, 8, 8] })
    s = applyAction(s, { type: 'play', src: 'stock', to: 2 })
    expect(s.build[2]).toEqual([1])
    expect(s.players[0]!.stock).toEqual([9, 5])
  })

  it('plays from a discard pile top only', () => {
    let s = scenario({ discards: [[1, 7], [5, 1]], hand: [8, 8, 8, 8, 8] })
    const plays = legalPlays(s)
    // discard 0 top is 7 (unplayable), discard 1 top is 1
    expect(plays.some((m) => m.from.src === 'discard' && m.from.pile === 0)).toBe(false)
    expect(plays.some((m) => m.from.src === 'discard' && m.from.pile === 1)).toBe(true)
    s = applyAction(s, { type: 'play', src: 'discard', pile: 1, to: 0 })
    expect(s.players[0]!.discards[1]).toEqual([5])
  })

  it('wild on a discard pile top is playable', () => {
    const s = scenario({ discards: [[4, WILD]], hand: [8, 8, 8, 8, 8] })
    expect(legalPlays(s).some((m) => m.from.src === 'discard')).toBe(true)
  })

  it('wild at the top of the stock is playable on a fresh pile', () => {
    const s = scenario({ stock: [3, WILD], hand: [8, 8, 8, 8, 8] })
    expect(legalPlays(s).filter((m) => m.from.src === 'stock')).toHaveLength(4)
  })

  it('errors on empty sources', () => {
    const s = scenario({ hand: [1, 1, 1, 1, 1] })
    expect(() => applyAction(s, { type: 'play', src: 'discard', pile: 0, to: 0 })).toThrow(/No card/)
    expect(() => applyAction(s, { type: 'play', src: 'hand', index: 9, to: 0 })).toThrow(/No card/)
  })
})

describe('turn flow', () => {
  it('discarding ends the turn and the next player draws to 5', () => {
    let s = scenario({ hand: [8, 8, 8, 8, 8] })
    s = applyAction(s, { type: 'discard', index: 0, pile: 1 })
    expect(s.current).toBe(1)
    expect(s.players[0]!.hand).toHaveLength(4)
    expect(s.players[0]!.discards[1]).toEqual([8])
    expect(s.players[1]!.hand).toHaveLength(5)
    expect(totalCards(s)).toBe(162)
  })

  it('turn order wraps around', () => {
    let s = newGame(3, undefined, 5, 2)
    for (const expected of [0, 1, 2, 0]) {
      s = applyAction(s, { type: 'discard', index: 0, pile: 0 })
      expect(s.current).toBe(expected)
    }
  })

  it('refills the hand with 5 after playing all 5 cards', () => {
    let s = scenario({ hand: [1, 2, 3, 4, 5], draw: [9, 9, 9, 9, 9, 9, 9] })
    for (let i = 0; i < 5; i++) s = applyAction(s, { type: 'play', src: 'hand', index: 0, to: 0 })
    expect(s.players[0]!.hand).toEqual([9, 9, 9, 9, 9])
    expect(s.current).toBe(0)
  })

  it('does not refill mid-turn when cards remain in hand', () => {
    let s = scenario({ hand: [1, 5, 6, 7, 8] })
    s = applyAction(s, { type: 'play', src: 'hand', index: 0, to: 0 })
    expect(s.players[0]!.hand).toHaveLength(4)
  })

  it('playing from stock or discard does not refill the hand', () => {
    let s = scenario({ stock: [5, 1], hand: [8, 8, 8, 8, 8] })
    s = applyAction(s, { type: 'play', src: 'stock', to: 0 })
    expect(s.players[0]!.hand).toHaveLength(5)
  })

  it('cannot end the turn without discarding while holding cards', () => {
    const s = scenario({ hand: [8, 8, 8, 8, 8] })
    expect(() => applyAction(s, { type: 'endTurn' })).toThrow(IllegalMoveError)
    expect(mustEndTurn(s)).toBe(false)
  })

  it('rejects bad discards', () => {
    const s = scenario({ hand: [8, 8, 8, 8, 8] })
    expect(() => applyAction(s, { type: 'discard', index: 7, pile: 0 })).toThrow()
    expect(() => applyAction(s, { type: 'discard', index: 0, pile: 9 })).toThrow()
  })

  it('lists legal discards: every card on every pile', () => {
    const s = scenario({ hand: [8, 8, 8, 8, 8] })
    expect(legalDiscards(s)).toHaveLength(5 * 4)
  })

  it('does not mutate the previous state', () => {
    const s = scenario({ hand: [1, 8, 8, 8, 8] })
    const snap = JSON.stringify(s)
    applyAction(s, { type: 'play', src: 'hand', index: 0, to: 0 })
    expect(JSON.stringify(s)).toBe(snap)
  })
})

describe('draw pile recycling', () => {
  it('shuffles completed piles into a new draw pile when it runs out', () => {
    const completed = Array.from({ length: 12 }, (_, i) => i + 1)
    let s = scenario({ hand: [8, 8, 8, 8, 8], draw: [], completed })
    const before = totalCards(s)
    s = applyAction(s, { type: 'discard', index: 0, pile: 0 })
    expect(s.completed).toHaveLength(0)
    expect(s.players[1]!.hand).toHaveLength(5)
    expect(s.draw).toHaveLength(7)
    expect(totalCards(s)).toBe(before)
  })

  it('draws only what is available when nothing can be recycled', () => {
    let s = scenario({ hand: [8, 8, 8, 8, 8], draw: [4, 4] })
    s = applyAction(s, { type: 'discard', index: 0, pile: 0 })
    expect(s.players[1]!.hand).toHaveLength(2)
    expect(s.stalled).toBe(false)
  })

  it('a player with an empty hand ends the turn without discarding', () => {
    let s = scenario({ hand: [8, 8, 8, 8, 8], draw: [], others: { hand: [] } })
    // discard: next player has no cards available to draw
    s = applyAction(s, { type: 'discard', index: 0, pile: 0 })
    expect(s.players[1]!.hand).toHaveLength(0)
    expect(mustEndTurn(s)).toBe(true)
    s = applyAction(s, { type: 'endTurn' })
    expect(s.current).toBe(0)
  })

  it('refills mid-turn from recycled cards', () => {
    const completed = Array.from({ length: 12 }, () => 9)
    let s = scenario({ hand: [1, 2, 3, 4, 5], draw: [], completed })
    for (let i = 0; i < 5; i++) s = applyAction(s, { type: 'play', src: 'hand', index: 0, to: 0 })
    expect(s.players[0]!.hand).toHaveLength(5)
  })
})

describe('winning', () => {
  it('emptying the stock wins immediately, even with cards in hand', () => {
    let s = scenario({ stock: [1], hand: [8, 8, 8, 8, 8], others: { stock: [3, 3, 3] } })
    s = applyAction(s, { type: 'play', src: 'stock', to: 0 })
    expect(s.winner).toBe(0)
    expect(() => applyAction(s, { type: 'discard', index: 0, pile: 0 })).toThrow(/over/)
    expect(legalPlays(s)).toEqual([])
    expect(legalDiscards(s)).toEqual([])
  })

  it('scores 25 plus 5 per card left in opponents stocks', () => {
    let s = scenario({ stock: [1], hand: [8, 8, 8, 8, 8], others: { stock: [3, 3, 3] } })
    s = applyAction(s, { type: 'play', src: 'stock', to: 0 })
    expect(roundPoints(s)).toBe(25 + 5 * 3)
  })

  it('declares a stalemate when nobody can ever discard again', () => {
    let s = scenario({ hand: [8], draw: [], others: { hand: [], stock: [5, 2, 3] }, stock: [4, 5, 6, 7, 9] })
    s = applyAction(s, { type: 'discard', index: 0, pile: 0 })
    expect(s.stalled).toBe(true)
    expect(s.winner).toBe(1)
    expect(roundPoints(s)).toBe(0)
  })
})

describe('house rule: recycle discards', () => {
  it('reshuffles discard piles (except tops) when draw and completed are empty', () => {
    let s = scenario({
      hand: [8, 8, 8, 8, 8],
      draw: [],
      discards: [[1, 2, 3], [4, 5], [], [6]],
      others: { hand: [] },
    })
    const before = totalCards(s)
    s = applyAction(s, { type: 'discard', index: 0, pile: 0 })
    expect(s.players[0]!.discards[0]).toEqual([8])
    expect(s.players[0]!.discards[1]).toEqual([5])
    expect(s.players[0]!.discards[3]).toEqual([6])
    expect(s.players[1]!.hand.slice().sort()).toEqual([1, 2, 3, 4])
    expect(totalCards(s)).toBe(before)
  })

  it('does nothing when the option is off', () => {
    let s = scenario({ hand: [8, 8, 8, 8, 8], draw: [], discards: [[1, 2, 3]] })
    s.config = { ...s.config, recycleDiscards: false }
    s = applyAction(s, { type: 'discard', index: 0, pile: 1 })
    expect(s.players[0]!.discards[0]).toEqual([1, 2, 3])
    expect(s.players[1]!.hand).toHaveLength(0)
  })
})

describe('stalemate guards', () => {
  it('a player who can still play keeps the game alive', () => {
    let s = scenario({ hand: [8], draw: [], stock: [4, 5, 6, 7, 9], others: { hand: [], stock: [2, 1] } })
    s.config = { ...s.config, recycleDiscards: false }
    s = applyAction(s, { type: 'discard', index: 0, pile: 0 })
    expect(s.stalled).toBe(false)
    expect(legalPlays(s).length).toBeGreaterThan(0)
  })

  it('declares a stalemate after too many turns without any play', () => {
    let s = scenario({ hand: [8, 8, 8, 8, 8], stock: [9, 9], others: { stock: [9, 9] } })
    s.dryTurns = 40 * 2 - 1
    s = applyAction(s, { type: 'discard', index: 0, pile: 0 })
    expect(s.stalled).toBe(true)
  })
})
