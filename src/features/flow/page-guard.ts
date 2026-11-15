// The page holds still under the game (plan Q, call 12): no scrolling of the page, no rubber band, no zoom on a double
// tap, no text selected by a long press, no callout menu. A game that writes its own page keeps all of it, since the
// flow sets it. The screens' own lists scroll inside themselves: a list is its own scroller, and `touch-action` on the
// mount does not reach into a scroller.

/** One inline style a guard sets: its name and what it is set to. */
type Rule = readonly [property: string, value: string]

/** What the mount gets, always. */
const MOUNT: readonly Rule[] = [
  ['touch-action', 'none'],
  ['user-select', 'none'],
  ['-webkit-user-select', 'none'],
  ['-webkit-touch-callout', 'none'],
]

/** What the document gets: the rubber band goes always, and scrolling only when the game fills the page's height. */
const DOCUMENT: readonly Rule[] = [['overscroll-behavior', 'none']]
const NO_SCROLL: readonly Rule[] = [['overflow', 'hidden']]

/**
 * Sets the page-wide defaults for a game in `mount`. The page itself is stopped from scrolling only when the mount fills
 * the viewport's height: a game in the middle of an article leaves the article scrolling. Answers the function that puts
 * every style back exactly as it was, an inline value and its priority, or none.
 */
export function guardPage(mount: HTMLElement): () => void {
  const root = document.documentElement
  const body = document.body
  const fills = mount.getBoundingClientRect().height >= window.innerHeight
  const set: Array<{ readonly style: CSSStyleDeclaration; readonly rules: readonly Rule[] }> = [
    { style: mount.style, rules: MOUNT },
    { style: root.style, rules: DOCUMENT },
    { style: body.style, rules: DOCUMENT },
    ...(fills
      ? [
          { style: root.style, rules: NO_SCROLL },
          { style: body.style, rules: NO_SCROLL },
        ]
      : []),
  ]
  const before: Array<{ style: CSSStyleDeclaration; property: string; value: string; priority: string }> = []
  for (const { style, rules } of set) {
    for (const [property, value] of rules) {
      before.push({
        style,
        property,
        value: style.getPropertyValue(property),
        priority: style.getPropertyPriority(property),
      })
      style.setProperty(property, value)
    }
  }
  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    // Last set, first put back, so a property set twice ends as it began.
    for (const { style, property, value, priority } of before.reverse()) {
      if (value === '') style.removeProperty(property)
      else style.setProperty(property, value, priority)
    }
  }
}
