import { afterEach, expect, test } from 'vitest'
import {
  commandsPlugin,
  controlsCommand,
  isHeld,
  MAX_PLAYERS,
  Player,
  wasPressed,
} from '#src/features/commands/commands.ts'
import { createSim, type Sim } from '#src/features/sim/sim.ts'

// A sim with the commands plugin and two entities spawned with Player numbers 1 and 2. Every sim is disposed:
// Koota allows only 16 live worlds per process.
const sims: Sim[] = []
afterEach(() => {
  for (const sim of sims.splice(0)) sim.dispose()
})
async function twoPlayers() {
  const sim = await createSim({ seed: 1, plugins: [commandsPlugin] })
  sims.push(sim)
  const one = sim.spawn([[Player, { number: 1 }]])
  const two = sim.spawn([[Player, { number: 2 }]])
  const p1 = () => sim.entity(one)
  const p2 = () => sim.entity(two)
  return { sim, p1, p2 }
}
const held = (e: ReturnType<Awaited<ReturnType<typeof twoPlayers>>['p1']>, action: string) =>
  e !== undefined && isHeld(e, action)
const pressed = (e: ReturnType<Awaited<ReturnType<typeof twoPlayers>>['p1']>, action: string) =>
  e !== undefined && wasPressed(e, action)

test('a controls command reaches only the player who sent it', async () => {
  const { sim, p1, p2 } = await twoPlayers()
  sim.step([controlsCommand(0, 2, 0, ['right', 'jump'])])
  expect(held(p2(), 'right')).toBe(true)
  expect(held(p2(), 'jump')).toBe(true)
  expect(pressed(p2(), 'jump')).toBe(true)
  expect(held(p1(), 'right')).toBe(false)
  expect(pressed(p1(), 'right')).toBe(false)
})

test('pressed lasts one tick, held lasts until it changes', async () => {
  const { sim, p2 } = await twoPlayers()
  sim.step([controlsCommand(0, 2, 0, ['right', 'jump'])])
  sim.step([])
  expect(held(p2(), 'jump')).toBe(true)
  expect(pressed(p2(), 'jump')).toBe(false)
  sim.step([controlsCommand(2, 2, 1, ['right'])])
  expect(held(p2(), 'jump')).toBe(false)
  expect(held(p2(), 'right')).toBe(true)
  // 'right' was already down, so it was not pressed again.
  expect(pressed(p2(), 'right')).toBe(false)
})

test('held is stored sorted and without repeats', async () => {
  const { sim, p2 } = await twoPlayers()
  sim.step([controlsCommand(0, 2, 0, ['right', 'jump', 'right'])])
  expect(p2()?.get(Player).held).toBe('jump,right')
})

test('when one player sends two commands in a tick the higher seq wins', async () => {
  const { sim, p2 } = await twoPlayers()
  sim.step([controlsCommand(0, 2, 1, ['left']), controlsCommand(0, 2, 0, ['right'])])
  expect(p2()?.get(Player).held).toBe('left')
  // Pressed is counted against what was held before the tick, not against the first command.
  expect(p2()?.get(Player).pressed).toBe('left')
})

test('a command for a player who is not in the level changes nothing and does not throw', async () => {
  const { sim, p1, p2 } = await twoPlayers()
  const result = sim.step([controlsCommand(0, 4, 0, ['jump'])])
  expect(result.rejected).toEqual([])
  expect(p1()?.get(Player).held).toBe('')
  expect(p2()?.get(Player).held).toBe('')
})

test('a command with a bad action name is rejected, not thrown', async () => {
  const { sim, p1 } = await twoPlayers()
  const result = sim.step([controlsCommand(0, 1, 0, ['Jump!'])])
  expect(result.rejected[0]?.reason).toBe('invalid-payload')
  expect(p1()?.get(Player).held).toBe('')
})

test('a command from player number 0 or above MAX_PLAYERS is ignored', async () => {
  // The sim accepts any source from 0 to 255; only the controls system decides who is a player.
  expect(MAX_PLAYERS).toBe(4)
  const { sim, p1, p2 } = await twoPlayers()
  sim.step([controlsCommand(0, 0, 0, ['jump']), controlsCommand(0, 5, 0, ['jump'])])
  expect(p1()?.get(Player).held).toBe('')
  expect(p2()?.get(Player).held).toBe('')
})
