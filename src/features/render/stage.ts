// The only file that talks to Pixi. `pixi.js/unsafe-eval` swaps Pixi's generated functions for static ones, so the
// game runs under the strict CSPs of itch and Wavedash, and the texture loader checks image support on the main
// thread: its worker probe fetches a `data:` URL, which those CSPs refuse.
import 'pixi.js/unsafe-eval'
import { Application, Container, Graphics, loadTextures } from 'pixi.js'
import { SKY_COLOR } from '../level/level.ts'
import { fitWorld } from './fit.ts'
import type { RopeLine, View } from './scene.ts'

// Pixi types the loader's config as optional; a Pixi without it would leave the probe on, so say so.
const textureConfig = loadTextures.config
if (textureConfig === undefined)
  throw new Error('pixi.js loadTextures has no config, so the renderer cannot turn off its worker probe')
textureConfig.preferWorkers = false

// Every box gets a dark edge. A level may pick its own sky and a game its own colours, so without an edge a pale
// box (or one close to the sky) can hardly be made out.
const OUTLINE_COLOR = 0x1b1b24

/** A pin is a dot of this radius, in tiles; a rope is a line this many CSS pixels wide. */
const PIN_RADIUS = 0.1
/** On a phone a tile is a few pixels, so the dot never goes below this many CSS pixels across its radius. */
const PIN_MIN_PX = 4
const ROPE_WIDTH = 2

/** What the renderer needs of the Pixi stage. */
export interface Stage {
  readonly canvas: HTMLCanvasElement
  /**
   * Sets the size in CSS pixels. Ignored for a size that is not above zero. Setting the size clears the canvas, so the
   * views drawn last are drawn again at once.
   */
  resize(w: number, h: number): void
  /**
   * Keeps this many CSS pixels at the bottom free of the world, for the touch buttons, and draws the last views again.
   * Never more than half the height, so the world cannot be squeezed out of sight.
   */
  setInset(px: number): void
  /**
   * Draws these views, fitted into the current size, and the links over them: a rope as a dark line two CSS pixels
   * wide, a pin as a dark dot. Until the stage has a size they are kept and drawn on its first.
   */
  draw(views: readonly View[], links: readonly RopeLine[]): void
  destroy(): void
}

/** One box on the stage, and the look it was last drawn with so a box is only redrawn when its look changes. */
interface Drawn {
  readonly shape: Graphics
  look: string
}

/**
 * Starts Pixi (WebGL) on a new canvas. The sky colour (the level's, or the framework's light blue) fills the canvas, so the bars beside a world that does not
 * fill it are sky too. Pixi's own ticker is off: the game's loop decides when to draw.
 */
export async function createStage(world: { w: number; h: number }, sky: number = SKY_COLOR): Promise<Stage> {
  const app = new Application()
  await app.init({
    width: 1,
    height: 1,
    background: sky,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: false,
    autoStart: false,
    sharedTicker: false,
    preference: 'webgl',
  })
  const canvas = app.canvas
  // The canvas is as big as its mount; its drawing buffer is set to match by `resize`.
  canvas.style.cssText = 'display:block;width:100%;height:100%'
  const root = new Container()
  // The ropes and pins sit over the boxes, so they have a layer of their own with the same fit.
  const linkLayer = new Container()
  const linkShape = new Graphics()
  linkLayer.addChild(linkShape)
  app.stage.addChild(root, linkLayer)
  const drawn = new Map<number, Drawn>()
  let box = { w: 0, h: 0 }
  // Room kept clear at the bottom of the box (the touch buttons). The sky still fills the whole canvas.
  let inset = 0
  let destroyed = false
  // The last views asked for. A resize wipes the canvas, and a game paused by hand asks for no more frames, so the
  // stage puts this picture back itself.
  let last: { readonly views: readonly View[]; readonly links: readonly RopeLine[] } | undefined

  const paint = (views: readonly View[], links: readonly RopeLine[]): void => {
    const fit = fitWorld({ w: box.w, h: box.h - Math.min(inset, box.h / 2) }, world)
    root.scale.set(fit.scale)
    root.position.set(fit.left, fit.top)
    linkLayer.scale.set(fit.scale)
    linkLayer.position.set(fit.left, fit.top)
    const live = new Set<number>()
    for (const v of views) {
      live.add(v.sid)
      let item = drawn.get(v.sid)
      if (item === undefined) {
        item = { shape: new Graphics(), look: '' }
        root.addChild(item.shape)
        drawn.set(v.sid, item)
      }
      // The edge is one screen pixel wide whatever the scale, so it is `1 / scale` tiles; the scale is part of the
      // look because a refit changes it.
      const look = `${v.w}|${v.h}|${v.color}|${fit.scale}`
      if (item.look !== look) {
        item.shape
          .clear()
          .rect(-v.w / 2, -v.h / 2, v.w, v.h)
          .fill(v.color)
          .stroke({ width: 1 / fit.scale, color: OUTLINE_COLOR, alignment: 1 })
        item.look = look
      }
      item.shape.position.set(v.x, v.y)
      item.shape.rotation = v.rotation
    }
    for (const [sid, item] of drawn) {
      if (live.has(sid)) continue
      item.shape.destroy()
      drawn.delete(sid)
    }
    linkShape.clear()
    for (const l of links) {
      if (l.kind === 'pin')
        linkShape.circle(l.x1, l.y1, Math.max(PIN_RADIUS, PIN_MIN_PX / fit.scale)).fill(OUTLINE_COLOR)
      else
        linkShape
          .moveTo(l.x1, l.y1)
          .lineTo(l.x2, l.y2)
          .stroke({ width: ROPE_WIDTH / fit.scale, color: OUTLINE_COLOR })
    }
    app.render()
  }

  return {
    canvas,
    resize(w, h) {
      if (destroyed || !(w > 0 && h > 0)) return
      box = { w, h }
      app.renderer.resize(w, h)
      if (last !== undefined) paint(last.views, last.links)
    },
    setInset(px) {
      if (destroyed) return
      // Not above zero, or not a number, is no room at all.
      inset = px > 0 ? px : 0
      if (last !== undefined && box.w > 0) paint(last.views, last.links)
    },
    draw(views, links) {
      if (destroyed) return
      last = { views, links }
      if (box.w > 0) paint(views, links)
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      drawn.clear()
      app.destroy({ removeView: true }, { children: true })
    },
  }
}
