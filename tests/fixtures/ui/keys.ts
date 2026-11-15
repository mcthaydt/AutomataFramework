// Keys sent to a page the way a person types them, once the page can take them. Firefox gives a key to the element that
// holds the focus, and an element that was only just given it may not hold it yet (a Space sent at that moment is lost
// and the test then fails once in a while), so a test waits until the page and the element hold the focus before it
// types, and says what it was waiting for when they never do.
import { expect } from 'vitest'
import { userEvent } from 'vitest/browser'

/** Gives `element` the focus, and waits until the page has it and `element` holds it. */
export async function focusOn(element: HTMLElement): Promise<void> {
  element.focus()
  const holds = (): string =>
    `page focused ${document.hasFocus()}, element focused ${document.activeElement === element}`
  await expect.poll(holds, { timeout: 10_000 }).toBe('page focused true, element focused true')
}

/** Types `text` as `userEvent.keyboard` does, once the page holds the focus. */
export async function keyboard(text: string): Promise<void> {
  const holds = (): string => `page focused ${document.hasFocus()}`
  await expect.poll(holds, { timeout: 10_000 }).toBe('page focused true')
  await userEvent.keyboard(text)
}
