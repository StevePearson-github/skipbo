import { Difficulty } from '../../shared/ai'
import { SoundManager } from '../audio/sound'

export interface Seat {
  name: string
  kind: 'human' | 'cpu'
  level: Difficulty
}

export interface SetupOptions {
  seats: Seat[]
  /** 0 = default for player count (30, or 20 for 5-6). */
  stockSize: number
  /** 0 = single game; otherwise play to this many points. */
  target: number
  /** Show a "pass the device" screen between human turns. */
  passScreen: boolean
}

export interface Env {
  sound: SoundManager
  /** 0 disables waits and animation (used by tests). */
  speed: number
  reduced: boolean
  seed?: number
  /** Persist a settings patch (no-op in a plain browser). */
  save(patch: Record<string, unknown>): void
  scale(): number
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export const SEAT_COLORS = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#da77f2', '#ffa94d']

export function defaultSetup(): SetupOptions {
  const names = ['You', 'Pixel', 'Bolt', 'Nova', 'Pogo', 'Zig']
  return {
    seats: names.map((name, i) => ({ name, kind: i === 0 ? 'human' : 'cpu', level: 'medium' as Difficulty })),
    stockSize: 0,
    target: 0,
    passScreen: true,
  }
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
}
