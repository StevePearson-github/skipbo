import { noteFreq } from './recipes'

export interface MusicNote {
  t: number
  dur: number
  semitone: number
  kind: 'pad' | 'pluck'
}

// I - vi - IV - V in C major, root semitones from C4 and triad shapes
const CHORDS: { root: number; tones: number[] }[] = [
  { root: -12, tones: [0, 4, 7] },
  { root: -15, tones: [0, 3, 7] },
  { root: -19, tones: [0, 4, 7] },
  { root: -17, tones: [0, 4, 7] },
]
const MELODY = [0, 2, 4, 7, 9, 12]
export const BPM = 80
export const BAR = (60 / BPM) * 4

/** Pure data for one 4-bar loop; `rand` supplies the melody random walk. */
export function loopNotes(rand: () => number): MusicNote[] {
  const notes: MusicNote[] = []
  CHORDS.forEach((c, bar) => {
    for (const tone of c.tones)
      notes.push({ t: bar * BAR, dur: BAR * 0.98, semitone: c.root + tone + 12, kind: 'pad' })
  })
  let idx = 2
  const beat = 60 / BPM
  for (let b = 0; b < 16; b++) {
    if (rand() < 0.45) continue
    idx = Math.min(MELODY.length - 1, Math.max(0, idx + Math.floor(rand() * 3) - 1))
    notes.push({ t: b * beat, dur: beat * 1.6, semitone: (MELODY[idx] as number) + 12, kind: 'pluck' })
  }
  return notes
}

/** Unobtrusive generative loop scheduled ahead of time on the audio clock. */
export class MusicEngine {
  private timer: ReturnType<typeof setInterval> | null = null
  private nextLoop = 0

  constructor(
    private readonly ctx: AudioContext,
    private readonly bus: AudioNode,
  ) {}

  start(): void {
    if (this.timer) return
    this.nextLoop = this.ctx.currentTime + 0.2
    this.timer = setInterval(() => this.tick(), 250)
    this.tick()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private tick(): void {
    while (this.nextLoop < this.ctx.currentTime + 1.0) {
      for (const n of loopNotes(Math.random)) this.note(n, this.nextLoop + n.t)
      this.nextLoop += BAR * 4
    }
  }

  private note(n: MusicNote, at: number): void {
    const ctx = this.ctx
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = n.kind === 'pad' ? 'triangle' : 'sine'
    o.frequency.value = noteFreq(n.semitone)
    const peak = n.kind === 'pad' ? 0.05 : 0.09
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(peak, at + (n.kind === 'pad' ? 0.4 : 0.01))
    g.gain.linearRampToValueAtTime(0.0001, at + n.dur)
    o.connect(g)
    g.connect(this.bus)
    o.start(at)
    o.stop(at + n.dur + 0.05)
  }
}
