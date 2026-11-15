// The device buzzing in the player's hand: the `buzz` of the game's feel files, played when the event they are `on`
// happens to a player who is on touch. Hears the same steps the audio hears; makes no sound of its own.
import type { FeelFile, GameContent } from '../content/content.ts'
import type { Host } from '../host/host.ts'
import type { DeviceKind } from '../input/input.ts'
import type { SimEvent } from '../sim/sim.ts'

export interface Buzzer {
  /** Asks the host to buzz for each event of this step that a feel file buzzes on. */
  hear(step: { readonly events: readonly SimEvent[] }): void
  /** One file's buzz, now, for that player, under the same rules as `hear`. */
  play(feel: FeelFile, player: number): void
  /** The player's setting: false makes every later step silent. */
  setOn(on: boolean): void
}

export interface BuzzerOptions {
  readonly content: GameContent
  readonly host: Pick<Host, 'buzz' | 'canBuzz'>
  /** What that player last used. */
  readonly device: (player: number) => DeviceKind
  readonly tickHz: number
  readonly on: boolean
}

/** The player an event is about: the number in its payload, else player 1. */
function playerOf(event: SimEvent): number {
  const payload = event.payload as { readonly player?: unknown } | null | undefined
  return typeof payload?.player === 'number' ? payload.player : 1
}

/**
 * A buzzer for this game's feel files. A file with no buzz, or a strength of 0, never asks. Only a player whose last
 * device is touch is buzzed, and only where the host can: a keyboard player's phone in a pocket stays quiet.
 */
export function createBuzzer(options: BuzzerOptions): Buzzer {
  const { content, host, device, tickHz } = options
  let on = options.on
  /** What a file buzzes with, or none when it does not buzz (no `buzz`, or a strength of 0). */
  const buzzOf = (feel: FeelFile): { readonly strength: number; readonly ms: number } | undefined =>
    feel.buzz === undefined || feel.buzz.strength <= 0
      ? undefined
      : { strength: feel.buzz.strength, ms: (feel.buzz.ticks * 1000) / tickHz }
  const buzzes = Object.values(content.feels ?? {}).flatMap((feel) => {
    const buzz = buzzOf(feel)
    return buzz === undefined ? [] : [{ on: feel.on, ...buzz }]
  })
  return {
    hear(step) {
      if (!on || !host.canBuzz) return
      for (const event of step.events)
        for (const buzz of buzzes)
          if (buzz.on === event.type && device(playerOf(event)) === 'touch') host.buzz(buzz.strength, buzz.ms)
    },
    play(feel, player) {
      const buzz = buzzOf(feel)
      if (buzz === undefined || !on || !host.canBuzz || device(player) !== 'touch') return
      host.buzz(buzz.strength, buzz.ms)
    },
    setOn(value) {
      on = value
    },
  }
}
