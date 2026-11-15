// The spec's `meadow` song, in memory: its loops, its motif and the track, as values and as the files of a small game,
// so a test of a format 2 track reads as the song it checks.
import {
  type ArrangedMusic,
  type LoopFile,
  type MotifFile,
  writeContent,
} from '#src/features/content/content.ts'
import { gameFiles } from '../content/kind.ts'
import { fixtureFiles } from '../game/read.ts'

export const easyDrums = (): LoopFile => ({
  format: 1,
  id: 'easy-drums',
  lane: 'drums',
  bars: 1,
  stepsPerBar: 8,
  notes: { kick: ['x - - - x - - -'], snare: ['- - x - - - x -'], hat: ['x x x x x x x x'] },
})

export const drumFill = (): LoopFile => ({
  format: 1,
  id: 'drum-fill',
  lane: 'drums',
  bars: 1,
  stepsPerBar: 8,
  notes: { snare: ['x - x - x x x x'] },
})

export const bouncyBass = (): LoopFile => ({
  format: 1,
  id: 'bouncy-bass',
  lane: 'bass',
  bars: 2,
  stepsPerBar: 8,
  notes: ['1 - 5 - 1 - 5 -', '1 - 5 - 8 - 5 -'],
})

export const heroTheme = (): MotifFile => ({
  format: 1,
  id: 'hero-theme',
  notes: [
    { step: 1, beats: 1 },
    { step: 3, beats: 0.5 },
    { step: 5, beats: 0.5 },
    { step: 8, beats: 2 },
  ],
})

/** The song: eight bars, drums under six and a fill, a melody that comes in at bar two. */
export const meadow = (): ArrangedMusic => ({
  format: 2,
  id: 'meadow',
  tempo: 110,
  key: 'C',
  mode: 'major',
  bars: 8,
  loop: true,
  volume: 0.7,
  chords: ['I', 'vi', 'IV', 'V', 'I', 'vi', 'IV', 'V'],
  lanes: [
    {
      id: 'drums',
      instrument: 'drums',
      volume: 0.8,
      blocks: [
        { at: 1, loop: 'easy-drums', bars: 6 },
        { at: 7, loop: 'drum-fill', bars: 1 },
      ],
    },
    {
      id: 'melody',
      instrument: 'pluck',
      volume: 0.6,
      blocks: [
        { at: 2, motif: 'hero-theme' },
        { at: 6, motif: 'hero-theme', shift: 2 },
      ],
    },
  ],
})

/** The song's loops and motif, by id, as `scoreOf` and `notesOf` take them. */
export function songParts(): {
  loops: Record<string, LoopFile>
  motifs: Record<string, MotifFile>
} {
  return {
    loops: { 'easy-drums': easyDrums(), 'drum-fill': drumFill(), 'bouncy-bass': bouncyBass() },
    motifs: { 'hero-theme': heroTheme() },
  }
}

/** Where each file is in the game. */
export const SONG_PATHS = {
  'easy-drums': 'content/loops/easy-drums.json',
  'drum-fill': 'content/loops/drum-fill.json',
  'bouncy-bass': 'content/loops/bouncy-bass.json',
  'hero-theme': 'content/motifs/hero-theme.json',
  meadow: 'content/music/meadow.json',
} as const

/**
 * The fixture game with the song's loops, motif and track. `track` is the track written (the song by default); any path
 * in `replace` is changed after (a `undefined` takes the file out).
 */
export function songFiles(
  track: unknown = meadow(),
  replace: Readonly<Record<string, string | undefined>> = {},
): Record<string, string | undefined> {
  return gameFiles(
    fixtureFiles,
    [
      { type: 'loop', path: SONG_PATHS['easy-drums'], text: writeContent('loop', easyDrums()) },
      { type: 'loop', path: SONG_PATHS['drum-fill'], text: writeContent('loop', drumFill()) },
      { type: 'loop', path: SONG_PATHS['bouncy-bass'], text: writeContent('loop', bouncyBass()) },
      { type: 'motif', path: SONG_PATHS['hero-theme'], text: writeContent('motif', heroTheme()) },
      { type: 'music', path: SONG_PATHS.meadow, text: writeContent('music', track as never) },
    ],
    replace,
  )
}
