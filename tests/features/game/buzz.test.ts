// The device buzzing in the player's hand: a feel file's `buzz`, asked of the host when its event happens to a touch
// player, and never otherwise.
import { expect, test } from 'vitest'
import { createBuzzer } from '#src/features/game/buzz.ts'
import { testHost } from '#src/features/host/host.ts'
import type { DeviceKind } from '#src/features/input/input.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'
import { movesFiles } from '../../fixtures/game/moves-game.ts'

interface Feel {
  readonly id: string
  readonly on: string
  readonly strength: number
  readonly ticks: number
}

/** The moves fixture with a feel file for each of `feels`, each a buzz and nothing else. */
async function game(feels: readonly Feel[]) {
  const files = movesFiles({})
  const listed = feels
    .map((f) => `\n[[content]]\ntype = "feel"\npath = "content/feels/${f.id}.json"\n`)
    .join('')
  files['automata.toml'] = `${files['automata.toml'] ?? ''}${listed}`
  for (const f of feels)
    files[`content/feels/${f.id}.json`] = JSON.stringify({
      format: 1,
      id: f.id,
      on: f.on,
      buzz: { strength: f.strength, ticks: f.ticks },
    })
  return loadFixtureGame(files)
}

const landed = { events: [{ type: 'hero.landed', payload: { player: 1, sid: 3 } }] }
const LAND: Feel = { id: 'land', on: 'hero.landed', strength: 0.5, ticks: 6 }

async function buzzer(
  feels: readonly Feel[],
  options: { device?: DeviceKind; canBuzz?: boolean; on?: boolean } = {},
) {
  const host = testHost(options.canBuzz === undefined ? {} : { canBuzz: options.canBuzz })
  return {
    host,
    buzzer: createBuzzer({
      content: await game(feels),
      host,
      device: () => options.device ?? 'touch',
      tickHz: 60,
      on: options.on ?? true,
    }),
  }
}

test("a landing asks the host once, with the file's strength and its ticks as milliseconds", async () => {
  const { host, buzzer: b } = await buzzer([LAND])
  b.hear(landed)
  expect(host.buzzes).toEqual([{ strength: 0.5, ms: 100 }])
})

test('an event no feel file is on asks nothing', async () => {
  const { host, buzzer: b } = await buzzer([LAND])
  b.hear({ events: [{ type: 'hero.jumped', payload: { player: 1, sid: 3 } }] })
  expect(host.buzzes).toEqual([])
})

test('turned off asks nothing, and on again asks again', async () => {
  const { host, buzzer: b } = await buzzer([LAND], { on: false })
  b.hear(landed)
  expect(host.buzzes).toEqual([])
  b.setOn(true)
  b.hear(landed)
  expect(host.buzzes).toHaveLength(1)
  b.setOn(false)
  b.hear(landed)
  expect(host.buzzes).toHaveLength(1)
})

test('a player on a keyboard or a gamepad is never buzzed', async () => {
  for (const device of ['keyboard', 'gamepad'] as const) {
    const { host, buzzer: b } = await buzzer([LAND], { device })
    b.hear(landed)
    expect(host.buzzes).toEqual([])
  }
})

test('a host that cannot buzz is never asked, and nothing throws', async () => {
  const { host, buzzer: b } = await buzzer([LAND], { canBuzz: false })
  expect(() => b.hear(landed)).not.toThrow()
  expect(host.buzzes).toEqual([])
})

test('two feel files on one event ask twice', async () => {
  const more = { id: 'land-more', on: 'hero.landed', strength: 1, ticks: 3 }
  const { host, buzzer: b } = await buzzer([LAND, more])
  b.hear(landed)
  expect(host.buzzes).toEqual([
    { strength: 0.5, ms: 100 },
    { strength: 1, ms: 50 },
  ])
})

test('a strength of 0 asks nothing', async () => {
  const { host, buzzer: b } = await buzzer([{ ...LAND, strength: 0 }])
  b.hear(landed)
  expect(host.buzzes).toEqual([])
})

test("an event with no player is the first player's", async () => {
  const { host, buzzer: b } = await buzzer([{ id: 'start', on: 'level.started', strength: 0.2, ticks: 3 }])
  b.hear({ events: [{ type: 'level.started', payload: undefined }] })
  expect(host.buzzes).toHaveLength(1)
})
