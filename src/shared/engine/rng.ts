/** mulberry32: tiny seedable PRNG. State is a plain uint32 so game state stays serializable. */
export function nextRandom(state: number): [number, number] {
  const s = (state + 0x6d2b79f5) >>> 0
  let t = s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s]
}

/** Fisher-Yates shuffle returning a new array and the advanced rng state. */
export function shuffle<T>(items: readonly T[], rng: number): [T[], number] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const [r, next] = nextRandom(rng)
    rng = next
    const j = Math.floor(r * (i + 1))
    const tmp = a[i] as T
    a[i] = a[j] as T
    a[j] = tmp
  }
  return [a, rng]
}
