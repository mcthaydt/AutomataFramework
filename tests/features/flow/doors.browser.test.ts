// The spec's journey on the links game through `startFlow` (plan W, task 12): a hero walks through a door and the next
// level opens at once, beside the door it came through; what was done and where the player is are kept, and Continue
// puts both back. The hero's walks are keys held until the sim says it got there, so a slow machine only takes longer.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { Player } from '#src/features/commands/commands.ts'
import { writeContent } from '#src/features/content/content.ts'
import { type Progress, progressDef } from '#src/features/flow/flow.ts'
import type { TestHost } from '#src/features/host/host.ts'
import { testHost } from '#src/features/host/host.ts'
import { heroLevels, Thing } from '#src/features/level/level.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { Collider, Transform } from '#src/features/physics/physics.ts'
import { createSaves } from '#src/features/saves/saves.ts'
import { SPLASH_MS } from '#src/features/screens/screens.ts'
import { readFiles } from '../../fixtures/content/kind.ts'
import { createDrive } from '../../fixtures/flow/drive.ts'
import { linksJourney } from '../../fixtures/flow/links.ts'

const en = frameworkWords('en')
const drive = createDrive()

beforeEach(() => drive.start())
afterEach(() => drive.stop())

/** The links game read by the flow, with these files changed. */
const read = (overrides: Record<string, string | undefined> = {}) => readFiles(linksJourney(overrides))

/** A returning player's visit up to the main menu, in English, on the links game. */
async function toMenu(host: TestHost, overrides: Record<string, string | undefined> = {}): Promise<void> {
  await drive.returning(host, 'en')
  await drive.open({ host, read: read(overrides), plugins: [] })
  await drive.shown('splash')
  drive.frames.at(0)
  drive.run(SPLASH_MS + 200)
  await drive.shown('menu')
  // The menu's first button is Play, or Continue when a game was kept.
  await expect.poll(() => drive.mount.querySelector('[data-screen="menu"] button') !== null).toBe(true)
}

const sim = () => {
  const game = drive.flow()?.game()
  if (game === undefined) throw new Error('There is no game running.')
  return game.sim
}

/** Player 1's middle, in the sim's tiles. */
function hero(): { readonly x: number; readonly y: number } {
  const found = sim()
    .query(Player, Transform)
    .find((e) => e.get(Player).number === 1)
  if (found === undefined) throw new Error('Player 1 has no hero.')
  const at = found.get(Transform)
  return { x: at.x, y: at.y }
}

/** Lets the game run, one tick a frame, until `done` says so (at most `seconds` of play). */
function until(done: () => boolean, seconds = 12): void {
  for (let tick = 0; tick < seconds * 60 && !done(); tick++) drive.frames.advance(1000 / 60)
}

/** Holds `code` until `done`, then lets go. */
function walk(code: string, done: () => boolean, seconds = 12): void {
  drive.key('keydown', code)
  until(done, seconds)
  drive.key('keyup', code)
}

/** The game of the level just opened: its step is `playing` and its sim exists and has run once. */
async function arrived(level: string): Promise<void> {
  await expect.poll(() => drive.flow()?.state().level, { timeout: 10_000 }).toBe(level)
  await expect.poll(() => drive.flow()?.game() !== undefined, { timeout: 10_000 }).toBe(true)
  drive.frames.at(0)
  drive.run(100)
}

test('through a door the next level opens at once, beside the door, and a door that leads back works too', async () => {
  await toMenu(testHost())
  await drive.press(en('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  drive.run(200)
  const steps: string[] = []
  drive.flow()?.onState((state) => steps.push(`${state.step} ${state.level ?? ''}`.trim()))

  walk('ArrowRight', () => drive.flow()?.state().level === 'room-2')
  await arrived('room-2')
  // No screen between: the one new state is the next level, opened by a door, with the hero put beside `door-in`.
  expect(steps).toEqual(['playing room-2'])
  expect(drive.flow()?.state()).toMatchObject({
    step: 'playing',
    level: 'room-2',
    arrive: { thing: 'door-in' },
    door: true,
  })
  expect(hero().x).toBeGreaterThan(3.2)
  expect(hero().x).toBeLessThan(4)

  // Beside a door that leads back, a hero stays: it was not put inside it.
  drive.run(1000)
  expect(drive.flow()?.state().level).toBe('room-2')
  expect(heroLevels(sim())).toEqual([{ player: 1, level: 'room-2' }])

  // Walking into it on purpose goes back, beside `exit`, and the hero can go through `exit` again.
  walk('ArrowLeft', () => drive.flow()?.state().level === 'room-1')
  await arrived('room-1')
  expect(drive.flow()?.state()).toMatchObject({ level: 'room-1', arrive: { thing: 'exit' }, door: true })
  expect(hero().x).toBeGreaterThan(12)
  expect(hero().x).toBeLessThan(13)
  walk('ArrowRight', () => drive.flow()?.state().level === 'room-2')
  await arrived('room-2')
  expect(steps.every((step) => step.startsWith('playing'))).toBe(true)
})

test('the save keeps where the player came in and what was done for good, and Continue puts both back', async () => {
  const host = testHost()
  await toMenu(host)
  await drive.press(en('automata.menu.play'))
  await drive.shown('playing')
  drive.frames.at(0)
  drive.run(200)
  walk('ArrowRight', () => drive.flow()?.state().level === 'room-2')
  await arrived('room-2')

  // On to the button, which stays down, and across the edge into room 3.
  walk('ArrowRight', () => heroLevels(sim())[0]?.level === 'room-3', 20)
  expect(heroLevels(sim())).toEqual([{ player: 1, level: 'room-3' }])
  await expect
    .poll(() => drive.flow()?.progress(), { timeout: 10_000 })
    .toMatchObject({
      level: 'room-2',
      last: { level: 'room-3' },
      facts: ['room-2.gate-1.open'],
    })
  const kept = (drive.flow()?.progress() as Progress | undefined)?.last
  expect(kept?.x).toBeGreaterThanOrEqual(1)
  expect(kept?.x).toBeLessThan(2)

  // The visit ends; a later one on the same host offers Continue, and it opens room 3 with the gate already open.
  drive.leave()
  await drive.open({ host, read: read(), plugins: [] })
  await drive.shown('splash')
  drive.frames.at(0)
  drive.run(SPLASH_MS + 200)
  await drive.shown('menu')
  await drive.wait(en('automata.menu.continue'))
  await drive.press(en('automata.menu.continue'))
  await drive.shown('playing')
  await arrived('room-3')
  expect(heroLevels(sim())).toEqual([{ player: 1, level: 'room-3' }])
  expect(hero().x).toBeGreaterThan(16.5)
  expect(hero().x).toBeLessThan(18.5)
  const gate = sim()
    .query(Thing, Collider)
    .find((e) => e.get(Thing).id === 'room-2.gate-1')
  expect(gate?.get(Collider).sensor).toBe(true)
})

test('a world edited so room 3 no longer touches room 2: Continue from a save in room 3 opens it alone, and nothing throws', async () => {
  const host = testHost()
  const world = writeContent('world', {
    format: 1,
    id: 'world',
    levels: [
      { level: 'room-1', at: { x: 0, y: 0 } },
      { level: 'room-2', at: { x: 20, y: 0 } },
      { level: 'room-3', at: { x: 60, y: 0 } },
    ],
  } as never)
  const def = progressDef(drive.game)
  const saves = createSaves({ def, store: host.store })
  await saves.save(0, {
    level: 'room-2',
    last: { level: 'room-3', x: 1, y: 7.5 },
    facts: ['room-2.gate-1.open'],
  })
  await toMenu(host, { 'content/worlds/world.json': world })
  await drive.press(en('automata.menu.continue'))
  await drive.shown('playing')
  await arrived('room-3')
  expect(drive.step()).toBe('playing')
  expect(heroLevels(sim(), 'room-3')).toEqual([{ player: 1, level: 'room-3' }])
})
