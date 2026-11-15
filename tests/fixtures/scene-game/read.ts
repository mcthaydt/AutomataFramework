// The scene game: a small game with a scene that uses every shape and all three kinds of material. The files are
// imported as text with Vite's `?raw`, so the same fixture loads in Node and in a browser. Do not edit them by hand:
// change the value, write it again with writeContent, and commit the result.
import automata from './automata.toml?raw'
import crate from './content/characters/crate.json?raw'
import hero from './content/characters/hero.json?raw'
import figureMeadow from './content/figures/meadow.json?raw'
import level1 from './content/levels/level-1.json?raw'
import photoMoss from './content/photos/moss.json?raw'
import sceneMeadow from './content/scenes/meadow.json?raw'
import tilesetMeadow from './content/tilesets/meadow.json?raw'

/** Every file of the scene game, by its path from the game's root. */
export const sceneGameFiles: Record<string, string> = {
  'automata.toml': automata,
  'content/levels/level-1.json': level1,
  'content/scenes/meadow.json': sceneMeadow,
  'content/photos/moss.json': photoMoss,
  'content/tilesets/meadow.json': tilesetMeadow,
  'content/figures/meadow.json': figureMeadow,
  'content/characters/hero.json': hero,
  'content/characters/crate.json': crate,
}

/** A `read` over the scene game's files, as `loadGame` takes it. */
export const readSceneGame =
  (replace: Readonly<Record<string, string | undefined>> = {}) =>
  async (path: string): Promise<string> => {
    const files: Record<string, string | undefined> = { ...sceneGameFiles, ...replace }
    const text = files[path]
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  }
