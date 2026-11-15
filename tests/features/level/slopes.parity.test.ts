// The hero the framework moves, on the meadow's slopes and ledge, in Node and in every browser: it stands still on a slope,
// walks up and down one without leaving it, jumps from one and up through a ledge. y points down.
import { afterEach, expect, test } from 'vitest'
import { controlsCommand, Player } from '#src/features/commands/commands.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { Body, Ground, Touching, Transform } from '#src/features/physics/physics.ts'
import type { Command, Sim } from '#src/features/sim/sim.ts'
import { expectGolden, runGolden } from '../../fixtures/golden.ts'
import { loadSceneMovesGame, type Start } from '../../fixtures/scene-game/moves.ts'
import golden from '../../golden/slopes.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** The meadow: its 3-tile slope rises to the right from (2, 9) to (5, 6), and the ground beyond it is flat at y = 6. */
const SLOPE_TOP = { x: 5, y: 6 }
/** The ledge's top, over the flat ground. */
const LEDGE_TOP = 4

interface Pose {
  x: number
  y: number
  below: boolean
  /** The hero's speed and the ground's normal it was last told, for a failure's message. */
  said: string
}

async function hero(start: Start): Promise<{ sim: Sim; at: () => Pose; trace: string[] }> {
  const sim = await createGameSim({ content: await loadSceneMovesGame(start) })
  made.push(sim)
  const player = sim.query(Player).find((e) => e.get(Player).number === 1)
  if (player === undefined) throw new Error('the scene moves game has no hero')
  const trace: string[] = []
  const at = (): Pose => {
    const { x, y } = player.get(Transform)
    const { vx, vy } = player.get(Body)
    const { nx, ny } = player.get(Ground)
    const below = player.get(Touching).below
    const f = (n: number): string => n.toFixed(2)
    const said = `${f(x)},${f(y)} v ${f(vx)},${f(vy)} n ${f(nx)},${f(ny)} ${below ? 'ground' : 'air'}`
    if (sim.tick % 6 === 0 || (sim.tick >= 46 && sim.tick <= 66)) trace.push(`t${sim.tick} ${said}`)
    return { x, y, below, said }
  }
  return { sim, at, trace }
}
const hold = (tick: number, held: string[]): Command => controlsCommand(tick, 1, tick, held)

test('the hero is told the slope it stands on, and flat ground is flat', async () => {
  const { sim } = await hero({ x: 3.2, y: 6.5 })
  const player = sim.query(Player)[0]
  for (let i = 0; i < 90; i++) sim.step([])
  // A slope that rises to the right has a normal that leans left, 45 degrees, up.
  expect(player?.get(Ground).nx).toBeCloseTo(-Math.SQRT1_2, 2)
  expect(player?.get(Ground).ny).toBeCloseTo(-Math.SQRT1_2, 2)
})

test('left alone on the slope for 600 ticks, the hero moves less than 0.02 tiles', async () => {
  const { sim, at, trace } = await hero({ x: 3.2, y: 6.5 })
  for (let i = 0; i < 120; i++) {
    sim.step([]) // it settles
    at()
  }
  const settled = at()
  expect(settled.below).toBe(true)
  for (let i = 0; i < 600; i++) {
    sim.step([])
    at()
  }
  const now = at()
  expect(Math.hypot(now.x - settled.x, now.y - settled.y), trace.join('\n')).toBeLessThan(0.02)
})

test('holding right from the floor, the hero reaches the slope’s top in under 90 ticks, on the ground all the way up', async () => {
  const { sim, at, trace } = await hero({ x: 1, y: 8.5 })
  for (let i = 0; i < 20; i++) {
    sim.step([])
    at()
  }
  let arrived = -1
  let climbing = false
  let lost = 0
  for (let t = 0; t < 90; t++) {
    sim.step(t === 0 ? [hold(sim.tick, ['right'])] : [])
    const { x, below } = at()
    if (x > 2.6) climbing = true
    // Over the crest the hero's climbing speed carries it a little way into the air, as a ramp's does; that is not a slip.
    if (climbing && x < SLOPE_TOP.x - 0.5 && !below) lost++
    if (arrived < 0 && x >= SLOPE_TOP.x) arrived = t
  }
  expect(arrived, trace.join('\n')).toBeGreaterThanOrEqual(0)
  expect(arrived).toBeLessThan(90)
  expect(lost, trace.join('\n')).toBe(0)
  expect(Math.abs(at().y - (SLOPE_TOP.y - 0.5))).toBeLessThan(0.1)
})

test('holding left on the slope, the hero walks down it, on the ground all but a tick or two', async () => {
  // Walked off the plateau's edge the hero is in the air until it lands (it is a box with the game's gravity), as it
  // is off any ledge; this starts it on the slope, which is what a walk down one is.
  const { sim, at, trace } = await hero({ x: 4, y: 6 })
  for (let i = 0; i < 30; i++) {
    sim.step([])
    at()
  }
  let lost = 0
  let reached = false
  for (let t = 0; t < 120 && !reached; t++) {
    sim.step(t === 0 ? [hold(sim.tick, ['left'])] : [])
    const { x, below } = at()
    if (x < 3.6 && x > 2.6 && !below) lost++
    if (x < 1.8) reached = true
  }
  expect(reached, trace.join('\n')).toBe(true)
  expect(lost, trace.join('\n')).toBeLessThanOrEqual(2)
})

test('a jump from the slope goes up', async () => {
  const { sim, at } = await hero({ x: 3.2, y: 6.5 })
  for (let i = 0; i < 120; i++) sim.step([])
  const from = at()
  sim.step([hold(sim.tick, ['jump'])])
  for (let i = 0; i < 20; i++) sim.step([])
  expect(at().y).toBeLessThan(from.y - 1)
})

test('a jump from under the ledge goes up through it and lands on its top', async () => {
  const { sim, at, trace } = await hero({ x: 7.5, y: SLOPE_TOP.y - 0.5 })
  for (let i = 0; i < 20; i++) sim.step([])
  sim.step([hold(sim.tick, ['jump'])])
  at()
  let highest = Number.POSITIVE_INFINITY
  for (let i = 0; i < 240; i++) {
    sim.step([])
    highest = Math.min(highest, at().y)
  }
  // The jump is 2.4 tiles high, so its top is a little above where the hero stands on the ledge.
  expect(highest).toBeLessThan(LEDGE_TOP - 0.5)
  expect(Math.abs(at().y - (LEDGE_TOP - 0.5)), trace.join('\n')).toBeLessThan(0.05)
  expect(at().below).toBe(true)
})

/** A walk up the slope, over the top, a jump through the ledge, and back down. */
function walkScript(tick: number): Command[] {
  if (tick === 5) return [hold(tick, ['right'])]
  if (tick === 80) return [hold(tick, ['jump', 'right'])]
  if (tick === 90) return [hold(tick, ['left'])]
  if (tick === 200) return [hold(tick, [])]
  return []
}

test('the walk over the slope and back ends on its recorded hash', async () => {
  const { sim } = await hero({ x: 1, y: 8.5 })
  expectGolden(
    runGolden(sim, 360, (tick) => walkScript(tick)),
    golden,
  )
})

test('a hero dropped on the ledge from above stands on it', async () => {
  const { sim, at, trace } = await hero({ x: 7.5, y: 2 })
  for (let i = 0; i < 120; i++) {
    sim.step([])
    at()
  }
  expect(Math.abs(at().y - (LEDGE_TOP - 0.5)), trace.join('\n')).toBeLessThan(0.05)
  expect(at().below).toBe(true)
})
