import { GameState, configFor, newGame } from '../../src/shared/engine'

/** Build a hand-crafted state for scenario tests. Stock/hand/discard tops are the LAST element. */
export function scenario(
  patch: {
    players?: number
    hand?: number[]
    stock?: number[]
    discards?: number[][]
    build?: number[][]
    draw?: number[]
    completed?: number[]
    others?: { hand?: number[]; stock?: number[] }
  } = {},
): GameState {
  const n = patch.players ?? 2
  const s = newGame(n, configFor(n), 7, 0)
  s.draw = patch.draw ?? s.draw
  s.completed = patch.completed ?? []
  const p = s.players[0]!
  if (patch.hand) p.hand = patch.hand.slice()
  if (patch.stock) p.stock = patch.stock.slice()
  if (patch.discards) patch.discards.forEach((d, i) => (p.discards[i] = d.slice()))
  if (patch.build) patch.build.forEach((b, i) => (s.build[i] = b.slice()))
  if (patch.others) {
    const o = s.players[1]!
    if (patch.others.hand) o.hand = patch.others.hand.slice()
    if (patch.others.stock) o.stock = patch.others.stock.slice()
  }
  return s
}
