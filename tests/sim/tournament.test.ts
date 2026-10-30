import { describe, expect, it } from 'vitest'
import { Difficulty } from '../../src/shared/ai'
import { playGame } from '../../src/shared/ai/runGame'
import { totalCards, deckSize } from '../../src/shared/engine'

const GAMES = Number(process.env.SIM_GAMES ?? 60)

describe('simulation', () => {
  it.each([2, 3, 4, 5, 6])('%i-player games always finish with all cards conserved', (n) => {
    const levels = Array.from({ length: n }, (_, i) => (['easy', 'medium', 'hard'] as Difficulty[])[i % 3]!)
    let stalled = 0
    for (let seed = 1; seed <= GAMES; seed++) {
      const { state } = playGame(levels, seed * 31 + n)
      expect(state.winner).not.toBeNull()
      expect(totalCards(state)).toBe(deckSize(state.config))
      if (state.stalled) stalled++
    }
    expect(stalled).toBeLessThan(GAMES * 0.15)
  })

  const head = (a: Difficulty, b: Difficulty) => {
    let aw = 0
    const N = GAMES
    for (let seed = 1; seed <= N; seed++) {
      // alternate seats to cancel first-player advantage
      const levels = seed % 2 ? [a, b] : [b, a]
      const { state } = playGame(levels, seed + 1000)
      const winner = levels[state.winner as number]
      if (winner === a) aw++
    }
    return aw / N
  }

  it('medium beats easy clearly', () => {
    expect(head('medium', 'easy')).toBeGreaterThan(0.7)
  })
  it('hard beats medium', () => {
    expect(head('hard', 'medium')).toBeGreaterThan(0.55)
  })
  it('hard beats easy clearly', () => {
    expect(head('hard', 'easy')).toBeGreaterThan(0.8)
  })
})
