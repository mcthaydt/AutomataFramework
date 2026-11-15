// The two things `startFlow` does while the game's files load that are about the page and the recording, not about
// the flow's rules: the mark that turns, and the recording that plays.
import type { Frames } from '../../lib/frames.ts'
import type { Replay } from '../commands/commands.ts'
import type { GameContent } from '../content/content.ts'
import { type Watch, watchReplay } from '../game/game.ts'
import type { Host } from '../host/host.ts'
import type { ReadPicture } from '../render/render.ts'
import type { PluginDef } from '../sim/sim.ts'

/** Puts the mark shown while the game's files load on `mount`: no letters, since the player has no language yet. */
export function putLoadingMark(mount: HTMLElement): HTMLElement {
  const mark = document.createElement('div')
  mark.setAttribute('role', 'status')
  mark.setAttribute('aria-busy', 'true')
  mark.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center'
  const ring = document.createElement('div')
  ring.style.cssText =
    'width:40px;height:40px;box-sizing:border-box;border:4px solid currentColor;border-top-color:transparent;border-radius:50%'
  // A ring that turns, unless the player asked for less movement.
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
    ring.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], {
      duration: 900,
      iterations: Number.POSITIVE_INFINITY,
    })
  mark.append(ring)
  mount.append(mark)
  return mark
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
