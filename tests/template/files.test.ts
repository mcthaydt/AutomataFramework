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
  expect(project.value.content.length).toBe(22)
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

test('the template names done, lost, score, levels and players, and a goal for its level in six languages', async () => {
  const project = parseProject(tree['automata.toml'] ?? '')
  expect(project.ok).toBe(true)
  if (!project.ok) return
  expect(project.value).toMatchObject({
    players: 2,
    levels: ['level-1'],
    done: 'door.touched',
    lost: 'hero.fell',
    score: 'hero.score.sparks',
  })
  const loaded = await loadGame(readTemplate())
  if (!loaded.ok) throw new Error(loaded.diagnostics.map((d) => d.message).join('\n'))
  for (const language of ['en', 'es', 'ko', 'ja', 'zh', 'pt'] as const)
    expect(loaded.value.messages?.[language]?.messages['level.level-1.goal'], language).toBeTruthy()
})

test('no message key starts with page., since the framework says what a page used to', async () => {
  for (const path of Object.keys(tree).filter((p) => p.startsWith('content/messages/')))
    expect(tree[path], path).not.toContain('"page.')
})

test('every feel and cue of the template names an event its game can raise', () => {
  // The events the template's rules and the framework's own raise: the hero landing, a spark taken, a hero falling.
  const raised = ['hero.landed', 'spark.taken', 'hero.fell']
  for (const path of Object.keys(tree).filter((p) => /^content\/(feels|cues)\//.test(p))) {
    const file = JSON.parse(tree[path] ?? '{}') as { on?: string; cues?: { on: string }[] }
    for (const on of file.cues === undefined ? [file.on] : file.cues.map((cue) => cue.on))
      expect(raised, `${path}: ${on}`).toContain(on)
  }
})

test("page.ts imports only the framework and the game's own files, calls startFlow once, and is under 60 lines", () => {
  const page = tree['src/features/page/page.ts'] ?? ''
  expect(page.split('\n').length).toBeLessThan(60)
  expect(page.match(/startFlow\(/g)).toHaveLength(1)
  for (const m of page.matchAll(/from '([^']+)'/g))
    expect(m[1] === '@automataframework/framework' || m[1]?.startsWith('.'), m[1]).toBe(true)
})

test("the template's play test is wired in, and `npm test` never needs a browser", () => {
  for (const name of ['tests/play/play.test.ts', 'tests/play/serve.ts', 'vitest.play.config.ts'])
    expect(tree[name], name).toBeDefined()
  const own = JSON.parse(tree['package.template.json'] ?? '{}') as {
    scripts: Record<string, string>
    devDependencies: Record<string, string>
  }
  expect(own.scripts.build).toBe('vite build')
  expect(own.scripts['play-test']).toBe('vitest run --config vitest.play.config.ts')
  expect(own.devDependencies.playwright).toBe('1.63.0')
  expect(tree['vite.config.ts']).toContain("exclude: ['tests/play/**', 'node_modules/**', 'dist/**']")
  expect(tree['vitest.play.config.ts']).toContain("include: ['tests/play/**/*.test.ts']")
  expect(tree['vitest.play.config.ts']).toContain('testTimeout: 120_000')
})

test("the template's workflow has a play job after check that builds, then plays", () => {
  const workflow = tree['.github/workflows/check.yml'] ?? ''
  const play = workflow.slice(workflow.indexOf('\n  play:'))
  expect(play).toContain('needs: check')
  const runs = [...play.matchAll(/^\s*- run: (.+)$/gm)].map((m) => m[1])
  expect(runs).toEqual([
    'npm install',
    'npx playwright install --with-deps chromium webkit',
    'npm run build',
    'npm run play-test',
  ])
})

test('its workflow pins every action to a commit', () => {
  const pins = (text: string): string[] =>
    [...text.matchAll(/uses: (\S+@[0-9a-f]{40})/g)].map((m) => m[1] ?? '')
  const ours = pins(tree['.github/workflows/check.yml'] ?? '')
  // Two jobs, `check` and `play`, each with the same two actions.
  expect(ours.length).toBe(4)
  // No other `uses:` line: every action is pinned.
  expect((tree['.github/workflows/check.yml'] ?? '').match(/uses:/g)?.length).toBe(ours.length)
})

test('building the game puts its own files beside the page, since the page reads them from there', () => {
  const config = tree['vite.config.ts'] ?? ''
  for (const name of ["'automata.toml'", "'content'", "'replays'"]) expect(config, name).toContain(name)
})
