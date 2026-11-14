import { expect, test } from 'vitest'
import type { SoundVoice } from '#src/features/content/content.ts'
import { loadFull } from '../../fixtures/audio/content.ts'
import { peak, renderVoices } from '../../fixtures/audio/render.ts'

const tone = (patch: Partial<Extract<SoundVoice, { kind: 'tone' }>> = {}): SoundVoice => ({
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
  const samples = await renderVoices(jump.voices, 0.5)
  expect(peak(samples, 0, 0.15)).toBeGreaterThan(0.05)
  expect(peak(samples, 0.25, 0.5)).toBeLessThan(0.001)
})

test('a voice that starts later is silent until then', async () => {
  const samples = await renderVoices([tone({ at: 0.2, length: 0.2 })], 0.5)
  expect(peak(samples, 0, 0.19)).toBeLessThan(0.001)
  expect(peak(samples, 0.2, 0.3)).toBeGreaterThan(0.05)
})

test('a noise voice is heard, and is the same noise every time', async () => {
  const hiss: SoundVoice = { kind: 'noise', pitch: 1200, at: 0, length: 0.2, volume: 1 }
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
