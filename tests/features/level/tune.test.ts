// A tune is a command (plan G, task 3): a tunable sim reads the hero's numbers from the last tune and from the
// file before the first, and a sim that is not tunable has none of it. Real physics, in Node.
import { afterEach, describe, expect, test } from 'vitest'
import {
  controlsCommand,
  createRecorder,
  Player,
  type Replay,
  verifyReplay,
} from '#src/features/commands/commands.ts'
import { MOVE_NUMBERS, moveNumbersOf } from '#src/features/content/content.ts'
import { createGameSim, Moves, Thing, TuneCommand, Tuned, tuneCommand } from '#src/features/level/level.ts'
import { Body, Transform } from '#src/features/physics/physics.ts'
import { type Command, type Sim, SnapshotMismatchError } from '#src/features/sim/sim.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { movesFiles } from '../../fixtures/game/moves-game.ts'
import { loadMovesGame } from '../../fixtures/moves/game.ts'
import { MOVES_TICKS, movesScript } from '../../fixtures/moves/script.ts'

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** A sim on the plain fixture level (no crate), tunable or not. */
async function plain(tunable: boolean): Promise<Sim> {
  const content = await loadFixtureGame(movesFiles({}))
  const sim = await createGameSim({ content, tunable })
  made.push(sim)
  return sim
}
/** A sim of the moves game, which has a crate, tunable or not. */
async function moves(tunable: boolean): Promise<Sim> {
  const sim = await createGameSim({ content: await loadMovesGame(), tunable })
  made.push(sim)
  return sim
}
const hero = (sim: Sim) => sim.query(Player).find((e) => e.get(Player).number === 1)
const N = moveNumbersOf({})
/** The eighteen as a command carries them, with `over` (by id) in place of the framework's. */
const values = (over: Readonly<Record<string, number>> = {}): number[] =>
  MOVE_NUMBERS.map((n) => over[n.id] ?? n.value)
const tune = (tick: number, seq: number, over: Readonly<Record<string, number>> = {}): Command => ({
  tick,
  source: 0,
  seq,
  type: TuneCommand.id,
  payload: { values: values(over) },
})
/** A held jump from tick 40: the jump is pressed there, held for 30 ticks, and the hero walks nowhere. */
const jumpAt = (tick: number): Command[] => {
  if (tick === 40) return [controlsCommand(tick, 1, 1, ['jump'])]
  if (tick === 70) return [controlsCommand(tick, 1, 2, [])]
  return []
}
/** How high (smallest y, which points down) the hero got over `ticks` ticks of `script` and `extra`. */
function topOf(
  sim: Sim,
  ticks: number,
  script: (t: number) => Command[],
  extra: (t: number) => Command[],
): number {
  let top = Number.POSITIVE_INFINITY
  for (let i = 0; i < ticks; i++) {
    const t = sim.tick
    sim.step([...script(t), ...extra(t)])
    top = Math.min(top, hero(sim)?.get(Transform).y ?? Number.NaN)
  }
  return top
}

describe('a tune', () => {
  test('a tune to jump-speed 16 at tick 30 makes the next jump top out higher than untuned', async () => {
    const tuned = await plain(true)
    const same = await plain(true)
    const high = topOf(tuned, 100, jumpAt, (t) => (t === 30 ? [tune(t, 1, { 'jump-speed': 16 })] : []))
    const low = topOf(same, 100, jumpAt, () => [])
    expect(high).toBeLessThan(low - 1)
  })

  test('resets nothing: the hero and the crate are as in the sim that was not tuned', async () => {
    const tuned = await moves(true)
    const other = await moves(true)
    const crate = (sim: Sim) => sim.query(Thing).find((e) => e.get(Thing).character === 'crate')
    for (let i = 0; i < MOVES_TICKS; i++) {
      const t = tuned.tick
      // A tune that gives the numbers the file already has changes nothing at all.
      tuned.step([...movesScript(t), ...(t === 30 ? [tune(t, 1)] : [])])
      other.step(movesScript(t))
      if (i % 50 === 0 || i === MOVES_TICKS - 1) {
        expect(hero(tuned)?.get(Transform), `tick ${t}`).toEqual(hero(other)?.get(Transform))
        expect(hero(tuned)?.get(Body), `tick ${t}`).toEqual(hero(other)?.get(Body))
        expect(hero(tuned)?.get(Moves), `tick ${t}`).toEqual(hero(other)?.get(Moves))
        expect(crate(tuned)?.get(Transform), `tick ${t}`).toEqual(crate(other)?.get(Transform))
      }
    }
  })

  test('a tune to other numbers in mid-air leaves the hero and what it carries as they were', async () => {
    const tuned = await plain(true)
    const other = await plain(true)
    const carried = (sim: Sim) => {
      const m = hero(sim)?.get(Moves)
      return { face: m?.face, airJumps: m?.airJumps, dash: m?.dash, lock: m?.lock, rest: m?.rest }
    }
    for (let t = 0; t < 60; t++) {
      // The jump was pressed on tick 40 and the hero is still rising on tick 50, where the numbers change.
      const over = { 'jump-speed': 16, 'dash-ticks': 20, 'walk-speed': 9 }
      tuned.step([...jumpAt(t), ...(t === 50 ? [tune(t, 1, over)] : [])])
      other.step(jumpAt(t))
      if (t === 50) {
        expect(hero(tuned)?.get(Body).vy, 'in the air').toBeLessThan(0)
        expect(hero(tuned)?.get(Transform)).toEqual(hero(other)?.get(Transform))
        expect(carried(tuned)).toEqual(carried(other))
      }
    }
  })

  test('on the tick jump is pressed: the hero leaves at the new speed, and jumped is said once', async () => {
    const sim = await plain(true)
    for (let i = 0; i < 40; i++) sim.step([])
    const said: string[] = []
    const result = sim.step([controlsCommand(40, 1, 1, ['jump']), tune(40, 1, { 'jump-speed': 16 })])
    for (const e of result.events) if (e.type.startsWith('hero.')) said.push(e.type)
    expect(hero(sim)?.get(Body).vy).toBeCloseTo(-16, 4)
    for (let i = 0; i < 30; i++)
      for (const e of sim.step(i === 0 ? [controlsCommand(41, 1, 2, ['jump'])] : []).events)
        if (e.type.startsWith('hero.')) said.push(e.type)
    expect(said.filter((s) => s === 'hero.jumped')).toEqual(['hero.jumped'])
  })

  test('before any tune the numbers are the files: a tunable sim plays as a plain one', async () => {
    const tunable = await moves(true)
    const plainSim = await moves(false)
    for (let i = 0; i < MOVES_TICKS; i++) {
      const t = tunable.tick
      tunable.step(movesScript(t))
      plainSim.step(movesScript(t))
      if (i % 20 === 0)
        expect(hero(tunable)?.get(Transform), `tick ${t}`).toEqual(hero(plainSim)?.get(Transform))
    }
  })

  test('two tunes in one tick: the later one stands', async () => {
    const sim = await plain(true)
    sim.step([tune(0, 1, { 'jump-speed': 14 }), tune(0, 2, { 'jump-speed': 18 })])
    expect(tunedValue(sim, 'jump-speed')).toBe(18)
  })

  test('jump-speed 99 plays as 30; seventeen values, or a NaN, are refused', async () => {
    const sim = await plain(true)
    const made = (tick: number, seq: number, payload: unknown): Command => ({
      tick,
      source: 0,
      seq,
      type: TuneCommand.id,
      payload,
    })
    const short = sim.step([made(0, 1, { values: values().slice(1) })])
    expect(short.rejected.map((r) => r.reason)).toEqual(['invalid-payload'])
    const nan = sim.step([made(1, 1, { values: values().map((v, i) => (i === 3 ? Number.NaN : v)) })])
    expect(nan.rejected.map((r) => r.reason)).toEqual(['invalid-payload'])
    expect(sim.resource(Tuned).values).toEqual([])
    // 99 is a number: the sim takes it, and the hero's jump holds it at the framework's limit.
    sim.step([made(2, 1, { values: values({ 'jump-speed': 99 }) })])
    for (let i = 3; i < 40; i++) sim.step([])
    sim.step([controlsCommand(40, 1, 1, ['jump'])])
    expect(hero(sim)?.get(Body).vy).toBeCloseTo(-30, 3)
  })

  test('saved after a tune and restored into a new tunable sim, the play ends on the same hash', async () => {
    const first = await moves(true)
    for (let i = 0; i < 200; i++)
      first.step([...movesScript(first.tick), ...(i === 10 ? [tune(10, 1, { 'jump-speed': 14 })] : [])])
    const bytes = first.snapshot()
    const second = await moves(true)
    second.restore(bytes)
    for (let i = 200; i < 400; i++) {
      first.step(movesScript(first.tick))
      second.step(movesScript(second.tick))
    }
    expect(second.hash()).toBe(first.hash())
  })

  test('a recording with a tune in it verifies', async () => {
    const sim = await plain(true)
    const recorder = createRecorder(sim)
    for (let i = 0; i < 120; i++) {
      const t = sim.tick
      recorder.step([...jumpAt(t), ...(t === 30 ? [tune(t, 1, { 'jump-speed': 16 })] : [])])
    }
    const replay: Replay = recorder.replay()
    expect(verifyReplay(await plain(true), replay)).toEqual({ ok: true })
  })

  test('a plain sim refuses the command, and a tunable sim cannot restore its snapshot', async () => {
    const off = await plain(false)
    const on = await plain(true)
    expect(off.step([tune(0, 1)]).rejected.map((r) => r.reason)).toEqual(['unknown-command'])
    expect(() => on.restore(off.snapshot())).toThrow(SnapshotMismatchError)
  })

  test('tunable with a hero that has no moves throws the sentence', async () => {
    const content = await loadFixtureGame()
    await expect(createGameSim({ content, tunable: true })).rejects.toThrow(
      'Only a game whose hero has "moves" can be tuned while it plays.',
    )
  })

  test('tuneCommand makes the command a sim reads, from nobody', () => {
    const command = tuneCommand(5, 2, N)
    expect(command).toMatchObject({ tick: 5, source: 0, seq: 2, type: 'tune' })
    expect((command.payload as { values: number[] }).values).toEqual(values())
  })
})

/** The value the last tune left for the number with this id, as the resource holds it. */
const tunedValue = (sim: Sim, id: string): number | undefined =>
  sim.resource(Tuned).values[MOVE_NUMBERS.findIndex((n) => n.id === id)]
