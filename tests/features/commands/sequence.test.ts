import { expect, test } from 'vitest'
import { createSequence } from '#src/features/commands/commands.ts'

test('each player counts from 0 on their own', () => {
  const sequence = createSequence()
  expect([sequence.next(1), sequence.next(1), sequence.next(2), sequence.next(1)]).toEqual([0, 1, 0, 2])
})
