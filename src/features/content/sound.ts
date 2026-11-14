import { z } from 'zod'
import { Id } from './ids.ts'
import { variants } from './shared.ts'
import type { ContentTypeInfo } from './type-info.ts'

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

/** One voice of a sound. */
export type SoundVoice = ToneVoice | NoiseVoice

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
      if (v.at + v.length > MAX_SECONDS)
        ctx.addIssue({
          code: 'custom',
          path: ['voices', i, 'length'],
          message: `This voice ends after ${MAX_SECONDS} seconds, which is the longest a sound can be.`,
        })
    })
  })

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
    'voices.kind': 'Write "tone" or "noise".',
    'voices.wave': 'Write "sine", "square", "sawtooth" or "triangle".',
    'voices.from': 'Write the pitch it starts at, in hertz, like 440.',
    'voices.to': 'Write the pitch it ends at, in hertz, like 880.',
    'voices.pitch': 'Write the middle of the hiss, in hertz, like 2000.',
    'voices.at': 'Write when the voice starts, in seconds, like 0.',
    'voices.length': 'Write how long the voice lasts, in seconds, like 0.2.',
    'voices.volume': 'Write how loud the voice is, from 0 to 1, like 1.',
  },
}
