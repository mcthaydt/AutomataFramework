// The test host is the host for Node and for tests: everything a game asks of where it runs, answered by a made-up
// place that a test can change and look at. An agent can run a whole game's saves against it with no page.
import { expect, test } from 'vitest'
import { testHost } from '#src/features/host/host.ts'
import { createSaves, memoryStore } from '#src/features/saves/saves.ts'
import { progress } from '../../fixtures/saves/progress.ts'

test('it says it is the test host, on screen, with no language, no quit and a store in memory', async () => {
  const host = testHost()
  expect(host.target).toBe('test')
  expect(host.visible()).toBe(true)
  expect(host.language()).toBeUndefined()
  expect(host.deviceLanguages()).toEqual([])
  expect(host.canQuit).toBe(false)
  expect(host.opened).toEqual([])
  expect(host.quits).toBe(0)
  await host.store.set('a', '1')
  expect(await host.store.get('a')).toEqual({ ok: true, value: '1' })
})

test('show and hide are heard by listeners, and not after they stop listening', () => {
  const host = testHost()
  const heard: boolean[] = []
  const stop = host.onVisibility((visible) => heard.push(visible))
  host.hide()
  expect(host.visible()).toBe(false)
  host.show()
  stop()
  host.hide()
  expect(heard).toEqual([false, true])
})

test('the options are what it answers with', () => {
  const host = testHost({ visible: false, language: 'ko', deviceLanguages: ['pt-BR', 'en'], canQuit: true })
  expect(host.visible()).toBe(false)
  expect(host.language()).toBe('ko')
  expect(host.deviceLanguages()).toEqual(['pt-BR', 'en'])
  expect(host.canQuit).toBe(true)
})

test('its saves keep what they are given; a store passed in is the one used', async () => {
  const store = memoryStore()
  expect(testHost({ store }).store).toBe(store)
  await testHost({ store }).store.set('a', '1')
  expect(store.entries()).toEqual({ a: '1' })
  // Two hosts made without a store each have their own.
  const one = testHost()
  const two = testHost()
  await one.store.set('a', '1')
  expect(await two.store.get('a')).toEqual({ ok: true, value: null })
})

test('an https link is opened and remembered; anything else is refused and not remembered', async () => {
  const host = testHost()
  expect(await host.openLink('https://example.com/a')).toBe('opened')
  expect(await host.openLink('http://example.com')).toBe('refused')
  expect(await host.openLink('javascript:alert(1)')).toBe('refused')
  expect(host.opened).toEqual(['https://example.com/a'])
})

test('told to block links, it answers blocked', async () => {
  const host = testHost({ blockLinks: true })
  expect(await host.openLink('https://example.com')).toBe('blocked')
  // An address that is not https is refused before the host or the player is asked.
  expect(await host.openLink('http://example.com')).toBe('refused')
  expect(host.opened).toEqual([])
})

test('quit counts when it can quit, and answers false when it cannot', async () => {
  const can = testHost({ canQuit: true })
  expect(await can.quit()).toBe(true)
  expect(await can.quit()).toBe(true)
  expect(can.quits).toBe(2)
  const cannot = testHost()
  expect(await cannot.quit()).toBe(false)
  expect(cannot.quits).toBe(0)
})

test('a game runs on it', async () => {
  const saves = createSaves({ def: progress, store: testHost().store })
  expect(await saves.save(0, { level: 'level-1', doors: 2 })).toEqual({ ok: true })
  expect(await saves.load(0)).toMatchObject({ ok: true, data: { level: 'level-1', doors: 2 } })
})
