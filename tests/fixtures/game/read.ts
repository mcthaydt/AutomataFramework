// The fixture game: the example from the plan's "What the other repos rely on", 16 tiles wide and 9 tall. The files
// are imported as text with Vite's `?raw`, so the same fixture loads in Node and in a browser.
import automata from './automata.toml?raw'
import crate from './content/characters/crate.json?raw'
import hero from './content/characters/hero.json?raw'
import level1 from './content/levels/level-1.json?raw'

/** Every file of the fixture game, by its path from the game's root. */
export const fixtureFiles: Record<string, string> = {
  'automata.toml': automata,
  'content/levels/level-1.json': level1,
  'content/characters/hero.json': hero,
  'content/characters/crate.json': crate,
}

/**
 * A `read` over the fixture, as `loadGame` takes it. An override replaces a file; `undefined` makes it missing,
 * the way a real read of a file that is not there rejects.
 */
export function readFixture(
  overrides: Readonly<Record<string, string | undefined>> = {},
): (path: string) => Promise<string> {
  const files: Record<string, string | undefined> = { ...fixtureFiles, ...overrides }
  return async (path) => {
    const text = files[path]
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  }
}
