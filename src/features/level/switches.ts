// Switches and gates (plan W): a plate or a button is pressed by what stands on it, and opens the gates its `thing` value
// links, with no game code. What was done for good (a button that stays down) is raised as a fact, and told back to a
// sim by one command at tick 0, so a recording carries it and a saved game can open its gates before the first picture.
import { z } from '../../lib/zod.ts'
import type { Character, GameContent } from '../content/content.ts'
import { Body, BodyKind, Collider, Transform } from '../physics/physics.ts'
import {
  type Command,
  type CommandDef,
  type ComponentDef,
  defineCommand,
  defineComponent,
  defineEvent,
  definePlugin,
  defineSystem,
  type EntityRef,
  type EventDef,
  type PluginDef,
  type SystemDef,
} from '../sim/sim.ts'
import { Thing } from './components.ts'
import { boxesOverlap, type TurnedBox } from './overlap.ts'
import { setClip } from './sprite.ts'
import { usesSprites } from './uses.ts'
import { valuesOf } from './values.ts'
import { thingIn, Where } from './where.ts'

const pressedFields = { on: 'bool' } as const
/** On a thing whose character has `switch`: whether something stands on it now. Not drawn. */
export const Pressed: ComponentDef<typeof pressedFields> = defineComponent('level.pressed', pressedFields, {
  render: false,
})

const openFields = { on: 'bool', kept: 'bool' } as const
/**
 * On a thing whose character has `opens`: `on` when it is open (a sensor, so things pass through) and `kept` when it
 * was opened for good. Not drawn.
 */
export const Open: ComponentDef<typeof openFields> = defineComponent('level.open', openFields, {
  render: false,
})

/** What a gate event says: which thing opened or shut, and its StableId. */
export interface OpenPayload {
  readonly thing: string
  readonly sid: number
}
const openPayload: z.ZodType<OpenPayload> = z.strictObject({ thing: z.string(), sid: z.number().int() })
const knownOpen = new Map<string, EventDef<z.ZodType<OpenPayload>>>()

/**
 * The one event object for `<kind>.opened` or `<kind>.closed` (payload `{ thing, sid }`): the same object every call,
 * because a sim knows an event by the object and not by its name, as `touchEvent` does.
 */
export function openEvent(kind: string, what: 'opened' | 'closed'): EventDef<z.ZodType<OpenPayload>> {
  const id = `${kind}.${what}`
  let event = knownOpen.get(id)
  if (event === undefined) {
    event = defineEvent(id, openPayload)
    knownOpen.set(id, event)
  }
  return event
}

const factPayload: z.ZodType<{ fact: string }> = z.strictObject({ fact: z.string() })
/** Raised once when a `stays` switch first holds a thing open for good: `{ fact: 'room-2.gate-1.open' }`. */
export const FactKept: EventDef<z.ZodType<{ fact: string }>> = defineEvent('fact.kept', factPayload)

const factsPayload: z.ZodType<{ facts: string[] }> = z.strictObject({
  facts: z.array(z.string().max(200)).max(1024),
})
/**
 * Tells the sim what was done for good before this play. Only one sent at tick 0 with source 0 is believed; any other is
 * ignored, never rejected, so a replay still reads and a player of an online room cannot open a gate by sending one.
 */
export const FactsCommand: CommandDef<z.ZodType<{ facts: string[] }>> = defineCommand('facts', factsPayload)

/** The command that tells a sim `facts`: tick 0, source 0, seq 0. */
export function factsCommand(facts: readonly string[]): Command {
  return { tick: 0, source: 0, seq: 0, type: FactsCommand.id, payload: { facts: [...facts] } }
}

/** The kind a character's gate events are named after: its `kind`, else its own id. */
export const openKindOf = (character: Character): string => character.kind ?? character.id

/** A thing's box, from its transform and its collider's half sizes. */
function boxOf(entity: EntityRef): TurnedBox {
  const at = entity.get(Transform)
  const shape = entity.get(Collider)
  return { x: at.x, y: at.y, hw: shape.hx, hh: shape.hy, rotation: at.rotation }
}

/** The fact a gate opened for good is remembered as: the level and the thing as the files write them. */
const factOf = (level: string, id: string): string => `${level}.${id}.open`

const switchesSystem: SystemDef = defineSystem({
  name: 'level.switches',
  phase: 'gameplay',
  run(ctx) {
    const content = ctx.content as GameContent
    const where = ctx.resource(Where)

    // 1. What was done for good: one command, from source 0, on tick 0, and nothing else.
    if (ctx.tick === 0) {
      const told = new Set<string>()
      for (const command of ctx.commands.of(FactsCommand))
        if (command.source === 0) for (const fact of command.payload.facts) told.add(fact)
      for (const gate of ctx.query(Open, Thing)) {
        const at = thingIn(where, gate.get(Thing).id)
        if (at !== undefined && told.has(factOf(at.level, at.id))) gate.set(Open, { kept: true })
      }
    }

    // What can press a switch or stand in a gate: any thing with a body that moves.
    const movers = ctx.query(Thing).filter((e) => e.has(Body) && e.get(Body).kind !== BodyKind.fixed)
    const overlapsAMover = (entity: EntityRef): boolean => {
      const box = boxOf(entity)
      return movers.some((m) => m.sid !== entity.sid && boxesOverlap(box, boxOf(m)))
    }

    // 2. Presses. A switch is pressed while a mover overlaps its box; one that stays keeps what it links open for good.
    const linked = new Set<number>()
    for (const plate of ctx.query(Pressed, Thing, Transform, Collider)) {
      const character = content.characters[plate.get(Thing).character]
      const link = character?.switch
      if (link === undefined) continue
      const now = overlapsAMover(plate)
      const was = plate.get(Pressed).on
      if (now !== was) plate.set(Pressed, { on: now })
      if (!now) continue
      const values = valuesOf(ctx, plate.sid)
      const targets = values.things(link.opens)
      for (const sid of targets) linked.add(sid)
      if (was || link.stays === undefined || !values.switch(link.stays)) continue
      for (const sid of targets) {
        const gate = ctx.entity(sid)
        if (gate === undefined || !gate.has(Open) || gate.get(Open).kept) continue
        gate.set(Open, { kept: true })
        const at = thingIn(where, gate.get(Thing).id)
        if (at !== undefined) ctx.emit(FactKept, { fact: factOf(at.level, at.id) })
      }
    }

    // 3. Open or shut. A gate is open when it was kept open or a pressed switch links it; it shuts only when empty.
    for (const gate of ctx.query(Open, Thing, Transform, Collider)) {
      const open = gate.get(Open)
      const want = open.kept || linked.has(gate.sid)
      if (want === open.on) continue
      if (!want && overlapsAMover(gate)) continue
      const character = content.characters[gate.get(Thing).character]
      if (character === undefined) continue
      gate.set(Open, { on: want })
      gate.set(Collider, { sensor: want })
      ctx.emit(openEvent(openKindOf(character), want ? 'opened' : 'closed'), {
        thing: gate.get(Thing).id,
        sid: gate.sid,
      })
      if (usesSprites(content)) setClip(gate, want ? 'open' : 'shut')
    }
  },
})

/**
 * The plugin a game with a switch or a gate gets: name `switches`, depends on `level` and `where`, config `{ kinds }`.
 * `kinds` are the kinds of every character with `opens`, each list sorted and without repeats, so the plugin registers
 * `<kind>.opened` and `<kind>.closed` for each. Where it stands in the plugin list does not matter: its system sorts after
 * `level.moves` by name, so a press reads the boxes after the hero has moved.
 */
export function switchPlugin(kinds: readonly string[]): PluginDef {
  return definePlugin({
    name: 'switches',
    dependsOn: ['level', 'where'],
    config: { kinds },
    components: [Pressed, Open],
    commands: [FactsCommand],
    events: [FactKept, ...kinds.flatMap((kind) => [openEvent(kind, 'opened'), openEvent(kind, 'closed')])],
    systems: [switchesSystem],
  })
}

/** Every kind a gate event is named after, sorted and without repeats. */
export function openKinds(content: GameContent): readonly string[] {
  return [
    ...new Set(
      Object.values(content.characters).flatMap((c) => (c.opens === undefined ? [] : [openKindOf(c)])),
    ),
  ].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}
