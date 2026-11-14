// `startOnlineGame` puts a game on a page in a room. It is `startGame`'s wiring with a session in the middle: each
// step of the loop hands what the player holds to the session, which sends it to the room, predicts it at once and
// puts the picture right when the room's answer differs. The page is only ever as late as the room is: it never
// pauses, because the room does not wait for anyone.
import { pageFrames } from '../../lib/frames.ts'
import { checkControls, createInput } from '../input/input.ts'
import { createGameSim, levelSize, skyOf } from '../level/level.ts'
import {
  type Joined,
  joinSession,
  type Link,
  OnlineError,
  type OnlineStatus,
  RECONNECT_DELAYS_MS,
  type SessionState,
  type SessionStats,
} from '../net/net.ts'
import { createRenderer } from '../render/render.ts'
import type { Sim } from '../sim/sim.ts'
import type { GameOptions } from './game.ts'
import { createLoop } from './loop.ts'

export interface OnlineOptions extends Omit<GameOptions, 'players' | 'level'> {
  /** A `ws://` or `wss://` address. */
  readonly server: string
  /** A room's code: join that room. Without one, this page makes a new room. */
  readonly room?: string
  /** Default the project's start. */
  readonly level?: string
  /** How many players the room is for; used when this page makes the room. Default 2. */
  readonly seats?: number
  /** Called whenever what a person should be told about the room changes (`onlineWords` has the words). */
  readonly onStatus?: (status: OnlineStatus) => void
  readonly onCheck?: (tick: number, hash: string, ok: boolean) => void
  /** A test's lag or a debug tool: sees the line to the room, and any line that takes over after a drop. */
  readonly wrapLink?: (link: Link) => Link
  /** Default `joinSession`. A test joins a room that lives in the page. */
  readonly join?: typeof joinSession
}

export interface OnlineGame {
  /** The predicted sim: what is on screen. Never step it. */
  readonly sim: Sim
  /** Which player this page is, as the room gave it. */
  readonly seat: number
  /** The room's code, to share with a friend. */
  readonly code: string
  status(): OnlineStatus
  stats(): SessionStats
  /** Leaves the room, removes the canvas and the controls, and disposes both sims. Safe to call twice. */
  leave(): void
}

/**
 * Joins a room and starts the game in it, and returns once this page has its place. Rejects with an `OnlineError`,
 * having left nothing on the page, if the room cannot be joined; throws before anything is made if the controls are
 * wrong.
 */
export async function startOnlineGame(options: OnlineOptions): Promise<OnlineGame> {
  const {
    mount,
    controls,
    host,
    frames = pageFrames,
    settings,
    gamepads,
    server,
    room,
    seats = 2,
    level: levelOption,
    onStatus,
    onCheck,
    wrapLink,
    join: joinRoom = joinSession,
    ...simOptions
  } = options
  checkControls(controls)
  const level = levelOption ?? simOptions.content.project.start
  const levelData = simOptions.content.levels[level]
  if (levelData === undefined) throw new Error('The level this game opens is missing.')

  // Both sims have every player of the room: the room's sim does, and the three must start the same.
  const players = Array.from({ length: seats }, (_, i) => i + 1)
  const confirmed = await createGameSim({ ...simOptions, level, players })
  let predicted: Sim
  try {
    predicted = await createGameSim({ ...simOptions, level, players })
  } catch (error) {
    confirmed.dispose()
    throw error
  }
  const disposeSims = (): void => {
    confirmed.dispose()
    predicted.dispose()
  }

  let status: OnlineStatus = { state: 'waiting', code: '', missing: seats - 1 }
  const setStatus = (next: OnlineStatus): void => {
    status = next
    onStatus?.(next)
  }
  let seated: () => void = () => undefined
  const hasSeat = new Promise<void>((resolve) => {
    seated = resolve
  })
  let lineClosed: () => void = () => undefined
  let reconnect: () => void = () => undefined
  let closedBeforeSeat = false
  // False until the room has answered: a line that closes before that is a failed join, not a drop to recover from.
  let joinedYet = false

  const onState = (state: SessionState): void => {
    seated()
    if (state.state === 'playing') setStatus({ state: 'playing', away: state.away })
    // The room says who is missing in its next message; "0 missing" before that is not worth a screen.
    else if (state.state === 'waiting' && state.missing > 0)
      setStatus({ state: 'waiting', code: state.code, missing: state.missing })
  }

  let joined: Joined
  try {
    joined = await joinRoom({
      server,
      ...(room === undefined ? {} : { room }),
      level,
      seats,
      confirmed,
      predicted,
      ...(wrapLink === undefined ? {} : { wrapLink }),
      ...(onCheck === undefined ? {} : { onCheck }),
      onState,
      onLinkClosed: () => {
        if (joinedYet) reconnect()
        else {
          closedBeforeSeat = true
          lineClosed()
        }
      },
    })
  } catch (error) {
    disposeSims()
    throw error
  }
  const { session } = joined
  const leaveRoom = (): void => {
    joined.leave()
    disposeSims()
  }
  if (session.seat === undefined && !closedBeforeSeat) {
    const closedFirst = new Promise<void>((resolve) => {
      lineClosed = resolve
    })
    await Promise.race([hasSeat, closedFirst])
  }
  const seat = session.seat
  if (seat === undefined || closedBeforeSeat) {
    leaveRoom()
    throw new OnlineError('lost', 'The connection was lost before the room answered.')
  }
  joinedYet = true

  let cleanup = leaveRoom
  try {
    const renderer = await createRenderer({ mount, world: levelSize(levelData), sky: skyOf(levelData) })
    cleanup = () => {
      renderer.destroy()
      leaveRoom()
    }
    const input = createInput({
      mount,
      controls,
      frames,
      ...(settings === undefined ? {} : { settings }),
      ...(gamepads === undefined ? {} : { gamepads }),
    })
    cleanup = () => {
      input.destroy()
      renderer.destroy()
      leaveRoom()
    }
    renderer.setInset(input.inset())
    input.onInset((px) => renderer.setInset(px))
    // This page plays one player. The room's other players' hands are theirs, and arrive in the room's ticks.
    input.setPlayers([seat])

    const step = (): void => {
      for (const delta of session.advance(input.poll(session.sim.tick)).deltas) renderer.apply(delta)
    }
    const loop = createLoop({
      tickHz: session.sim.tickHz,
      step,
      draw: (alpha) => renderer.draw(alpha),
      frames,
    })

    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    // While the page is out of sight the loop is still, and the room goes on without this player: so the hand lets go
    // first, or the hero would run on for everyone else. What is held on coming back waits for a fresh press.
    let unsilence: (() => void) | undefined
    const sync = (): void => {
      if (stopped) return
      if (host.visible()) loop.start()
      else loop.stop()
    }
    const unlisten = host.onVisibility((visible) => {
      if (stopped) return
      if (!visible && unsilence === undefined) {
        unsilence = input.silence()
        step()
      } else if (visible) {
        unsilence?.()
        unsilence = undefined
      }
      sync()
    })

    // A dropped line: try to get back into the seat after each wait, then give up.
    let attempt = 0
    const tryAgain = (): void => {
      if (stopped) return
      const wait = RECONNECT_DELAYS_MS[attempt]
      if (wait === undefined) {
        setStatus({ state: 'ended', problem: 'lost' })
        loop.stop()
        return
      }
      attempt++
      timer = setTimeout(() => {
        joined.rejoin().then(
          () => {
            attempt = 0
            const now = session.state()
            setStatus({ state: 'playing', away: now.state === 'playing' ? now.away : [] })
          },
          (error: unknown) => {
            if (error instanceof OnlineError && error.problem === 'lost') {
              attempt = RECONNECT_DELAYS_MS.length
            }
            tryAgain()
          },
        )
      }, wait)
    }
    reconnect = () => {
      if (stopped || status.state === 'reconnecting') return
      setStatus({ state: 'reconnecting' })
      attempt = 0
      tryAgain()
    }

    sync()
    return {
      sim: session.sim,
      seat,
      code: joined.code,
      status: () => status,
      stats: () => session.stats(),
      leave() {
        if (stopped) return
        stopped = true
        if (timer !== undefined) clearTimeout(timer)
        loop.stop()
        unlisten()
        unsilence?.()
        cleanup()
      },
    }
  } catch (error) {
    cleanup()
    throw error
  }
}
