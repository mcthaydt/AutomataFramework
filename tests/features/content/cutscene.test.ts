import { expect, test } from 'vitest'
import { writeContent } from '#src/features/content/content.ts'
import { expectRoundTrip, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'
import { artGame } from '../../fixtures/content/art.ts'
import { english, intro, storyGame } from '../../fixtures/content/story.ts'

type Json = Record<string, unknown>
const file = 'content/cutscenes/level-1-intro.json'
const said = (value: unknown): string[] => problemsOf('cutscene', value, file)
const edit = (change: (value: Record<string, Json[]> & Json) => void): ReturnType<typeof intro> => {
  const value = intro()
  change(value as never)
  return value
}

test('a cutscene reads, and writes back to the same bytes twice', () => expectRoundTrip('cutscene', intro()))

test('a camera key before the one above it', () =>
  expect(said(edit((v) => Object.assign((v.camera as Json[])[1] as Json, { at: 0 })))).toEqual([]))

test('a camera key that goes back in time', () => {
  const scene = edit((v) => {
    ;(v.camera as Json[]).push({ at: 30, x: 8, y: 4, zoom: 1, ease: 'cut' })
  })
  expect(said(scene)).toEqual([
    `${file}: camera[2].at: This key is at tick 30, before the one above it (120). Keys go in time order.`,
  ])
})

test('an actor’s keys go in time order, but two actors may interleave', () => {
  const swapped = edit((v) => {
    Object.assign((v.actors as Json[])[1] as Json, { at: 0 })
    Object.assign((v.actors as Json[])[0] as Json, { at: 30 })
  })
  expect(said(swapped)).toEqual([
    `${file}: actors[1].at: This key is at tick 0, before "keeper"'s key above it (30). Keys go in time order.`,
  ])
  const interleaved = edit((v) => {
    ;(v.actors as Json[]).splice(1, 0, { at: 10, who: 'crate-1', x: 6.5, y: 7.5 })
    Object.assign((v.actors as Json[])[2] as Json, { at: 60 })
  })
  expect(said(interleaved)).toEqual([])
})

test('a key after the cutscene ends', () =>
  expect(said({ ...intro(), length: 100, lines: [] })).toEqual([
    `${file}: camera[1].at: This is after the cutscene ends, at tick 100.`,
  ]))

test('a line that starts, or stays up, after the cutscene ends', () => {
  const camera = [{ at: 0, x: 4, y: 4, zoom: 1, ease: 'cut' }]
  const scene = (length: number, line: Json) => ({ ...intro(), length, camera, lines: [line] })
  const base = { line: 'keeper.hello', speaker: 'keeper' }
  expect(said(scene(100, { at: 120, until: 150, ...base }))).toEqual([
    `${file}: lines[0].at: This is after the cutscene ends, at tick 100.`,
    `${file}: lines[0].until: This is after the cutscene ends, at tick 100.`,
  ])
  expect(said(scene(100, { at: 60, until: 180, ...base }))).toEqual([
    `${file}: lines[0].until: This is after the cutscene ends, at tick 100.`,
  ])
})

test('a line that does not end after it starts', () =>
  expect(said(edit((v) => Object.assign((v.lines as Json[])[0] as Json, { until: 60 })))).toEqual([
    `${file}: lines[0].until: A line must end after it starts.`,
  ]))

test('an ease that does not exist, and a zoom out of range', () => {
  expect(said(edit((v) => Object.assign((v.camera as Json[])[0] as Json, { ease: 'bounce' })))).toEqual([
    `${file}: camera[0].ease: This must be one of: cut, linear, smooth.`,
  ])
  expect(said(edit((v) => Object.assign((v.camera as Json[])[0] as Json, { zoom: 0.1 })))).toEqual([
    `${file}: camera[0].zoom: This must be 0.25 or more.`,
  ])
})

test('a missing field says what to write', () =>
  expect(said(edit((v) => delete (v.camera as Json[])[0]?.zoom))).toEqual([
    `${file}: camera[0].zoom: This is missing. Write how close the camera is, like 1.`,
  ]))

test('an unknown key', () =>
  expect(said({ ...intro(), music: 'meadow' })).toEqual([
    `${file}: music: This is not something a cutscene has. Remove it or check the spelling.`,
  ]))

test('an actor may name a clip, written right after its place and before which way it faces', () => {
  const scene = edit((v) => Object.assign((v.actors as Json[])[0] as Json, { clip: 'talk', face: 'left' }))
  expect(said(scene)).toEqual([])
  const keys = Object.keys(
    (JSON.parse(writeContent('cutscene', scene as never)).actors as Json[])[0] as Json,
  )
  expect(keys.slice(0, 6)).toEqual(['at', 'who', 'x', 'y', 'clip', 'face'])
})

const inGame = (scene: unknown, replace: Record<string, string | undefined> = {}) =>
  storyGame(
    [
      { type: 'messages', path: 'content/messages/en.json', text: writeContent('messages', english()) },
      { type: 'cutscene', path: file, text: writeContent('cutscene', scene as never) },
    ],
    replace,
  )

test('a cutscene whose level, actors and words are all in the game loads', async () =>
  expect(await gameProblems(inGame(intro()))).toEqual([]))

test('a cutscene staged in a level the game does not have', async () =>
  expect(await gameProblems(inGame({ ...intro(), level: 'level-9' }))).toEqual([
    `${file}: level: There is no level called "level-9". This game has: level-1.`,
  ]))

test('an actor who is not in the level, and a player the level has no start for', async () => {
  const scene = edit((v) => {
    Object.assign((v.actors as Json[])[0] as Json, { who: 'crate-9' })
    ;(v.actors as Json[]).push({ at: 90, who: 'player-2', x: 3, y: 7 })
  })
  expect(await gameProblems(inGame(scene))).toEqual([
    `${file}: actors[0].who: There is nothing called "crate-9" in the level "level-1". It has: crate-1, keeper, player-1.`,
    `${file}: actors[2].who: There is nothing called "player-2" in the level "level-1". It has: crate-1, keeper, player-1.`,
  ])
})

test('the heroes of the level’s starts are in the level', async () => {
  const scene = edit((v) => {
    ;(v.actors as Json[]).push({ at: 90, who: 'player-1', x: 3, y: 7 })
  })
  expect(await gameProblems(inGame(scene))).toEqual([])
})

test('a camera or an actor outside the level', async () => {
  const scene = edit((v) => {
    Object.assign((v.camera as Json[])[0] as Json, { x: 20 })
    Object.assign((v.actors as Json[])[0] as Json, { y: 12 })
  })
  expect(await gameProblems(inGame(scene))).toEqual([
    `${file}: camera[0].x: 20 is outside the level, which is 16 tiles wide.`,
    `${file}: actors[0].y: 12 is outside the level, which is 9 tiles tall.`,
  ])
})

test('a line English does not have, and a speaker who is not a character', async () => {
  const scene = edit((v) => {
    Object.assign((v.lines as Json[])[0] as Json, { line: 'keeper.helo', speaker: 'keper' })
  })
  expect(await gameProblems(inGame(scene))).toEqual([
    `${file}: lines[0].line: English has no message called "keeper.helo". Add it to the English file or fix the spelling.`,
    `${file}: lines[0].speaker: There is no character called "keper". This game has: crate, hero, keeper.`,
  ])
})

const withClip = (clip: string, who = 'keeper') =>
  edit((v) => Object.assign((v.actors as Json[])[0] as Json, { who, clip }))
const inArt = (scene: unknown) =>
  artGame([
    { type: 'messages', path: 'content/messages/en.json', text: writeContent('messages', english()) },
    { type: 'cutscene', path: file, text: writeContent('cutscene', scene as never) },
  ])

test('an actor whose character has the clip loads', async () =>
  expect(await gameProblems(inArt(withClip('talk')))).toEqual([]))

test('an actor whose character has no such clip', async () =>
  expect(await gameProblems(inArt(withClip('dance')))).toEqual([
    `${file}: actors[0].clip: The character "keeper" has no clip called "dance". It has: idle, talk.`,
  ]))

test('a player’s actor is the hero of the game, so its clips are the hero’s', async () => {
  expect(await gameProblems(inArt(withClip('run', 'player-1')))).toEqual([])
  expect(await gameProblems(inArt(withClip('talk', 'player-1')))).toEqual([
    `${file}: actors[0].clip: The character "hero" has no clip called "talk". It has: fall, idle, jump, land, push, run.`,
  ])
})

test('a character with no clips cannot play one', async () =>
  expect(await gameProblems(inGame(withClip('talk')))).toEqual([
    `${file}: actors[0].clip: The character "keeper" has no clips, so it cannot play "talk". Give it clips, or remove "clip".`,
  ]))
