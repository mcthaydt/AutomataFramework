import { expect, test } from 'vitest'
import { soundVoices } from '#src/features/audio/audio.ts'
import type { NoiseVoice, RecordingVoice, ToneVoice } from '#src/features/content/content.ts'
import { loadFull } from '../../fixtures/audio/content.ts'
import { crossings, peak, renderVoices, sineBuffer } from '../../fixtures/audio/render.ts'

const tone = (patch: Partial<ToneVoice> = {}): ToneVoice => ({
  kind: 'tone',
  wave: 'square',
  from: 440,
  to: 440,
  at: 0,
  length: 1,
  volume: 1,
  ...patch,
})

test('the jump sound is heard while it lasts and is silent after', async () => {
  const jump = (await loadFull()).sounds?.jump
  if (jump === undefined) throw new Error('the full game has no jump')
  const samples = await renderVoices(soundVoices(jump, {}), 0.5)
  expect(peak(samples, 0, 0.15)).toBeGreaterThan(0.05)
  expect(peak(samples, 0.25, 0.5)).toBeLessThan(0.001)
})

test('a voice that starts later is silent until then', async () => {
  const samples = await renderVoices([tone({ at: 0.2, length: 0.2 })], 0.5)
  expect(peak(samples, 0, 0.19)).toBeLessThan(0.001)
  expect(peak(samples, 0.2, 0.3)).toBeGreaterThan(0.05)
})

test('a noise voice is heard, and is the same noise every time', async () => {
  const hiss: NoiseVoice = { kind: 'noise', pitch: 1200, at: 0, length: 0.2, volume: 1 }
  const first = await renderVoices([hiss], 0.3)
  const second = await renderVoices([hiss], 0.3)
  expect(peak(first, 0, 0.1)).toBeGreaterThan(0.01)
  expect(Array.from(second)).toEqual(Array.from(first))
})

test('half the volume is about half as loud', async () => {
  const full = peak(await renderVoices([tone()], 0.1), 0, 0.01)
  const half = peak(await renderVoices([tone({ volume: 0.5 })], 0.1), 0, 0.01)
  expect(half / full).toBeGreaterThan(0.4)
  expect(half / full).toBeLessThan(0.6)
})

test('a square tone at 440 hertz crosses zero about 880 times a second', async () => {
  const samples = await renderVoices([tone()], 0.2)
  let crossings = 0
  let last = 0
  for (const sample of samples.subarray(0, 4410)) {
    if (sample === 0) continue
    if (last !== 0 && Math.sign(sample) !== Math.sign(last)) crossings++
    last = sample
  }
  expect(crossings).toBeGreaterThanOrEqual(80)
  expect(crossings).toBeLessThanOrEqual(96)
})

/** A recording voice of the file `a.wav`: the whole of it, once, at its own speed. */
const recorded = (patch: Partial<RecordingVoice> = {}): RecordingVoice => ({
  kind: 'recording',
  file: 'a.wav',
  from: 0,
  length: 1,
  speed: 1,
  at: 0,
  volume: 1,
  ...patch,
})

test('a recording of a 440 hertz sine is heard at 440 hertz, and level until its end', async () => {
  const samples = await renderVoices([recorded()], 1.2, new Map([['a.wav', sineBuffer(1)]]))
  expect(crossings(samples, 0, 0.5)).toBeGreaterThanOrEqual(436)
  expect(crossings(samples, 0, 0.5)).toBeLessThanOrEqual(444)
  expect(peak(samples, 0, 0.01)).toBeGreaterThan(0.4)
  expect(peak(samples, 0.9, 0.97)).toBeGreaterThan(0.4)
  expect(peak(samples, 1.1, 1.2)).toBeLessThan(0.001)
})

test('at twice the speed it is an octave higher and lasts half as long', async () => {
  const buffers = new Map([['a.wav', sineBuffer(1)]])
  const samples = await renderVoices([recorded({ speed: 2, length: 0.5 })], 1, buffers)
  expect(crossings(samples, 0, 0.25)).toBeGreaterThanOrEqual(436)
  expect(crossings(samples, 0, 0.25)).toBeLessThanOrEqual(444)
  expect(peak(samples, 0.6, 1)).toBeLessThan(0.001)
})

test('from starts part of the way into the file', async () => {
  const buffers = new Map([['a.wav', sineBuffer(1, 0.5)]])
  const whole = await renderVoices([recorded({ length: 0.5 })], 0.6, buffers)
  const second = await renderVoices([recorded({ from: 0.5, length: 0.5 })], 0.6, buffers)
  expect(peak(whole, 0, 0.4)).toBeLessThan(0.001)
  expect(peak(second, 0, 0.4)).toBeGreaterThan(0.4)
})

test('a file that was never kept plays nothing and throws nothing', async () => {
  const buffers = new Map([['a.wav', sineBuffer(1)]])
  const samples = await renderVoices([recorded({ file: 'other.wav' })], 0.5, buffers)
  expect(peak(samples, 0, 0.5)).toBe(0)
  expect(peak(await renderVoices([recorded()], 0.5), 0, 0.5)).toBe(0)
})
