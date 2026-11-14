import { expect, test, vi } from 'vitest'
import { createAudio, LOG_MAX, testSpeaker } from '#src/features/audio/audio.ts'
import { beeps, contentWithCues, events, loadFull } from '../../fixtures/audio/content.ts'
import { loadFixtureGame } from '../../fixtures/game/game.ts'

/** A speaker that has been tapped: voices are heard. */
const tapped = (): ReturnType<typeof testSpeaker> => testSpeaker({ state: 'on' })

test("an event with a sound cue plays that sound's voices now, at the sound times the voice volume", async () => {
  const speaker = tapped()
  const audio = createAudio({ content: await loadFull(), speaker })
  audio.hear({ tick: 1, events: events('hero.landed') })
  expect(speaker.played).toHaveLength(2)
  expect(speaker.played.map((p) => p.bus)).toEqual(['sound', 'sound'])
  expect(speaker.played.map((p) => p.when)).toEqual([0, 0])
  expect(speaker.played[0]?.voice.volume).toBeCloseTo(0.7, 9)
  expect(speaker.played[1]?.voice.volume).toBeCloseTo(0.35, 9)
})

test('the log says what was asked for', async () => {
  const audio = createAudio({ content: await loadFull(), speaker: tapped() })
  audio.hear({ tick: 1, events: events('hero.landed') })
  expect(audio.log()).toEqual([{ tick: 1, from: 'sim', on: 'hero.landed', do: 'sound', id: 'land' }])
})

test('an event no cue answers does nothing and is not logged', async () => {
  const speaker = tapped()
  const audio = createAudio({ content: await loadFull(), speaker })
  audio.hear({ tick: 1, events: events('crate.moved') })
  expect(audio.log()).toEqual([])
  expect(speaker.played).toEqual([])
})

test("an event's payload is never read or changed", async () => {
  const audio = createAudio({ content: await loadFull(), speaker: tapped() })
  const event = {
    type: 'hero.jumped',
    get payload(): unknown {
      throw new Error('the payload was read')
    },
  }
  audio.hear(Object.freeze({ tick: 1, events: Object.freeze([Object.freeze(event)]) }))
  expect(audio.log()).toHaveLength(1)
})

test('a tick already heard is ignored', async () => {
  const audio = createAudio({ content: await loadFull(), speaker: tapped() })
  audio.hear({ tick: 5, events: events('hero.jumped') })
  audio.hear({ tick: 5, events: events('hero.jumped') })
  audio.hear({ tick: 4, events: events('hero.jumped') })
  expect(audio.log()).toHaveLength(1)
})

test('begin lets tick 1 be heard again', async () => {
  const audio = createAudio({ content: await loadFull(), speaker: tapped() })
  audio.hear({ tick: 1, events: events('hero.jumped') })
  audio.begin()
  audio.hear({ tick: 1, events: events('hero.jumped') })
  expect(audio.log().map((e) => e.skipped)).toEqual([undefined, undefined])
})

test('in one tick a sound starts once', async () => {
  const speaker = tapped()
  const audio = createAudio({ content: await loadFull(), speaker })
  audio.hear({ tick: 1, events: events('hero.jumped', 2) })
  expect(audio.log().map((e) => e.skipped)).toEqual([undefined, 'busy'])
  expect(speaker.played).toHaveLength(1)
})

test('at most four of one sound at once, counted in ticks', async () => {
  const speaker = tapped()
  const audio = createAudio({ content: await loadFull(), speaker })
  for (const tick of [1, 2, 3, 4, 5, 10]) audio.hear({ tick, events: events('hero.jumped') })
  // The jump lasts 9 ticks: the one from tick 1 is over at tick 10, and not before.
  expect(audio.log().map((e) => e.skipped)).toEqual([
    undefined,
    undefined,
    undefined,
    undefined,
    'busy',
    undefined,
  ])
  expect(speaker.played).toHaveLength(5)
})

test('at most sixteen sounds in all', async () => {
  const sounds = beeps(17)
  const content = await contentWithCues(
    sounds.map((sound, i) => ({ on: `beep.${i + 1}`, do: 'sound' as const, sound: sound.id })),
    sounds,
  )
  const speaker = tapped()
  const audio = createAudio({ content, speaker })
  audio.hear({ tick: 1, events: sounds.flatMap((_, i) => events(`beep.${i + 1}`)) })
  const log = audio.log()
  expect(log).toHaveLength(17)
  expect(log.filter((e) => e.skipped === 'busy').map((e) => e.id)).toEqual(['beep-17'])
  expect(speaker.played).toHaveLength(16)
})

test('a sound asked for while waiting is logged, not played, and not played after the tap', async () => {
  const speaker = testSpeaker()
  const audio = createAudio({ content: await loadFull(), speaker })
  audio.hear({ tick: 1, events: events('hero.jumped') })
  expect(audio.log()).toHaveLength(1)
  expect(speaker.played).toEqual([])
  speaker.tap()
  expect(speaker.played).toEqual([])
})

test('a sound asked for while waiting still counts towards the limits', async () => {
  const speaker = testSpeaker()
  const audio = createAudio({ content: await loadFull(), speaker })
  for (const tick of [1, 2, 3, 4]) audio.hear({ tick, events: events('hero.jumped') })
  speaker.tap()
  audio.hear({ tick: 5, events: events('hero.jumped') })
  expect(audio.log().map((e) => e.skipped)).toEqual([undefined, undefined, undefined, undefined, 'busy'])
})

test('made unavailable, the log still fills and nothing throws', async () => {
  const audio = createAudio({ content: await loadFull(), speaker: testSpeaker({ state: 'unavailable' }) })
  expect(() => audio.hear({ tick: 1, events: events('hero.jumped') })).not.toThrow()
  audio.raise('hero.landed')
  expect(audio.log()).toHaveLength(2)
  expect(audio.state()).toBe('unavailable')
})

test('a page event is logged with the last tick heard and from "page", and is not limited', async () => {
  const speaker = tapped()
  const audio = createAudio({ content: await loadFull(), speaker })
  audio.hear({ tick: 7, events: events('crate.moved') })
  for (let i = 0; i < 6; i++) audio.raise('hero.jumped')
  const log = audio.log()
  expect(log).toHaveLength(6)
  expect(log.every((e) => e.tick === 7 && e.from === 'page' && e.skipped === undefined)).toBe(true)
  expect(speaker.played).toHaveLength(6)
})

test('a page event before any step is logged at tick 0, and page sounds do not count towards the limits', async () => {
  const audio = createAudio({ content: await loadFull(), speaker: tapped() })
  for (let i = 0; i < 6; i++) audio.raise('hero.jumped')
  expect(audio.log().every((e) => e.tick === 0)).toBe(true)
  for (const tick of [1, 2, 3, 4]) audio.hear({ tick, events: events('hero.jumped') })
  expect(audio.log().filter((e) => e.skipped !== undefined)).toEqual([])
})

test('the log keeps the newest 1024 entries and gives a copy', async () => {
  const audio = createAudio({ content: await loadFull(), speaker: tapped() })
  for (let tick = 1; tick <= 1100; tick++) audio.hear({ tick, events: events('hero.jumped') })
  const before = audio.log()
  expect(LOG_MAX).toBe(1024)
  expect(before).toHaveLength(1024)
  expect(before[0]?.tick).toBe(77)
  audio.raise('hero.jumped')
  expect(before).toHaveLength(1024)
  expect(audio.log()[1023]?.from).toBe('page')
})

test('silent is true for a game with no cue, and hear does nothing', async () => {
  const quiet = createAudio({ content: await loadFixtureGame(), speaker: tapped() })
  expect(quiet.silent).toBe(true)
  quiet.hear({ tick: 1, events: events('hero.jumped') })
  expect(quiet.log()).toEqual([])
  expect(createAudio({ content: await loadFull(), speaker: tapped() }).silent).toBe(false)
})

test("state and onState are the speaker's", async () => {
  const speaker = testSpeaker()
  const audio = createAudio({ content: await loadFull(), speaker })
  const heard = vi.fn()
  audio.onState(heard)
  expect(audio.state()).toBe('waiting')
  speaker.tap()
  expect(audio.state()).toBe('on')
  expect(heard).toHaveBeenCalledWith('on')
})

test('raise("level.started") starts meadow and logs it from "page"', async () => {
  const speaker = tapped()
  const audio = createAudio({ content: await loadFull(), speaker })
  audio.raise('level.started')
  expect(audio.music()).toBe('meadow')
  expect(audio.log()).toEqual([{ tick: 0, from: 'page', on: 'level.started', do: 'music', id: 'meadow' }])
  expect(speaker.played.length).toBeGreaterThan(0)
})

test('a music cue for the track already wanted is logged and changes nothing', async () => {
  const speaker = tapped()
  const audio = createAudio({ content: await loadFull(), speaker })
  audio.raise('level.started')
  audio.raise('level.started')
  expect(audio.log()).toHaveLength(2)
  expect(speaker.cuts).toEqual([])
  expect(speaker.played).toHaveLength(2)
})

test('a stop-music cue stops it', async () => {
  const content = await contentWithCues([
    { on: 'level.started', do: 'music', music: 'meadow' },
    { on: 'level.ended', do: 'stop-music' },
  ])
  const audio = createAudio({ content, speaker: tapped() })
  audio.raise('level.started')
  audio.raise('level.ended')
  expect(audio.music()).toBeUndefined()
  expect(audio.log()[1]).toEqual({ tick: 0, from: 'page', on: 'level.ended', do: 'stop-music' })
})

test('of two music changes for one event the last one counts', async () => {
  const full = await contentWithCues([])
  const cues = {
    a: { format: 1 as const, id: 'a', cues: [{ on: 'x', do: 'music' as const, music: 'meadow' }] },
    b: { format: 1 as const, id: 'b', cues: [{ on: 'x', do: 'stop-music' as const }] },
  }
  const audio = createAudio({ content: { ...full, cues }, speaker: tapped() })
  audio.raise('x')
  expect(audio.music()).toBeUndefined()
  expect(audio.log().map((e) => e.do)).toEqual(['music', 'stop-music'])
})
