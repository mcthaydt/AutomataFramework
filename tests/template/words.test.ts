// What the template's README and AGENTS.md say, held to what is true: the commands, the files and the skills they name
// are there, and nothing in the template tells a person to run a command that fetches a stranger's package.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { COMMAND_NAMES } from '#src/features/cli/args.ts'
import { TEMPLATE, templateTree } from './tree.ts'

const tree = templateTree()
const PAGES = ['README.md', 'AGENTS.md'] as const
/** The skills the package ships (Task 10 reads the folder itself; until then these four are the promise). */
const SKILLS = ['automata', 'automata-content', 'automata-rules', 'automata-api']
/** What `create` writes under another name, so it is not in `template/` under this one. */
const WRITTEN_BY_CREATE = ['package.json', 'biome.json', '.gitignore']

/** The text between backticks, line by line. */
const spans = (text: string): string[] => [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1] ?? '')

test('README.md and AGENTS.md are short enough to read', () => {
  expect((tree['README.md'] ?? '').split('\n').length).toBeLessThan(60)
  expect((tree['AGENTS.md'] ?? '').split('\n').length).toBeLessThan(80)
})

test('README.md and AGENTS.md name only commands, files and skills that exist', () => {
  const scripts = (JSON.parse(tree['package.template.json'] ?? '{}') as { scripts: Record<string, string> })
    .scripts
  for (const page of PAGES) {
    for (const span of spans(tree[page] ?? '')) {
      // `automata <command>`: the word after it is one of the commands.
      for (const m of span.matchAll(/(?:^|\s)automata ([a-z]+)/g))
        expect(COMMAND_NAMES, `${page}: ${span}`).toContain(m[1])
      // `npm run <script>`: the game's package.json has it.
      for (const m of span.matchAll(/npm run ([a-z]+)/g))
        expect(Object.keys(scripts), `${page}: ${span}`).toContain(m[1])
      // A path: a file or a folder of the game, or one `create` writes.
      const isPath =
        /^[\w./-]+$/.test(span) && (span.includes('/') || /\.(json|toml|ts|md|yml|css|html)$/.test(span))
      if (!isPath || span.startsWith('node_modules/')) continue
      expect(
        WRITTEN_BY_CREATE.includes(span) || existsSync(join(TEMPLATE, span)),
        `${page} names ${span}, which is not there`,
      ).toBe(true)
    }
  }
})

test('AGENTS.md names the skills the package ships, and no other', () => {
  const named = [...(tree['AGENTS.md'] ?? '').matchAll(/`(automata(?:-[a-z]+)?)`/g)].map((m) => m[1])
  expect(new Set(named)).toEqual(new Set(SKILLS))
})

test('neither names a colour, a competitor or a price', () => {
  for (const page of PAGES) {
    const text = tree[page] ?? ''
    expect(text, page).not.toMatch(
      /\b(red|green|blue|yellow|orange|purple|pink|black|white|gr[ae]y|brown)\b/i,
    )
    expect(text, page).not.toMatch(/\b(unity|godot|unreal|phaser|gamemaker|construct|defold)\b/i)
    expect(text, page).not.toMatch(/\$\d|\b(price|prices|pricing|paid)\b/i)
  }
})

test('nothing in the template says npx automata without --no', () => {
  // `npx automata` fetches npm's unrelated package of that name wherever the game's install is missing.
  for (const [path, text] of Object.entries(tree))
    expect(text, path).not.toMatch(/npx\s+(?!--no\s+automata\b)/)
})
