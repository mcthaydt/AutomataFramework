import { expect, test, vi } from 'vitest'
import type { SpeakerState } from '#src/features/audio/audio.ts'
import { testHost } from '#src/features/host/host.ts'
import { limitCurve } from '#src/features/web/speaker.ts'
import { webSpeaker } from '#src/features/web/web.ts'
import { fakeContext } from '../../fixtures/audio/fake-context.ts'

/** A speaker over a fake context, a plain event target and a clock that a test ticks by hand. */
function setup(options: { host?: ReturnType<typeof testHost>; fails?: boolean } = {}) {
  const fake = fakeContext()
  const target = new EventTarget()
  const made = vi.fn(() => {
    if (options.fails) throw new Error('none')
    return fake.context
  })
  let run: (() => void) | undefined
  const every = (_ms: number, tick: () => void): (() => void) => {
    run = tick
    return () => {
      run = undefined
    }
  }
  const speaker = webSpeaker({
    ...(options.host === undefined ? {} : { host: options.host }),
    seams: { context: made, target, every },
  })
  const states: SpeakerState[] = []
  speaker.onState((state) => states.push(state))
  return {
    fake,
    speaker,
    made,
    states,
    tap: (type = 'pointerdown'): boolean => target.dispatchEvent(new Event(type)),
    tick: (): void => run?.(),
    clockRuns: (): boolean => run !== undefined,
    /** Lets the promises a speaker waits on settle. */
    settle: (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0)),
  }
}

test('nothing is built until a gesture, and the state is waiting', () => {
  const { speaker, made } = setup()
  expect(made).not.toHaveBeenCalled()
  expect(speaker.state()).toBe('waiting')
  expect(speaker.now()).toBe(0)
})

test.each(['pointerdown', 'pointerup', 'keydown', 'touchend'])(
  '%s builds the context and asks it to resume',
  (type) => {
    const { fake, made, tap } = setup()
    tap(type)
    expect(made).toHaveBeenCalledTimes(1)
    expect(fake.resumes).toBe(1)
  },
)

test('the state is on once the context is running, and listeners are told once', () => {
  const { fake, speaker, states, tap } = setup()
  tap()
  fake.set('running')
  fake.set('running')
  expect(speaker.state()).toBe('on')
  expect(states).toEqual(['on'])
})

test('still suspended after a gesture, it stays waiting and the next gesture asks again', async () => {
  const { fake, speaker, made, tap, settle } = setup()
  tap()
  await settle()
  expect(speaker.state()).toBe('waiting')
  tap()
  expect(fake.resumes).toBe(2)
  expect(made).toHaveBeenCalledTimes(1)
})

test('a context that cannot be made is unavailable for good', () => {
  const { speaker, made, states, tap } = setup({ fails: true })
  tap()
  tap()
  expect(speaker.state()).toBe('unavailable')
  expect(made).toHaveBeenCalledTimes(1)
  expect(states).toEqual(['unavailable'])
})

test('interrupted while on, it is waiting, and running again it is on', () => {
  const { fake, speaker, states, tap } = setup()
  tap()
  fake.set('running')
  fake.set('interrupted')
  expect(speaker.state()).toBe('waiting')
  fake.set('running')
  expect(speaker.state()).toBe('on')
  expect(states).toEqual(['on', 'waiting', 'on'])
})

test('a hidden host puts it to sleep and a shown one wakes it, with no change of state told', async () => {
  const host = testHost()
  const { fake, speaker, states, tap, settle } = setup({ host })
  tap()
  fake.set('running')
  host.hide()
  expect(fake.suspends).toBe(1)
  host.show()
  expect(fake.resumes).toBe(2)
  await settle()
  expect(speaker.state()).toBe('on')
  expect(states).toEqual(['on'])
})

test('back on screen but not running, it is waiting', async () => {
  const host = testHost()
  const { fake, speaker, tap, settle } = setup({ host })
  tap()
  fake.set('running')
  host.hide()
  fake.set('suspended')
  expect(speaker.state()).toBe('on')
  host.show()
  await settle()
  expect(speaker.state()).toBe('waiting')
})

test('the clock listeners are called only while on and awake', async () => {
  const host = testHost()
  const { fake, speaker, clockRuns, tap, tick, settle } = setup({ host })
  const heard = vi.fn()
  speaker.onClock(heard)
  expect(clockRuns()).toBe(false)
  tap()
  fake.set('running')
  expect(clockRuns()).toBe(true)
  tick()
  expect(heard).toHaveBeenCalledTimes(1)
  host.hide()
  expect(clockRuns()).toBe(false)
  host.show()
  await settle()
  expect(clockRuns()).toBe(true)
})

test("a volume set before the first gesture is the bus's gain, squared, once built", () => {
  const { fake, speaker, tap } = setup()
  speaker.volume('music', 0.5)
  tap()
  // The gains are made in order: the master, the sound bus's two, the music bus's two.
  expect(fake.gains[0]?.gain.value).toBe(0.5)
  expect(fake.gains[1]?.gain.value).toBe(1)
  expect(fake.gains[3]?.gain.value).toBe(0.25)
  speaker.volume('music', 1)
  expect(fake.gains[3]?.gain.value).toBe(1)
})

test('close removes the listeners and closes the context; twice is fine', () => {
  const { fake, speaker, made, tap } = setup()
  tap()
  speaker.close()
  speaker.close()
  expect(fake.closed).toBe(true)
  tap()
  expect(made).toHaveBeenCalledTimes(1)
})

test('every bus reaches the destination through one limiter, then the master gain', () => {
  const { fake, tap } = setup()
  tap()
  // The master, then each bus's own gain and the inner gain a cut replaces.
  const [master, soundBus, , musicBus] = fake.gains
  expect(fake.shapers).toHaveLength(1)
  const [limiter] = fake.shapers
  expect(fake.connections.get(soundBus)).toEqual([limiter])
  expect(fake.connections.get(musicBus)).toEqual([limiter])
  expect(fake.connections.get(limiter)).toEqual([master])
  expect(fake.connections.get(master)).toEqual([fake.context.destination])
})

test('the limiter leaves quiet sound as it was, never goes past 1, and treats both halves of a wave alike', () => {
  const curve = limitCurve()
  const middle = (curve.length - 1) / 2
  // At point `at` the input is `at / middle - 1`.
  const input = (at: number): number => at / middle - 1
  expect(curve[middle]).toBe(0)
  for (let at = 0; at < curve.length; at++) {
    const x = input(at)
    const y = curve[at] as number
    if (Math.abs(x) <= 0.7) expect(y).toBeCloseTo(x, 6)
    expect(Math.abs(y)).toBeLessThan(1)
    expect(y).toBeCloseTo(-(curve[curve.length - 1 - at] as number), 6)
    // Louder in is never quieter out.
    if (at > 0) expect(y).toBeGreaterThanOrEqual(curve[at - 1] as number)
  }
})
