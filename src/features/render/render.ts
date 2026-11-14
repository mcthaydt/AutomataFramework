// The render feature's entry: the scene drawn from the sim's deltas with Pixi. The scene and the fit are plain
// functions of numbers; only `createRenderer` needs a page.
import type { RenderDelta } from '../sim/sim.ts'
import { createScene } from './scene.ts'
import { createStage } from './stage.ts'

export { type Fit, fitWorld } from './fit.ts'
export { createScene, type Scene, type View } from './scene.ts'

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
  /** Removes the canvas, stops watching the mount and frees Pixi. Safe to call twice. */
  destroy(): void
}

/**
 * Fills `mount` with a canvas and refits it whenever `mount` changes size. `world` is the level's size in tiles; the
 * whole of it is always in view, with bars at the sides or the top and bottom. A mount with no size yet is waited
 * for: drawing does nothing until it has one.
 */
export async function createRenderer(options: {
  mount: HTMLElement
  world: { w: number; h: number }
  /** The colour behind the level, 0xrrggbb. Left out, it is the framework's own light blue. */
  sky?: number
}): Promise<Renderer> {
  const { mount, world, sky } = options
  const scene = createScene()
  const stage = await createStage(world, sky)
  mount.append(stage.canvas)
  // `stage.resize` puts the last picture back, so a turned phone is never left blank, even when the game is paused.
  const refit = (): void => stage.resize(mount.clientWidth, mount.clientHeight)
  refit()
  // The first step is drawn as it arrives: the loop's first frame only sets its clock, so waiting for the next frame
  // would show sky alone for one frame.
  let started = false
  const watcher = new ResizeObserver(refit)
  watcher.observe(mount)
  return {
    canvas: stage.canvas,
    apply(delta) {
      scene.apply(delta)
      if (started) return
      started = true
      stage.draw(scene.views(1))
    },
    draw(alpha) {
      started = true
      stage.draw(scene.views(alpha))
    },
    setInset: (px) => stage.setInset(px),
    destroy() {
      watcher.disconnect()
      stage.destroy()
    },
  }
}
