// The render feature's entry: the scene drawn from the sim's deltas with Pixi. The scene and the fit are plain
// functions of numbers; only `createRenderer` needs a page.
import type { RenderDelta } from '../sim/sim.ts'
import type { Art } from './art.ts'
import { blendShot, easeShot, frameHeroes, type Shot } from './camera.ts'
import type { Density } from './density.ts'
import { createScene } from './scene.ts'
import { createStage } from './stage.ts'

export { type Art, ArtError, loadArt, needsPictures, type ReadPicture } from './art.ts'
export type { Shot } from './camera.ts'
export { type Density, pageDensity } from './density.ts'
export { type Fit, fitWorld } from './fit.ts'
export { createScene, type RopeLine, type Scene, type View, type ViewSprite } from './scene.ts'

/** A hero's box on the canvas, in CSS pixels. */
export interface HeroBox {
  readonly player: number
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** What `createRenderer` gives back. */
export interface Renderer {
  readonly canvas: HTMLCanvasElement
  /** Takes the render delta of one sim step. Call once per step. The first one is drawn at once. */
  apply(delta: RenderDelta): void
  /** Draws the world posed between the last two steps: `alpha` 0 is the earlier, 1 the latest. */
  draw(alpha: number): void
  /**
   * Keeps this many CSS pixels at the bottom free of the world, so the touch buttons never sit on the play area. The
   * world is fitted into what is left above. Default 0.
   */
  setInset(px: number): void
  /**
   * Puts the camera exactly at this middle (in tiles), showing the level's view size (the whole level when it has no
   * view) divided by `zoom`, from the next `apply` on. `undefined` lets go, and the camera eases back to the heroes.
   */
  look(at: { readonly x: number; readonly y: number; readonly zoom: number } | undefined): void
  /**
   * Every hero (a thing whose sprite names a player above 0) as its box on the canvas in CSS pixels, `x` and `y` being
   * its top left, lowest player first. As of the last picture drawn.
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
  let drawnAt = 1
  const watcher = new ResizeObserver(refit)
  watcher.observe(mount)

  /** The shot to draw at `alpha`; undefined when the camera is off. */
  const shotAt = (alpha: number): Shot | undefined =>
    current === undefined
      ? undefined
      : blendShot(previous ?? current, current, Math.min(1, Math.max(0, alpha || 0)))

  /** Takes one camera step. The first one, and the first after a resync (a restore), go straight to the target. */
  const step = (resync: boolean): void => {
    if (view === undefined && looking === undefined) {
      previous = current = undefined
      return
    }
    const size = view ?? world
    const heroes = scene.views(1).filter((v) => (v.sprite?.player ?? 0) > 0)
    const zoom = looking !== undefined && looking.zoom > 0 ? looking.zoom : 1
    const target: Shot =
      looking === undefined
        ? frameHeroes(world, size, heroes)
        : { x: looking.x, y: looking.y, w: size.w / zoom, h: size.h / zoom }
    // A look is exact; heroes are followed with a glide.
    const next = current === undefined || resync || looking !== undefined ? target : easeShot(current, target)
    previous = current === undefined || resync ? next : current
    current = next
  }

  const show = (alpha: number): void => {
    drawnAt = alpha
    stage.draw(scene.views(alpha), scene.links(alpha), shotAt(alpha))
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
    draw(alpha) {
      started = true
      show(alpha)
    },
    setInset: (px) => stage.setInset(px),
    look(at) {
      looking = at
    },
    heroes() {
      const fit = stage.fit(shotAt(drawnAt))
      return scene
        .views(drawnAt)
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
