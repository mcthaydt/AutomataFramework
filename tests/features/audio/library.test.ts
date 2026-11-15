import { expect, test } from 'vitest'
import {
  LIBRARY,
  LIBRARY_LANGUAGES,
  libraryFiles,
  libraryName,
  SOUND_KINDS,
  scoreOf,
} from '#src/features/audio/audio.ts'
import {
  DRUMS,
  INSTRUMENTS,
  type LoopFile,
  LoopSchema,
  MusicSchema,
  writeContent,
} from '#src/features/content/content.ts'
import { gameFiles, gameProblems } from '../../fixtures/content/kind.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

const loops = LIBRARY.loops
const byLane = (lane: LoopFile['lane']): number => loops.filter((loop) => loop.lane === lane).length

test('the library has at least 8 drum, 6 bass, 6 chord and 6 melody loops', () => {
  expect(byLane('drums')).toBeGreaterThanOrEqual(8)
  expect(byLane('bass')).toBeGreaterThanOrEqual(6)
  expect(byLane('chords')).toBeGreaterThanOrEqual(6)
  expect(byLane('melody')).toBeGreaterThanOrEqual(6)
})

test('every loop is a loop file, and no two have the same notes', () => {
  for (const loop of loops) expect(LoopSchema.safeParse(loop).success, loop.id).toBe(true)
  const seen = new Set(loops.map((loop) => JSON.stringify({ ...loop, id: '' })))
  expect(seen.size).toBe(loops.length)
  expect(new Set(loops.map((loop) => loop.id)).size).toBe(loops.length)
})

test('there are four styles, each four bars, made only of library loops and with notes in every lane', () => {
  expect(LIBRARY.styles.map((style) => style.id)).toEqual(['calm', 'bouncy', 'spooky', 'brave'])
  const parts = { loops: Object.fromEntries(loops.map((loop) => [loop.id, loop])) }
  for (const style of LIBRARY.styles) {
    expect(MusicSchema.safeParse(style).success, style.id).toBe(true)
    expect(style.bars).toBe(4)
    expect(style.lanes.map((lane) => lane.id)).toEqual(['drums', 'bass', 'chords', 'melody'])
    for (const lane of style.lanes)
      for (const block of lane.blocks) {
        if (!('loop' in block)) throw new Error(`${style.id} plays a motif`)
        const loop = parts.loops[block.loop]
        expect(loop, `${style.id} plays ${block.loop}`).toBeDefined()
        // A style lies on the sixteenths, so it comes back unmoved from a MIDI file.
        expect([4, 8, 16], `${style.id} ${block.loop}`).toContain(loop?.stepsPerBar)
      }
    const lanes = new Set(scoreOf(style, parts).notes.map((note) => note.part))
    expect([...lanes].sort()).toEqual(['bass', 'chords', 'drums', 'melody'])
  }
})

test('every loop, style, sound kind, instrument and drum has a name in all nine languages', () => {
  expect(LIBRARY_LANGUAGES).toEqual(['zh', 'es', 'en', 'pt', 'ja', 'ko', 'fr', 'ru', 'de'])
  const ids = [
    ...loops.map((loop) => loop.id),
    ...LIBRARY.styles.map((style) => style.id),
    ...SOUND_KINDS,
    ...INSTRUMENTS,
    ...DRUMS,
  ]
  expect(new Set(ids).size).toBe(ids.length)
  for (const id of ids)
    for (const language of LIBRARY_LANGUAGES) {
      const name = libraryName(id, language)
      expect(name, `${id} in ${language}`).not.toBe('')
      expect(name, `${id} in ${language}`).not.toBe(id)
    }
})

test('a name the library does not have is said in plain words', () => {
  expect(() => libraryName('nope', 'en')).toThrow('The library has no name for "nope" in "en".')
})

test('a style is its track and each loop it plays once; renamed, the track has the new name', () => {
  const files = libraryFiles('calm')
  expect(files.map((file) => file.type)).toEqual(['music', 'loop', 'loop', 'loop', 'loop'])
  expect(files.map((file) => file.value.id)).toEqual([
    'calm',
    'half-time-drums',
    'slow-bass',
    'soft-chords',
    'calm-tune',
  ])
  expect(libraryFiles('calm', 'meadow')[0]?.value.id).toBe('meadow')
  expect(libraryFiles('easy-drums').map((file) => file.value.id)).toEqual(['easy-drums'])
})

test('an id the library does not have says what it has', () => {
  const said = /^The library has nothing called "x"\. It has: bouncy, bouncy-bass, /
  expect(() => libraryFiles('x')).toThrow(said)
})

test('a game made of every library file loads with no problem', async () => {
  const entries = [...LIBRARY.styles.map((style) => style.id), ...loops.map((loop) => loop.id)]
    .flatMap((id) => libraryFiles(id))
    .filter((file, i, all) => all.findIndex((other) => other.value.id === file.value.id) === i)
    .map((file) => {
      const folder = file.type === 'loop' ? 'loops' : 'music'
      return {
        type: file.type,
        path: `content/${folder}/${file.value.id}.json`,
        text: writeContent(file.type, file.value as never),
      }
    })
  expect(await gameProblems(gameFiles(fixtureFiles, entries, {}))).toEqual([])
})
