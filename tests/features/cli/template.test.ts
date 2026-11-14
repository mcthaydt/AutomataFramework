import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Effect } from 'effect'
import { expect, test } from 'vitest'
import { packageRoot, RENAMED, templateFiles } from '#src/features/cli/template.ts'
import { memoryLayer } from '../../fixtures/cli/memory.ts'
import { templateInMemory } from '../../fixtures/cli/template.ts'
import { templateTree } from '../../template/tree.ts'

test("the package's own folder is the one whose package.json names it", () => {
  const manifest = JSON.parse(readFileSync(join(packageRoot(), 'package.json'), 'utf8')) as { name: string }
  expect(manifest.name).toBe('@automataframework/framework')
  expect(existsSync(join(packageRoot(), 'template', 'automata.toml'))).toBe(true)
})

test('three files are written under another name than the template has', () => {
  expect(RENAMED).toEqual({
    'package.template.json': 'package.json',
    'biome.template.json': 'biome.json',
    gitignore: '.gitignore',
  })
})

test('the template is every file of template/, the three under their real names, sorted', async () => {
  const memory = memoryLayer(templateInMemory())
  const found = await Effect.runPromise(Effect.provide(templateFiles(), memory.layer))
  const expected = Object.keys(templateTree()).map((path) => RENAMED[path] ?? path)
  expect(found.map((file) => file.path)).toEqual(expected.sort())
  expect(found.map((file) => file.path)).toEqual(
    expect.arrayContaining(['package.json', 'biome.json', '.gitignore']),
  )
})

test('a package with no template says so', async () => {
  const memory = memoryLayer({})
  const failed = await Effect.runPromise(Effect.either(Effect.provide(templateFiles(), memory.layer)))
  expect(failed._tag).toBe('Left')
  if (failed._tag === 'Left') expect(failed.left.message).toContain('The template is not in')
})
