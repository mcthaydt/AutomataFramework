import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { main } from '../../scripts/art.ts'
import { fullGameFiles } from '../fixtures/full-game/read.ts'

let folder = ''

/** Runs the command in the temporary game and gives what it said and its exit code. */
async function run(...args: string[]): Promise<{ code: number; out: string[]; err: string[] }> {
  const out: string[] = []
  const err: string[] = []
  const code = await main([folder, ...args], { out: (line) => out.push(line), err: (line) => err.push(line) })
  return { code, out, err }
}

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'automata-art-'))
  for (const [path, text] of Object.entries(fullGameFiles)) {
    await mkdir(dirname(join(folder, path)), { recursive: true })
    await writeFile(join(folder, path), text)
  }
})
afterEach(() => rm(folder, { recursive: true, force: true }))

test('the script paints a game, says what it painted, and paints nothing the second time', async () => {
  const first = await run()
  expect(first.code).toBe(0)
  expect(first.out).toEqual([
    'Painted content/figures/hero.png',
    'Painted content/figures/hero.atlas.json',
    'Painted content/figures/keeper.png',
    'Painted content/figures/keeper.atlas.json',
    'Painted content/figures/meadow.png',
    'Painted content/figures/meadow.atlas.json',
    'Painted content/figures/tree.png',
    'Painted content/figures/tree.atlas.json',
    'Painted content/backdrops/valley.png',
    'Painted content/backdrops/valley.atlas.json',
  ])
  expect([...(await readFile(join(folder, 'content/figures/hero.png'))).slice(0, 4)]).toEqual([137, 80, 78, 71])
  const second = await run()
  expect(second).toEqual({ code: 0, out: ['Every picture is already painted and up to date.'], err: [] })
})

test('--check passes after painting, and after a picture is changed names it and exits 1', async () => {
  expect((await run('--check')).code).toBe(1)
  await run()
  expect(await run('--check')).toEqual({ code: 0, out: ['Every picture is painted and up to date.'], err: [] })
  const path = join(folder, 'content/figures/tree.png')
  const bytes = await readFile(path)
  bytes[bytes.length - 20] = (bytes[bytes.length - 20] as number) ^ 1
  await writeFile(path, bytes)
  expect(await run('--check')).toEqual({
    code: 1,
    out: [],
    err: ['content/figures/tree.png: This picture is older than its figure file. Run "automata art".'],
  })
})

test('--check paints nothing', async () => {
  const check = await run('--check')
  expect(check.err).toContain('content/figures/hero.png: This picture has not been painted. Run "automata art".')
  await expect(readFile(join(folder, 'content/figures/hero.png'))).rejects.toThrow()
})

test('a game that does not load is not painted', async () => {
  await writeFile(join(folder, 'content/figures/hero.json'), '{ "format": 1 }')
  const result = await run()
  expect(result.code).toBe(1)
  expect(result.out).toEqual([])
  expect(result.err.at(-1)).toBe(
    'The game does not load, so nothing was painted. Fix the problems above, then run this again.',
  )
  await expect(readFile(join(folder, 'content/figures/keeper.png'))).rejects.toThrow()
})
