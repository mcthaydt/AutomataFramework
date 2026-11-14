// A music file as timed notes: the same notes at the same times in Node and in every browser.
import { expect, test } from 'vitest'
import { type Score, scoreOf } from '#src/features/audio/audio.ts'
import { loadGame, type MusicFile } from '#src/features/content/content.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'

async function meadow(): Promise<MusicFile> {
  const loaded = await loadGame(readFullGame())
  const music = loaded.ok ? loaded.value.music?.meadow : undefined
  if (music === undefined) throw new Error('the full game has no meadow')
  return music
}

/** One tone part of the given rows, 0.15 seconds a step, at full volume. */
function track(rows: readonly string[]): Score {
  return scoreOf({
    format: 1,
    id: 'test',
    tempo: 100,
    stepsPerBeat: 4,
    volume: 1,
    loop: true,
    parts: [{ id: 'p', kind: 'tone', wave: 'sine', volume: 1, notes: rows }],
  })
}

const STEP = 0.15

test('meadow lasts 4.8 seconds and loops', async () => {
  const score = scoreOf(await meadow())
  expect(score.seconds).toBeCloseTo(4.8, 9)
  expect(score.loop).toBe(true)
  expect(score.id).toBe('meadow')
})

test('meadow has 16 lead notes and 11 drum hits', async () => {
  const { notes } = scoreOf(await meadow())
  expect(notes.filter((n) => n.part === 'lead')).toHaveLength(16)
  expect(notes.filter((n) => n.part === 'drums')).toHaveLength(11)
})

test('the first notes start together, lead before drums', async () => {
  const { notes } = scoreOf(await meadow())
  expect(notes[0]?.part).toBe('lead')
  expect(notes[0]?.at).toBe(0)
  expect(notes[0]?.voice).toMatchObject({ kind: 'tone', from: 261.6256, to: 261.6256 })
  expect(notes[1]?.part).toBe('drums')
  expect(notes[1]?.at).toBe(0)
})

test('a lead note is one step long at the part times the track volume', async () => {
  const first = scoreOf(await meadow()).notes[0]
  expect(first?.voice.at).toBe(0)
  expect(first?.voice.length).toBeCloseTo(STEP, 9)
  expect(first?.voice.volume).toBeCloseTo(0.3, 9)
  expect(first?.voice).toMatchObject({ kind: 'tone', wave: 'triangle' })
})

test('a held note is as long as its steps', async () => {
  const leads = scoreOf(await meadow()).notes.filter((n) => n.part === 'lead')
  const last = leads[leads.length - 1]
  expect(last?.voice).toMatchObject({ from: 391.9954 })
  expect(last?.at).toBeCloseTo(4.5, 9)
  expect(last?.voice.length).toBeCloseTo(2 * STEP, 9)
})

test('a drum hit is a 0.1 second hiss at 150 hertz', async () => {
  const hit = scoreOf(await meadow()).notes.find((n) => n.part === 'drums')
  expect(hit?.voice).toMatchObject({ kind: 'noise', pitch: 150, at: 0, length: 0.1 })
  expect(hit?.voice.volume).toBeCloseTo(0.24, 9)
})

test('a hold with nothing before it is a rest', () => {
  const { notes } = track(['= C4 = -'])
  expect(notes).toHaveLength(1)
  expect(notes[0]?.at).toBeCloseTo(STEP, 9)
  expect(notes[0]?.voice.length).toBeCloseTo(2 * STEP, 9)
})

test('a hold after a rest is a rest, and a hold carries across rows', () => {
  const rest = track(['C4 - =', '= D4']).notes
  expect(rest).toHaveLength(2)
  expect(rest[0]?.voice.length).toBeCloseTo(STEP, 9)
  expect(rest[1]?.at).toBeCloseTo(4 * STEP, 9)
  expect(rest[1]?.voice.length).toBeCloseTo(STEP, 9)
  const held = track(['E4', '=']).notes
  expect(held).toHaveLength(1)
  expect(held[0]?.voice.length).toBeCloseTo(2 * STEP, 9)
})

test('notes are in the order they start', async () => {
  const { notes } = scoreOf(await meadow())
  notes.forEach((note, i) => {
    if (i > 0) expect(note.at).toBeGreaterThanOrEqual(notes[i - 1]?.at ?? 0)
  })
})
