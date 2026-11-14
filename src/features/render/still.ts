// A level drawn as it is written, with nothing run: an editor's picture of a level, and a card's thumbnail. It builds the
// views a sim would have at tick 0 straight from the content, then hands them to the same stage a running game uses, so
// what a person sees is what the game draws.
import type { Character, GameContent, Level } from '../content/content.ts'
import { groundOf, levelSize, skyOf, tileBoxes, tileRuns, usesSprites } from '../level/level.ts'
import type { Art } from './art.ts'
import type { Density } from './density.ts'
import type { Fit, Room } from './fit.ts'
import type { RopeLine, View, ViewSprite } from './scene.ts'
import { createStage } from './stage.ts'

/** No room kept on any side. */
const NO_ROOM: Room = { top: 0, right: 0, bottom: 0, left: 0 }

/** A content file's `#rrggbb` as the 0xrrggbb number the stage draws with (the rule the sim's own look uses). */
const colourOf = (hex: string): number => Number.parseInt(hex.slice(1), 16)

/** What a thing's sprite says in a game with figures: its character, the figure's first pose, facing right. */
const spriteOf = (character: string, player: number): ViewSprite => ({ character, pose: '', face: 1, player })

/** A character's box centred at a place, with the sprite a game with figures gives it. */
function viewOf(
  sid: number,
  character: Character,
  at: { x: number; y: number },
  sprite: ViewSprite | undefined,
): View {
  return {
    sid,
    x: at.x,
    y: at.y,
    rotation: 0,
    w: character.size.w,
    h: character.size.h,
    color: colourOf(character.color),
    ...(sprite === undefined ? {} : { sprite }),
  }
}

/**
 * A level as it is written, with nothing run: the ground boxes `spawnLevel` makes, every thing at its place in its
 * character's size and color (and, in a game with figures, its sprite in the first pose facing right), each start
 * point as that player's hero, and each joint as its pin or rope. Sids count from 1 in the order `spawnLevel` spawns
 * them (ground, things, the level's anchor when a joint has no holder, joints, heroes), so a view's sid is the entity's
 * StableId in a sim made from the same level.
 *
 * A level in the middle of an edit may name a character, a tileset or a thing the game does not have. Nothing throws:
 * what cannot be drawn is left out (a thing with no character, a joint with no thing), and a missing tileset leaves
 * the default solid letter, `#`.
 */
export function levelViews(content: GameContent, level: Level): { views: View[]; links: RopeLine[] } {
  const views: View[] = []
  const links: RopeLine[] = []
  let sid = 0
  const sprites = usesSprites(content)
  const tileset = level.tileset === undefined ? undefined : content.tilesets?.[level.tileset]
  const solid =
    tileset === undefined
      ? undefined
      : (letter: string): boolean => tileset.tiles.some((tile) => tile.solid && tile.letter === letter)
  // A level with a tileset joins stacked tiles of one width into one box; one without keeps one box a row.
  const boxes =
    level.tileset === undefined
      ? tileRuns(level.tiles, solid).map((run) => ({ row: run.row, col: run.col, w: run.length, h: 1 }))
      : tileBoxes(level.tiles, solid)
  const ground = groundOf(level)
  for (const box of boxes)
    views.push({
      sid: ++sid,
      x: box.col + box.w / 2,
      y: box.row + box.h / 2,
      rotation: 0,
      w: box.w,
      h: box.h,
      color: ground,
    })
  const placed = new Map<string, { sid: number }>()
  for (const thing of level.things) {
    const character = content.characters[thing.character]
    if (character === undefined) continue
    placed.set(thing.id, { sid: ++sid })
    views.push(viewOf(sid, character, thing, sprites ? spriteOf(character.id, 0) : undefined))
  }
  const joints = level.joints ?? []
  // The level itself holds a joint that names no holder; it takes a sid even though nothing is drawn for it.
  const anchor = joints.some((joint) => joint.holder === undefined) ? { sid: ++sid } : undefined
  for (const joint of joints) {
    const holder = joint.holder === undefined ? anchor : placed.get(joint.holder)
    if (!placed.has(joint.thing) || holder === undefined) continue
    const jointSid = ++sid
    links.push(
      joint.kind === 'pin'
        ? { sid: jointSid, kind: 'pin', x1: joint.x, y1: joint.y, x2: joint.x, y2: joint.y }
        : {
            sid: jointSid,
            kind: 'rope',
            x1: joint.from.x,
            y1: joint.from.y,
            x2: joint.to.x,
            y2: joint.to.y,
          },
    )
  }
  const hero = content.characters[content.project.hero]
  if (hero !== undefined)
    for (const start of [...level.starts].sort((a, b) => a.player - b.player))
      views.push(viewOf(++sid, hero, start, sprites ? spriteOf(hero.id, start.player) : undefined))
  return { views, links }
}

/** A picture of one level: a canvas that shows it, with room kept free on each side. */
export interface LevelPicture {
  readonly canvas: HTMLCanvasElement
  /** Draws this version of the level. Its size, tileset and backdrop must be those the picture was made with. */
  show(level: Level): void
  /** Draws again with this room. */
  setRoom(room: Room): void
  /** Where the level is on the canvas now: `fitInRoom` of the mount's size. */
  fit(): Fit
  /**
   * Removes the canvas and frees Pixi and the art. Safe to call twice. The picture owns the `Art` it was given, as
   * `createRenderer` does: never hand one `Art` to two pictures.
   */
  destroy(): void
}

/** Fills `mount` with a canvas showing `level`, and refits when `mount` changes size. */
export async function createLevelPicture(options: {
  mount: HTMLElement
  content: GameContent
  level: Level
  art?: Art | undefined
  density?: Density | undefined
  /** Keeps what was drawn readable afterwards (a test, a copy onto another canvas). Default false. */
  keep?: boolean
}): Promise<LevelPicture> {
  const { mount, content, level, art, density, keep } = options
  const stage = await createStage(levelSize(level), skyOf(level), art, density, keep)
  mount.append(stage.canvas)
  let shown = level
  const draw = (): void => {
    const { views, links } = levelViews(content, shown)
    stage.draw(views, links)
  }
  // `stage.resize` draws the last picture again, so a mount that turns is never left blank.
  const refit = (): void => stage.resize(mount.clientWidth, mount.clientHeight)
  stage.setRoom(NO_ROOM)
  draw()
  refit()
  const watcher = new ResizeObserver(refit)
  watcher.observe(mount)
  let destroyed = false
  return {
    canvas: stage.canvas,
    show(next) {
      shown = next
      draw()
    },
    setRoom: (room) => stage.setRoom(room),
    fit: () => stage.fit(),
    destroy() {
      if (destroyed) return
      destroyed = true
      watcher.disconnect()
      stage.destroy()
    },
  }
}
