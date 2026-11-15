// The template game's files, as they are on disk: they load, they are in the standard form, their rules break no rule,
// and what `create` renames is where it is expected.
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { libraryFiles, makeSound } from '#src/features/audio/audio.ts'
import { ruleProblems } from '#src/features/cli/check-rules.ts'
import { loadGame, parseContent, parseProject, writeContent } from '#src/features/content/content.ts'
import { listTemplate, readTemplate, templateTree } from './tree.ts'

const tree = templateTree()
const rootPackage = JSON.parse(readFileSync('package.json', 'utf8')) as {
  devDependencies: Record<string, string>
}

test('the template loads with no problems', async () => {
  const loaded = await loadGame(readTemplate(), listTemplate())
  expect(loaded.ok ? [] : loaded.diagnostics).toEqual([])
})

test('every content file is exactly what writeContent writes', () => {
  const project = parseProject(tree['automata.toml'] ?? '')
  expect(project.ok).toBe(true)
  if (!project.ok) return
  expect(project.value.content.length).toBe(14)
  // The files a folder block lists are the ones directly inside it.
  const inFolders = (project.value.folders ?? []).flatMap((ref) =>
    Object.keys(tree)
      .filter((path) => path.startsWith(`${ref.folder}/`) && !path.slice(ref.folder.length + 1).includes('/'))
      .map((path) => ({ type: ref.type, path })),
  )
  for (const ref of [...project.value.content, ...inFolders]) {
    const parsed = parseContent(ref.type, tree[ref.path] ?? '', ref.path)
    expect(parsed.ok, ref.path).toBe(true)
    if (parsed.ok) expect(writeContent(ref.type, parsed.value as never), ref.path).toBe(tree[ref.path])
  }
  // And nothing under content/ is left out of the project.
  const listed = new Set([...project.value.content, ...inFolders].map((ref) => ref.path))
  const json = Object.keys(tree).filter((path) => path.startsWith('content/') && path.endsWith('.json'))
  expect(json.sort()).toEqual([...listed].sort())
})

test('the template lists a folder each for sounds, music, loops, motifs and cues, and none for feels', () => {
  const project = parseProject(tree['automata.toml'] ?? '')
  expect(project.ok && project.value.folders).toEqual([
    { type: 'sound', folder: 'content/sounds' },
    { type: 'music', folder: 'content/music' },
    { type: 'loop', folder: 'content/loops' },
    { type: 'motif', folder: 'content/motifs' },
    { type: 'cues', folder: 'content/cues' },
  ])
  // The sound is the kind's first take and the song is the library's calm style, byte for byte.
  expect(tree['content/sounds/jump.json']).toBe(writeContent('sound', makeSound('jump', 0)))
  for (const file of libraryFiles('calm', 'meadow')) {
    const path = `content/${file.type === 'music' ? 'music/meadow' : `loops/${file.value.id}`}.json`
    expect(tree[path], path).toBe(writeContent(file.type, file.value as never))
  }
})

test("the template's rules break no rule", () => {
  const sources = Object.fromEntries(
    Object.entries(tree).filter(([path]) => path.startsWith('src/') && path.endsWith('.ts')),
  )
  // `package.json` is what `create` writes from `package.template.json`; the rules read only its "imports".
  const problems = ruleProblems({ ...sources, 'package.json': tree['package.template.json'] ?? '{}' })
  expect(problems).toEqual([])
})

test("the template's hero is the framework's: no movement code, and no controls in code", () => {
  const sources = Object.entries(tree).filter(([path]) => path.startsWith('src/') && path.endsWith('.ts'))
  for (const [path, text] of sources) {
    expect(text, path).not.toMatch(/\b(isHeld|wasPressed)\b/)
    expect(text, path).not.toMatch(/export const CONTROLS\b/)
  }
  expect(Object.keys(tree).filter((path) => /(move|controls)\.ts$/.test(path))).toEqual([])
  const hero = JSON.parse(tree['content/characters/hero.json'] ?? '{}') as { moves?: { tuning: string } }
  expect(hero.moves?.tuning).toBe('hero-moves')
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

test("the template's page says no language of its own: no lang on the page, no English in its code", () => {
  expect(tree['index.html']).toBeDefined()
  expect(tree['index.html']).not.toMatch(/<html[^>]*\blang=/)
  // A developer who meets a page with no `lang` is told why, where they look.
  expect(tree['index.html']).toContain('No `lang` on purpose')
  const inCode = Object.entries(tree).filter(
    ([path, text]) => path.startsWith('src/') && /(['"])en\1/.test(text),
  )
  expect(inCode.map(([path]) => path)).toEqual([])
  // Its one English: the language its own words are written in, named once in the project file.
  expect((tree['automata.toml'] ?? '').match(/^source = "en"$/gm)).toHaveLength(1)
  // The game's own linter is told why the page has no lang, or `npm run check` would fail on a new game.
  expect(JSON.parse(tree['biome.template.json'] ?? '{}').overrides).toEqual([
    { includes: ['index.html'], linter: { rules: { a11y: { useHtmlLang: 'off' } } } },
  ])
})
