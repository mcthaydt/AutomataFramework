// The template game's files as text, so one game loads in Node and in a browser (Vite's `?raw`), and a test can change
// a file before the game reads it.
import {
  artFiles,
  FOLDERS_FILE,
  folderManifest,
  type GameContent,
  type ListFolder,
  listFromManifest,
  loadGame,
  parseProject,
} from '#src/features/content/content.ts'
import automata from '../../template/automata.toml?raw'
import crate from '../../template/content/characters/crate.json?raw'
import hero from '../../template/content/characters/hero.json?raw'
import spark from '../../template/content/characters/spark.json?raw'
import cues from '../../template/content/cues/cues.json?raw'
import landFeel from '../../template/content/feels/land.json?raw'
import crateFigure from '../../template/content/figures/crate.json?raw'
import heroFigure from '../../template/content/figures/hero.json?raw'
import level1 from '../../template/content/levels/level-1.json?raw'
import calmTune from '../../template/content/loops/calm-tune.json?raw'
import halfTimeDrums from '../../template/content/loops/half-time-drums.json?raw'
import slowBass from '../../template/content/loops/slow-bass.json?raw'
import softChords from '../../template/content/loops/soft-chords.json?raw'
import enWords from '../../template/content/messages/en.json?raw'
import esWords from '../../template/content/messages/es.json?raw'
import jaWords from '../../template/content/messages/ja.json?raw'
import koWords from '../../template/content/messages/ko.json?raw'
import ptWords from '../../template/content/messages/pt.json?raw'
import zhWords from '../../template/content/messages/zh.json?raw'
import meadow from '../../template/content/music/meadow.json?raw'
import jump from '../../template/content/sounds/jump.json?raw'
import heroMoves from '../../template/content/tunings/hero-moves.json?raw'

/** Every content file of the template, by its path from the game's root. */
export const templateFiles: Readonly<Record<string, string>> = {
  'automata.toml': automata,
  'content/levels/level-1.json': level1,
  'content/characters/hero.json': hero,
  'content/characters/crate.json': crate,
  'content/characters/spark.json': spark,
  'content/figures/hero.json': heroFigure,
  'content/figures/crate.json': crateFigure,
  'content/tunings/hero-moves.json': heroMoves,
  'content/feels/land.json': landFeel,
  'content/sounds/jump.json': jump,
  'content/music/meadow.json': meadow,
  'content/loops/half-time-drums.json': halfTimeDrums,
  'content/loops/slow-bass.json': slowBass,
  'content/loops/soft-chords.json': softChords,
  'content/loops/calm-tune.json': calmTune,
  'content/cues/cues.json': cues,
  'content/messages/en.json': enWords,
  'content/messages/es.json': esWords,
  'content/messages/ko.json': koWords,
  'content/messages/ja.json': jaWords,
  'content/messages/zh.json': zhWords,
  'content/messages/pt.json': ptWords,
}

/**
 * What `automata.folders.json` says for these files: each folder the project lists and the names directly inside it,
 * which is what the template's build writes for a page that cannot list a folder.
 */
function manifestOf(files: Readonly<Record<string, string>>): string {
  const project = parseProject(files['automata.toml'] ?? '')
  const folders: Record<string, string[]> = {}
  if (project.ok)
    for (const { folder } of project.value.folders ?? [])
      folders[folder] = Object.keys(files)
        .filter((path) => path.startsWith(`${folder}/`) && !path.slice(folder.length + 1).includes('/'))
        .map((path) => path.slice(folder.length + 1))
  return folderManifest(folders)
}

/** A `read` over the template, as `loadGame` and the page take it. An override replaces a file. */
export function readFiles(
  overrides: Readonly<Record<string, string>> = {},
): (path: string) => Promise<string> {
  const files = { ...templateFiles, ...overrides }
  return async (path) => {
    const text = path === FOLDERS_FILE ? manifestOf(files) : files[path]
    if (text === undefined) throw new Error(`${path}: no such file`)
    return text
  }
}

/** A `list` over the template's folders, read through the same manifest a page reads. */
export function listFiles(overrides: Readonly<Record<string, string>> = {}): ListFolder {
  return listFromManifest(readFiles(overrides))
}

/** The template game, loaded. Throws, naming every problem, if it does not load. */
export async function loadTemplateGame(): Promise<GameContent> {
  const loaded = await loadGame(readFiles(), listFiles())
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
