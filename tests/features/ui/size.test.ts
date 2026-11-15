import { expect, test } from 'vitest'
import { sizeOf } from '#src/features/ui/ui.ts'
import { SCREENS } from '../../fixtures/game/screens.ts'

test('the five screens are narrow tall, wide tall, wide short, wide tall and wide tall', () => {
  expect(SCREENS.map(([, width, height]) => sizeOf(width, height))).toEqual([
    { width: 'narrow', height: 'tall' },
    { width: 'wide', height: 'tall' },
    { width: 'wide', height: 'short' },
    { width: 'wide', height: 'tall' },
    { width: 'wide', height: 'tall' },
  ])
})

test('narrow is under 600 px wide and short under 480 px high', () => {
  expect(sizeOf(599, 480)).toEqual({ width: 'narrow', height: 'tall' })
  expect(sizeOf(600, 479)).toEqual({ width: 'wide', height: 'short' })
  expect(sizeOf(600, 480)).toEqual({ width: 'wide', height: 'tall' })
  expect(sizeOf(0, 0)).toEqual({ width: 'narrow', height: 'short' })
})
