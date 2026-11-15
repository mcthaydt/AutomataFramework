// The pause screen: a scrim over the game as it stood, "Paused" and a few buttons, "Keep playing" first. Leaving for the
// main menu asks first, because the level is started again from its beginning.
import type { Component } from 'svelte'
import type { Words } from '../../lib/message.ts'
import type { IconName } from '../ui/ui.ts'
import PausePart from './Pause.svelte'
import type { Screen, ScreenBase } from './screens.ts'
import { show } from './show.ts'

/** One button of the pause screen. */
export type PauseItem = 'resume' | 'add-player' | 'settings' | 'leave'

/** One button as the screen draws it. */
export type PauseButton = {
  readonly id: string
  readonly label: string
  readonly icon?: IconName
  readonly onpress: () => void
}

/** What the pause screen draws. */
export type PauseProps = {
  readonly title: string
  readonly buttons: readonly PauseButton[]
  /** The question before leaving, while it is asked. */
  readonly asking?: {
    readonly title: string
    readonly yes: string
    readonly no: string
    readonly onyes: () => void
    readonly onno: () => void
  }
}

const Part: Component<PauseProps> = PausePart as never

/** The words of each button, written out so the check that every word is used can find them. */
const LABELS: Record<PauseItem, (words: Words) => string> = {
  resume: (words) => words('automata.pause.resume'),
  'add-player': (words) => words('automata.menu.add-player'),
  settings: (words) => words('automata.menu.settings'),
  leave: (words) => words('automata.pause.leave'),
}

const ICONS: Partial<Record<PauseItem, IconName>> = {
  resume: 'play',
  'add-player': 'plus',
  settings: 'gear',
}

/**
 * The pause screen. Escape, the pad's right button and its start button each keep playing (`onPick('resume')`); "Main
 * menu" asks "Go to the main menu?" first, and `onPick('leave')` comes only after a yes.
 */
export function pauseScreen(
  options: ScreenBase & {
    /** The buttons, top to bottom; `resume` first. */
    readonly items: readonly PauseItem[]
    /** Players who can be taken out (never player 1). */
    readonly removable: readonly number[]
    readonly onPick: (item: PauseItem) => void
    readonly onRemove: (player: number) => void
  },
): Screen {
  const { items, removable, onPick, onRemove } = options
  let asking = false
  const ask = (on: boolean): void => {
    asking = on
    screen.update()
  }
  const screen = show(
    Part,
    {
      ...options,
      name: 'pause',
      // On the question, Escape says no (the dialog hears it itself); otherwise it keeps playing.
      onBack: () => onPick('resume'),
      onPause: () => {
        if (!asking) onPick('resume')
      },
    },
    (words) => {
      const buttons: PauseButton[] = []
      for (const item of items) {
        const icon = ICONS[item]
        buttons.push({
          id: item,
          label: LABELS[item](words),
          ...(icon === undefined ? {} : { icon }),
          onpress: item === 'leave' ? () => ask(true) : () => onPick(item),
        })
        // Taking a player out sits with the other things that change who plays.
        if (item === 'settings') {
          for (const player of removable) {
            buttons.push({
              id: `remove-${player}`,
              label: words('automata.pause.remove', { player }),
              onpress: () => onRemove(player),
            })
          }
        }
      }
      return {
        title: words('automata.pause.title'),
        buttons,
        ...(asking
          ? {
              asking: {
                title: words('automata.pause.leave-ask'),
                yes: words('automata.pause.leave-yes'),
                no: words('automata.pause.resume'),
                onyes: () => onPick('leave'),
                onno: () => ask(false),
              },
            }
          : {}),
      }
    },
  )
  return screen
}
