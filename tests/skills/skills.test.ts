// The skills an agent reads to work on a game: their shape, and that what they say is true. A skill that names a command, a
// flag, a path or a kind of file that is not there sends an agent after something that does not exist.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, expect, test } from 'vitest'
import { COMMAND_NAMES } from '#src/features/cli/args.ts'
import { helpFor } from '#src/features/cli/help.ts'
import { controlsCommand, Player } from '#src/features/commands/commands.ts'
import { CONTENT_TYPES, type ContentType, parseContent, writeContent } from '#src/features/content/content.ts'
import { createGameSim } from '#src/features/level/level.ts'
import { Transform } from '#src/features/physics/physics.ts'
import type { PluginDef, Sim } from '#src/features/sim/sim.ts'
import { heroPlugin } from '../../template/src/features/hero/hero.ts'
import { loadTemplateGame } from '../template/game.ts'
import { doubleJumpPlugin } from './double-jump.ts'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const SKILLS = join(ROOT, 'skills')
const names = readdirSync(SKILLS).filter((name) => statSync(join(SKILLS, name)).isDirectory())
const text = (name: string): string => readFileSync(join(SKILLS, name, 'SKILL.md'), 'utf8')
const all = names.map((name) => ({ name, text: text(name) }))

test('every skill folder has a SKILL.md whose name is its folder and whose description is 1 to 1024 characters', () => {
  expect(names.sort()).toEqual(['automata', 'automata-api', 'automata-content', 'automata-rules'])
  for (const skill of all) {
    const head = /^---\nname: (.+)\ndescription: (.+)\n---\n/.exec(skill.text)
    expect(head, skill.name).not.toBeNull()
    expect(head?.[1], skill.name).toBe(skill.name)
    const description = head?.[2] ?? ''
    expect(description.length, skill.name).toBeGreaterThan(0)
    expect(description.length, skill.name).toBeLessThanOrEqual(1024)
    // A ": " in a plain YAML value ends the key, so an agent's tool would read the description wrongly.
    expect(description, skill.name).not.toContain(': ')
  }
})

/** The part of `automata-content` under `## <kind>`, up to the next heading. */
const sections = (): Map<string, string> =>
  new Map(
    [...text('automata-content').matchAll(/^## (\S+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)].map((m) => [
      m[1] ?? '',
      m[2] ?? '',
    ]),
  )

test('automata-content has a section for every kind in CONTENT_TYPES, and no other kind', () => {
  const found = sections()
  expect([...found.keys()].sort()).toEqual(Object.keys(CONTENT_TYPES).sort())
  for (const [type, body] of found) {
    expect(body, type).toContain(`content/${CONTENT_TYPES[type as ContentType].plural}/`)
    expect(body, type).toContain(`schemas/${type}.schema.json`)
  }
})

test("each kind's smallest whole file is read by parseContent with no problems, and is what writeContent writes", () => {
  for (const [type, body] of sections()) {
    const file = /```json\n([\s\S]*?)```/.exec(body)?.[1] ?? ''
    expect(file, type).not.toBe('')
    const id = (JSON.parse(file) as { id: string }).id
    const path = `content/${CONTENT_TYPES[type as ContentType].plural}/${id}.json`
    const parsed = parseContent(type as ContentType, file, path)
    expect(parsed.ok ? [] : parsed.diagnostics, type).toEqual([])
    if (parsed.ok) expect(writeContent(type as ContentType, parsed.value as never), type).toBe(file)
  }
})

test('every automata command a skill names exists, with flags its help has', () => {
  for (const skill of all) {
    for (const line of skill.text.split('\n')) {
      for (const m of line.matchAll(/(?:^|[\s`])automata ([a-z]+)([^`\n]*)/g)) {
        expect(COMMAND_NAMES as readonly string[], `${skill.name}: ${line}`).toContain(m[1])
        const help = helpFor(m[1] as (typeof COMMAND_NAMES)[number])
        for (const flag of (m[2] ?? '').matchAll(/ (--[a-z-]+)/g))
          expect(flag[1] === '--json' || help.includes(flag[1] ?? ''), `${skill.name}: ${line}`).toBe(true)
      }
    }
  }
})

test('every path a skill names exists in the template, in the package, or is written by create', () => {
  // `create` writes these under another name, and a game makes the folders for kinds it has not used yet.
  const written = ['package.json', 'biome.json', '.gitignore']
  for (const skill of all) {
    for (const span of [...skill.text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1] ?? '')) {
      const isPath = /^[\w./-]+$/.test(span) && (span.includes('/') || /\.(json|toml|ts|md|css)$/.test(span))
      if (!isPath || span.startsWith('node_modules/') || span.startsWith('content/') || span.endsWith('/'))
        continue
      const there = [join(ROOT, 'template', span), join(ROOT, span)].some((path) => existsSync(path))
      expect(written.includes(span) || there, `${skill.name} names ${span}, which is not there`).toBe(true)
    }
  }
})

const made: Sim[] = []
afterEach(() => {
  for (const sim of made.splice(0)) sim.dispose()
})

/** How high the hero gets (the smallest y) when jump is pressed at each of `presses`, with `plugins` as the rules. */
async function apex(plugins: readonly PluginDef[], presses: readonly number[]): Promise<number> {
  const sim = await createGameSim({ content: await loadTemplateGame(), plugins })
  made.push(sim)
  for (let i = 0; i < 30; i++) sim.step([])
  const start = sim.tick
  let seq = 0
  let top = Number.POSITIVE_INFINITY
  for (let tick = start; tick < start + 90; tick++) {
    const at = presses.findIndex((press) => start + press === tick)
    const release = presses.some((press) => start + press + 1 === tick)
    const held = at >= 0 ? ['jump'] : release ? [] : undefined
    sim.step(held === undefined ? [] : [controlsCommand(tick, 1, seq++, held)])
    for (const entity of sim.query(Player, Transform)) top = Math.min(top, entity.get(Transform).y)
  }
  return top
}

test('the worked example in automata-rules is the committed file, and its double jump works', async () => {
  const blocks = [...text('automata-rules').matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1] ?? '')
  expect(blocks.join('\n')).toBe(readFileSync(join(ROOT, 'tests/skills/double-jump.ts'), 'utf8'))

  const single = await apex([heroPlugin], [5])
  // The hero alone cannot jump in the air, so a second press changes nothing.
  expect(await apex([heroPlugin], [5, 15])).toBeCloseTo(single, 6)
  const double = await apex([heroPlugin, doubleJumpPlugin], [5, 15])
  expect(double).toBeLessThan(single - 0.5)
  // A third press in the air does nothing either: the extra jump was spent.
  expect(await apex([heroPlugin, doubleJumpPlugin], [5, 15, 30])).toBeCloseTo(double, 6)
})

test('no skill says npx automata without --no', () => {
  for (const skill of all) expect(skill.text, skill.name).not.toMatch(/npx\s+(?!--no\s+automata\b)/)
})

test('no skill names a colour, a competitor, a price, or a plan of this project', () => {
  for (const skill of all) {
    expect(skill.text, skill.name).not.toMatch(
      /\b(red|green|blue|yellow|orange|purple|pink|black|white|gr[ae]y|brown)\b/i,
    )
    expect(skill.text, skill.name).not.toMatch(/\b(unity|godot|unreal|phaser|gamemaker|construct|defold)\b/i)
    expect(skill.text, skill.name).not.toMatch(
      /\$\d|\b(price|prices|pricing|paid|milestone)\b|\bplan [A-Z]\b/i,
    )
  }
})
