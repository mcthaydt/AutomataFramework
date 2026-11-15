// The moves game in Node, Chromium, WebKit and Firefox: the hero is walked, jumped, double jumped, wall jumped and
// dashed by the framework alone, along a script that lands each move where its comment says, and every engine ends on
// the hash recorded in tests/golden/moves.json.
import { afterEach, expect, test } from 'vitest'
import {
  createRecorder,
  Player,
  type Replay,
  verifyReplay,
  writeReplay,
} from '#src/features/commands/commands.ts'
import { createGameSim, MOVE_EVENTS } from '#src/features/level/level.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'
import { expectGolden, expectRecorded } from '../../fixtures/golden.ts'
import { loadMovesGame } from '../../fixtures/moves/game.ts'
import { MOVES_TICKS, movesScript } from '../../fixtures/moves/script.ts'
import golden from '../../golden/moves.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})
async function fresh(): Promise<Sim> {
  const sim = await createGameSim({ content: await loadMovesGame() })
  made.push(sim)
  return sim
}
const hero = (sim: Sim) => sim.query(Player).find((e) => e.get(Player).number === 1)

interface Frame {
  readonly tick: number
  readonly x: number
  readonly y: number
  readonly said: readonly string[]
}

/** Plays the moves script on a new sim, recording it, and notes where the hero is and what it said on each tick. */
async function record(): Promise<{ sim: Sim; replay: Replay; frames: Frame[]; trace: string }> {
  const sim = await fresh()
  const recorder = createRecorder(sim)
  const frames: Frame[] = []
  for (let t = 0; t < MOVES_TICKS; t++) {
    const tick = sim.tick
    const result = recorder.step(movesScript(tick))
    const at = hero(sim)?.get(Transform)
    frames.push({
      tick,
      x: at?.x ?? Number.NaN,
      y: at?.y ?? Number.NaN,
      said: result.events.filter((e) => e.type.startsWith('hero.')).map((e) => e.type.slice(5)),
    })
  }
  // What a failing run prints, so a script that is a tick or two off is read, not guessed at: each event, and where the
  // hero was every twenty ticks.
  const line = (f: Frame): string => {
    const said = f.said.length > 0 ? ` ${f.said.join('+')}` : ''
    return `${f.tick}:${f.x.toFixed(2)},${f.y.toFixed(2)}${said}`
  }
  const trace = frames
    .filter((f) => f.said.length > 0 || f.tick % 20 === 0)
    .map(line)
    .join('\n')
  return { sim, replay: recorder.replay(), frames, trace }
}

const times = (frames: readonly Frame[], name: string): number[] =>
  frames.filter((f) => f.said.includes(name)).map((f) => f.tick)
/** The highest the hero got between two ticks: the smallest y, which points down. */
const top = (frames: readonly Frame[], from: number, to: number): number =>
  Math.min(...frames.filter((f) => f.tick >= from && f.tick < to).map((f) => f.y))

test('the moves game plays as its script says, and matches its golden', async () => {
  const { replay, frames, trace } = await record()
  const n = (name: string) => times(frames, name).length
  expect(
    MOVE_EVENTS.map((name) => `${name}:${n(name) > 0}`),
    trace,
  ).toEqual(MOVE_EVENTS.map((name) => `${name}:true`))
  expect(n('jumped'), trace).toBeGreaterThanOrEqual(5)
  // Three presses come with the air jump to spend: the double jump at tick 226, and the two that follow a tapped jump
  // or a jump off the crate (150, 526) while the hero is still in the air. A press just before a landing, with no air
  // jump left to spend, jumps on the landing: move-step's own tests hold that.
  expect(n('air-jumped'), trace).toBe(3)
  expect(n('wall-jumped'), trace).toBe(3)
  expect(n('dashed'), trace).toBe(2)
  expect(n('wall-slid'), trace).toBeGreaterThanOrEqual(1)
  // The tapped jump is cut short and the held one is not.
  expect(top(frames, 100, 125), trace).toBeGreaterThan(top(frames, 30, 80) + 0.5)
  // The hero crossed the pit and ended in the shaft.
  expect(frames.at(-1)?.x, trace).toBeGreaterThan(46)
  expectGolden({ ticks: replay.ticks, finalHash: replay.finalHash, checks: replay.checks }, golden)
})

test('the recording of that play verifies, and its text is the same in every engine', async () => {
  const { replay } = await record()
  expect(verifyReplay(await fresh(), replay)).toEqual({ ok: true })
  const text = hex64(xxhash64(new TextEncoder().encode(writeReplay(replay))))
  expectRecorded('replayText', text, (golden as { replayText?: string }).replayText)
})

test("saved at tick 200 and restored, it ends on the golden's hash", async () => {
  const first = await fresh()
  for (let t = 0; t < 200; t++) first.step(movesScript(first.tick))
  const bytes = first.snapshot()
  const second = await fresh()
  second.restore(bytes)
  for (let t = 200; t < MOVES_TICKS; t++) second.step(movesScript(second.tick))
  expect(second.hash()).toBe(golden.finalHash)
})
