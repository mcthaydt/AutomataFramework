// The kit's own colours (plan Q, Task 13): its words on its surfaces, and on its primary button, are 4.5 to 1 or more.
// The kit asks the browser for its colours (`canvas` and `canvastext`, in light and in dark), so what is checked is that
// every fallback in the kit is one of the pair that always contrasts, and that the pair does.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'

const UI = join(import.meta.dirname, '../../../src/features/ui')

/** What a browser means by each system colour, in light and in dark. */
const SYSTEM: Readonly<Record<string, readonly [light: string, dark: string]>> = {
  canvas: ['#ffffff', '#121212'],
  canvastext: ['#000000', '#ffffff'],
}

const channel = (hex: string, at: number): number => {
  const value = Number.parseInt(hex.slice(1 + at * 2, 3 + at * 2), 16) / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}
const luminance = (hex: string): number =>
  0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2)
/** The contrast ratio of two colours, 1 to 21. */
const ratio = (a: string, b: string): number => {
  const [top, bottom] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (top + 0.05) / (bottom + 0.05)
}

/** The fallback each colour property has in the kit's parts. */
function fallbacks(property: string): string[] {
  const found = new Set<string>()
  for (const name of readdirSync(UI).filter((one) => one.endsWith('.svelte')))
    for (const match of readFileSync(join(UI, name), 'utf8').matchAll(
      new RegExp(`var\\(--automata-ui-${property},\\s*([a-z]+)\\)`, 'g'),
    ))
      found.add(match[1] as string)
  return [...found]
}

test('the kit asks only for the surface and text colours it can check', () => {
  expect(fallbacks('background').every((one) => one === 'canvas')).toBe(true)
  expect(fallbacks('color').every((one) => one === 'canvastext' || one === 'inherit')).toBe(true)
  expect(fallbacks('background').length).toBeGreaterThan(0)
  expect(fallbacks('accent-color').every((one) => one === 'canvas')).toBe(true)
})

test("the kit's words on its surfaces, and on its primary button, are 4.5 to 1 or more", () => {
  for (const scheme of [0, 1] as const) {
    const canvas = (SYSTEM.canvas as readonly string[])[scheme] as string
    const text = (SYSTEM.canvastext as readonly string[])[scheme] as string
    // Words on a surface; the primary button is the text colour with the surface colour on it.
    expect(ratio(text, canvas), `words on a surface, scheme ${scheme}`).toBeGreaterThanOrEqual(4.5)
    expect(ratio(canvas, text), `words on the primary button, scheme ${scheme}`).toBeGreaterThanOrEqual(4.5)
  }
})
