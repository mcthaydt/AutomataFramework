import { expect, test } from 'vitest'
import { checkArchitecture, type SourceFiles } from './rules.ts'

// Each case is a made-up file map with exactly one fault, so the answer is one rule's name. Files in a feature
// folder are named after the feature's entry, so `feature-has-entry` stays quiet unless it is the one under test.
const one = (files: SourceFiles) => checkArchitecture(files).map((v) => v.rule)

test('a feature may not import a feature above it', () =>
  expect(one({ 'src/features/sim/sim.ts': "import '../render/render.ts'" })).toEqual(['imports-go-down']))

test('another feature is imported through its entry file', () =>
  expect(one({ 'src/features/physics/physics.ts': "import '../sim/rng.ts'" })).toEqual(['through-the-entry']))

test('lib imports no feature', () =>
  expect(one({ 'src/lib/a.ts': "import '../features/sim/sim.ts'" })).toEqual(['lib-is-below-features']))

test('no cycles', () =>
  expect(one({ 'src/lib/a.ts': "import './b.ts'", 'src/lib/b.ts': "import './a.ts'" })).toEqual([
    'no-cycles',
  ]))

test('a cycle that only types take part in is not a cycle', () =>
  expect(
    one({
      'src/lib/a.ts': "import type { B } from './b.ts'\nexport type A = B",
      'src/lib/b.ts': "import type { A } from './a.ts'\nexport type B = A",
    }),
  ).toEqual([]))

test('no tests in src', () => expect(one({ 'src/lib/a.test.ts': '' })).toEqual(['no-tests-in-src']))

test('the sim side has no clock, randomness or I/O', () =>
  expect(one({ 'src/features/sim/sim.ts': 'const t = Date.now()' })).toEqual(['sim-is-pure']))

test('a package stays in its feature', () =>
  expect(one({ 'src/features/input/input.ts': "import { Application } from 'pixi.js'" })).toEqual([
    'package-confined',
  ]))

test('a file has at most 600 lines', () =>
  expect(one({ 'src/lib/a.ts': 'x\n'.repeat(601) })).toEqual(['at-most-600-lines']))

test('a feature folder has its entry file', () =>
  expect(one({ 'src/features/sim/rng.ts': '' })).toEqual(['feature-has-entry']))

test('headless reaches nothing that needs a page', () =>
  expect(one({ 'src/headless.ts': "export * from './features/render/render.ts'" })).toEqual([
    'headless-is-headless',
  ]))

test('saves may import nothing above it', () =>
  expect(one({ 'src/features/saves/saves.ts': "import '../host/host.ts'" })).toEqual(['imports-go-down']))

test('headless may reach the host port but not the web host', () => {
  expect(one({ 'src/headless.ts': "export * from './features/web/web.ts'" })).toEqual([
    'headless-is-headless',
  ])
  expect(one({ 'src/headless.ts': "export * from './features/host/host.ts'" })).toEqual([])
})

// The rules also have to stay quiet on honest code.
test('a clean map has no violations', () =>
  expect(
    checkArchitecture({
      'src/lib/a.ts': 'export const a = 1',
      'src/features/sim/sim.ts': "import { a } from '../../lib/a.ts'\nexport const b = a",
      'src/features/physics/physics.ts': "import { b } from '../sim/sim.ts'\nexport const c = b",
      'src/headless.ts': "export * from './features/physics/physics.ts'",
    }),
  ).toEqual([]))

test('comments may name what the sim side forbids', () =>
  expect(
    one({ 'src/lib/a.ts': '// never Date.now() here\n/* nor Math.random */\nexport const a = 1' }),
  ).toEqual([]))

test('a feature may import itself and an unknown feature is named', () => {
  expect(
    one({ 'src/features/sim/sim.ts': "export * from './rng.ts'", 'src/features/sim/rng.ts': '' }),
  ).toEqual([])
  expect(one({ 'src/features/zzz/zzz.ts': '' })).toEqual(['unknown-feature'])
})

// Plan N: the networking layers. `net` is pure and sits just above `commands`; `server` needs Node and sits above `level`.
// Each case names the entry files it needs, so only the rule under test can fire.
test('net may not import content, which is above it; server may import level and net', () => {
  expect(
    one({
      'src/features/net/net.ts': "import '../content/content.ts'",
      'src/features/content/content.ts': '',
    }),
  ).toEqual(['imports-go-down'])
  expect(
    one({
      'src/features/server/server.ts': "import '../level/level.ts'\nimport '../net/net.ts'",
      'src/features/level/level.ts': '',
      'src/features/net/net.ts': '',
    }),
  ).toEqual([])
})

test('net is pure: no timers', () =>
  expect(one({ 'src/features/net/net.ts': 'setTimeout(() => {}, 1)' })).toEqual(['sim-is-pure']))

test('the Colyseus SDK is only for the one file that loads it on demand', () => {
  expect(
    one({
      'src/features/net/net.ts': '',
      'src/features/net/session.ts': "import '@colyseus/sdk'",
    }),
  ).toEqual(['package-confined'])
  expect(
    one({
      'src/features/net/net.ts': '',
      'src/features/net/colyseus-link.ts': "await import('@colyseus/sdk')",
    }),
  ).toEqual([])
})

test('the Colyseus server packages are only for the server feature', () => {
  expect(
    one({ 'src/features/net/net.ts': "import '@colyseus/core'\nimport '@colyseus/ws-transport'" }),
  ).toEqual(['package-confined', 'package-confined'])
  expect(
    one({
      'src/features/server/server.ts': '',
      'src/features/server/room.ts': "import '@colyseus/core'\nimport '@colyseus/schema'",
    }),
  ).toEqual([])
})

// Zod probes whether it may compile validators with `new Function` the first time a schema is built, and a strict CSP
// reports even that caught attempt. `lib/zod.ts` turns the probe off before anything is built; a file that reached Zod
// by another way could run first, in a bundler's chunk order.
test('Zod is only reached through lib/zod.ts', () => {
  expect(one({ 'src/features/content/content.ts': "import { z } from 'zod'" })).toEqual(['package-confined'])
  expect(one({ 'src/features/content/content.ts': "import type { z } from 'zod'" })).toEqual([
    'package-confined',
  ])
  expect(
    one({
      'src/lib/zod.ts': "import { config, z } from 'zod'",
      'src/features/content/content.ts': "import { z } from '../../lib/zod.ts'",
    }),
  ).toEqual([])
})

test('Effect is only for the server process', () => {
  expect(one({ 'src/features/net/net.ts': "import { Effect } from 'effect'" })).toEqual(['package-confined'])
  expect(
    one({
      'src/features/server/server.ts': '',
      'src/features/server/process.ts': "import { Effect } from 'effect'",
    }),
  ).toEqual([])
})

test('only src/server.ts may import the server feature', () => {
  const server = { 'src/features/server/server.ts': '' }
  expect(one({ ...server, 'src/features/game/game.ts': "import '../server/server.ts'" })).toEqual([
    'server-is-node-only',
  ])
  // A direct import from either page entry is the same fault.
  expect(one({ ...server, 'src/headless.ts': "export * from './features/server/server.ts'" })).toEqual([
    'server-is-node-only',
  ])
  // The Node entry itself is the one door.
  expect(one({ ...server, 'src/server.ts': "export * from './features/server/server.ts'" })).toEqual([])
})

test('headless and the page entry never reach src/server.ts, through any chain', () => {
  const node = {
    'src/features/server/server.ts': '',
    'src/server.ts': "export * from './features/server/server.ts'",
  }
  expect(one({ ...node, 'src/headless.ts': "export * from './server.ts'" })).toEqual(['server-is-node-only'])
  expect(one({ ...node, 'src/index.ts': "export * from './server.ts'" })).toEqual(['server-is-node-only'])
})

// Plan K: the `automata` command. `cli` is the last layer, Node only, reached only through `src/cli.ts` (the package's
// bin), and it may use only what the headless entry re-exports.
const HEADLESS_COMMANDS = {
  'src/headless.ts': "export * from './features/commands/commands.ts'",
  'src/features/commands/commands.ts': '',
}
const CLI_ENTRY_FILES = { 'src/features/cli/cli.ts': '', 'src/cli.ts': "import './features/cli/cli.ts'" }

test('cli is the last layer and may import the headless features through their entries', () => {
  expect(
    one({
      ...HEADLESS_COMMANDS,
      ...CLI_ENTRY_FILES,
      'src/features/cli/check.ts': "import '../commands/commands.ts'",
    }),
  ).toEqual([])
  expect(
    one({
      ...HEADLESS_COMMANDS,
      ...CLI_ENTRY_FILES,
      'src/features/commands/commands.ts': "import '../cli/cli.ts'",
    }),
  ).toEqual(['cli-is-node-only'])
})

test('only src/cli.ts may import the cli feature', () => {
  expect(one({ 'src/features/cli/cli.ts': '', 'src/index.ts': "import './features/cli/cli.ts'" })).toEqual([
    'cli-is-node-only',
  ])
  expect(
    one({ 'src/features/cli/cli.ts': '', 'src/features/game/game.ts': "import '../cli/cli.ts'" }),
  ).toEqual(['cli-is-node-only'])
})

test('neither page entry reaches src/cli.ts, through any chain', () => {
  expect(one({ ...CLI_ENTRY_FILES, 'src/headless.ts': "export * from './cli.ts'" })).toEqual([
    'cli-is-node-only',
  ])
  expect(one({ ...CLI_ENTRY_FILES, 'src/index.ts': "export * from './cli.ts'" })).toEqual([
    'cli-is-node-only',
  ])
})

test('the cli feature reaches nothing that needs a page, and not the server', () => {
  const base = {
    ...HEADLESS_COMMANDS,
    ...CLI_ENTRY_FILES,
    'src/features/render/render.ts': '',
    'src/features/saves/saves.ts': '',
    'src/features/server/server.ts': '',
  }
  expect(one({ ...base, 'src/features/cli/play.ts': "import '../render/render.ts'" })).toEqual([
    'cli-has-no-page',
  ])
  expect(one({ ...base, 'src/features/cli/play.ts': "import '../server/server.ts'" })).toEqual([
    'server-is-node-only',
  ])
  // A feature the headless entry does not re-export is out, so one that joins later is covered the day it lands.
  expect(one({ ...base, 'src/features/cli/play.ts': "import '../saves/saves.ts'" })).toEqual([
    'cli-has-no-page',
  ])
})

test('Effect may be imported under src/features/cli/ and in server/process.ts, and nowhere else', () => {
  expect(
    one({
      ...CLI_ENTRY_FILES,
      'src/features/cli/check.ts': "import { Effect } from 'effect'",
    }),
  ).toEqual([])
  expect(one({ 'src/features/net/net.ts': "import { Effect } from 'effect'" })).toEqual(['package-confined'])
})

test('audio may import nothing above it', () =>
  expect(one({ 'src/features/audio/audio.ts': "import '../saves/saves.ts'" })).toEqual(['imports-go-down']))

test('the sim side may not import audio', () =>
  expect(one({ 'src/features/level/level.ts': "import '../audio/audio.ts'" })).toEqual(['imports-go-down']))

test('audio keeps no clock of its own: its speaker has the only one', () =>
  expect(one({ 'src/features/audio/audio.ts': 'setTimeout(() => {}, 1)' })).toEqual(['sim-is-pure']))
