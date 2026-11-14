// The playground game: a level of ropes, a seesaw, a spark and a door, made only to prove plan P's joints and touch
// together. It is read like the M1 fixture is, with Vite's `?raw`, so it loads in Node and in a browser.
import automata from './automata.toml?raw'
import crate from './content/characters/crate.json?raw'
import door from './content/characters/door.json?raw'
import hero from './content/characters/hero.json?raw'
import plank from './content/characters/plank.json?raw'
import platform from './content/characters/platform.json?raw'
import spark from './content/characters/spark.json?raw'
import playground from './content/levels/playground.json?raw'

/** Every file of the playground game, by its path from the game's root. */
export const playgroundFiles: Record<string, string> = {
  'automata.toml': automata,
  'content/levels/playground.json': playground,
  'content/characters/hero.json': hero,
  'content/characters/crate.json': crate,
  'content/characters/plank.json': plank,
  'content/characters/platform.json': platform,
  'content/characters/spark.json': spark,
  'content/characters/door.json': door,
}

/** A `read` over the playground. An override replaces a file; `undefined` makes it missing. */
export function readPlayground(
  overrides: Readonly<Record<string, string | undefined>> = {},
): (path: string) => Promise<string> {
  const files: Record<string, string | undefined> = { ...playgroundFiles, ...overrides }
  return async (path) => {
    const text = files[path]
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  }
}
