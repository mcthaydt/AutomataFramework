import { expect, test } from 'vitest'
import { blockBars, type MusicBlock, writeContent } from '#src/features/content/content.ts'
import { bouncyBass, heroTheme, meadow, SONG_PATHS, songFiles } from '../../fixtures/audio/song.ts'
import { expectRoundTrip, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'

// biome-ignore lint/suspicious/noExplicitAny: a test changes a song by the path to the part it changes
type Json = Record<string, any>
const file = SONG_PATHS.meadow
/** The song with a change made to its value, the problems of the game that has it. */
const problemsWith = (change: (song: Json) => void): Promise<string[]> => {
  const song = meadow() as unknown as Json
  change(song)
  return gameProblems(songFiles(song))
}

test("the spec's meadow loads with its loops and its motif", async () =>
  expect(await gameProblems(songFiles())).toEqual([]))

test('a track with no lanes is a silent track and reads', async () => {
  expect(await problemsWith((s) => (s.lanes = []))).toEqual([])
  expectRoundTrip('music', { ...meadow(), lanes: [] })
})

test('a song reads, and writes back to the same bytes twice', () => expectRoundTrip('music', meadow()))

test("a song is written with its keys in the schema's order", () =>
  expect(Object.keys(JSON.parse(writeContent('music', meadow())))).toEqual([
    'format',
    'id',
    'tempo',
    'key',
    'mode',
    'bars',
    'loop',
    'volume',
    'chords',
    'lanes',
  ]))

test('one chord for each bar', async () =>
  expect(await problemsWith((s) => (s.chords = s.chords.slice(0, 6)))).toEqual([
    `${file}: chords: Write one chord for each bar: this track has 8 bars and 6 chords.`,
  ]))

test('a chord that is not a numeral of the key', () =>
  expect(
    problemsOf('music', { ...meadow(), chords: ['I', 'C', 'IV', 'V', 'I', 'vi', 'IV', 'V'] }, file),
  ).toEqual([`${file}: chords[1]: Write a chord of the key, like "I", "vi" or "V7".`]))

test('two lanes with one name', () => {
  const song = meadow() as unknown as Json
  song.lanes[1].id = 'drums'
  expect(problemsOf('music', song, file)).toEqual([
    `${file}: lanes[1].id: "drums" is used twice. Each lane needs its own id.`,
  ])
})

test('a block that is a loop and a motif, or neither', () => {
  const both = meadow() as unknown as Json
  both.lanes[0].blocks[0].motif = 'hero-theme'
  expect(problemsOf('music', both, file)).toEqual([
    `${file}: lanes[0].blocks[0]: Write a loop or a motif, not both.`,
  ])
  const neither = meadow() as unknown as Json
  neither.lanes[0].blocks[0] = { at: 1 }
  expect(problemsOf('music', neither, file)).toEqual([
    `${file}: lanes[0].blocks[0]: Say what this block plays: add "loop" or "motif".`,
  ])
})

test('a loop block needs its bars and a motif block takes none', () => {
  const loop = meadow() as unknown as Json
  loop.lanes[0].blocks[0] = { at: 1, loop: 'easy-drums' }
  expect(problemsOf('music', loop, file)).toEqual([
    `${file}: lanes[0].blocks[0].bars: Say how many bars the loop fills: add "bars".`,
  ])
  const motif = meadow() as unknown as Json
  motif.lanes[1].blocks[0] = { at: 2, motif: 'hero-theme', bars: 1 }
  expect(problemsOf('music', motif, file)).toEqual([
    `${file}: lanes[1].blocks[0].bars: A motif plays once, so it takes no "bars". Take the line out.`,
  ])
})

test('a loop is not moved, slowed or turned', () => {
  const song = meadow() as unknown as Json
  song.lanes[0].blocks[0].shift = 2
  expect(problemsOf('music', song, file)).toEqual([
    `${file}: lanes[0].blocks[0]: Only a motif can be moved, slowed or turned. Take these lines out of the loop block.`,
  ])
})

test('a loop or a motif the game does not have', async () => {
  expect(await problemsWith((s) => (s.lanes[0].blocks[0].loop = 'easy-drum'))).toEqual([
    `${file}: lanes[0].blocks[0].loop: There is no loop called "easy-drum". This game has: bouncy-bass, drum-fill, easy-drums.`,
  ])
  expect(await problemsWith((s) => (s.lanes[1].blocks[0].motif = 'hero-song'))).toEqual([
    `${file}: lanes[1].blocks[0].motif: There is no motif called "hero-song". This game has: hero-theme.`,
  ])
})

test('a drum loop goes in a drum lane, and only drum loops do', async () => {
  expect(await problemsWith((s) => (s.lanes[0].instrument = 'bass'))).toEqual([
    `${file}: lanes[0].blocks[0].loop: "easy-drums" is a drum loop, so it goes in a lane whose instrument is "drums".`,
    `${file}: lanes[0].blocks[1].loop: "drum-fill" is a drum loop, so it goes in a lane whose instrument is "drums".`,
  ])
  expect(await problemsWith((s) => (s.lanes[0].blocks[0].loop = 'bouncy-bass'))).toEqual([
    `${file}: lanes[0].blocks[0].loop: This lane plays drums, so it takes drum loops only. "bouncy-bass" is a bass loop.`,
  ])
  expect(await problemsWith((s) => (s.lanes[0].blocks[1] = { at: 7, motif: 'hero-theme' }))).toEqual([
    `${file}: lanes[0].blocks[1].motif: This lane plays drums, so it takes drum loops only. "hero-theme" is a motif.`,
  ])
})

test('a block that starts after the track ends', async () =>
  expect(await problemsWith((s) => (s.lanes[1].blocks[0].at = 9))).toEqual([
    `${file}: lanes[1].blocks[0].at: This block starts at bar 9, but the track has 8 bars.`,
  ]))

test('a loop that runs past the end of the track', async () =>
  expect(await problemsWith((s) => (s.lanes[0].blocks[1] = { at: 7, loop: 'drum-fill', bars: 3 }))).toEqual([
    `${file}: lanes[0].blocks[1].bars: This block runs to bar 9, but the track has 8 bars. Lower "bars" to 2.`,
  ]))

test('blocks that overlap, whatever order the file has them in', async () => {
  const said = [
    `${file}: lanes[0].blocks[0].at: This block overlaps the one before it in this lane. Move it to bar 7 or later.`,
  ]
  expect(
    await problemsWith((s) => {
      s.lanes[0].blocks = [
        { at: 5, loop: 'drum-fill', bars: 1 },
        { at: 1, loop: 'easy-drums', bars: 6 },
      ]
    }),
  ).toEqual(said)
})

test('blocks that touch do not overlap', async () =>
  expect(
    await problemsWith((s) => {
      s.lanes[0].blocks = [
        { at: 1, loop: 'easy-drums', bars: 4 },
        { at: 5, loop: 'drum-fill', bars: 4 },
      ]
    }),
  ).toEqual([]))

test('the bars a block takes', () => {
  const loop: MusicBlock = { at: 1, loop: 'bouncy-bass', bars: 5 }
  expect(blockBars(loop, bouncyBass())).toBe(5)
  const motif: MusicBlock = { at: 1, motif: 'hero-theme' }
  expect(blockBars(motif, heroTheme())).toBe(1)
  expect(blockBars({ ...motif, speed: 0.25 }, heroTheme())).toBe(4)
  expect(blockBars({ ...motif, speed: 4 }, heroTheme())).toBe(1)
  expect(blockBars(motif, undefined)).toBe(1)
})

test('a music file says whether it is format 1 or 2 when the format is missing', () => {
  const song = meadow() as unknown as Json
  delete song.format
  expect(problemsOf('music', song, file).join('\n')).toContain('format')
})
