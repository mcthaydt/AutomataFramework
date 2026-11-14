// What a character with a behaviour senses, and which of its rules fits: pure functions over plain numbers, so the
// rules can be tested with no sim. `behaviour.ts` is the system that feeds them from the sim's own state.
// A rule is the first whose every sense holds, and the last rule always fits (plan C checks that its `when` is empty).
import type { Act, BehaviourRule, Sense } from '../content/content.ts'
import { type ComponentDef, defineComponent } from '../sim/sim.ts'

const mindFields = {
  /** The behaviour file's id. */
  behaviour: 'string',
  /** The rule it followed last tick, '' before the first. */
  rule: 'string',
  /** 1 walking right, -1 walking left. */
  dir: 'i32',
  /** The tick it last turned round. */
  since: 'u32',
  /** The sideways speed it asked for last tick, in tiles a second. */
  want: 'f32',
  /** Ticks in a row it has hardly moved up or down; stops counting at 4. */
  rest: 'u32',
} as const
/** On every thing whose character has a `behaviour`, and never on a hero. Not drawn. */
export const Mind: ComponentDef<typeof mindFields> = defineComponent('mind', mindFields, { render: false })

/** What one thing senses this tick. */
export interface Sensed {
  readonly blocked: boolean
  readonly onGround: boolean
  /** The nearest thing of each kind the behaviour names: how far, and which side (1 right, -1 left, 0 the same spot). */
  readonly nearest: Readonly<Record<string, { readonly distance: number; readonly side: number } | undefined>>
}

/** True when this one sense holds. */
function holds(sense: Sense, sensed: Sensed): boolean {
  switch (sense.sense) {
    case 'near': {
      const found = sensed.nearest[sense.kind]
      return found !== undefined && found.distance < sense.within
    }
    case 'far': {
      // With none of that kind in the game, there is nothing near, so "far" holds.
      const found = sensed.nearest[sense.kind]
      return found === undefined || found.distance > sense.beyond
    }
    case 'blocked':
      return sensed.blocked
    case 'on-ground':
      return sensed.onGround
  }
}

/** The first rule every one of whose senses holds. The last rule's `when` is `[]`, so there is always one. */
export function firstRule(rules: readonly BehaviourRule[], sensed: Sensed): BehaviourRule {
  const fits = (rule: BehaviourRule): boolean => rule.when.every((sense) => holds(sense, sensed))
  return rules.find(fits) ?? (rules.at(-1) as BehaviourRule)
}

/** What a rule's act asks for this tick. A field left out is left alone; `dir` and `since` always come back. */
export interface MindStep {
  readonly vx?: number
  readonly vy?: number
  readonly dir: number
  readonly since: number
}

/** Closer than this sideways, a follower has arrived, in tiles. */
const ARRIVED = 0.05

/**
 * What `act` does this tick. Speeds are tiles a second, which is `Body.vx`'s unit; y points down, so up is negative.
 * `mind` is its direction and the tick it last turned; `tick` is now.
 */
export function stepOf(
  act: Act,
  sensed: Sensed,
  mind: { readonly dir: number; readonly since: number },
  tick: number,
): MindStep {
  const { dir, since } = mind
  switch (act.act) {
    case 'stay':
      return { vx: 0, dir, since }
    case 'wander': {
      // It turns on time, or at once when it walked into something, but never twice in the one tick.
      const turn = tick - since >= act.turnEvery || (sensed.blocked && tick > since)
      const heading = turn ? -dir : dir
      return { vx: heading * act.speed, dir: heading, since: turn ? tick : since }
    }
    case 'flee': {
      const found = sensed.nearest[act.from]
      if (found === undefined) return { vx: 0, dir, since }
      const heading = found.side === 0 ? dir : -found.side
      return { vx: heading * act.speed, dir: heading, since }
    }
    case 'follow': {
      const found = sensed.nearest[act.to]
      if (found === undefined || found.side === 0 || found.distance < ARRIVED) return { vx: 0, dir, since }
      return { vx: found.side * act.speed, dir: found.side, since }
    }
    case 'jump':
      return sensed.onGround ? { vy: -act.speed, dir, since } : { dir, since }
  }
}
