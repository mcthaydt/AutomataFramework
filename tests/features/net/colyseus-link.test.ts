import { expect, test } from 'vitest'
import { connect, type SdkClient, type SdkRoom } from '#src/features/net/colyseus-link.ts'
import { OnlineError, type RoomOptions, type ServerMessage } from '#src/features/net/net.ts'

const OPTIONS: RoomOptions = {
  protocol: 1,
  framework: '0.1.0',
  schemaHash: '0000000000000001',
  contentHash: '0000000000000002',
  tickHz: 60,
  level: 'level-1',
  seed: 1,
  seats: 2,
}

/** The slice of the SDK a client reads, with the handlers a test calls by hand. */
function fakeRoom(code = 'ROOM') {
  const handlers = new Map<string, (payload: unknown) => void>()
  let onLeave: (code: number) => void = () => undefined
  const sent: { type: string; payload: unknown }[] = []
  const room: SdkRoom = {
    roomId: code,
    reconnectionToken: 'token-1',
    reconnection: { enabled: true },
    connection: { close: () => undefined },
    onMessage: (type, handler) => void handlers.set(type, handler),
    onLeave: (handler) => void (onLeave = handler),
    send: (type, payload) => void sent.push({ type, payload }),
    leave: async () => {
      onLeave(4000)
      return 4000
    },
    removeAllListeners: () => undefined,
  }
  return { room, handlers, sent, closeFromServer: (c = 1006) => onLeave(c) }
}

function fakeClient(room: SdkRoom, reject?: Error) {
  const calls: string[] = []
  const take = async (what: string): Promise<SdkRoom> => {
    calls.push(what)
    if (reject !== undefined) throw reject
    return room
  }
  const client: SdkClient = {
    create: (name) => take(`create ${name}`),
    joinById: (code) => take(`joinById ${code}`),
    reconnect: (token) => take(`reconnect ${token}`),
  }
  return { client, calls }
}

test('a message that parses reaches the session, and one that does not is dropped', async () => {
  const fake = fakeRoom()
  const { link, code } = await connect('ws://x', undefined, OPTIONS, async () => fakeClient(fake.room).client)
  expect(code).toBe('ROOM')
  const got: ServerMessage[] = []
  // Sent before anyone listened: held, and given as soon as there is a listener.
  fake.handlers.get('m')?.({ t: 'waiting', missing: 1 })
  fake.handlers.get('m')?.({ t: 'nonsense' })
  fake.handlers.get('m')?.('text')
  link.listen({ message: (m) => void got.push(m), bytes: () => undefined, closed: () => undefined })
  fake.handlers.get('m')?.({ t: 'start' })
  expect(got).toEqual([{ t: 'waiting', missing: 1 }, { t: 'start' }])
})

test('bytes on the second channel reach the session as their own copy', async () => {
  const fake = fakeRoom()
  const { link } = await connect('ws://x', undefined, OPTIONS, async () => fakeClient(fake.room).client)
  const got: Uint8Array[] = []
  link.listen({ message: () => undefined, bytes: (b) => void got.push(b), closed: () => undefined })
  const view = new Uint8Array([1, 2, 3])
  fake.handlers.get('b')?.(view)
  view[0] = 9
  expect(got).toEqual([new Uint8Array([1, 2, 3])])
})

test('what a session sends goes on the first channel, and the SDK keeps no retry of its own', async () => {
  const fake = fakeRoom()
  const { link } = await connect('ws://x', undefined, OPTIONS, async () => fakeClient(fake.room).client)
  link.send({ t: 'sync' })
  expect(fake.sent).toEqual([{ type: 'm', payload: { t: 'sync' } }])
  expect(fake.room.reconnection.enabled).toBe(false)
})

test('the connection ending calls closed once, but leaving on purpose does not', async () => {
  const dropped = fakeRoom()
  const a = await connect('ws://x', undefined, OPTIONS, async () => fakeClient(dropped.room).client)
  let closed = 0
  a.link.listen({ message: () => undefined, bytes: () => undefined, closed: () => void closed++ })
  dropped.closeFromServer()
  dropped.closeFromServer()
  expect(closed).toBe(1)

  const left = fakeRoom()
  const b = await connect('ws://x', undefined, OPTIONS, async () => fakeClient(left.room).client)
  let again = 0
  b.link.listen({ message: () => undefined, bytes: () => undefined, closed: () => void again++ })
  b.link.close()
  await Promise.resolve()
  expect(again).toBe(0)
})

test('with no code a page makes a room; with one it joins that room', async () => {
  const none = fakeClient(fakeRoom().room)
  await connect('ws://x', undefined, OPTIONS, async () => none.client)
  expect(none.calls).toEqual(['create game'])
  const some = fakeClient(fakeRoom().room)
  await connect('ws://x', 'ABCD', OPTIONS, async () => some.client)
  expect(some.calls).toEqual(['joinById ABCD'])
})

test('a refused join becomes the problem a person is told about', async () => {
  const cases: [string, string][] = [
    ['room-full: that room is full', 'room-full'],
    ['room "abc" is locked', 'room-full'],
    ['room "abc" not found', 'no-room'],
    ['different-version: reload', 'different-version'],
    ['bad-room: level-1 has no start for player 3', 'bad-room'],
    ['server-full: no space', 'server-full'],
    ['fetch failed', 'no-server'],
    ['connect ECONNREFUSED 127.0.0.1:1', 'no-server'],
  ]
  for (const [message, problem] of cases) {
    const failing = fakeClient(fakeRoom().room, new Error(message))
    const result = await connect('ws://x', 'abc', OPTIONS, async () => failing.client).catch(
      (e: unknown) => e,
    )
    expect(result, message).toBeInstanceOf(OnlineError)
    expect((result as OnlineError).problem, message).toBe(problem)
  }
})

test('reconnect gives a new line from the stored token', async () => {
  const first = fakeRoom()
  const second = fakeRoom('ROOM')
  const n = 0
  const { client, calls } = fakeClient(first.room)
  client.reconnect = async (token) => {
    calls.push(`reconnect ${token}`)
    return second.room
  }
  void n
  const conn = await connect('ws://x', undefined, OPTIONS, async () => client)
  const next = await conn.reconnect()
  const got: ServerMessage[] = []
  next.listen({ message: (m) => void got.push(m), bytes: () => undefined, closed: () => undefined })
  second.handlers.get('m')?.({ t: 'start' })
  expect(calls).toContain('reconnect token-1')
  expect(got).toEqual([{ t: 'start' }])
})
