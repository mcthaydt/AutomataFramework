// Renders voices without a speaker, so a test can measure them: the page's own offline audio context, no sound card.
import type { SpeakerVoice } from '#src/features/audio/audio.ts'
import { playVoice } from '#src/features/web/web.ts'

/** Samples a second in `renderVoices`: the same in every browser. */
export const SAMPLE_RATE = 44100

/**
 * Plays `voices` at time 0 into an `OfflineAudioContext` (one channel, 44100 Hz) and gives back the samples.
 * `recordings` are the buffers a recording voice names by path.
 */
export async function renderVoices(
  voices: readonly SpeakerVoice[],
  seconds: number,
  recordings?: ReadonlyMap<string, AudioBuffer>,
): Promise<Float32Array> {
  const context = new OfflineAudioContext(1, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE)
  for (const voice of voices) playVoice(context, context.destination, voice, 0, recordings)
  const buffer = await context.startRendering()
  return buffer.getChannelData(0)
}

/** The loudest sample (as a positive number) from `from` to `to` seconds. */
export function peak(samples: Float32Array, from: number, to: number): number {
  let loudest = 0
  const end = Math.min(samples.length, Math.floor(to * SAMPLE_RATE))
  for (let i = Math.floor(from * SAMPLE_RATE); i < end; i++) {
    loudest = Math.max(loudest, Math.abs(samples[i] ?? 0))
  }
  return loudest
}

/** A one channel buffer at 44100 Hz: `silence` seconds of nothing, then a 440 hertz sine until `seconds`. */
export function sineBuffer(seconds: number, silence = 0): AudioBuffer {
  const buffer = new AudioBuffer({ length: Math.round(seconds * SAMPLE_RATE), sampleRate: SAMPLE_RATE })
  const samples = buffer.getChannelData(0)
  for (let i = Math.round(silence * SAMPLE_RATE); i < samples.length; i++)
    samples[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / SAMPLE_RATE)
  return buffer
}

/** How many times the samples from `from` to `to` seconds cross zero: twice a cycle. */
export function crossings(samples: Float32Array, from: number, to: number): number {
  let count = 0
  let last = 0
  for (const sample of samples.subarray(Math.floor(from * SAMPLE_RATE), Math.floor(to * SAMPLE_RATE))) {
    if (sample === 0) continue
    if (last !== 0 && Math.sign(sample) !== Math.sign(last)) count++
    last = sample
  }
  return count
}
