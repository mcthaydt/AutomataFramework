// The template game's files, as they are on disk: they load, they are in the standard form, their rules break no rule,
// and what `create` renames is where it is expected.
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { ruleProblems } from '#src/features/cli/check-rules.ts'
import { loadGame, parseContent, parseProject, writeContent } from '#src/features/content/content.ts'
import { readTemplate, templateTree } from './tree.ts'

const tree = templateTree()
const rootPackage = JSON.parse(readFileSync('package.json', 'utf8')) as {
  devDependencies: Record<string, string>
}

test('the template loads with no problems', async () => {
  const loaded = await loadGame(readTemplate())
  expect(loaded.ok ? [] : loaded.diagnostics).toEqual([])
})

test('every content file is exactly what writeContent writes', () => {
  const project = parseProject(tree['automata.toml'] ?? '')
  expect(project.ok).toBe(true)
  if (!project.ok) return
  expect(project.value.content.length).toBe(10)
  for (const ref of project.value.content) {
    const parsed = parseContent(ref.type, tree[ref.path] ?? '', ref.path)
    expect(parsed.ok, ref.path).toBe(true)
    if (parsed.ok) expect(writeContent(ref.type, parsed.value as never), ref.path).toBe(tree[ref.path])
  }
  // And nothing under content/ is left out of the project.
  const listed = new Set(project.value.content.map((ref) => ref.path))
  const json = Object.keys(tree).filter((path) => path.startsWith('content/') && path.endsWith('.json'))
  expect(json.sort()).toEqual([...listed].sort())
})

test("the template's rules break no rule", () => {
  const sources = Object.fromEntries(
    Object.entries(tree).filter(([path]) => path.startsWith('src/') && path.endsWith('.ts')),
  )
  // `package.json` is what `create` writes from `package.template.json`; the rules read only its "imports".
  const problems = ruleProblems({ ...sources, 'package.json': tree['package.template.json'] ?? '{}' })
  expect(problems).toEqual([])
})

test("its tools are this repo's versions", () => {
  const own = JSON.parse(tree['package.template.json'] ?? '{}') as { devDependencies: Record<string, string> }
  for (const [name, version] of Object.entries(own.devDependencies))
    expect(rootPackage.devDependencies[name], name).toBe(version)
})

test('its workflow pins every action to a commit that ci.yml also pins', () => {
  const pins = (text: string): string[] =>
    [...text.matchAll(/uses: (\S+@[0-9a-f]{40})/g)].map((m) => m[1] ?? '')
  const ours = pins(tree['.github/workflows/check.yml'] ?? '')
  const ci = pins(readFileSync('.github/workflows/ci.yml', 'utf8'))
  expect(ours.length).toBe(2)
  for (const pin of ours) expect(ci, pin).toContain(pin)
  // No other `uses:` line: every action is pinned.
  expect((tree['.github/workflows/check.yml'] ?? '').match(/uses:/g)?.length).toBe(ours.length)
})

test('the three files with another name are there, and the real names are not', () => {
  for (const name of ['package.template.json', 'biome.template.json', 'gitignore'])
    expect(tree[name], name).toBeDefined()
  for (const name of ['package.json', 'biome.json', '.gitignore']) expect(tree[name], name).toBeUndefined()
})
