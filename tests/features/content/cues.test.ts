import { expect, test } from 'vitest'
import { writeContent } from '#src/features/content/content.ts'
import { expectRoundTrip, gameFiles, gameProblems, problemsOf } from '../../fixtures/content/kind.ts'
import { fixtureFiles } from '../../fixtures/game/read.ts'

type Json = Record<string, unknown>
const cues = () => ({
  format: 1 as const,
  id: 'cues',
  cues: [
    { on: 'hero.jumped', do: 'sound', sound: 'jump' },
    { on: 'hero.landed', do: 'sound', sound: 'land' },
    { on: 'level.started', do: 'music', music: 'meadow' },
  ] as Json[],
})
const file = 'content/cues/cues.json'
const said = (value: unknown): string[] => problemsOf('cues', value, file)

test('a list of cues reads, and writes back to the same bytes twice', () => expectRoundTrip('cues', cues()))

test('two sounds for one event', () => {
  const c = cues()
  c.cues.push({ on: 'hero.jumped', do: 'sound', sound: 'land' })
  expect(said(c)).toEqual([
    `${file}: cues[3].on: "hero.jumped" already plays a sound here. Remove one of the two.`,
  ])
})

test('two changes to the music for one event', () => {
  const c = cues()
  c.cues.push({ on: 'level.started', do: 'stop-music' })
  expect(said(c)).toEqual([
    `${file}: cues[3].on: "level.started" already changes the music here. Remove one of the two.`,
  ])
})

test('a sound and the music for one event are fine', () => {
  const c = cues()
  c.cues.push({ on: 'level.started', do: 'sound', sound: 'jump' })
  expect(said(c)).toEqual([])
})

test('a thing to do that does not exist, and a field of another', () => {
  const c = cues()
  c.cues[0] = { on: 'hero.jumped', do: 'shout' }
  expect(said(c)).toEqual([`${file}: cues[0].do: This must be one of: sound, music, stop-music.`])
  const d = cues()
  d.cues[0] = { on: 'hero.jumped', do: 'sound', sound: 'jump', music: 'meadow' }
  expect(said(d)).toEqual([
    `${file}: cues[0].music: This is not something a cue list has. Remove it or check the spelling.`,
  ])
})

test('an event name that is not lower-case words', () => {
  const c = cues()
  c.cues[0] = { on: 'Hero Jumped', do: 'sound', sound: 'jump' }
  expect(said(c)).toEqual([`${file}: cues[0].on: Write the event's name, like "hero.landed".`])
})

test('a missing field says what to write', () => {
  const c = cues()
  c.cues[0] = { on: 'hero.jumped', do: 'sound' }
  expect(said(c)).toEqual([
    `${file}: cues[0].sound: This is missing. Write which sound to play, like "jump".`,
  ])
})

/** The fixture game with two sounds, a track and this list of cues. */
const sound = (id: string): string =>
  writeContent('sound', {
    format: 1,
    id,
    volume: 1,
    voices: [{ kind: 'tone', wave: 'sine', from: 220, to: 440, at: 0, length: 0.2, volume: 1 }],
  } as never)
const track = writeContent('music', {
  format: 1,
  id: 'meadow',
  tempo: 100,
  stepsPerBeat: 4,
  volume: 1,
  loop: true,
  parts: [{ id: 'lead', kind: 'tone', wave: 'sine', volume: 1, notes: ['C4 - E4 -'] }],
} as never)
const game = (list: unknown): Record<string, string | undefined> =>
  gameFiles(fixtureFiles, [
    { type: 'sound', path: 'content/sounds/jump.json', text: sound('jump') },
    { type: 'sound', path: 'content/sounds/land.json', text: sound('land') },
    { type: 'music', path: 'content/music/meadow.json', text: track },
    { type: 'cues', path: file, text: writeContent('cues', list as never) },
  ])

test('cues that name sounds and a track the game has load', async () =>
  expect(await gameProblems(game(cues()))).toEqual([]))

test('a cue that names a sound or a track the game does not have', async () => {
  const c = cues()
  c.cues[0] = { on: 'hero.jumped', do: 'sound', sound: 'jmp' }
  c.cues[2] = { on: 'level.started', do: 'music', music: 'meadow-2' }
  expect(await gameProblems(game(c))).toEqual([
    `${file}: cues[0].sound: There is no sound called "jmp". This game has: jump, land.`,
    `${file}: cues[2].music: There is no music called "meadow-2". This game has: meadow.`,
  ])
})
