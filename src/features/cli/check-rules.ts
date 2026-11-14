// The `rules` step: a game's rules (`src/headless.ts` and every file it reaches) run with no page, no clock and no files,
// and must end a play the same on every machine, so a name that breaks that is found in their text and said in words.
// It looks at text, not at a syntax tree: it can be fooled by a string that looks like a name, and it cannot see a name
// built at run time. The replays catch what it does not; it exists so the mistake is named at its line, not found as a
// hash that moved.
import { join } from 'node:path'
import { Effect } from 'effect'
import { importsOf, resolveImport, withoutComments } from '../../lib/imports.ts'
import type { Diagnostic } from '../content/content.ts'
import type { GameFolder } from './game-folder.ts'
import { Files, type FilesService } from './ports.ts'
import type { StepReport } from './report.ts'

const HEADLESS = 'src/headless.ts'
const ENTRY = '@automataframework/framework/headless'
const PAGE_ENTRY = '@automataframework/framework'

const NO_DICE = (name: string): string =>
  `${name} is not allowed in the game's rules: the same play must end the same on every machine. Use ctx.rng.`
const NO_CLOCK = (name: string): string =>
  `${name} is not allowed in the game's rules: they have no clock. Count ticks with ctx.tick.`
const NO_IO = (name: string): string =>
  `${name} is not allowed in the game's rules: they read no file and no network. Put what they need in a content file.`

/** The `Math` names that differ between browsers, and the ones the framework has its own of (`dmath`). */
const MATH_THAT_DIFFERS = [
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'exp',
  'log',
  'log2',
  'log10',
  'pow',
  'hypot',
  'cbrt',
  'sinh',
  'cosh',
  'tanh',
  'asinh',
  'acosh',
  'atanh',
  'expm1',
  'log1p',
]
const FRAMEWORK_HAS = new Set(['sin', 'cos', 'tan', 'atan', 'atan2', 'exp', 'log', 'pow', 'hypot'])

const mathSentence = (fn: string): string =>
  FRAMEWORK_HAS.has(fn)
    ? `Math.${fn} can differ between browsers. Use the framework's own ${fn}, from "${ENTRY}".`
    : `Math.${fn} can differ between browsers. There is no safe one yet: work it out from whole numbers.`

interface NameRule {
  readonly pattern: RegExp
  readonly sentence: string
}

const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** A name as a whole word: not the end of a longer one, so `Math.sin` is not found in `Math.sinh`. */
const named = (name: string, sentence: string, after = '(?![\\w$])', before = '(?<![\\w$])'): NameRule => ({
  pattern: new RegExp(`${before}${escaped(name)}${after}`, 'g'),
  sentence,
})

const NAME_RULES: readonly NameRule[] = [
  ...['Math.random', 'crypto.getRandomValues', 'crypto.randomUUID'].map((n) => named(n, NO_DICE(n))),
  ...[
    'Date.now',
    'performance.now',
    'setTimeout',
    'setInterval',
    'setImmediate',
    'queueMicrotask',
    'requestAnimationFrame',
  ].map((n) => named(n, NO_CLOCK(n))),
  { pattern: /(?<![\w$])new\s+Date(?![\w$])/g, sentence: NO_CLOCK('new Date') },
  { pattern: /(?<![.\w$])fetch\s*\(/g, sentence: NO_IO('fetch') },
  { pattern: /(?<![.\w$])process\./g, sentence: NO_IO('process') },
  ...MATH_THAT_DIFFERS.map((fn) => named(`Math.${fn}`, mathSentence(fn))),
]

/** What `package.json` says `#` imports mean: `"#hero/*": "./src/features/hero/*"`, as a function of the specifier. */
type HashImports = (spec: string) => string | undefined

function hashImports(packageJson: string | undefined): HashImports {
  let imports: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(packageJson ?? '{}') as { imports?: Record<string, unknown> }
    imports = parsed.imports ?? {}
  } catch {
    // A package.json that is not JSON has no imports.
  }
  /** Where a key's target leads, with `*` filled in when the specifier matches the key. */
  const lead = (key: string, target: unknown, spec: string): string | undefined => {
    const where = typeof target === 'string' ? target : (target as { default?: unknown } | null)?.default
    if (typeof where !== 'string' || !where.startsWith('./')) return undefined
    const star = key.indexOf('*')
    if (star === -1) return key === spec ? resolveImport('package.json', where) : undefined
    const head = key.slice(0, star)
    const tail = key.slice(star + 1)
    if (!spec.startsWith(head) || !spec.endsWith(tail)) return undefined
    const filled = spec.slice(head.length, spec.length - tail.length)
    return resolveImport('package.json', where.replace('*', filled))
  }
  return (spec) => {
    for (const [key, target] of Object.entries(imports)) {
      const found = lead(key, target, spec)
      if (found !== undefined) return found
    }
    return undefined
  }
}

/** What one import means for the rules: a sentence when it is not allowed, the file it leads to, or nothing. */
function judge(
  file: string,
  imported: { readonly spec: string; readonly typeOnly: boolean },
  hash: HashImports,
): string | { readonly follow: string } | undefined {
  const { spec, typeOnly } = imported
  if (spec.startsWith('.')) {
    return spec.endsWith('.ts')
      ? { follow: resolveImport(file, spec) }
      : 'Write the whole file name, like "./move.ts": automata loads these files as they are.'
  }
  if (spec.startsWith('#')) {
    const target = hash(spec)
    return target === undefined
      ? `"${spec}" is not in the "imports" of this game's package.json, so it cannot be found.`
      : { follow: target }
  }
  if (spec.startsWith('node:')) return NO_IO(spec)
  if (spec === ENTRY || (spec === PAGE_ENTRY && typeOnly)) return undefined
  if (spec === PAGE_ENTRY)
    return `Import from "${ENTRY}" here: this file is part of the game's rules, which run with no page.`
  return `The game's rules may import only "${ENTRY}" and the game's own files, not "${spec}".`
}

interface Found {
  readonly file: string
  /** Where in the file's text, to put problems in the order they are read. */
  readonly index: number
  readonly line: number
  readonly message: string
}

/**
 * What is wrong in a game's rules. `files` is every `.ts` under `src/` and the `package.json`, keyed by path from the
 * game's root; the rules are `src/headless.ts` and every file it reaches by an import. Sorted by file, then by place.
 */
export function ruleProblems(files: Readonly<Record<string, string>>): Diagnostic[] {
  if (files[HEADLESS] === undefined)
    return [
      {
        file: HEADLESS,
        path: '',
        message: "This file is missing. It lists the game's rules: export const gamePlugins = [ ... ].",
      },
    ]
  const hash = hashImports(files['package.json'])
  const found: Found[] = []
  const seen = new Set<string>()
  const queue = [HEADLESS]
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    if (seen.has(file)) continue
    seen.add(file)
    const code = withoutComments(files[file] ?? '')
    // `withoutComments` keeps every line break, so a line counted in `code` is the file's line.
    const add = (index: number, message: string): void => {
      found.push({ file, index, line: code.slice(0, index).split('\n').length, message })
    }
    for (const rule of NAME_RULES) for (const m of code.matchAll(rule.pattern)) add(m.index, rule.sentence)
    for (const imported of importsOf(code)) {
      const verdict = judge(file, imported, hash)
      if (typeof verdict === 'string') add(imported.index, verdict)
      else if (verdict !== undefined) queue.push(verdict.follow)
    }
  }
  return found
    .sort((a, b) => (a.file === b.file ? a.index - b.index : a.file < b.file ? -1 : 1))
    .map((f) => ({ file: f.file, path: `line ${f.line}`, message: f.message }))
}

/** The rules step: every `.ts` under `src/` and the `package.json` are read, and `ruleProblems` says what is wrong. */
export function rulesStep(game: GameFolder): Effect.Effect<StepReport, never, FilesService> {
  return Effect.gen(function* () {
    const files = yield* Files
    const texts: Record<string, string> = {}
    for (const name of yield* files.list(join(game.folder, 'src'))) {
      if (!name.endsWith('.ts')) continue
      const text = yield* files.readText(join(game.folder, 'src', name))
      if (text !== undefined) texts[`src/${name}`] = text
    }
    const packageJson = yield* files.readText(join(game.folder, 'package.json'))
    if (packageJson !== undefined) texts['package.json'] = packageJson
    const problems = ruleProblems(texts)
    const state = problems.length > 0 ? 'failed' : 'passed'
    return { step: 'rules', state, problems, notes: [] } satisfies StepReport
  })
}
