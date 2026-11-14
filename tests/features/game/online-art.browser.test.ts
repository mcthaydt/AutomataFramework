// An online game with pictures: `startOnlineGame` loads the level's art as `startGame` does, before it joins a room, and
// draws its heroes as their figures with the level's camera. The room here is a stand-in whose session steps the
// page's own predicted sim, so the test needs no room (the implementation audit's I3).
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { GameContent } from '#src/features/content/content.ts'
import { loadGame } from '#src/features/content/content.ts'
import { type OnlineGame, startOnlineGame } from '#src/features/game/online.ts'
import { testHost } from '#src/features/host/host.ts'
import type { JoinOptions, Session, SessionStats } from '#src/features/net/net.ts'
import { ArtError } from '#src/features/render/render.ts'
import { readFullGamePicture } from '../../fixtures/full-game/pictures.ts'
import { readFullGame } from '../../fixtures/full-game/read.ts'
import { fixtureControls } from '../../fixtures/game/controls.ts'
import { manualFrames } from '../../fixtures/game/frames.ts'
import { heroPlugin } from '../../fixtures/game/hero.ts'
import { snapshot } from '../../fixtures/game/snapshot.ts'

const FRAME = 1000 / 60
/** The colours of the boxes of the hero and the crate: the hero has a figure, the crate has none. */
const HERO_BOX = 0xe4572e
const CRATE_BOX = 0xc9a227

let mount: HTMLDivElement
let online: OnlineGame | undefined

beforeEach(() => {
  mount = document.createElement('div')
  mount.style.cssText = 'position:fixed;left:0;top:0;width:844px;height:390px;overflow:hidden'
  document.body.append(mount)
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
})
afterEach(() => {
  online?.leave()
  online = undefined
  mount.remove()
  vi.restoreAllMocks()
})

async function full(): Promise<GameContent> {
  const loaded = await loadGame(readFullGame())
  if (!loaded.ok) throw new Error('the full game did not load')
  return loaded.value
}

/** A room for one, whose session steps the page's predicted sim once per `advance`. Counts how often it was joined. */
function standIn(joins: { count: number }) {
  return async (o: JoinOptions) => {
    joins.count++
    const stats = (): SessionStats => ({
      confirmedTick: o.predicted.tick,
      predictedTick: o.predicted.tick,
      lead: 0,
      rollbacks: 0,
      late: 0,
      desyncs: 0,
      syncs: 0,
      checked: 0,
    })
    const session: Session = {
      seat: 1,
      sim: o.predicted,
      state: () => ({ state: 'playing', away: [] }),
      stats,
      advance: () => {
        const stepped = o.predicted.step([])
        return { deltas: [stepped.render], events: stepped.events, steps: [] }
      },
      resume: () => undefined,
      close: () => undefined,
    }
    return { session, code: 'ROOM', rejoin: () => Promise.resolve(), leave: () => undefined }
  }
}

function start(
  content: GameContent,
  joins: { count: number },
  readPicture?: (path: string) => Promise<Blob>,
): Promise<OnlineGame> {
  return startOnlineGame({
    content,
    plugins: [heroPlugin],
    mount,
    controls: fixtureControls,
    host: testHost(),
    frames: manualFrames(),
    server: 'ws://room.test',
    seats: 1,
    join: standIn(joins),
    ...(readPicture === undefined ? {} : { readPicture }),
  })
}

const near = (colour: readonly number[], hex: number, slack = 8): boolean =>
  [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].every(
    (channel, i) => Math.abs((colour[i] ?? 0) - channel) <= slack,
  )

test('an online game with pictures and no readPicture says what to pass, and joins no room', async () => {
  const joins = { count: 0 }
  await expect(start(await full(), joins)).rejects.toThrow(
    'This game has pictures, so startOnlineGame needs "readPicture" to fetch them.',
  )
  expect(joins.count).toBe(0)
  expect(mount.children.length).toBe(0)
})

test('a missing picture stops an online game with one sentence before it joins a room', async () => {
  const joins = { count: 0 }
  const read = async (path: string): Promise<Blob> => {
    if (path === 'content/figures/hero.png') throw new Error('no such file')
    return readFullGamePicture(path)
  }
  const failed = start(await full(), joins, read)
  await expect(failed).rejects.toBeInstanceOf(ArtError)
  await expect(failed).rejects.toThrow(
    'The picture content/figures/hero.png is missing. Run "automata art" to paint it.',
  )
  expect(joins.count).toBe(0)
  expect(mount.children.length).toBe(0)
})

test('an online game draws its hero as its figure, and a thing with no figure as its box', async () => {
  const joins = { count: 0 }
  const frames = manualFrames()
  online = await startOnlineGame({
    content: await full(),
    plugins: [heroPlugin],
    mount,
    controls: fixtureControls,
    host: testHost(),
    frames,
    server: 'ws://room.test',
    seats: 1,
    join: standIn(joins),
    readPicture: readFullGamePicture,
  })
  frames.at(0)
  for (let i = 0; i < 30; i++) frames.advance(FRAME)
  const canvas = mount.querySelector('canvas')
  if (canvas === null) throw new Error('no canvas')
  const at = snapshot(canvas)
  let hero = 0
  let crate = 0
  for (let y = 0; y < canvas.clientHeight; y += 2)
    for (let x = 0; x < canvas.clientWidth; x += 2) {
      const colour = at(x, y)
      if (near(colour, HERO_BOX)) hero++
      if (near(colour, CRATE_BOX)) crate++
    }
  expect(joins.count).toBe(1)
  expect(crate, 'the crate, which has no figure, is its box').toBeGreaterThan(0)
  expect(hero, "the hero is its picture, so its box's colour is nowhere").toBe(0)
})
