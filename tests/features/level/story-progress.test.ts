// What a save keeps of a story, and a game that continues from it: the story game saves its progress with the saves
// feature, loads it, and starts again without the opening it has already seen.
import { afterEach, expect, test } from 'vitest'
import { createGameSim, Story, StoryProgressSchema } from '#src/features/level/level.ts'
import { storyProgress } from '#src/features/level/story-read.ts'
import { createSaves, defineSave, memoryStore } from '#src/features/saves/saves.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { z } from '#src/lib/zod.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { storyEventsOf } from '../../fixtures/level/story-helpers.ts'
import { loadStory, storyPlugins } from '../../fixtures/story/game.ts'
import { STORY_TICKS, storyScript } from '../../fixtures/story/script.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

const storySave = defineSave({
  game: 'story-game',
  version: 1,
  slots: 1,
  schema: z.strictObject({ story: StoryProgressSchema }),
})

test('a game saves its story and continues without the opening', async () => {
  const content = await loadStory()
  const played = await createGameSim({ content, plugins: storyPlugins })
  made.push(played)
  while (played.tick < STORY_TICKS) played.step(storyScript(played.tick))

  const saves = createSaves({ def: storySave, store: memoryStore(), now: () => 1700000000000 })
  expect(await saves.save(0, { story: storyProgress(played, content) })).toEqual({ ok: true })
  const loaded = await saves.load(0)
  if (!loaded.ok || loaded.data === null) throw new Error('the save did not load')

  const again = await createGameSim({ content, plugins: storyPlugins, story: loaded.data.story })
  made.push(again)
  expect(storyEventsOf(again.step([])).map((e) => e.type)).toEqual([])
  expect(again.resource(Story).ended).toEqual({ keeper: 'tip' })
  expect(again.resource(Story).seen).toEqual(['glade-intro', 'glade-tip'])
})

test('a game with no story has empty progress', async () => {
  const content = await loadFixtureGame()
  const sim = await createGameSim({ content })
  made.push(sim)
  expect(storyProgress(sim, content)).toEqual({ ended: {}, seen: [] })
})

test('progress that names what the game no longer has is kept and harmless', async () => {
  const content = await loadStory()
  const sim = await createGameSim({
    content,
    plugins: storyPlugins,
    story: { ended: { gone: 'nowhere' }, seen: ['gone', 'glade-intro'] },
  })
  made.push(sim)
  expect(storyEventsOf(sim.step([])).map((e) => e.type)).toEqual([])
  expect(storyProgress(sim, content)).toEqual({ ended: { gone: 'nowhere' }, seen: ['glade-intro', 'gone'] })
})
