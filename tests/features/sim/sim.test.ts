// Lifted from AutomataFrameworkFailed@ed8592e8: packages/sim/tests/unit/shared/world/sim.test.ts
import { afterEach, expect, test } from 'vitest'
import { z } from 'zod'
import { type Command, createSim, type Sim } from '#src/features/sim/create-sim.ts'
import {
  defineCommand,
  defineComponent,
  defineEvent,
  definePlugin,
  defineResource,
  defineSystem,
} from '#src/features/sim/definitions.ts'
import { canonicalJson, utf8 } from '#src/lib/canonical.ts'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'

const Position = defineComponent('position', { x: 'f32', y: 'f32' })
const Velocity = defineComponent('velocity', { x: 'f32', y: 'f32' }, { render: false })
const Move = defineCommand('move', z.object({ sid: z.number().int(), x: z.number(), y: z.number() }))
const Moved = defineEvent('moved', z.object({ sid: z.number() }))
const Score = defineResource('score', z.object({ value: z.number() }), () => ({ value: 0 }))

const physicsLike = defineSystem({
  name: 'integrate',
  phase: 'gameplay',
  run(ctx) {
    for (const e of ctx.query(Position, Velocity)) {
      const p = e.get(Position)
      const v = e.get(Velocity)
      e.set(Position, { x: p.x + v.x * ctx.dt, y: p.y + v.y * ctx.dt })
    }
  },
})
const applyMoves = defineSystem({
  name: 'apply-moves',
  phase: 'input',
  after: ['commands.apply'],
  run(ctx) {
    for (const c of ctx.commands.of(Move)) {
      ctx.entity(c.payload.sid)?.set(Velocity, { x: c.payload.x, y: c.payload.y })
      ctx.emit(Moved, { sid: c.payload.sid })
      ctx.resource(Score).value += 1
    }
  },
})
const game = definePlugin({
  name: 'game',
  components: [Position, Velocity],
  commands: [Move],
  events: [Moved],
  resources: [Score],
  systems: [physicsLike, applyMoves],
})

const sims: Sim[] = []
async function make(opts: Partial<Parameters<typeof createSim>[0]> = {}) {
  const sim = await createSim({ seed: 1, plugins: [game], ...opts })
  sims.push(sim)
  return sim
}
afterEach(() => {
  for (const s of sims.splice(0)) s.dispose()
})

const cmd = (tick: number, seq: number, payload: unknown, source = 0): Command => ({
  tick,
  source,
  seq,
  type: 'move',
  payload,
})

test('step advances the tick at a fixed dt and runs systems', async () => {
  const sim = await make({ tickHz: 50 })
  const sid = sim.spawn([
    [Position, { x: 0 }],
    [Velocity, { x: 50 }],
  ])
  expect(sim.tick).toBe(0)
  const r = sim.step([])
  expect(r.tick).toBe(1)
  expect(sim.tick).toBe(1)
  expect(sim.entity(sid)?.get(Position).x).toBe(1) // 50 units/s * 1/50 s
})

test('commands are validated, sorted by (source, seq), and only those for the current tick are applied', async () => {
  const sim = await make()
  const a = sim.spawn([Position, Velocity])
  const b = sim.spawn([Position, Velocity])
  const r = sim.step([
    cmd(0, 2, { sid: b, x: 2, y: 0 }),
    cmd(0, 1, { sid: a, x: 1, y: 0 }, 1),
    cmd(0, 1, { sid: a, x: 3, y: 0 }),
    cmd(5, 1, { sid: a, x: 9, y: 0 }), // wrong tick
    cmd(0, 3, { sid: 'x' }), // invalid payload
    { tick: 0, source: 0, seq: 4, type: 'teleport', payload: {} }, // unknown type
  ])
  // (source 0, seq 1) a->3, (0, 2) b->2, then (1, 1) a->1
  expect(r.events.map((e) => e.payload)).toEqual([{ sid: a }, { sid: b }, { sid: a }])
  expect(sim.entity(a)?.get(Velocity).x).toBe(1)
  expect(sim.resource(Score).value).toBe(3)
  expect(r.rejected.map((x) => x.reason)).toEqual(['wrong-tick', 'invalid-payload', 'unknown-command'])
})

test('null and non-object entries in the command list are rejected as bad-header, not thrown', async () => {
  const sim = await make()
  const a = sim.spawn([Position, Velocity])
  const r = sim.step([null as never, 5 as never, cmd(0, 1, { sid: a, x: 4, y: 0 })])
  expect(r.rejected.map((x) => x.reason)).toEqual(['bad-header', 'bad-header'])
  expect(sim.entity(a)?.get(Velocity).x).toBe(4)
  expect(sim.resource(Score).value).toBe(1)
})

test('emit validates event payloads with the event schema', async () => {
  const Bad = defineSystem({
    name: 'bad-emit',
    phase: 'gameplay',
    run: (ctx) => ctx.emit(Moved, { sid: 'nope' } as never),
  })
  const sim = await make({ plugins: [game, definePlugin({ name: 'bad', systems: [Bad] })] })
  expect(() => sim.step([])).toThrow(/event "moved"/)
})

test('despawn inside a system is deferred to the end of the tick', async () => {
  const seen: number[] = []
  const Killer = defineSystem({
    name: 'killer',
    phase: 'gameplay',
    run(ctx) {
      for (const e of ctx.query(Position)) ctx.despawn(e.sid)
      seen.push(ctx.query(Position).length) // still visible this tick
    },
  })
  const sim = await make({ plugins: [game, definePlugin({ name: 'k', systems: [Killer] })] })
  sim.spawn([Position])
  sim.spawn([Position])
  sim.step([])
  expect(seen).toEqual([2])
  expect(sim.query(Position)).toEqual([])
})

test("each system gets its own RNG substream: adding a system does not shift another system's draws", async () => {
  const draws = (extra: boolean) => {
    const out: number[] = []
    const Roll = defineSystem({
      name: 'roll',
      phase: 'gameplay',
      run: (ctx) => void out.push(ctx.rng.nextU32()),
    })
    const Noise = defineSystem({ name: 'noise', phase: 'gameplay', run: (ctx) => void ctx.rng.nextU32() })
    return { out, plugin: definePlugin({ name: 'r', systems: extra ? [Roll, Noise] : [Roll] }) }
  }
  const a = draws(false)
  const b = draws(true)
  const simA = await make({ plugins: [a.plugin] })
  const simB = await make({ plugins: [b.plugin] })
  for (let i = 0; i < 5; i++) {
    simA.step([])
    simB.step([])
  }
  expect(b.out).toEqual(a.out)
})

test('content is deep-frozen; systems cannot write it', async () => {
  let threw = false
  const Writer = defineSystem({
    name: 'writer',
    phase: 'gameplay',
    run(ctx) {
      try {
        ;(ctx.content as { tuning: { g: number } }).tuning.g = 1
      } catch {
        threw = true
      }
    },
  })
  const sim = await make({
    plugins: [definePlugin({ name: 'w', systems: [Writer] })],
    content: { tuning: { g: 9.81 } },
  })
  sim.step([])
  expect(threw).toBe(true)
})

test('registration errors: duplicate component ids across plugins, unknown systems', async () => {
  const dup = definePlugin({ name: 'dup', components: [defineComponent('position', { z: 'f32' })] })
  await expect(createSim({ seed: 1, plugins: [game, dup] })).rejects.toThrow(/duplicate component "position"/)
})

test('step returns the render delta (resync on the first step, then incremental)', async () => {
  const sim = await make()
  const sid = sim.spawn([Position, [Velocity, { x: 60 }]])
  const first = sim.step([])
  expect(first.render.resync).toBe(true)
  expect(first.render.added.map((r) => r.sid)).toEqual([sid])
  const second = sim.step([])
  expect(second.render.resync).toBe(false)
  expect(second.render.changed).toEqual([{ sid, components: { position: { x: 2, y: 0 } } }])
})

test('an input system without an explicit `after` still runs after commands.apply', async () => {
  const seen: unknown[] = []
  const Reader = defineSystem({
    // Name sorts before 'commands.apply', so only the implicit wiring makes it see this tick's commands.
    name: 'a-reader',
    phase: 'input',
    // NO after/before; relies on implicit wiring
    run(ctx) {
      for (const c of ctx.commands.of(Move)) {
        seen.push(c.payload)
      }
    },
  })
  const testPlugin = definePlugin({
    name: 'test-reader',
    components: [Position, Velocity],
    commands: [Move],
    systems: [Reader],
  })
  const sim = await createSim({ seed: 1, plugins: [testPlugin] })
  sims.push(sim)
  sim.spawn([Position, Velocity])
  const result = sim.step([cmd(0, 1, { sid: 0, x: 5, y: 0 })])
  expect(seen).toEqual([{ sid: 0, x: 5, y: 0 }])
  expect(result.tick).toBe(1)
})

test('cleanup systems run before entities.flush; a deferred despawn shows in render.removed on the same step', async () => {
  const cleanupSeen: number[] = []
  let shouldDespawn = false
  const Despawner = defineSystem({
    name: 'despawner',
    phase: 'gameplay',
    run(ctx) {
      if (shouldDespawn) {
        for (const e of ctx.query(Position)) {
          ctx.despawn(e.sid)
        }
      }
    },
  })
  const CleanupObserver = defineSystem({
    // Name must come after 'entities.flush' alphabetically to test the wiring.
    // Without wiring (before: ['entities.flush']), name-based ordering would put
    // this after entities.flush, causing it to see 0 entities.
    name: 'z-cleanup-observer',
    phase: 'cleanup',
    // NO before/after; relies on implicit wiring to run before entities.flush
    run(ctx) {
      cleanupSeen.push(ctx.query(Position).length)
    },
  })
  const testPlugin = definePlugin({
    name: 'test-cleanup',
    components: [Position],
    systems: [Despawner, CleanupObserver],
  })
  const sim = await createSim({ seed: 1, plugins: [testPlugin] })
  sims.push(sim)
  const sid = sim.spawn([Position])
  // First step: render the entity (resync, adds to rendered set)
  sim.step([])
  // Second step: entity will be in rendered set; despawn it and observe in cleanup
  cleanupSeen.length = 0
  shouldDespawn = true
  const result = sim.step([])
  // cleanup observer saw the entity before flush removed it
  expect(cleanupSeen).toEqual([1])
  // and render delta reports it as removed
  expect(result.render.removed).toEqual([sid])
})

test('contentHash is XXH64 of the canonical content, the value the snapshot header carries (M2.2)', async () => {
  const content = { tuning: { g: 9.81 }, rooms: { 'room-1': { rows: ['#.#'] } } }
  const sim = await make({ content })
  expect(sim.contentHash).toMatch(/^[0-9a-f]{16}$/)
  expect(sim.contentHash).toBe(hex64(xxhash64(utf8(canonicalJson(content)))))
  const bytes = sim.snapshot()
  // Bytes 14..21 are the header's contentHash (after "AUTO", the version and the schema hash), little-endian.
  expect(hex64(new DataView(bytes.buffer, bytes.byteOffset).getBigUint64(14, true))).toBe(sim.contentHash)
  sim.step([])
  sim.restore(bytes)
  expect(sim.contentHash).toBe(hex64(xxhash64(utf8(canonicalJson(content)))))
})
