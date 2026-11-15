// "Add a player": who is in, and how another person joins (a button on their own gamepad, or Enter to share the keyboard).
// It decides nothing: a press is told to `onJoin`, and the flow answers by drawing the screen again with who is in now.
import type { Component } from 'svelte'
import type { Claim } from '../input/input.ts'
import PlayersPart from './Players.svelte'
import type { Screen, ScreenBase } from './screens.ts'
import { show } from './show.ts'

/** What the players screen draws. */
export type PlayersProps = {
  readonly title: string
  /** "Player 1 is in." for each player who is. */
  readonly lines: readonly string[]
  /** How to join: the gamepad's sentence, and the keyboard's when it can be shared. */
  readonly hints: readonly string[]
  /** Why the last try was refused, in the player's words. */
  readonly refused?: string
  readonly done: string
  readonly ondone: () => void
}

const Part: Component<PlayersProps> = PlayersPart as never

/**
 * The players screen. `invite` is the input's: it calls back with the index of a gamepad that nobody has, once, when a
 * button on it goes down. Enter shares the keyboard, only where `canShare`; otherwise Enter presses what has the focus.
 */
export function playersScreen(
  options: ScreenBase & {
    /** Who is in, lowest first. */
    readonly players: readonly number[]
    /** The keyboard can be shared and is not yet. */
    readonly canShare: boolean
    /** Why the last try was refused, in the player's words. */
    readonly refused?: string
    /** Waits for a gamepad: `Input.invite`. */
    readonly invite: (onPad: (pad: number) => void) => () => void
    /** A gamepad pressed a button, or Enter asked to share the keyboard. */
    readonly onJoin: (claim: Claim) => void
    readonly onDone: () => void
  },
): Screen {
  const { players, canShare, refused, onJoin, onDone } = options
  const screen = show(Part, { ...options, name: 'players', onBack: onDone }, (words): PlayersProps => ({
    title: words('automata.players.title'),
    lines: players.map((player) => words('automata.players.in', { player })),
    hints: [words('automata.players.pad'), ...(canShare ? [words('automata.players.keyboard')] : [])],
    ...(refused === undefined ? {} : { refused }),
    done: words('automata.players.done'),
    ondone: onDone,
  }))
  const stopInvite = options.invite((pad) => onJoin(`pad-${pad}` as Claim))
  // Heard before the button that has the focus, which would press it.
  const onKey = (event: KeyboardEvent): void => {
    if (!canShare || event.key !== 'Enter' || event.repeat) return
    event.preventDefault()
    event.stopImmediatePropagation()
    onJoin('keyboard')
  }
  window.addEventListener('keydown', onKey, { capture: true })
  let destroyed = false
  return {
    destroy() {
      if (destroyed) return
      destroyed = true
      stopInvite()
      window.removeEventListener('keydown', onKey, { capture: true })
      screen.destroy()
    },
  }
}
