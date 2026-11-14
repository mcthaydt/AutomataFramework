// Plan P's proof, end to end: a game of ropes, a seesaw, a spark and a door, played by a hero, ends on one hash in
// Node, Chromium, WebKit and Firefox.
import { afterEach, expect, test } from 'vitest'
import { createRecorder, type Replay, verifyReplay } from '#src/features/commands/commands.ts'
import { createGameSim, Thing } from '#src/features/level/level.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { expectGolden, expectRecorded } from '../../fixtures/golden.ts'
import { loadPlayground } from '../../fixtures/playground/game.ts'
import { playgroundPlugin, Score } from '../../fixtures/playground/plugin.ts'
import { playgroundFiles } from '../../fixtures/playground/read.ts'
import { PLAYGROUND_TICKS, playgroundScript } from '../../fixtures/playground/script.ts'
import golden from '../../golden/playground.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})
async function fresh(overrides: Record<string, string | undefined> = {}, plugins = true): Promise<Sim> {
  const sim = await createGameSim({
    content: await loadPlayground(overrides),
    ...(plugins ? { plugins: [heroPlugin, playgroundPlugin] } : {}),
  })
  made.push(sim)
  return sim
}

const thing = (sim: Sim, id: string) => sim.query(Thing).find((e) => e.get(Thing).id === id)

/** The platform hangs on two ropes from the level: where each rope's top is tied, and where it is tied to the platform. */
const ROPES = [
  { top: { x: 7.6, y: 2 }, end: { x: -1.5, y: 0 }, length: Math.hypot(0.1, 4) },
  { top: { x: 10.4, y: 2 }, end: { x: 1.5, y: 0 }, length: Math.hypot(0.1, 4) },
]

interface Played {
  readonly sim: Sim
  readonly replay: Replay
  readonly touches: string[]
  /** The longest either rope was, at any tick, from where it is tied to the platform to where it hangs from. */
  readonly longestRope: number
  readonly longestSwing: number
  readonly ropeLength: number
}

/** Plays the script on a new playground, recording it, and watching what the test asserts on at every tick. */
async function play(): Promise<Played> {
  const sim = await fresh()
  const recorder = createRecorder(sim)
  const touches: string[] = []
  const platform = thing(sim, 'platform-1')
  const start = platform?.get(Transform)
  let longestRope = 0
  let longestSwing = 0
  for (let t = 0; t < PLAYGROUND_TICKS; t++) {
    for (const e of recorder.step(playgroundScript(sim.tick)).events)
      if (/^(spark|door)\./.test(e.type)) touches.push(e.type)
    const pose = platform?.get(Transform)
    if (pose === undefined || start === undefined) continue
    const cos = Math.cos(pose.rotation)
    const sin = Math.sin(pose.rotation)
    for (const rope of ROPES) {
      const x = pose.x + rope.end.x * cos - rope.end.y * sin
      const y = pose.y + rope.end.x * sin + rope.end.y * cos
      longestRope = Math.max(longestRope, Math.hypot(x - rope.top.x, y - rope.top.y))
    }
    longestSwing = Math.max(longestSwing, Math.hypot(pose.x - start.x, pose.y - start.y))
  }
  return {
    sim,
    replay: recorder.replay(),
    touches,
    longestRope,
    longestSwing,
    ropeLength: ROPES[0]?.length ?? 0,
  }
}

test('the playground plays as its level says, and matches its golden', async () => {
  const played = await play()
  expect(played.touches).toEqual(['spark.touched', 'spark.taken', 'door.touched', 'door.left'])
  expect(played.sim.resource(Score)).toEqual({ sparks: 1, inDoor: false })
  expect(thing(played.sim, 'spark-1')).toBeUndefined()
  // the seesaw tipped right: the crate fell on its right end
  expect(thing(played.sim, 'plank-1')?.get(Transform).rotation).toBeGreaterThan(0.1)
  // the swing swung, and neither rope was ever longer than it is
  expect(played.longestSwing).toBeGreaterThan(0.05)
  expect(played.longestRope).toBeLessThanOrEqual(played.ropeLength + 0.02)
  const { replay } = played
  expectGolden({ ticks: replay.ticks, finalHash: replay.finalHash, checks: replay.checks }, golden)
})

test('the recorded replay verifies on a fresh playground', async () => {
  const { replay } = await play()
  expect(verifyReplay(await fresh(), replay)).toEqual({ ok: true })
})

test('restored while the hero stands in the door, the run ends the same', async () => {
  const { sim: whole } = await play()
  // Find the first tick after the door is touched, on a run of its own.
  const probe = await fresh()
  let at = -1
  for (let t = 0; t < PLAYGROUND_TICKS && at < 0; t++) {
    const events = probe.step(playgroundScript(probe.tick)).events
    if (events.some((e) => e.type === 'door.touched')) at = probe.tick
  }
  expect(at).toBeGreaterThan(0)
  const bytes = probe.snapshot()
  const second = await fresh()
  second.restore(bytes)
  expect(second.resource(Score).inDoor).toBe(true)
  const said: string[] = []
  while (second.tick < PLAYGROUND_TICKS)
    for (const e of second.step(playgroundScript(second.tick)).events)
      if (/^(spark|door)\./.test(e.type)) said.push(e.type)
  expect(said).toEqual(['door.left'])
  expect(second.hash()).toBe(whole.hash())
})

test('moving the spark in the level file is "the content changed"', async () => {
  const { replay } = await play()
  const level = JSON.parse(playgroundFiles['content/levels/playground.json'] ?? '') as {
    things: { id: string; x: number }[]
  }
  const spark = level.things.find((t) => t.id === 'spark-1')
  if (spark === undefined) throw new Error('the playground has no spark-1')
  spark.x = 5.5
  const changed = await fresh({ 'content/levels/playground.json': JSON.stringify(level) })
  const verdict = verifyReplay(changed, replay)
  expect(verdict.ok).toBe(false)
  if (!verdict.ok) expect(verdict.reason).toBe('content-changed')
})

test('sixty idle ticks with only the framework plugins end on the recorded hash', async () => {
  // No game code: this is the run tests/install/smoke.mjs repeats on the packed package.
  const sim = await fresh({}, false)
  for (let i = 0; i < 60; i++) sim.step([])
  expectRecorded('idleHash60', sim.hash(), (golden as { idleHash60?: string }).idleHash60)
})
