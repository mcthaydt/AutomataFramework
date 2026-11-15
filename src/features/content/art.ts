// A game's painted art: the picture and the atlas each figure, backdrop and scene paints into, kept beside its file, and the
// check that they are what the files say. `automata art` writes these files and `automata check` runs `artProblems`;
// both are the same two functions, so an agent, CI and an editor on an iPad make and judge the same bytes.
import { encodePng, type IndexedPicture } from '../../lib/png.ts'
import type { Diagnostic } from './diagnostics.ts'
import type { GameContent } from './load.ts'
import { paintBackdrop } from './paint-backdrop.ts'
import { paintFigure } from './paint-figure.ts'
import { paintScene } from './paint-scene.ts'
import { photoPictureProblem } from './photo.ts'
import type { Photos } from './photo-library.ts'
import { atlasText, backdropSheet, figureSheet, type Sheet, sceneSheet } from './sheet.ts'

/** One file a painter makes: where it goes in the game and what it holds. */
export interface ArtFile {
  readonly path: string
  readonly bytes: Uint8Array
}

/** The kinds of file that paint a picture. */
const PAINTED = ['figure', 'backdrop', 'scene'] as const
type Painted = (typeof PAINTED)[number]

/** What the painter is given when a game says nothing: no photo, so a scene with a photo material cannot be painted. */
const NO_PHOTOS: Photos = () => undefined

const encoder = new TextEncoder()

/** The id a content file must have: its name without the folder or `.json`. */
function idOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1, -'.json'.length)
}

/**
 * Where the picture of a figure, a backdrop or a scene is kept: beside its file, so `content/figures/hero.json` is
 * painted into `content/figures/hero.png`. `undefined` when the project lists no such file.
 */
export function paintedPath(content: GameContent, type: Painted, id: string): string | undefined {
  const ref = content.project.content.find((entry) => entry.type === type && idOf(entry.path) === id)
  return ref === undefined ? undefined : `${ref.path.slice(0, -'.json'.length)}.png`
}

/**
 * The path of every picture and atlas the game's figures, backdrops and scenes paint, worked out from the project's list
 * with nothing painted: the one place the rule for where a painted file goes is written.
 */
export function paintedFiles(content: GameContent): string[] {
  return content.project.content.flatMap((entry) => {
    if (!PAINTED.some((type) => type === entry.type)) return []
    const picture = `${entry.path.slice(0, -'.json'.length)}.png`
    return [picture, atlasPath(picture)]
  })
}

/** The atlas file that goes beside a picture: `hero.png` has `hero.atlas.json`. */
function atlasPath(picture: string): string {
  return `${picture.slice(0, -'.png'.length)}.atlas.json`
}

/** A file `artFiles` gives and what it was made from, so a problem can name the file to change. */
interface Made extends ArtFile {
  /** `picture` or `atlas`. */
  readonly what: string
  /** `figure file`, `backdrop file` or `scene file`. */
  readonly from: string
}

/** A picture, and the atlas that says where its frames are, as the two files that go beside the figure's, backdrop's or scene's. */
function pair(path: string, picture: IndexedPicture, sheet: Sheet, from: string): Made[] {
  const atlas = atlasText(sheet, path.slice(path.lastIndexOf('/') + 1))
  return [
    { path, bytes: encodePng(picture), what: 'picture', from },
    { path: atlasPath(path), bytes: encoder.encode(atlas), what: 'atlas', from },
  ]
}

/** The picture and atlas of one figure, backdrop or scene, or none when its file is not in the game. */
function madeFrom(content: GameContent, type: Painted, id: string, photos: Photos): Made[] {
  const path = paintedPath(content, type, id)
  const figure = content.figures?.[id]
  const backdrop = content.backdrops?.[id]
  const scene = content.scenes?.[id]
  if (path === undefined) return []
  if (type === 'figure' && figure !== undefined)
    return pair(path, paintFigure(figure), figureSheet(figure), 'figure file')
  if (type === 'backdrop' && backdrop !== undefined)
    return pair(path, paintBackdrop(backdrop), backdropSheet(backdrop), 'backdrop file')
  if (type === 'scene' && scene !== undefined)
    return pair(path, paintScene(scene, photos), sceneSheet(scene), 'scene file')
  return []
}

/** Everything the game's figures, backdrops and scenes paint, in the order the project lists them. */
function allMade(content: GameContent, photos: Photos): Made[] {
  const made: Made[] = []
  for (const entry of content.project.content) {
    if (entry.type === 'figure' || entry.type === 'backdrop' || entry.type === 'scene')
      made.push(...madeFrom(content, entry.type, idOf(entry.path), photos))
  }
  return made
}

/** The ids of the photos this game's scenes use, sorted, each once: what a caller must be ready to hand the painter. */
export function photosUsed(content: GameContent): string[] {
  const used = new Set<string>()
  for (const scene of Object.values(content.scenes ?? {}))
    for (const material of scene.materials) if (material.kind === 'photo') used.add(material.photo)
  return [...used].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

/**
 * Every picture and atlas the game's figures, backdrops and scenes paint, in the order the project lists the files, each
 * picture before its atlas. A game with none of them has none. `photos` gives a photo's pixels by id and is asked only
 * when a scene has a photo material; a scene that needs one when none is given throws `MissingPhotoError`.
 */
export function artFiles(content: GameContent, photos: Photos = NO_PHOTOS): ArtFile[] {
  return allMade(content, photos).map(({ path, bytes }) => ({ path, bytes }))
}

/** True when two files hold the same bytes. */
function same(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i])
}

/**
 * One problem for each file `artFiles` gives that is missing or not what it gives, one for each tileset whose picture is
 * nowhere, and one for each photo file whose picture is not one the painter takes. `read` gives the bytes of a file, or
 * rejects or gives `undefined` when there is no such file.
 */
export async function artProblems(
  content: GameContent,
  read: (path: string) => Promise<Uint8Array | undefined>,
  photos: Photos = NO_PHOTOS,
): Promise<Diagnostic[]> {
  const readOrNothing = async (path: string): Promise<Uint8Array | undefined> => {
    try {
      return await read(path)
    } catch {
      return undefined
    }
  }
  const problems: Diagnostic[] = []
  const made = allMade(content, photos)
  for (const file of made) {
    const have = await readOrNothing(file.path)
    const problem = (message: string): number => problems.push({ file: file.path, path: '', message })
    if (have === undefined) problem(`This ${file.what} has not been painted. Run "automata art".`)
    else if (!same(have, file.bytes))
      problem(`This ${file.what} is older than its ${file.from}. Run "automata art".`)
  }
  const painted = new Set(made.map((file) => file.path))
  for (const entry of content.project.content) {
    const photo = entry.type === 'photo' ? content.photos?.[idOf(entry.path)] : undefined
    if (photo === undefined) continue
    const message = photoPictureProblem(photo, await readOrNothing(photo.image))
    if (message !== undefined) problems.push({ file: entry.path, path: 'image', message })
  }
  for (const entry of content.project.content) {
    const tileset = entry.type === 'tileset' ? content.tilesets?.[idOf(entry.path)] : undefined
    if (tileset === undefined || painted.has(tileset.image)) continue
    if ((await readOrNothing(tileset.image)) !== undefined) continue
    problems.push({
      file: entry.path,
      path: 'image',
      message: `There is no picture at "${tileset.image}". Put one there, or use a figure's picture, like content/figures/meadow.png.`,
    })
  }
  return problems
}
