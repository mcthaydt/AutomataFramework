// A sound made from a kind and a seed is the same in every engine: every kind at two seeds, as one recorded hash.
import { expect, test } from 'vitest'
import { makeSound, SOUND_KINDS } from '#src/features/audio/audio.ts'
import { SoundSchema } from '#src/features/content/content.ts'
import { canonicalJson, utf8 } from '#src/lib/canonical.ts'
import { hex64, xxhash64 } from '#src/lib/xxhash64.ts'
import { expectRecorded } from '../../fixtures/golden.ts'
import golden from '../../golden/kinds.json' with { type: 'json' }

test.each(SOUND_KINDS)('%s, at seeds 0 to 19, is a sound file that ends inside ten seconds', (kind) => {
  for (let seed = 0; seed < 20; seed++) {
    const sound = makeSound(kind, seed)
    const read = SoundSchema.safeParse(sound)
    expect(read.success, `${kind} ${seed}: ${JSON.stringify(read.error?.issues)}`).toBe(true)
    for (const voice of sound.voices) expect(voice.at + voice.length).toBeLessThanOrEqual(10)
  }
})

test.each(SOUND_KINDS)('%s: the same seed is the same sound, the next seed is another take', (kind) => {
  expect(makeSound(kind, 5)).toEqual(makeSound(kind, 5))
  expect(makeSound(kind, 0)).not.toEqual(makeSound(kind, 1))
})

test('every voice of every kind has the volume a sound can have', () => {
  for (const kind of SOUND_KINDS) expect(makeSound(kind, 0).volume).toBe(0.8)
})

test('a coin has two tones, the second after the first and higher; a power-up has three, each higher', () => {
  const coin = makeSound('coin', 4).voices
  expect(coin).toHaveLength(2)
  const [first, second] = coin
  if (first?.kind !== 'tone' || second?.kind !== 'tone') throw new Error('a coin is two tones')
  expect(second.at).toBeCloseTo(first.at + first.length, 3)
  expect(second.from / first.from).toBeGreaterThanOrEqual(1.33)
  expect(second.from / first.from).toBeLessThanOrEqual(1.5)
  const tones = makeSound('power-up', 4).voices
  const power = tones.flatMap((voice) => (voice.kind === 'tone' ? [voice.from] : []))
  expect(power).toHaveLength(3)
  expect(power[1]).toBeGreaterThan(power[0] ?? 0)
  expect(power[2]).toBeGreaterThan(power[1] ?? 0)
})

test('the id is the kind unless one is given', () => {
  expect(makeSound('coin', 0).id).toBe('coin')
  expect(makeSound('coin', 0, 'coin-2').id).toBe('coin-2')
})

test('a seed that is not a whole number from 0 is said in plain words', () => {
  expect(() => makeSound('jump', -1)).toThrow('A seed is a whole number from 0, like 3. Got -1.')
  expect(() => makeSound('jump', 1.5)).toThrow('A seed is a whole number from 0, like 3. Got 1.5.')
})

test('every kind at seeds 0 and 1 is the same text in every engine', () => {
  const all = SOUND_KINDS.flatMap((kind) => [makeSound(kind, 0), makeSound(kind, 1)])
  expectRecorded('kinds', hex64(xxhash64(utf8(canonicalJson(all)))), golden.kinds)
})
