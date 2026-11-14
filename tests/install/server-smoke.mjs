// The packed package's server entry, used the way a game uses it: a room server on the copied fixture game with no game
// code, one player joining it over a real socket, and the hash of tick 59 that the room sends. The same sim, the same
// sixty idle ticks as smoke.mjs, this time through Colyseus: it must be the golden's `idleHash60`. CI copies this file
// beside smoke.mjs and runs it after.
import { readFile } from 'node:fs/promises'
import { createGameSim, joinSession, loadGame } from '@automataframework/framework/headless'
import { createRoomServer } from '@automataframework/framework/server'

const here = (path) => new URL(path, import.meta.url)
const loaded = await loadGame((path) => readFile(here(`game/${path}`), 'utf8'))
if (!loaded.ok) {
  for (const problem of loaded.diagnostics) console.error(`${problem.file}: ${problem.message}`)
  process.exit(1)
}
const golden = JSON.parse(await readFile(here('push-crate.json'), 'utf8'))

const server = await createRoomServer({ game: { content: loaded.value, plugins: [] } })
const confirmed = await createGameSim({ content: loaded.value })
const predicted = await createGameSim({ content: loaded.value })
let hash
const joined = await joinSession({
  server: `ws://127.0.0.1:${server.port}`,
  level: 'level-1',
  seats: 1,
  confirmed,
  predicted,
  onCheck: (tick, value) => {
    if (tick === 59) hash = value
  },
})
// The session plays on its own clock: sixty ticks a second, no commands.
const timer = setInterval(() => joined.session.advance([]), 1000 / 60)
const end = Date.now() + 30_000
while (hash === undefined && Date.now() < end) await new Promise((resolve) => setTimeout(resolve, 10))
clearInterval(timer)
joined.leave()
confirmed.dispose()
predicted.dispose()
await server.close()

if (hash !== golden.idleHash60) {
  console.error(`The room ended tick 59 on ${hash}, but the golden says ${golden.idleHash60}.`)
  process.exit(1)
}
console.log(`The installed server and player ran 60 ticks over a socket and ended on ${hash}, as recorded.`)
process.exit(0)
