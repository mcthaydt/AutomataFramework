import { z } from '../../lib/zod.ts'
import { Id } from './ids.ts'
import { motifBeats } from './motif.ts'
import {
  type Instrument,
  isGamePath,
  Key,
  type MotifChanges,
  motifChanges,
  noSuch,
  variants,
} from './shared.ts'
import type { ContentTypeInfo, Listed, Report } from './type-info.ts'

/** The longest a sound can be: the end of its last voice, in seconds. */
const MAX_SECONDS = 10

/** The shape of a tone's wave. */
export type Wave = 'sine' | 'square' | 'sawtooth' | 'triangle'

/** A pitch that slides from one note to another, over `length` seconds. Pitches are in hertz. */
export interface ToneVoice {
  readonly kind: 'tone'
  readonly wave: Wave
  readonly from: number
  readonly to: number
  /** Seconds after the sound starts that this voice starts. */
  readonly at: number
  /** Seconds this voice lasts. */
  readonly length: number
  readonly volume: number
}

/** A hiss, its middle at `pitch` hertz. */
export interface NoiseVoice {
  readonly kind: 'noise'
  readonly pitch: number
  readonly at: number
  readonly length: number
  readonly volume: number
}

/** A part of a recorded file (a WAV the game keeps), played at a speed. `from` is seconds into the file. */
export interface RecordingVoice {
  readonly kind: 'recording'
  /** The WAV file, as a path inside the game. */
  readonly file: string
  /** Seconds into the file it starts from. */
  readonly from: number
  /** Seconds this voice lasts. It reads `length * speed` seconds of the file. */
  readonly length: number
  /** 0.5 to 2: slower and lower, or faster and higher. */
  readonly speed: number
  readonly at: number
  readonly volume: number
}

/** A motif played by an instrument, in a key and at a tempo, with the changes a use of a motif carries. */
export interface MotifVoice extends MotifChanges {
  readonly kind: 'motif'
  readonly motif: string
  readonly instrument: Exclude<Instrument, 'drums'>
  readonly key: Key
  /** Beats a minute, 30 to 300. */
  readonly tempo: number
  readonly at: number
  readonly volume: number
}

/** One voice of a sound. */
export type SoundVoice = ToneVoice | NoiseVoice | RecordingVoice | MotifVoice

/** A sound file once read: one short sound made of voices. There is no audio file; the game makes the sound. */
export interface SoundFile {
  readonly format: 1
  readonly id: string
  readonly volume: number
  readonly voices: readonly SoundVoice[]
}

const hertz = (what: string): z.ZodNumber =>
  z.number().min(20).max(20000).describe(`${what}, in hertz (20 to 20000).`)
const volume = (what: string): z.ZodNumber =>
  z.number().min(0).max(1).describe(`${what}, from 0 (silent) to 1 (full).`)
const at = z
  .number()
  .min(0)
  .max(MAX_SECONDS)
  .describe('Seconds after the sound starts that this voice starts.')
const length = z
  .number()
  .gt(0)
  .max(MAX_SECONDS)
  .describe(`Seconds this voice lasts, more than 0 and at most ${MAX_SECONDS}.`)

const FILE_HINT = 'Use a path inside the game that ends in .wav, like content/sounds/door.wav.'

const voice = variants('kind', [
  z.strictObject({
    kind: z.literal('tone').describe('A pitch that slides from one note to another.'),
    wave: z
      .enum(['sine', 'square', 'sawtooth', 'triangle'])
      .describe('The shape of the wave: how the tone sounds.'),
    from: hertz('The pitch it starts at'),
    to: hertz('The pitch it ends at'),
    at,
    length,
    volume: volume('How loud this voice is'),
  }),
  z.strictObject({
    kind: z.literal('noise').describe('A hiss, like wind or a crash.'),
    pitch: hertz('The middle of the hiss'),
    at,
    length,
    volume: volume('How loud this voice is'),
  }),
  z.strictObject({
    kind: z.literal('recording').describe('A part of a recorded sound: a WAV file kept in the game.'),
    file: z
      .string()
      .refine((path) => isGamePath(path, '.wav'), FILE_HINT)
      .describe('The WAV file, as a path inside the game, like content/sounds/door.wav.'),
    from: z.number().min(0).max(MAX_SECONDS).describe('Seconds into the file that this voice starts from.'),
    length,
    speed: z
      .number()
      .min(0.5)
      .max(2)
      .describe('How fast it plays: 0.5 (slower, lower) to 2 (faster, higher).'),
    at,
    volume: volume('How loud this voice is'),
  }),
  z.strictObject({
    kind: z.literal('motif').describe('A short tune, played by an instrument.'),
    motif: Id.describe('Which motif to play, by id, like "hero-theme".'),
    instrument: z
      .enum(['bass', 'keys', 'pluck', 'lead', 'pad', 'bell', 'organ'])
      .describe('What plays it: "bass", "keys", "pluck", "lead", "pad", "bell" or "organ".'),
    key: Key,
    tempo: z.int().min(30).max(300).describe('Beats a minute, from 30 to 300.'),
    ...motifChanges,
    at,
    volume: volume('How loud this voice is'),
  }),
])

/** The rules for a sound file; unknown keys are refused. */
export const SoundSchema: z.ZodType<SoundFile, SoundFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this sound, like "jump". It matches the file name.'),
    volume: volume('How loud the whole sound is'),
    voices: z
      .array(voice)
      .min(1)
      .max(8)
      .describe('The voices that play together, each starting at its own time.'),
  })
  .superRefine((sound, ctx) => {
    ;(sound.voices ?? []).forEach((v, i) => {
      // A motif voice has no `length`: it lasts as long as its notes, which the check against the game works out.
      if (v.kind !== 'motif' && v.at + v.length > MAX_SECONDS)
        ctx.addIssue({
          code: 'custom',
          path: ['voices', i, 'length'],
          message: `This voice ends after ${MAX_SECONDS} seconds, which is the longest a sound can be.`,
        })
    })
  })

/** A motif voice names a motif the game has, and ends inside the sound's ten seconds. */
function checkMotifs(file: SoundFile, game: Listed, report: Report): void {
  file.voices.forEach((v, i) => {
    if (v.kind !== 'motif') return
    const motif = game.get('motif', v.motif)
    if (motif === undefined) {
      if (!game.has('motif', v.motif))
        report(`voices[${i}].motif`, noSuch('motif', v.motif, game.ids('motif')))
      return
    }
    if (v.at + (motifBeats(motif, v) * 60) / v.tempo > MAX_SECONDS + 1e-9)
      report(
        `voices[${i}].motif`,
        `This motif ends after ${MAX_SECONDS} seconds, which is the longest a sound can be. Raise "tempo" or "speed".`,
      )
  })
}

/** The sound's row of the content table. */
export const soundInfo: ContentTypeInfo<SoundFile, SoundFile> = {
  schema: SoundSchema,
  title: 'Sound',
  plural: 'sounds',
  editor: 'sound',
  part: 'audio',
  noun: 'sound',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the sound a name like "jump".',
    volume: 'Write how loud the sound is, from 0 to 1, like 0.8.',
    voices: 'List at least one voice, like a tone or a noise.',
    'voices.kind': 'Write "tone", "noise", "recording" or "motif".',
    'voices.wave': 'Write "sine", "square", "sawtooth" or "triangle".',
    'voices.from':
      'Write where it starts: a pitch in hertz for a tone, like 440, or seconds into the file for a recording, like 0.',
    'voices.file': 'Write the WAV file, like content/sounds/door.wav.',
    'voices.speed': 'Write how fast it plays, from 0.5 to 2, like 1.',
    'voices.motif': 'Write which motif to play, like hero-theme.',
    'voices.instrument': 'Write "bass", "keys", "pluck", "lead", "pad", "bell" or "organ".',
    'voices.key': 'Write the key, like "C" or "F#".',
    'voices.tempo': 'Write beats a minute, from 30 to 300, like 120.',
    'voices.to': 'Write the pitch it ends at, in hertz, like 880.',
    'voices.pitch': 'Write the middle of the hiss, in hertz, like 2000.',
    'voices.at': 'Write when the voice starts, in seconds, like 0.',
    'voices.length': 'Write how long the voice lasts, in seconds, like 0.2.',
    'voices.volume': 'Write how loud the voice is, from 0 to 1, like 1.',
  },
  check: checkMotifs,
}
