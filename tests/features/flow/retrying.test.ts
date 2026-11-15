// A read that tries once more (plan Q, call 13), with no page: the first failure waits, the second is the answer.
import { expect, test } from 'vitest'
import { RETRY_MS, retrying, SLOW_MS } from '#src/features/flow/loading.ts'

test('the waits are the plan’s: ten seconds before the slow line, one before the second try', () => {
  expect(SLOW_MS).toBe(10_000)
  expect(RETRY_MS).toBe(1000)
})

test('a read that works is called once', async () => {
  let calls = 0
  const arrived: string[] = []
  const read = retrying(
    (path: string) => {
      calls += 1
      return Promise.resolve(`text of ${path}`)
    },
    { wait: () => Promise.resolve(), arrived: (path) => arrived.push(path) },
  )
  expect(await read('a.json')).toBe('text of a.json')
  expect(calls).toBe(1)
  expect(arrived).toEqual(['a.json'])
})

test('a read that fails once is tried again after the wait, and its answer is given', async () => {
  const order: string[] = []
  let calls = 0
  const read = retrying(
    (path: string) => {
      calls += 1
      order.push(`read ${calls}`)
      return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(path)
    },
    {
      wait: () => {
        order.push('wait')
        return Promise.resolve()
      },
      arrived: () => order.push('arrived'),
    },
  )
  expect(await read('a.json')).toBe('a.json')
  expect(order).toEqual(['read 1', 'wait', 'read 2', 'arrived'])
})

test('a read that fails twice rejects with the second error, after exactly two calls, and nothing arrived', async () => {
  let calls = 0
  const arrived: string[] = []
  const read = retrying(
    () => {
      calls += 1
      return Promise.reject(new Error(`failure ${calls}`))
    },
    { wait: () => Promise.resolve(), arrived: (path) => arrived.push(path) },
  )
  await expect(read('a.json')).rejects.toThrow('failure 2')
  expect(calls).toBe(2)
  expect(arrived).toEqual([])
})
