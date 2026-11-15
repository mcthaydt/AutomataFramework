// The limiter the speaker ends every bus in (plan Q, call 14 of the speaker): one voice alone is as loud as it was before
// it, to within 1 dB in peak and in RMS, and sixteen at once never go past full scale. Both are rendered, not guessed: an
// offline context plays them through the page's real speaker and through the graph the speaker had before.
import { expect, test } from 'vitest'
import type { SoundVoice } from '#src/features/content/content.ts'
import { playVoice } from '#src/features/web/voices.ts'
import { webSpeaker } from '#src/features/web/web.ts'

const RATE = 44100
const SECONDS = 1

/** One tone voice at `volume`, a second long. */
const tone = (from: number, volume: number): SoundVoice =>
  ({ kind: 'tone', wave: 'sine', from, to: from, at: 0, length: SECONDS - 0.2, volume }) as SoundVoice

/** An offline context that says it is running, so the speaker will play into it. */
function running(): OfflineAudioContext {
  const offline = new OfflineAudioContext(1, RATE * SECONDS, RATE)
  return new Proxy(offline, {
    get(target, property) {
      if (property === 'state') return 'running'
      // An offline context cannot be resumed; this one is already as running as it will be.
      if (property === 'resume') return () => Promise.resolve()
      const value = Reflect.get(target, property) as unknown
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value
    },
  })
}

/** What the speaker plays, rendered: `voices` on the sound bus at time 0. */
async function throughSpeaker(voices: readonly SoundVoice[]): Promise<Float32Array> {
  const context = running()
  const target = new EventTarget()
  const speaker = webSpeaker({ seams: { context: () => context as unknown as AudioContext, target } })
  target.dispatchEvent(new Event('pointerdown'))
  await Promise.resolve()
  await Promise.resolve()
  for (const voice of voices) speaker.play('sound', voice, 0)
  const rendered = await (context as unknown as OfflineAudioContext).startRendering()
  return rendered.getChannelData(0)
}

/** The graph the speaker had before the limiter: the bus, then the master gain of 0.5, then the destination. */
async function before(voices: readonly SoundVoice[]): Promise<Float32Array> {
  const context = new OfflineAudioContext(1, RATE * SECONDS, RATE)
  const master = context.createGain()
  master.gain.value = 0.5
  master.connect(context.destination)
  const bus = context.createGain()
  bus.connect(master)
  const inner = context.createGain()
  inner.connect(bus)
  for (const voice of voices) playVoice(context, inner, voice, 0)
  return (await context.startRendering()).getChannelData(0)
}

const peak = (samples: Float32Array): number => samples.reduce((top, one) => Math.max(top, Math.abs(one)), 0)
const rms = (samples: Float32Array): number =>
  Math.sqrt(samples.reduce((sum, one) => sum + one * one, 0) / samples.length)
const db = (now: number, was: number): number => 20 * Math.log10(now / was)

test('one voice alone is within 1 dB of what it was before, in peak and in RMS', async () => {
  const voices = [tone(440, 0.4)]
  const was = await before(voices)
  const now = await throughSpeaker(voices)
  expect(peak(was)).toBeGreaterThan(0.05)
  expect(Math.abs(db(peak(now), peak(was)))).toBeLessThan(1)
  expect(Math.abs(db(rms(now), rms(was)))).toBeLessThan(1)
})

test('sixteen voices at once: no sample is above 1', async () => {
  const voices = Array.from({ length: 16 }, (_, at) => tone(220 + at * 37, 1))
  const without = await before(voices)
  expect(peak(without)).toBeGreaterThan(1)
  const now = await throughSpeaker(voices)
  expect(peak(now)).toBeLessThanOrEqual(1)
  expect(peak(now)).toBeGreaterThan(0.05)
})
