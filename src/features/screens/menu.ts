// The main menu: the game's name or picture, and one button for each thing the player can do. It is what the player comes
// back to when they leave a level.
import type { Component } from 'svelte'
import type { Words } from '../../lib/message.ts'
import type { IconName } from '../ui/ui.ts'
import type { MenuItem } from './menu-items.ts'
import MenuPart from './Menu.svelte'
import type { Screen, ScreenBase } from './screens.ts'
import { show } from './show.ts'

export type { MenuItem } from './menu-items.ts'
export { menuItems } from './menu-items.ts'

/** One button as the menu draws it. */
export type MenuButton = {
  readonly item: MenuItem
  readonly label: string
  readonly icon?: IconName
}

/** What the menu draws: the name, the picture's URL when there is one, the buttons and who is in. */
export type MenuProps = {
  readonly name: string
  readonly src?: string
  readonly buttons: readonly MenuButton[]
  /** "Player 2 is in." for each player, when more than one plays. */
  readonly players: readonly string[]
  readonly onpick: (item: MenuItem) => void
}

const Part: Component<MenuProps> = MenuPart as never

/** The words of each button, written out so the check that every word is used can find them. */
const LABELS: Record<MenuItem, (words: Words) => string> = {
  continue: (words) => words('automata.menu.continue'),
  play: (words) => words('automata.menu.play'),
  new: (words) => words('automata.menu.new'),
  saves: (words) => words('automata.menu.saves'),
  'add-player': (words) => words('automata.menu.add-player'),
  settings: (words) => words('automata.menu.settings'),
  quit: (words) => words('automata.menu.quit'),
}

const ICONS: Partial<Record<MenuItem, IconName>> = {
  continue: 'play',
  play: 'play',
  'add-player': 'plus',
  settings: 'gear',
}

/** The main menu. `onPick` is told which button was pressed, by a tap, a key or the pad. */
export function menuScreen(
  options: ScreenBase & {
    /** The game's name: shown in big letters with no picture, and the picture's name for a screen reader with one. */
    readonly name: string
    /** The painted picture of the figure `automata.toml` names, when it names one. */
    readonly picture?: Blob
    /** The buttons, top to bottom; the first is the primary one (`menuItems` makes the list). */
    readonly items: readonly MenuItem[]
    /** Who is in, when more than one: "Player 2 is in." */
    readonly players?: readonly number[]
    readonly onPick: (item: MenuItem) => void
  },
): Screen {
  const { name, items, players = [], onPick } = options
  const src = options.picture === undefined ? undefined : URL.createObjectURL(options.picture)
  const screen = show(Part, { ...options, name: 'menu' }, (words) => ({
    name,
    ...(src === undefined ? {} : { src }),
    buttons: items.map((item) => {
      const icon = ICONS[item]
      return { item, label: LABELS[item](words), ...(icon === undefined ? {} : { icon }) }
    }),
    players: players.length > 1 ? players.map((player) => words('automata.players.in', { player })) : [],
    onpick: onPick,
  }))
  let destroyed = false
  return {
    destroy() {
      if (destroyed) return
      destroyed = true
      screen.destroy()
      if (src !== undefined) URL.revokeObjectURL(src)
    },
  }
}
