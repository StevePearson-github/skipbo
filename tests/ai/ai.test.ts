import { describe, expect, it } from 'vitest'
import { WILD, applyAction, legalPlays } from '../../src/shared/engine'
import { planTurn } from '../../src/shared/ai'
import { playGame, seededRand } from '../../src/shared/ai/runGame'
import { scenario } from '../engine/helpers'

describe('AI planning', () => {
  it.each(['easy', 'medium', 'hard'] as const)('%s returns only legal actions that end the turn properly', (level) => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = scenario({ hand: [1, 2, 3, 9, 12], stock: [4, 7, 2] })
      const plan = planTurn(s, level, seededRand(seed))
      expect(plan.length).toBeGreaterThan(0)
      for (const a of plan) s = applyAction(s, a)
    }
  })

  it('hard and medium play the stock card when possible', () => {
    for (const level of ['medium', 'hard'] as const) {
      const s = scenario({ hand: [8, 9, 10, 11, 12], stock: [5, 1] })
      const plan = planTurn(s, level)
      expect(plan[0]).toMatchObject({ type: 'play', src: 'stock' })
    }
  })

  it('hard wins immediately when the last stock card is playable', () => {
    const s = scenario({ hand: [8, 9, 10, 11, 12], stock: [1] })
    const plan = planTurn(s, 'hard')
    let t = s
    for (const a of plan) t = applyAction(t, a)
    expect(t.winner).toBe(0)
  })

  it('hard chains a wild to reach the stock card', () => {
    // stock 3: needs a pile at height 2; hand has 1 and a wild
    const s = scenario({ hand: [1, WILD, 9, 9, 9], stock: [3] })
    const plan = planTurn(s, 'hard')
    let t = s
    for (const a of plan) t = applyAction(t, a)
    expect(t.winner).toBe(0)
  })

  it('does not spend a wild needlessly (medium)', () => {
    const s = scenario({ hand: [WILD, 8, 9, 10, 11], stock: [7, 5] })
    const plan = planTurn(s, 'medium')
    expect(plan.every((a) => !(a.type === 'play' && a.src === 'hand' && a.index === 0))).toBe(true)
  })

  it('never discards a wild when another card is available', () => {
    const s = scenario({ hand: [WILD, 8, 9, 10, 11], stock: [7, 5] })
    for (const level of ['medium', 'hard'] as const) {
      const plan = planTurn(s, level)
      const last = plan.at(-1)!
      expect(last).toMatchObject({ type: 'discard' })
      if (last.type === 'discard') expect(last.index).not.toBe(0)
    }
  })

  it('returns an empty plan once the game is won', () => {
    const s = scenario({ stock: [1], hand: [8, 8, 8, 8, 8] })
    const w = applyAction(s, { type: 'play', src: 'stock', to: 0 })
    expect(planTurn(w, 'hard')).toEqual([])
  })

  it('plans legally with an empty hand and nothing to draw', () => {
    const s = scenario({ hand: [], draw: [], stock: [7, 5], others: { hand: [3] } })
    const plan = planTurn(s, 'hard')
    expect(plan.at(-1)).toEqual({ type: 'endTurn' })
    expect(legalPlays(s).length).toBe(0)
  })
})

describe('full games', () => {
  it.each([2, 3, 4, 5, 6])('AI-only game completes for %i players', (n) => {
    for (let seed = 1; seed <= 5; seed++) {
      const levels = Array.from({ length: n }, (_, i) => (['easy', 'medium', 'hard'] as const)[i % 3]!)
      const { state } = playGame(levels, seed)
      expect(state.winner).not.toBeNull()
    }
  })
})
