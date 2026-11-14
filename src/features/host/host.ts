// The host feature's entry: the port a game talks to its surroundings through. A game never reads `document`, a
// browser's storage or an itch or desktop API itself, so each place a game can run is one adapter behind this
// interface: the `web` feature's `webHost` for a page, and `testHost` here for Node and for tests. Headless: the port
// and the test host need no page.
import type { SaveStore } from '../saves/saves.ts'

export { isOpenableLink } from './link.ts'
export { type TestHost, type TestHostOptions, testHost } from './test.ts'

/** Where a game is running. */
export type HostTarget = 'web' | 'test'

/** 'refused': not an `https:` address, so nothing was tried. 'blocked': the host or the player said no. */
export type LinkAnswer = 'opened' | 'blocked' | 'refused'

/** What a game needs of where it runs. A game never reads `document`, `navigator` or a store's API itself. */
export interface Host {
  readonly target: HostTarget
  /** True while the player can see the game. */
  visible(): boolean
  /** Calls `listener` whenever that changes. Returns a function that stops listening. */
  onVisibility(listener: (visible: boolean) => void): () => void
  /** Where this host keeps the game's saves and settings. */
  readonly store: SaveStore
  /** The language the host itself says the player uses (a store or a desktop setting); `undefined` when it has no say. */
  language(): string | undefined
  /** The device's own languages, best first (a browser's list). May be empty. */
  deviceLanguages(): readonly string[]
  /** Opens a web page outside the game. The game is never navigated away. */
  openLink(url: string): Promise<LinkAnswer>
  /** False where there is nowhere to go back to (a web page): a screen then shows no Quit button. */
  readonly canQuit: boolean
  /** Hands the player back to wherever the game was opened from. Answers false, and does nothing, when `canQuit` is false. */
  quit(): Promise<boolean>
}
