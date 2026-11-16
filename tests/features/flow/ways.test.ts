// What the flow does about doors, edges and kept facts (plan W, task 12), against a fake game whose steps the test
// drives: the first door stops everything, the game is held still before anything is awaited, and the level is started
// once however many heroes go through however many doors.
import { expect, test } from 'vitest'
import {
  advance,
  type FlowEvent,
  type FlowFacts,
  type FlowState,
  type Progress,
} from '#src/features/flow/flow.ts'
import type { Places } from '#src/features/flow/places.ts'
import { followWays, takeDoor, watchWays } from '#src/features/flow/ways.ts'
import type { Game, GameStep } from '#src/features/game/game.ts'
import type { SimEvent } from '#src/features/sim/sim.ts'
import { loadLinksGame } from '../../fixtures/links-game/read.ts'

/** A game that is only its steps: `emit` is one step of the sim. */
function fakeGame(): {
  readonly game: Pick<Game, 'onStep'>
  emit(events: readonly SimEvent[]): void
  heard(): number
} {
  const listeners = new Set<(step: GameStep) => void>()
  let tick = 0
  return {
    game: {
      onStep(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
    },
    emit(events) {
      tick++
      for (const listener of [...listeners]) listener({ tick, events })
    },
    heard: () => listeners.size,
  }
}

const touched = (thing: string, player: number): SimEvent => ({
  type: 'door.touched',
  payload: { thing, sid: 1, by: `player-${player}`, bySid: 2, byKind: '', player },
})
const entered = (player: number, level: string, x: number, y: number): SimEvent => ({
  type: 'level.entered',
  payload: { level, from: 'room-2', player, sid: 5, x, y },
})
const kept = (fact: string): SimEvent => ({ type: 'fact.kept', payload: { fact } })

const FACTS: FlowFacts = { warnings: false, readable: true, asked: true, first: 'room-1', next: undefined }

test('doors, edges and kept facts are told as they happen, to player 1 only for an edge', async () => {
  const content = await loadLinksGame()
  const fake = fakeGame()
  const told: string[] = []
  watchWays({
    game: fake.game,
    content,
    level: 'room-2',
    onDoor: (way) => told.push(`door ${way.level}`),
    onEntered: (level, at) => told.push(`entered ${level} ${at.x},${at.y}`),
    onFact: (fact) => told.push(`fact ${fact}`),
  })
  fake.emit([entered(1, 'room-3', 0.1, 7.5), entered(2, 'room-3', 0.1, 7.5), kept('room-2.gate-1.open')])
  expect(told).toEqual(['entered room-3 0.1,7.5', 'fact room-2.gate-1.open'])
})

test('two heroes through one door a tick apart, or through two doors, tell the door once and then hear nothing', async () => {
  const content = await loadLinksGame()
  for (const second of [touched('room-3.back', 1), touched('room-2.door-in', 2)]) {
    const fake = fakeGame()
    const told: string[] = []
    watchWays({
      game: fake.game,
      content,
      level: 'room-2',
      onDoor: (way) => told.push(`door ${way.through.thing}`),
      onEntered: () => told.push('entered'),
      onFact: () => told.push('fact'),
    })
    fake.emit([touched('room-3.back', 1)])
    expect(fake.heard()).toBe(0)
    fake.emit([second])
    fake.emit([entered(1, 'room-3', 0.1, 7.5), kept('room-2.gate-1.open')])
    expect(told).toEqual(['door back'])
  }
})

test('the game is held still before anything is awaited, and the door opens its level once', async () => {
  const content = await loadLinksGame()
  const fake = fakeGame()
  const order: string[] = []
  let state: FlowState = { step: 'playing', level: 'room-2', warned: true, taken: false, attempt: 0 }
  let starts = 0
  const dispatch = (event: FlowEvent): void => {
    const next = advance(state, event, FACTS)
    if (next === state) return
    state = next
    starts++
  }
  const places = {
    cameIn: async () => {
      order.push('cameIn')
    },
    reach: async () => {
      order.push('reach')
      return undefined
    },
    remember: async () => {},
  } as unknown as Places<Progress>
  const started: Promise<void>[] = []
  watchWays({
    game: fake.game,
    content,
    level: 'room-2',
    onDoor: (way) => {
      started.push(
        takeDoor(way, {
          places,
          words: (key) => key,
          pause: () => order.push('pause'),
          current: () => true,
          dispatch,
        }),
      )
    },
    onEntered: () => {},
    onFact: () => {},
  })
  fake.emit([touched('room-3.back', 1), touched('room-2.door-in', 2)])
  fake.emit([touched('room-2.door-in', 2)])
  // Before anything was awaited the game was held still and the first thing the door does had begun.
  expect(order).toEqual(['pause', 'cameIn'])
  await Promise.all(started)
  expect(order).toEqual(['pause', 'cameIn', 'reach'])
  expect(started).toHaveLength(1)
  expect(starts).toBe(1)
  expect(state).toMatchObject({ step: 'playing', level: 'room-1', arrive: { thing: 'exit' }, door: true })
})

test('a door that is answered after the visit has moved on opens nothing', async () => {
  const content = await loadLinksGame()
  const fake = fakeGame()
  const sent: FlowEvent[] = []
  const places = {
    cameIn: async () => {},
    reach: async () => undefined,
    remember: async () => {},
  } as unknown as Places<Progress>
  watchWays({
    game: fake.game,
    content,
    level: 'room-1',
    onDoor: (way) =>
      void takeDoor(way, {
        places,
        words: (key) => key,
        pause: () => {},
        current: () => false,
        dispatch: (event) => sent.push(event),
      }),
    onEntered: () => {},
    onFact: () => {},
  })
  fake.emit([touched('exit', 1)])
  await Promise.resolve()
  await Promise.resolve()
  expect(sent).toEqual([])
})

test('a crossing is kept a tile in from the edge, and a kept fact is remembered', async () => {
  const content = await loadLinksGame()
  const fake = fakeGame()
  const written: string[] = []
  const places = {
    cameIn: async (last: { level: string; x?: number; y?: number }) => {
      written.push(`${last.level} ${last.x},${last.y}`)
    },
    reach: async () => undefined,
    remember: async (fact: string) => {
      written.push(fact)
    },
  } as unknown as Places<Progress>
  followWays({
    game: fake.game as Game,
    content,
    level: 'room-2',
    places,
    words: (key) => key,
    current: () => true,
    dispatch: () => {},
  })
  fake.emit([entered(1, 'room-3', 0.05, 7.5)])
  fake.emit([entered(1, 'room-2', 15.95, 7.5)])
  fake.emit([entered(1, 'room-3', 6, 3.25), kept('room-2.gate-1.open')])
  expect(written).toEqual(['room-3 1,7.5', 'room-2 15,7.5', 'room-3 6,3.25', 'room-2.gate-1.open'])
})
