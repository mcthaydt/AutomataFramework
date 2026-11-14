// The web adapter: the host for a game in a page. A page is on screen when the browser says its document is visible,
// the player's languages are the browser's, a link opens in a new tab, and a game's saves are kept in the browser's
// storage. Only this feature reads the page for the host (`document`, `navigator`, `window.open`, `localStorage`).
import { type Host, isOpenableLink, type LinkAnswer } from '../host/host.ts'
import { webStore } from './storage.ts'

export { followLanguage } from './lang.ts'
export { NOTICE_PROPERTIES, soundNotice } from './notice.ts'
export { type SpeakerSeams, webSpeaker } from './speaker.ts'
export { playVoice } from './voices.ts'

/** What the web host reads of the page. Only for tests; a game passes nothing. */
export interface WebSeams {
  readonly document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>
  readonly navigator: Pick<Navigator, 'language' | 'languages'>
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
  }
}
