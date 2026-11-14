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
