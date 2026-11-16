// Step U's anti-goal: the template uses every built-in the README names a section for, so nothing the framework offers
// is left for a maker to find by chance. Each section has one rule, stated here, that a file of the template meets.
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { parseProject } from '#src/features/content/content.ts'
import { templateTree } from './tree.ts'

const tree = templateTree()
const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8')
const project = parseProject(tree['automata.toml'] ?? '')
const page = tree['src/features/page/page.ts'] ?? ''
const listed = (type: string): string[] =>
  project.ok ? project.value.content.filter((ref) => ref.type === type).map((ref) => ref.path) : []

/** The README sections whose built-ins the template must use, and the rule that says it does. */
const SECTIONS: readonly (readonly [string, () => void])[] = [
  [
    '## Saves',
    () => {
      // The visit keeps its settings and saved games under the game's id, which `create` writes into the page.
      expect(page).toMatch(/game: GAME_ID/)
      expect(page).toMatch(/const GAME_ID = '[a-z0-9-]+'/)
    },
  ],
  [
    '## Languages',
    () => {
      // One file of words for each of the six languages, every one listed.
      const files = listed('messages')
      for (const language of ['en', 'es', 'ko', 'ja', 'zh', 'pt'])
        expect(files, language).toContain(`content/messages/${language}.json`)
    },
  ],
  [
    '## Sound',
    () => {
      // Sounds made from tones, and a cues file that says which event plays which.
      expect(listed('sound').length).toBeGreaterThan(0)
      expect(listed('cues')).toEqual(['content/cues/cues.json'])
    },
  ],
  [
    '## Art',
    () => {
      // A figure for each thing the player sees, which `automata art` paints.
      expect(listed('figure').length).toBeGreaterThanOrEqual(3)
      expect(page).toContain('readPicture')
    },
  ],
  [
    '## Gamepads, changing keys and playing together',
    () => {
      // The controls are in the tuning file, each with the pad's buttons, and a second player can join.
      const tuning = JSON.parse(tree['content/tunings/hero-moves.json'] ?? '{}') as {
        controls?: Record<string, { pad?: unknown; keys?: unknown }>
      }
      expect(Object.keys(tuning.controls ?? {}).length).toBeGreaterThan(0)
      for (const [name, control] of Object.entries(tuning.controls ?? {})) {
        expect(control.pad, name).toBeDefined()
        expect(control.keys, name).toBeDefined()
      }
      expect(project.ok && project.value.players).toBe(2)
    },
  ],
  [
    '## Screens and the flow',
    () => {
      // One call starts the visit, and the project names the order, the win, the loss and the score.
      expect(page.match(/startFlow\(/g)).toHaveLength(1)
      expect(project.ok && project.value).toMatchObject({
        levels: ['level-1'],
        done: 'door.touched',
        lost: 'hero.fell',
        score: 'hero.score.sparks',
      })
    },
  ],
  [
    '## Replays',
    () => {
      // A recorded play ships with the game, and the page can play it by itself (`?watch`).
      expect(tree['replays/level-1.json']).toBeDefined()
      expect(page).toContain("'replays/level-1.json'")
      expect(page).toContain('watch')
    },
  ],
]

test('every built-in the README has a section for is used by a file of the template', () => {
  expect(project.ok).toBe(true)
  for (const [heading, rule] of SECTIONS) {
    expect(readme, heading).toContain(`\n${heading}\n`)
    rule()
  }
})

test('and the sections this test checks are the ones the README gives to a game that starts from the template', () => {
  expect(SECTIONS.map(([heading]) => heading)).toEqual([
    '## Saves',
    '## Languages',
    '## Sound',
    '## Art',
    '## Gamepads, changing keys and playing together',
    '## Screens and the flow',
    '## Replays',
  ])
})
