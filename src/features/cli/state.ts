// Where everything is in a game, as data: what an agent asks for to see a play without a screen. It reads through the
// game's own copy of the framework (its components are that copy's, and two copies never share a component).
import type { Sim } from '../sim/sim.ts'
import type { GameCode } from './ports.ts'

/** Every thing of the level and every hero, by id. */
export interface GameState {
  readonly tick: number
  readonly hash: string
  readonly level: string
  readonly players: readonly number[]
  readonly things: readonly {
    readonly id: string
    readonly character: string
    readonly x: number
    readonly y: number
    readonly vx: number
    readonly vy: number
  }[]
}

/** To a thousandth: the sim keeps 32-bit numbers, and `6.5000001` is noise to a person or an agent reading this. */
const rounded = (n: number): number => Math.round(n * 1000) / 1000 + 0

/** The state of `sim` now. `level` is the level it was opened on. */
export function gameState(code: GameCode, sim: Sim, level: string): GameState {
  const { Body, Player, Thing, Transform } = code.framework
  const things = sim
    .query(Thing, Transform)
    .map((entity) => {
      const { id, character } = entity.get(Thing)
      const { x, y } = entity.get(Transform)
      const { vx, vy } = entity.has(Body) ? entity.get(Body) : { vx: 0, vy: 0 }
      return { id, character, x: rounded(x), y: rounded(y), vx: rounded(vx), vy: rounded(vy) }
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const players = sim
    .query(Player)
    .map((entity) => entity.get(Player).number)
    .sort((a, b) => a - b)
  return { tick: sim.tick, hash: sim.hash(), level, players, things }
}

/** The state as a person reads it: where each thing is and how fast it moves. */
export function describeState(state: GameState): string {
  const who =
    state.players.length === 0
      ? 'with no players'
      : `with ${state.players.length === 1 ? 'player' : 'players'} ${state.players.join(', ')}`
  return [
    `At tick ${state.tick} on ${state.level}, ${who}:`,
    ...state.things.map(
      (t) => `${t.id} (${t.character}) is at ${t.x}, ${t.y} and moving ${t.vx}, ${t.vy}`,
    ),
  ].join('\n')
}
