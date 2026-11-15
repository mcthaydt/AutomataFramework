// A tune: the hero's eighteen numbers changed while the game plays (plan G). It is a command, like a key press, so a
// tuned play is still recorded, saved, restored and replayed like any other. The command, the resource it writes and the
// system that writes it join a sim only when the sim is made `tunable` (see `movesPlugin`), so every other game keeps the
// sim it had and no golden moves. The numbers a tune carries are read by the `level.moves` system in place of the file's
// from the next tick; nothing else is touched.
import { z } from '../../lib/zod.ts'
import { MOVE_NUMBERS, type MoveNumbers, moveNumbersOf } from '../content/content.ts'
import {
  type Command,
  type CommandDef,
  defineCommand,
  defineResource,
  defineSystem,
  type ResourceDef,
  type SimContext,
  type SystemDef,
} from '../sim/sim.ts'

const tunePayload = z.strictObject({ values: z.array(z.number()).length(MOVE_NUMBERS.length) })

/** The hero's eighteen numbers from this tick on: `values` in `MOVE_NUMBERS` order. Only a tunable sim knows it. */
export const TuneCommand: CommandDef<typeof tunePayload> = defineCommand('tune', tunePayload)

const tunedSchema = z.strictObject({ values: z.array(z.number()).max(MOVE_NUMBERS.length) })

/** The numbers the last tune gave, or none yet. In every snapshot of a tunable sim. */
export const Tuned: ResourceDef<typeof tunedSchema> = defineResource('level.tuned', tunedSchema, () => ({
  values: [],
}))

/** The command that tunes at `tick`, with `numbers`. Its source is 0: nobody's hero. */
export function tuneCommand(tick: number, seq: number, numbers: MoveNumbers): Command {
  return {
    tick,
    source: 0,
    seq,
    type: TuneCommand.id,
    payload: { values: MOVE_NUMBERS.map((n) => numbers[n.key]) },
  }
}

const memo = new WeakMap<readonly number[], MoveNumbers>()

/**
 * The tuned numbers, held inside the framework's limits, or `undefined` before the first tune. The answer is kept by
 * the resource's array, so a tick that is not a tune's allocates nothing.
 */
export function tunedNumbers(ctx: SimContext): MoveNumbers | undefined {
  const { values } = ctx.resource(Tuned)
  if (values.length === 0) return undefined
  let known = memo.get(values)
  if (known === undefined) {
    known = moveNumbersOf(Object.fromEntries(MOVE_NUMBERS.map((n, i) => [n.id, values[i] ?? n.value])))
    memo.set(values, known)
  }
  return known
}

/**
 * Takes the last tune of the tick (the highest `seq`, as the sim hands commands over by source and then `seq`) into the
 * resource. It runs in the `input` phase, before `level.moves`, so a tune made on the tick a jump is pressed is the
 * numbers that jump leaves with.
 */
export const tuneSystem: SystemDef = defineSystem({
  name: 'level.tune',
  phase: 'input',
  run(ctx) {
    const last = ctx.commands.of(TuneCommand).at(-1)
    if (last !== undefined) ctx.resource(Tuned).values = [...last.payload.values]
  },
})
