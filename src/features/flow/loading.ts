// The two things `startFlow` does while the game's files load that are about the page and the recording, not about
// the flow's rules: the mark that turns, and the recording that plays.
import type { Frames } from '../../lib/frames.ts'
import type { Replay } from '../commands/commands.ts'
import { type GameContent, LANGUAGES, type Project } from '../content/content.ts'
import { type Watch, watchReplay } from '../game/game.ts'
import type { Host } from '../host/host.ts'
import { type PadLike, padMenu } from '../input/input.ts'
import { frameworkWords, matchLanguage } from '../locale/locale.ts'
import type { ReadPicture } from '../render/render.ts'
import type { PluginDef } from '../sim/sim.ts'

/** Milliseconds with no file arriving before the slow line shows. */
export const SLOW_MS = 10_000

/** Milliseconds before a failed read is tried the one more time. */
export const RETRY_MS = 1000

/**
 * A `read` that tries once more after `wait()` when the first try rejects, and tells `arrived` each time a file comes.
 * Two failures reject with the second error: the second try is the answer, and the problem screen says it.
 */
export function retrying<T>(
  read: (path: string) => Promise<T>,
  options: { readonly wait: () => Promise<void>; readonly arrived?: (path: string) => void },
): (path: string) => Promise<T> {
  return async (path) => {
    let answer: T
    try {
      answer = await read(path)
    } catch {
      await options.wait()
      answer = await read(path)
    }
    options.arrived?.(path)
    return answer
  }
}

/** A promise that settles once `ms` of `frames`' time has passed: time is counted on frames so a test moves it by hand. */
export function waitOn(frames: Frames, ms: number): Promise<void> {
  return new Promise((resolve) => {
    let from: number | undefined
    const tick = (now: number): void => {
      from ??= now
      if (now - from >= ms) resolve()
      else frames.request(tick)
    }
    frames.request(tick)
  })
}

/**
 * What to say when the files are slow: the framework's own line in the first of the device's languages that is one of
 * the six, and nothing when none is (a player is never spoken to in a language they did not choose).
 */
export function slowLineFor(device: readonly string[]): string | undefined {
  for (const tag of device) {
    const language = matchLanguage(tag, LANGUAGES)
    if (language !== undefined) return frameworkWords(language)('automata.loading.slow')
  }
  return undefined
}

/** What the page shows while the game's files load. */
export interface LoadingBar {
  /** `done` of `total` files have arrived. Never draws less than it has drawn. */
  progress(done: number, total: number): void
  /** Shows the line under the bar, or takes it away with `undefined`. */
  slow(line: string | undefined): void
  remove(): void
}

/**
 * Puts the bar shown while the game's files load on `mount`: no letters, since the player has no language yet, until
 * `slow` is given some. It is a `progressbar`, so a screen reader says how far it is.
 */
export function putLoadingBar(mount: HTMLElement): LoadingBar {
  const box = document.createElement('div')
  box.setAttribute('aria-busy', 'true')
  box.style.cssText =
    'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:16px'
  const track = document.createElement('div')
  track.setAttribute('role', 'progressbar')
  track.setAttribute('aria-valuemin', '0')
  track.setAttribute('aria-valuemax', '100')
  track.setAttribute('aria-valuenow', '0')
  track.style.cssText =
    'width:min(240px,70%);height:8px;box-sizing:border-box;border:2px solid currentColor;border-radius:999px;overflow:hidden'
  const fill = document.createElement('div')
  fill.style.cssText = 'height:100%;width:0;background:currentColor'
  // The bar eases to its next place, unless the player asked for less movement.
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) fill.style.transition = 'width 200ms ease-out'
  track.append(fill)
  const line = document.createElement('p')
  line.setAttribute('role', 'status')
  line.style.cssText = 'margin:0;max-width:30em;text-align:center;font:600 18px/1.4 system-ui,sans-serif'
  box.append(track, line)
  mount.append(box)
  let drawn = 0
  return {
    progress(done, total) {
      const share = total <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((done / total) * 100)))
      drawn = Math.max(drawn, share)
      fill.style.width = `${drawn}%`
      track.setAttribute('aria-valuenow', String(drawn))
    },
    slow(text) {
      line.textContent = text ?? ''
    },
    remove: () => box.remove(),
  }
}

/** The players a recording was made with ("1" or "1,2"), or `undefined` when it does not say. */
function playersOf(replay: Replay): readonly number[] | undefined {
  const text = replay.meta.players
  if (text === undefined) return undefined
  const numbers = text.split(',').map(Number)
  return numbers.every((n) => Number.isInteger(n) && n >= 1) ? numbers : undefined
}

/**
 * Starts the recording playing in `mount`, or answers `undefined` when it cannot be read or played: the visit then goes
 * on as an ordinary one. Nobody is asked anything while it plays, so it is one player and has no sound.
 */
export async function startWatching(options: {
  readonly content: GameContent
  readonly mount: HTMLElement
  readonly host: Host
  readonly frames: Frames
  readonly watch: Replay | (() => Promise<Replay>)
  readonly plugins?: readonly PluginDef[]
  readonly readPicture?: ReadPicture
}): Promise<Watch | undefined> {
  const { watch, ...rest } = options
  try {
    const replay = typeof watch === 'function' ? await watch() : watch
    const players = playersOf(replay)
    return await watchReplay({
      ...rest,
      replay,
      ...(replay.meta.level === undefined ? {} : { level: replay.meta.level }),
      ...(players === undefined ? {} : { players }),
    })
  } catch {
    return undefined
  }
}

/**
 * Whether `name` was raised in these events. When it is a touch (a door), it counts only when a hero made it and not a
 * crate pushed into it.
 */
function raised(
  name: string | undefined,
  events: readonly { readonly type: string; readonly payload: unknown }[],
): boolean {
  if (name === undefined) return false
  return events.some((event) => {
    if (event.type !== name) return false
    const { payload } = event
    if (typeof payload !== 'object' || payload === null || !('player' in payload)) return true
    return Number(payload.player) > 0
  })
}

/**
 * What one step's events mean for the level: it was won (the project's `done` happened), lost (its `lost` happened), or
 * neither. Both in one step is a win: a player who falls through the door has won.
 */
export function levelEnd(
  project: Pick<Project, 'done' | 'lost'>,
  events: readonly { readonly type: string; readonly payload: unknown }[],
): 'done' | 'lost' | undefined {
  if (raised(project.done, events)) return 'done'
  return raised(project.lost, events) ? 'lost' : undefined
}

/**
 * Waits for the player to take over a game that is watching: a key (not one held down) or a gamepad button calls `take`.
 * Returns the function that stops waiting.
 */
export function waitForTake(options: {
  readonly frames: Frames
  readonly gamepads?: () => readonly (PadLike | null)[]
  readonly take: () => void
}): () => void {
  const { take } = options
  const key = (event: KeyboardEvent): void => {
    if (!event.repeat) take()
  }
  const pads = padMenu({
    frames: options.frames,
    ...(options.gamepads === undefined ? {} : { gamepads: options.gamepads }),
  })
  const stopPads = pads.on(take)
  window.addEventListener('keydown', key)
  return () => {
    window.removeEventListener('keydown', key)
    stopPads()
    pads.destroy()
  }
}
