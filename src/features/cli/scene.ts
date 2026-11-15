// `automata scene from-level`: moves a level's ground onto a scene file. The level keeps its things and starts and
// names the scene; the scene holds the rows, the colours and the boxes the level had, so the level plays and hashes as
// it did and a person can then paint the ground in the builder. The conversion is the framework's own (`sceneFromLevel`);
// this checks the result loads before it writes anything, lists the new file in `automata.toml` with `listContent`, and
// paints the scene's picture.
import { join } from 'node:path'
import { Effect } from 'effect'
import {
  type Diagnostic,
  formatDiagnostic,
  type GameContent,
  listContent,
  loadGame,
  sceneFromLevel,
  writeContent,
} from '../content/content.ts'
import { paintArt } from './art.ts'
import { readGame } from './game-folder.ts'
import { type CliError, Files, type Ports } from './ports.ts'

/** What `automata scene from-level` did: the files it wrote and painted, or the one sentence that says why not. */
export interface SceneReport {
  readonly ok: boolean
  /** The files written, from the game's root: the scene, the level and `automata.toml`. */
  readonly wrote: readonly string[]
  /** The pictures painted for the scene, from the game's root. */
  readonly painted: readonly string[]
  /** What stopped it, when nothing was written. */
  readonly sentence?: string
  /** What is wrong with the game, when it does not load. */
  readonly problems: readonly Diagnostic[]
}

/** What `automata scene from-level` is asked: a level, and optionally the scene's name. */
export interface SceneOptions {
  readonly folder: string
  readonly level: string
  readonly as?: string
}

const PROJECT = 'automata.toml'

/** The id a content file has: its name without the folder or `.json`. */
const idOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1, -'.json'.length)

/** `level-1` gives `scene-1`; an id with no `level` in it gets `-scene` after it. */
const sceneIdFor = (levelId: string): string =>
  levelId.includes('level') ? levelId.replace('level', 'scene') : `${levelId}-scene`

const refused = (sentence: string, problems: readonly Diagnostic[] = []): SceneReport => ({
  ok: false,
  wrote: [],
  painted: [],
  sentence,
  problems,
})

/** The ids, with commas, for a sentence that lists what there is. */
const named = (ids: readonly string[]): string => (ids.length === 0 ? 'none' : ids.join(', '))

/** Moves `level`'s ground onto a new scene file, or says why it cannot. Nothing is written unless all of it can be. */
export function runSceneFromLevel(options: SceneOptions): Effect.Effect<SceneReport, CliError, Ports> {
  return Effect.gen(function* () {
    const files = yield* Files
    const game = yield* readGame(options.folder)
    if (!game.loaded.ok)
      return refused(
        'The game does not load, so nothing was written. Fix the problems above, then run this again.',
        game.loaded.diagnostics,
      )
    const content: GameContent = game.loaded.value
    const old = content.levels[options.level]
    if (old === undefined)
      return refused(
        `There is no level called "${options.level}". This game has: ${named(Object.keys(content.levels))}.`,
      )
    if (old.scene !== undefined)
      return refused(
        `Level "${options.level}" already has a scene, "${old.scene}". Change that scene, or take its "scene" out of the level first.`,
      )

    const sceneId = options.as ?? sceneIdFor(options.level)
    const listed = content.project.content
    // Beside the scenes the project already lists, or in `content/scenes/`.
    const sibling = listed.find((entry) => entry.type === 'scene')?.path ?? 'content/scenes/x.json'
    const sceneFolder = sibling.slice(0, sibling.lastIndexOf('/'))
    const scenePath = `${sceneFolder}/${sceneId}.json`
    const levelPath = listed.find(
      (entry) => entry.type === 'level' && idOf(entry.path) === options.level,
    )?.path
    if (levelPath === undefined)
      return refused(`The level "${options.level}" is not listed in ${PROJECT}, so it cannot be moved.`)
    const taken = (yield* files.readText(join(options.folder, scenePath))) !== undefined
    if (taken || content.scenes?.[sceneId] !== undefined)
      return refused(`There is already a file at ${scenePath}. Pick another name with --as.`)

    // Everything is made, and read back as a game, before the first file is written.
    let sceneText: string
    let levelText: string
    try {
      const made = sceneFromLevel(content, options.level, sceneId)
      sceneText = writeContent('scene', made.scene)
      levelText = writeContent('level', made.level)
    } catch (error) {
      return refused(error instanceof Error ? error.message : String(error))
    }
    const project = yield* files.readText(join(options.folder, PROJECT))
    if (project === undefined) return refused(`${PROJECT} could not be read.`)
    const next = listContent(project, { type: 'scene', path: scenePath }, `The ground of ${options.level}.`)
    if (!next.ok) return refused(next.diagnostics.map((d) => formatDiagnostic(d)).join('\n'))

    const changed = new Map<string, string>([
      [scenePath, sceneText],
      [levelPath, levelText],
      [PROJECT, next.value],
    ])
    const read = (path: string): Promise<string> =>
      changed.has(path)
        ? Promise.resolve(changed.get(path) as string)
        : Effect.runPromise(files.readText(join(options.folder, path))).then((text) => {
            if (text === undefined) throw new Error(`${path}: no such file`)
            return text
          })
    const result = yield* Effect.promise(() => loadGame(read))
    if (!result.ok)
      return refused(
        `The scene made from "${options.level}" does not load, so nothing was written. Say what is wrong, or write the scene by hand.`,
        result.diagnostics,
      )

    for (const [path, text] of changed) yield* files.write(join(options.folder, path), text)
    const painted = yield* paintArt(yield* readGame(options.folder))
    return { ok: true, wrote: [...changed.keys()], painted, problems: [] }
  })
}

/** What a person reads: each file written and painted, then what happened to the level; or the sentence and the problems. */
export function describeScene(report: SceneReport, options: SceneOptions): { out: string[]; err: string[] } {
  const err = report.problems.map(formatDiagnostic)
  if (report.sentence !== undefined) return { out: [], err: [...err, report.sentence] }
  const scene = report.wrote[0] === undefined ? '' : idOf(report.wrote[0])
  return {
    out: [
      ...report.wrote.map((path) => `Wrote ${path}`),
      ...report.painted.map((path) => `Painted ${path}`),
      `Level "${options.level}" now takes its ground from the scene "${scene}". It plays as it did.`,
    ],
    err,
  }
}
