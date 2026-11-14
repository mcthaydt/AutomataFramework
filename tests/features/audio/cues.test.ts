import { expect, test } from 'vitest'
import { cueTable } from '#src/features/audio/cues.ts'
import { contentWithCues, loadFull } from '../../fixtures/audio/content.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'

test("the full game's table answers hero.jumped, hero.landed and level.started", async () => {
  const table = cueTable(await loadFull(), 60)
  expect([...table.keys()].sort()).toEqual(['hero.jumped', 'hero.landed', 'level.started'])
  expect(table.get('hero.jumped')).toMatchObject([{ do: 'sound', sound: { id: 'jump' } }])
  expect(table.get('level.started')).toMatchObject([{ do: 'music', music: { id: 'meadow' } }])
})

test('jump lasts 9 ticks at 60 Hz and 5 at 30', async () => {
  const content = await loadFull()
  expect(cueTable(content, 60).get('hero.jumped')).toMatchObject([{ ticks: 9 }])
  expect(cueTable(content, 30).get('hero.jumped')).toMatchObject([{ ticks: 5 }])
  expect(cueTable(content, 60).get('hero.landed')).toMatchObject([{ ticks: 8 }])
})

test('two cue lists are joined in id order, each list in its own order', async () => {
  const full = await contentWithCues([])
  const cues = {
    b: { format: 1 as const, id: 'b', cues: [{ on: 'x', do: 'sound' as const, sound: 'land' }] },
    a: {
      format: 1 as const,
      id: 'a',
      cues: [
        { on: 'x', do: 'sound' as const, sound: 'jump' },
        { on: 'x', do: 'music' as const, music: 'meadow' },
      ],
    },
  }
  const table = cueTable({ ...full, cues }, 60)
  expect(table.get('x')).toMatchObject([
    { do: 'sound', sound: { id: 'jump' } },
    { do: 'music', music: { id: 'meadow' } },
    { do: 'sound', sound: { id: 'land' } },
  ])
})

test('a cue naming a sound the content lacks throws the sentence above', async () => {
  const content = await contentWithCues([{ on: 'hero.jumped', do: 'sound', sound: 'nope' }])
  expect(() => cueTable(content, 60)).toThrow(
    'The cue for "hero.jumped" names a sound called "nope", which this game does not have.',
  )
})

test('a cue naming a track the content lacks throws the sentence above', async () => {
  const content = await contentWithCues([{ on: 'level.started', do: 'music', music: 'nope' }])
  expect(() => cueTable(content, 60)).toThrow(
    'The cue for "level.started" names a track called "nope", which this game does not have.',
  )
})

test('a game with no cue list has an empty table', async () => {
  expect(cueTable(await loadFixtureGame(), 60).size).toBe(0)
})
