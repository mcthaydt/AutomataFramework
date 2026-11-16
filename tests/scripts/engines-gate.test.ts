import { describe, expect, test } from 'vitest'
import { type Ask, getJson, type Job, judge, listJobs, SHARDS } from '../../scripts/engines-gate.ts'

const job = (name: string, conclusion: string | null): Job => ({ name, conclusion })
/** The jobs of one browser's shards, in order; each result is that shard's conclusion (all `success` unless named). */
const shards = (engine: string, results: Record<number, string | null> = {}): Job[] =>
  Array.from({ length: SHARDS }, (_, index) => {
    const n = index + 1
    return job(`browsers (${engine} ${n}/${SHARDS})`, n in results ? (results[n] ?? null) : 'success')
  })
const chromium = (results: Record<number, string | null> = {}): Job[] => shards('chromium', results)

describe('judge: every shard of a browser must have passed', () => {
  test('a browser is six shards, the number `ci.yml` runs', () => {
    expect(SHARDS).toBe(6)
  })

  test('passes when every shard passed', () => {
    const verdict = judge([chromium()], 'chromium')
    expect(verdict.ok).toBe(true)
    expect(verdict.lines).toEqual([1, 2, 3, 4, 5, 6].map((n) => `browsers (chromium ${n}/6): success`))
  })

  test('fails when any one shard failed, was cancelled, or has no result', () => {
    for (const n of [1, 3, 6]) {
      expect(judge([chromium({ [n]: 'failure' })], 'chromium').ok).toBe(false)
      expect(judge([chromium({ [n]: 'cancelled' })], 'chromium').ok).toBe(false)
      expect(judge([chromium({ [n]: null })], 'chromium').ok).toBe(false)
    }
  })

  test('fails when a shard is missing, and when the browser has no shards at all', () => {
    expect(judge([chromium().slice(0, 5)], 'chromium').ok).toBe(false)
    expect(judge([[]], 'chromium').ok).toBe(false)
  })

  test('reads only the shards of the browser it was asked about', () => {
    const jobs = [...chromium(), ...shards('webkit', { 2: 'failure' })]
    expect(judge([jobs], 'chromium').ok).toBe(true)
    expect(judge([jobs], 'webkit').ok).toBe(false)
  })

  test('a draft has Chromium alone, and its check is still judged by its own six', () => {
    expect(judge([chromium()], 'webkit').ok).toBe(false)
    expect(judge([chromium()], 'chromium').ok).toBe(true)
  })

  test('a shard that was run again counts by its last result: failed then passed is a pass', () => {
    const first = chromium({ 4: 'failure' })
    const second = [job('browsers (chromium 4/6)', 'success')]
    expect(judge([first, second], 'chromium').ok).toBe(true)
  })

  test('a shard that was run again counts by its last result: passed then failed is a fail', () => {
    const first = chromium()
    const second = [job('browsers (chromium 4/6)', 'failure')]
    expect(judge([first, second], 'chromium').ok).toBe(false)
  })

  test('re-running only the check itself, which lists no shards, keeps the shards of the attempt before', () => {
    const first = chromium()
    const second = [job('engines (chromium)', 'failure')]
    expect(judge([first, second], 'chromium').ok).toBe(true)
  })
})

const answer = (status: number, body: unknown = {}): Awaited<ReturnType<Ask>> => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})
const noWait = { tries: 5, wait: async () => {} }

describe('getJson: asks again when GitHub is the one that failed', () => {
  test('a 502 and then an answer gives the answer, after one more try', async () => {
    const seen: number[] = []
    const replies = [answer(502), answer(200, { jobs: [] })]
    const ask: Ask = async () => {
      seen.push(seen.length)
      return replies.shift() ?? answer(500)
    }
    expect(await getJson('https://api.github.com/x', 't', ask, noWait)).toEqual({ jobs: [] })
    expect(seen).toHaveLength(2)
  })

  test('a dropped connection, a 500 and a 429 are asked again too', async () => {
    const replies: (Awaited<ReturnType<Ask>> | Error)[] = [
      new Error('socket hang up'),
      answer(500),
      answer(429),
      answer(200, 1),
    ]
    const ask: Ask = async () => {
      const next = replies.shift()
      if (next instanceof Error) throw next
      return next ?? answer(500)
    }
    expect(await getJson('u', 't', ask, noWait)).toBe(1)
  })

  test('it gives up after the tries it was given, and says what GitHub answered', async () => {
    let asked = 0
    const ask: Ask = async () => {
      asked += 1
      return answer(502)
    }
    await expect(getJson('https://api.github.com/x', 't', ask, noWait)).rejects.toThrow(/HTTP 502/)
    expect(asked).toBe(5)
  })

  test('a 404 or a 403 is not asked again', async () => {
    let asked = 0
    const ask: Ask = async () => {
      asked += 1
      return answer(404)
    }
    await expect(getJson('u', 't', ask, noWait)).rejects.toThrow(/HTTP 404/)
    expect(asked).toBe(1)
  })

  test('it waits longer after each failure, and sends the token', async () => {
    const waited: number[] = []
    const headers: Record<string, string>[] = []
    const replies = [answer(502), answer(502), answer(200, 'ok')]
    const ask: Ask = async (_url, init) => {
      headers.push(init.headers)
      return replies.shift() ?? answer(500)
    }
    await getJson('u', 'secret', ask, { tries: 5, wait: async (n) => void waited.push(n) })
    expect(waited).toEqual([1, 2])
    expect(headers[0]?.Authorization).toBe('Bearer secret')
  })
})

describe('listJobs: reads every page of an attempt', () => {
  test('a full page of 100 asks for the next one, and the last short page ends it', async () => {
    const page = (count: number, from: number): { jobs: Job[] } => ({
      jobs: Array.from({ length: count }, (_, i) => job(`job ${from + i}`, 'success')),
    })
    const urls: string[] = []
    const bodies = [page(100, 0), page(3, 100)]
    const ask: Ask = async (url) => {
      urls.push(url)
      return answer(200, bodies.shift())
    }
    const jobs = await listJobs('o/r', '42', 2, 't', ask, noWait)
    expect(jobs).toHaveLength(103)
    expect(urls).toEqual([
      'https://api.github.com/repos/o/r/actions/runs/42/attempts/2/jobs?per_page=100&page=1',
      'https://api.github.com/repos/o/r/actions/runs/42/attempts/2/jobs?per_page=100&page=2',
    ])
  })
})
