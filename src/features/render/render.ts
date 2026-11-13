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
  /** Takes the render delta of one sim step. Call once per step. */
  apply(delta: RenderDelta): void
  /** Draws the world posed between the last two steps: `alpha` 0 is the earlier, 1 the latest. */
  draw(alpha: number): void
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
}): Promise<Renderer> {
  const { mount, world } = options
  const scene = createScene()
  const stage = await createStage(world)
  mount.append(stage.canvas)
  const refit = (): void => stage.resize(mount.clientWidth, mount.clientHeight)
  refit()
  const watcher = new ResizeObserver(refit)
  watcher.observe(mount)
  let last = 1
  return {
    canvas: stage.canvas,
    apply: (delta) => scene.apply(delta),
    draw(alpha) {
      last = alpha
      stage.draw(scene.views(alpha))
    },
    destroy() {
      watcher.disconnect()
      stage.destroy()
    },
  }
}
