import { expect, test, vi } from 'vitest'
import { testSpeaker } from '#src/features/audio/audio.ts'
import type { SoundVoice } from '#src/features/content/content.ts'

const beep: SoundVoice = { kind: 'tone', wave: 'sine', from: 440, to: 440, at: 0, length: 0.1, volume: 1 }

test('it starts waiting, and a tap turns it on and tells the listeners once', () => {
  const speaker = testSpeaker()
  const heard = vi.fn()
  speaker.onState(heard)
  expect(speaker.state()).toBe('waiting')
  speaker.tap()
  speaker.tap()
  expect(speaker.state()).toBe('on')
  expect(heard.mock.calls).toEqual([['on']])
})

test('a voice played while waiting is dropped; one played while on is remembered with its bus and its time', () => {
  const speaker = testSpeaker()
  speaker.play('sound', beep, 0)
  expect(speaker.played).toEqual([])
  speaker.tap()
  speaker.play('music', beep, 1.5)
  expect(speaker.played).toEqual([{ bus: 'music', voice: beep, when: 1.5 }])
})

test('the clock stands still while waiting and moves with advance while on', () => {
  const speaker = testSpeaker()
  speaker.advance(1)
  expect(speaker.now()).toBe(0)
  speaker.tap()
  speaker.advance(0.5)
  expect(speaker.now()).toBe(0.5)
})

test('advance calls the clock listeners once, after the clock has moved', () => {
  const speaker = testSpeaker({ state: 'on' })
  const seen: number[] = []
  speaker.onClock(() => seen.push(speaker.now()))
  speaker.advance(0.25)
  expect(seen).toEqual([0.25])
})

test('interrupt goes back to waiting and a tap comes back on', () => {
  const speaker = testSpeaker({ state: 'on' })
  const states: string[] = []
  speaker.onState((state) => states.push(state))
  speaker.interrupt()
  speaker.interrupt()
  expect(speaker.state()).toBe('waiting')
  speaker.tap()
  expect(speaker.state()).toBe('on')
  expect(states).toEqual(['waiting', 'on'])
})

test('made unavailable, a tap changes nothing and no listener is called', () => {
  const speaker = testSpeaker({ state: 'unavailable' })
  const heard = vi.fn()
  speaker.onState(heard)
  speaker.tap()
  speaker.interrupt()
  expect(speaker.state()).toBe('unavailable')
  expect(heard).not.toHaveBeenCalled()
})

test('volume and cut are remembered per bus', () => {
  const speaker = testSpeaker()
  expect(speaker.levels).toEqual({ sound: 1, music: 1 })
  speaker.volume('music', 0.25)
  speaker.cut('music')
  expect(speaker.levels).toEqual({ sound: 1, music: 0.25 })
  expect(speaker.cuts).toEqual(['music'])
})

test('a listener that stopped listening hears nothing more; close is safe twice', () => {
  const speaker = testSpeaker()
  const heard = vi.fn()
  const stop = speaker.onState(heard)
  stop()
  speaker.tap()
  expect(heard).not.toHaveBeenCalled()
  expect(speaker.closed).toBe(false)
  speaker.close()
  speaker.close()
  expect(speaker.closed).toBe(true)
})
