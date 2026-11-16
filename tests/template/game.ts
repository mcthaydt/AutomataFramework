// The template game's files as text, so one game loads in Node and in a browser (Vite's `?raw`), and a test can change
// a file before the game reads it.
import { artFiles, type GameContent, loadGame } from '#src/features/content/content.ts'
import automata from '../../template/automata.toml?raw'
import crate from '../../template/content/characters/crate.json?raw'
import door from '../../template/content/characters/door.json?raw'
import hero from '../../template/content/characters/hero.json?raw'
import spark from '../../template/content/characters/spark.json?raw'
import cues from '../../template/content/cues/cues.json?raw'
import fallFeel from '../../template/content/feels/fall.json?raw'
import landFeel from '../../template/content/feels/land.json?raw'
import takeFeel from '../../template/content/feels/take.json?raw'
import crateFigure from '../../template/content/figures/crate.json?raw'
import doorFigure from '../../template/content/figures/door.json?raw'
import heroFigure from '../../template/content/figures/hero.json?raw'
import level1 from '../../template/content/levels/level-1.json?raw'
import enWords from '../../template/content/messages/en.json?raw'
import esWords from '../../template/content/messages/es.json?raw'
import jaWords from '../../template/content/messages/ja.json?raw'
import koWords from '../../template/content/messages/ko.json?raw'
import ptWords from '../../template/content/messages/pt.json?raw'
import zhWords from '../../template/content/messages/zh.json?raw'
import fallSound from '../../template/content/sounds/fall.json?raw'
import landSound from '../../template/content/sounds/land.json?raw'
import takeSound from '../../template/content/sounds/take.json?raw'
import heroMoves from '../../template/content/tunings/hero-moves.json?raw'

/** Every content file of the template, by its path from the game's root. */
export const templateFiles: Readonly<Record<string, string>> = {
  'automata.toml': automata,
  'content/levels/level-1.json': level1,
  'content/characters/hero.json': hero,
  'content/characters/crate.json': crate,
  'content/characters/spark.json': spark,
  'content/characters/door.json': door,
  'content/figures/hero.json': heroFigure,
  'content/figures/crate.json': crateFigure,
  'content/figures/door.json': doorFigure,
  'content/tunings/hero-moves.json': heroMoves,
  'content/feels/land.json': landFeel,
  'content/feels/take.json': takeFeel,
  'content/feels/fall.json': fallFeel,
  'content/sounds/land.json': landSound,
  'content/sounds/take.json': takeSound,
  'content/sounds/fall.json': fallSound,
  'content/cues/cues.json': cues,
  'content/messages/en.json': enWords,
  'content/messages/es.json': esWords,
  'content/messages/ko.json': koWords,
  'content/messages/ja.json': jaWords,
  'content/messages/zh.json': zhWords,
  'content/messages/pt.json': ptWords,
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

/**
 * A `readPicture` over the template's pictures, painted here from its figure files the way `automata art` paints them
 * (no picture is kept in this repository), as the page takes one.
 */
export async function readPicture(path: string): Promise<Blob> {
  const file = artFiles(await loadTemplateGame()).find((made) => made.path === path)
  if (file === undefined) throw new Error(`${path}: the template has no such picture`)
  return new Blob([file.bytes.slice()], { type: path.endsWith('.png') ? 'image/png' : 'application/json' })
}
