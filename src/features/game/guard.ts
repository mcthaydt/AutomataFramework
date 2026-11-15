// What a browser does with a finger that a game does not want. On a phone a quick second tap zooms the page, a held
// finger selects words or offers to save the picture, a swipe down reloads the page and a drag scrolls or bounces it,
// and on a computer a right click opens a menu over the game. Every one of those takes the game away from the player
// mid-move, so while a game is played its mount says no to them all. The page around the mount is left alone, apart from
// the pull and bounce, which a browser decides for the whole page: they come back as they were when the game stops.

/** The mount's own styles while a game is played. Each one's value from before is put back by the undo. */
const MOUNT_STYLES: readonly (readonly [property: string, value: string])[] = [
  // No zoom, scroll, bounce or pull from a finger on the game: every touch is the game's.
  ['touch-action', 'none'],
  // A held finger selects nothing, and offers no menu to save or copy the picture.
  ['user-select', 'none'],
  ['-webkit-user-select', 'none'],
  ['-webkit-touch-callout', 'none'],
  // No grey flash where a finger lands (Safari).
  ['-webkit-tap-highlight-color', 'transparent'],
  ['overscroll-behavior', 'none'],
]

/** Sets `styles` on `element`; returns what puts the values from before back, priority included. */
function setStyles(element: HTMLElement, styles: readonly (readonly [string, string])[]): () => void {
  const before = styles.map(([property]) => {
    const value = element.style.getPropertyValue(property)
    const priority = element.style.getPropertyPriority(property)
    return () =>
      value === '' ? element.style.removeProperty(property) : element.style.setProperty(property, value, priority)
  })
  for (const [property, value] of styles) element.style.setProperty(property, value)
  return () => {
    for (const restore of before) restore()
  }
}

/**
 * Keeps the browser's own gestures off `mount` while a game is played there, and the page from being pulled to reload
 * or bounced: the touch styles above on the mount, no right-click menu on it, and no overscroll on the page's root and
 * body. Returns the undo, which puts back everything as it was.
 */
export function guardPlay(mount: HTMLElement): () => void {
  const page = mount.ownerDocument
  const undo = [
    setStyles(mount, MOUNT_STYLES),
    setStyles(page.documentElement, [['overscroll-behavior', 'none']]),
    ...(page.body === null ? [] : [setStyles(page.body, [['overscroll-behavior', 'none']])]),
  ]
  const noMenu = (event: Event): void => event.preventDefault()
  mount.addEventListener('contextmenu', noMenu)
  return () => {
    mount.removeEventListener('contextmenu', noMenu)
    for (const step of undo) step()
  }
}
