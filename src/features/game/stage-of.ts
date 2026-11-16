// What the renderer is given for a level or a place, decided in one spot for `startGame`, `watchReplay` and
// `startOnlineGame`, so the three never disagree: the world's outline (the camera's limit), each level's offset, sky and
// view, and the follower that moves the renderer into the level the lowest-numbered hero is in.

import type { GameContent, Level } from '../content/content.ts'
import { heroLevels, levelsOf, placeSize, type SimLevel, skyOf } from '../level/level.ts'
import type { Renderer, StageLevel } from '../render/render.ts'
import type { Sim } from '../sim/sim.ts'

/** What `createRenderer` takes for the place `opened` is in: its outline and each of its levels. */
export interface StageOf {
  readonly world: { readonly w: number; readonly h: number }
  readonly levels: readonly StageLevel[]
  /** The opened level's own `SimLevel`s, for `loadArt`. */
  readonly simLevels: readonly SimLevel[]
}

/**
 * The world and the levels to draw when `opened` is opened: its place's outline and each level's offset, sky and view; or
 * the one level, whose outline is its own size. Throws when the level is missing (the callers say so first, in their own
 * words).
 */
export function stageOf(content: GameContent, opened: string): StageOf {
  const simLevels = levelsOf(content, opened)
  const levels = simLevels.map((l) => {
    const level = content.levels[l.level] as Level
    return { ...l, sky: skyOf(level), view: level.view }
  })
  return { world: placeSize(simLevels), levels, simLevels }
}

/**
 * Moves `renderer` into the level the lowest-numbered hero is in, each time it changes. Call the returned function after
 * each step (and after a restore: a place's watch goes back to the start every round). Does nothing in a level alone.
 */
export function followLevel(
  renderer: Renderer,
  sim: Sim,
  opened: string,
  levels: readonly StageLevel[],
): () => void {
  if (levels.length < 2) return () => {}
  let shown = opened
  return () => {
    const lead = heroLevels(sim, opened)[0]
    if (lead === undefined || lead.level === shown) return
    shown = lead.level
    renderer.enter(shown)
  }
}
