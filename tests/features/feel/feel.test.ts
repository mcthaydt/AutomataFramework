import { expect, test } from 'vitest'
import type { FeelFile } from '#src/features/content/content.ts'
import { createFeel, type FeelFrame, MAX_FREEZE_TICKS, MAX_SPECKS } from '#src/features/feel/feel.ts'
import type { SimEvent } from '#src/features/sim/sim.ts'
import { event, FEEL_FILES, newFeel, place } from '../../fixtures/feel/script.ts'

const F = 1 / 60
const none = (): undefined => undefined

/** One step of the made-up game, at a tick, then one frame of 1/60 s. */
function stepAndFrame(feel: ReturnType<typeof newFeel>, tick: number, events: SimEvent[], seconds = F): FeelFrame {
  feel.hear({ tick, events })
  return feel.frame(seconds, place)
}

test('an event fires each matching file once, in id order', () => {
  const content = {
    feels: {
      b: { format: 1, id: 'b', on: 'x.y', shake: { strength: 0.2, ticks: 6 } },
      a: { format: 1, id: 'a', on: 'x.y', dust: { count: 3, color: '#ffffff', speed: 1, life: 10 } },
    } satisfies Record<string, FeelFile>,
  }
  const feel = createFeel({ content, tickHz: 60, settings: { format: 1, shake: true } })
  feel.hear({ tick: 1, events: [event('x.y', 7)] })
  const frame = feel.frame(0, place)
  expect(frame.specks).toHaveLength(3)
  expect(Math.abs(frame.shake.x) + Math.abs(frame.shake.y)).toBeGreaterThan(0)
})

test('a tick heard twice fires once, and after begin() the same tick fires again', () => {
  const feel = newFeel()
  feel.hear({ tick: 5, events: [event('hero.landed', 7)] })
  feel.hear({ tick: 5, events: [event('hero.landed', 7)] })
  expect(feel.frame(0, place).specks).toHaveLength(6)
  feel.hear({ tick: 4, events: [event('hero.landed', 7)] })
  expect(feel.frame(0, place).specks).toHaveLength(6)
  feel.begin()
  feel.hear({ tick: 5, events: [event('hero.landed', 7)] })
  expect(feel.frame(0, place).specks).toHaveLength(12)
})

test('an event no file is on, or a name a game made up with no file, does nothing', () => {
  const feel = newFeel()
  feel.hear({ tick: 1, events: [event('nothing.here', 7), event('crate.shattered', 7)] })
  expect(feel.frame(0, place)).toEqual({ specks: [], shake: { x: 0, y: 0 }, freeze: 0 })
  expect(feel.idle).toBe(true)
})

test('dust starts at the bottom middle of the named thing', () => {
  const frame = stepAndFrame(newFeel(), 1, [event('hero.landed', 7)], 0)
  expect(frame.specks).toHaveLength(6)
  // The thing is at x 3, y 5, 2 tiles tall: its feet are at y 6. Every speck is at its start, age 0.
  for (const speck of frame.specks) {
    expect(speck.x).toBe(3)
    expect(speck.y).toBe(6)
    expect(speck.color).toBe(0xe8dcc0)
    expect(speck.alpha).toBe(1)
  }
})

test('`count` specks, all gone after `life` ticks of frames', () => {
  const feel = newFeel()
  feel.hear({ tick: 1, events: [event('hero.landed', 7)] })
  expect(feel.frame(F, place).specks).toHaveLength(6)
  // The burst is drawn at age 0 in its first frame; 18 ticks of time later (with a frame to spare) it is over.
  for (let i = 0; i < 19; i++) feel.frame(F, place)
  expect(feel.frame(F, place).specks).toHaveLength(0)
  expect(feel.idle).toBe(true)
})

test('an event that names no thing makes no dust, and its shake and freeze still happen', () => {
  const content = {
    feels: {
      all: {
        format: 1,
        id: 'all',
        on: 'x.y',
        dust: { count: 5, color: '#ffffff', speed: 1, life: 10 },
        shake: { strength: 0.3, ticks: 10 },
        freeze: { ticks: 3 },
      },
    } satisfies Record<string, FeelFile>,
  }
  for (const payload of [null, undefined, 7, { sid: 'a' }, { sid: 1.5 }, { sid: 99 }, { other: 1 }]) {
    const feel = createFeel({ content, tickHz: 60, settings: { format: 1, shake: true } })
    feel.hear({ tick: 1, events: [{ type: 'x.y', payload }] })
    const frame = feel.frame(0, place)
    expect(frame.specks, JSON.stringify(payload)).toHaveLength(0)
    expect(frame.freeze, JSON.stringify(payload)).toBe(3)
    expect(Math.abs(frame.shake.x) + Math.abs(frame.shake.y), JSON.stringify(payload)).toBeGreaterThan(0)
  }
})

test('a thing the scene does not have makes no dust', () => {
  const frame = stepAndFrame(newFeel(), 1, [event('hero.landed', 5)], 0)
  expect(frame.specks).toHaveLength(0)
})

test('past 256 specks the oldest go first', () => {
  const content = {
    feels: {
      big: { format: 1, id: 'big', on: 'x.y', dust: { count: 64, color: '#ffffff', speed: 1, life: 60 } },
    } satisfies Record<string, FeelFile>,
  }
  const feel = createFeel({ content, tickHz: 60, settings: { format: 1, shake: true } })
  // Five bursts of 64 from five different things: the first is the one that goes.
  const where = (sid: number) => ({ x: sid, y: 0, w: 1, h: 0 })
  for (let sid = 1; sid <= 5; sid++) feel.hear({ tick: sid, events: [event('x.y', sid)] })
  const frame = feel.frame(0, where)
  expect(frame.specks).toHaveLength(MAX_SPECKS)
  expect(MAX_SPECKS).toBe(256)
  expect(frame.specks.some((s) => s.x === 1)).toBe(false)
  expect(frame.specks.filter((s) => s.x === 5)).toHaveLength(64)
})

test('a shake starts within its strength, is zero after its ticks, and two take the larger', () => {
  const feel = newFeel()
  feel.hear({ tick: 1, events: [event('crate.dropped', 7)] })
  const first = feel.frame(0, place)
  expect(Math.abs(first.shake.x)).toBeLessThanOrEqual(0.4)
  expect(Math.abs(first.shake.y)).toBeLessThanOrEqual(0.4)
  expect(first.shake.x !== 0 || first.shake.y !== 0).toBe(true)
  for (let i = 0; i < 13; i++) feel.frame(F, place)
  expect(feel.frame(F, place).shake).toEqual({ x: 0, y: 0 })

  const two = newFeel()
  two.hear({ tick: 1, events: [event('crate.dropped', 7)] })
  for (let i = 0; i < 6; i++) two.frame(F, place)
  two.hear({ tick: 2, events: [event('crate.dropped', 7)] })
  const both = two.frame(0, place)
  // The second is fresh and full size: it, and not the sum, is what shows.
  expect(Math.abs(both.shake.x)).toBeLessThanOrEqual(0.4)
  expect(Math.abs(both.shake.y)).toBeLessThanOrEqual(0.4)
})

test('shake off in the settings is a zero offset; on again shows what is left', () => {
  const feel = newFeel({ settings: { format: 1, shake: false } })
  feel.hear({ tick: 1, events: [event('crate.dropped', 7)] })
  expect(feel.frame(F, place).shake).toEqual({ x: 0, y: 0 })
  feel.setSettings({ format: 1, shake: true })
  const frame = feel.frame(F, place)
  expect(frame.shake.x !== 0 || frame.shake.y !== 0).toBe(true)
  feel.setSettings({ format: 1, shake: false })
  expect(feel.frame(F, place).shake).toEqual({ x: 0, y: 0 })
})

test('a freeze reports its ticks and counts down as time is held', () => {
  const feel = newFeel()
  feel.hear({ tick: 1, events: [event('spark.taken', 9)] })
  expect(feel.holding).toBe(true)
  expect(feel.frame(F, place).freeze).toBe(4)
  expect(feel.hold(F)).toBeCloseTo(F, 12)
  expect(feel.frame(F, place).freeze).toBe(3)
  feel.hold(F)
  expect(feel.frame(F, place).freeze).toBe(2)
  feel.hold(F)
  feel.hold(F)
  expect(feel.holding).toBe(false)
  expect(feel.frame(F, place).freeze).toBe(0)
})

test('hold answers what it spent, never more than it had', () => {
  const feel = newFeel()
  feel.hear({ tick: 1, events: [event('spark.taken', 9)] })
  expect(feel.hold(1)).toBeCloseTo(4 / 60, 12)
  expect(feel.hold(1)).toBe(0)
  expect(feel.hold(-1)).toBe(0)
  expect(feel.hold(Number.NaN)).toBe(0)
})

test('a hold of the picture is not spent by the frame it starts in: four ticks is four frames of 1/60 held', () => {
  const feel = newFeel({ freezes: 'picture' })
  feel.hear({ tick: 1, events: [event('spark.taken', 9)] })
  const held: number[] = []
  for (let i = 0; i < 6; i++) held.push(feel.frame(F, place).freeze)
  expect(held).toEqual([4, 3, 2, 1, 0, 0])
})

test('with freezes "picture", hold answers 0 and the frames count the freeze down', () => {
  const feel = newFeel({ freezes: 'picture' })
  feel.hear({ tick: 1, events: [event('spark.taken', 9)] })
  expect(feel.holding).toBe(false)
  expect(feel.hold(1)).toBe(0)
  expect(feel.frame(F, place).freeze).toBe(4)
})

test('a second freeze extends the hold to the later end, and no hold is past 30 ticks', () => {
  const content = {
    feels: {
      short: { format: 1, id: 'short', on: 'a.b', freeze: { ticks: 4 } },
      long: { format: 1, id: 'long', on: 'c.d', freeze: { ticks: 20 } },
    } satisfies Record<string, FeelFile>,
  }
  const feel = createFeel({ content, tickHz: 60, settings: { format: 1, shake: true } })
  feel.hear({ tick: 1, events: [{ type: 'a.b', payload: null }] })
  feel.hear({ tick: 2, events: [{ type: 'c.d', payload: null }] })
  expect(feel.frame(0, none).freeze).toBe(20)
  feel.hear({ tick: 3, events: [{ type: 'a.b', payload: null }] })
  expect(feel.frame(0, none).freeze).toBe(20)
  expect(MAX_FREEZE_TICKS).toBe(30)
})

// Audit I3: a stream of freezes cannot hold the picture for good.
test('a picture hold extended every 20 ticks is over 30 ticks after it began, and the next frame is not held', () => {
  const content = {
    feels: { f: { format: 1, id: 'f', on: 'a.b', freeze: { ticks: 25 } } } satisfies Record<string, FeelFile>,
  }
  const feel = createFeel({ content, tickHz: 60, settings: { format: 1, shake: true }, freezes: 'picture' })
  let heldFrames = 0
  for (let i = 0; i < 100; i++) {
    if (i % 20 === 0) feel.hear({ tick: i + 1, events: [{ type: 'a.b', payload: null }] })
    if (feel.frame(F, none).freeze > 0) heldFrames++
  }
  // Begun at frame 0; frame 0 is held, then 29 more at most: the hold ends within 30 ticks of its start, and a new one
  // starts at frame 40, 60, ... only when the old one is over.
  expect(heldFrames).toBeLessThan(100)
  const probe = createFeel({ content, tickHz: 60, settings: { format: 1, shake: true }, freezes: 'picture' })
  probe.hear({ tick: 1, events: [{ type: 'a.b', payload: null }] })
  const frames: number[] = []
  for (let i = 0; i < 40; i++) {
    if (i === 20) probe.hear({ tick: 21, events: [{ type: 'a.b', payload: null }] })
    frames.push(probe.frame(F, none).freeze)
  }
  expect(frames.findIndex((f, i) => i > 0 && f === 0)).toBeLessThanOrEqual(30)
})

test('4/60 s less 1/60 s held is 3 ticks, not 4: the rounding has slack', () => {
  const feel = newFeel()
  feel.hear({ tick: 1, events: [event('spark.taken', 9)] })
  feel.hold(1 / 60)
  expect(feel.frame(0, place).freeze).toBe(3)
})

test('play fires one file at a thing; its freeze never holds the game', () => {
  const feel = newFeel()
  feel.play(FEEL_FILES.spark as FeelFile, 9)
  expect(feel.holding).toBe(false)
  expect(feel.hold(1)).toBe(0)
  const frame = feel.frame(0, place)
  expect(frame.freeze).toBe(4)
  expect(frame.specks).toHaveLength(12)
  for (const speck of frame.specks) expect(speck.y).toBe(4.5)
})

test('play with no thing makes no dust and still shakes and holds', () => {
  const feel = newFeel()
  feel.play({
    format: 1,
    id: 'x',
    on: 'x.y',
    dust: { count: 4, color: '#ffffff', speed: 1, life: 10 },
    shake: { strength: 0.3, ticks: 10 },
    freeze: { ticks: 3 },
  })
  const frame = feel.frame(0, place)
  expect(frame.specks).toHaveLength(0)
  expect(frame.freeze).toBe(3)
  expect(frame.shake.x !== 0 || frame.shake.y !== 0).toBe(true)
})

test('two plays differ from each other', () => {
  const feel = newFeel()
  feel.play(FEEL_FILES.land as FeelFile, 7)
  const a = feel.frame(0, place).specks
  const other = newFeel()
  other.play(FEEL_FILES.land as FeelFile, 7)
  other.frame(0, place)
  other.play(FEEL_FILES.land as FeelFile, 7)
  const b = other.frame(0, place).specks.slice(6)
  expect(b).not.toEqual(a)
})

test('dust keeps moving while held', () => {
  const feel = newFeel()
  feel.hear({ tick: 1, events: [event('hero.landed', 7), event('spark.taken', 9)] })
  const first = feel.frame(0, place)
  const later = feel.frame(5 * F, place)
  expect(later.freeze).toBeGreaterThan(0)
  expect(later.specks[0]).not.toEqual(first.specks[0])
})

test('forty events in one step: 256 specks, one hold of 30 ticks at most, the largest shake', () => {
  const content = {
    feels: {
      flood: {
        format: 1,
        id: 'flood',
        on: 'x.y',
        dust: { count: 64, color: '#ffffff', speed: 2, life: 60 },
        shake: { strength: 1, ticks: 60 },
        freeze: { ticks: 30 },
      },
    } satisfies Record<string, FeelFile>,
  }
  const feel = createFeel({ content, tickHz: 60, settings: { format: 1, shake: true } })
  feel.hear({ tick: 1, events: Array.from({ length: 40 }, () => event('x.y', 7)) })
  const frame = feel.frame(0, place)
  expect(frame.specks).toHaveLength(256)
  expect(frame.freeze).toBe(30)
  expect(Math.abs(frame.shake.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(frame.shake.y)).toBeLessThanOrEqual(1)
  expect(feel.hold(10)).toBeCloseTo(0.5, 12)
})

test('one frame of ten seconds ends everything: idle, no NaN, no fade below 0', () => {
  const feel = newFeel()
  feel.hear({
    tick: 1,
    events: [event('hero.landed', 7), event('crate.dropped', 7), event('spark.taken', 9)],
  })
  feel.frame(F, place)
  // The loop spends the hold first, then draws.
  feel.hold(10)
  const frame = feel.frame(10, place)
  expect(frame).toEqual({ specks: [], shake: { x: 0, y: 0 }, freeze: 0 })
  expect(feel.idle).toBe(true)
  const bad = newFeel()
  bad.hear({ tick: 1, events: [event('hero.landed', 7)] })
  for (const seconds of [Number.NaN, -3, Number.POSITIVE_INFINITY]) {
    const f = bad.frame(seconds, place)
    for (const s of f.specks) {
      expect(Number.isFinite(s.x + s.y + s.alpha)).toBe(true)
      expect(s.alpha).toBeGreaterThanOrEqual(0)
    }
  }
})

test('a file never checked plays inside the limits', () => {
  const content = {
    feels: {
      wild: {
        format: 1,
        id: 'wild',
        on: 'x.y',
        dust: { count: 10_000, color: '#ffffff', speed: 1, life: 10 },
        shake: { strength: 50, ticks: 5000 },
        freeze: { ticks: 5000 },
      },
    } satisfies Record<string, FeelFile>,
  }
  const feel = createFeel({ content, tickHz: 60, settings: { format: 1, shake: true } })
  feel.hear({ tick: 1, events: [event('x.y', 7)] })
  const frame = feel.frame(0, place)
  expect(frame.specks).toHaveLength(64)
  expect(frame.freeze).toBe(30)
  expect(Math.abs(frame.shake.x)).toBeLessThanOrEqual(1)
})

test('a file with a number that is not finite does nothing for that effect and never throws', () => {
  const content = {
    feels: {
      bad: {
        format: 1,
        id: 'bad',
        on: 'x.y',
        dust: { count: 5, color: '#ffffff', speed: Number.NaN, life: 10 },
        freeze: { ticks: 3 },
      },
    } satisfies Record<string, FeelFile>,
  }
  const feel = createFeel({ content, tickHz: 60, settings: { format: 1, shake: true } })
  expect(() => feel.hear({ tick: 1, events: [event('x.y', 7)] })).not.toThrow()
  const frame = feel.frame(0, place)
  expect(frame.specks).toHaveLength(0)
  expect(frame.freeze).toBe(3)
})

test('hear never throws on an event that cannot be read', () => {
  const feel = newFeel()
  const weird = { type: 'hero.landed', get payload(): unknown { throw new Error('no') } }
  expect(() => feel.hear({ tick: 1, events: [weird as SimEvent] })).not.toThrow()
})

test('no feel files at all is idle and hears nothing', () => {
  const feel = createFeel({ content: {}, tickHz: 60, settings: { format: 1, shake: true } })
  feel.hear({ tick: 1, events: [event('hero.landed', 7)] })
  expect(feel.idle).toBe(true)
  expect(feel.frame(F, place)).toEqual({ specks: [], shake: { x: 0, y: 0 }, freeze: 0 })
})

test('idle is true before anything, false with a speck, a shake or a hold, and true again after', () => {
  const feel = newFeel()
  expect(feel.idle).toBe(true)
  feel.hear({ tick: 1, events: [event('hero.landed', 7)] })
  expect(feel.idle).toBe(false)
  feel.frame(F, place)
  for (let i = 0; i < 25; i++) feel.frame(F, place)
  expect(feel.idle).toBe(true)
  feel.hear({ tick: 2, events: [event('crate.dropped', 7)] })
  expect(feel.idle).toBe(false)
  // A thing that starts at a frame is drawn at age 0 in it, so it takes a second frame to be over.
  feel.frame(1, place)
  feel.frame(1, place)
  expect(feel.idle).toBe(true)
  feel.hear({ tick: 3, events: [event('spark.taken', 9)] })
  expect(feel.idle).toBe(false)
  feel.hold(1)
  feel.frame(1, place)
  feel.frame(1, place)
  expect(feel.idle).toBe(true)
})

test('begin() drops a game hold but lets dust in the air finish', () => {
  const feel = newFeel()
  feel.hear({ tick: 1, events: [event('spark.taken', 9), event('hero.landed', 7)] })
  feel.frame(F, place)
  feel.begin()
  expect(feel.holding).toBe(false)
  expect(feel.frame(F, place).specks.length).toBeGreaterThan(0)
})

test('the same events and frame times give the same frames', () => {
  const run = () => {
    const feel = newFeel({ seed: 9 })
    return [
      stepAndFrame(feel, 1, [event('hero.landed', 7)]),
      stepAndFrame(feel, 2, [event('crate.dropped', 7)]),
      feel.frame(0.1, place),
    ]
  }
  expect(run()).toEqual(run())
  const other = newFeel({ seed: 10 })
  expect(stepAndFrame(other, 1, [event('hero.landed', 7)])).not.toEqual(run()[0])
})

test('moving is what frames alone can finish: dust, a shake or a hold of the picture, and not a hold of the game', () => {
  const feel = newFeel()
  expect(feel.moving).toBe(false)
  feel.hear({ tick: 1, events: [event('hero.landed', 7)] })
  expect(feel.moving).toBe(true)
  for (let i = 0; i < 25; i++) feel.frame(F, place)
  expect(feel.moving).toBe(false)
  // A hold of the whole game waits for the loop: it keeps the feel from being idle, but frames cannot spend it.
  feel.hear({ tick: 2, events: [event('spark.taken', 99)] })
  // (Thing 99 is not in the scene, so its dust is dropped by the first frame.)
  feel.frame(0, place)
  expect(feel.holding).toBe(true)
  expect(feel.moving).toBe(false)
  expect(feel.idle).toBe(false)
  // The same hold of the picture alone is something frames finish.
  const picture = newFeel({ freezes: 'picture' })
  picture.hear({ tick: 1, events: [event('spark.taken', 99)] })
  picture.frame(0, place)
  expect(picture.moving).toBe(true)
  for (let i = 0; i < 8; i++) picture.frame(F, place)
  expect(picture.moving).toBe(false)
  expect(picture.idle).toBe(true)
})
