// The button that says the sound is waiting for a tap. A browser plays no sound before the player taps or presses a key,
// so until then a game would be silent and nobody would know why; this says so, in words, on a button. It needs no
// handler of its own: the speaker listens for every tap on the page, this one included.
import type { GameAudio } from '../audio/audio.ts'

/** The CSS custom properties a game sets to give the button its own look; each falls back to the framework's. */
export const NOTICE_PROPERTIES: readonly string[] = [
  '--automata-notice-background',
  '--automata-notice-color',
  '--automata-notice-border',
  '--automata-notice-radius',
  '--automata-notice-font',
]

/** The framework's own look: the touch buttons' colours, so the words reach 4.5 to 1 over the sky. */
const STYLE = [
  'position:absolute',
  'top:calc(12px + env(safe-area-inset-top))',
  'left:50%',
  'transform:translateX(-50%)',
  'z-index:20',
  'box-sizing:border-box',
  'max-width:calc(100% - 32px)',
  'min-height:48px',
  'padding:8px 20px',
  'cursor:pointer',
  'touch-action:manipulation',
  'background:var(--automata-notice-background,rgba(20,20,30,0.85))',
  'color:var(--automata-notice-color,#fff)',
  'border:var(--automata-notice-border,2px solid rgba(255,255,255,0.85))',
  'border-radius:var(--automata-notice-radius,16px)',
  'font:var(--automata-notice-font,700 18px/1.2 system-ui,sans-serif)',
].join(';')

/**
 * Shows `words` on a button at the top of `mount` while the sound waits for a first tap. It is there only while
 * `audio.state()` is `waiting` and the game has a cue at all, goes when the state changes, and comes back if the state
 * is `waiting` again (a phone call took the sound away). Returns a function that removes it and stops listening.
 */
export function soundNotice(options: {
  readonly mount: HTMLElement
  readonly audio: Pick<GameAudio, 'state' | 'onState' | 'silent'>
  /** Default 'Tap to start the sound'. */
  readonly words?: string
}): () => void {
  const { mount, audio } = options
  let button: HTMLButtonElement | undefined
  // The button is placed against the mount, so a mount that is not positioned is made so while the button is there.
  let restorePosition: string | undefined

  const show = (): void => {
    if (button !== undefined) return
    if (getComputedStyle(mount).position === 'static') {
      restorePosition = ''
      mount.style.position = 'relative'
    }
    button = document.createElement('button')
    button.type = 'button'
    button.dataset.automata = 'sound-notice'
    button.style.cssText = STYLE
    button.textContent = options.words ?? 'Tap to start the sound'
    mount.append(button)
  }
  const hide = (): void => {
    button?.remove()
    button = undefined
    if (restorePosition !== undefined) mount.style.position = restorePosition
    restorePosition = undefined
  }
  const sync = (): void => {
    if (audio.state() === 'waiting' && !audio.silent) show()
    else hide()
  }

  const stopListening = audio.onState(sync)
  sync()
  return () => {
    stopListening()
    hide()
  }
}
