// The skills an agent reads to work on a game: their shape, and that what they say is true. A skill that names a command, a
// flag, a path or a kind of file that is not there sends an agent after something that does not exist.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, expect, test } from 'vitest'
import { COMMAND_NAMES } from '#src/features/cli/args.ts'
import { helpFor } from '#src/features/cli/help.ts'
import { controlsCommand } from '#src/features/commands/commands.ts'
import { CONTENT_TYPES, type ContentType, parseContent, writeContent } from '#src/features/content/content.ts'
import { createGameSim } from '#src/features/level/level.ts'
import type { Sim } from '#src/features/sim/sim.ts'
import * as framework from '#src/headless.ts'
import { heroPlugin } from '../../template/src/features/hero/hero.ts'
import { loadTemplateGame } from '../template/game.ts'
import { Jumps, jumpCountPlugin } from './jump-count.ts'

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

test("the content skill's feel part names the three effects the framework draws and the setting", () => {
  const feel = sections().get('feel') ?? ''
  for (const word of ['dust', 'shake', 'freeze', 'Screen shake', 'crate.dropped', 'showFeel'])
    expect(feel, word).toContain(word)
  expect(text('automata-api')).toContain('FeelSettingsSchema')
  expect(framework).toHaveProperty('FeelSettingsSchema')
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

test("the worked example in automata-rules is the committed file, and it counts the hero's jumps", async () => {
  const blocks = [...text('automata-rules').matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1] ?? '')
  expect(blocks.join('\n')).toBe(readFileSync(join(ROOT, 'tests/skills/jump-count.ts'), 'utf8'))

  const sim = await createGameSim({
    content: await loadTemplateGame(),
    plugins: [heroPlugin, jumpCountPlugin],
  })
  made.push(sim)
  for (let i = 0; i < 30; i++) sim.step([])
  expect(sim.resource(Jumps)).toEqual({ jumps: 0 })
  const press = (seq: number, held: string[]): void => {
    sim.step([controlsCommand(sim.tick, 1, seq, held)])
    for (let i = 0; i < 5; i++) sim.step([])
  }
  press(0, ['jump'])
  expect(sim.resource(Jumps)).toEqual({ jumps: 1 })
  // Pressed again in the air: this hero has no double jump, so nothing is counted.
  press(1, [])
  press(2, ['jump'])
  expect(sim.resource(Jumps)).toEqual({ jumps: 1 })
  // Landed, and pressed once more.
  press(3, [])
  for (let i = 0; i < 120; i++) sim.step([])
  press(4, ['jump'])
  expect(sim.resource(Jumps)).toEqual({ jumps: 2 })
})

test('the answering-an-event section names things the framework has and the template uses', () => {
  const rules = text('automata-rules')
  const section = rules.slice(rules.indexOf('## Answering an event'), rules.indexOf('## A whole example'))
  expect(section).toContain('src/features/hero/score.ts')
  const score = readFileSync(join(ROOT, 'template/src/features/hero/score.ts'), 'utf8')
  const hero = readFileSync(join(ROOT, 'template/src/features/hero/hero.ts'), 'utf8')
  for (const name of ['touchEvent', 'defineResource']) {
    expect(section, name).toContain(name)
    expect(score, name).toContain(name)
    expect(typeof (framework as Record<string, unknown>)[name], name).toBe('function')
  }
  expect(section).toContain('ctx.events.of')
  expect(score).toContain('ctx.events.of')
  expect(hero).toContain("dependsOn: ['physics', 'commands', 'level', 'touch']")
  expect(hero).toContain('countSparks')
})

test('automata sends a change to a word to content/messages/, in every language, and not to the page', () => {
  const automata = text('automata')
  const changes = automata.slice(automata.indexOf('## Where a change goes'), automata.indexOf('## Verify'))
  expect(changes).toMatch(/word[^\n]*`content\/messages\/`/)
  expect(changes).not.toMatch(/words on it: `src\/features\/page\/`/)
  expect(automata).not.toContain('words on the screen | `src/features/page/`')
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
