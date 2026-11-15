// The game's feel, wired: the feel runtime and the buzzer hear the same steps, the loop waits through a freeze, and each
// picture is drawn with the dust and the shake of its frame. `startGame`, `watchReplay` and `startOnlineGame` each make
// one, so what a moment feels like is the same wherever the game is played; only what a freeze holds differs.
import { type FeelFile, formatDiagnostic, type GameContent, parseContent } from '../content/content.ts'
import { createFeel, type FeelFrame, type FeelSettings, feelSettingsOf } from '../feel/feel.ts'
import type { Host } from '../host/host.ts'
import type { DeviceKind } from '../input/input.ts'
import type { Renderer } from '../render/render.ts'
import type { SimEvent } from '../sim/sim.ts'
import { createBuzzer } from './buzz.ts'

export interface FeelWiring {
  /** A new sim is about to be heard (the first, a restore between rounds, an online re-sync). */
  begin(): void
  /** One step, to the feel and to the buzzer. */
  hear(step: { readonly tick: number; readonly events: readonly SimEvent[] }): void
  /** The loop's `hold`, in milliseconds. Only for a game whose freezes hold the game; otherwise it answers 0. */
  hold(ms: number): number
  /** True while a freeze holds the whole game: the loop takes no step. */
  readonly holding: boolean
  /** Draws the picture with this frame's feel: `feel.frame(ms / 1000, renderer.place)`, then `renderer.draw`. */
  draw(alpha: number, ms: number): void
  /** The player's setting: whether the picture may shake. Dust and freezes are not changed by it. */
  setShake(on: boolean): void
  /** The player's setting: whether the device may buzz. Without `buzz` there is nothing to switch. */
  setVibration(on: boolean): void
  /** The feel of the last picture drawn. */
  frame(): FeelFrame
  /** True when nothing is drawn and nothing is held. */
  readonly idle: boolean
  /** True while frames alone would change the picture (dust, a shake, a hold of the picture). */
  readonly moving: boolean
  /** Plays one checked file at a thing: the feel's `play`, and the buzzer's for player 1. */
  show(feel: FeelFile, at: number | undefined): void
}

/**
 * A feel file as a draft, checked the way `loadGame` checks a feel file. Throws a `RangeError`, with every problem in
 * plain words, for one that does not pass.
 */
export function checkFeel(draft: unknown): FeelFile {
  let text: string | undefined
  try {
    text = JSON.stringify(draft)
  } catch {
    text = undefined
  }
  if (text === undefined)
    throw new RangeError('A feel file is an object with "format", "id", "on" and an effect.')
  const parsed = parseContent('feel', text, 'the feel to show')
  if (!parsed.ok) throw new RangeError(parsed.diagnostics.map(formatDiagnostic).join(' '))
  return parsed.value
}

export interface FeelWiringOptions {
  readonly content: GameContent
  readonly host: Pick<Host, 'buzz' | 'canBuzz' | 'reducedMotion'>
  readonly renderer: Pick<Renderer, 'draw' | 'place'>
  readonly tickHz: number
  /** Makes the game's noise its own: the sim's seed. */
  readonly seed: number
  /** The saved `feel` section, as the settings kept it. Anything that does not read as that is the default. */
  readonly feelSettings?: unknown
  /** What a freeze holds: the whole game (the loop waits) or only the picture (a room's ticks cannot wait). */
  readonly freezes: 'game' | 'picture'
  /** Left out, nothing ever buzzes (a watched replay). */
  readonly buzz?: { readonly device: (player: number) => DeviceKind; readonly on: boolean }
}

/** What the last picture drew before there was one. */
const NOTHING: FeelFrame = Object.freeze({ specks: [], shake: { x: 0, y: 0 }, freeze: 0 })

/** The feel runtime and the buzzer of one running game, with the loop's and the renderer's calls ready to hand over. */
export function createFeelWiring(options: FeelWiringOptions): FeelWiring {
  const { content, host, renderer, tickHz, freezes } = options
  const feel = createFeel({
    content,
    tickHz,
    seed: options.seed,
    freezes,
    // The device's wish for less motion decides only a first visit: a saved choice wins.
    settings: feelSettingsOf(options.feelSettings, host.reducedMotion()),
  })
  const buzzer =
    options.buzz === undefined
      ? undefined
      : createBuzzer({ content, host, device: options.buzz.device, tickHz, on: options.buzz.on })
  let last: FeelFrame = NOTHING
  return {
    begin: () => feel.begin(),
    hear(step) {
      feel.hear(step)
      buzzer?.hear(step)
    },
    hold: (ms) => (freezes === 'game' ? feel.hold(ms / 1000) * 1000 : 0),
    get holding() {
      return feel.holding
    },
    draw(alpha, ms) {
      last = feel.frame(ms / 1000, (sid) => renderer.place(sid))
      renderer.draw(alpha, last)
    },
    setShake(on) {
      const settings: FeelSettings = { format: 1, shake: on }
      feel.setSettings(settings)
    },
    setVibration: (on) => buzzer?.setOn(on),
    frame: () => last,
    get idle() {
      return feel.idle
    },
    get moving() {
      return feel.moving
    },
    show(file, at) {
      feel.play(file, at)
      buzzer?.play(file, 1)
    },
  }
}
