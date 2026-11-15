// The render feature's entry: the scene drawn from the sim's deltas with Pixi. The scene and the fit are plain
// functions of numbers; only `createRenderer` needs a page.
import type { FeelFrame, FeelPlace } from '../feel/feel.ts'
import type { RenderDelta } from '../sim/sim.ts'
import type { Art } from './art.ts'
import { blendShot, easeShot, frameHeroes, type Shot } from './camera.ts'
import type { Density } from './density.ts'
import { createScene, type RopeLine, type View } from './scene.ts'
import { createStage } from './stage.ts'

/**
 * How far, in tiles, the camera's aim must jump at a resync for the camera to go straight to it. A restore (watch mode
 * between rounds) puts the heroes back where they started, far from where they were; an online game's rollback puts
 * them back by a step or two, and should not stop the glide each time it happens.
 */
const JUMP = 1

export { type Art, ArtError, loadArt, needsPictures, type ReadPicture } from './art.ts'
export type { Shot } from './camera.ts'
export { type Density, pageDensity } from './density.ts'
export { type Fit, fitInRoom, fitWorld, type Room } from './fit.ts'
export { createScene, type RopeLine, type Scene, type View, type ViewSprite } from './scene.ts'
export { createLevelPicture, type LevelPicture, levelViews } from './still.ts'

/** A hero's box on the canvas, in CSS pixels. */
export interface HeroBox {
  readonly player: number
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** What the stage was given for one picture: its views and links, and the camera's shot. */
interface Picture {
  readonly views: readonly View[]
  readonly links: readonly RopeLine[]
  readonly shot: Shot | undefined
}

/** What `createRenderer` gives back. */
export interface Renderer {
  readonly canvas: HTMLCanvasElement
  /** Takes the render delta of one sim step. Call once per step. The first one is drawn at once. */
  apply(delta: RenderDelta): void
  /**
   * Draws the world posed between the last two steps: `alpha` 0 is the earlier, 1 the latest. `feel` adds the dust and
   * the shake of a game's feel (`createFeel`'s frame). While `feel.freeze` is above 0 the picture is held: after the
   * first frame of a freeze, which shows the newest step, the same views are drawn again with the new dust, however
   * many steps the sim takes meanwhile.
   */
  draw(alpha: number, feel?: FeelFrame): void
  /**
   * A thing's box in tiles: as of the newest step when the scene has it, else as of the last picture drawn (a thing
   * taken away in the newest step). `undefined` for a thing that was never drawn.
   */
  place(sid: number): FeelPlace | undefined
  /**
   * Keeps this many CSS pixels at the bottom free of the world, so the touch buttons never sit on the play area. The
   * world is fitted into what is left above. Default 0.
   */
  setInset(px: number): void
  /**
   * Keeps the heroes this many CSS pixels clear of the bottom, in a level with a view: the box round them has `px / scale`
   * more tiles under it (the scale of the last frame drawn), still inside the level. 0 is how it was.
   */
  setThumbRoom(px: number): void
  /**
   * Puts the camera exactly at this middle (in tiles), showing the level's view size (the whole level when it has no
   * view) divided by `zoom`, from the next `apply` on. `undefined` lets go, and the camera eases back to the heroes.
   */
  look(at: { readonly x: number; readonly y: number; readonly zoom: number } | undefined): void
  /**
   * Every hero (a thing whose sprite names a player above 0) as its box on the canvas in CSS pixels, `x` and `y` being
   * its top left, lowest player first. As of the last picture drawn, a held one included, without any shake.
   */
  heroes(): readonly HeroBox[]
  /** Removes the canvas, stops watching the mount and frees Pixi. Safe to call twice. */
  destroy(): void
}

/**
 * Fills `mount` with a canvas and refits it whenever `mount` changes size. `world` is the level's size in tiles; the
 * whole of it is in view, with bars at the sides or the top and bottom, unless the level has a `view`, when a camera
 * follows the heroes. A mount with no size yet is waited for: drawing does nothing until it has one.
 */
export async function createRenderer(options: {
  mount: HTMLElement
  world: { w: number; h: number }
  /** The colour behind the level, 0xrrggbb. Left out, it is the framework's own light blue. */
  sky?: number
  /**
   * The level's pictures, from `loadArt`. A thing with a figure is drawn as its picture and the level's tiles as theirs.
   * Left out, every thing is a box. The renderer frees them when it is destroyed.
   */
  art?: Art | undefined
  /** The screen's pixel density. Left out, the page's own (`pageDensity`): the canvas follows it when it changes. */
  density?: Density | undefined
  /**
   * What the level's `view` says: the camera follows the heroes and shows this many tiles, and pulls back to `most` for
   * heroes far apart. Left out, the whole level is always in view.
   */
  view?:
    | {
        readonly w: number
        readonly h: number
        readonly most?: { readonly w: number; readonly h: number } | undefined
      }
    | undefined
}): Promise<Renderer> {
  const { mount, world, sky, art, view, density } = options
  const scene = createScene()
  const stage = await createStage(world, sky, art, density)
  mount.append(stage.canvas)
  // `stage.resize` puts the last picture back, so a turned phone is never left blank, even when the game is paused.
  const refit = (): void => stage.resize(mount.clientWidth, mount.clientHeight)
  refit()
  // The first step is drawn as it arrives: the loop's first frame only sets its clock, so waiting for the next frame
  // would show sky alone for one frame.
  let started = false
  // The camera: the shot of the last step and of the one before, drawn between. Undefined while the camera is off (no
  // view and no `look`), when the whole level is fitted as before.
  let previous: Shot | undefined
  let current: Shot | undefined
  let looking: { readonly x: number; readonly y: number; readonly zoom: number } | undefined
  // Where the camera was going at the last step, so a resync can tell a restore from a small correction.
  let aim: Shot | undefined
  let drawnAt = 1
  // What the stage was last given when the picture moved on, and whether the last picture drawn was a held one: while a
  // freeze lasts the stage is given these again, so the picture holds and only the dust moves.
  let held: Picture | undefined
  let holding = false
  // How many CSS pixels at the bottom the heroes are kept clear of (the thumbs' resting corners).
  let thumbRoom = 0
  const watcher = new ResizeObserver(refit)
  watcher.observe(mount)

  /** The shot to draw at `alpha`; undefined when the camera is off. */
  const shotAt = (alpha: number): Shot | undefined =>
    current === undefined
      ? undefined
      : blendShot(previous ?? current, current, Math.min(1, Math.max(0, alpha || 0)))

  /**
   * Takes one camera step. The first one goes straight to the target, and so does a resync that moves the target more
   * than `JUMP` tiles (a restore); a resync that moves it less (an online game's rollback) keeps gliding.
   */
  const step = (resync: boolean): void => {
    if (view === undefined && looking === undefined) {
      previous = current = aim = undefined
      return
    }
    const size = view ?? world
    const heroes = scene.views(1).filter((v) => (v.sprite?.player ?? 0) > 0)
    const zoom = looking !== undefined && looking.zoom > 0 ? looking.zoom : 1
    // The thumbs' resting corners, in tiles at the scale of the last frame drawn (none before the first).
    const under = thumbRoom > 0 ? thumbRoom / Math.max(stage.fit(current).scale, 1e-6) : 0
    const target: Shot =
      looking === undefined
        ? frameHeroes(world, size, heroes, under)
        : { x: looking.x, y: looking.y, w: size.w / zoom, h: size.h / zoom }
    const jumped =
      resync &&
      (aim === undefined ||
        Math.abs(target.x - aim.x) > JUMP ||
        Math.abs(target.y - aim.y) > JUMP ||
        Math.abs(target.w - aim.w) > JUMP ||
        Math.abs(target.h - aim.h) > JUMP)
    aim = target
    // A look is exact; heroes are followed with a glide.
    const next = current === undefined || jumped || looking !== undefined ? target : easeShot(current, target)
    previous = current === undefined || jumped ? next : current
    current = next
  }

  const show = (alpha: number, feel?: FeelFrame): void => {
    const frozen = feel !== undefined && feel.freeze > 0
    // After the first frame of a freeze the same picture is drawn again. The first frame is drawn from the sim as it is
    // (a spark taken in that step is already gone) and becomes the held picture; `drawnAt` is the moment it was posed.
    let picture = frozen && holding ? held : undefined
    if (picture === undefined) {
      drawnAt = alpha
      held = { views: scene.views(alpha), links: scene.links(alpha), shot: shotAt(alpha) }
      picture = held
    }
    holding = frozen
    stage.draw(picture.views, picture.links, picture.shot, feel)
  }
  return {
    canvas: stage.canvas,
    apply(delta) {
      scene.apply(delta)
      step(delta.resync)
      if (started) return
      started = true
      show(1)
    },
    draw(alpha, feel) {
      started = true
      show(alpha, feel)
    },
    place(sid) {
      const now = scene.views(1).find((v) => v.sid === sid) ?? held?.views.find((v) => v.sid === sid)
      return now === undefined ? undefined : { x: now.x, y: now.y, w: now.w, h: now.h }
    },
    setInset: (px) => stage.setInset(px),
    setThumbRoom(px) {
      thumbRoom = px > 0 ? px : 0
    },
    look(at) {
      looking = at
    },
    heroes() {
      // While a freeze holds the picture, the heroes are where the held picture shows them.
      const picture = holding ? held : undefined
      const fit = stage.fit(picture === undefined ? shotAt(drawnAt) : picture.shot)
      return (picture === undefined ? scene.views(drawnAt) : picture.views)
        .flatMap((v) =>
          v.sprite !== undefined && v.sprite.player > 0 ? [{ v, player: v.sprite.player }] : [],
        )
        .sort((a, b) => a.player - b.player || a.v.sid - b.v.sid)
        .map(({ v, player }) => ({
          player,
          x: fit.left + (v.x - v.w / 2) * fit.scale,
          y: fit.top + (v.y - v.h / 2) * fit.scale,
          w: v.w * fit.scale,
          h: v.h * fit.scale,
        }))
    },
    destroy() {
      watcher.disconnect()
      stage.destroy()
    },
  }
}
