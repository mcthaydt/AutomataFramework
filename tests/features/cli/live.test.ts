// The live layer on a real folder, whose name has a space in it (a person's own folders do).
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Effect } from 'effect'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { liveLayer, quoteForWindows } from '#src/features/cli/live.ts'
import { Code, Files, type FilesService } from '#src/features/cli/ports.ts'

let folder: string
beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'automata test '))
})
afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

const files = <A>(use: (files: FilesService) => Effect.Effect<A>): Promise<A> =>
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
