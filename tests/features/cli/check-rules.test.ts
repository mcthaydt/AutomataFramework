import { Effect } from 'effect'
import { expect, test } from 'vitest'
import { runCheck } from '#src/features/cli/check.ts'
import { ruleProblems } from '#src/features/cli/check-rules.ts'
import { HEADLESS_SOURCE, smallGame, under } from '../../fixtures/cli/game.ts'
import { memoryLayer } from '../../fixtures/cli/memory.ts'

const HERO = 'src/features/hero/hero.ts'
const MORE = 'src/features/hero/more.ts'
const HEADLESS = 'src/headless.ts'
const PAGE = '@automataframework/framework'
const ENTRY = '@automataframework/framework/headless'

/** A game of two files: the one that lists the rules, and the hero it imports, whose text is the test's. */
const game = (hero: string, extra: Readonly<Record<string, string>> = {}): Record<string, string> => ({
  [HEADLESS]: HEADLESS_SOURCE,
  [HERO]: hero,
  ...extra,
})
const found = (hero: string, extra?: Readonly<Record<string, string>>) => ruleProblems(game(hero, extra))
/** What a problem on `line` of the hero's file is. */
const at = (line: number, message: string, file = HERO) => ({ file, path: `line ${line}`, message })
/** Two lines, the second of which uses `code`. */
const using = (code: string): string => `export const x = 1\nexport const y = ${code}\n`

const NO_DICE = (name: string): string =>
  `${name} is not allowed in the game's rules: the same play must end the same on every machine. Use ctx.rng.`
const NO_CLOCK = (name: string): string =>
  `${name} is not allowed in the game's rules: they have no clock. Count ticks with ctx.tick.`
const NO_IO = (name: string): string =>
  `${name} is not allowed in the game's rules: they read no file and no network. Put what they need in a content file.`

test('dice of the game own are not allowed in its rules', () => {
  expect(found(using('Math.random()'))).toEqual([at(2, NO_DICE('Math.random'))])
  expect(found(using('crypto.getRandomValues(new Uint8Array(1))'))).toEqual([
    at(2, NO_DICE('crypto.getRandomValues')),
  ])
  expect(found(using('crypto.randomUUID()'))).toEqual([at(2, NO_DICE('crypto.randomUUID'))])
})

test.each([
  ['Date.now()', 'Date.now'],
  ['new Date()', 'new Date'],
  ['performance.now()', 'performance.now'],
  ['setTimeout(() => 1, 1)', 'setTimeout'],
  ['setInterval(() => 1, 1)', 'setInterval'],
  ['setImmediate(() => 1)', 'setImmediate'],
  ['queueMicrotask(() => 1)', 'queueMicrotask'],
  ['requestAnimationFrame(() => 1)', 'requestAnimationFrame'],
])('%s is a clock the rules do not have', (code, name) => {
  expect(found(using(code))).toEqual([at(2, NO_CLOCK(name))])
})

test('files and the network are not for the rules', () => {
  expect(found(using("fetch('/level.json')"))).toEqual([at(2, NO_IO('fetch'))])
  expect(found(using('process.env.HOME'))).toEqual([at(2, NO_IO('process'))])
  expect(found("import { readFileSync } from 'node:fs'\nexport const x = readFileSync\n")).toEqual([
    at(1, NO_IO('node:fs')),
  ])
})

test.each(['sin', 'cos', 'tan', 'atan', 'atan2', 'exp', 'log', 'pow', 'hypot'])(
  'Math.%s has a safe one in the framework',
  (name) => {
    expect(found(using(`Math.${name}(1)`))).toEqual([
      at(
        2,
        `Math.${name} can differ between browsers. Use the framework's own ${name}, from "${ENTRY}".`,
      ),
    ])
  },
)

test.each([
  'asin',
  'acos',
  'log2',
  'log10',
  'cbrt',
  'sinh',
  'cosh',
  'tanh',
  'asinh',
  'acosh',
  'atanh',
  'expm1',
  'log1p',
])('Math.%s has none yet', (name) => {
  expect(found(using(`Math.${name}(1)`))).toEqual([
    at(
      2,
      `Math.${name} can differ between browsers. There is no safe one yet: work it out from whole numbers.`,
    ),
  ])
})

test('the maths that every browser does the same is allowed', () => {
  const maths = 'Math.abs(-1) + Math.floor(1.5) + Math.sqrt(4) + Math.min(1, 2) + Math.round(2.5)'
  expect(found(using(maths))).toEqual([])
})

test('the page entry is not for the rules, but its types are', () => {
  expect(found(`import { startGame } from '${PAGE}'\nexport const x = startGame\n`)).toEqual([
    at(
      1,
      `Import from "${ENTRY}" here: this file is part of the game's rules, which run with no page.`,
    ),
  ])
  // A type-only import is gone once the game is compiled, so it reaches no page.
  expect(found(`import type { Game } from '${PAGE}'\nexport type X = Game\n`)).toEqual([])
})

test('any other package is not for the rules', () => {
  expect(found("import { chunk } from 'lodash'\nexport const x = chunk\n")).toEqual([
    at(1, `The game's rules may import only "${ENTRY}" and the game's own files, not "lodash".`),
  ])
})

test('a file import has to be written with its whole name', () => {
  const text = "import { a } from './more'\nimport { b } from './more.js'\nexport const x = [a, b]\n"
  const problems = found(text, { [MORE]: 'export const a = 1\n' })
  const sentence = 'Write the whole file name, like "./move.ts": automata loads these files as they are.'
  expect(problems).toEqual([at(1, sentence), at(2, sentence)])
})

test('a # import is found through the imports of the game package.json (audit M18)', () => {
  const headless = "import { heroPlugin } from '#hero/hero.ts'\nexport const gamePlugins = [heroPlugin]\n"
  const packageJson = JSON.stringify({ imports: { '#hero/*': './src/features/hero/*' } })
  // Found, so the file it names is a rules file like any other.
  expect(
    ruleProblems({ [HEADLESS]: headless, 'package.json': packageJson, [HERO]: using('Math.random()') }),
  ).toEqual([at(2, NO_DICE('Math.random'))])
  // Not found: the sentence, at the import.
  const without = { [HEADLESS]: headless, 'package.json': '{}', [HERO]: 'export const x = 1\n' }
  expect(ruleProblems(without)).toEqual([
    {
      file: HEADLESS,
      path: 'line 1',
      message:
        '"#hero/hero.ts" is not in the "imports" of this game\'s package.json, so it cannot be found.',
    },
  ])
})

test('a page file may use the clock and the page entry', () => {
  const main = `import { startGame } from '${PAGE}'\nexport const t = Date.now()\nexport const g = startGame\n`
  expect(found('export const x = 1\n', { 'src/main.ts': main })).toEqual([])
})

test('a file the rules reach two imports away is a rules file', () => {
  const problems = found("import { a } from './more.ts'\nexport const x = a\n", {
    [MORE]: 'export const a = Date.now()\n',
  })
  expect(problems).toEqual([at(1, NO_CLOCK('Date.now'), MORE)])
})

test('a name in a comment or after // is not found, and a comment does not move the lines', () => {
  const text = `// Math.random() would be wrong here\n/* Date.now()\n   and setTimeout */\nexport const x = 1 // fetch(\nexport const y = Math.random()\n`
  expect(found(text)).toEqual([at(5, NO_DICE('Math.random'))])
})

test('problems come sorted by file, then by where they are', () => {
  const problems = found("import { a } from './more.ts'\nexport const x = Math.random() + Date.now()\n", {
    [MORE]: 'export const a = setTimeout\n',
  })
  expect(problems.map((p) => [p.file, p.path])).toEqual([
    [HERO, 'line 2'],
    [HERO, 'line 2'],
    [MORE, 'line 1'],
  ])
  expect(problems.slice(0, 2).map((p) => p.message)).toEqual([NO_DICE('Math.random'), NO_CLOCK('Date.now')])
})

test('a missing src/headless.ts is the one problem', () => {
  expect(ruleProblems({ [HERO]: using('Math.random()') })).toEqual([
    {
      file: HEADLESS,
      path: '',
      message: "This file is missing. It lists the game's rules: export const gamePlugins = [ ... ].",
    },
  ])
})

test('the small game has none', () => {
  expect(ruleProblems(smallGame())).toEqual([])
})

// The step, over a folder: it reads every .ts under src/ and the package.json.
const rulesStep = async (files: Record<string, string>) => {
  const memory = memoryLayer(under('game', files))
  const report = await Effect.runPromise(
    runCheck({ folder: 'game', only: 'rules' }).pipe(Effect.provide(memory.layer)),
  )
  return report.steps[0]
}

test('the rules step passes on the small game', async () => {
  expect(await rulesStep(smallGame())).toEqual({ step: 'rules', state: 'passed', problems: [], notes: [] })
})

test('the rules step fails on a rule that reads the clock, naming the file and the line', async () => {
  const step = await rulesStep({ ...smallGame(), [HERO]: using('Date.now()') })
  expect(step?.state).toBe('failed')
  expect(step?.problems).toEqual([at(2, NO_CLOCK('Date.now'))])
})

test('a file under src/ that is not .ts is not read as rules', async () => {
  const step = await rulesStep({ ...smallGame(), 'src/style.css': 'body { color: red } /* Math.random */' })
  expect(step?.state).toBe('passed')
})
