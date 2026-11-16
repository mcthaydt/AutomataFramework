// Where a thing is drawn (F5) is the picture's business: the sim only carries it for the renderer, and nothing in the
// sim reads it, so the same things end in the same places with it or without it.
import { afterEach, expect, test } from 'vitest'
import { controlsCommand } from '#src/features/commands/commands.ts'
import { createGameSim, Draw, gameSimPlugins, Thing, usesDraw } from '#src/features/level/level.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { editLevel, loadLinksGame } from '../../fixtures/links-game/read.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** Room 1 with its crate drawn in front and its plate behind. */
const drawn = editLevel('room-1', (level) => {
  for (const thing of level.things as { id: string; draw?: string }[]) {
    if (thing.id === 'crate-1') thing.draw = 'in-front'
    if (thing.id === 'plate-1') thing.draw = 'behind'
  }
})

async function fresh(overrides: Record<string, string | undefined> = {}): Promise<Sim> {
  const sim = await createGameSim({ content: await loadLinksGame(overrides), level: 'room-1' })
  made.push(sim)
  return sim
}

const thing = (sim: Sim, id: string) => {
  const found = sim.query(Thing).find((e) => e.get(Thing).id === id)
  if (found === undefined) throw new Error(`no thing ${id}`)
  return found
}

/** Every entity's place by its id in the sim, after 300 ticks of the hero holding right. */
function placesAfter300(sim: Sim): Record<number, [number, number, number]> {
  for (let tick = 0; tick < 300; tick++) sim.step(tick === 0 ? [controlsCommand(tick, 1, 0, ['right'])] : [])
  return Object.fromEntries(
    sim.query(Transform).map((e) => {
      const t = e.get(Transform)
      return [e.sid, [t.x, t.y, t.rotation]]
    }),
  )
}

test('a thing drawn behind or in front carries where; a thing drawn with the hero carries nothing', async () => {
  const sim = await fresh(drawn)
  expect(thing(sim, 'crate-1').get(Draw).layer).toBe('in-front')
  expect(thing(sim, 'plate-1').get(Draw).layer).toBe('behind')
  expect(thing(sim, 'gate-1').has(Draw)).toBe(false)
})

test('a thing that says with-hero is the same as a thing that says nothing', async () => {
  const withHero = editLevel('room-1', (level) => {
    for (const t of level.things as { draw?: string }[]) t.draw = 'with-hero'
  })
  expect(usesDraw(await loadLinksGame(withHero))).toBe(false)
  const plain = await fresh()
  const said = await fresh(withHero)
  expect(said.hash()).toBe(plain.hash())
})

test('a game with nothing drawn behind or in front has no draw component', async () => {
  const names = (content: Awaited<ReturnType<typeof loadLinksGame>>) =>
    gameSimPlugins({ content, level: 'room-1' }).map((p) => p.name)
  expect(usesDraw(await loadLinksGame())).toBe(false)
  expect(names(await loadLinksGame())).not.toContain('draw')
  expect(usesDraw(await loadLinksGame(drawn))).toBe(true)
  expect(names(await loadLinksGame(drawn))).toContain('draw')
})

test('every entity is in the same place after 300 ticks with draw on a thing and without it', async () => {
  const without = placesAfter300(await fresh())
  const withDraw = placesAfter300(await fresh(drawn))
  expect(withDraw).toEqual(without)
  expect(Object.keys(without).length).toBeGreaterThan(5)
})

test('a level that sets draw hashes differently from one that does not', async () => {
  expect((await fresh(drawn)).hash()).not.toBe((await fresh()).hash())
})
