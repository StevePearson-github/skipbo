import { SoundName, Voice, recipe } from './recipes'
import { MusicEngine } from './music'

export interface SoundSink {
  play(name: SoundName, streak?: number): void
}

export interface AudioSettings {
  sfxVolume: number
  musicVolume: number
  muted: boolean
}

/** Web Audio synthesizer. All sound is generated at runtime; there are no sample files. */
export class SoundManager implements SoundSink {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private sfx!: GainNode
  private musicBus!: GainNode
  private noise!: AudioBuffer
  private music: MusicEngine | null = null
  private active = 0
  settings: AudioSettings = { sfxVolume: 0.8, musicVolume: 0.25, muted: false }

  constructor(private readonly factory: () => AudioContext = () => new AudioContext()) {}

  /** Create or resume the context. Call from a user gesture (first click). */
  unlock(): void {
    if (!this.ctx) {
      const ctx = this.factory()
      this.ctx = ctx
      this.master = ctx.createGain()
      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -10
      limiter.ratio.value = 12
      this.sfx = ctx.createGain()
      this.musicBus = ctx.createGain()
      this.sfx.connect(this.master)
      this.musicBus.connect(this.master)
      this.master.connect(limiter)
      limiter.connect(ctx.destination)
      this.noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate)
      const d = this.noise.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      this.music = new MusicEngine(ctx, this.musicBus)
      this.apply()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  apply(): void {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : 1, t, 0.03)
    this.sfx.gain.setTargetAtTime(this.settings.sfxVolume, t, 0.03)
    this.musicBus.gain.setTargetAtTime(this.settings.musicVolume, t, 0.05)
  }

  set(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch }
    this.apply()
  }

  startMusic(): void {
    this.music?.start()
  }
  stopMusic(): void {
    this.music?.stop()
  }
  /** Briefly lower the music, e.g. under fanfares. */
  duck(seconds = 2): void {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.musicBus.gain.cancelScheduledValues(t)
    this.musicBus.gain.setTargetAtTime(this.settings.musicVolume * 0.5, t, 0.05)
    this.musicBus.gain.setTargetAtTime(this.settings.musicVolume, t + seconds, 0.4)
  }

  play(name: SoundName, streak = 0): void {
    if (!this.ctx) return
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    if (this.active > 24) return // polyphony cap
    const base = this.ctx.currentTime + 0.005
    const jitter = 1 + (Math.random() - 0.5) * 0.06
    for (const v of recipe(name, streak)) this.voice(v, base, jitter)
    if (name === 'win' || name === 'pileComplete') this.duck(name === 'win' ? 3 : 1.5)
  }

  private voice(v: Voice, base: number, jitter: number): void {
    const ctx = this.ctx as AudioContext
    const start = base + v.t
    const end = start + v.dur
    const g = ctx.createGain()
    const attack = v.attack ?? 0.003
    g.gain.setValueAtTime(0, start)
    g.gain.linearRampToValueAtTime(v.gain, start + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, end)
    let src: AudioScheduledSourceNode
    if (v.kind === 'tone') {
      const o = ctx.createOscillator()
      o.type = v.wave ?? 'sine'
      o.frequency.setValueAtTime((v.freq ?? 440) * jitter, start)
      if (v.freqEnd) o.frequency.exponentialRampToValueAtTime(v.freqEnd * jitter, end)
      src = o
    } else {
      const n = ctx.createBufferSource()
      n.buffer = this.noise
      n.loop = true
      src = n
    }
    let tail: AudioNode = src
    if (v.filter) {
      const f = ctx.createBiquadFilter()
      f.type = v.filter.type
      f.frequency.setValueAtTime(v.filter.freq, start)
      if (v.filter.freqEnd) f.frequency.exponentialRampToValueAtTime(v.filter.freqEnd, end)
      f.Q.value = v.filter.q ?? 1
      tail.connect(f)
      tail = f
    }
    tail.connect(g)
    g.connect(this.sfx)
    this.active++
    src.onended = () => {
      this.active--
      g.disconnect()
    }
    src.start(start)
    src.stop(end + 0.02)
  }
}

/** Test double and silent fallback. */
export class NullSound implements SoundSink {
  played: { name: SoundName; streak: number }[] = []
  play(name: SoundName, streak = 0): void {
    this.played.push({ name, streak })
  }
}
