// Music format 2: a song arranged from loops and motifs, in a key, with a chord for every bar. Format 1, rows of single
// notes, stays as it was in music.ts; the `format` field tells the two apart.
import { z } from '../../lib/zod.ts'
import { Id } from './ids.ts'
import { type MotifFile, motifBeats } from './motif.ts'
import {
  INSTRUMENTS,
  type Instrument,
  type Key,
  type Mode,
  type MotifChanges,
  motifChanges,
  noSuch,
  unique,
} from './shared.ts'
import type { Listed, Report } from './type-info.ts'

/** A loop played from bar `at`, again and again to fill `bars` bars. */
export interface LoopBlock {
  /** The bar it starts at, from 1. */
  readonly at: number
  readonly loop: string
  /** How many bars it fills; the loop repeats to fill them. */
  readonly bars: number
}

/** A motif played once from bar `at`, with the changes this use carries. */
export interface MotifBlock extends MotifChanges {
  readonly at: number
  readonly motif: string
}

/** One thing a lane plays. */
export type MusicBlock = LoopBlock | MotifBlock

/** One instrument's line of a song: blocks of loops and motifs, which may not overlap. */
export interface MusicLane {
  readonly id: string
  readonly instrument: Instrument
  readonly volume: number
  readonly blocks: readonly MusicBlock[]
}

/** A song arranged from loops and motifs. */
export interface ArrangedMusic {
  readonly format: 2
  readonly id: string
  /** Beats a minute, 30 to 300. */
  readonly tempo: number
  readonly key: Key
  readonly mode: Mode
  /** 1 to 128. Four beats make a bar. */
  readonly bars: number
  readonly loop: boolean
  readonly volume: number
  /** One chord for each bar, as Roman numerals of the key. */
  readonly chords: readonly string[]
  /** 0 to 8. */
  readonly lanes: readonly MusicLane[]
}

const volume = (what: string): z.ZodNumber =>
  z.number().min(0).max(1).describe(`${what}, from 0 (silent) to 1 (full).`)

/**
 * A block is a loop or a motif, told apart by which of the two it names. One object holds both shapes so the check can say
 * "not both" and "say which" in its own words; the type it reads into is the union.
 */
const block = z
  .strictObject({
    at: z.int().min(1).max(128).describe('The bar it starts at, counting from 1.'),
    loop: Id.optional().describe('A loop to play, by id, like "easy-drums".'),
    bars: z.int().min(1).max(128).optional().describe('For a loop: how many bars it fills.'),
    motif: Id.optional().describe('A motif to play once, by id, like "hero-theme".'),
    ...motifChanges,
  })
  .superRefine((entry, ctx) => {
    if (entry.loop !== undefined && entry.motif !== undefined)
      ctx.addIssue({ code: 'custom', path: [], message: 'Write a loop or a motif, not both.' })
    else if (entry.loop === undefined && entry.motif === undefined)
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'Say what this block plays: add "loop" or "motif".',
      })
    else if (entry.loop !== undefined && entry.bars === undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['bars'],
        message: 'Say how many bars the loop fills: add "bars".',
      })
    else if (entry.motif !== undefined && entry.bars !== undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['bars'],
        message: 'A motif plays once, so it takes no "bars". Take the line out.',
      })
    else if (
      entry.loop !== undefined &&
      (entry.shift !== undefined ||
        entry.speed !== undefined ||
        entry.mode !== undefined ||
        entry.backwards !== undefined)
    )
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'Only a motif can be moved, slowed or turned. Take these lines out of the loop block.',
      })
  }) as unknown as z.ZodType<MusicBlock, MusicBlock>

/** The rules for one lane of a song. */
export const MusicLaneSchema: z.ZodType<MusicLane, MusicLane> = z.strictObject({
  id: Id.describe('A name for this lane, like "drums".'),
  instrument: z
    .enum(INSTRUMENTS)
    .describe('What plays it: drums, bass, keys, pluck, lead, pad, bell or organ.'),
  volume: volume('How loud this lane is'),
  blocks: z.array(block).max(64).describe('The loops and motifs it plays, each from its own bar.'),
})

/** The checks that look across fields. Written to cope with a half-read file, since it may run beside other problems. */
export function checkArranged(music: Partial<ArrangedMusic>, ctx: z.core.$RefinementCtx): void {
  unique(music.lanes ?? [], 'id', 'lane', ['lanes'], ctx)
  const chords = music.chords ?? []
  if (music.bars !== undefined && chords.length !== music.bars)
    ctx.addIssue({
      code: 'custom',
      path: ['chords'],
      message: `Write one chord for each bar: this track has ${music.bars} ${music.bars === 1 ? 'bar' : 'bars'} and ${chords.length} ${chords.length === 1 ? 'chord' : 'chords'}.`,
    })
}

/** Four beats make a bar, so a motif that lasts `beats` beats takes this many bars. */
const BEATS_PER_BAR = 4

/**
 * The bars a block takes: a loop block's `bars`; a motif block's beats, rounded up to whole bars (and at least one).
 * `motif` is the motif's file, or `undefined` when it is not known (then one bar).
 */
export function blockBars(entry: MusicBlock, motif: MotifFile | undefined): number {
  if ('loop' in entry) return entry.bars
  if (motif === undefined) return 1
  return Math.max(1, Math.ceil(motifBeats(motif, entry) / BEATS_PER_BAR))
}

/** The loops and motifs a song names must be in the game, in the right kind of lane, inside the track and apart. */
export function checkArrangement(music: ArrangedMusic, game: Listed, report: Report): void {
  music.lanes.forEach((one, i) => {
    const spans: { at: number; end: number; index: number }[] = []
    one.blocks.forEach((entry, j) => {
      const where = `lanes[${i}].blocks[${j}]`
      const loopFile = 'loop' in entry ? game.get('loop', entry.loop) : undefined
      const motifFile = 'motif' in entry ? game.get('motif', entry.motif) : undefined
      if ('loop' in entry && !game.has('loop', entry.loop))
        report(`${where}.loop`, noSuch('loop', entry.loop, game.ids('loop')))
      if ('motif' in entry && !game.has('motif', entry.motif))
        report(`${where}.motif`, noSuch('motif', entry.motif, game.ids('motif')))
      if (loopFile !== undefined) {
        if (loopFile.lane === 'drums' && one.instrument !== 'drums')
          report(
            `${where}.loop`,
            `"${entry.loop}" is a drum loop, so it goes in a lane whose instrument is "drums".`,
          )
        else if (loopFile.lane !== 'drums' && one.instrument === 'drums')
          report(
            `${where}.loop`,
            `This lane plays drums, so it takes drum loops only. "${entry.loop}" is a ${loopFile.lane} loop.`,
          )
      }
      if (motifFile !== undefined && one.instrument === 'drums')
        report(
          `${where}.motif`,
          `This lane plays drums, so it takes drum loops only. "${entry.motif}" is a motif.`,
        )
      if (entry.at > music.bars) {
        report(`${where}.at`, `This block starts at bar ${entry.at}, but the track has ${music.bars} bars.`)
        return
      }
      const length = blockBars(entry, motifFile)
      const end = entry.at + length - 1
      if ('loop' in entry && end > music.bars)
        report(
          `${where}.bars`,
          `This block runs to bar ${end}, but the track has ${music.bars} bars. Lower "bars" to ${music.bars - entry.at + 1}.`,
        )
      spans.push({ at: entry.at, end, index: j })
    })
    // Blocks are checked in the order they play, whatever order the file has them in.
    spans.sort((a, b) => a.at - b.at || a.index - b.index)
    let reach = 0
    for (const span of spans) {
      if (span.at <= reach)
        report(
          `lanes[${i}].blocks[${span.index}].at`,
          `This block overlaps the one before it in this lane. Move it to bar ${reach + 1} or later.`,
        )
      reach = Math.max(reach, span.end)
    }
  })
}
