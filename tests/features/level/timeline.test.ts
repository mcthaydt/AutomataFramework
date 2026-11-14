// A cutscene read at a tick, as plain values: no sim.
import { expect, test } from 'vitest'
import { type CutsceneFile, parseContent } from '#src/features/content/content.ts'
import { actorsAt, cameraAt, linesAt } from '#src/features/level/timeline.ts'
import { fullGameFiles } from '../../fixtures/full-game/read.ts'

/** The full game's intro: the camera goes from (4, 4) to (8, 4) and in to 1.5 by tick 120; one line from 60 to 180. */
function fullGameCutscene(): CutsceneFile {
  const path = 'content/cutscenes/level-1-intro.json'
  const parsed = parseContent('cutscene', fullGameFiles[path] ?? '', path)
  if (!parsed.ok) throw new Error('the intro did not read')
  return parsed.value
}
const intro = fullGameCutscene()

/** A cutscene made in memory, with only what a test is about. */
const scene = (parts: Partial<CutsceneFile>): CutsceneFile => ({
  format: 1,
  id: 'scene',
  level: 'level-1',
  length: 300,
  camera: [{ at: 0, x: 0, y: 0, zoom: 1, ease: 'cut' }],
  actors: [],
  lines: [],
  ...parts,
})

test('the camera eases from one key to the next', () => {
  expect(cameraAt(intro, 0)).toEqual({ x: 4, y: 4, zoom: 1 })
  expect(cameraAt(intro, 60)).toEqual({ x: 6, y: 4, zoom: 1.25 }) // smooth is halfway at the half
  expect(cameraAt(intro, 30).x).toBeCloseTo(4.625, 10) // 4 + 4 * (0.25 * 0.25 * 2.5)
  expect(cameraAt(intro, 300)).toEqual({ x: 8, y: 4, zoom: 1.5 })
  expect(cameraAt(intro, 120)).toEqual({ x: 8, y: 4, zoom: 1.5 })
})

test('before the first key the camera is on it, and after the last it stays', () => {
  const late = scene({
    camera: [
      { at: 10, x: 2, y: 3, zoom: 2, ease: 'cut' },
      { at: 20, x: 6, y: 3, zoom: 2, ease: 'linear' },
    ],
  })
  expect(cameraAt(late, 0)).toEqual({ x: 2, y: 3, zoom: 2 })
  expect(cameraAt(late, 25)).toEqual({ x: 6, y: 3, zoom: 2 })
})

test('a cut stays put and then jumps; linear goes steadily', () => {
  const cut = scene({
    camera: [
      { at: 0, x: 0, y: 0, zoom: 1, ease: 'cut' },
      { at: 100, x: 10, y: 4, zoom: 2, ease: 'cut' },
    ],
  })
  expect(cameraAt(cut, 99)).toEqual({ x: 0, y: 0, zoom: 1 })
  expect(cameraAt(cut, 100)).toEqual({ x: 10, y: 4, zoom: 2 })
  const linear = scene({
    camera: [
      { at: 0, x: 0, y: 0, zoom: 1, ease: 'cut' },
      { at: 100, x: 10, y: 4, zoom: 2, ease: 'linear' },
    ],
  })
  expect(cameraAt(linear, 25)).toEqual({ x: 2.5, y: 1, zoom: 1.25 })
  expect(cameraAt(linear, 50)).toEqual({ x: 5, y: 2, zoom: 1.5 })
})

test('of two keys at one tick the later one counts', () => {
  const twice = scene({
    camera: [
      { at: 0, x: 0, y: 0, zoom: 1, ease: 'cut' },
      { at: 50, x: 3, y: 3, zoom: 1, ease: 'cut' },
      { at: 50, x: 9, y: 9, zoom: 1, ease: 'cut' },
    ],
  })
  expect(cameraAt(twice, 49)).toEqual({ x: 0, y: 0, zoom: 1 })
  expect(cameraAt(twice, 50)).toEqual({ x: 9, y: 9, zoom: 1 })
})

test('an actor is nowhere before its first key, walks between keys, and stays after its last', () => {
  const walk = scene({
    actors: [
      { at: 10, who: 'keeper', x: 12, y: 7.5, face: 'left' },
      { at: 70, who: 'keeper', x: 10, y: 7.5 },
    ],
  })
  expect(actorsAt(walk, 9)).toEqual([])
  expect(actorsAt(walk, 10)).toEqual([{ who: 'keeper', x: 12, y: 7.5, face: 'left' }])
  // Halfway between the two keys, and still facing the way it was told to.
  expect(actorsAt(walk, 40)).toEqual([{ who: 'keeper', x: 11, y: 7.5, face: 'left' }])
  expect(actorsAt(walk, 70)).toEqual([{ who: 'keeper', x: 10, y: 7.5, face: 'left' }])
  expect(actorsAt(walk, 500)).toEqual([{ who: 'keeper', x: 10, y: 7.5, face: 'left' }])
})

test('a later key changes the way an actor faces, and an actor with no face has none', () => {
  const turn = scene({
    actors: [
      { at: 0, who: 'keeper', x: 1, y: 1, face: 'left' },
      { at: 50, who: 'keeper', x: 1, y: 1, face: 'right' },
      { at: 0, who: 'crate-1', x: 5, y: 5 },
    ],
  })
  expect(actorsAt(turn, 49)).toEqual([
    { who: 'keeper', x: 1, y: 1, face: 'left' },
    { who: 'crate-1', x: 5, y: 5 },
  ])
  expect(actorsAt(turn, 50)).toEqual([
    { who: 'keeper', x: 1, y: 1, face: 'right' },
    { who: 'crate-1', x: 5, y: 5 },
  ])
})

test('actors are listed in the order each first appears in the file, and move on their own keys', () => {
  const two = scene({
    actors: [
      { at: 0, who: 'b', x: 0, y: 0 },
      { at: 0, who: 'a', x: 10, y: 0 },
      { at: 100, who: 'b', x: 10, y: 0 },
      { at: 100, who: 'a', x: 0, y: 0 },
    ],
  })
  expect(actorsAt(two, 50)).toEqual([
    { who: 'b', x: 5, y: 0 },
    { who: 'a', x: 5, y: 0 },
  ])
  expect(actorsAt(two, 25).map((a) => [a.who, a.x])).toEqual([
    ['b', 2.5],
    ['a', 7.5],
  ])
})

test('a line is on from "at" until just before "until"', () => {
  expect(linesAt(intro, 59)).toEqual([])
  expect(linesAt(intro, 60).map((l) => l.line)).toEqual(['keeper.hello'])
  expect(linesAt(intro, 179).map((l) => l.line)).toEqual(['keeper.hello'])
  expect(linesAt(intro, 180)).toEqual([])
})

test('lines that overlap are on together, in file order', () => {
  const both = scene({
    lines: [
      { at: 0, until: 100, line: 'first' },
      { at: 50, until: 150, line: 'second', speaker: 'keeper' },
    ],
  })
  expect(linesAt(both, 75).map((l) => l.line)).toEqual(['first', 'second'])
  expect(linesAt(both, 120).map((l) => l.line)).toEqual(['second'])
})
