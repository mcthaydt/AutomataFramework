// The fixture game's room server, written the way a game writes its own: load the game, then hand it to
// `runRoomServer`. Tests start it by path (`node tests/fixtures/online/server.ts`, Node 24 runs the TypeScript as it
// is) and never import it, so knip is told it is an entry. Like a game's server file it uses the built package
// (`dist/`, so `pnpm build` comes first): `src/` cannot run under plain Node, because Rapier's binary is read through
// a module only the build writes. It has no game plugins, and reads the fixture's files with `node:fs`, because the
// `?raw` imports of `../game/read.ts` are Vite's.
import { readFile } from 'node:fs/promises'
import { twoPlayerLevel } from './two-player-level.ts'

// Loaded by address, so a typecheck and knip before the first build do not need `dist/`.
const dist = new URL('../../../dist/', import.meta.url)
const { formatDiagnostic, loadGame } = (await import(new URL('headless.js', dist).href)) as {
  loadGame(
    read: (path: string) => Promise<string>,
  ): Promise<{ ok: true; value: unknown } | { ok: false; diagnostics: readonly unknown[] }>
  formatDiagnostic(diagnostic: unknown): string
}
const { runRoomServer } = (await import(new URL('server.js', dist).href)) as {
  runRoomServer(options: { game: { content: unknown; plugins: readonly unknown[] } }): Promise<never>
}

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

await runRoomServer({ game: { content: loaded.value, plugins: [] } })
