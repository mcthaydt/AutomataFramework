// What each instrument and drum sounds like, as a few tone and hiss voices. The numbers are data in
// `library/instruments.json`, so the sound of the framework changes in one file; this file only reads them.
import type { NoiseVoice, ToneVoice, Wave } from '../content/content.ts'
import data from './library/instruments.json' with { type: 'json' }
import { hertzOfPitch } from './notes.ts'
import { type PlainNote, TICKS_PER_BEAT } from './plain-notes.ts'

/** One wave an instrument layers: its pitch is the note's times `times`, its loudness the note's times `share`. */
interface Layer {
  readonly wave: Wave
  readonly times: number
  readonly share: number
}

interface Library {
  readonly instruments: Readonly<
    Record<string, { readonly layers: readonly Layer[]; readonly ring?: number }>
  >
  readonly drums: Readonly<Record<string, readonly (ToneVoice | NoiseVoice)[]>>
}

const library = data as Library

/** What a speaker plays for one plain note at a tempo: a few voices, each starting at 0 (a drum's own `at` kept). */
export function instrumentVoices(note: PlainNote, tempo: number): (ToneVoice | NoiseVoice)[] {
  if (typeof note.pitch === 'string')
    return (library.drums[note.pitch] ?? []).map((voice) => ({
      ...voice,
      volume: voice.volume * note.volume,
    }))
  const instrument = library.instruments[note.instrument]
  if (instrument === undefined) return []
  // Seconds from ticks, once, the same in every engine.
  const seconds = (note.ticks * 60) / (tempo * TICKS_PER_BEAT)
  const length = instrument.ring === undefined ? seconds : Math.min(seconds, instrument.ring)
  const hertz = hertzOfPitch(note.pitch)
  return instrument.layers.map((layer) => ({
    kind: 'tone',
    wave: layer.wave,
    from: hertz * layer.times,
    to: hertz * layer.times,
    at: 0,
    length,
    volume: note.volume * layer.share,
  }))
}
