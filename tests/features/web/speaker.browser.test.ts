import { expect, test, vi } from 'vitest'
import type { SpeakerState } from '#src/features/audio/audio.ts'
import { testHost } from '#src/features/host/host.ts'
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

test('a recording kept before the first tap gets its buffer when the context is made', () => {
  const { fake, speaker, tap } = setup()
  speaker.keep('a.wav', { seconds: 0.5, samples: new Float32Array(22050) })
  expect(fake.buffers).toEqual([])
  tap()
  expect(fake.buffers).toEqual([{ length: 22050, sampleRate: 44100 }])
})

test('a recording kept after the context exists gets its buffer at once, and plays from it', () => {
  const { fake, speaker, tap } = setup()
  tap()
  fake.set('running')
  speaker.keep('a.wav', { seconds: 0.5, samples: new Float32Array(22050) })
  expect(fake.buffers).toHaveLength(1)
  const voice = {
    kind: 'recording',
    file: 'a.wav',
    from: 0.1,
    length: 0.2,
    speed: 2,
    at: 0,
    volume: 1,
  } as const
  speaker.play('sound', voice, 1)
  expect(fake.sources).toHaveLength(1)
  expect(fake.sources[0]?.starts).toEqual([[1, 0.1, 0.4]])
})

test('a recording that was never kept makes no source', () => {
  const { fake, speaker, tap } = setup()
  tap()
  fake.set('running')
  const voice = {
    kind: 'recording',
    file: 'a.wav',
    from: 0,
    length: 0.2,
    speed: 1,
    at: 0,
    volume: 1,
  } as const
  speaker.play('sound', voice, 1)
  expect(fake.sources).toEqual([])
})
