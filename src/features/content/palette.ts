// The `palette` kind: colour ramps a rigged figure is shaded in (plan R, Task 1). A ramp is three to six shades of
// one colour from dark to light; a figure names a ramp for its skin, its hair or a piece, and the painter steps through
// that ramp's shades to light it, so no figure ever has a colour that is not in its palette.
//
// The library's own palette (`library/palette.json`) is the first builder's DUEL ramps ported once, from
// AutomataFrameworkFailed@ed8592e8 `extensions/figures/src/shared/paint/duel-ramps.ts`: that file's rows 0 to 31, each
// ramp the row's steps 1, 2, 3, 5 and 6 (counted from 0), named in row order. Every row's five steps already get
// lighter each time, so none was moved. Row 28 is `amethyst`, not `ink`: it is purple, and the library's `ink` is the old
// painter's outline colour, `RAMP_OUTLINE` (`#002219`, row 6's step 0). JSON has no comments, so the port is recorded here.
import { z } from '../../lib/zod.ts'
import { colour } from './colour.ts'
import { Id } from './ids.ts'
import library from './library/palette.json' with { type: 'json' }
import { unique } from './shared.ts'
import type { ContentTypeInfo } from './type-info.ts'

/** One colour a figure can be made of: its shades, from dark to light. */
export interface Ramp {
  readonly id: string
  readonly colors: readonly string[]
}

/** A palette file once read: the colour ramps a game's figures are shaded in. */
export interface PaletteFile {
  readonly format: 1
  readonly id: string
  /** The one near-black that an "ink" edge, eyes and brows are drawn in. */
  readonly ink?: string | undefined
  readonly ramps: readonly Ramp[]
}

/** How light a `#rrggbb` colour is, in whole numbers: `2126 r + 7152 g + 722 b`, so the same in every engine. */
export function lightness(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16)
  return 2126 * (value >> 16) + 7152 * ((value >> 8) & 255) + 722 * (value & 255)
}

/** The palette's ink: the one it names, or else the darkest shade of its darkest ramp. */
export function inkOf(palette: PaletteFile): string {
  if (palette.ink !== undefined) return palette.ink
  let darkest = palette.ramps[0]?.colors[0] ?? '#000000'
  for (const ramp of palette.ramps) {
    const first = ramp.colors[0]
    if (first !== undefined && lightness(first) < lightness(darkest)) darkest = first
  }
  return darkest
}

const ramp = z.strictObject({
  id: Id.describe('A name for this colour, like "tan" or "moss".'),
  colors: z
    .array(colour('A shade', '#885041'))
    .min(3)
    .max(6)
    .describe("The colour's shades, from dark to light. A figure is shaded with them."),
})

/** Each shade of a ramp must be lighter than the one before it, so a figure is lit from dark to light. */
function checkPalette(palette: Partial<PaletteFile>, ctx: z.core.$RefinementCtx): void {
  const ramps = palette.ramps ?? []
  unique(ramps, 'id', 'colour', ['ramps'], ctx)
  ramps.forEach((one, i) => {
    one.colors.forEach((shade, j) => {
      const before = one.colors[j - 1]
      if (before !== undefined && lightness(shade) <= lightness(before))
        ctx.addIssue({
          code: 'custom',
          path: ['ramps', i, 'colors', j],
          message: `These shades must go from dark to light, and "${shade}" is not lighter than "${before}".`,
        })
    })
  })
}

/** The rules for a palette file; unknown keys are refused. */
export const PaletteSchema: z.ZodType<PaletteFile, PaletteFile> = z
  .strictObject({
    format: z.literal(1).describe('The version of this file format. Always 1.'),
    id: Id.describe('A name for this palette, like "meadow". It matches the file name.'),
    ink: colour(
      'The one near-black an "ink" edge, eyes and brows are drawn in',
      '#222323',
      'Left out means the darkest shade in the palette.',
    ).optional(),
    ramps: z.array(ramp).min(1).max(64).describe('Every colour this palette has, each as a ramp of shades.'),
  })
  .superRefine(checkPalette)

/** The palette's row of the content table. */
export const paletteInfo: ContentTypeInfo<PaletteFile, PaletteFile> = {
  schema: PaletteSchema,
  title: 'Palette',
  plural: 'palettes',
  editor: 'characters',
  part: 'palette',
  noun: 'palette',
  missing: {
    format: 'Write "format": 1.',
    id: 'Give the palette a name like "meadow".',
    ramps:
      'List the colours, each with an id and its shades, like [{ "id": "moss", "colors": ["#174a1b", "#225918", "#2f690c"] }].',
    'ramps.id': 'Give the colour a name like "moss".',
    'ramps.colors': 'List three to six shades from dark to light, like ["#174a1b", "#225918", "#2f690c"].',
  },
}

/** The framework's own palette: what a figure that names no palette of its own is painted in. */
export const LIBRARY_PALETTE: PaletteFile = library as PaletteFile

/**
 * Lospec's DUEL palette, all 256 colours in Lospec's order (the Owner, 2026-11-15: games' art uses it, and the UI keeps
 * its own palettes). Rows of 8, dark to light; the library's ramps are steps of these rows. A game's CI can hold its
 * art to it.
 */
export const DUEL_COLOURS: readonly string[] = [
  '#000000',
  '#222323',
  '#434549',
  '#626871',
  '#828b98',
  '#a6aeba',
  '#cdd2da',
  '#f5f7fa',
  '#625d54',
  '#857565',
  '#9e8c79',
  '#aea189',
  '#bbafa4',
  '#ccc3b1',
  '#eadbc9',
  '#fff3d6',
  '#583126',
  '#733d3b',
  '#885041',
  '#9a624c',
  '#ad6e51',
  '#d58d6b',
  '#fbaa84',
  '#ffce7f',
  '#002735',
  '#003850',
  '#004d5e',
  '#0b667f',
  '#006f89',
  '#328ca7',
  '#24aed6',
  '#88d6ff',
  '#662b29',
  '#94363a',
  '#b64d46',
  '#cd5e46',
  '#e37840',
  '#f99b4e',
  '#ffbc4e',
  '#ffe949',
  '#282b4a',
  '#3a4568',
  '#615f84',
  '#7a7799',
  '#8690b2',
  '#96b2d9',
  '#c7d6ff',
  '#c6ecff',
  '#002219',
  '#003221',
  '#174a1b',
  '#225918',
  '#2f690c',
  '#518822',
  '#7da42d',
  '#a6cc34',
  '#181f2f',
  '#23324d',
  '#25466b',
  '#366b8a',
  '#318eb8',
  '#41b2e3',
  '#52d2ff',
  '#74f5fd',
  '#1a332c',
  '#2f3f38',
  '#385140',
  '#325c40',
  '#417455',
  '#498960',
  '#55b67d',
  '#91daa1',
  '#5e0711',
  '#82211d',
  '#b63c35',
  '#e45c5f',
  '#ff7676',
  '#ff9ba8',
  '#ffbbc7',
  '#ffdbff',
  '#2d3136',
  '#48474d',
  '#5b5c69',
  '#73737f',
  '#848795',
  '#abaebe',
  '#bac7db',
  '#ebf0f6',
  '#3b303c',
  '#5a3c45',
  '#8a5258',
  '#ae6b60',
  '#c7826c',
  '#d89f75',
  '#ecc581',
  '#fffaab',
  '#31222a',
  '#4a353c',
  '#5e4646',
  '#725a51',
  '#7e6c54',
  '#9e8a6e',
  '#c0a588',
  '#ddbf9a',
  '#2e1026',
  '#49283d',
  '#663659',
  '#975475',
  '#b96d91',
  '#c178aa',
  '#db99bf',
  '#f8c6da',
  '#002e49',
  '#004051',
  '#005162',
  '#006b6d',
  '#008279',
  '#00a087',
  '#00bfa3',
  '#00deda',
  '#453125',
  '#614a3c',
  '#7e6144',
  '#997951',
  '#b29062',
  '#cca96e',
  '#e8cb82',
  '#fbeaa3',
  '#5f0926',
  '#6e2434',
  '#904647',
  '#a76057',
  '#bd7d64',
  '#ce9770',
  '#edb67c',
  '#edd493',
  '#323558',
  '#4a5280',
  '#64659d',
  '#7877c1',
  '#8e8ce2',
  '#9c9bef',
  '#b8aeff',
  '#dcd4ff',
  '#431729',
  '#712b3b',
  '#9f3b52',
  '#d94a69',
  '#f85d80',
  '#ff7daf',
  '#ffa6c5',
  '#ffcdff',
  '#49251c',
  '#633432',
  '#7c4b47',
  '#98595a',
  '#ac6f6e',
  '#c17e7a',
  '#d28d7a',
  '#e59a7c',
  '#202900',
  '#2f4f08',
  '#495d00',
  '#617308',
  '#7c831e',
  '#969a26',
  '#b4aa33',
  '#d0cc32',
  '#622a00',
  '#753b09',
  '#854f12',
  '#9e6520',
  '#ba882e',
  '#d1aa39',
  '#e8d24b',
  '#fff64f',
  '#26233d',
  '#3b3855',
  '#56506f',
  '#75686e',
  '#917a7b',
  '#b39783',
  '#cfaf8e',
  '#fedfb1',
  '#1d2c43',
  '#2e3d47',
  '#394d3c',
  '#4c5f33',
  '#58712c',
  '#6b842d',
  '#789e24',
  '#7fbd39',
  '#372423',
  '#53393a',
  '#784c49',
  '#945d4f',
  '#a96d58',
  '#bf7e63',
  '#d79374',
  '#f4a380',
  '#2d4b47',
  '#47655a',
  '#5b7b69',
  '#71957d',
  '#87ae8e',
  '#8ac196',
  '#a9d1c1',
  '#e0faeb',
  '#001b40',
  '#03315f',
  '#07487c',
  '#105da2',
  '#1476c0',
  '#4097ea',
  '#55b1f1',
  '#6dccff',
  '#554769',
  '#765d73',
  '#977488',
  '#b98c93',
  '#d5a39a',
  '#ebbd9d',
  '#ffd59b',
  '#fdf786',
  '#1d1d21',
  '#3c3151',
  '#584a7f',
  '#7964ba',
  '#9585f1',
  '#a996ec',
  '#baabf7',
  '#d1bdfe',
  '#262450',
  '#28335d',
  '#2d3d72',
  '#3d5083',
  '#5165ae',
  '#5274c5',
  '#6c82c4',
  '#8393c3',
  '#492129',
  '#5e414a',
  '#77535b',
  '#91606a',
  '#ad7984',
  '#b58b94',
  '#d4aeaa',
  '#ffe2cf',
  '#721c03',
  '#9c3327',
  '#bf5a3e',
  '#e98627',
  '#ffb108',
  '#ffcf05',
  '#fff02b',
  '#f7f4bf',
]
