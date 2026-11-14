// A replay is plain JSON, so the text a run produces must be the same bytes in every engine: this pins its hash.
import { expect, test } from 'vitest'
import { createRecorder, type Replay, verifyReplay, writeReplay } from '#src/features/commands/commands.ts'
import { createRng, createSim, deriveSeed } from '#src/features/sim/sim.ts'
import { utf8 } from '#src/lib/canonical.ts'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'
import { bouncePlugin } from '../../fixtures/bounce/bounce.plugin.ts'
import { BOUNCE_SEED, BOUNCE_TICKS, bounceScript, bounceSetup } from '../../fixtures/bounce/bounce-script.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import bounceGolden from '../../golden/bounce.json' with { type: 'json' }

const fresh = async () => {
  const sim = await createSim({ seed: BOUNCE_SEED, plugins: [bouncePlugin] })
  bounceSetup(sim)
  return sim
}

test('the recorded bounce run writes the same replay text in every engine, and verifies', async () => {
  const sim = await fresh()
  const recorder = createRecorder(sim)
  const rng = createRng(deriveSeed(BOUNCE_SEED, 'golden-script'))
  for (let t = 0; t < BOUNCE_TICKS; t++) recorder.step(bounceScript(sim.tick, rng))
  const replay = recorder.replay()
  // The replay's hashes are the bounce golden's: one run, two records of it.
  expect(replay.finalHash).toBe(bounceGolden.finalHash)
  expect(replay.checks).toEqual(bounceGolden.checks)
  // The text writer's bytes are pinned as the first format wrote them (no schema hash), the text this golden was recorded
  // from before format 2 existed; format 2's own hash is `replay-format.parity.test.ts`'s.
  const { schemaHash: _schema, ...rest } = replay
  const firstFormat: Replay = { ...rest, format: 1 }
  expectRecorded(
    'replayTextHash',
    hex64(xxhash64(utf8(writeReplay(firstFormat)))),
    (bounceGolden as { replayTextHash?: string }).replayTextHash,
  )
  const again = await fresh()
  expect(verifyReplay(again, replay)).toEqual({ ok: true })
  sim.dispose()
  again.dispose()
})
