// One of the two files that talk to Pixi (the other, `art.ts`, makes the textures). `pixi.js/unsafe-eval` swaps Pixi's generated functions for static ones, so the
// game runs under the strict CSPs of itch and Wavedash, and the texture loader checks image support on the main
// thread: its worker probe fetches a `data:` URL, which those CSPs refuse.
import 'pixi.js/unsafe-eval'
import { Application, Container, Graphics, loadTextures, Sprite as PixiSprite } from 'pixi.js'
import { SKY_COLOR } from '../level/level.ts'
import type { Art, BackdropArt } from './art.ts'
import { layerShift, placeCamera, type Shot } from './camera.ts'
import { type Density, pageDensity, sane } from './density.ts'
import { type Fit, fitWorld } from './fit.ts'
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
   * Where the level is on the canvas for this shot: the whole level fitted (`fitWorld`) when there is no shot, and the
   * camera's placement, with the offset rounded to whole device pixels, when there is one.
   */
  fit(shot?: Shot): Fit
  /**
   * Draws these views, placed by the shot (the whole level when there is none) in the current size, and the links over
   * them: a rope as a dark line two CSS pixels wide, a pin as a dark dot. Until the stage has a size they are kept and
   * drawn on its first.
   */
  draw(views: readonly View[], links: readonly RopeLine[], shot?: Shot): void
  destroy(): void
}

/**
 * One thing on the stage: a box (the shape), or a figure (the container holds its picture). It keeps the look it was last
 * drawn with so it is only redrawn when its look changes.
 */
interface Drawn {
  readonly box: Graphics
  readonly figure: Container
  readonly picture: PixiSprite
  look: string
}

/** The key of a box in the world, so a ground box the tiles replace can be told from the rest. */
const boxKey = (x: number, y: number, w: number, h: number): string => `${x}|${y}|${w}|${h}`

/** One backdrop layer on the stage: its strips (as many as the canvas needs) and the props that stand on it. */
interface BackdropDrawn {
  readonly holder: Container
  readonly strips: PixiSprite[]
  /** One per prop of the whole backdrop (`undefined` for a prop on another layer), so a prop's index is the same here. */
  readonly props: (PixiSprite | undefined)[]
}

/** Makes a holder for each layer of the backdrop, back to front, with the props standing on it. */
function buildBackdrop(backdrop: BackdropArt, into: Container): BackdropDrawn[] {
  return backdrop.layers.map((_, i) => {
    const holder = new Container()
    into.addChild(holder)
    const props = backdrop.props.map((prop) => {
      if (prop.layer !== i) return undefined
      const sprite = new PixiSprite({ texture: prop.texture })
      sprite.anchor.set(0.5, 1)
      holder.addChild(sprite)
      return sprite
    })
    return { holder, strips: [], props }
  })
}

/**
 * Starts Pixi (WebGL) on a new canvas. The sky colour (the level's, or the framework's light blue) fills the canvas, so the bars beside a world that does not
 * fill it are sky too. Pixi's own ticker is off: the game's loop decides when to draw.
 */
export async function createStage(
  world: { w: number; h: number },
  sky: number = SKY_COLOR,
  art?: Art,
  density: Density = pageDensity,
): Promise<Stage> {
  const app = new Application()
  await app.init({
    width: 1,
    height: 1,
    background: sky,
    antialias: true,
    resolution: sane(density.now()),
    autoDensity: false,
    autoStart: false,
    sharedTicker: false,
    preference: 'webgl',
  })
  const canvas = app.canvas
  // The canvas is as big as its mount; its drawing buffer is set to match by `resize`.
  canvas.style.cssText = 'display:block;width:100%;height:100%'
  // The backdrop is behind everything and in screen pixels: its strips repeat across the whole canvas.
  const backdropLayer = new Container()
  const root = new Container()
  // Back to front: boxes, the level's tiles, then the figures. The ropes and pins sit over all of them, so they have a
  // layer of their own with the same fit.
  const boxLayer = new Container()
  const tileLayer = new Container()
  const figureLayer = new Container()
  root.addChild(boxLayer, tileLayer, figureLayer)
  const linkLayer = new Container()
  const linkShape = new Graphics()
  linkLayer.addChild(linkShape)
  // A camera can show more of the level than fits above the strip kept free at the bottom, so that strip is covered with
  // sky, over everything.
  const cover = new Graphics()
  app.stage.addChild(backdropLayer, root, linkLayer, cover)
  const backdropLayers = art?.backdrop === undefined ? [] : buildBackdrop(art.backdrop, backdropLayer)
  // The tiles are placed once: the level's tiles do not move. When they are drawn, the boxes that make the same ground
  // are not.
  for (const tile of art?.tiles ?? []) {
    const square = new PixiSprite({ texture: tile.texture })
    square.position.set(tile.col, tile.row)
    square.width = 1
    square.height = 1
    tileLayer.addChild(square)
  }
  const replaced = new Set(
    (art?.tiles.length ?? 0) > 0
      ? (art?.ground ?? []).map((b) => boxKey(b.col + b.w / 2, b.row + b.h / 2, b.w, b.h))
      : [],
  )
  const drawn = new Map<number, Drawn>()
  let box = { w: 0, h: 0 }
  // Room kept clear at the bottom of the box (the touch buttons). The sky still fills the whole canvas.
  let inset = 0
  let destroyed = false
  // A sharper or softer screen: the canvas gets the pixels it now needs and the last picture is drawn again.
  const stopWatching = density.onChange(() => {
    if (destroyed) return
    app.renderer.resize(Math.max(1, box.w), Math.max(1, box.h), sane(density.now()))
    if (last !== undefined && box.w > 0) paint(last.views, last.links, last.shot)
  })
  // The last views asked for. A resize wipes the canvas, and a game paused by hand asks for no more frames, so the
  // stage puts this picture back itself.
  let last:
    | { readonly views: readonly View[]; readonly links: readonly RopeLine[]; readonly shot: Shot | undefined }
    | undefined

  /** The room the level has: the canvas without the strip kept free at the bottom. */
  const room = (): { w: number; h: number } => ({ w: box.w, h: box.h - Math.min(inset, box.h / 2) })
  const snap = (v: number): number => Math.round(v * app.renderer.resolution) / app.renderer.resolution
  const fitFor = (shot: Shot | undefined): Fit => {
    if (shot === undefined) return fitWorld(room(), world)
    const placed = placeCamera(room(), world, shot)
    // Whole device pixels, so pixels move as one while the camera eases and do not shimmer.
    return { scale: placed.scale, left: snap(placed.left), top: snap(placed.top) }
  }

  const paintBackdrop = (backdrop: BackdropArt, fit: Fit, camera: boolean): void => {
    const period = backdrop.width * fit.scale
    backdropLayers.forEach((one, i) => {
      const layer = backdrop.layers[i]
      if (layer === undefined) return
      const at = camera
        ? layerShift(layer.drift, fit, world, room())
        : { x: fit.left, y: fit.top + world.h * fit.scale }
      const shown = period > 0
      // The first strip that starts at or left of the canvas's left edge, then as many as reach its right edge.
      const first = shown ? at.x - Math.ceil(at.x / period) * period : 0
      const count = shown ? Math.ceil((box.w - first) / period) : 0
      while (one.strips.length < count) {
        const strip = new PixiSprite({ texture: layer.texture })
        strip.anchor.set(0, 1)
        one.holder.addChildAt(strip, one.strips.length)
        one.strips.push(strip)
      }
      one.strips.forEach((strip, k) => {
        strip.visible = k < count
        if (k >= count) return
        // Each strip ends where the next begins, whole pixels, so no seam shows between them.
        const x = snap(first + k * period)
        strip.position.set(x, snap(at.y))
        strip.width = snap(first + (k + 1) * period) - x
        strip.height = snap(layer.height * fit.scale)
      })
      backdrop.props.forEach((prop, p) => {
        if (prop.layer !== i) return
        const sprite = one.props[p]
        if (sprite === undefined) return
        sprite.visible = shown
        sprite.position.set(snap(at.x + prop.x * fit.scale), snap(at.y - prop.up * fit.scale))
        sprite.width = prop.w * fit.scale
        sprite.height = prop.h * fit.scale
      })
    })
  }

  const paint = (views: readonly View[], links: readonly RopeLine[], shot: Shot | undefined): void => {
    const fit = fitFor(shot)
    cover.clear().rect(0, room().h, box.w, box.h - room().h).fill(sky)
    if (art?.backdrop !== undefined) paintBackdrop(art.backdrop, fit, shot !== undefined)
    root.scale.set(fit.scale)
    root.position.set(fit.left, fit.top)
    linkLayer.scale.set(fit.scale)
    linkLayer.position.set(fit.left, fit.top)
    const live = new Set<number>()
    for (const v of views) {
      // A ground box the tiles are drawn over is not drawn itself.
      if (v.rotation === 0 && replaced.has(boxKey(v.x, v.y, v.w, v.h))) continue
      live.add(v.sid)
      let item = drawn.get(v.sid)
      if (item === undefined) {
        const picture = new PixiSprite()
        picture.anchor.set(0.5, 1)
        const figure = new Container()
        figure.addChild(picture)
        item = { box: new Graphics(), figure, picture, look: '' }
        boxLayer.addChild(item.box)
        figureLayer.addChild(item.figure)
        drawn.set(v.sid, item)
      }
      // A thing with a figure whose picture is loaded is that picture, standing on the bottom of its box; any other thing
      // is its box.
      const shown = v.sprite === undefined ? undefined : art?.figure(v.sprite.character, v.sprite.pose, v.sprite.player)
      const target = shown === undefined ? item.box : item.figure
      item.box.visible = shown === undefined
      item.figure.visible = shown !== undefined
      if (shown !== undefined && v.sprite !== undefined) {
        const look = `${v.sprite.character}|${v.sprite.pose}|${v.sprite.player}`
        if (item.look !== look) {
          item.picture.texture = shown.texture
          item.look = look
        }
        item.picture.position.set(0, v.h / 2)
        item.picture.scale.set(
          (v.sprite.face < 0 ? -shown.w : shown.w) / shown.texture.frame.width,
          shown.h / shown.texture.frame.height,
        )
      } else {
        // The edge is one screen pixel wide whatever the scale, so it is `1 / scale` tiles; the scale is part of the
        // look because a refit changes it.
        const look = `${v.w}|${v.h}|${v.color}|${fit.scale}`
        if (item.look !== look) {
          item.box
            .clear()
            .rect(-v.w / 2, -v.h / 2, v.w, v.h)
            .fill(v.color)
            .stroke({ width: 1 / fit.scale, color: OUTLINE_COLOR, alignment: 1 })
          item.look = look
        }
      }
      target.position.set(v.x, v.y)
      target.rotation = v.rotation
    }
    for (const [sid, item] of drawn) {
      if (live.has(sid)) continue
      item.box.destroy()
      item.figure.destroy({ children: true })
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
      if (last !== undefined) paint(last.views, last.links, last.shot)
    },
    setInset(px) {
      if (destroyed) return
      // Not above zero, or not a number, is no room at all.
      inset = px > 0 ? px : 0
      if (last !== undefined && box.w > 0) paint(last.views, last.links, last.shot)
    },
    fit: fitFor,
    draw(views, links, shot) {
      if (destroyed) return
      last = { views, links, shot }
      if (box.w > 0) paint(views, links, shot)
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      stopWatching()
      drawn.clear()
      app.destroy({ removeView: true }, { children: true })
      art?.destroy()
    },
  }
}
