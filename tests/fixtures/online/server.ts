// The fixture game's room server, written the way a game writes its own: load the game, then hand it to
// `runRoomServer`. Tests start it by path (`node tests/fixtures/online/server.ts`, Node 24 runs the TypeScript as it
// is) and never import it, so knip is told it is an entry. It reads the fixture's files with `node:fs`, because the
// `?raw` imports of `../game/read.ts` are Vite's and do not load in plain Node.
import { readFile } from 'node:fs/promises'
import { formatDiagnostic, loadGame } from '#src/features/content/content.ts'
import { runRoomServer } from '#src/server.ts'
import { heroPlugin } from '../game/hero.ts'
import { twoPlayerLevel } from './two-player-level.ts'

const LEVEL_FILE = 'content/levels/level-1.json'
const root = new URL('../game/', import.meta.url)

const loaded = await loadGame(async (path) => {
  const text = await readFile(new URL(path, root), 'utf8')
  return path === LEVEL_FILE ? twoPlayerLevel(text) : text
})
if (!loaded.ok) {
  for (const problem of loaded.diagnostics) console.error(formatDiagnostic(problem))
  process.exit(1)
}

await runRoomServer({ game: { content: loaded.value, plugins: [heroPlugin] } })
