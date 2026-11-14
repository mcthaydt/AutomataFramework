// The template game's files as text, so one game loads in Node and in a browser (Vite's `?raw`), and a test can change
// a file before the game reads it.
import { type GameContent, loadGame } from '#src/features/content/content.ts'
import automata from '../../template/automata.toml?raw'
import crate from '../../template/content/characters/crate.json?raw'
import hero from '../../template/content/characters/hero.json?raw'
import level1 from '../../template/content/levels/level-1.json?raw'

/** Every content file of the template, by its path from the game's root. */
export const templateFiles: Readonly<Record<string, string>> = {
  'automata.toml': automata,
  'content/levels/level-1.json': level1,
  'content/characters/hero.json': hero,
  'content/characters/crate.json': crate,
}

/** A `read` over the template, as `loadGame` and the page take it. An override replaces a file. */
export function readFiles(
  overrides: Readonly<Record<string, string>> = {},
): (path: string) => Promise<string> {
  const files = { ...templateFiles, ...overrides }
  return async (path) => {
    const text = files[path]
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  }
}

/** The template game, loaded. Throws, naming every problem, if it does not load. */
export async function loadTemplateGame(): Promise<GameContent> {
  const loaded = await loadGame(readFiles())
  if (!loaded.ok)
    throw new Error(`The template did not load:\n${loaded.diagnostics.map((d) => d.message).join('\n')}`)
  return loaded.value
}
