// Proof 1 of M2's networking: two players and the room end on one hash, in Node, Chromium, WebKit and Firefox, with a
// lag and a late command forced so that rollback runs. The room's replay is recorded as a golden.
import { afterEach, expect, test } from 'vitest'
import { verifyReplay } from '#src/features/commands/commands.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { expectGolden } from '../../fixtures/golden.ts'
import { onlineSim } from '../../fixtures/online/game.ts'
import { runOnline } from '../../fixtures/online/run.ts'
import { ONLINE_TICKS } from '../../fixtures/online/script.ts'
import golden from '../../golden/online-two-players.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})
async function fresh(): Promise<Sim> {
  const sim = await onlineSim(2)
  made.push(sim)
  return sim
}

test('two players and the room end on the same hash, with a lag and a late command', async () => {
  const run = await runOnline({ 1: { up: 1, down: 1 }, 2: { up: 9, down: 6 } })
  expect(run.room.ticks).toBe(ONLINE_TICKS)
  expect(run.hashes).toEqual([run.room.finalHash, run.room.finalHash])
  for (const player of run.players) {
    expect(player.rollbacks).toBeGreaterThan(0)
    expect(player.desyncs).toBe(0)
    // Ticks 59, 119 ... 599: one hash every sixty ticks.
    expect(player.checked).toBe(10)
  }
  expect(run.players[1]?.late).toBeGreaterThan(0)
  expect(verifyReplay(await fresh(), run.room)).toEqual({ ok: true })
  expectGolden({ ticks: run.room.ticks, finalHash: run.room.finalHash, checks: run.room.checks }, golden)
})

test('with no lag they agree too', async () => {
  // Late commands land on later ticks, so this run's hash may differ from the laggy one's: nothing compares the two.
  const run = await runOnline({})
  expect(run.hashes).toEqual([run.room.finalHash, run.room.finalHash])
  expect(verifyReplay(await fresh(), run.room)).toEqual({ ok: true })
})
