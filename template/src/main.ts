// The page's script: starts the game in #game. The game's files are read from beside the page, so the same build works
// from any path.
import type { Game } from '@automataframework/framework'
import { startPage } from './features/page/page.ts'

declare global {
  interface Window {
    /** The running game, for an agent or a test to look at. `undefined` while loading and when there was a problem. */
    automataGame: Game | undefined
  }
}

const root = document.getElementById('game')
if (root === null) throw new Error('index.html has no #game element.')

const page = await startPage(root)
// A getter, so what an agent reads is always the game as it is now.
Object.defineProperty(window, 'automataGame', { get: () => page.game, configurable: true })
