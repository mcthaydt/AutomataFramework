// A hand-made audio context with only what the page's speaker reads, whose state a test sets, so the paths a real
// browser cannot be made to take on demand (a phone call, a suspended tab) can be walked through.

/** The part of a `GainNode` the speaker touches. */
export interface FakeGain {
  readonly gain: {
    value: number
    cancelScheduledValues(at: number): void
    setValueAtTime(value: number, at: number): void
    linearRampToValueAtTime(value: number, at: number): void
  }
  connect(to: unknown): void
}

export interface FakeContext {
  readonly context: AudioContext
  /** Changes the context's state and says so, as the browser's `statechange` does. */
  set(state: string): void
  /** How many times `resume` and `suspend` were called, and whether `close` was. */
  readonly resumes: number
  readonly suspends: number
  readonly closed: boolean
  /** Every gain made, in order: the master, then the sound bus's gain and its inner gain, then the music bus's two. */
  readonly gains: readonly FakeGain[]
  /** Every buffer made, in order: its length in samples and its sample rate. */
  readonly buffers: readonly { readonly length: number; readonly sampleRate: number }[]
  /** Every buffer source made, with the arguments of its `start` calls. */
  readonly sources: readonly { readonly starts: readonly (readonly number[])[] }[]
}

/** A context that starts `suspended`, as a browser's does before the first tap. */
export function fakeContext(): FakeContext {
  let state = 'suspended'
  let resumes = 0
  let suspends = 0
  let closed = false
  const listeners = new Set<() => void>()
  const gains: FakeGain[] = []
  const buffers: { length: number; sampleRate: number }[] = []
  const sources: { starts: number[][] }[] = []
  const fake = {
    get state() {
      return state
    },
    currentTime: 0,
    destination: {},
    resume: async () => {
      resumes++
    },
    suspend: async () => {
      suspends++
    },
    close: async () => {
      closed = true
    },
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    createGain: (): FakeGain => {
      const gain: FakeGain = {
        gain: {
          value: 1,
          cancelScheduledValues: () => undefined,
          setValueAtTime: () => undefined,
          linearRampToValueAtTime: () => undefined,
        },
        connect: () => undefined,
      }
      gains.push(gain)
      return gain
    },
    createBuffer: (_channels: number, length: number, sampleRate: number) => {
      const data = new Float32Array(length)
      buffers.push({ length, sampleRate })
      return { length, sampleRate, getChannelData: () => data }
    },
    createBufferSource: () => {
      const made = { starts: [] as number[][] }
      sources.push(made)
      return {
        buffer: undefined,
        playbackRate: { value: 1 },
        connect: () => undefined,
        start: (...args: number[]) => made.starts.push(args),
        stop: () => undefined,
      }
    },
  }
  return {
    context: fake as unknown as AudioContext,
    set(next) {
      state = next
      for (const listener of [...listeners]) listener()
    },
    get resumes() {
      return resumes
    },
    get suspends() {
      return suspends
    },
    get closed() {
      return closed
    },
    gains,
    buffers,
    sources,
  }
}
