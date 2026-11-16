// A place put into the sim (plan W, task 8): the levels that join along their edges, built as one world. A level alone
// is spawned exactly as `spawnLevel` always spawned it, so a game with no place keeps every entity id and every hash.

import type { GameContent } from '../content/content.ts'
import { BodyKind, body, collider, transform } from '../physics/physics.ts'
import type { Sim } from '../sim/sim.ts'
import { type Arrive, arrivalSpots } from './arrive.ts'
import { groundOf } from './colours.ts'
import { Look } from './components.ts'
import { heroParts } from './hero.ts'
import { groundBoxes, levelsOf, shiftLevel } from './place.ts'
import { characterOf, heroNumbers, levelOf, spawnContents, spawnLevel, tilesetSolid } from './spawn-level.ts'

/**
 * Puts the place `opened` is in into `sim`, with the heroes of `players` coming in as `arrive` says (default: at the
 * opened level's starts). A level alone is `spawnLevel`'s. A place of two or more is built in a fixed order, so the same
 * place always gives the same entity ids: the ground's boxes (`tileBoxes` of the whole place, so a floor that runs on
 * through a seam is one body), then each level in id order with its things (their ids are `<level>.<id>`), its anchor
 * when a joint needs one and its joints, then the heroes, lowest number first. A box inside one level is one entity with
 * that level's ground colour; a box that crosses an edge is one body with no `Look`, then one entity with only a
 * transform and a `Look` for each level's part of it, in level order. Throws a `LevelError` that says what to fix.
 */
export function spawnPlace(
  sim: Sim,
  content: GameContent,
  opened: string,
  players: readonly number[],
  arrive?: Arrive,
): void {
  const levels = levelsOf(content, opened)
  if (levels.length < 2) {
    spawnLevel(
      sim,
      content,
      opened,
      players,
      arrive === undefined ? undefined : arrivalSpots(content, levels, opened, players, arrive),
    )
    return
  }
  const numbers = heroNumbers(levelOf(content, opened), opened, players)
  characterOf(content, content.project.hero, 'The hero')
  for (const l of levels) tilesetSolid(content, l.level, levelOf(content, l.level))

  for (const { box, parts } of groundBoxes(content, levels)) {
    const ground = [
      transform({ x: box.col + box.w / 2, y: box.row + box.h / 2 }),
      body(BodyKind.fixed),
      collider.cuboid(box.w / 2, box.h / 2),
    ]
    const only = parts.length === 1 ? parts[0] : undefined
    if (only !== undefined) {
      sim.spawn([...ground, [Look, { w: box.w, h: box.h, color: groundOf(levelOf(content, only.level)) }]])
      continue
    }
    sim.spawn(ground)
    for (const part of parts)
      sim.spawn([
        transform({ x: part.col + part.w / 2, y: part.row + part.h / 2 }),
        [Look, { w: part.w, h: part.h, color: groundOf(levelOf(content, part.level)) }],
      ])
  }
  for (const l of levels)
    spawnContents(
      sim,
      content,
      shiftLevel(levelOf(content, l.level), content, l.x, l.y),
      l.level,
      `${l.level}.`,
    )
  const spots = arrivalSpots(content, levels, opened, numbers, arrive)
  for (const number of numbers) sim.spawn(heroParts(content, opened, number, spots.get(number)) ?? [])
}
