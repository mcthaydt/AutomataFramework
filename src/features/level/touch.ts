import { z } from 'zod'
import { Player } from '../commands/commands.ts'
import type { Character, GameContent } from '../content/content.ts'
import { CollisionEnded, CollisionStarted } from '../physics/physics.ts'
import {
  defineEvent,
  definePlugin,
  defineSystem,
  type EntityRef,
  type EventDef,
  type PluginDef,
  type SimContext,
  type SystemDef,
} from '../sim/sim.ts'
import { Thing } from './components.ts'

/** What a touch event says: which thing was touched, who touched it and whether that was a hero. */
export interface Touch {
  /** The touched thing's id in its level: "spark-1". */
  readonly thing: string
  readonly sid: number
  /** Who touched it: a thing's id, or "player-2". */
  readonly by: string
  readonly bySid: number
  /** That character's kind, or "" when it has none. */
  readonly byKind: string
  /** 1 to 4 when a hero touched it, else 0. */
  readonly player: number
}

const touchPayload: z.ZodType<Touch> = z.object({
  thing: z.string(),
  sid: z.number().int(),
  by: z.string(),
  bySid: z.number().int(),
  byKind: z.string(),
  player: z.number().int(),
})

const known = new Map<string, EventDef<z.ZodType<Touch>>>()

/**
 * The one event object for `<kind>.touched`, `<kind>.left` or `<kind>.taken`: the same object every call, because a
 * sim knows an event by the object and not by its name.
 */
export function touchEvent(kind: string, what: 'touched' | 'left' | 'taken'): EventDef<z.ZodType<Touch>> {
  const id = `${kind}.${what}`
  let event = known.get(id)
  if (event === undefined) {
    event = defineEvent(id, touchPayload)
    known.set(id, event)
  }
  return event
}

/** The two sides of a sensor pair: the touched thing, and what touched it. Undefined when it is no touch. */
interface Sides {
  readonly touched: EntityRef
  readonly character: Character
  readonly by: EntityRef
}

/**
 * Which of two entities is the touched one. The touched one is a character with `touch`; the other must be a thing
 * with no `touch` of its own, so a tile never touches and two touched things never touch each other.
 */
function sidesOf(ctx: SimContext, a: number, b: number): Sides | undefined {
  const content = ctx.content as GameContent
  const first = ctx.entity(a)
  const second = ctx.entity(b)
  if (first === undefined || second === undefined || !first.has(Thing) || !second.has(Thing)) return undefined
  const ofFirst = content.characters[first.get(Thing).character]
  const ofSecond = content.characters[second.get(Thing).character]
  if (ofFirst?.touch !== undefined && ofSecond?.touch === undefined && ofFirst.kind !== undefined)
    return { touched: first, character: ofFirst, by: second }
  if (ofSecond?.touch !== undefined && ofFirst?.touch === undefined && ofSecond.kind !== undefined)
    return { touched: second, character: ofSecond, by: first }
  return undefined
}

function payloadOf(ctx: SimContext, sides: Sides): Touch {
  const content = ctx.content as GameContent
  const by = sides.by.get(Thing)
  return {
    thing: sides.touched.get(Thing).id,
    sid: sides.touched.sid,
    by: by.id,
    bySid: sides.by.sid,
    byKind: content.characters[by.character]?.kind ?? '',
    player: sides.by.has(Player) ? sides.by.get(Player).number : 0,
  }
}

/** A pair of sids as a map key. Physics gives the lower sid first. */
const pairKey = (e: { readonly a: number; readonly b: number }): string => `${e.a}:${e.b}`

const touchSystem: SystemDef = defineSystem({
  name: 'level.touch',
  phase: 'postPhysics',
  after: ['physics.events'],
  run(ctx) {
    const sensed = (def: typeof CollisionEnded) => ctx.events.of(def).filter((e) => e.sensor)
    const ended = sensed(CollisionEnded)
    const started = sensed(CollisionStarted)
    // A pair that ended and started in this one tick never stopped touching: sync-in rebuilt one of the colliders (a
    // hero whose box changed size, say). It makes no event at all.
    const startedKeys = new Set(started.map(pairKey))
    const endedKeys = new Set(ended.map(pairKey))
    const taken = new Set<number>()
    for (const e of ended) {
      if (startedKeys.has(pairKey(e))) continue
      const sides = sidesOf(ctx, e.a, e.b)
      if (sides === undefined) continue
      ctx.emit(touchEvent(sides.character.kind as string, 'left'), payloadOf(ctx, sides))
    }
    for (const e of started) {
      if (endedKeys.has(pairKey(e))) continue
      const sides = sidesOf(ctx, e.a, e.b)
      if (sides === undefined) continue
      const kind = sides.character.kind as string
      const payload = payloadOf(ctx, sides)
      ctx.emit(touchEvent(kind, 'touched'), payload)
      // Whether a touch takes is the touched character's own `touch`, never its kind: two characters may share one.
      if (sides.character.touch === 'take' && payload.player > 0 && !taken.has(payload.sid)) {
        taken.add(payload.sid)
        ctx.emit(touchEvent(kind, 'taken'), payload)
        ctx.despawn(payload.sid)
      }
    }
  },
})

/**
 * The plugin that turns the physics feature's collision events into events named after the touched character's kind:
 * `<kind>.touched` and `<kind>.left` for every kind of either list, and `<kind>.taken` for every kind of `take`. A kind
 * in both lists is registered once. A game's own systems read them in the tick they happen with
 * `ctx.events.of(touchEvent(kind, 'taken'))`.
 */
export function touchPlugin(kinds: {
  readonly sense: readonly string[]
  readonly take: readonly string[]
}): PluginDef {
  const all = [...new Set([...kinds.sense, ...kinds.take])].sort()
  return definePlugin({
    name: 'touch',
    dependsOn: ['level'],
    config: { sense: kinds.sense, take: kinds.take },
    events: [
      ...all.flatMap((kind) => [touchEvent(kind, 'touched'), touchEvent(kind, 'left')]),
      ...kinds.take.map((kind) => touchEvent(kind, 'taken')),
    ],
    systems: [touchSystem],
  })
}
