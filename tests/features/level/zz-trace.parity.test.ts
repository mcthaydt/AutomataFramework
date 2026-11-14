// TEMPORARY: prints where the hero and the critter are through the story run, to place the fixture. Deleted before merge.
import { expect, test } from 'vitest'
import { Player } from '#src/features/commands/commands.ts'
import { createGameSim, Story, Thing } from '#src/features/level/level.ts'
import { Mind } from '#src/features/level/mind.ts'
import { Body, Transform } from '#src/features/physics/physics.ts'
import { loadStory, storyPlugins } from '../../fixtures/story/game.ts'
import { STORY_TICKS, storyScript } from '../../fixtures/story/script.ts'

test('trace', async () => {
  const sim = await createGameSim({ content: await loadStory(), plugins: storyPlugins })
  const lines: string[] = []
  for (let t = 0; t < STORY_TICKS; t++) {
    sim.step(storyScript(sim.tick))
    if (t % 15 !== 0) continue
    const hero = sim.query(Player, Transform, Body)[0]
    const critter = sim.query(Mind, Thing, Transform).find((e) => e.get(Thing).id === 'critter-1')
    const story = sim.resource(Story)
    lines.push(
      `${t} hero ${hero?.get(Transform).x.toFixed(2)},${hero?.get(Transform).y.toFixed(2)} vy ${hero?.get(Body).vy.toFixed(2)} critter ${critter?.get(Transform).x.toFixed(2)} ${critter?.get(Mind).rule} talk ${story.talk !== null} scene ${story.scene?.cutscene ?? '-'}`,
    )
  }
  sim.dispose()
  expect(lines.join('\n')).toBe('')
})
