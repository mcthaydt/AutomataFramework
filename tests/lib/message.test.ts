// The types a feature below `locale` answers with are types only: this test is the compiler's to fail.
import { expect, expectTypeOf, test } from 'vitest'
import type { Message, Value, Values } from '#src/lib/message.ts'

test('a message is a key and what goes into it', () => {
  expectTypeOf<Value>().toEqualTypeOf<string | number | readonly (string | number)[]>()
  expectTypeOf<Values>().toEqualTypeOf<Readonly<Record<string, Value>>>()
  expectTypeOf<Message>().toEqualTypeOf<{ readonly key: string; readonly values?: Values }>()
  const message: Message = { key: 'automata.online.waiting', values: { count: 2, names: ['a', 'b'] } }
  expect(message.key).toBe('automata.online.waiting')
})
