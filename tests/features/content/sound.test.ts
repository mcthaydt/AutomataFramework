import { expect, test } from 'vitest'
import { expectRoundTrip, problemsOf } from '../../fixtures/content/kind.ts'

type Json = Record<string, unknown>
const jump = () => ({
  format: 1 as const,
  id: 'jump',
  volume: 0.8,
  voices: [{ kind: 'tone', wave: 'square', from: 220, to: 660, at: 0, length: 0.15, volume: 1 }],
})
const land = () => ({
  format: 1 as const,
  id: 'land',
  volume: 0.7,
  voices: [
    { kind: 'tone', wave: 'sine', from: 180, to: 90, at: 0, length: 0.12, volume: 1 },
    { kind: 'noise', pitch: 1200, at: 0, length: 0.08, volume: 0.5 },
  ],
})
const file = 'content/sounds/jump.json'
const said = (value: unknown): string[] => problemsOf('sound', value, file)
const withVoice = (change: (voice: Json) => void): ReturnType<typeof jump> => {
  const value = jump()
  change(value.voices[0] as unknown as Json)
  return value
}

test('a sound reads, and writes back to the same bytes twice', () => {
  expectRoundTrip('sound', jump())
  expectRoundTrip('sound', land())
})

test('a voice that runs past ten seconds', () =>
  expect(said(withVoice((v) => Object.assign(v, { at: 9, length: 2 })))).toEqual([
    `${file}: voices[0].length: This voice ends after 10 seconds, which is the longest a sound can be.`,
  ]))

test('a voice that ends exactly at ten seconds is fine', () =>
  expect(said(withVoice((v) => Object.assign(v, { at: 5, length: 5 })))).toEqual([]))

test('a kind of voice that does not exist names the choices', () =>
  expect(said(withVoice((v) => (v.kind = 'buzz')))).toEqual([
    `${file}: voices[0].kind: This must be one of: tone, noise.`,
  ]))

test('a wave that does not exist', () =>
  expect(said(withVoice((v) => (v.wave = 'wobbly')))).toEqual([
    `${file}: voices[0].wave: This must be one of: sine, square, sawtooth, triangle.`,
  ]))

test('a pitch or a volume out of range', () => {
  expect(said(withVoice((v) => (v.from = 10)))).toEqual([`${file}: voices[0].from: This must be 20 or more.`])
  expect(said(withVoice((v) => (v.to = 30000)))).toEqual([
    `${file}: voices[0].to: This must be 20000 or less.`,
  ])
  expect(said({ ...jump(), volume: 1.5 })).toEqual([`${file}: volume: This must be 1 or less.`])
})

test('a length of nothing, and a field of the other kind of voice', () => {
  expect(said(withVoice((v) => (v.length = 0)))).toEqual([
    `${file}: voices[0].length: This must be more than 0.`,
  ])
  expect(said(withVoice((v) => (v.pitch = 440)))).toEqual([
    `${file}: voices[0].pitch: This is not something a sound has. Remove it or check the spelling.`,
  ])
})

test('no voices, and too many', () => {
  expect(said({ ...jump(), voices: [] })).toEqual([`${file}: voices: This needs at least 1 item.`])
  expect(said({ ...jump(), voices: Array.from({ length: 9 }, () => jump().voices[0]) })).toEqual([
    `${file}: voices: This has more than 8 items, which is the most allowed.`,
  ])
})

test('a missing field says what to write', () =>
  expect(said(withVoice((v) => delete v.wave))).toEqual([
    `${file}: voices[0].wave: This is missing. Write "sine", "square", "sawtooth" or "triangle".`,
  ]))

test('an unknown key', () =>
  expect(said({ ...jump(), echo: 1 })).toEqual([
    `${file}: echo: This is not something a sound has. Remove it or check the spelling.`,
  ]))
