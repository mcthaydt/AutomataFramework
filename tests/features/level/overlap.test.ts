// Two boxes that overlap (plan W, task 6): the pure test a press and a gate's wait are worked out from.
import { expect, test } from 'vitest'
import type { GameContent, Level } from '#src/features/content/content.ts'
import { boxesOverlap, type TurnedBox } from '#src/features/level/level.ts'
import { tileBoxes } from '#src/features/level/tile-runs.ts'
import { loadLinksGame } from '../../fixtures/links-game/read.ts'

const box = (x: number, y: number, hw: number, hh: number, rotation = 0): TurnedBox => ({
  x,
  y,
  hw,
  hh,
  rotation,
})

/** True both ways round: the answer must not depend on which box is asked first. */
function overlap(a: TurnedBox, b: TurnedBox): boolean {
  const forward = boxesOverlap(a, b)
  expect(boxesOverlap(b, a)).toBe(forward)
  return forward
}

test('boxes apart do not overlap', () => {
  expect(overlap(box(0, 0, 0.5, 0.5), box(3, 0, 0.5, 0.5))).toBe(false)
  expect(overlap(box(0, 0, 0.5, 0.5), box(0, -3, 0.5, 0.5))).toBe(false)
})

test('boxes that only touch do not overlap', () => {
  expect(overlap(box(0, 0, 0.5, 0.5), box(1, 0, 0.5, 0.5))).toBe(false)
  expect(overlap(box(0, 0, 0.5, 0.5), box(0, 1, 0.5, 0.5))).toBe(false)
})

test('boxes that overlap by 0.02 do, and by 0.005 do not', () => {
  expect(overlap(box(0, 0, 0.5, 0.5), box(0.98, 0, 0.5, 0.5))).toBe(true)
  expect(overlap(box(0, 0, 0.5, 0.5), box(0.995, 0, 0.5, 0.5))).toBe(false)
})

test('one box inside the other overlaps', () => {
  expect(overlap(box(0, 0, 2, 2), box(0.5, -0.5, 0.25, 0.25))).toBe(true)
})

test('a box turned 45 degrees: a corner that reaches into a plate overlaps, one 0.05 short does not', () => {
  const corner = Math.SQRT2 / 2
  const diamond = box(0, 0, 0.5, 0.5, Math.PI / 4)
  // A plate 1 by 0.25 above the diamond, its bottom edge `reach` below the diamond's top corner.
  const plate = (reach: number): TurnedBox => box(0, -corner + reach - 0.125, 0.5, 0.125)
  expect(overlap(diamond, plate(0.1))).toBe(true)
  expect(overlap(diamond, plate(-0.05))).toBe(false)
})

/** The things of a level as boxes: solid tiles, every thing at its character's size, and the heroes at the starts. */
function bodiesOf(content: GameContent, level: Level): { name: string; sensor: boolean; box: TurnedBox }[] {
  const bodies = tileBoxes(level.tiles).map((t) => ({
    name: `tile ${t.row},${t.col}`,
    sensor: false,
    box: box(t.col + t.w / 2, t.row + t.h / 2, t.w / 2, t.h / 2),
  }))
  for (const thing of level.things) {
    const character = content.characters[thing.character]
    if (character === undefined) throw new Error(`no character ${thing.character}`)
    bodies.push({
      name: thing.id,
      sensor: character.touch !== undefined,
      box: box(thing.x, thing.y, character.size.w / 2, character.size.h / 2),
    })
  }
  const hero = content.characters[content.project.hero]
  if (hero === undefined) throw new Error('no hero')
  for (const start of level.starts)
    bodies.push({
      name: `player-${start.player}`,
      sensor: false,
      box: box(start.x, start.y, hero.size.w / 2, hero.size.h / 2),
    })
  return bodies
}

test('the links game has no two solid bodies overlapping at spawn, in any level', async () => {
  const content = await loadLinksGame()
  for (const [id, level] of Object.entries(content.levels)) {
    // A sensor (a plate, a door, the goal) pushes nothing, so a hero may start inside one; every other pair is clear.
    const solid = bodiesOf(content, level).filter((b) => !b.sensor)
    for (let i = 0; i < solid.length; i++)
      for (let j = i + 1; j < solid.length; j++) {
        const [a, b] = [solid[i], solid[j]]
        if (a !== undefined && b !== undefined)
          expect(boxesOverlap(a.box, b.box), `${id}: ${a.name} overlaps ${b.name}`).toBe(false)
      }
  }
})

test('the critter, at each end of its path, overlaps nothing', async () => {
  const content = await loadLinksGame()
  const level = content.levels['room-2'] as Level
  const critter = level.things.find((t) => t.id === 'critter-1')
  const walk = critter?.values?.walk as readonly { x: number; y: number }[] | undefined
  const size = content.characters.critter?.size
  if (walk === undefined || size === undefined) throw new Error('the critter has no path')
  const others = bodiesOf(content, level).filter((b) => b.name !== 'critter-1')
  for (const end of [walk[0], walk[walk.length - 1]])
    for (const other of others)
      expect(
        boxesOverlap(box(end?.x ?? 0, end?.y ?? 0, size.w / 2, size.h / 2), other.box),
        `the critter at ${end?.x} overlaps ${other.name}`,
      ).toBe(false)
})
