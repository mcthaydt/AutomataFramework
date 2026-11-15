// The page's speaker: Web Audio behind the audio feature's `Speaker` port. Nothing is built until the player's first
// tap or key, because a browser plays no sound before one; a browser that suspends the sound again (a phone call, a
// tab put away) puts the speaker back to waiting, and the next tap resumes it.
import type { Bus, Speaker, SpeakerState } from '../audio/audio.ts'
import type { Host } from '../host/host.ts'
import { playVoice } from './voices.ts'

/** What the web speaker reads of the page. Only for tests; a game passes nothing. */
export interface SpeakerSeams {
  /** Makes the page's audio context. May throw: a browser can have none. */
  readonly context: () => AudioContext
  /** Where taps and keys land. Default `window`. */
  readonly target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>
  /** Calls `run` every `ms`; returns a function that stops it. Default `setInterval`. */
  readonly every: (ms: number, run: () => void) => () => void
}

/** What a browser counts as the player's own doing: sound may start on any of these, and on no other. */
const GESTURES = ['pointerdown', 'pointerup', 'keydown', 'touchend'] as const
/** How often the clock listeners are called, in milliseconds. */
const CLOCK_MS = 50
/** Room for several voices at once: every bus goes through this. */
const MASTER = 0.5
/** How long a cut takes to fade, in seconds. */
const FADE = 0.3

/** The two nodes of a bus: the player's volume, and the gain a cut fades out and replaces. */
interface BusNodes {
  readonly gain: GainNode
  inner: GainNode
}

/**
 * The speaker for a page. With a `host`, it sleeps while the host says the game is not on screen: the audio context
 * is suspended, the clock stops, and the state it reports stays as it was, so a hidden page never shows a button.
 */
export function webSpeaker(
  options: { readonly host?: Host; readonly seams?: Partial<SpeakerSeams> } = {},
): Speaker {
  const seams: SpeakerSeams = {
    context: () => new AudioContext(),
    target: window,
    every: (ms, run) => {
      const id = setInterval(run, ms)
      return () => clearInterval(id)
    },
    ...options.seams,
  }
  let context: AudioContext | undefined
  let state: SpeakerState = 'waiting'
  let asleep = options.host !== undefined && !options.host.visible()
  let closed = false
  let stopClock: (() => void) | undefined
  const buses: Partial<Record<Bus, BusNodes>> = {}
  // What the player chose, kept from before the first tap so it is right when the sound starts.
  const volumes: Record<Bus, number> = { sound: 1, music: 1 }
  const stateListeners = new Set<(state: SpeakerState) => void>()
  const clockListeners = new Set<() => void>()

  /** The clock runs only while sound can be heard. */
  const syncClock = (): void => {
    const wanted = state === 'on' && !asleep
    if (wanted && stopClock === undefined) {
      stopClock = seams.every(CLOCK_MS, () => {
        for (const listener of [...clockListeners]) listener()
      })
    } else if (!wanted && stopClock !== undefined) {
      stopClock()
      stopClock = undefined
    }
  }
  const setState = (next: SpeakerState): void => {
    if (next === state) return
    state = next
    syncClock()
    for (const listener of [...stateListeners]) listener(next)
  }
  /** The state follows the context's own: on while it runs, waiting while it does not. */
  const refresh = (): void => {
    if (closed || asleep || context === undefined || state === 'unavailable') return
    setState(context.state === 'running' ? 'on' : 'waiting')
    syncClock()
  }

  /** Makes the context and the buses. The squared volume makes half way along a slider sound about half as loud. */
  const build = (): AudioContext => {
    const made = seams.context()
    const master = made.createGain()
    master.gain.value = MASTER
    master.connect(made.destination)
    for (const bus of ['sound', 'music'] as const) {
      const gain = made.createGain()
      gain.gain.value = volumes[bus] * volumes[bus]
      gain.connect(master)
      const inner = made.createGain()
      inner.connect(gain)
      buses[bus] = { gain, inner }
    }
    made.addEventListener('statechange', refresh)
    return made
  }

  const removeGestures = (): void => {
    for (const type of GESTURES) seams.target.removeEventListener(type, onGesture, true)
  }
  /** The first gesture builds the context; every one while the sound waits asks the browser to resume it. */
  function onGesture(): void {
    if (closed || asleep || state === 'unavailable') return
    if (context === undefined) {
      try {
        context = build()
      } catch {
        // No audio on this device: the game plays on in silence, and the state says so for good.
        removeGestures()
        setState('unavailable')
        return
      }
    }
    if (state === 'on') return
    context.resume().then(refresh, () => undefined)
  }
  for (const type of GESTURES) seams.target.addEventListener(type, onGesture, true)

  const offHost = options.host?.onVisibility((visible) => {
    if (closed) return
    if (visible) {
      asleep = false
      context?.resume().then(refresh, refresh)
    } else {
      asleep = true
      syncClock()
      context?.suspend().catch(() => undefined)
    }
  })

  return {
    state: () => state,
    onState(listener) {
      stateListeners.add(listener)
      return () => {
        stateListeners.delete(listener)
      }
    },
    now: () => context?.currentTime ?? 0,
    onClock(listener) {
      clockListeners.add(listener)
      return () => {
        clockListeners.delete(listener)
      }
    },
    play(bus, voice, when) {
      const nodes = buses[bus]
      if (state !== 'on' || asleep || context === undefined || nodes === undefined) return
      playVoice(context, nodes.inner, voice, when)
    },
    volume(bus, value) {
      volumes[bus] = value
      const nodes = buses[bus]
      if (nodes !== undefined) nodes.gain.gain.value = value * value
    },
    cut(bus) {
      const nodes = buses[bus]
      if (context === undefined || nodes === undefined) return
      // Voices handed over earlier fade with the old gain; the new one is for what comes next.
      const now = context.currentTime
      nodes.inner.gain.cancelScheduledValues(now)
      nodes.inner.gain.setValueAtTime(nodes.inner.gain.value, now)
      nodes.inner.gain.linearRampToValueAtTime(0, now + FADE)
      const inner = context.createGain()
      inner.connect(nodes.gain)
      nodes.inner = inner
    },
    close() {
      if (closed) return
      closed = true
      removeGestures()
      stopClock?.()
      stopClock = undefined
      offHost?.()
      stateListeners.clear()
      clockListeners.clear()
      context?.removeEventListener('statechange', refresh)
      context?.close().catch(() => undefined)
    },
  }
}
