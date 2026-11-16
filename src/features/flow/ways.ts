// What the flow does about the way a visit goes through a level (plan W, task 12): a door that is taken, a hero that
// crosses an edge into another level of the place, a switch that is held open for good. `watchWays` hears them in the
// running game's steps; `takeDoor` is what the flow does about a door. Neither owns a rule: `doorTaken` says which door,
// `advance` says what comes next, and the saved games are `places`.
import type { Words } from '../../lib/message.ts'
import type { GameContent, LevelPoint } from '../content/content.ts'
import type { Game } from '../game/game.ts'
import { type Arrive, doorTaken, type Way } from '../level/level.ts'
import type { Places } from './places.ts'
import type { Progress } from './progress.ts'
import type { FlowEvent } from './steps.ts'

/** What `watchWays` tells, and about which game. */
export interface WatchWays {
  /** Only `onStep` is used. */
  readonly game: Pick<Game, 'onStep'>
  readonly content: GameContent
  /** The level the sim was opened at: in a place the touched things' ids are read against it. */
  readonly level: string
  /** A hero went through a door. Called once, and nothing more is heard after it. */
  onDoor(way: Way): void
  /** Player 1's middle passed into another level of the place; `at` is in that level's own tiles. */
  onEntered(level: string, at: LevelPoint): void
  /** A switch was held open for good: `room-2.gate-1.open`. */
  onFact(fact: string): void
}

/**
 * Listens to each step of the game. The first door stops everything: it is told once and the listener is gone before
 * `onDoor` returns, so a second hero a tick later, or a second door, starts nothing (audit M1). Returns the function that
 * stops the listening.
 */
export function watchWays(options: WatchWays): () => void {
  const stop = options.game.onStep((step) => {
    const way = doorTaken(options.content, options.level, step.events)
    if (way !== undefined) {
      stop()
      options.onDoor(way)
      return
    }
    for (const event of step.events) {
      const payload = event.payload as Record<string, unknown>
      if (event.type === 'level.entered' && payload.player === 1)
        options.onEntered(String(payload.level), { x: Number(payload.x), y: Number(payload.y) })
      else if (event.type === 'fact.kept') options.onFact(String(payload.fact))
    }
  })
  return stop
}

/** What `takeDoor` needs from the flow. */
export interface TakeDoor {
  readonly places: Places<Progress>
  readonly words: Words
  /** Holds the game still, at once, before anything is awaited. */
  pause(): void
  /** False once the visit has moved on or been stopped, so a late answer starts nothing. */
  current(): boolean
  dispatch(event: FlowEvent): void
}

/**
 * A hero went through `way`: the game is held still before anything is awaited, the saved game says where the player
 * came in and that this level is reached, and then the flow opens the level with no screen between. A save that cannot
 * be kept does not stop the visit: it goes on from memory, and the warnings screen has already said when nothing can be
 * kept.
 */
export async function takeDoor(way: Way, flow: TakeDoor): Promise<void> {
  flow.pause()
  await flow.places.cameIn({ level: way.level, ...(way.thing === undefined ? {} : { thing: way.thing }) })
  await flow.places.reach(way.level, flow.words('automata.done.not-kept'))
  if (!flow.current()) return
  const arrive: Arrive | undefined = way.thing === undefined ? undefined : { thing: way.thing }
  flow.dispatch(
    arrive === undefined ? { type: 'door', level: way.level } : { type: 'door', level: way.level, arrive },
  )
}

/** The event that opens `level` as Continue and the saves screen do: where the player left off, when the save says. */
export function playEvent(level: string, arrive: Arrive | undefined): FlowEvent {
  return arrive === undefined ? { type: 'play', level } : { type: 'play', level, arrive }
}

/**
 * Where a hero crossed into `level`, kept a tile in from the level's left and right edges: at the edge itself a hero
 * would be half in the level next door, and Continue would not find room to put it there.
 */
function inside(content: GameContent, level: string, at: LevelPoint): LevelPoint {
  const width = content.levels[level]?.tiles[0]?.length ?? 0
  return { x: width < 2 ? at.x : Math.min(Math.max(at.x, 1), width - 1), y: at.y }
}

/** What `followWays` needs: the running game and its level, and what `takeDoor` needs bar the pause. */
export interface FollowWays extends Omit<TakeDoor, 'pause'> {
  readonly game: Game
  readonly content: GameContent
  /** The level the sim was opened at. */
  readonly level: string
}

/**
 * Wires the running game's doors, edges and kept facts to the saved game and to the flow: a door is `takeDoor`, a hero of
 * player 1 crossing into another level writes where they came in, a fact kept is written. Returns the function that stops
 * the listening.
 */
export function followWays(flow: FollowWays): () => void {
  const { places, game } = flow
  return watchWays({
    game,
    content: flow.content,
    level: flow.level,
    onDoor: (way) => void takeDoor(way, { ...flow, pause: () => game.pause() }),
    onEntered: (level, at) => void places.cameIn({ level, ...inside(flow.content, level, at) }),
    onFact: (fact) => void places.remember(fact),
  })
}

/** What `startGame` is given about how the level is opened: where the heroes come in, and what was done for good. */
export function startOptions(
  arrive: Arrive | undefined,
  facts: readonly string[] | undefined,
): { readonly arrive?: Arrive; readonly facts?: readonly string[] } {
  return { ...(arrive === undefined ? {} : { arrive }), ...(facts === undefined ? {} : { facts }) }
}
