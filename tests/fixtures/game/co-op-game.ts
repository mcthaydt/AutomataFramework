// What the end-to-end co-op and remap tests share: a started co-op game with hand-driven frames and pretend gamepads,
// and the few things a test asks of it (where a hero is, a key pressed from the page, frames delivered).
import { Player } from '#src/features/commands/commands.ts'
import type { GameContent } from '#src/features/content/content.ts'
import { type Game, type GameOptions, startGame } from '#src/features/game/game.ts'
import type { Host } from '#src/features/host/host.ts'
import { Transform } from '#src/features/physics/physics.ts'
import { type FakeGamepads, fakeGamepads } from '../input/fake-gamepads.ts'
import { coopFiles } from './co-op.ts'
import { fixtureControls } from './controls.ts'
import { type ManualFrames, manualFrames } from './frames.ts'
import { loadFixtureGame } from './game.ts'
import { heroPlugin } from './hero.ts'

/** One display refresh at 60 Hz, in ms. */
export const FRAME: number = 1000 / 60

/** A host that is always on screen: these tests drive the frames by hand. */
export const visibleHost: Host = { target: 'web', visible: () => true, onVisibility: () => () => {} }

export interface Started {
  readonly game: Game
  readonly frames: ManualFrames
  readonly pads: FakeGamepads
}

/** Starts the co-op fixture (or `content`) in `mount`; the first frame has set the clock. */
export async function startCoop(
  mount: HTMLElement,
  extra: Partial<GameOptions> & { readonly content?: GameContent } = {},
): Promise<Started> {
  const frames = manualFrames()
  const pads = fakeGamepads()
  const game = await startGame({
    content: extra.content ?? (await loadFixtureGame(coopFiles)),
    plugins: [heroPlugin],
    mount,
    controls: fixtureControls,
    host: visibleHost,
    frames,
    gamepads: pads.getGamepads,
    ...extra,
  })
  frames.at(0)
  return { game, frames, pads }
}

/** Delivers `n` frames, one display refresh apart. */
export function run(frames: ManualFrames, n: number): void {
  for (let i = 0; i < n; i++) frames.advance(FRAME)
}

/** Player `number`'s hero in the game's sim. */
export function heroOf(game: Game, number: number): { readonly x: number; readonly y: number } {
  const hero = game.sim.query(Player, Transform).find((e) => e.get(Player).number === number)
  if (hero === undefined) throw new Error(`player ${number} has no hero`)
  const { x, y } = hero.get(Transform)
  return { x, y }
}

/** A key, sent the way a browser sends it: to the page, and up to the window. */
export function key(type: 'keydown' | 'keyup', code: string): void {
  document.body.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }))
}
