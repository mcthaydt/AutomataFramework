// What the story's page tests share: the story game started on a page with hand-driven frames, and the few things a
// test asks of it (the box's words, whether it shows, frames played until something is true).
import { type Game, type GameOptions, startGame } from '#src/features/game/game.ts'
import { run, type Started, visibleHost } from '../game/co-op-game.ts'
import { fixtureControls } from '../game/controls.ts'
import { manualFrames } from '../game/frames.ts'
import { fakeGamepads } from '../input/fake-gamepads.ts'
import { loadStory, storyPlugins } from './game.ts'

/** Starts the story game in `mount`; the first frame has set the clock. `extra` replaces any option. */
export async function startStory(mount: HTMLElement, extra: Partial<GameOptions> = {}): Promise<Started> {
  const frames = manualFrames()
  const pads = fakeGamepads()
  const game: Game = await startGame({
    content: await loadStory(),
    plugins: storyPlugins,
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

/** The box in `mount`, if the page has one. */
export const boxOf = (mount: HTMLElement): HTMLElement | null => mount.querySelector('.automata-story')

/** True while the box is showing. */
export const showing = (mount: HTMLElement): boolean => {
  const box = boxOf(mount)
  return box !== null && !box.hidden && box.style.display !== 'none'
}

/** What one part of the box says: `speaker` or `text`. */
export const said = (mount: HTMLElement, part: 'speaker' | 'text'): string =>
  mount.querySelector(`[data-story="${part}"]`)?.textContent ?? ''

/** Every button showing in the box: its words. */
export const buttonsOf = (mount: HTMLElement): string[] =>
  [...mount.querySelectorAll<HTMLButtonElement>('.automata-story button')]
    .filter((b) => !b.hidden && b.style.display !== 'none')
    .map((b) => b.textContent ?? '')

/** Plays frames, one at a time, until `done()` or `max` frames have gone by. Returns whether `done()` came true. */
export function playUntil(frames: Parameters<typeof run>[0], done: () => boolean, max = 400): boolean {
  for (let i = 0; i < max && !done(); i++) run(frames, 1)
  return done()
}
