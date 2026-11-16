// What the renderer is given for a place, and the follower that moves it into the hero's level (plan W, task 10).
import { afterEach, expect, test } from 'vitest'
import { controlsCommand } from '#src/features/commands/commands.ts'
import { followLevel, stageOf } from '#src/features/game/stage-of.ts'
import { createGameSim, SKY_COLOR } from '#src/features/level/level.ts'
import type { Renderer } from '#src/features/render/render.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { editLevel, loadLinksGame } from '../../fixtures/links-game/read.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

test("stageOf: a level alone is its own size; room-2 and room-3 are one 32 by 9 world with each level's sky and view", async () => {
  const content = await loadLinksGame(
    editLevel('room-3', (level) => {
      level.sky = '#112233'
      level.view = { w: 12, h: 9 }
    }),
  )
  const alone = stageOf(content, 'room-1')
  expect(alone.world).toEqual({ w: 16, h: 9 })
  expect(alone.levels).toEqual([
    { level: 'room-1', x: 0, y: 0, w: 16, h: 9, sky: SKY_COLOR, view: undefined },
  ])
  const place = stageOf(content, 'room-2')
  expect(place.world).toEqual({ w: 32, h: 9 })
  expect(place.levels.map((l) => [l.level, l.x, l.sky, l.view])).toEqual([
    ['room-2', 0, SKY_COLOR, undefined],
    ['room-3', 16, 0x112233, { w: 12, h: 9 }],
  ])
  expect(place.simLevels).toEqual(place.levels.map(({ level, x, y, w, h }) => ({ level, x, y, w, h })))
})

test('followLevel enters the level of the lowest-numbered hero when it changes, and only then', async () => {
  const content = await loadLinksGame(
    editLevel('room-2', (level) => {
      level.things = []
      level.starts[0] = { player: 1, x: 12, y: 7.5 }
    }),
  )
  const sim = await createGameSim({ content, level: 'room-2' })
  made.push(sim)
  const entered: string[] = []
  const follow = followLevel(
    { enter: (level: string) => entered.push(level) } as unknown as Renderer,
    sim,
    'room-2',
    stageOf(content, 'room-2').levels,
  )
  let seq = 0
  for (let i = 0; i < 150; i++) {
    sim.step(i === 0 ? [controlsCommand(0, 1, seq++, ['right'])] : [])
    follow()
  }
  expect(entered).toEqual(['room-3'])
})

test('followLevel does nothing for a level alone', async () => {
  const content = await loadLinksGame()
  const sim = await createGameSim({ content, level: 'room-1' })
  made.push(sim)
  const follow = followLevel(
    { enter: () => expect.unreachable() } as unknown as Renderer,
    sim,
    'room-1',
    stageOf(content, 'room-1').levels,
  )
  sim.step([controlsCommand(0, 1, 0, ['right'])])
  follow()
})
