// The page: one call that starts the whole visit (language, menu, the level, pause, settings, saved games). The game's
// own part is its files and its rules; the framework draws everything else and shows anything that goes wrong in words.
import {
  type Flow,
  type Frames,
  type Host,
  parseReplay,
  type ReadPicture,
  startFlow,
} from '@automataframework/framework'
import { gamePlugins } from '../../headless.ts'

/** The id the game's settings and saved games are kept under; `automata create` writes the game's name here. */
const GAME_ID = 'my-game'

/** What a test may change; each default is what a player's browser has. */
export interface PageOptions {
  readonly read?: (path: string) => Promise<string>
  readonly readPicture?: ReadPicture
  readonly host?: Host
  readonly frames?: Frames
  /** Plays the recording first, by itself, until the player takes over. Default: when the address has `?watch`. */
  readonly watch?: boolean
}

/** Fetches `path` from beside the page; a file that is not there, or a web page in its place, is "no such file". */
const fetchBeside =
  (base: URL) =>
  async (path: string): Promise<string> => {
    const response = await fetch(new URL(path, base))
    if (!response.ok || (response.headers.get('content-type') ?? '').toLowerCase().startsWith('text/html'))
      throw new Error(`${path}: no such file`)
    return response.text()
  }

const fetchPictureBeside =
  (base: URL): ReadPicture =>
  async (path) => {
    const response = await fetch(new URL(path, base))
    if (!response.ok) throw new Error(`${path}: no such file`)
    return response.blob()
  }

/** Starts the visit in `mount`. Never rejects: anything that goes wrong is words on the screen. */
export function startPage(mount: HTMLElement, options: PageOptions = {}): Promise<Flow> {
  const here = new URL('./', location.href)
  const read = options.read ?? fetchBeside(here)
  const watch = options.watch ?? new URLSearchParams(location.search).has('watch')
  return startFlow({
    mount,
    game: GAME_ID,
    read,
    plugins: gamePlugins,
    readPicture: options.readPicture ?? fetchPictureBeside(here),
    ...(options.host === undefined ? {} : { host: options.host }),
    ...(options.frames === undefined ? {} : { frames: options.frames }),
    ...(watch ? { watch: async () => parseReplay(await read('replays/level-1.json')) } : {}),
  })
}
