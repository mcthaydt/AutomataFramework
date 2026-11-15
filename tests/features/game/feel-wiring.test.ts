// The game's feel, wired: one step goes to the feel and the buzzer, a freeze holds what its game says it holds, and
// the player's shake setting is answered on the next picture. A made-up renderer stands in for the page.
import { expect, test } from 'vitest'
import type { FeelFrame } from '#src/features/feel/feel.ts'
import { createFeelWiring } from '#src/features/game/feel-wiring.ts'
import { type TestHost, testHost } from '#src/features/host/host.ts'
import type { SimEvent } from '#src/features/sim/sim.ts'
import { LAND_BUZZ, loadFeelGame } from '../../fixtures/feel/game.ts'

const FRAME_MS = 1000 / 60

const landed: SimEvent = { type: 'hero.landed', payload: { player: 1, sid: 3 } }
const jumped: SimEvent = { type: 'hero.jumped', payload: { player: 1, sid: 3 } }
const taken: SimEvent = { type: 'spark.taken', payload: { sid: 3, player: 1 } }

interface Made {
  readonly host: TestHost
  readonly drawn: { alpha: number; feel: FeelFrame | undefined }[]
  readonly wiring: ReturnType<typeof createFeelWiring>
}

/** A wiring over the feel game with a renderer that keeps what it was asked to draw. Thing 3 stands at (5, 5). */
async function make(
  options: {
    readonly host?: TestHost
    readonly feelSettings?: unknown
    readonly freezes?: 'game' | 'picture'
    /** False leaves the buzz options out, as a watched replay does. Default true: a touch player, vibration on. */
    readonly buzz?: boolean
  } = {},
): Promise<Made> {
  const host = options.host ?? testHost()
  const drawn: Made['drawn'] = []
  const wiring = createFeelWiring({
    content: await loadFeelGame(),
    host,
    renderer: {
      draw: (alpha, feel) => drawn.push({ alpha, feel }),
      place: (sid) => (sid === 3 ? { x: 5, y: 5, w: 0.8, h: 1 } : undefined),
    },
    tickHz: 60,
    seed: 1,
    feelSettings: options.feelSettings,
    freezes: options.freezes ?? 'game',
    ...(options.buzz === false ? {} : { buzz: { device: () => 'touch' as const, on: true } }),
  })
  return { host, drawn, wiring }
}

const shaken = (frame: FeelFrame): number => Math.abs(frame.shake.x) + Math.abs(frame.shake.y)

test('one step reaches the feel and the buzzer: a landing on touch is dust and one buzz', async () => {
  const { host, drawn, wiring } = await make()
  wiring.hear({ tick: 1, events: [landed] })
  wiring.draw(0.5, FRAME_MS)
  expect(drawn).toHaveLength(1)
  expect(drawn[0]?.alpha).toBe(0.5)
  expect(drawn[0]?.feel?.specks).toHaveLength(6)
  expect(wiring.frame()).toBe(drawn[0]?.feel)
  // Three ticks at sixty a second is fifty milliseconds.
  expect(host.buzzes).toEqual([{ strength: LAND_BUZZ.strength, ms: 50 }])
})

test('a step heard twice is dust once and a buzz once', async () => {
  const { host, wiring } = await make()
  wiring.hear({ tick: 1, events: [landed] })
  wiring.hear({ tick: 1, events: [landed] })
  expect(wiring.frame().specks).toHaveLength(0)
  wiring.draw(1, FRAME_MS)
  expect(wiring.frame().specks).toHaveLength(6)
  expect(host.buzzes).toHaveLength(1)
})

test('with no buzz options nothing ever asks the host', async () => {
  const { host, wiring } = await make({ buzz: false })
  wiring.hear({ tick: 1, events: [landed] })
  wiring.draw(1, FRAME_MS)
  expect(wiring.frame().specks).toHaveLength(6)
  expect(host.buzzes).toEqual([])
  // There is nothing to switch, and switching it is harmless.
  wiring.setVibration(true)
  wiring.hear({ tick: 2, events: [landed] })
  expect(host.buzzes).toEqual([])
})

test('feelSettings left out: shake on; on a host that asked for less motion: shake off; a saved choice wins', async () => {
  const shakeOf = async (host: TestHost, feelSettings?: unknown): Promise<number> => {
    const { wiring } = await make({ host, feelSettings })
    wiring.hear({ tick: 1, events: [jumped] })
    wiring.draw(1, FRAME_MS)
    return shaken(wiring.frame())
  }
  expect(await shakeOf(testHost())).toBeGreaterThan(0)
  expect(await shakeOf(testHost({ reducedMotion: true }))).toBe(0)
  // Anything that does not read as the setting is the same as none.
  expect(await shakeOf(testHost({ reducedMotion: true }), { shake: 'yes' })).toBe(0)
  expect(await shakeOf(testHost({ reducedMotion: true }), { format: 1, shake: true })).toBeGreaterThan(0)
  expect(await shakeOf(testHost(), { format: 1, shake: false })).toBe(0)
})

test('setShake(false) in the middle of a shake draws a zero offset on the next frame', async () => {
  const { wiring } = await make()
  wiring.hear({ tick: 1, events: [jumped] })
  wiring.draw(1, FRAME_MS)
  expect(shaken(wiring.frame())).toBeGreaterThan(0)
  wiring.setShake(false)
  wiring.draw(1, FRAME_MS)
  expect(wiring.frame().shake).toEqual({ x: 0, y: 0 })
  // Dust and the freeze are not the setting's to change.
  wiring.hear({ tick: 2, events: [landed, taken] })
  wiring.draw(1, FRAME_MS)
  expect(wiring.frame().specks.length).toBeGreaterThan(0)
  expect(wiring.frame().freeze).toBeGreaterThan(0)
  wiring.setShake(true)
  wiring.hear({ tick: 3, events: [jumped] })
  wiring.draw(1, FRAME_MS)
  expect(shaken(wiring.frame())).toBeGreaterThan(0)
})

test('where freezes hold the game, hold() spends the time of a freeze and says how much', async () => {
  const { wiring } = await make()
  wiring.hear({ tick: 1, events: [taken] })
  expect(wiring.holding).toBe(true)
  // Six ticks are a hundred milliseconds: a frame of fifty spends fifty and the next spends the rest.
  expect(wiring.hold(50)).toBeCloseTo(50, 3)
  expect(wiring.holding).toBe(true)
  expect(wiring.hold(80)).toBeCloseTo(50, 3)
  expect(wiring.holding).toBe(false)
  expect(wiring.hold(80)).toBe(0)
})

test('where freezes hold the picture, the frames alone count the hold down and hold() answers 0', async () => {
  const { wiring } = await make({ freezes: 'picture' })
  wiring.hear({ tick: 1, events: [taken] })
  expect(wiring.holding).toBe(false)
  expect(wiring.hold(1000)).toBe(0)
  const seen: number[] = []
  for (let i = 0; i < 8; i++) {
    wiring.draw(1, FRAME_MS)
    seen.push(wiring.frame().freeze)
  }
  // The frame the hold starts in does not spend it; each one after takes a tick off.
  expect(seen.slice(0, 3)).toEqual([6, 5, 4])
  expect(seen.at(-1)).toBe(0)
  expect(wiring.idle).toBe(false)
})

test('begin forgets the last tick, so a new sim is heard from its first step', async () => {
  const { wiring } = await make()
  wiring.hear({ tick: 40, events: [] })
  wiring.hear({ tick: 1, events: [landed] })
  wiring.draw(1, FRAME_MS)
  expect(wiring.frame().specks).toHaveLength(0)
  wiring.begin()
  wiring.hear({ tick: 1, events: [landed] })
  wiring.draw(1, FRAME_MS)
  expect(wiring.frame().specks).toHaveLength(6)
})
