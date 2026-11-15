// Puts one screen over a mount and keeps it alive: a box that fills the mount, the kit's menu keys, the screen's language
// in `lang`, and the screen said again whenever the language changes.
import { type Component, flushSync, mount as render, unmount } from 'svelte'
import type { Words } from '../../lib/message.ts'
import { LANGUAGE_TAGS } from '../locale/locale.ts'
import { menuKeys } from '../ui/ui.ts'
import type { Screen, ScreenBase } from './screens.ts'

/** What a screen's player can put the focus on, in the order the screen lays them out. */
const CONTROLS = 'button:enabled, [role="slider"], [role="switch"]'

/**
 * Puts `component` over `mount` in a `div.automata-screen[data-screen=name]` that fills it, with `lang` set to the
 * player's language, the kit's menu keys running, and its props made again each time the language changes.
 */
export function show<P extends Record<string, unknown>>(
  component: Component<P>,
  base: ScreenBase & {
    readonly name: string
    readonly onBack?: () => void
    /** The gamepad's start button. */
    readonly onPause?: () => void
    /**
     * A screen drawn over the game that takes no keys and lets every touch through but its own buttons': the pause
     * button and the numbers over the heroes.
     */
    readonly overlay?: boolean
  },
  props: (words: Words) => P,
): Screen & {
  /** Makes the props again, after something the screen shows has changed. */
  update(): void
} {
  const { mount, locale } = base
  // The screen is placed against the mount, so a mount that is not positioned is made so while the screen is there.
  const restorePosition = getComputedStyle(mount).position === 'static' ? '' : undefined
  if (restorePosition !== undefined) mount.style.position = 'relative'
  const box = document.createElement('div')
  box.className = 'automata-screen'
  box.dataset.screen = base.name
  box.style.cssText = 'position:absolute;inset:0;overflow:hidden'
  if (base.overlay === true) box.style.pointerEvents = 'none'
  mount.append(box)

  let drawn: ReturnType<typeof render> | undefined
  const draw = (): void => {
    // `component` is any screen; to Svelte its props are one record, which is what `props` makes.
    const any = component as unknown as Component<Record<string, unknown>>
    drawn = render(any, { target: box, props: props(locale.words) })
    // Mounting leaves its effects (the first focus, the first measure) for later; the keys must find the screen done.
    flushSync()
  }
  const say = (): void => {
    const language = locale.language()
    if (language === undefined) box.removeAttribute('lang')
    else box.lang = LANGUAGE_TAGS[language]
  }
  say()
  draw()
  const keys =
    base.overlay === true
      ? undefined
      : menuKeys({
          root: box,
          ...(base.frames === undefined ? {} : { frames: base.frames }),
          ...(base.gamepads === undefined ? {} : { gamepads: base.gamepads }),
          ...(base.onBack === undefined ? {} : { onBack: base.onBack }),
          ...(base.onPause === undefined ? {} : { onPause: base.onPause }),
          onSound: (what) => base.onSound?.(`ui.${what}`),
        })

  /**
   * Draws the screen again where it stands: what had the focus has it still, by its place among the controls. A dialog
   * takes the focus itself when it opens; when it closes the focus goes to the first control.
   */
  const update = (): void => {
    if (drawn === undefined) return
    const all = (): HTMLElement[] => [...box.querySelectorAll<HTMLElement>(CONTROLS)]
    const dialog = (): Element | null => box.querySelector('[role="alertdialog"]')
    const active = document.activeElement
    const inDialog = dialog()?.contains(active) ?? false
    const held = box.contains(active) ? all().indexOf(active as HTMLElement) : -1
    void unmount(drawn)
    drawn = undefined
    box.replaceChildren()
    draw()
    if (dialog() !== null) return
    if (inDialog) all()[0]?.focus()
    else if (held >= 0) all()[held]?.focus()
  }
  const unfollow = locale.onChange(() => {
    say()
    update()
  })

  let destroyed = false
  return {
    update,
    destroy() {
      if (destroyed) return
      destroyed = true
      unfollow()
      keys?.destroy()
      if (drawn !== undefined) void unmount(drawn)
      drawn = undefined
      box.remove()
      if (restorePosition !== undefined) mount.style.position = restorePosition
    },
  }
}
