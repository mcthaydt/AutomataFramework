// The moves game as a room plays it: two players on level 2, a lag and a late command forced so that rollback runs,
// and the framework's hero moving each of them with no game code. Plan N's fixtures, the moves game's content.
import { afterEach, expect, test } from 'vitest'
import { playReplay, verifyReplay } from '#src/features/commands/commands.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import { loadMovesGame } from '../../fixtures/moves/game.ts'
import { MOVES_TWO_TICKS, movesTwoScript } from '../../fixtures/moves/script.ts'
import { runOnline } from '../../fixtures/online/run.ts'
import golden from '../../golden/moves.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})
async function fresh(): Promise<Sim> {
  const sim = await createGameSim({ content: await loadMovesGame(), level: 'level-2', players: [1, 2] })
  made.push(sim)
  return sim
}
const game = {
  make: fresh,
  level: 'level-2',
  script: (seat: number, tick: number) => movesTwoScript(tick, seat),
  ticks: MOVES_TWO_TICKS,
}

test('a room and two players with a forced lag end on one hash, after at least one rollback', async () => {
  const run = await runOnline({ 1: { up: 1, down: 1 }, 2: { up: 9, down: 6 } }, game)
  expect(run.room.ticks).toBe(MOVES_TWO_TICKS)
  expect(run.hashes).toEqual([run.room.finalHash, run.room.finalHash])
  for (const player of run.players) {
    expect(player.rollbacks).toBeGreaterThan(0)
    expect(player.desyncs).toBe(0)
  }
  expect(verifyReplay(await fresh(), run.room)).toEqual({ ok: true })
  expectRecorded('onlineHash', run.room.finalHash, (golden as { onlineHash?: string }).onlineHash)
})

test('that hash is the hash of the same commands played straight through', async () => {
  const run = await runOnline({ 1: { up: 1, down: 1 }, 2: { up: 9, down: 6 } }, game)
  const played = playReplay(await fresh(), run.room)
  expect(played.finalHash).toBe(run.room.finalHash)
})
