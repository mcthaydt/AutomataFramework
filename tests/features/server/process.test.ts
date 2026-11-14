// The server as a process: what a host (a container, a terminal) sees of it. It starts the fixture game's server with
// plain Node, reads its one line of output, plays in it over a real socket, and stops it with a signal.
import { type ChildProcess, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { createGameSim } from '#src/features/level/level.ts'
import { loadOnlineGame } from '../../fixtures/online/game.ts'
import { headlessPlayer, until } from '../../fixtures/online/headless-player.ts'

vi.setConfig({ testTimeout: 60_000 })

const SERVER = new URL('../../fixtures/online/server.ts', import.meta.url).pathname
const DIST = new URL('../../../dist/server.js', import.meta.url).pathname

// The fixture server is the built package, as a game's own server file is: `pnpm build` has to have run.
beforeAll(() => {
  if (!existsSync(DIST)) throw new Error('dist/server.js is missing: run `pnpm build` before this test.')
})

interface Running {
  readonly child: ChildProcess
  readonly out: string[]
  readonly err: string[]
  /** Resolves with the exit code once the process has ended. */
  readonly exited: Promise<number | null>
}

const running: ChildProcess[] = []
afterEach(() => {
  for (const child of running.splice(0)) child.kill('SIGKILL')
})

function start(env: Record<string, string | undefined> = {}): Running {
  const { PORT: _port, ...rest } = process.env
  const child = spawn(process.execPath, [SERVER], { env: { ...rest, ...env } })
  running.push(child)
  const out: string[] = []
  const err: string[] = []
  createInterface({ input: child.stdout }).on('line', (line) => out.push(line))
  createInterface({ input: child.stderr }).on('line', (line) => err.push(line))
  const exited = new Promise<number | null>((resolve) => child.once('close', (code) => resolve(code)))
  return { child, out, err, exited }
}

test('it prints one line when it listens, serves a game, and stops on SIGTERM', async () => {
  const server = start()
  await until('the listening line', () => server.out.length > 0 || server.err.length > 0)
  expect(server.err).toEqual([])
  const listening = JSON.parse(server.out[0] ?? '') as { event: string; port: number }
  expect(listening.event).toBe('listening')
  expect(Number.isInteger(listening.port) && listening.port > 0).toBe(true)

  // The server is the built package (its own Rapier, on plain Node) and this sim is the source (under Vitest): the same
  // sixty idle ticks must end on the same hash in both, which a game's own server depends on.
  const plain = (): ReturnType<typeof createGameSim> =>
    loadOnlineGame().then((content) => createGameSim({ content, players: [1] }))
  const player = await headlessPlayer({
    server: `ws://127.0.0.1:${listening.port}`,
    seats: 1,
    script: () => [],
    makeSim: plain,
  })
  await until('a check from the server', () => player.checks.has(59))
  const local = await plain()
  for (let tick = 0; tick < 60; tick++) local.step([])
  expect(player.checks.get(59)).toBe(local.hash())
  local.dispose()
  player.stop()

  const stopped = Date.now()
  server.child.kill('SIGTERM')
  expect(await server.exited).toBe(0)
  expect(Date.now() - stopped).toBeLessThan(5000)
  expect(server.out).toEqual([`{"event":"listening","port":${listening.port}}`, '{"event":"stopped"}'])
  expect(server.err).toEqual([])
})

test('the PORT variable picks the port, and SIGINT stops it too', async () => {
  const probe = start()
  await until('a probe port', () => probe.out.length > 0)
  const { port: free } = JSON.parse(probe.out[0] ?? '') as { port: number }
  probe.child.kill('SIGTERM')
  await probe.exited

  const server = start({ PORT: String(free) })
  await until('the listening line', () => server.out.length > 0 || server.err.length > 0)
  expect(server.out[0]).toBe(`{"event":"listening","port":${free}}`)
  server.child.kill('SIGINT')
  expect(await server.exited).toBe(0)
  expect(server.out[1]).toBe('{"event":"stopped"}')
})

test('a PORT that is not a port ends the process with one line on stderr', async () => {
  const server = start({ PORT: 'abc' })
  expect(await server.exited).toBe(1)
  expect(server.err).toEqual(['PORT must be a whole number from 0 to 65535, but it is "abc".'])
  expect(server.out).toEqual([])
})

test('a PORT above 65535 is refused the same way', async () => {
  const server = start({ PORT: '70000' })
  expect(await server.exited).toBe(1)
  expect(server.err).toEqual(['PORT must be a whole number from 0 to 65535, but it is "70000".'])
})
