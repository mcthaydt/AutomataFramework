// The host for Node and for tests: everything a game asks of where it runs, answered by a made-up place that a test
// can change and look at. No page is needed, so an agent can run a whole game's saves, language and links against it.
import { memoryStore, type SaveStore } from '../saves/saves.ts'
import type { Host, LinkAnswer } from './host.ts'
import { isOpenableLink } from './link.ts'

export interface TestHostOptions {
  /** Is the game on screen. Default true. */
  readonly visible?: boolean
  /** Default `memoryStore()`. */
  readonly store?: SaveStore
  /** What `language()` answers. Default `undefined`. */
  readonly language?: string
  /** What `deviceLanguages()` answers. Default none. */
  readonly deviceLanguages?: readonly string[]
  /** Default false, like a web page. */
  readonly canQuit?: boolean
  /** Default false: an https link answers 'opened'. When true it answers 'blocked', as if the player said no. */
  readonly blockLinks?: boolean
}

/** A host a test can change (`show`, `hide`) and look at (`opened`, `quits`). */
export interface TestHost extends Host {
  readonly target: 'test'
  /** Tells every listener, as a page coming back on screen would. */
  show(): void
  /** Tells every listener, as a page going to the background would. */
  hide(): void
  /** Every address `openLink` opened, in order. */
  readonly opened: readonly string[]
  /** How many times `quit` handed the player back. */
  readonly quits: number
}

/** A host for tests and for Node. */
export function testHost(options: TestHostOptions = {}): TestHost {
  const { canQuit = false, blockLinks = false } = options
  let visible = options.visible ?? true
  const listeners = new Set<(visible: boolean) => void>()
  const opened: string[] = []
  let quits = 0
  const set = (next: boolean): void => {
    visible = next
    for (const listener of [...listeners]) listener(next)
  }
  return {
    target: 'test',
    visible: () => visible,
    onVisibility(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    store: options.store ?? memoryStore(),
    language: () => options.language,
    deviceLanguages: () => options.deviceLanguages ?? [],
    async openLink(url): Promise<LinkAnswer> {
      // Refused first, as every host does: an address that is not https is never offered to the player.
      if (!isOpenableLink(url)) return 'refused'
      if (blockLinks) return 'blocked'
      opened.push(url)
      return 'opened'
    },
    canQuit,
    async quit() {
      if (!canQuit) return false
      quits += 1
      return true
    },
    show: () => set(true),
    hide: () => set(false),
    get opened() {
      return [...opened]
    },
    get quits() {
      return quits
    },
  }
}
