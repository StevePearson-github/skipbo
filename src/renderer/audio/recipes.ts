/** Sound recipes are pure data so they can be unit-tested without any audio hardware. */
export type SoundName =
  | 'click'
  | 'shuffle'
  | 'deal'
  | 'draw'
  | 'pickup'
  | 'place'
  | 'discard'
  | 'invalid'
  | 'wild'
  | 'pileComplete'
  | 'turnChange'
  | 'win'
  | 'lose'

export interface Voice {
  kind: 'tone' | 'noise'
  /** Start offset in seconds. */
  t: number
  dur: number
  /** Tone start frequency (Hz); noise voices use filter.freq. */
  freq?: number
  /** Optional end frequency for a pitch glide. */
  freqEnd?: number
  wave?: OscillatorType
  gain: number
  attack?: number
  filter?: { type: BiquadFilterType; freq: number; freqEnd?: number; q?: number }
}

export const PENTATONIC = [0, 2, 4, 7, 9] // major pentatonic semitone offsets
const C4 = 261.63

export function noteFreq(semitonesFromC4: number): number {
  return C4 * Math.pow(2, semitonesFromC4 / 12)
}

/** Semitone offset for step n of an ascending major pentatonic scale (0 = C4). */
export function pentatonicStep(n: number): number {
  const oct = Math.floor(n / 5)
  return 12 * oct + (PENTATONIC[((n % 5) + 5) % 5] as number)
}

const tap = (t: number, gain: number, f: number): Voice[] => [
  { kind: 'noise', t, dur: 0.06, gain, filter: { type: 'lowpass', freq: f, q: 0.7 } },
  { kind: 'tone', t, dur: 0.08, freq: 180, freqEnd: 90, wave: 'sine', gain: gain * 0.7 },
]

function arpeggio(steps: number[], t0: number, gap: number, wave: OscillatorType, gain: number, len = 0.18): Voice[] {
  return steps.map((s, i) => ({
    kind: 'tone' as const,
    t: t0 + i * gap,
    dur: len,
    freq: noteFreq(s),
    wave,
    gain,
    attack: 0.005,
  }))
}

/** Streak raises the pitch of tonal feedback through the pentatonic scale, capped at one octave. */
export function recipe(name: SoundName, streak = 0): Voice[] {
  const k = Math.min(Math.max(streak, 0), 5)
  switch (name) {
    case 'click':
      return [{ kind: 'tone', t: 0, dur: 0.05, freq: 880, freqEnd: 660, wave: 'triangle', gain: 0.12, attack: 0.002 }]
    case 'shuffle': {
      const v: Voice[] = []
      for (let i = 0; i < 10; i++)
        v.push({ kind: 'noise', t: i * 0.055, dur: 0.05, gain: 0.16, filter: { type: 'bandpass', freq: 2400 + (i % 3) * 500, q: 0.9 } })
      return v
    }
    case 'deal':
      return tap(0, 0.22, 1800)
    case 'draw':
      return [{ kind: 'noise', t: 0, dur: 0.09, gain: 0.2, filter: { type: 'bandpass', freq: 1500, freqEnd: 3000, q: 1.2 } }]
    case 'pickup':
      return [{ kind: 'noise', t: 0, dur: 0.05, gain: 0.12, filter: { type: 'highpass', freq: 2500 } }]
    case 'place':
      return [
        ...tap(0, 0.3, 1400),
        { kind: 'tone', t: 0.02, dur: 0.14, freq: noteFreq(pentatonicStep(k + 5)), wave: 'triangle', gain: 0.1, attack: 0.004 },
      ]
    case 'discard':
      return tap(0, 0.22, 900)
    case 'invalid':
      return [
        { kind: 'tone', t: 0, dur: 0.1, freq: 220, wave: 'triangle', gain: 0.18, attack: 0.004 },
        { kind: 'tone', t: 0.11, dur: 0.16, freq: 165, wave: 'triangle', gain: 0.18, attack: 0.004 },
      ]
    case 'wild':
      return [
        ...arpeggio([12, 16, 19, 24, 28], 0, 0.06, 'sine', 0.16, 0.22),
        { kind: 'noise', t: 0, dur: 0.35, gain: 0.07, filter: { type: 'highpass', freq: 5000 } },
      ]
    case 'pileComplete': {
      const run = arpeggio([0, 2, 4, 7, 9, 12].map((s) => s + 12), 0, 0.07, 'triangle', 0.17, 0.2)
      const chord = [0, 4, 7, 12].map<Voice>((s) => ({
        kind: 'tone', t: 0.5, dur: 1.0, freq: noteFreq(s + 12), wave: 'sine', gain: 0.1, attack: 0.02,
      }))
      return [...run, ...chord, { kind: 'noise', t: 0.45, dur: 0.6, gain: 0.08, filter: { type: 'highpass', freq: 3000, freqEnd: 9000 } }]
    }
    case 'turnChange':
      return arpeggio([7, 12], 0, 0.09, 'sine', 0.14, 0.25)
    case 'win':
      return [
        ...arpeggio([0, 4, 7, 12, 16, 19, 24], 0, 0.11, 'triangle', 0.18, 0.3),
        ...[0, 4, 7, 12].map<Voice>((s) => ({ kind: 'tone', t: 0.85, dur: 1.4, freq: noteFreq(s + 12), wave: 'sine', gain: 0.12, attack: 0.03 })),
      ]
    case 'lose':
      return arpeggio([7, 4, 2, 0], 0, 0.18, 'triangle', 0.15, 0.3)
  }
}

export function recipeDuration(v: Voice[]): number {
  return v.reduce((m, x) => Math.max(m, x.t + x.dur), 0)
}

export const ALL_SOUNDS: SoundName[] = [
  'click', 'shuffle', 'deal', 'draw', 'pickup', 'place', 'discard', 'invalid', 'wild', 'pileComplete', 'turnChange', 'win', 'lose',
]
