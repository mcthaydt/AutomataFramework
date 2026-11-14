// The packed package, used the way a game uses it: installed into an empty folder, then loading the fixture game and
// stepping it 60 ticks with no game code, then loading the full game (every kind of content file, as `full-game/`) and
// reading every kind's schema. CI copies this file, the fixture games and the golden beside it. It exits non-zero unless
// the hash is the one the sim, in every engine, ends on.
import { readFile } from 'node:fs/promises'
import {
  CONTENT_TYPES,
  createGameSim,
  formatDiagnostic,
  loadGame,
} from '@automataframework/framework/headless'
import { createRoomServer, runRoomServer } from '@automataframework/framework/server'

// The server entry loads under plain Node (it carries its own Rapier), and exports what a game's server file calls.
if (typeof createRoomServer !== 'function' || typeof runRoomServer !== 'function') {
  console.error('The installed package has no server entry with createRoomServer and runRoomServer.')
  process.exit(1)
}

const here = (path) => new URL(path, import.meta.url)
const loaded = await loadGame((path) => readFile(here(`game/${path}`), 'utf8'))
if (!loaded.ok) {
  for (const problem of loaded.diagnostics) console.error(`${problem.file}: ${problem.message}`)
  process.exit(1)
}

const sim = await createGameSim({ content: loaded.value })
for (let tick = 0; tick < 60; tick++) sim.step([])
const hash = sim.hash()
sim.dispose()

const golden = JSON.parse(await readFile(here('push-crate.json'), 'utf8'))
if (hash !== golden.idleHash60) {
  console.error(`The installed package ended on ${hash}, but the golden says ${golden.idleHash60}.`)
  process.exit(1)
}
console.log(`The installed package ran 60 ticks and ended on ${hash}, as recorded.`)

const full = await loadGame((path) => readFile(here(`full-game/${path}`), 'utf8'))
if (!full.ok) {
  for (const problem of full.diagnostics) console.error(formatDiagnostic(problem))
  process.exit(1)
}
const kinds = Object.keys(CONTENT_TYPES)
const missing = kinds.filter((type) => Object.keys(full.value[CONTENT_TYPES[type].plural] ?? {}).length === 0)
if (missing.length > 0) {
  console.error(`The full game loaded but has no ${missing.join(', ')}.`)
  process.exit(1)
}
for (const type of kinds) {
  const schema = JSON.parse(
    await readFile(
      new URL(import.meta.resolve(`@automataframework/framework/schemas/${type}.schema.json`)),
      'utf8',
    ),
  )
  if (schema.title !== CONTENT_TYPES[type].title) {
    console.error(
      `The installed schema for ${type} is titled "${schema.title}", not "${CONTENT_TYPES[type].title}".`,
    )
    process.exit(1)
  }
}
console.log(
  `The installed package loaded the full game with ${kinds.length} kinds of file and has every schema.`,
)
