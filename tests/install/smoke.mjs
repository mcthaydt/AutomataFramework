// The packed package, used the way a game uses it: installed into an empty folder, then loading the fixture game and
// stepping it 60 ticks with no game code. CI copies this file, the fixture game (as `game/`) and the golden beside
// it. It exits non-zero unless the hash is the one the sim, in every engine, ends on.
import { readFile } from 'node:fs/promises'
import { createGameSim, loadGame } from '@automataframework/framework/headless'

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
