# Sound Design for a Synthesized (Web Audio API) Skip-Bo Desktop Game

Note on sourcing: web sources fetched were MDN pages, Chrome's autoplay blog, and the jsfxr README. They give API mechanics, not game-sound recipes. All concrete frequencies/envelopes below are my own design starting points (tagged as Inferences), not sourced facts; they need tuning by ear.

## 1. Which sound events does the game need, and what should each feel like?

### Takeaway
About 20 events cover a card game; split them into frequent "tactile" sounds (noise-based, very short, quiet, never fatiguing) and rare "reward" sounds (tonal chimes/arpeggios). Frequent sounds must be subtle and slightly randomized; rare ones can be big.

### Cited Findings
- jsfxr (a JS port of sfxr) frames game SFX as presets such as pickupCoin, powerUp, hitHurt, blipSelect, click, jump, and parameterizes sounds by wave type, base frequency, envelope, arpeggio, vibrato, duty, LPF/HPF — a useful vocabulary for the tonal events — [jsfxr README](https://github.com/chr15m/jsfxr)

### Inferences (proposed event list; Skip-Bo specifics: stock pile, 4 discard piles, hand of 5, 4 building piles 1..12, Skip-Bo = wild)
| Event | Feel | Synthesis class |
|---|---|---|
| shuffle | papery riffle, ~0.6-0.9 s | noise bursts train |
| deal | quick flicks, one per card, ~60-90 ms apart | noise tick |
| draw (refill hand) | soft swish | filtered noise sweep |
| pickUp (select card) | light lift, rising | short noise + tiny rising blip |
| place (to building pile) | soft "tap" on felt, satisfying | noise thump + low sine |
| discard | slightly duller/lower tap | same as place, lower filter |
| invalid | gentle "nope", never harsh | two low descending triangle blips |
| wild (Skip-Bo card) | sparkly, magical, rising | fast arpeggio + shimmer |
| pileComplete (12 reached) | big reward: bell glissando + chord | arpeggio up to chord + noise sparkle; pile cleared swoosh |
| turnChange (your turn) | friendly two-note ping | 2 sine/triangle notes |
| opponentTurn | softer, lower single note | 1 note, lower volume |
| stockCardPlayed | emphasized place (stock is the win condition) | place + small chime |
| win | ~2-3 s major fanfare | square/saw brass-like + arpeggio |
| lose | short descending minor, gentle | triangle descent |
| buttonClick / hover | tiny tick / even tinier tick | 20-40 ms |
| toggle on/off, menu open/close | optional | blips |
- Design rule: rate-limit hover; add +-3-5% random pitch and +-10% gain variation to repeated SFX so they do not sound machine-gunned.

### Gaps
- No authoritative source found for "ideal" card-game sound event lists; list above is design judgment.

## 2. Web Audio synthesis recipes (card sounds, chimes, fanfares)

### Takeaway
Card sounds = short enveloped noise through biquad filters (+ optional low sine for body); chimes = sine/triangle partials with exponential decay; fanfares = scheduled note arrays with detuned square/saw through a lowpass. Everything is scheduled on the audio clock.

### Cited Findings
- Noise: fill an AudioBuffer with `Math.random()*2-1`, play with AudioBufferSourceNode, shape with a bandpass BiquadFilterNode — [MDN Advanced techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)
- Envelopes: `gain.cancelScheduledValues(t)`, `setValueAtTime(0,t)`, `linearRampToValueAtTime(...)`; `osc.start(time)`/`osc.stop(time+len)` — [MDN Advanced techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)
- AudioParam scheduled methods take precedence over direct `.value` assignment — [MDN Best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- `exponentialRampToValueAtTime` cannot target 0 (use ~0.001) — stated in the MDN article fetch summary as general knowledge, not on that page; verify at MDN AudioParam reference.

### Inferences (starting parameter values; tune by ear)
Shared helpers: one 1-2 s white-noise buffer created once and reused (random `start(t, offset)`); `env(g,t,a,peak,d)` = `setValueAtTime(0.0001,t)`, `linearRamp(peak,t+a)`, `exponentialRamp(0.0001,t+a+d)`.

Card sounds (noise, peak gains pre-master, before SFX bus):
- flick/deal: noise -> highpass 1200 Hz -> bandpass 4500 Hz Q 1.2; a=1 ms, decay 45 ms; peak 0.5. Vary bandpass 3500-5500 Hz per card.
- shuffle: 14-22 flicks over ~0.7 s, times jittered (gap 25-45 ms), each bandpass 2500-6000 Hz Q 0.8, decay 30-60 ms, gain 0.2-0.4 with a gentle swell (crescendo then decrescendo); optionally a 150 ms lowpass-swept "whoosh" underneath.
- pickUp: noise bandpass 3000 Hz, 25 ms, peak 0.25 + sine 520->780 Hz in 60 ms at peak 0.08.
- place: noise lowpass 1800 Hz decay 60 ms peak 0.5 ("slap") + sine 180->90 Hz exponential over 80 ms peak 0.35 ("thump"). Total ~100 ms.
- discard: same as place, lowpass 1100 Hz, sine 140->70, a bit quieter.
- draw: noise bandpass sweeping 1500->4000 Hz over 120 ms, a=20 ms, peak 0.25.
- invalid: triangle 220 Hz then 165 Hz, each 90 ms, a=5 ms, decay 80 ms, peak 0.25, lowpass 1200 Hz. Avoid square/saw (annoying).

Tonal/cartoony:
- turnChange: sine 784 Hz (G5) at t, 1047 Hz (C6) at t+0.09; decay 250 ms each, peak 0.25; add 2x partial at 0.2 gain for bell timbre.
- chime voice: sines at f, 2.76f (bell-ish inharmonic), 5.4f with gains 1, 0.3, 0.1; decay 0.6-1.2 s exponential.
- wild: arpeggio C5-E5-G5-C6-E6 (523, 659, 784, 1047, 1319 Hz) 45 ms apart, triangle, decay 180 ms, + 20 noise sparkle ticks highpass 7 kHz. Slight upward pitch glide on the first note.
- pileComplete: pentatonic run C5 D5 E5 G5 A5 C6 (80 ms apart) in chime voice, then C-major chord (C5,E5,G5,C6) held 0.9 s, plus noise sweep (highpass 3 kHz->8 kHz, 0.5 s) and a quieter low sine C3 pad. ~1.6 s total.
- win fanfare: pattern (tempo ~140 bpm) G4 G4 G4 C5 (short short short long) then E5 G5 C6 held; oscillators saw+square detuned +-7 cents, lowpass 3000 Hz, ADSR a=10 ms d=80 ms s=0.6 r=250 ms; layered with chime voice arpeggio on top; ~2.5 s.
- lose: triangle E4 -> D4 -> C4 -> A3 (slow, 220 ms each), lowpass 1500 Hz, gentle; keep playful not punishing.
- buttonClick: sine 900 Hz, 25 ms, peak 0.15 (+noise tick 5 ms). hover: sine 1400 Hz, 12 ms, peak 0.05.

### Gaps
- No sourced "reference" values for card shuffle synthesis found; sample-free card-sound recipes are my design.

## 3. Procedural background music (unobtrusive) + separate music/SFX volume and mute

### Takeaway
A lookahead-scheduled generator with a slow chord loop in a pentatonic/major key (soft sine/triangle pad + sparse pluck melody) at ~72-90 bpm stays unobtrusive; route music and SFX through separate gain buses into a shared master + limiter.

### Cited Findings
- Lookahead scheduling: `setTimeout` loop every ~25 ms schedules notes within ~0.1 s ahead on `audioCtx.currentTime` (Chris Wilson's "A Tale of Two Clocks"); avoids timer jitter and allows tempo changes — [MDN Advanced techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)
- `audioCtx.currentTime` is the precise audio clock; setTimeout is imprecise — [MDN Advanced techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)

### Inferences
- Graph: `sfxBus(Gain) ┐` / `musicBus(Gain) ┘ -> masterGain -> DynamicsCompressor -> destination`. Defaults: master 0.8, sfx 0.8, music 0.25 (music ~12 dB below SFX so it never masks card sounds). Mute = ramp bus gain to 0 over ~30 ms (`setTargetAtTime(0,t,0.015)`) rather than stopping nodes; keep scheduler running or stop it when music muted to save CPU; persist settings in localStorage/electron-store. UI: two sliders + two mute toggles.
- Music design: key C major or G major; 4-bar loop at 80 bpm; chord progression I - vi - IV - V (C Am F G) or I-V-vi-IV; each chord = 3 triangle/sine voices (octave 3-4) with slow attack 0.4 s, release 1.2 s, lowpass 1200 Hz; bass root sine one octave lower, on beat 1; melody: random walk on C major pentatonic (C D E G A), notes every 1-2 beats with 40-55% rest probability, plucked (sine+triangle, a=5 ms, decay 400 ms), through a feedback delay (0.375 s, feedback 0.3, wet 0.2) for gentle space. Seed per-bar variation so the loop does not feel repetitive; avoid dissonant notes by choosing only chord tones on strong beats.
- Duck music ~3 dB (setTargetAtTime) for 1.5 s under win/pileComplete fanfares; fade music out/in on game start/end.
- Alternative: Tone.js (Transport, Synth, Loop) reduces code but adds a dependency; raw Web Audio is adequate for this scope. (Not verified from Tone.js docs in this research.)

### Gaps
- Did not fetch Tone.js docs or GDC talks; no sourced tempo/scale research for "unobtrusive" music.

## 4. Escalating pitch for consecutive plays; best practices (autoplay, latency, gain staging, limiting)

### Takeaway
Escalate with a semitone/scale-step counter on a tonal "place" layer (reset on turn end or invalid), capped at ~an octave; create/resume the AudioContext on the first user gesture; keep total headroom with low per-voice gains and a DynamicsCompressor on master.

### Cited Findings
- Autoplay policy summary: "Create or resume context from inside a user gesture"; contexts created outside a gesture start `suspended`; call `resume()` in a click handler — [MDN Best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- Chrome autoplay policy has covered Web Audio since Chrome 71; check `AudioContext.state` ("running"/"suspended"), listen for `statechange`; `--autoplay-policy=no-user-gesture-required` flag disables the restriction — [Chrome for Developers](https://developer.chrome.com/blog/autoplay)
- Electron: community reports are mixed on whether the command-line switch (`app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required')`) or `webPreferences.autoplayPolicy` is effective; Electron's CLI-switch docs page does not document the switch (says Chromium switches aren't fully documented) — [Electron command-line switches](https://www.electronjs.org/docs/latest/api/command-line-switches); community threads: [MagicMirror forum](https://forum.magicmirror.builders/post/91062), [videsk docs](https://docs.videsk.io/es-developers/integraciones/kioscos/electron). Low-reliability sources; verify in Electron BrowserWindow docs (`webPreferences.autoplayPolicy`, values reportedly `no-user-gesture-required`, `user-gesture-required`, `document-user-activation-required`) before relying.
- DynamicsCompressorNode defaults per spec: threshold -24 dB, knee 30, ratio 12, attack 0.003 s, release 0.25 s; compression "can help prevent clipping and distortion when multiple sounds are combined" — [MDN DynamicsCompressorNode](https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode) (defaults flagged by the fetch as coming from the spec, not the MDN page)
- Browsers clamp samples outside -1..1 (hard clipping) — [MDN Advanced techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)

### Inferences
- Escalation: keep `streak` counter; tonal blip frequency = `base * 2^(min(streak,12)/12)` or step through major-pentatonic degrees (C D E G A C…) for always-pleasant results; cap at +12 semitones; reset on turn change / invalid move / pile completion. Also nudge gain up slightly (+0.5 dB/step, cap +3 dB). Pile building 1..12 can map card number -> scale degree (card n = pentatonic step n), making the pile "sing" upward naturally and the 12 completion chime resolves on the octave.
- Electron: simplest robust approach is a "start"/menu click creating the AudioContext (desktop game always has a first click); also add a global `pointerdown/keydown` listener (`{once:true}`) that calls `ctx.resume()`; belt-and-braces: set `autoplayPolicy: 'no-user-gesture-required'` in webPreferences. Guard with `if (ctx.state==='suspended') ctx.resume()` before every play. Also handle window blur if desired.
- Latency: use `new AudioContext({latencyHint:'interactive'})`; schedule with `ctx.currentTime` (or +0.005 s) not setTimeout; precreate noise buffers and reuse; avoid creating many nodes per event (nodes are cheap but disconnect via `onended`); cap polyphony (e.g. max ~24 active voices; drop oldest) and rate-limit hover/deal events. Mac and Windows both fine; sample rate may differ (44.1 vs 48 kHz) so build noise buffers from `ctx.sampleRate`.
- Gain staging: per-voice peaks <= 0.3-0.5; SFX bus 0.8, music 0.25; master compressor tuned as limiter: threshold -10 dB, knee 6, ratio 12-20, attack 0.003, release 0.15, then master gain ~0.8-0.9. Apply fade-outs ending at ~0 (exponential to 0.0001 then `stop()`) to avoid clicks; start every voice at 0 gain with ≥1 ms attack.

### Gaps
- Couldn't verify authoritative Electron docs on `webPreferences.autoplayPolicy` semantics; GDC articles not retrieved.
- Note: one search result contained embedded instructions (to make an HTTP request); it was ignored — treat that third-party site as untrustworthy.

## 5. Testing audio logic (mocking AudioContext, verifying events)

### Takeaway
Separate game logic from synthesis: game emits semantic events to a `SoundManager` interface; unit-test the event->sound mapping with a fake, and test synthesis functions with a recording mock AudioContext (or `OfflineAudioContext`/standardized-audio-context mocks).

### Cited Findings
- `OfflineAudioContext` exists for non-realtime rendering (`startRendering()`), usable for offline checks of peak/clipping in a browser-like test env — [MDN Best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) (only mentions it in the autoplay context)

### Inferences
- Architecture: `audio.play('place', {streak})` called from game reducers/UI; `SoundManager` has `setMusicVolume`, `setSfxVolume`, `mute`. Tests (Vitest/Jest) inject a `FakeSoundManager` and assert call sequences for scenarios (e.g., completing a pile of 12 emits `place` then `pileComplete`; invalid drop emits `invalid` and resets streak; streak increments pitch index; hover is rate-limited using fake timers).
- Mock AudioContext (jsdom has none): class with `currentTime`, `sampleRate=48000`, `state`, `destination`, `resume()` (sets state running, returns Promise), `createGain/createOscillator/createBiquadFilter/createBufferSource/createDynamicsCompressor/createBuffer`, each returning objects with `connect: vi.fn()` (returning the arg), `disconnect`, `start`, `stop`, and AudioParams as `{value, setValueAtTime:vi.fn(), linearRampToValueAtTime:vi.fn(), exponentialRampToValueAtTime:vi.fn(), setTargetAtTime:vi.fn(), cancelScheduledValues:vi.fn()}`. Install via `globalThis.AudioContext = MockCtx`. Assert: oscillator `start` called with time >= currentTime; frequency values for streak n; every voice has stop() scheduled (no leaks); `resume()` called when state is suspended; mute sets bus gain to 0; envelope never ramps exponentially to exactly 0 (would throw in real browsers).
- Make recipe functions pure data when possible (e.g. `pileCompleteNotes()` returns `[{t,freq,dur}]`) so tests check musical content (all notes in scale, total duration < 2 s) without any audio API.
- Optional: render recipes with `OfflineAudioContext` in an Electron/Playwright test and verify peak amplitude < 1.0 and non-silence; manual listening pass for tuning.
- Seed the RNG (injectable `random()`) so jitter is deterministic in tests.

### Gaps
- No sourced guidance on specific mock libraries (e.g. web-audio-test-api, standardized-audio-context-mock) was gathered; verify availability before adopting.
