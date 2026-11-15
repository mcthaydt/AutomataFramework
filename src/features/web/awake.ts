// Keeping the screen awake while a game is played. A phone dims, then locks, when nobody touches it for a while, and
// a player holding a thumb still on a button, or watching a level, is not "nobody". The browser's Wake Lock asks the
// device to stay lit; the browser lets go of it by itself whenever the page is hidden, so the game asks again when it
// comes back. Where there is no Wake Lock, or the browser says no, the screen dims as it always has.

/** What a page's `navigator.wakeLock` is, as far as keeping the screen lit needs it. */
export interface WakeLockLike {
  request(type: 'screen'): Promise<{ readonly released: boolean; release(): Promise<void> }>
}

/**
 * The host's `keepAwake`, over `lock` (the page's `navigator.wakeLock`, or `undefined` where it has none). `true` asks
 * for the screen once, and again only once the browser has let go; `false` lets go. Never throws.
 */
export function wakeLock(lock: WakeLockLike | undefined): (on: boolean) => void {
  let wanted = false
  let held: { readonly released: boolean; release(): Promise<void> } | undefined
  let asking = false
  const letGo = (): void => {
    held?.release().catch(() => {})
    held = undefined
  }
  return (on) => {
    wanted = on
    if (!on) {
      letGo()
      return
    }
    if (lock === undefined || asking || (held !== undefined && !held.released)) return
    asking = true
    // Through a promise, so a `request` that throws instead of refusing is a refusal too.
    Promise.resolve()
      .then(() => lock.request('screen'))
      .then(
        (got) => {
          asking = false
          held = got
          // Let go at once if the game stopped wanting it while the browser answered.
          if (!wanted) letGo()
        },
        () => {
          // Refused (the page is hidden, a battery saver, a frame not allowed to): the screen dims as it would anyway.
          asking = false
        },
      )
  }
}
