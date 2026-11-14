// "Press the key you want": waits for the next key, or the next gamepad press, and says which. It changes no binding;
// the caller passes the answer to `rebind` and shows the refusal's words if there is one. While it waits the game is
// silent (the caller holds `silence`), and the answer is kept from everything else: a key press is stopped before the
// game's own keyboard and the page's buttons see it, and a pad press is hidden from the game and from menus.
import type { PadInput } from '../commands/commands.ts'
import type { BindingSlot } from './bindings.ts'

/** The answer: the input pressed, or that the person backed out. */
export type CaptureAnswer =
  | { readonly ok: true; readonly input: string }
  | { readonly ok: false; readonly reason: 'cancelled' }

/** One wait for a press. */
export interface Capture {
  readonly done: Promise<CaptureAnswer>
  /** Gives up: `done` says `cancelled`. Does nothing once there is an answer. */
  cancel(): void
}

/** A capture the input drives: it also hears every frame's pad reading until it ends. */
export interface RunningCapture extends Capture {
  readonly ended: boolean
  /** What is held on each usable pad this frame; the first new press is the answer. */
  step(held: ReadonlyMap<number, ReadonlySet<PadInput>>): void
}

/** What a capture needs from the input around it. */
export interface CaptureEnv {
  readonly win: Window
  /** Silences the game; the returned function ends it. */
  readonly silence: () => () => void
  /** Hides everything held on every pad until it is let go. */
  readonly maskPads: () => void
}

/** The gamepad button that backs out of a pad capture. */
const BACK_OUT: PadInput = 'start'

export function startCapture(slot: BindingSlot, env: CaptureEnv): RunningCapture {
  const { win } = env
  const unsilence = env.silence()
  let finish: (answer: CaptureAnswer) => void = () => {}
  const done = new Promise<CaptureAnswer>((resolve) => {
    finish = resolve
  })
  let ended = false
  const cleanups: (() => void)[] = []
  const end = (answer: CaptureAnswer): void => {
    if (ended) return
    ended = true
    for (const cleanup of cleanups.splice(0)) cleanup()
    unsilence()
    if (slot === 'pad') env.maskPads()
    finish(answer)
  }
  const stop = (e: Event): void => {
    e.preventDefault()
    e.stopImmediatePropagation()
  }

  if (slot !== 'pad') {
    // The capture phase, so this hears the key before the game's keyboard and before the page's own handlers.
    const onKeyDown = (e: KeyboardEvent): void => {
      // A shortcut (Ctrl+R, Cmd+Left) is the browser's, and the key that opened this row, still held, is not an answer.
      if (e.ctrlKey || e.metaKey || e.altKey) return
      stop(e)
      if (e.repeat) return
      // The key's release is swallowed too: a button activates on Space's keyup, and the answer must not press it.
      const code = e.code
      const swallowUp = (up: KeyboardEvent): void => {
        if (up.code !== code) return
        stop(up)
        win.removeEventListener('keyup', swallowUp, true)
      }
      win.addEventListener('keyup', swallowUp, true)
      end(code === 'Escape' ? { ok: false, reason: 'cancelled' } : { ok: true, input: code })
    }
    win.addEventListener('keydown', onKeyDown, true)
    cleanups.push(() => win.removeEventListener('keydown', onKeyDown, true))
  }

  // What was held when the wait began is not an answer: only an input that goes down after it counts.
  let seen: Set<string> | undefined
  return {
    done,
    cancel: () => end({ ok: false, reason: 'cancelled' }),
    get ended() {
      return ended
    },
    step(held) {
      if (ended || slot !== 'pad') return
      const now = new Set<string>()
      for (const [index, inputs] of held) for (const input of inputs) now.add(`${index}:${input}`)
      const first = seen === undefined ? undefined : [...now].find((one) => !seen?.has(one))
      seen = now
      if (first === undefined) return
      const input = first.slice(first.indexOf(':') + 1)
      end(input === BACK_OUT ? { ok: false, reason: 'cancelled' } : { ok: true, input })
    },
  }
}
