// The page's script: starts the game in #game. The game's files are read from beside the page, so the same build works
// from any path.
import type { Flow, Game } from '@automataframework/framework'
import { startPage } from './features/page/page.ts'

declare global {
  interface Window {
    /** The visit: where it is (`state()`), the running game (`game()`). For an agent or a test to look at. */
    automataFlow: Flow | undefined
    /** The running game, for an agent or a test to look at. `undefined` while no level is playing. */
    automataGame: Game | undefined
  }
}

const root = document.getElementById('game')
if (root === null) throw new Error('index.html has no #game element.')

const flow = await startPage(root)
window.automataFlow = flow
// A getter, so what an agent reads is always the game as it is now.
Object.defineProperty(window, 'automataGame', { get: () => flow.game(), configurable: true })
