/** Card value: 1..12 are numbered cards, 0 is a Skip-Bo wild. */
export type Card = number
export const WILD = 0

export interface GameConfig {
  /** Cards in each player's stock pile. */
  stockSize: number
  /** Number of Skip-Bo wild cards in the deck. */
  wildCount: number
  /** Cards in a full hand. */
  handSize: number
  /** Personal discard piles per player. */
  discardPiles: number
  /** Shared building piles. */
  buildPiles: number
  /** Highest card; completed building piles are removed at this height. */
  topValue: number
  /** Copies of each number card 1..topValue. */
  copiesPerNumber: number
  /**
   * House rule (not in Mattel's rules, which are silent): when the draw pile and the completed piles are
   * both empty, shuffle every discard card except each pile's top card into a new draw pile.
   * Prevents deadlocks.
   */
  recycleDiscards: boolean
}

export interface PlayerState {
  /** Top of the stock is the LAST element. */
  stock: Card[]
  hand: Card[]
  /** Each discard pile: top is the LAST element. */
  discards: Card[][]
}

export interface GameState {
  config: GameConfig
  players: PlayerState[]
  /** Shared building piles. A pile of length n has top value n (wilds take the next value). */
  build: Card[][]
  draw: Card[]
  /** Completed (cleared) building piles, recycled into the draw pile when it runs out. */
  completed: Card[]
  current: number
  winner: number | null
  /** True when the game ended because no player could ever act again. */
  stalled: boolean
  rng: number
  /** Number of actions applied; useful for logging and stall protection. */
  turnCount: number
  /** Consecutive endTurn actions with no play or discard in between; a full lap means a stalemate. */
  idleTurns: number
  /** Turns ended in a row without any card being played onto a building pile. */
  dryTurns: number
}

export type PlaySource =
  | { src: 'hand'; index: number }
  | { src: 'stock' }
  | { src: 'discard'; pile: number }

export type Action =
  | ({ type: 'play'; to: number } & PlaySource)
  | { type: 'discard'; index: number; pile: number }
  | { type: 'endTurn' }

export interface PlayMove {
  type: 'play'
  from: PlaySource
  to: number
}

export const DEFAULT_CONFIG: GameConfig = {
  stockSize: 30,
  wildCount: 18,
  handSize: 5,
  discardPiles: 4,
  buildPiles: 4,
  topValue: 12,
  copiesPerNumber: 12,
  recycleDiscards: true,
}

export class IllegalMoveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IllegalMoveError'
  }
}
