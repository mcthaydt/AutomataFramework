// The web adapter: the host for a game in a page. A page is on screen when the browser says its document is visible,
// the player's languages are the browser's, a link opens in a new tab, and a game's saves are kept in the browser's
// storage. Only this feature reads the page for the host (`document`, `navigator`, `window.open`, `localStorage`).
import { type Host, isOpenableLink, type LinkAnswer } from '../host/host.ts'
import { type WakeLockLike, wakeLock } from './awake.ts'
import { webStore } from './storage.ts'

export type { WakeLockLike } from './awake.ts'
export { languageFlag, languageRow } from './flags.ts'
export { followLanguage } from './lang.ts'
export { NOTICE_PROPERTIES, soundNotice } from './notice.ts'
export { languagePicker, PICKER_PROPERTIES } from './picker.ts'
export { type SpeakerSeams, webSpeaker } from './speaker.ts'
export { playVoice } from './voices.ts'

/** What the web host reads of the page. Only for tests; a game passes nothing. */
export interface WebSeams {
  readonly document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>
  /** `vibrate` is left out where the device cannot buzz (a desktop browser, Safari on iPhone). */
  readonly navigator: Pick<Navigator, 'language' | 'languages'> & {
    readonly vibrate?: ((pattern: number) => boolean) | undefined
    /** Left out where the browser cannot keep the screen awake (an older Safari, Firefox before 126). */
    readonly wakeLock?: WakeLockLike | undefined
  }
  /** `window.open`. `null` means the browser blocked the new tab. */
  readonly open: (url: string, target: string) => { opener: unknown } | null
  /** Gives the page's `localStorage`. May throw: a browser can refuse even to hand it over. */
  readonly storage: () => Storage
}

/** The host for a game in a web page. `seams` are only for tests; each one left out is the real page's. */
export function webHost(seams: Partial<WebSeams> = {}): Host {
  const doc = seams.document ?? document
  const nav = seams.navigator ?? navigator
  const open = seams.open ?? ((url: string, target: string) => window.open(url, target))
  const visible = (): boolean => doc.visibilityState !== 'hidden'
  const keepAwake = wakeLock(nav.wakeLock)
  return {
    target: 'web',
    visible,
    onVisibility(listener) {
      const onChange = (): void => listener(visible())
      doc.addEventListener('visibilitychange', onChange)
      return () => doc.removeEventListener('visibilitychange', onChange)
    },
    store: webStore(seams.storage ?? (() => localStorage)),
    // A browser has no say in the language; the page's own list is `deviceLanguages`.
    language: () => undefined,
    deviceLanguages: () =>
      nav.languages.length > 0 ? [...nav.languages] : nav.language ? [nav.language] : [],
    async openLink(url): Promise<LinkAnswer> {
      if (!isOpenableLink(url)) return 'refused'
      // `noopener` in the features string would make `open` answer null even when the tab opened, so a blocked popup
      // could not be told from an open one. The tab's `opener` is cut by hand instead.
      const tab = open(url, '_blank')
      if (tab === null) return 'blocked'
      try {
        tab.opener = null
      } catch {
        // A tab that will not let go of its opener is still open; the link was opened.
      }
      return 'opened'
    },
    canQuit: false,
    quit: async () => false,
    canBuzz: typeof nav.vibrate === 'function',
    buzz(strength, ms) {
      if (typeof nav.vibrate !== 'function') return false
      // A page can say how long to buzz and not how hard, so a weaker buzz is a shorter one.
      const length = Math.round(ms * Math.min(1, Math.max(0, strength)))
      if (length < 1) return false
      try {
        return nav.vibrate.call(nav, length)
      } catch {
        return false
      }
    },
    keepAwake,
  }
}
