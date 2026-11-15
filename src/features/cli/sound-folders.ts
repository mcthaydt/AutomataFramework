// What `automata music` and `automata sound` share: the game read as one that may be written to, the folder it lists for
// a kind, and the sentences for what is missing. A file is written only into a folder the project lists, so the
// project file stays the one list of what is in the game.
import { Effect } from 'effect'
import { type ContentType, formatDiagnostic, type GameContent, Id } from '../content/content.ts'
import { type GameFolder, readGame } from './game-folder.ts'
import { CliError, type CodeService, type FilesService } from './ports.ts'

/** Where a kind's files go in a new game: the block a game with no folder for them is told to add. */
const DEFAULT_FOLDERS: Readonly<Partial<Record<ContentType, string>>> = {
  sound: 'content/sounds',
  music: 'content/music',
  loop: 'content/loops',
}

/** What a kind is called in a sentence about its folder. */
const PLURALS: Readonly<Partial<Record<ContentType, string>>> = {
  sound: 'sounds',
  music: 'music',
  loop: 'loops',
}

/** The longest name a track or a sound is given here: a track's loops add a lane and a number to it. */
const MAX_NAME = 40

/** A game read from a folder, with its content loaded. */
export interface WritableGame {
  /** The folder as the command was given it; every file is written from here. */
  readonly folder: string
  /** The game's own framework (or this command's copy), which reads and writes the files. */
  readonly api: GameFolder['content']
  readonly content: GameContent
}

/** Reads the game in `folder`, or says it does not read yet: nothing is written into a game that cannot be read back. */
export function readWritable(
  folder: string,
): Effect.Effect<WritableGame, CliError, CodeService | FilesService> {
  return Effect.flatMap(readGame(folder), (read) =>
    read.loaded.ok
      ? Effect.succeed({ folder: read.folder, api: read.content, content: read.loaded.value })
      : Effect.fail(
          new CliError(
            `This game does not read yet, so nothing was written. Run automata check to see what to fix.\n${read.loaded.diagnostics.map(formatDiagnostic).join('\n')}`,
          ),
        ),
  )
}

/** The first folder the project lists for a kind, from the game's root, or `undefined`. */
export const folderOf = (game: WritableGame, type: ContentType): string | undefined =>
  game.content.project.folders?.find((ref) => ref.type === type)?.folder

/**
 * The sentence that says which kinds the game lists no folder for and the lines to add to `automata.toml`, or
 * `undefined` when it lists them all.
 */
export function missingFolders(game: WritableGame, types: readonly ContentType[]): CliError | undefined {
  const missing = types.filter((type) => folderOf(game, type) === undefined)
  if (missing.length === 0) return undefined
  const names = missing.map((type) => PLURALS[type] ?? type).join(' and ')
  const blocks = missing.map(
    (type) => `[[content]]\ntype = "${type}"\nfolder = "${DEFAULT_FOLDERS[type] ?? `content/${type}`}"`,
  )
  return new CliError(
    `This game lists no folder for ${names}. Add these lines to automata.toml, then try again:\n\n${blocks.join('\n\n')}`,
  )
}

/** The sentence for a name no file can have, or `undefined` when it is a fine one. */
export function nameProblem(name: string): string | undefined {
  if (name.length > MAX_NAME || !Id.safeParse(name).success)
    return `"${name}" is not a name a file can have. Use lower-case words joined by dashes, like "my-song", up to ${MAX_NAME} letters. Pick one with --id.`
  return undefined
}

/** A file's name made into a name: `My Song.mid` is `my-song`; a name with nothing usable is `song`. */
export function nameOfFile(path: string): string {
  const file = path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)
  const dot = file.lastIndexOf('.')
  const words = (dot > 0 ? file.slice(0, dot) : file)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    // A name starts with a letter.
    .replace(/^[0-9-]+/, '')
    .slice(0, MAX_NAME)
    .replace(/-+$/, '')
  return words === '' ? 'song' : words
}
