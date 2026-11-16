// The live layer on a real folder, whose name has a space in it (a person's own folders do).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Effect } from 'effect'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { liveLayer, quoteForWindows } from '#src/features/cli/live.ts'
import { type CliError, Code, Device, Files, type FilesService } from '#src/features/cli/ports.ts'

let folder: string
beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'automata test '))
})
afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

const files = <A>(use: (files: FilesService) => Effect.Effect<A, CliError>): Promise<A> =>
  Effect.runPromise(Effect.flatMap(Files, use).pipe(Effect.provide(liveLayer)))
const loadCode = () =>
  Effect.runPromise(
    Effect.either(Effect.flatMap(Code, (code) => code.load(folder))).pipe(Effect.provide(liveLayer)),
  )

test('the live Files reads, writes and lists under a folder with a space in its name', async () => {
  await files((f) => f.write(join(folder, 'content', 'levels', 'a.json'), '{"a":1}\n'))
  await files((f) => f.write(join(folder, 'content', 'b.json'), new Uint8Array([1, 2, 3])))
  expect(await files((f) => f.readText(join(folder, 'content', 'levels', 'a.json')))).toBe('{"a":1}\n')
  expect(await files((f) => f.readBytes(join(folder, 'content', 'b.json')))).toEqual(
    new Uint8Array([1, 2, 3]),
  )
  expect(await files((f) => f.list(folder))).toEqual(['content/b.json', 'content/levels/a.json'])
  expect(await files((f) => f.list(join(folder, 'nothing here')))).toEqual([])
})

test('the live Files removes a file, and a file that is not there is no mistake', async () => {
  await files((f) => f.write(join(folder, 'content', 'gone.json'), '{}\n'))
  await files((f) => f.remove(join(folder, 'content', 'gone.json')))
  expect(await files((f) => f.readText(join(folder, 'content', 'gone.json')))).toBeUndefined()
  await files((f) => f.remove(join(folder, 'content', 'gone.json')))
})

test('a file that is not there reads as undefined, not as an error', async () => {
  expect(await files((f) => f.readText(join(folder, 'nope.txt')))).toBeUndefined()
  expect(await files((f) => f.readBytes(join(folder, 'nope.txt')))).toBeUndefined()
})

test('a game with no node_modules says to run npm install', async () => {
  const result = await loadCode()
  expect(result._tag).toBe('Left')
  if (result._tag === 'Left')
    expect(result.left.message).toBe(
      `This game's tools are not installed yet. Run npm install in ${folder}, then try again.`,
    )
})

// A stand-in for the installed framework: the live layer takes its headless entry from the package's own manifest.
async function installFramework(manifest: unknown): Promise<void> {
  const root = join(folder, 'node_modules', '@automataframework', 'framework')
  await mkdir(join(root, 'dist'), { recursive: true })
  await writeFile(join(root, 'package.json'), JSON.stringify(manifest))
  await writeFile(join(root, 'dist', 'headless.js'), 'export const standIn = true\n')
}

test("broken rules still give the game's framework, and the problem (audit M1)", async () => {
  await installFramework({
    name: '@automataframework/framework',
    exports: { './headless': { import: './dist/headless.js' } },
  })
  const result = await loadCode()
  expect(result._tag).toBe('Right')
  if (result._tag === 'Right') {
    expect((result.right.framework as unknown as { standIn: boolean }).standIn).toBe(true)
    expect(result.right.rules).toEqual({
      problem: {
        file: 'src/headless.ts',
        path: '',
        message: "This file is missing. It lists the game's rules: export const gamePlugins = [ ... ].",
      },
    })
  }
})

async function rulesProblem(headless: string): Promise<unknown> {
  await installFramework({
    name: '@automataframework/framework',
    exports: { './headless': { import: './dist/headless.js' } },
  })
  await mkdir(join(folder, 'src'), { recursive: true })
  await writeFile(join(folder, 'src', 'headless.ts'), headless)
  const result = await loadCode()
  return result._tag === 'Right' ? result.right.rules : undefined
}

test('a rules file with no gamePlugins says what it must export', async () => {
  expect(await rulesProblem('export const other = 1\n')).toEqual({
    problem: {
      file: 'src/headless.ts',
      path: '',
      message: "This file must export gamePlugins, the list of the game's plugins.",
    },
  })
})

test('a rules file that throws when it loads says so, with the first line of the error', async () => {
  expect(await rulesProblem("throw new Error('nope\\nsecond line')\n")).toEqual({
    problem: { file: 'src/headless.ts', path: '', message: 'This file could not be loaded. nope' },
  })
})

test('a framework with no headless entry says so', async () => {
  await installFramework({ name: '@automataframework/framework' })
  const result = await loadCode()
  expect(result._tag).toBe('Left')
  if (result._tag === 'Left') expect(result.left.message).toContain('has no headless entry')
})

test('on Windows a word with a space or a quote is quoted, and a plain one is not', () => {
  expect(quoteForWindows('C:\\games\\first game')).toBe('"C:\\games\\first game"')
  expect(quoteForWindows('say "hi"')).toBe('"say \\"hi\\""')
  expect(quoteForWindows('biome')).toBe('biome')
  expect(quoteForWindows('--write')).toBe('--write')
})

// The languages the machine says its person uses: the environment's own words, best first.
const deviceLanguages = (): Promise<readonly string[]> =>
  Effect.runPromise(Effect.flatMap(Device, (device) => device.languages()).pipe(Effect.provide(liveLayer)))

test('the live Device answers the language the environment names', async () => {
  vi.stubEnv('LC_ALL', 'ko_KR.UTF-8')
  vi.stubEnv('LC_MESSAGES', '')
  vi.stubEnv('LANG', 'en_US.UTF-8')
  expect(await deviceLanguages()).toEqual(['ko_KR.UTF-8', 'en_US.UTF-8'])
  vi.unstubAllEnvs()
})

test('the live Device keeps the environment variables in the order the system reads them', async () => {
  vi.stubEnv('LC_ALL', '')
  vi.stubEnv('LC_MESSAGES', 'es_MX.UTF-8')
  vi.stubEnv('LANG', 'ja_JP.UTF-8')
  expect(await deviceLanguages()).toEqual(['es_MX.UTF-8', 'ja_JP.UTF-8'])
  vi.unstubAllEnvs()
})

test.skipIf(process.platform === 'win32')('with none set the live Device says nothing', async () => {
  vi.stubEnv('LC_ALL', '')
  vi.stubEnv('LC_MESSAGES', '')
  vi.stubEnv('LANG', '')
  expect(await deviceLanguages()).toEqual([])
  vi.unstubAllEnvs()
})

const SAVE_PROBLEM = {
  problem: {
    file: 'src/headless.ts',
    path: '',
    message:
      'gameSave must be made with defineSave: export const gameSave = defineSave({ game, version, schema, slots }).',
  },
}

test('a gameSave that is not a save definition is a problem at src/headless.ts', async () => {
  expect(await rulesProblem('export const gamePlugins = []\nexport const gameSave = { game: 1 }\n')).toEqual(
    SAVE_PROBLEM,
  )
})

test('a gameSave made like defineSave comes with the rules', async () => {
  const save = "{ game: 'g', version: 2, slots: 1, schema: { parse: (x) => x } }"
  const made = await rulesProblem(`export const gamePlugins = []\nexport const gameSave = ${save}\n`)
  expect(made).toMatchObject({
    plugins: [],
    save: { game: 'g', version: 2, slots: 1 },
  })
})

test('a game with no gameSave has no save', async () => {
  expect(await rulesProblem('export const gamePlugins = []\n')).toEqual({ plugins: [] })
})
