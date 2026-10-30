import { GameState, applyAction, configFor, newGame } from '../engine'
import { Difficulty, Rand, planTurn } from './index'
import { nextRandom } from '../engine/rng'

export function seededRand(seed: number): Rand {
  let s = seed >>> 0
  return () => {
    const [r, n] = nextRandom(s)
    s = n
    return r
  }
}

/** Play a full game headlessly. Throws if the AI ever makes an illegal move or the game fails to finish. */
export function playGame(
  levels: Difficulty[],
  seed: number,
  maxActions = 20000,
): { state: GameState; actions: number } {
  const rand = seededRand(seed * 7919 + 1)
  let state = newGame(levels.length, configFor(levels.length), seed)
  let actions = 0
  while (state.winner === null) {
    const plan = planTurn(state, levels[state.current] as Difficulty, rand)
    if (plan.length === 0) throw new Error('AI returned an empty plan')
    for (const a of plan) {
      state = applyAction(state, a)
      if (++actions > maxActions) throw new Error(`Game did not finish within ${maxActions} actions (seed ${seed})`)
      if (state.winner !== null) break
    }
  }
  return { state, actions }
}
