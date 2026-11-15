// The screen kept lit: asked for once while wanted, asked again only once the browser has let go, let go when not.
import { expect, test } from 'vitest'
import { wakeLock } from '#src/features/web/awake.ts'

/** A made-up `navigator.wakeLock`: it counts what it was asked and hands out sentinels a test can release. */
function fakeLock(answer: 'yes' | 'no' | 'throw' = 'yes') {
  const sentinels: { released: boolean; release(): Promise<void> }[] = []
  let asked = 0
  return {
    lock: {
      request(_type: 'screen') {
        asked += 1
        if (answer === 'throw') throw new Error('not allowed here')
        if (answer === 'no') return Promise.reject(new Error('refused'))
        const sentinel = {
          released: false,
          release() {
            sentinel.released = true
            return Promise.resolve()
          },
        }
        sentinels.push(sentinel)
        return Promise.resolve(sentinel)
      },
    },
    sentinels,
    asked: () => asked,
  }
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

test('on asks once, however often it is said; off lets go', async () => {
  const fake = fakeLock()
  const keepAwake = wakeLock(fake.lock)
  keepAwake(true)
  keepAwake(true)
  await settle()
  keepAwake(true)
  expect(fake.asked()).toBe(1)
  keepAwake(false)
  expect(fake.sentinels[0]?.released).toBe(true)
})

test('once the browser lets go (a hidden page), on asks again', async () => {
  const fake = fakeLock()
  const keepAwake = wakeLock(fake.lock)
  keepAwake(true)
  await settle()
  // The browser releases the lock by itself while the page is hidden.
  if (fake.sentinels[0] !== undefined) fake.sentinels[0].released = true
  keepAwake(true)
  await settle()
  expect(fake.asked()).toBe(2)
})

test('off while the browser is still answering lets go as soon as it answers', async () => {
  const fake = fakeLock()
  const keepAwake = wakeLock(fake.lock)
  keepAwake(true)
  keepAwake(false)
  await settle()
  expect(fake.sentinels[0]?.released).toBe(true)
})

test('no Wake Lock, a refusal or a throw does nothing and never throws', async () => {
  expect(() => wakeLock(undefined)(true)).not.toThrow()
  for (const answer of ['no', 'throw'] as const) {
    const fake = fakeLock(answer)
    const keepAwake = wakeLock(fake.lock)
    expect(() => keepAwake(true)).not.toThrow()
    await settle()
    // A refusal is not remembered as held: the next "on" asks again.
    keepAwake(true)
    await settle()
    expect(fake.asked()).toBe(2)
    expect(() => keepAwake(false)).not.toThrow()
  }
})
