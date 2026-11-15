// What the main menu offers, as a pure answer to three facts. The first is the primary button.

/** One button of the main menu. */
export type MenuItem = 'continue' | 'play' | 'new' | 'saves' | 'add-player' | 'settings' | 'how' | 'quit'

/**
 * The buttons, top to bottom. With a saved game: Continue, New game, Saved games; with none: Play. Then "Add a player"
 * when there is room for one, Settings, "How to play", and Quit only where the host can quit.
 */
export function menuItems(facts: {
  /** A saved game can be continued. */
  readonly saved: boolean
  /** The game is for more than one player and there is room for another. */
  readonly room: boolean
  readonly canQuit: boolean
}): readonly MenuItem[] {
  const items: MenuItem[] = facts.saved ? ['continue', 'new', 'saves'] : ['play']
  if (facts.room) items.push('add-player')
  items.push('settings', 'how')
  if (facts.canQuit) items.push('quit')
  return items
}
