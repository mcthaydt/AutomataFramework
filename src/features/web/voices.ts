// One voice of a sound, built from the page's own audio: an oscillator, or a hiss through a band-pass filter, each
// through a gain that falls away to silence. Ported from the first attempt's synth, without its beds and drones.
import type { SoundVoice } from '../content/content.ts'

/** The gain a voice falls to: silent to the ear, and above zero because an exponential ramp cannot reach zero. */
const SILENCE = 0.0001
/** A tone is told to stop a little after its gain has fallen, so the end is never a click. */
const TAIL = 0.05
/** The noise lasts this many seconds and is looped, which is long enough that nobody hears the join. */
const NOISE_SECONDS = 1

/** One buffer of noise for each audio context, made the first time a hiss is asked for. */
const noises = new WeakMap<BaseAudioContext, AudioBuffer>()

/**
 * Noise from a fixed seed (Park-Miller, seed 7), so every hiss is the same hiss in every browser and every run, and a
 * test can compare two renders sample for sample.
 */
function noiseBuffer(context: BaseAudioContext): AudioBuffer {
  const known = noises.get(context)
  if (known !== undefined) return known
  const buffer = context.createBuffer(1, context.sampleRate * NOISE_SECONDS, context.sampleRate)
  const samples = buffer.getChannelData(0)
  let seed = 7
  for (let i = 0; i < samples.length; i++) {
    seed = (seed * 16807) % 2147483647
    samples[i] = seed / 1073741823.5 - 1
  }
  noises.set(context, buffer)
  return buffer
}

/**
 * Builds one voice on any audio context, starting `voice.at` seconds after `when` and ending into `out`. The page's
 * speaker and the tests that measure a voice share it.
 */
export function playVoice(context: BaseAudioContext, out: AudioNode, voice: SoundVoice, when: number): void {
  const start = when + voice.at
  const end = start + voice.length
  const gain = context.createGain()
  gain.gain.setValueAtTime(voice.volume, start)
  gain.gain.exponentialRampToValueAtTime(SILENCE, end)
  gain.connect(out)
  if (voice.kind === 'tone') {
    const oscillator = context.createOscillator()
    oscillator.type = voice.wave
    oscillator.frequency.setValueAtTime(voice.from, start)
    oscillator.frequency.exponentialRampToValueAtTime(voice.to, end)
    oscillator.connect(gain)
    oscillator.start(start)
    oscillator.stop(end + TAIL)
    return
  }
  const source = context.createBufferSource()
  source.buffer = noiseBuffer(context)
  source.loop = true
  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = voice.pitch
  filter.Q.value = 1
  source.connect(filter)
  filter.connect(gain)
  source.start(start)
  source.stop(end)
}
