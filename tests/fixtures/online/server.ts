// The fixture game's room server, written the way a game writes its own: load the game, then hand it to
// `runRoomServer`. Tests start it by path (`node tests/fixtures/online/server.ts`, Node 24 runs the TypeScript as it
// is) and never import it, so knip is told it is an entry. Like a game's server file it uses the built package
// (`dist/`, so `pnpm build` comes first): `src/` cannot run under plain Node, because Rapier's binary is read through
// a module only the build writes. It reads the fixture's files with `node:fs`, because the `?raw` imports of
// `../game/read.ts` are Vite's, and carries the same hero as `../game/hero.ts` (a plugin hashes by its names, so the
// two agree), because that file imports the source.
//
// With `--co-op` it serves the game made for four players, and a player who is gone for two seconds loses their seat.
import { readFile } from 'node:fs/promises'
import { twoPlayerLevel } from './two-player-level.ts'

// Loaded by address, so a typecheck and knip before the first build do not need `dist/`; the types are the source's.
const dist = new URL('../../../dist/', import.meta.url)
const headless = (await import(new URL('headless.js', dist).href)) as typeof import('#src/headless.ts')
const server = (await import(new URL('server.js', dist).href)) as typeof import('#src/server.ts')
const { Body, definePlugin, defineSystem, formatDiagnostic, isHeld, loadGame, Player, wasPressed } = headless

/** Tiles per second the hero runs at, and the upward speed of a jump (y points down, so up is negative). */
const RUN = 6
const JUMP = -12
const move = defineSystem({
  name: 'hero.move',
  phase: 'gameplay',
  run(ctx) {
    for (const hero of ctx.query(Player, Body)) {
      const left = isHeld(hero, 'left')
      const right = isHeld(hero, 'right')
      const onGround = Math.abs(hero.get(Body).vy) < 0.01
      hero.set(Body, {
        vx: left === right ? 0 : left ? -RUN : RUN,
        ...(wasPressed(hero, 'jump') && onGround ? { vy: JUMP } : {}),
      })
    }
  },
})
const heroPlugin = definePlugin({ name: 'hero', dependsOn: ['physics', 'commands'], systems: [move] })

const coop = process.argv.includes('--co-op')
const LEVEL_FILE = 'content/levels/level-1.json'
const root = new URL('../game/', import.meta.url)

/** The fixture's level with a start for each player: two for the lobby game, four (as `../game/co-op.ts`) for co-op. */
function withStarts(levelText: string): string {
  if (!coop) return twoPlayerLevel(levelText)
  const level = JSON.parse(levelText) as Record<string, unknown>
  const starts = [2.5, 4.5, 9.5, 11.5].map((x, i) => ({ player: i + 1, x, y: 7.5 }))
  return JSON.stringify({ ...level, starts })
}

const loaded = await loadGame(async (path) => {
  const text = await readFile(new URL(path, root), 'utf8')
  if (path === LEVEL_FILE) return withStarts(text)
  if (coop && path === 'automata.toml') return text.replace('hero = "hero"\n', 'hero = "hero"\nplayers = 4\n')
  return text
})
if (!loaded.ok) {
  for (const problem of loaded.diagnostics) console.error(formatDiagnostic(problem))
  process.exit(1)
}

await server.runRoomServer({
  game: { content: loaded.value, plugins: [heroPlugin] },
  ...(coop ? { graceSeconds: 2 } : {}),
})
