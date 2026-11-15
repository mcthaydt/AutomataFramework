import { z } from '../../lib/zod.ts'
import { Id } from './ids.ts'
import { type MotifChanges, STEP } from './shared.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** One note of a motif. */
export interface MotifNote {
  /** A step of the key: 1 to 15, or a string like "b3" or "#4" for the note between. */
  readonly step: number | string
  /** How long it lasts, 0.25 to 8, in quarters of a beat. */
  readonly beats: number
}

/** A motif file once read: a short tune in steps of the key and beats, so it can be moved, slowed and turned sad. */
export interface MotifFile {
  readonly format: 1
  readonly id: string
  readonly notes: readonly MotifNote[]
}

const STEP_HINT = 'Write a step of the key from 1 to 15, like 5, or with b or # in front, like "b3".'
const BEATS_HINT = 'Write how many beats it lasts, from 0.25 to 8, in quarters, like 0.5.'

const note = z.strictObject({
  step: z
    .union([z.int().min(1, STEP_HINT).max(15, STEP_HINT), z.string().regex(STEP, STEP_HINT)], {
      error: STEP_HINT,
    })
    .describe('Which note of the key: 1 to 15, with b or # in front for the note between.'),
  beats: z
    .number()
    .refine((value) => value >= 0.25 && value <= 8 && Number.isInteger(value * 4), BEATS_HINT)
    .describe('How long it lasts, in beats: 0.25 to 8, in quarters.'),
})

/** The rules for a motif file; unknown keys are refused. */
export const MotifSchema: z.ZodType<MotifFile, MotifFile> = z.strictObject({
  format: z.literal(1).describe('The version of this file format. Always 1.'),
  id: Id.describe('A name for this motif, like "hero-theme". It matches the file name.'),
  notes: z.array(note).min(1).max(16).describe('The notes in the order they play, at most 16.'),
})

/** How many beats a use of a motif lasts: its notes' beats together, divided by the use's speed (1 when left out). */
export function motifBeats(motif: MotifFile, changes: MotifChanges): number {
  let beats = 0
  for (const entry of motif.notes) beats += entry.beats
  return beats / (changes.speed ?? 1)
}

/** The motif's row of the content table. */
export const motifInfo: ContentTypeInfo<MotifFile, MotifFile> = {
  schema: MotifSchema,
  title: 'Motif',
  plural: 'motifs',
  editor: 'sound',
  part: 'music',
  noun: 'motif',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the motif a name like "hero-theme".',
    notes: 'List at least one note, like [{ "step": 1, "beats": 1 }].',
    'notes.step': STEP_HINT,
    'notes.beats': BEATS_HINT,
  },
}
