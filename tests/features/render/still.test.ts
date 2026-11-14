// A level drawn still: where it fits in the room kept free of it, and the views and joints made from a level's own
// file. The views are held against the sim's own entities, so a thing is drawn exactly where the game would put it.
import { afterEach, expect, test } from 'vitest'
import { type GameContent, loadGame } from '#src/features/content/content.ts'
import { createGameSim, Look, Thing } from '#src/features/level/level.ts'
import { Joint, Transform } from '#src/features/physics/physics.ts'
import { fitInRoom, fitWorld, levelViews } from '#src/features/render/render.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { character, loadFixtureWith } from '../../fixtures/game/extra.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

async function fullGame(): Promise<GameContent> {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  return loaded.value
}

test('fitInRoom fits the level between the room kept on four sides', () => {
  const fit = fitInRoom({ w: 1180, h: 820 }, { top: 80, right: 320, bottom: 88, left: 96 }, { w: 16, h: 9 })
  expect(fit).toEqual({ scale: 47.75, left: 96, top: 80 + (652 - 9 * 47.75) / 2 })
})

test('no room is fitWorld, and a room as big as the box is scale 0, never NaN', () => {
  const none = { top: 0, right: 0, bottom: 0, left: 0 }
  expect(fitInRoom({ w: 800, h: 450 }, none, { w: 16, h: 9 })).toEqual(
    fitWorld({ w: 800, h: 450 }, { w: 16, h: 9 }),
  )
  expect(
    fitInRoom({ w: 300, h: 300 }, { top: 0, right: 200, bottom: 0, left: 200 }, { w: 16, h: 9 }),
  ).toEqual({
    scale: 0,
    left: 0,
    top: 0,
  })
  expect(fitInRoom({ w: 300, h: 300 }, { top: 400, right: 0, bottom: 0, left: 0 }, { w: 16, h: 9 })).toEqual({
    scale: 0,
    left: 0,
    top: 0,
  })
})

test('the views of the full game’s level are the things its sim has at tick 0', async () => {
  const content = await fullGame()
  const level = content.levels['level-1']
  if (level === undefined) throw new Error('the full game has no level-1')
  const sim = await createGameSim({ content, players: [1, 2] })
  made.push(sim)
  const drawn = (v: { x: number; y: number; w: number; h: number; color: number }): string =>
    `${v.x}|${v.y}|${v.w}|${v.h}|${v.color}`
  const wanted = sim.query(Transform, Look).map((e) => {
    const t = e.get(Transform)
    const l = e.get(Look)
    return drawn({ x: t.x, y: t.y, w: l.w, h: l.h, color: l.color })
  })
  const { views } = levelViews(content, level)
  expect(views.map(drawn).sort()).toEqual(wanted.sort())
  expect(views.every((v) => v.rotation === 0)).toBe(true)
})

test('a start point for each of two players is a hero view for that player', async () => {
  const content = await fullGame()
  const level = content.levels['level-1']
  if (level === undefined) throw new Error('the full game has no level-1')
  const heroes = levelViews(content, level).views.filter((v) => (v.sprite?.player ?? 0) > 0)
  expect(heroes.map((v) => v.sprite?.player)).toEqual([1, 2])
  expect(heroes.every((v) => v.sprite?.character === 'hero' && v.sprite.face === 1)).toBe(true)
})

test('a game with no figures has views with no sprite', async () => {
  const content = await loadFixtureWith({})
  const level = content.levels['level-1']
  if (level === undefined) throw new Error('the fixture has no level-1')
  expect(levelViews(content, level).views.some((v) => v.sprite !== undefined)).toBe(false)
})

test('a pin and a rope are links at their places, with the sim’s own sids', async () => {
  const plank = character('plank', { size: { w: 4, h: 0.25 } })
  const content = await loadFixtureWith({
    characters: { plank },
    level1: (l) => {
      l.things = [
        { id: 'crate-1', character: 'crate', x: 6.5, y: 2.5 },
        { id: 'plank-1', character: 'plank', x: 8, y: 6 },
      ]
      l.joints = [
        { id: 'seesaw', kind: 'pin', thing: 'plank-1', x: 8, y: 6 },
        {
          id: 'swing',
          kind: 'rope',
          thing: 'plank-1',
          holder: 'crate-1',
          from: { x: 7, y: 6 },
          to: { x: 7, y: 3 },
        },
      ]
    },
  })
  const level = content.levels['level-1']
  if (level === undefined) throw new Error('the fixture has no level-1')
  const { links, views } = levelViews(content, level)
  expect(links.map(({ kind, x1, y1 }) => ({ kind, x1, y1 }))).toEqual([
    { kind: 'pin', x1: 8, y1: 6 },
    { kind: 'rope', x1: 7, y1: 6 },
  ])
  expect(links[1]).toMatchObject({ x2: 7, y2: 3 })
  const sim = await createGameSim({ content })
  made.push(sim)
  expect(links.map((l) => l.sid)).toEqual(sim.query(Joint).map((e) => e.sid))
  const crate = sim.query(Thing).find((e) => e.get(Thing).id === 'crate-1')
  expect(views.find((v) => v.sid === crate?.sid)).toMatchObject({ x: 6.5, y: 2.5 })
})

test('what a level in the middle of an edit cannot draw is left out, and nothing throws', async () => {
  const content = await loadFixtureWith({})
  const level = content.levels['level-1']
  if (level === undefined) throw new Error('the fixture has no level-1')
  const edited = {
    ...level,
    things: [...level.things, { id: 'ghost-1', character: 'ghost', x: 3, y: 3 }],
    joints: [{ id: 'lost', kind: 'pin' as const, thing: 'ghost-1', x: 3, y: 3 }],
    tileset: 'nowhere',
  }
  const whole = levelViews(content, level)
  const drawn = levelViews(content, edited)
  expect(drawn.links).toEqual([])
  expect(drawn.views).toHaveLength(whole.views.length)
})
