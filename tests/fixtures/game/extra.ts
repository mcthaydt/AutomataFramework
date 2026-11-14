// The fixture game with more in it, built in memory for tests that need one more character or one more level: every
// file is written by `writeContent`, so what loads is what an editor or an agent would have saved.
import { type GameContent, writeContent } from '#src/features/content/content.ts'
import { loadFixtureGame } from './game.ts'
import { fixtureFiles } from './read.ts'

/** What to add to the fixture game: characters by id, levels by id, and a change to `level-1`. */
export interface Extra {
  readonly characters?: Readonly<Record<string, Record<string, unknown>>>
  readonly levels?: Readonly<Record<string, Record<string, unknown>>>
  /** Changes the fixture's own level before it is written. */
  readonly level1?: (level: Record<string, unknown>) => void
}

/** A character file's value, with the fields every character needs filled in. */
export function character(id: string, fields: Record<string, unknown>): Record<string, unknown> {
  return { format: 1, id, body: 'dynamic', size: { w: 1, h: 1 }, color: '#888888', upright: false, ...fields }
}

/** The fixture game plus `extra`, loaded. Throws, naming every problem, if it does not load. */
export async function loadFixtureWith(extra: Extra): Promise<GameContent> {
  const overrides: Record<string, string> = {}
  let toml = fixtureFiles['automata.toml'] as string
  for (const [id, value] of Object.entries(extra.characters ?? {})) {
    overrides[`content/characters/${id}.json`] = writeContent('character', value as never)
    toml += `\n[[content]]\ntype = "character"\npath = "content/characters/${id}.json"\n`
  }
  for (const [id, value] of Object.entries(extra.levels ?? {})) {
    overrides[`content/levels/${id}.json`] = writeContent('level', value as never)
    toml += `\n[[content]]\ntype = "level"\npath = "content/levels/${id}.json"\n`
  }
  if (extra.level1) {
    const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] as string) as Record<string, unknown>
    extra.level1(level)
    overrides['content/levels/level-1.json'] = writeContent('level', level as never)
  }
  return loadFixtureGame({ ...overrides, 'automata.toml': toml })
}
