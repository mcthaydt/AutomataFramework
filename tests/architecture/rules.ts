// The repo's architecture rules, as one pure function over made-up or real file maps.
// `tests/architecture.test.ts` runs it over `src/`; `rules.test.ts` proves each rule fires on a small made-up map.
// Nothing here reads the file system, so a rule can be tested without one.

/** Feature folders, lowest first. A feature may import only itself, `src/lib/` and features before it in this list. */
export const LAYERS = [
  'sim',
  'physics',
  'commands',
  'net',
  'content',
  'level',
  'server',
  'render',
  'input',
  'host',
  'game',
] as const

/** Path from the repo root (with `/`) to the file's text. */
export type SourceFiles = Readonly<Record<string, string>>

export interface Violation {
  readonly file: string
  readonly rule: string
  readonly detail: string
}

const MAX_LINES = 600
/**
 * The features that must run the same on every machine: no clock, no randomness, no I/O.
 * `net` is one of them although `colyseus-link.ts` talks to a socket: that file's only I/O is the SDK it loads on
 * demand, and it reads no clock, so nothing here can change what a sim computes.
 */
const PURE_FEATURES: ReadonlySet<string> = new Set(['sim', 'physics', 'commands', 'net', 'level'])
/** Features that need a page (a DOM, a canvas): the headless entry may not reach them. */
const PAGE_FEATURES: ReadonlySet<string> = new Set(['render', 'input', 'host', 'game'])

const IMPURE: readonly { readonly pattern: RegExp; readonly what: string }[] = [
  { pattern: /\bMath\.random\b/, what: 'Math.random' },
  { pattern: /\bDate\.now\b/, what: 'Date.now' },
  { pattern: /\bnew Date\b/, what: 'new Date' },
  { pattern: /\bperformance\.now\b/, what: 'performance.now' },
  { pattern: /\bsetTimeout\b/, what: 'setTimeout' },
  { pattern: /\bsetInterval\b/, what: 'setInterval' },
  { pattern: /\bfetch\(/, what: 'fetch(' },
]

/** Which files may import which package: each is a prefix of the importing file's path (ending in `/`) or its exact path. */
const CONFINED: readonly {
  readonly package: RegExp
  readonly only: readonly string[]
  readonly why: string
}[] = [
  { package: /^koota(\/|$)/, only: ['src/features/sim/'], why: 'the ECS belongs to the sim' },
  {
    package: /^@dimforge\//,
    only: ['src/features/physics/rapier.ts', 'src/features/physics/rapier-wasm.ts'],
    why: 'Rapier stays behind the physics adapter and its loader',
  },
  { package: /^pixi\.js(\/|$)/, only: ['src/features/render/'], why: 'PixiJS is only for rendering' },
  { package: /^smol-toml$/, only: ['src/features/content/'], why: 'TOML is read only by content' },
  {
    package: /^@colyseus\/sdk$/,
    only: ['src/features/net/colyseus-link.ts'],
    why: 'the SDK is loaded on demand by one file, so loading the package loads no SDK',
  },
  {
    package: /^@colyseus\/(core|ws-transport|schema)$/,
    only: ['src/features/server/'],
    why: 'the room server is the only part that runs rooms',
  },
  {
    package: /^(effect(\/|$)|@effect\/)/,
    only: ['src/features/server/process.ts'],
    why: "Effect is only for the server's process",
  },
]

/** The one Node-only feature: only `src/server.ts` (the package's Node entry) may import it. */
const SERVER_FEATURE = 'server'
const SERVER_ENTRY = 'src/server.ts'

interface Source {
  readonly file: string
  readonly text: string
  readonly lines: number
  /** Resolved paths of relative imports; need not exist in the map. */
  readonly local: readonly string[]
  /** The part of `local` that exists at run time: `import type` and `export type` are erased and cannot cycle. */
  readonly runtime: readonly string[]
  /** Bare specifiers (packages, `node:` modules). */
  readonly packages: readonly string[]
}

/** Comments say why and may name the very things a rule forbids, so rules read the code without them. */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(?<![:'"`\w])\/\/.*$/gm, '')
}

const IMPORT_PATTERNS: readonly RegExp[] = [
  /\b(?:import|export)\s[^'";]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
]

interface Specifier {
  readonly spec: string
  /** `import type ... from` or `export type ... from`: gone after compiling. */
  readonly typeOnly: boolean
}

function specifiers(code: string): Specifier[] {
  const found: Specifier[] = []
  for (const pattern of IMPORT_PATTERNS) {
    for (const m of code.matchAll(pattern)) {
      found.push({ spec: m[1] ?? '', typeOnly: /^(?:import|export)\s+type\b/.test(m[0]) })
    }
  }
  return found
}

/** `from` is a file path; `to` a relative specifier. Gives a normalised path from the repo root. */
function resolve(from: string, to: string): string {
  const parts = from.split('/').slice(0, -1)
  for (const part of to.split('/')) {
    if (part === '.' || part === '') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function read(file: string, text: string): Source {
  const code = withoutComments(text)
  const local: string[] = []
  const runtime: string[] = []
  const packages: string[] = []
  for (const { spec, typeOnly } of specifiers(code)) {
    const path = spec.startsWith('.')
      ? resolve(file, spec)
      : spec.startsWith('#src/')
        ? `src/${spec.slice(5)}`
        : undefined
    if (path === undefined) packages.push(spec)
    else {
      local.push(path)
      if (!typeOnly) runtime.push(path)
    }
  }
  const lines = text.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  return { file, text: code, lines: lines.length, local, runtime, packages }
}

/** The feature a path is in, or undefined (`src/features/<name>/...`). */
function featureOf(path: string): string | undefined {
  return /^src\/features\/([^/]+)\//.exec(path)?.[1]
}

/** Strongly connected groups of more than one file, or one file that imports itself. */
function cycles(sources: ReadonlyMap<string, Source>): string[][] {
  // Tarjan's algorithm, iterative enough for a source tree: depth is bounded by the import chain.
  let counter = 0
  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const groups: string[][] = []
  const visit = (file: string): void => {
    index.set(file, counter)
    low.set(file, counter)
    counter++
    stack.push(file)
    onStack.add(file)
    for (const next of sources.get(file)?.runtime ?? []) {
      if (!sources.has(next)) continue
      if (!index.has(next)) {
        visit(next)
        low.set(file, Math.min(low.get(file) ?? 0, low.get(next) ?? 0))
      } else if (onStack.has(next)) {
        low.set(file, Math.min(low.get(file) ?? 0, index.get(next) ?? 0))
      }
    }
    if (low.get(file) === index.get(file)) {
      const group: string[] = []
      for (let top = stack.pop(); top !== undefined; top = stack.pop()) {
        onStack.delete(top)
        group.push(top)
        if (top === file) break
      }
      if (group.length > 1 || sources.get(file)?.runtime.includes(file)) groups.push(group.sort())
    }
  }
  for (const file of [...sources.keys()].sort()) if (!index.has(file)) visit(file)
  return groups
}

/** Every broken rule, sorted by file then rule, so two runs read the same. An empty list is a clean tree. */
export function checkArchitecture(files: SourceFiles): Violation[] {
  const out: Violation[] = []
  const add = (file: string, rule: string, detail: string): number => out.push({ file, rule, detail })
  const sources = new Map<string, Source>()
  for (const [file, text] of Object.entries(files)) sources.set(file, read(file, text))
  const layerOf = (feature: string): number => (LAYERS as readonly string[]).indexOf(feature)

  for (const source of sources.values()) {
    const { file } = source
    const feature = featureOf(file)

    if (source.lines > MAX_LINES)
      add(file, 'at-most-600-lines', `${source.lines} lines; split the file by job.`)
    if (file.startsWith('src/') && file.endsWith('.test.ts')) {
      add(file, 'no-tests-in-src', 'Tests live in tests/, mirroring src/.')
    }

    if (feature !== undefined && layerOf(feature) < 0) {
      add(file, 'unknown-feature', `"${feature}" is not one of: ${LAYERS.join(', ')}.`)
    }

    for (const target of source.local) {
      const into = featureOf(target)
      if (file.startsWith('src/lib/') && target.startsWith('src/features/')) {
        add(file, 'lib-is-below-features', `lib may not import ${target}.`)
        continue
      }
      if (into === undefined || into === feature) continue
      if (into === SERVER_FEATURE && file !== SERVER_ENTRY) {
        // Reported instead of `imports-go-down`, so a fault has one name.
        add(file, 'server-is-node-only', `Only ${SERVER_ENTRY} may import the server feature: it needs Node.`)
        if (target !== `src/features/${into}/${into}.ts`) {
          add(
            file,
            'through-the-entry',
            `Import ${into} through src/features/${into}/${into}.ts, not ${target}.`,
          )
        }
        continue
      }
      if (feature !== undefined && layerOf(into) > layerOf(feature)) {
        add(file, 'imports-go-down', `${feature} may not import ${into}, which is above it.`)
      }
      if (target !== `src/features/${into}/${into}.ts`) {
        add(
          file,
          'through-the-entry',
          `Import ${into} through src/features/${into}/${into}.ts, not ${target}.`,
        )
      }
    }

    const pure = file.startsWith('src/lib/') || (feature !== undefined && PURE_FEATURES.has(feature))
    if (pure) {
      for (const { pattern, what } of IMPURE) {
        if (pattern.test(source.text)) add(file, 'sim-is-pure', `${what} is not allowed on the sim side.`)
      }
      for (const spec of source.packages) {
        if (spec.startsWith('node:'))
          add(file, 'sim-is-pure', `${spec} is I/O and is not allowed on the sim side.`)
      }
    }

    for (const spec of source.packages) {
      for (const rule of CONFINED) {
        if (!rule.package.test(spec)) continue
        const allowed = rule.only.some((place) =>
          place.endsWith('/') ? file.startsWith(place) : file === place,
        )
        if (!allowed)
          add(file, 'package-confined', `${spec} is only for ${rule.only.join(' and ')}: ${rule.why}.`)
      }
    }
  }

  for (const group of cycles(sources))
    add(group[0] ?? '', 'no-cycles', `Import cycle: ${group.join(' -> ')}.`)

  // Features that have files must have their entry beside them.
  const seen = new Set<string>()
  for (const file of sources.keys()) {
    const feature = featureOf(file)
    if (feature === undefined || seen.has(feature)) continue
    seen.add(feature)
    if (!sources.has(`src/features/${feature}/${feature}.ts`)) {
      add(file, 'feature-has-entry', `src/features/${feature}/ needs ${feature}.ts, the feature's entry.`)
    }
  }

  // Walk the imports from the page-free entries. Headless may reach nothing that needs a page; neither entry may
  // reach the Node-only server, even through src/server.ts, because a game's page would load Node code.
  const reachFrom = (entry: string): string[] => {
    const reached = new Set<string>()
    const walk = (file: string): void => {
      for (const target of sources.get(file)?.local ?? []) {
        if (reached.has(target)) continue
        reached.add(target)
        walk(target)
      }
    }
    walk(entry)
    return [...reached].sort()
  }
  for (const entry of ['src/headless.ts', 'src/index.ts']) {
    if (!sources.has(entry)) continue
    const reached = reachFrom(entry)
    if (reached.includes(SERVER_ENTRY)) {
      add(entry, 'server-is-node-only', `${entry} reaches ${SERVER_ENTRY}, which needs Node.`)
    }
    if (entry !== 'src/headless.ts') continue
    for (const target of reached) {
      const feature = featureOf(target)
      if (feature !== undefined && PAGE_FEATURES.has(feature)) {
        add(entry, 'headless-is-headless', `${target} needs a page, so headless cannot reach it.`)
      }
    }
  }

  return out.sort((a, b) => (a.file === b.file ? a.rule.localeCompare(b.rule) : a.file.localeCompare(b.file)))
}
