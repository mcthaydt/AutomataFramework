// The add-a-player screen alone: it fits, Done is the one button to press, a gamepad's button joins, and Enter shares the
// keyboard only where it can be shared.
import { afterEach, beforeEach, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import type { Claim } from '#src/features/input/input.ts'
import { frameworkWords } from '#src/features/locale/locale.ts'
import { playersScreen } from '#src/features/screens/players.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'
import { testLocale } from '../../fixtures/screens/locale.ts'
import { keyboard } from '../../fixtures/ui/keys.ts'

const es = frameworkWords('es')

let mount: HTMLDivElement
let screen: ReturnType<typeof playersScreen> | undefined
let told: string[]
/** The gamepad's side of `invite`: what the screen listens with, and whether it stopped. */
let invited: { call: (pad: number) => void; stopped: boolean }

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;inset:0'
  document.body.append(mount)
  told = []
  invited = { call: () => {}, stopped: false }
})
afterEach(() => {
  screen?.destroy()
  screen = undefined
  mount.remove()
})

function open(canShare: boolean, refused?: string, players: readonly number[] = [1]): void {
  screen = playersScreen({
    mount,
    locale: testLocale('es').locale,
    players,
    canShare,
    ...(refused === undefined ? {} : { refused }),
    invite: (onPad) => {
      invited.call = onPad
      return () => {
        invited.stopped = true
      }
    },
    onJoin: (claim: Claim) => told.push(`join ${claim}`),
    onDone: () => told.push('done'),
  })
}

const buttons = (): HTMLButtonElement[] => [...mount.querySelectorAll('button')]

test.each(SCREENS)(
  'at %s the sentences are never cut off and every button is big enough',
  async (_name, w, h) => {
    await page.viewport(w, h)
    open(true, es('automata.join.taken.gamepad'), [1, 2])
    const root = document.scrollingElement as Element
    expect([root.scrollWidth <= window.innerWidth, root.scrollHeight <= window.innerHeight]).toEqual([
      true,
      true,
    ])
    for (const button of buttons()) {
      const box = button.getBoundingClientRect()
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(44)
    }
  },
)

test('it says who is in and how to join, and Done is the one primary button', () => {
  open(true, undefined, [1, 2])
  expect(mount.textContent).toContain(es('automata.players.in', { player: 1 }))
  expect(mount.textContent).toContain(es('automata.players.in', { player: 2 }))
  expect(mount.textContent).toContain(es('automata.players.pad'))
  expect(mount.textContent).toContain(es('automata.players.keyboard'))
  const primary = buttons().filter((one) => one.dataset.kind === 'primary')
  expect(primary.map((one) => one.textContent?.trim())).toEqual([es('automata.players.done')])
})

test('a button on a gamepad that nobody has joins that gamepad', () => {
  open(false)
  invited.call(1)
  expect(told).toEqual(['join pad-1'])
})

test('Enter shares the keyboard where it can be shared, and says nothing where it cannot', async () => {
  open(true)
  await keyboard('{Enter}')
  expect(told).toEqual(['join keyboard'])
  screen?.destroy()
  screen = undefined
  told = []
  open(false)
  expect(mount.textContent).not.toContain(es('automata.players.keyboard'))
  await keyboard('{Enter}')
  // Enter pressed the button with the focus, as it does on any screen: nobody joined.
  expect(told.filter((one) => one.startsWith('join'))).toEqual([])
})

test('a refused try is said in words, Escape goes back, and a screen taken off stops listening', async () => {
  open(true, es('automata.join.taken.gamepad'))
  expect(mount.querySelector('[role="alert"]')?.textContent).toBe(es('automata.join.taken.gamepad'))
  await keyboard('{Escape}')
  expect(told).toEqual(['done'])
  screen?.destroy()
  expect(invited.stopped).toBe(true)
})
