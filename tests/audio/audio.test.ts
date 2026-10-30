import { describe, expect, it, vi } from 'vitest'
import { ALL_SOUNDS, PENTATONIC, noteFreq, pentatonicStep, recipe, recipeDuration } from '../../src/renderer/audio/recipes'
import { BAR, loopNotes } from '../../src/renderer/audio/music'
import { SoundManager } from '../../src/renderer/audio/sound'

function param() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  }
}
function makeCtx(state: 'running' | 'suspended' = 'running') {
  const oscs: any[] = []
  const bufs: any[] = []
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: param(), frequency: param(), Q: param(), threshold: param(), ratio: param() })
  const ctx: any = {
    state,
    currentTime: 1,
    sampleRate: 48000,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createGain: vi.fn(node),
    createDynamicsCompressor: vi.fn(node),
    createBiquadFilter: vi.fn(() => ({ ...node(), type: '' })),
    createBuffer: vi.fn((_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) })),
    createOscillator: vi.fn(() => {
      const o = { ...node(), type: '', start: vi.fn(), stop: vi.fn(), onended: null as null | (() => void) }
      oscs.push(o)
      return o
    }),
    createBufferSource: vi.fn(() => {
      const b = { ...node(), buffer: null, loop: false, start: vi.fn(), stop: vi.fn(), onended: null as null | (() => void) }
      bufs.push(b)
      return b
    }),
  }
  return { ctx, oscs, bufs }
}

describe('recipes', () => {
  it.each(ALL_SOUNDS)('%s is non-empty, short and well-formed', (name) => {
    const v = recipe(name)
    expect(v.length).toBeGreaterThan(0)
    for (const x of v) {
      expect(x.dur).toBeGreaterThan(0)
      expect(x.gain).toBeGreaterThan(0)
      expect(x.gain).toBeLessThanOrEqual(0.4)
      if (x.kind === 'tone') expect(x.freq).toBeGreaterThan(20)
    }
    expect(recipeDuration(v)).toBeLessThan(2.6)
  })

  it('pile-complete reward is under 2 seconds and win fanfare under 2.5', () => {
    expect(recipeDuration(recipe('pileComplete'))).toBeLessThan(2)
    expect(recipeDuration(recipe('win'))).toBeLessThan(2.5)
  })

  it('streak steps up the pentatonic scale and is capped', () => {
    const f = (s: number) => recipe('place', s).find((v) => v.kind === 'tone' && v.wave === 'triangle')!.freq!
    expect(f(1)).toBeGreaterThan(f(0))
    expect(f(5)).toBeGreaterThan(f(4))
    expect(f(99)).toBe(f(5))
    expect(f(-3)).toBe(f(0))
  })

  it('pentatonicStep maps onto scale degrees with octaves', () => {
    for (let n = 0; n < 15; n++) expect(PENTATONIC).toContain(((pentatonicStep(n) % 12) + 12) % 12)
    expect(pentatonicStep(5)).toBe(12)
    expect(noteFreq(12) / noteFreq(0)).toBeCloseTo(2)
  })
})

describe('music loop', () => {
  it('generates in-scale notes within one 4-bar loop', () => {
    let seed = 3
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const notes = loopNotes(rand)
    expect(notes.some((n) => n.kind === 'pad')).toBe(true)
    expect(notes.some((n) => n.kind === 'pluck')).toBe(true)
    for (const n of notes) {
      expect(n.t).toBeGreaterThanOrEqual(0)
      expect(n.t + n.dur).toBeLessThanOrEqual(BAR * 4 + 0.5)
      if (n.kind === 'pluck') expect(PENTATONIC).toContain(((n.semitone - 12) % 12 + 12) % 12)
    }
  })
})

describe('SoundManager', () => {
  it('is silent until unlocked', () => {
    const { ctx, oscs } = makeCtx()
    const sm = new SoundManager(() => ctx)
    sm.play('place')
    expect(oscs).toHaveLength(0)
  })

  it('creates voices, starts them and schedules a stop for each', () => {
    const { ctx, oscs, bufs } = makeCtx()
    const sm = new SoundManager(() => ctx)
    sm.unlock()
    sm.play('place')
    expect(oscs.length + bufs.length).toBe(recipe('place').length)
    for (const s of [...oscs, ...bufs]) {
      expect(s.start).toHaveBeenCalled()
      expect(s.stop).toHaveBeenCalled()
    }
  })

  it('never ramps an envelope exponentially to zero', () => {
    const { ctx } = makeCtx()
    const gains: any[] = []
    const orig = ctx.createGain
    ctx.createGain = vi.fn(() => {
      const g = orig()
      gains.push(g)
      return g
    })
    const sm = new SoundManager(() => ctx)
    sm.unlock()
    for (const n of ALL_SOUNDS) sm.play(n)
    for (const g of gains)
      for (const call of g.gain.exponentialRampToValueAtTime.mock.calls) expect(call[0]).toBeGreaterThan(0)
  })

  it('resumes a suspended context on unlock and before playing', () => {
    const { ctx } = makeCtx('suspended')
    const sm = new SoundManager(() => ctx)
    sm.unlock()
    expect(ctx.resume).toHaveBeenCalledTimes(1)
    sm.play('click')
    expect(ctx.resume).toHaveBeenCalledTimes(2)
  })

  it('mute drives master gain to zero and unmute restores it', () => {
    const { ctx } = makeCtx()
    const sm = new SoundManager(() => ctx)
    sm.unlock()
    const master = ctx.createGain.mock.results[0].value
    sm.set({ muted: true })
    expect(master.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, expect.anything(), expect.anything())
    sm.set({ muted: false })
    expect(master.gain.setTargetAtTime).toHaveBeenLastCalledWith(1, expect.anything(), expect.anything())
  })

  it('caps polyphony', () => {
    const { ctx, oscs, bufs } = makeCtx()
    const sm = new SoundManager(() => ctx)
    sm.unlock()
    for (let i = 0; i < 200; i++) sm.play('shuffle')
    expect(oscs.length + bufs.length).toBeLessThan(40)
  })
})
