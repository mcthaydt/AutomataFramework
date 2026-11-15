// The fixture game with a two-tile gap in the floor of its level (columns 7 and 8 of 16) and `lost = "hero.fell"`:
// a hero that runs right from its start falls through the gap. Built in memory, as `writeContent` writes each file.
import { writeContent } from '#src/features/content/content.ts'
import { fixtureFiles } from './read.ts'

/** The columns of the gap, counted from the left edge of the level. */
export const GAP = { from: 7, to: 8 }

export interface FallSetup {
  /** The line for `lost`, or `null` for none. Default `hero.fell`. */
  readonly lost?: string | null
  /** The level's things (placed copies of the fixture's characters). Default none. */
  readonly things?: readonly Record<string, unknown>[]
  /** Makes it a game for this many players, with a start point each, a tile apart. Default 1. */
  readonly players?: number
}

/** The files of the fixture game with the gap, as `loadFixtureGame` takes them as overrides. */
export function fallFiles(setup: FallSetup = {}): Record<string, string> {
  const players = setup.players ?? 1
  const level = JSON.parse(fixtureFiles['content/levels/level-1.json'] ?? '') as Record<string, unknown>
  const floor = Array.from({ length: 16 }, (_, col) => (col >= GAP.from && col <= GAP.to ? '.' : '#')).join('')
  const tiles = [...(level.tiles as string[]).slice(0, -1), floor]
  const starts = Array.from({ length: players }, (_, i) => ({ player: i + 1, x: 2.5 + i, y: 7.5 }))
  const lost = setup.lost === undefined ? 'hero.fell' : setup.lost
  let toml = fixtureFiles['automata.toml'] ?? ''
  const extra = [...(players > 1 ? [`players = ${players}`] : []), ...(lost === null ? [] : [`lost = "${lost}"`])]
  toml = toml.replace('hero = "hero"\n', `hero = "hero"\n${extra.map((line) => `${line}\n`).join('')}`)
  return {
    'automata.toml': toml,
    'content/levels/level-1.json': writeContent('level', {
      ...level,
      tiles,
      things: setup.things ?? [],
      starts,
    } as never),
  }
}
