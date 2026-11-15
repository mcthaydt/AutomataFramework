import { z } from '../../lib/zod.ts'
import { Id } from './ids.ts'
import { STEP, variants } from './shared.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** The five drums a drum loop can hit. */
export const DRUMS = ['kick', 'snare', 'hat', 'clap', 'tom'] as const
export type Drum = (typeof DRUMS)[number]
/** What a loop suits. */
export type LoopLane = 'drums' | 'bass' | 'chords' | 'melody'
/** How a chord is spread: root, third and fifth close together, with the third an octave up, or all an octave up. */
export type Voicing = 'close' | 'open' | 'high'
/** The steps in one bar of a loop. */
export type StepsPerBar = 4 | 8 | 12 | 16

interface LoopBase {
  readonly format: 1
  readonly id: string
  /** 1 to 8. */
  readonly bars: number
  readonly stepsPerBar: StepsPerBar
}

/** One row a bar for each drum that plays; a drum left out is silent. */
export type DrumRows = { readonly [D in Drum]?: readonly string[] | undefined }

/** A drum loop: `x` is a hit and `-` a rest. */
export interface DrumLoop extends LoopBase {
  readonly lane: 'drums'
  readonly notes: DrumRows
}

/** A bass or a melody loop: one row a bar, each step a step of the bar's chord (1, 3, b7), a note (C4), `-` or `=`. */
export interface NoteLoop extends LoopBase {
  readonly lane: 'bass' | 'melody'
  readonly notes: readonly string[]
}

/** A chord loop: one row a bar, `x` plays the bar's chord whole, `-` is a rest and `=` holds it. */
export interface ChordLoop extends LoopBase {
  readonly lane: 'chords'
  readonly voicing: Voicing
  readonly notes: readonly string[]
}

/** A loop file once read: a few bars of one instrument's part. */
export type LoopFile = DrumLoop | NoteLoop | ChordLoop

const rows = z
  .array(z.string().max(256))
  .min(1)
  .max(8)
  .describe('One row of steps for each bar, the steps separated by one space.')

const common = {
  format: z.literal(1).describe('The version of this file format. Always 1.'),
  id: Id.describe('A name for this loop, like "bouncy-bass". It matches the file name.'),
}

const size = {
  bars: z.int().min(1).max(8).describe('How many bars the loop lasts, from 1 to 8.'),
  stepsPerBar: z
    .union([z.literal(4), z.literal(8), z.literal(12), z.literal(16)], { error: 'Write 4, 8, 12 or 16.' })
    .describe('How many steps make one bar: 4, 8, 12 or 16.'),
}

/** The object a bass loop and a melody loop share, told apart by their lane. */
function noteLoop(lane: 'bass' | 'melody') {
  return z.strictObject({
    ...common,
    lane: z.literal(lane).describe(`A ${lane} part.`),
    ...size,
    notes: rows,
  })
}

const loop = variants('lane', [
  z.strictObject({
    ...common,
    lane: z.literal('drums').describe('A drum part.'),
    ...size,
    notes: z
      .strictObject({
        kick: rows.optional(),
        snare: rows.optional(),
        hat: rows.optional(),
        clap: rows.optional(),
        tom: rows.optional(),
      })
      .describe('One row of hits for each bar, for each drum that plays: "x" is a hit and "-" a rest.'),
  }),
  noteLoop('bass'),
  noteLoop('melody'),
  z.strictObject({
    ...common,
    lane: z.literal('chords').describe('A chord part.'),
    ...size,
    voicing: z
      .enum(['close', 'open', 'high'])
      .describe('How the chord is spread: "close", "open" (the third an octave up) or "high" (all up).'),
    notes: rows,
  }),
])

const NOTE = /^[A-G][#b]?[0-8]$/
const DRUM_STEP = /^[x-]$/
const CHORD_STEP = /^[x=-]$/

/** The steps of one row: the row split at single spaces. An empty row has none. */
const stepsOf = (row: string): string[] => (row === '' ? [] : row.split(' '))

/** Checks the rows of one part: how many, how long and what is in each. `at` is the path to the rows. */
function checkRows(
  loop: Partial<LoopFile>,
  lane: LoopLane,
  list: readonly string[],
  at: readonly (string | number)[],
  ctx: z.core.$RefinementCtx,
): void {
  if (loop.bars !== undefined && list.length !== loop.bars)
    ctx.addIssue({
      code: 'custom',
      path: [...at],
      message: `This loop has ${loop.bars} ${loop.bars === 1 ? 'bar' : 'bars'} but ${list.length} ${list.length === 1 ? 'row' : 'rows'}. Write one row for each bar.`,
    })
  for (const [r, row] of list.entries()) {
    const steps = stepsOf(row)
    if (loop.stepsPerBar !== undefined && steps.length !== loop.stepsPerBar) {
      ctx.addIssue({
        code: 'custom',
        path: [...at, r],
        message: `This bar has ${steps.length} ${steps.length === 1 ? 'step' : 'steps'} but "stepsPerBar" is ${loop.stepsPerBar}. Write ${loop.stepsPerBar}, separated by one space.`,
      })
      continue
    }
    // The first wrong step of a bar is the one said: a bar is not scolded once for each step in it.
    for (const step of steps) {
      if (lane === 'drums' && !DRUM_STEP.test(step)) {
        ctx.addIssue({
          code: 'custom',
          path: [...at, r],
          message: `"${step}" is not a drum step. Write x for a hit or - for a rest.`,
        })
        break
      }
      if (lane === 'chords' && !CHORD_STEP.test(step)) {
        ctx.addIssue({
          code: 'custom',
          path: [...at, r],
          message: `"${step}" is not a chord step. Write x to play the chord, - for a rest, or = to hold it.`,
        })
        break
      }
      if (
        (lane === 'bass' || lane === 'melody') &&
        !(STEP.test(step) || NOTE.test(step) || step === '-' || step === '=')
      ) {
        ctx.addIssue({
          code: 'custom',
          path: [...at, r],
          message: `"${step}" is not a step. Write a step of the chord like 1, 3 or b7, a note like C4, - for a rest, or = to hold.`,
        })
        break
      }
    }
  }
}

/** The checks that look across fields. Written to cope with a half-read file, since it may run beside other problems. */
function checkLoop(file: Partial<LoopFile>, ctx: z.core.$RefinementCtx): void {
  if (file.lane === 'drums') {
    const hit = DRUMS.filter((drum) => file.notes?.[drum] !== undefined)
    if (hit.length === 0)
      ctx.addIssue({
        code: 'custom',
        path: ['notes'],
        message: 'A drum loop needs at least one drum: kick, snare, hat, clap or tom.',
      })
    for (const drum of hit) checkRows(file, 'drums', file.notes?.[drum] ?? [], ['notes', drum], ctx)
  } else if (file.lane !== undefined && Array.isArray(file.notes))
    checkRows(file, file.lane, file.notes as readonly string[], ['notes'], ctx)
}

/** The rules for a loop file; unknown keys are refused. */
export const LoopSchema: z.ZodType<LoopFile, LoopFile> = loop.superRefine(checkLoop)

/** The loop's row of the content table. */
export const loopInfo: ContentTypeInfo<LoopFile, LoopFile> = {
  schema: LoopSchema,
  title: 'Loop',
  plural: 'loops',
  editor: 'sound',
  part: 'music',
  noun: 'loop',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the loop a name like "bouncy-bass".',
    lane: 'Write "drums", "bass", "chords" or "melody".',
    bars: 'Write how many bars it lasts, from 1 to 8, like 2.',
    stepsPerBar: 'Write how many steps make one bar: 4, 8, 12 or 16.',
    voicing: 'Write "close", "open" or "high".',
    notes: 'Write one row of steps for each bar, like ["1 - 5 - 1 - 5 -"].',
  },
}
