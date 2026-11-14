// Renders voices without a speaker, so a test can measure them: the page's own offline audio context, no sound card.
import type { SoundVoice } from '#src/features/content/content.ts'
import { playVoice } from '#src/features/web/web.ts'

/** Samples a second in `renderVoices`: the same in every browser. */
export const SAMPLE_RATE = 44100

/** Plays `voices` at time 0 into an `OfflineAudioContext` (one channel, 44100 Hz) and gives back the samples. */
export async function renderVoices(voices: readonly SoundVoice[], seconds: number): Promise<Float32Array> {
  const context = new OfflineAudioContext(1, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE)
  for (const voice of voices) playVoice(context, context.destination, voice, 0)
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
