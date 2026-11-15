// The built-in hero: a plugin that walks and jumps (and, switched on in the character file, double jumps, wall jumps
// and dashes) every hero whose character has `moves`, from the numbers of its tuning file and what its player holds.
// It joins a sim only when the project's hero has `moves` (see `createGameSim`), as `touch` and `sprites` do, so every
// other game keeps the sim it had. The rules themselves are one pure function (move-step.ts); this file is the part
// that reads the sim and writes it back.
import { z } from '../../lib/zod.ts'
import { isHeld, Player, wasPressed } from '../commands/commands.ts'
import { type GameContent, moveNumbers } from '../content/content.ts'
import { Body, Touching } from '../physics/physics.ts'
import {
  type ComponentDef,
  defineComponent,
  defineEvent,
  definePlugin,
  defineSystem,
  type EventDef,
  type PluginDef,
  type SystemDef,
} from '../sim/sim.ts'
import { Thing } from './components.ts'
import { type MoveEventName, type MoveInput, type MoveState, stepMoves } from './move-step.ts'
import { TuneCommand, Tuned, tunedNumbers, tuneSystem } from './tune.ts'

const movesFields = {
  face: 'i32',
  stood: 'bool',
  grace: 'u32',
  press: 'u32',
  rising: 'bool',
  airJumps: 'u32',
  sliding: 'bool',
  lock: 'u32',
  lockDir: 'i32',
  dash: 'u32',
  dashDir: 'i32',
  rest: 'u32',
  airDashes: 'u32',
  walking: 'bool',
  mode: 'u32',
  run: 'f32',
} as const

/**
 * What a hero moved by the framework remembers between ticks: `MoveState`'s fields in its order, which never changes.
 * Not drawn. Only a sim whose hero has `moves` has it.
 */
export const Moves: ComponentDef<typeof movesFields> = defineComponent('moves', movesFields, {
  render: false,
})

/** What a `hero.*` event says: whose hero it was and which entity. */
export interface MoveEvent {
  readonly player: number
  readonly sid: number
}

const movePayload: z.ZodType<MoveEvent> = z.object({ player: z.number().int(), sid: z.number().int() })

/** The eight events, in the order the spec lists them. */
export const MOVE_EVENTS: readonly MoveEventName[] = [
  'walked',
  'jumped',
  'landed',
  'left-ground',
  'air-jumped',
  'wall-slid',
  'wall-jumped',
  'dashed',
]

const known = new Map<MoveEventName, EventDef<z.ZodType<MoveEvent>>>()

/**
 * The one event object for `hero.<name>`: the same object every call, because a sim knows an event by the object and
 * not by its name. A game with a built-in hero must not define events of these names itself.
 */
export function moveEvent(name: MoveEventName): EventDef<z.ZodType<MoveEvent>> {
  let event = known.get(name)
  if (event === undefined) {
    event = defineEvent(`hero.${name}`, movePayload)
    known.set(name, event)
  }
  return event
}

/**
 * The plugin. `gravity` is the sim's: a dash holds its height by setting the upward speed that one tick of it brings
 * to nothing, `-gravity.y * dt`.
 */
export function movesPlugin(options: {
  readonly gravity: { readonly x: number; readonly y: number }
  /** Adds the tune command, its resource and its system (tune.ts). Left out, the plugin is exactly as it was. */
  readonly tunable?: boolean
}): PluginDef {
  const movesSystem: SystemDef = defineSystem({
    name: 'level.moves',
    phase: 'gameplay',
    run(ctx) {
      const content = ctx.content as GameContent
      const hover = -options.gravity.y * ctx.dt
      for (const hero of ctx.query(Player, Body, Moves, Touching)) {
        const moves = content.characters[hero.get(Thing).character]?.moves
        if (moves === undefined) continue
        const touching = hero.get(Touching)
        const body = hero.get(Body)
        const left = isHeld(hero, 'left')
        const right = isHeld(hero, 'right')
        const input: MoveInput = {
          dir: left === right ? 0 : right ? 1 : -1,
          jumpPressed: wasPressed(hero, 'jump'),
          jumpHeld: isHeld(hero, 'jump'),
          dashPressed: moves.dash && wasPressed(hero, 'dash'),
          below: touching.below,
          wall: touching.left === touching.right ? 0 : touching.left ? -1 : 1,
          vx: body.vx,
          vy: body.vy,
        }
        const result = stepMoves(
          { ...hero.get(Moves) } as MoveState,
          input,
          // A tunable sim reads the last tune's numbers, once there is one, and the file's before that.
          (options.tunable ? tunedNumbers(ctx) : undefined) ?? moveNumbers(content.tunings?.[moves.tuning]),
          { doubleJump: moves['double-jump'], wallJump: moves['wall-jump'], dash: moves.dash },
          hover,
        )
        hero.set(Body, { vx: result.vx, vy: result.vy })
        hero.set(Moves, result.state)
        const said: MoveEvent = { player: hero.get(Player).number, sid: hero.sid }
        for (const name of result.events) ctx.emit(moveEvent(name), said)
      }
    },
  })
  return definePlugin({
    name: 'moves',
    dependsOn: ['level'],
    components: [Moves],
    events: MOVE_EVENTS.map(moveEvent),
    systems: options.tunable ? [tuneSystem, movesSystem] : [movesSystem],
    // The config is in the schema hash, so a snapshot of a tunable sim never restores into a plain one.
    ...(options.tunable ? { config: { tunable: true }, commands: [TuneCommand], resources: [Tuned] } : {}),
  })
}
