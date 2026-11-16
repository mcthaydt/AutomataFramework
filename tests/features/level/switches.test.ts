// Switches and gates (plan W, task 7): a plate or a button is pressed by what stands on it and opens the gates it links,
// with no game code. Every test runs on the links game; room 1 has a plate and a gate, room 2 a button that stays.
import { afterEach, expect, test } from 'vitest'
import { controlsCommand } from '#src/features/commands/commands.ts'
import {
  createGameSim,
  factsCommand,
  leaveCommand,
  movesPlugin,
  Open,
  Pressed,
  switchPlugin,
  Thing,
} from '#src/features/level/level.ts'
import { Collider } from '#src/features/physics/physics.ts'
import { orderSystems } from '#src/features/sim/schedule.ts'
import { type Command, definePlugin, defineSystem, type PluginDef, type Sim } from '#src/features/sim/sim.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import { editLevel, type LevelJson, loadLinksGame } from '../../fixtures/links-game/read.ts'
import golden from '../../golden/push-crate.json' with { type: 'json' }

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** Puts the thing `id` of a level at (x, y). */
function put(level: LevelJson, id: string, x: number, y: number): void {
  const thing = level.things.find((t) => t.id === id)
  if (thing === undefined) throw new Error(`no thing ${id}`)
  thing.x = x
  thing.y = y
}
/** Puts player `player`'s start at (x, y). */
function startAt(level: LevelJson, player: number, x: number, y: number): void {
  const start = level.starts.find((s) => s.player === player)
  if (start === undefined) throw new Error(`no start ${player}`)
  start.x = x
  start.y = y
}

/** A plugin that takes the thing `id` out of the game at `tick`, the way a game's own code would. */
function takeAway(id: string, tick: number): PluginDef {
  return definePlugin({
    name: `take-away-${id}`,
    dependsOn: ['level'],
    systems: [
      defineSystem({
        name: `take-away.${id}`,
        phase: 'gameplay',
        run(ctx) {
          if (ctx.tick !== tick) return
          const found = ctx.query(Thing).find((e) => e.get(Thing).id === id)
          if (found !== undefined) ctx.despawn(found.sid)
        },
      }),
    ],
  })
}

async function room(
  level: string,
  overrides: Readonly<Record<string, string | undefined>> = {},
  options: { plugins?: PluginDef[]; players?: readonly number[] } = {},
): Promise<Sim> {
  const sim = await createGameSim({
    content: await loadLinksGame(overrides),
    level,
    ...(options.plugins === undefined ? {} : { plugins: options.plugins }),
    ...(options.players === undefined ? {} : { players: options.players }),
  })
  made.push(sim)
  return sim
}

interface Said {
  readonly tick: number
  readonly type: string
  readonly payload: Record<string, unknown>
}
/** Steps `ticks` ticks and returns every gate and fact event, with the tick it was raised on. */
function play(sim: Sim, ticks: number, commandsAt: (tick: number) => Command[] = () => []): Said[] {
  const said: Said[] = []
  for (let i = 0; i < ticks; i++) {
    const tick = sim.tick
    for (const e of sim.step(commandsAt(tick)).events)
      if (/^(gate|fact)\./.test(e.type)) said.push({ tick, type: e.type, payload: e.payload as never })
  }
  return said
}
const types = (said: readonly Said[]): string[] => said.map((e) => e.type)

/** Player 1 holds `held` from each listed tick until the next one. */
function holds(changes: readonly (readonly [number, readonly string[]])[]): (tick: number) => Command[] {
  let seq = 0
  return (tick) => {
    const change = changes.find(([at]) => at === tick)
    return change === undefined ? [] : [controlsCommand(tick, 1, seq++, change[1])]
  }
}

/** A thing by its id in its level; room 2 is in a place with room 3, so its things have the level in front. */
const find = (sim: Sim, id: string) => {
  const found = sim.query(Thing).find((e) => e.get(Thing).id === id || e.get(Thing).id.endsWith(`.${id}`))
  if (found === undefined) throw new Error(`no thing ${id}`)
  return found
}
const gateIsOpen = (sim: Sim, id = 'gate-1'): boolean => find(sim, id).get(Collider).sensor

test('a crate on the plate opens the gate, and off it the gate shuts', async () => {
  const sim = await room(
    'room-1',
    editLevel('room-1', (l) => put(l, 'crate-1', 8.5, 7.5)),
    { plugins: [takeAway('crate-1', 40)] },
  )
  const said = play(sim, 30)
  expect(types(said)).toEqual(['gate.opened'])
  expect(said[0]?.tick).toBeLessThan(3)
  expect(said[0]?.payload).toEqual({ thing: 'gate-1', sid: find(sim, 'gate-1').sid })
  expect(gateIsOpen(sim)).toBe(true)
  const after = play(sim, 30)
  expect(types(after)).toEqual(['gate.closed'])
  // The crate went at the end of tick 40, so the plate is up and the gate shuts on tick 41.
  expect(after[0]?.tick).toBe(41)
  expect(gateIsOpen(sim)).toBe(false)
})

test('a hero on the plate holds the gate open only while standing there', async () => {
  const sim = await room(
    'room-1',
    editLevel('room-1', (l) => startAt(l, 1, 8.5, 7.5)),
  )
  const said = play(
    sim,
    70,
    holds([
      [10, ['right']],
      [30, []],
    ]),
  )
  expect(types(said)).toEqual(['gate.opened', 'gate.closed'])
  expect(said[0]?.tick).toBeLessThan(3)
  expect(said[1]?.tick).toBeGreaterThan(10)
  expect(find(sim, 'plate-1').get(Pressed).on).toBe(false)
})

test('two switches on one gate: it is open while either is pressed', async () => {
  const sim = await room(
    'room-1',
    editLevel('room-1', (l) => {
      put(l, 'crate-1', 8.5, 7.5)
      startAt(l, 1, 2.5, 7.5)
      l.things.push({
        id: 'plate-2',
        character: 'plate',
        x: 2.5,
        y: 7.875,
        values: { opens: ['gate-1'] },
      })
    }),
    { plugins: [takeAway('crate-1', 30)] },
  )
  // The crate is gone by tick 31, but the hero still stands on the second plate: nothing closes.
  expect(types(play(sim, 55))).toEqual(['gate.opened'])
  expect(gateIsOpen(sim)).toBe(true)
  // The hero walks off the second plate, and the gate shuts.
  const after = play(
    sim,
    40,
    holds([
      [55, ['right']],
      [75, []],
    ]),
  )
  expect(types(after)).toEqual(['gate.closed'])
})

test('a gate does not shut on a hero standing in it; it shuts the tick after they leave', async () => {
  const sim = await room(
    'room-1',
    editLevel('room-1', (l) => {
      put(l, 'crate-1', 8.5, 7.5)
      startAt(l, 1, 10.5, 7.5)
    }),
    { plugins: [takeAway('crate-1', 25)] },
  )
  // The hero walks into the open gate, and stops there; the crate goes at 25 and the plate comes up under nothing.
  const inside = play(
    sim,
    60,
    holds([
      [5, ['right']],
      [13, []],
    ]),
  )
  expect(types(inside)).toEqual(['gate.opened'])
  expect(gateIsOpen(sim)).toBe(true)
  // The hero walks out of it: it shuts, and only then.
  const out = play(
    sim,
    40,
    holds([
      [60, ['right']],
      [74, []],
    ]),
  )
  expect(types(out)).toEqual(['gate.closed'])
  expect(out[0]?.tick).toBeGreaterThan(60)
})

test('a thing taken away, or a hero who leaves, lets the plate up', async () => {
  // A hero in a two-player sim stands on the plate; when they leave the game, the plate is up and the gate shuts.
  const sim = await room(
    'room-1',
    editLevel('room-1', (l) => startAt(l, 2, 8.5, 7.5)),
    { players: [1, 2] },
  )
  const opened = play(sim, 20)
  expect(types(opened)).toEqual(['gate.opened'])
  const left = play(sim, 10, (tick) => (tick === 20 ? [leaveCommand(tick, 2, 0)] : []))
  expect(types(left)).toEqual(['gate.closed'])
  expect(left[0]?.tick).toBe(21)
})

test('a button that stays opens its gate for good and raises fact.kept once', async () => {
  // The hero starts on the button, walks off it, and comes back: the gate stays open and the fact is raised once.
  const sim = await room(
    'room-2',
    editLevel('room-2', (l) => startAt(l, 1, 11.5, 7.5)),
  )
  const first = play(sim, 10)
  expect(types(first)).toEqual(['fact.kept', 'gate.opened'])
  expect(first.find((e) => e.type === 'fact.kept')?.payload).toEqual({ fact: 'room-2.gate-1.open' })
  expect(find(sim, 'button-1').get(Pressed).on).toBe(true)
  const away = play(
    sim,
    40,
    holds([
      [10, ['right']],
      [25, []],
    ]),
  )
  expect(away).toEqual([])
  expect(find(sim, 'button-1').get(Pressed).on).toBe(false)
  expect(find(sim, 'gate-1').get(Open)).toEqual({ on: true, kept: true })
  const back = play(
    sim,
    60,
    holds([
      [50, ['left']],
      [64, []],
    ]),
  )
  expect(back).toEqual([])
  expect(find(sim, 'button-1').get(Pressed).on).toBe(true)
  expect(gateIsOpen(sim)).toBe(true)
})

test('facts at tick 0 open the gate before anyone moves; a fact about a missing thing is ignored', async () => {
  const sim = await room('room-1')
  const said = play(sim, 1, () => [
    factsCommand(['room-1.gate-1.open', 'room-1.no-such.open', 'room-9.gate-1.open']),
  ])
  expect(types(said)).toEqual(['gate.opened'])
  expect(find(sim, 'gate-1').get(Open)).toEqual({ on: true, kept: true })
  // Kept for good: nothing presses the plate, and the gate stays open.
  expect(play(sim, 30)).toEqual([])
  expect(gateIsOpen(sim)).toBe(true)
})

test('a facts command from source 1 at tick 0, and one from source 0 at tick 5, open nothing', async () => {
  const sim = await room('room-1')
  const fromAPlayer: Command = { ...factsCommand(['room-1.gate-1.open']), source: 1 }
  const late: Command = { ...factsCommand(['room-1.gate-1.open']), tick: 5 }
  const said = play(sim, 10, (tick) => (tick === 0 ? [fromAPlayer] : tick === 5 ? [late] : []))
  expect(said).toEqual([])
  expect(find(sim, 'gate-1').get(Open)).toEqual({ on: false, kept: false })
  expect(gateIsOpen(sim)).toBe(false)
})

test('level.switches runs after level.moves in the schedule, with and without a hero that has moves', () => {
  const moves = movesPlugin({ gravity: { x: 0, y: 30 } })
  const switches = switchPlugin(['gate'])
  const order = (plugins: PluginDef[]): string[] =>
    orderSystems(plugins.flatMap((p) => [...p.systems])).map((s) => s.name)
  expect(order([moves, switches])).toEqual(['level.moves', 'level.switches'])
  expect(order([switches, moves])).toEqual(['level.moves', 'level.switches'])
  expect(order([switches])).toEqual(['level.switches'])
})

test('straight, and restored at tick 45, a switch run agrees', async () => {
  const overrides = editLevel('room-1', (l) => put(l, 'crate-1', 8.5, 7.5))
  const script = (): ((tick: number) => Command[]) =>
    holds([
      [10, ['right']],
      [40, []],
    ])
  const straight = await room('room-1', overrides, { plugins: [takeAway('crate-1', 60)] })
  play(straight, 120, script())
  const restored = await room('room-1', overrides, { plugins: [takeAway('crate-1', 60)] })
  play(restored, 45, script())
  const bytes = restored.snapshot()
  const again = await room('room-1', overrides, { plugins: [takeAway('crate-1', 60)] })
  again.restore(bytes)
  play(again, 75, script())
  expect(again.hash()).toBe(straight.hash())
})

test('a game with no switch has no Pressed, no Open and no facts command, and ends on the recorded hash', async () => {
  const content = await loadFixtureGame()
  const asked = await createGameSim({ content })
  made.push(asked)
  // No plugin knows the command, so it is turned away and nothing changes.
  expect(asked.step([factsCommand(['a.b.open'])]).rejected).toHaveLength(1)
  const sim = await createGameSim({ content })
  made.push(sim)
  for (let i = 0; i < 60; i++) sim.step([])
  expectRecorded('idleHash60', sim.hash(), (golden as { idleHash60?: string }).idleHash60)
})
