// Behaviour rules in the sim: each tick a thing whose character has a behaviour looks at what is near, follows the
// first rule that fits, and sets how fast it walks. It is switched on by content (`usesBehaviours`), so a game with no
// behaviour has no `Mind` and no system, and every recorded hash stays as it was. The rules are `mind.ts`'s; this file
// feeds them from the sim's own state: `Transform` for where things are, `Body` for how they moved.
import type { BehaviourFile, GameContent } from '../content/content.ts'
import { Body, Transform } from '../physics/physics.ts'
import {
  definePlugin,
  defineSystem,
  type EntityRef,
  hypot,
  type PluginDef,
  type SimContext,
  type SystemDef,
} from '../sim/sim.ts'
import { Thing } from './components.ts'
import { firstRule, Mind, type Sensed, stepOf } from './mind.ts'
import { Story, type StoryState } from './story-state.ts'
import { usesStory } from './story.ts'

/** True when some character of the game has a behaviour: the only games that get this plugin. */
export function usesBehaviours(content: GameContent): boolean {
  return Object.values(content.characters).some((character) => character.behaviour !== undefined)
}

/** Standing this still, up or down (tiles a second), counts as not moving. */
const STILL = 0.01
/** A thing that asked to walk and moves at less than this share of that speed is walking into something. */
const BLOCKED_SHARE = 0.1
/** `rest` stops counting here; two ticks in a row is "on the ground". */
const REST_MAX = 4
const ON_GROUND = 2

/** The kinds of thing a behaviour looks at, each once. */
function kindsOf(file: BehaviourFile): string[] {
  const kinds = new Set<string>()
  for (const rule of file.rules) {
    for (const sense of rule.when) if (sense.sense === 'near' || sense.sense === 'far') kinds.add(sense.kind)
    if (rule.do.act === 'flee') kinds.add(rule.do.from)
    if (rule.do.act === 'follow') kinds.add(rule.do.to)
  }
  return [...kinds]
}

/** Where one thing is, and what kind of thing it is. */
interface Spot {
  readonly sid: number
  readonly x: number
  readonly y: number
  readonly kind: string | undefined
}

/** The nearest thing of each kind to the thing `sid` at `at`, other than itself; the lowest sid wins a tie. */
function nearestOf(
  sid: number,
  at: { readonly x: number; readonly y: number },
  spots: readonly Spot[],
  kinds: readonly string[],
): Sensed['nearest'] {
  const nearest: Record<string, { distance: number; side: number } | undefined> = {}
  for (const kind of kinds) {
    for (const other of spots) {
      if (other.sid === sid || other.kind !== kind) continue
      const distance = hypot(other.x - at.x, other.y - at.y)
      const best = nearest[kind]
      if (best === undefined || distance < best.distance) {
        const dx = other.x - at.x
        nearest[kind] = { distance, side: dx > 0 ? 1 : dx < 0 ? -1 : 0 }
      }
    }
  }
  return nearest
}

/** One thing's turn: sense, pick a rule, act. Writes a field only when it changes. */
function behave(ctx: SimContext, content: GameContent, e: EntityRef, spots: readonly Spot[]): void {
  const mind = e.get(Mind)
  const body = e.get(Body)
  const file = content.behaviours?.[mind.behaviour]
  // Hand-built content may lack the file; the thing then stands still, and nothing throws.
  if (file === undefined) {
    if (body.vx !== 0) e.set(Body, { vx: 0 })
    if (mind.want !== 0) e.set(Mind, { want: 0 })
    return
  }
  const rest = Math.abs(body.vy) < STILL ? Math.min(mind.rest + 1, REST_MAX) : 0
  const sensed: Sensed = {
    blocked: Math.abs(mind.want) > 0 && Math.abs(body.vx) < Math.abs(mind.want) * BLOCKED_SHARE,
    onGround: rest >= ON_GROUND,
    nearest: nearestOf(e.sid, e.get(Transform), spots, kindsOf(file)),
  }
  const rule = firstRule(file.rules, sensed)
  const step = stepOf(rule.do, sensed, { dir: mind.dir, since: mind.since }, ctx.tick)
  const moved: { vx?: number; vy?: number } = {}
  if (step.vx !== undefined && step.vx !== body.vx) moved.vx = step.vx
  if (step.vy !== undefined && step.vy !== body.vy) moved.vy = step.vy
  if (moved.vx !== undefined || moved.vy !== undefined) e.set(Body, moved)
  const want = step.vx ?? 0
  const thought: { rule?: string; dir?: number; since?: number; want?: number; rest?: number } = {}
  if (rule.id !== mind.rule) thought.rule = rule.id
  if (step.dir !== mind.dir) thought.dir = step.dir
  if (step.since !== mind.since) thought.since = step.since
  if (want !== mind.want) thought.want = want
  if (rest !== mind.rest) thought.rest = rest
  if (Object.keys(thought).length > 0) e.set(Mind, thought)
}

/** A thing stands still while a cutscene plays, and while it is the one being talked to. */
function stands(story: StoryState | undefined, sid: number): boolean {
  return story !== undefined && (story.scene !== null || story.talk?.thing === sid)
}

/** Stops a thing where it is: no sideways speed, and nothing asked for. */
function stand(e: EntityRef): void {
  if (e.get(Body).vx !== 0) e.set(Body, { vx: 0 })
  if (e.get(Mind).want !== 0) e.set(Mind, { want: 0 })
}

const behaviourSystem: SystemDef = defineSystem({
  name: 'level.behaviour',
  phase: 'gameplay',
  run(ctx) {
    const content = ctx.content as GameContent
    const minds = ctx.query(Mind, Thing, Transform, Body)
    if (minds.length === 0) return
    // Everything that can be sensed: each thing with a place, by its character's kind, lowest sid first.
    const spots: Spot[] = ctx.query(Thing, Transform).map((e) => ({
      sid: e.sid,
      x: e.get(Transform).x,
      y: e.get(Transform).y,
      kind: content.characters[e.get(Thing).character]?.kind,
    }))
    // Only a game with a story has one to ask; the story plugin is not there otherwise.
    const story = usesStory(content) ? ctx.resource(Story) : undefined
    for (const e of minds) {
      if (stands(story, e.sid)) stand(e)
      else behave(ctx, content, e, spots)
    }
  },
})

/**
 * The plugin a game with a behaviour gets: the `mind` component and one system in `gameplay`. It runs after physics,
 * so it reads how things moved this tick, and before nothing: a game's own systems in the phase are ordered by name.
 */
export const behaviourPlugin: PluginDef = definePlugin({
  name: 'behaviour',
  dependsOn: ['level'],
  components: [Mind],
  systems: [behaviourSystem],
})
