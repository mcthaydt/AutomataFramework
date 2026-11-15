import { expect, test } from 'vitest'
import { testSpeaker } from '#src/features/audio/audio.ts'
import { createMusicPlayer } from '#src/features/audio/music-player.ts'
import type { MusicFile } from '#src/features/content/content.ts'
import { loadFull } from '../../fixtures/audio/content.ts'

/** The full game's meadow: steps of 0.15 s, 4.8 s long, 16 lead notes and 11 drum hits. */
async function meadow(): Promise<MusicFile> {
  const music = (await loadFull()).music?.meadow
  if (music === undefined) throw new Error('the full game has no meadow')
  return music
}

/** A second, shorter track: one tone note a step, to tell it from meadow. */
const BELL: MusicFile = {
  format: 1,
  id: 'bell',
  tempo: 120,
  stepsPerBeat: 2,
  volume: 1,
  loop: true,
  parts: [{ id: 'p', kind: 'tone', wave: 'sine', volume: 1, notes: ['A4 - A4 -'] }],
}

test('wanting a track hands over the notes of the first 0.3 seconds at once', async () => {
  const speaker = testSpeaker({ state: 'on' })
  createMusicPlayer(speaker).want(await meadow())
  expect(speaker.played).toHaveLength(2)
  expect(speaker.played.map((p) => p.bus)).toEqual(['music', 'music'])
  expect(speaker.played[0]?.voice).toMatchObject({ kind: 'tone', from: 261.6256 })
  expect(speaker.played[1]?.voice).toMatchObject({ kind: 'noise' })
  for (const p of speaker.played) expect(p.when).toBeCloseTo(0.05, 9)
})

test('each clock call hands over what has come inside the window, once', async () => {
  const speaker = testSpeaker({ state: 'on' })
  createMusicPlayer(speaker).want(await meadow())
  speaker.advance(0.3)
  expect(speaker.played).toHaveLength(3)
  expect(speaker.played[2]?.voice).toMatchObject({ kind: 'tone', from: 329.6276 })
  expect(speaker.played[2]?.when).toBeCloseTo(0.35, 9)
  speaker.advance(0)
  expect(speaker.played).toHaveLength(3)
})

test('a looping track comes round', async () => {
  const speaker = testSpeaker({ state: 'on' })
  createMusicPlayer(speaker).want(await meadow())
  for (let i = 0; i < 50; i++) speaker.advance(0.1)
  expect(speaker.played.filter((p) => p.when < 4.8)).toHaveLength(27)
  const again = speaker.played.find((p) => p.when >= 4.8 && p.voice.kind === 'tone')
  expect(again?.voice).toMatchObject({ from: 261.6256 })
  expect(again?.when).toBeCloseTo(4.85, 9)
})

test('after a stall the missed notes are dropped and the track is where the clock is', async () => {
  const speaker = testSpeaker({ state: 'on' })
  createMusicPlayer(speaker).want(await meadow())
  const before = speaker.played.length
  speaker.advance(2)
  const late = speaker.played.slice(before)
  expect(late.length).toBeGreaterThan(0)
  for (const p of late) {
    expect(p.when).toBeGreaterThanOrEqual(2)
    expect(p.when).toBeLessThan(2.3)
  }
})

test('wanting the same track again changes nothing', async () => {
  const speaker = testSpeaker({ state: 'on' })
  const player = createMusicPlayer(speaker)
  const music = await meadow()
  player.want(music)
  player.want(music)
  expect(speaker.cuts).toEqual([])
  expect(speaker.played).toHaveLength(2)
  expect(player.wanted()).toBe('meadow')
})

test('another track cuts the first and starts from its own beginning', async () => {
  const speaker = testSpeaker({ state: 'on' })
  const player = createMusicPlayer(speaker)
  player.want(await meadow())
  speaker.advance(1)
  const before = speaker.played.length
  player.want(BELL)
  expect(speaker.cuts).toEqual(['music'])
  expect(player.wanted()).toBe('bell')
  const first = speaker.played[before]
  expect(first?.voice).toMatchObject({ from: 440 })
  expect(first?.when).toBeCloseTo(1.05, 9)
})

test('stop cuts and wants none; a clock call then hands over nothing', async () => {
  const speaker = testSpeaker({ state: 'on' })
  const player = createMusicPlayer(speaker)
  player.want(await meadow())
  player.stop()
  speaker.advance(1)
  expect(speaker.cuts).toEqual(['music'])
  expect(player.wanted()).toBeUndefined()
  expect(speaker.played).toHaveLength(2)
})

test('wanted while waiting, it starts on the tap, from the beginning', async () => {
  const speaker = testSpeaker()
  const player = createMusicPlayer(speaker)
  player.want(await meadow())
  expect(speaker.played).toEqual([])
  expect(player.wanted()).toBe('meadow')
  speaker.tap()
  expect(speaker.played[0]?.voice).toMatchObject({ from: 261.6256 })
  expect(speaker.played[0]?.when).toBeCloseTo(0.05, 9)
})

test('interrupted and tapped again, it carries on and plays no note twice', async () => {
  const speaker = testSpeaker({ state: 'on' })
  createMusicPlayer(speaker).want(await meadow())
  speaker.advance(0.1)
  speaker.interrupt()
  speaker.advance(5)
  speaker.tap()
  for (let i = 0; i < 10; i++) speaker.advance(0.1)
  const seen = speaker.played.map((p) => JSON.stringify(p))
  expect(new Set(seen).size).toBe(seen.length)
  expect(speaker.played.length).toBeGreaterThan(2)
})

test('a track that does not loop ends and is no longer wanted', async () => {
  const speaker = testSpeaker({ state: 'on' })
  const player = createMusicPlayer(speaker)
  player.want({ ...(await meadow()), loop: false })
  for (let i = 0; i < 48; i++) speaker.advance(0.1)
  expect(player.wanted()).toBe('meadow')
  speaker.advance(0.1)
  speaker.advance(0.1)
  // The track ends at 4.85: the clock is at about 4.9.
  expect(player.wanted()).toBeUndefined()
  expect(speaker.played).toHaveLength(27)
})
