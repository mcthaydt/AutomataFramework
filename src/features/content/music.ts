import { z } from '../../lib/zod.ts'
import { Id } from './ids.ts'
import {
  type ArrangedMusic,
  checkArranged,
  checkArrangement,
  MusicLaneSchema,
} from './music2.ts'
import { Chord, Key, Mode, unique, variants } from './shared.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** The most steps a track can have: the length of one part, all its rows together. */
export const MAX_STEPS = 4096

/** A tone part: notes, by name. */
export interface TonePart {
  readonly id: string
  readonly kind: 'tone'
  readonly wave: 'sine' | 'square' | 'sawtooth' | 'triangle'
  readonly volume: number
  readonly notes: readonly string[]
}

/** A drum part: `x` for a hit, `-` for a rest. */
export interface DrumPart {
  readonly id: string
  readonly kind: 'drums'
  readonly volume: number
  readonly notes: readonly string[]
}

/** One part of a track. */
export type MusicPart = TonePart | DrumPart

/**
 * A music file of format 1: one track, written as rows of steps the way a level is rows of tiles. Each part's rows,
 * joined, are its steps, and every part has the same number of them.
 */
export interface StepMusic {
  readonly format: 1
  readonly id: string
  /** Beats a minute. */
  readonly tempo: number
  readonly stepsPerBeat: number
  readonly volume: number
  readonly loop: boolean
  readonly parts: readonly MusicPart[]
}

/** A music file once read: rows of steps (format 1), or a song arranged from loops and motifs (format 2). */
export type MusicFile = StepMusic | ArrangedMusic

const volume = (what: string): z.ZodNumber =>
  z.number().min(0).max(1).describe(`${what}, from 0 (silent) to 1 (full).`)
const notes = z
  .array(z.string().max(256))
  .min(1)
  .max(64)
  .describe(
    'Rows of steps, separated by one space. A note like C4 or F#3, - for a rest, = to hold the note before.',
  )

const part = variants('kind', [
  z.strictObject({
    id: Id.describe('A name for this part, like "bass".'),
    kind: z.literal('tone').describe('A part that plays notes.'),
    wave: z
      .enum(['sine', 'square', 'sawtooth', 'triangle'])
      .describe('The shape of the wave: how the notes sound.'),
    volume: volume('How loud this part is'),
    notes,
  }),
  z.strictObject({
    id: Id.describe('A name for this part, like "drums".'),
    kind: z.literal('drums').describe('A part that plays drum hits.'),
    volume: volume('How loud this part is'),
    notes,
  }),
])

const NOTE = /^(?:[A-G][#b]?[0-8]|-|=)$/
const DRUM = /^[x-]$/

/** The steps of one row: the row split at single spaces. An empty row has none. */
const stepsOf = (row: string): string[] => (row === '' ? [] : row.split(' '))

/** How many steps a part has: every row's steps, together. */
const countSteps = (rows: readonly string[]): number =>
  rows.reduce((total, row) => total + stepsOf(row).length, 0)

/** The checks that look across fields. Written to cope with a half-read file, since it may run beside other problems. */
function checkMusic(music: Partial<StepMusic>, ctx: z.core.$RefinementCtx): void {
  const parts = music.parts ?? []
  unique(parts, 'id', 'part', ['parts'], ctx)
  parts.forEach((p, i) => {
    p.notes.forEach((row, r) => {
      if (row === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['parts', i, 'notes', r],
          message: `This row has no steps. Write at least one, like ${p.kind === 'tone' ? 'C4' : 'x'} or -.`,
        })
        return
      }
      const bad = stepsOf(row).find((step) => !(p.kind === 'tone' ? NOTE : DRUM).test(step))
      if (bad === undefined) return
      ctx.addIssue({
        code: 'custom',
        path: ['parts', i, 'notes', r],
        message:
          bad === ''
            ? 'Separate the steps with one space.'
            : p.kind === 'tone'
              ? `"${bad}" is not a note. Write a note like C4 or F#3, - for a rest, or = to hold the note before.`
              : `"${bad}" is not a drum step. Write x for a hit or - for a rest.`,
      })
    })
  })
  const first = parts[0]
  if (first === undefined) return
  const length = countSteps(first.notes)
  parts.forEach((p, i) => {
    const count = countSteps(p.notes)
    if (i > 0 && count !== length)
      ctx.addIssue({
        code: 'custom',
        path: ['parts', i, 'notes'],
        message: `This part has ${count} steps but the first part has ${length}. Every part must be the same length.`,
      })
  })
  if (length > MAX_STEPS)
    ctx.addIssue({
      code: 'custom',
      path: ['parts', 0, 'notes'],
      message: `A track can have at most ${MAX_STEPS} steps. This one has ${length}.`,
    })
}

/** Format 1: rows of single notes, as it has always been. */
const stepMusic = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. 1 for rows of steps.'),
    id: Id.describe('A name for this track, like "meadow". It matches the file name.'),
    tempo: z.int().min(30).max(300).describe('Beats a minute, from 30 to 300.'),
    stepsPerBeat: z.int().min(1).max(8).describe('How many steps make one beat, from 1 to 8.'),
    volume: volume('How loud the whole track is'),
    loop: z.boolean().describe('True if the track starts again when it ends.'),
    parts: z.array(part).min(1).max(8).describe('The parts that play together, each a row of steps.'),
  })
  .superRefine(checkMusic)

/** Format 2: a song arranged from loops and motifs, in a key, with a chord for every bar. */
const arrangedMusic = z
  .strictObject({
    format: z.literal(2).describe('The version of this file format. 2 for loops, chords and motifs.'),
    id: Id.describe('A name for this track, like "meadow". It matches the file name.'),
    tempo: z.int().min(30).max(300).describe('Beats a minute, from 30 to 300.'),
    key: Key,
    mode: Mode,
    bars: z
      .int()
      .min(1)
      .max(128)
      .describe('How many bars the track lasts, from 1 to 128. A bar is four beats.'),
    loop: z.boolean().describe('True if the track starts again when it ends.'),
    volume: volume('How loud the whole track is'),
    chords: z.array(Chord).min(1).max(128).describe('One chord for each bar, as numerals of the key.'),
    lanes: z.array(MusicLaneSchema).max(8).describe('The lines that play together, at most eight.'),
  })
  .superRefine(checkArranged)

/** The rules for a music file, told apart by `format`; unknown keys are refused. */
export const MusicSchema: z.ZodType<MusicFile, MusicFile> = variants('format', [stepMusic, arrangedMusic])

/** The music's row of the content table. */
export const musicInfo: ContentTypeInfo<MusicFile, MusicFile> = {
  schema: MusicSchema,
  title: 'Music',
  plural: 'music',
  editor: 'sound',
  part: 'audio',
  noun: 'music track',
  check: (music, game, report) => {
    if (music.format === 2) checkArrangement(music, game, report)
  },
  missing: {
    format: 'Write "format": 1 for rows of steps, or 2 for loops, chords and motifs.',
    id: 'Give the track a name like "meadow".',
    tempo: 'Write beats a minute, from 30 to 300, like 120.',
    stepsPerBeat: 'Write how many steps make one beat, like 4.',
    volume: 'Write how loud the track is, from 0 to 1, like 0.6.',
    loop: 'Write true if the track starts again when it ends, or false.',
    parts: 'List at least one part, a tone or drums.',
    'parts.id': 'Give the part a name like "bass".',
    'parts.kind': 'Write "tone" or "drums".',
    'parts.wave': 'Write "sine", "square", "sawtooth" or "triangle".',
    'parts.volume': 'Write how loud the part is, from 0 to 1, like 0.5.',
    'parts.notes': 'Write the steps as rows of text, like ["C4 - E4 -"].',
    key: 'Write the key, like "C" or "F#".',
    mode: 'Write "major" or "minor".',
    bars: 'Write how many bars the track lasts, from 1 to 128, like 8.',
    chords: 'Write one chord for each bar, like ["I", "V", "vi", "IV"].',
    lanes: 'List the lanes that play, each with an instrument and its blocks. An empty list is a silent track.',
    'lanes.id': 'Give the lane a name like "bass".',
    'lanes.instrument': 'Write what plays it: drums, bass, keys, pluck, lead, pad, bell or organ.',
    'lanes.volume': 'Write how loud the lane is, from 0 to 1, like 0.5.',
    'lanes.blocks': 'List what the lane plays, like [{ "at": 1, "loop": "easy-drums", "bars": 4 }].',
    'lanes.blocks.at': 'Write the bar it starts at, from 1, like 1.',
    'lanes.blocks.loop': 'Write the loop to play, like "easy-drums".',
    'lanes.blocks.bars': 'Write how many bars the loop fills, like 4.',
    'lanes.blocks.motif': 'Write the motif to play once, like "hero-theme".',
  },
}
