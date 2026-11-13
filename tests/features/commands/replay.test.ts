import { afterEach, expect, test } from 'vitest'
import {
  createRecorder,
  parseReplay,
  playReplay,
  type Replay,
  ReplayFormatError,
  verifyReplay,
  writeReplay,
} from '#src/features/commands/commands.ts'
import { createRng, createSim, deriveSeed, type Sim } from '#src/features/sim/sim.ts'
import { bouncePlugin } from '../../fixtures/bounce/bounce.plugin.ts'
import { BOUNCE_SEED, BOUNCE_TICKS, bounceScript, bounceSetup } from '../../fixtures/bounce/bounce-script.ts'

// Every sim is disposed: Koota allows only 16 live worlds per process.
const sims: Sim[] = []
afterEach(() => {
  for (const sim of sims.splice(0)) sim.dispose()
})

async function bounceSim(options: { seed?: number; content?: unknown } = {}): Promise<Sim> {
  const sim = await createSim({
    seed: options.seed ?? BOUNCE_SEED,
    plugins: [bouncePlugin],
    content: options.content ?? { level: 'bounce' },
  })
  sims.push(sim)
  bounceSetup(sim)
  return sim
}

/** Records the bounce run for `ticks` ticks, taking a replay at each of `takeAt` on the way. */
async function record(ticks = BOUNCE_TICKS, takeAt: readonly number[] = []) {
  const sim = await bounceSim()
  const recorder = createRecorder(sim, { meta: { game: 'bounce' } })
  const rng = createRng(deriveSeed(BOUNCE_SEED, 'golden-script'))
  const taken = new Map<number, Replay>()
  for (let t = 0; t < ticks; t++) {
    recorder.step(bounceScript(sim.tick, rng))
    if (takeAt.includes(sim.tick)) taken.set(sim.tick, recorder.replay())
  }
  return { replay: recorder.replay(), taken }
}

test('a recorded run verifies on a fresh sim', async () => {
  const { replay } = await record()
  expect(replay.ticks).toBe(BOUNCE_TICKS)
  expect(replay.commands.length).toBeGreaterThan(5)
  expect(replay.checks.map((c) => c.tick)).toEqual([60, 120, 180, 240])
  expect(verifyReplay(await bounceSim(), replay)).toEqual({ ok: true })
})

test('writeReplay then parseReplay gives the same replay', async () => {
  const { replay } = await record()
  const text = writeReplay(replay)
  expect(text.endsWith('\n')).toBe(true)
  expect(text.startsWith('{\n  "format": 1,\n  "framework": ')).toBe(true)
  expect(parseReplay(text)).toEqual(replay)
  expect(writeReplay(parseReplay(text))).toBe(text)
})

test('replay() can be taken mid-run and again at the end', async () => {
  const { replay, taken } = await record(300, [100, 120])
  const early = taken.get(100) as Replay
  const onTheMinute = taken.get(120) as Replay
  expect(early.ticks).toBe(100)
  expect(replay.commands.slice(0, early.commands.length)).toEqual(early.commands)
  expect(early.checks).toEqual([{ tick: 60, hash: replay.checks[0]?.hash }])
  // The last tick is the final hash, never also a check, even when it is a multiple of 60.
  expect(onTheMinute.checks.map((c) => c.tick)).toEqual([60])
  expect(onTheMinute.finalHash).toBe(replay.checks[1]?.hash)
  expect(verifyReplay(await bounceSim(), early)).toEqual({ ok: true })
})

test('changed content is named as changed content', async () => {
  const { replay } = await record()
  const verdict = verifyReplay(await bounceSim({ content: { level: 'another' } }), replay)
  expect(verdict).toMatchObject({ ok: false, reason: 'content-changed', expected: replay.contentHash })
})

test('another seed is a wrong setup', async () => {
  const { replay } = await record()
  const verdict = verifyReplay(await bounceSim({ seed: BOUNCE_SEED + 1 }), replay)
  expect(verdict).toMatchObject({ ok: false, reason: 'wrong-setup' })
  expect((verdict as { detail: string }).detail).toContain('seed')
})

test('a sim that has already run is a wrong setup', async () => {
  const { replay } = await record()
  const sim = await bounceSim()
  sim.step([])
  expect(verifyReplay(sim, replay)).toMatchObject({ ok: false, reason: 'wrong-setup' })
})

test('a changed command diverges at the first check after it', async () => {
  const { replay } = await record()
  const first = replay.commands[0]
  expect(first?.tick).toBe(5)
  const edited: Replay = {
    ...replay,
    commands: replay.commands.map((c, i) =>
      i === 0 ? { ...c, payload: { ...(c.payload as object), dvx: 100 } } : c,
    ),
  }
  const verdict = verifyReplay(await bounceSim(), edited)
  expect(verdict).toMatchObject({ ok: false, reason: 'diverged', tick: 60 })
})

test('a change after the last check diverges at the final tick', async () => {
  const { replay } = await record()
  const last = replay.commands.length - 1
  expect((replay.commands[last]?.tick ?? 0) > 240).toBe(true)
  const edited: Replay = {
    ...replay,
    commands: replay.commands.map((c, i) =>
      i === last ? { ...c, payload: { ...(c.payload as object), dvx: 100 } } : c,
    ),
  }
  expect(verifyReplay(await bounceSim(), edited)).toMatchObject({
    ok: false,
    reason: 'diverged',
    tick: BOUNCE_TICKS,
  })
})

test('playReplay ignores the recorded hashes', async () => {
  const { replay } = await record()
  const wrong: Replay = {
    ...replay,
    finalHash: '0'.repeat(16),
    checks: replay.checks.map((c) => ({ ...c, hash: '0'.repeat(16) })),
  }
  expect(playReplay(await bounceSim(), wrong)).toEqual({ finalHash: replay.finalHash, checks: replay.checks })
})

test('a command the sim rejects is not recorded', async () => {
  const sim = await bounceSim()
  const recorder = createRecorder(sim)
  recorder.step([{ tick: 0, source: 0, seq: 0, type: 'bounce.kick', payload: { ball: 'not a number' } }])
  expect(recorder.replay().commands).toEqual([])
})

test('createRecorder wants a sim that has not run yet', async () => {
  const sim = await bounceSim()
  sim.step([])
  expect(() => createRecorder(sim)).toThrow(/tick 0/)
})

test('parseReplay refuses text that is not a replay', async () => {
  const { replay } = await record()
  const text = writeReplay(replay)
  const asObject = JSON.parse(text) as Record<string, unknown>
  const outOfOrder = { ...asObject, commands: [...(asObject.commands as unknown[])].reverse() }
  for (const bad of [
    '{',
    '{}',
    JSON.stringify({ ...asObject, surprise: 1 }),
    JSON.stringify(outOfOrder),
    JSON.stringify({ ...asObject, finalHash: 'not-a-hash' }),
  ]) {
    expect(() => parseReplay(bad)).toThrow(ReplayFormatError)
  }
})
