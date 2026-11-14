import { Effect } from 'effect'
import { expect, test } from 'vitest'
import { runCheck } from '#src/features/cli/check.ts'
import { main } from '#src/features/cli/cli.ts'
import type { GameCode } from '#src/features/cli/ports.ts'
import { runReplays } from '#src/features/cli/replay.ts'
import { loadGame, READ_MARKS_FILE, translationProblems } from '#src/features/content/content.ts'
import { FRAMEWORK_VERSION } from '#src/features/sim/sim.ts'
import * as framework from '#src/headless.ts'
import { gamePlugins } from '../../../template/src/headless.ts'
import { type Memory, memoryLayer } from '../../fixtures/cli/memory.ts'
import { templateInMemory } from '../../fixtures/cli/template.ts'
import { templateTree } from '../../template/tree.ts'

/** The memory layer with the real template where `create` reads it, and `files` besides. */
const withTemplate = (more: Record<string, string> = {}, code?: GameCode): Memory =>
  memoryLayer({ ...templateInMemory(), ...more }, code === undefined ? {} : { code })
/** A game made in English unless the call says another language. */
const made = async (args: string[], memory = withTemplate()): Promise<Memory> => {
  const source = args.includes('--source') ? [] : ['--source', 'en']
  expect(await main(['create', ...args, ...source], memory.layer)).toBe(0)
  return memory
}
const text = (memory: Memory, path: string): string => String(memory.files.get(path))
/** The files of the game that `create` wrote, by path from its folder. */
const written = (memory: Memory, folder: string): string[] =>
  [...memory.files.keys()]
    .filter((key) => key.startsWith(`${folder}/`))
    .map((key) => key.slice(folder.length + 1))

test('it writes every template file, the three under their real names', async () => {
  const memory = await made(['my-game'])
  const files = written(memory, 'my-game')
  expect(files).toEqual(
    expect.arrayContaining([
      'package.json',
      'biome.json',
      '.gitignore',
      '.mcp.json',
      'automata.toml',
      'src/headless.ts',
    ]),
  )
  expect(files.filter((file) => file.endsWith('.template.json') || file === 'gitignore')).toEqual([])
})

test('the new game passes the files and rules steps as it is', async () => {
  const memory = await made(['my-game'])
  for (const only of ['files', 'rules'] as const) {
    const check = runCheck({ folder: 'my-game', only })
    const report = await Effect.runPromise(Effect.provide(check, memory.layer))
    expect(report.steps[0]?.problems, only).toEqual([])
    expect(report.steps[0]?.state, only).toBe('passed')
  }
})

test('it paints the pictures its figures make, so the new game has them and the art step passes', async () => {
  const memory = await made(['my-game'])
  const files = written(memory, 'my-game')
  expect(files).toEqual(
    expect.arrayContaining([
      'content/figures/hero.png',
      'content/figures/hero.atlas.json',
      'content/figures/crate.png',
      'content/figures/crate.atlas.json',
    ]),
  )
  const report = await Effect.runPromise(
    Effect.provide(runCheck({ folder: 'my-game', only: 'art' }), memory.layer),
  )
  expect(report.steps[0]).toEqual({ step: 'art', state: 'passed', problems: [], notes: [] })
  // And the files step does not call an atlas a file nobody lists.
  const filesReport = await Effect.runPromise(
    Effect.provide(runCheck({ folder: 'my-game', only: 'files' }), memory.layer),
  )
  expect(filesReport.steps[0]?.problems).toEqual([])
})

test('its recording still says "as recorded"', async () => {
  const code: GameCode = { framework, rules: { plugins: gamePlugins } }
  const memory = await made(['my-game'], withTemplate({}, code))
  const results = await Effect.runPromise(Effect.provide(runReplays({ folder: 'my-game' }), memory.layer))
  // The message rides along, so a failure says why the play could not start.
  expect(results.map((result) => `${result.verdict}: ${result.message}`)).toEqual([
    expect.stringMatching(/^ok: Played 300 ticks and ended on [0-9a-f]{16}, as recorded\.$/),
  ])
})

test('the name goes into package.json, the saves id and the README, and nowhere else', async () => {
  const memory = await made(['crate-pusher'])
  const files = written(memory, 'crate-pusher')
  for (const file of files) expect(text(memory, `crate-pusher/${file}`), file).not.toContain('my-game')
  const naming = files.filter((file) => text(memory, `crate-pusher/${file}`).includes('crate-pusher'))
  expect(naming.sort()).toEqual(['README.md', 'package.json', 'src/features/page/page.ts'])
  expect(JSON.parse(text(memory, 'crate-pusher/package.json')).name).toBe('crate-pusher')
})

test('the framework is its own exact version, or the spec given', async () => {
  const own = await made(['my-game'])
  const manifest = JSON.parse(text(own, 'my-game/package.json')) as {
    dependencies: Record<string, string>
    pnpm?: unknown
  }
  expect(manifest.dependencies['@automataframework/framework']).toBe(FRAMEWORK_VERSION)
  expect(manifest.pnpm).toBeUndefined()
  for (const file of written(own, 'my-game'))
    expect(text(own, `my-game/${file}`), file).not.toContain('0.0.0-template')

  const spec = 'github:mcthaydt/AutomataFramework#abc'
  const git = await made(['my-game', '--framework', spec])
  expect(JSON.parse(text(git, 'my-game/package.json'))).toMatchObject({
    dependencies: { '@automataframework/framework': spec },
    pnpm: {
      onlyBuiltDependencies: [
        '@automataframework/framework@https://codeload.github.com/mcthaydt/AutomataFramework/tar.gz/abc',
      ],
    },
  })
})

test('it ends with what to type next', async () => {
  const memory = await made(['my-game'])
  expect(memory.out).toEqual([
    'Made my-game.',
    'Its words are written in English. To change that, change source in automata.toml.',
    '',
    'Next:',
    '  cd my-game',
    '  npm install',
    '  npm run dev',
    '',
    'npm run check says whether the game is sound. AGENTS.md tells an agent where everything is.',
  ])
})

test('--json prints what was made', async () => {
  const memory = await made(['my-game', '--json'])
  const printed = JSON.parse(memory.out.join('\n')) as { folder: string; source: string; files: string[] }
  expect(printed.folder).toBe('my-game')
  expect(printed.source).toBe('en')
  expect(printed.files).toEqual(expect.arrayContaining(['package.json', 'automata.toml']))
})

test('a name that is not a folder name writes nothing', async () => {
  for (const name of ['My Game', 'my_game', 'a/', '-a', '9lives', 'a'.repeat(41)]) {
    const memory = withTemplate()
    const before = memory.files.size
    expect(await main(['create', name], memory.layer), name).toBe(2)
    expect(memory.err, name).toEqual([
      `"${name}" cannot be a game's folder. Use small letters, numbers and dashes, like my-game.`,
    ])
    expect(memory.files.size, name).toBe(before)
  }
})

test('no name is asked for', async () => {
  const memory = withTemplate()
  expect(await main(['create'], memory.layer)).toBe(2)
  expect(memory.err).toEqual(['Give the new game a name: automata create my-game'])
})

test('a folder with something in it is refused, and an empty one is used', async () => {
  const taken = withTemplate({ 'my-game/notes.txt': 'mine' })
  const before = taken.files.size
  expect(await main(['create', 'my-game'], taken.layer)).toBe(2)
  expect(taken.err).toEqual([
    'There is already something in my-game. Pick another name, or empty that folder first.',
  ])
  expect(taken.files.size).toBe(before)
  // The memory layer has no empty folders, so "empty" is "has no files": another name in the same place is the same.
  expect(await main(['create', 'your-game', '--source', 'en'], taken.layer)).toBe(0)
})

test('a folder with a space in its path is quoted in the cd line, so it can be pasted', async () => {
  const memory = await made(['my games/first-one'])
  expect(memory.out).toContain('  cd "my games/first-one"')
})

test('a path before the name says where, and a name beside is fine', async () => {
  const memory = await made(['games/first-one'])
  expect(written(memory, 'games/first-one')).toEqual(expect.arrayContaining(['package.json']))
  expect(memory.out).toContain('  cd games/first-one')
  expect(memory.out[0]).toBe('Made first-one.')
  const beside = await made(['../crate-pusher'])
  expect(beside.out[0]).toBe('Made crate-pusher.')
})

// The language the game's own words are written in: asked for, or the machine's, and never English by default.
const ASK =
  "Say which language you write the game's words in: add --source with one of zh, es, en, pt, ja, ko, like automata create my-game --source es."
const sourceLines = (memory: Memory, folder = 'my-game'): string[] =>
  text(memory, `${folder}/automata.toml`).match(/^source = .*$/gm) ?? []

test('--source ko writes source = "ko", marks made against Korean, and a game that loads and has no word missing', async () => {
  const memory = await made(['my-game', '--source', 'ko'])
  expect(sourceLines(memory)).toEqual(['source = "ko"'])
  expect(text(memory, `my-game/${READ_MARKS_FILE}`)).toBe('format = 2\nsource = "ko"\n')
  const printed = memory.out.join('\n')
  expect(printed).toContain(
    'Its words are written in Korean. To change that, change source in automata.toml.',
  )
  const report = await Effect.runPromise(
    Effect.provide(runCheck({ folder: 'my-game', only: 'files' }), memory.layer),
  )
  expect(report.steps[0]?.problems).toEqual([])
  const loaded = await loadGame(async (path) => {
    const file = memory.files.get(`my-game/${path}`)
    if (file === undefined) throw new Error(`${path}: no such file`)
    return typeof file === 'string' ? file : new TextDecoder().decode(file)
  })
  if (!loaded.ok) throw new Error('the new game does not load')
  expect(loaded.value.project.source).toBe('ko')
  expect(translationProblems(loaded.value)).toEqual([])
})

test("--source en keeps the template's own marks file, byte for byte", async () => {
  const memory = await made(['my-game', '--source', 'en'])
  expect(sourceLines(memory)).toEqual(['source = "en"'])
  expect(text(memory, `my-game/${READ_MARKS_FILE}`)).toBe(templateTree()[READ_MARKS_FILE])
})

test("the machine's own language is the source when none is given", async () => {
  const memory = memoryLayer(templateInMemory(), { deviceLanguages: ['ja_JP.UTF-8'] })
  expect(await main(['create', 'my-game'], memory.layer)).toBe(0)
  expect(sourceLines(memory)).toEqual(['source = "ja"'])
  expect(text(memory, `my-game/${READ_MARKS_FILE}`)).toBe('format = 2\nsource = "ja"\n')
})

test("the first of the machine's languages the framework has words in is used", async () => {
  const memory = memoryLayer(templateInMemory(), {
    deviceLanguages: ['C.UTF-8', 'fr_FR.UTF-8', 'pt_BR.UTF-8'],
  })
  expect(await main(['create', 'my-game', '--json'], memory.layer)).toBe(0)
  expect(sourceLines(memory)).toEqual(['source = "pt"'])
})

test('with no language asked for and none the machine speaks, it stops and asks, and writes nothing', async () => {
  for (const deviceLanguages of [[], ['C.UTF-8'], ['fr_FR.UTF-8']]) {
    const memory = memoryLayer(templateInMemory(), { deviceLanguages })
    const before = memory.files.size
    expect(await main(['create', 'my-game'], memory.layer), deviceLanguages.join()).toBe(2)
    expect(memory.err, deviceLanguages.join()).toEqual([ASK])
    expect(memory.files.size, deviceLanguages.join()).toBe(before)
  }
})

test('a language that is not one of the six is refused in words, and nothing is written', async () => {
  const memory = withTemplate()
  const before = memory.files.size
  expect(await main(['create', 'my-game', '--source', 'fr'], memory.layer)).toBe(2)
  expect(memory.err).toEqual([
    '"fr" is not a language a game can be written in. Use one of zh, es, en, pt, ja, ko, like --source es.',
  ])
  expect(memory.files.size).toBe(before)
})

test("a language asked for beats the machine's", async () => {
  const memory = memoryLayer(templateInMemory(), { deviceLanguages: ['ja_JP.UTF-8'] })
  expect(await main(['create', 'my-game', '--source', 'es'], memory.layer)).toBe(0)
  expect(sourceLines(memory)).toEqual(['source = "es"'])
})

test('a template with no source line, or two, is refused by name, and nothing is written', async () => {
  const tree = templateInMemory()
  const path = [...Object.keys(tree)].find((key) => key.endsWith('automata.toml')) ?? ''
  for (const toml of ['name = "x"\n', `${tree[path] ?? ''}\nsource = "ko"\n`]) {
    const memory = memoryLayer({ ...tree, [path]: toml })
    const before = memory.files.size
    expect(await main(['create', 'my-game', '--source', 'en'], memory.layer)).toBe(2)
    expect(memory.err[0]).toContain('must have exactly one source line')
    expect(memory.files.size).toBe(before)
  }
})
