// `startOnlineGame` puts a game on a page in a room. It is `startGame`'s wiring with a session in the middle: each
// step of the loop hands what the player holds to the session, which sends it to the room, predicts it at once and
// puts the picture right when the room's answer differs. The page is only ever as late as the room is: it never
// pauses, because the room does not wait for anyone.
import { pageFrames } from '../../lib/frames.ts'
import { createInput, touchSettingsOf } from '../input/input.ts'
import { createGameSim, skyOf } from '../level/level.ts'
import {
  coopSeats,
  type Joined,
  joinSession,
  type Link,
  OnlineError,
  type OnlineStatus,
  RECONNECT_DELAYS_MS,
  type SessionState,
  type SessionStats,
} from '../net/net.ts'
import { type Art, createRenderer } from '../render/render.ts'
import type { Sim } from '../sim/sim.ts'
import { soundNotice } from '../web/web.ts'
import { levelArt } from './art.ts'
import { createBuzzer } from './buzz.ts'
import { resolveControls } from './controls.ts'
import type { GameOptions } from './game.ts'
import { guardPlay } from './guard.ts'
import { requireLanguage } from './language.ts'
import { createLoop } from './loop.ts'
import { followLevel, stageOf } from './stage-of.ts'
import { thumbsOf, wireTouchRoom } from './thumb-wiring.ts'

export interface OnlineOptions extends Omit<GameOptions, 'players' | 'level'> {
  /** A `ws://` or `wss://` address. */
  readonly server: string
  /** A room's code: join that room. Without one, this page makes a new room. */
  readonly room?: string
  /** Default the project's start. */
  readonly level?: string
  /** How many players the room is for; used when this page makes the room. Default 2, or the game's own count if it is a co-op game. */
  readonly seats?: number
  /** Called whenever what a person should be told about the room changes (`onlineWords` has the words, in the language of `locale.words`). */
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
  /** The player's setting: whether the device may buzz when a feel file says so. */
  setVibration(on: boolean): void
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
    host,
    frames = pageFrames,
    settings,
    gamepads,
    server,
    room,
    seats: seatsOption,
    level: levelOption,
    onStatus,
    onCheck,
    wrapLink,
    join: joinRoom = joinSession,
    audio,
    soundNotice: noticeOption,
    locale,
    readPicture,
    touchSettings,
    ...simOptions
  } = options
  const controls = resolveControls('startOnlineGame', simOptions.content, options.controls)
  requireLanguage(locale)
  const level = levelOption ?? simOptions.content.project.start
  const levelData = simOptions.content.levels[level]
  if (levelData === undefined) throw new Error('The level this game opens is missing.')

  // The pictures first, as `startGame` loads them: a game that cannot be drawn joins no room and puts nothing on the page.
  const stage = stageOf(simOptions.content, level)
  const art: Art | undefined = await levelArt(
    'startOnlineGame',
    simOptions.content,
    level,
    readPicture,
    stage.simLevels,
  )
  // A co-op game's room has the places its level has starts for, and its heroes come by the sim's own `join`: both sims
  // then start with nobody, as the room's does. Any other game's room is for two unless this page says, and all of its
  // players are in from the start.
  const coop = coopSeats(simOptions.content.project, levelData.starts)
  const seats = coop ?? seatsOption ?? 2
  const players = coop === undefined ? Array.from({ length: seats }, (_, i) => i + 1) : []
  let confirmed: Sim
  try {
    confirmed = await createGameSim({ ...simOptions, level, players })
  } catch (error) {
    art?.destroy()
    throw error
  }
  let predicted: Sim
  try {
    predicted = await createGameSim({ ...simOptions, level, players })
  } catch (error) {
    confirmed.dispose()
    art?.destroy()
    throw error
  }
  // Leaving frees the art with the sims (the renderer frees it too once it has it; a second free does nothing).
  const disposeSims = (): void => {
    confirmed.dispose()
    predicted.dispose()
    art?.destroy()
  }

  let status: OnlineStatus =
    coop === undefined ? { state: 'waiting', code: '', missing: seats - 1 } : { state: 'playing', away: [] }
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
    const renderer = await createRenderer({
      mount,
      world: stage.world,
      sky: skyOf(levelData),
      art,
      view: levelData.view,
      levels: stage.levels,
      at: level,
    })
    // The page follows the sim it predicts with: the level its lowest-numbered hero is in.
    const follow = followLevel(renderer, session.sim, level, stage.levels)
    cleanup = () => {
      renderer.destroy()
      leaveRoom()
    }
    const thumbs = thumbsOf(simOptions.content)
    const input = createInput({
      mount,
      controls,
      frames,
      words: locale.words,
      ...(thumbs === undefined ? {} : { thumbs }),
      ...(settings === undefined ? {} : { settings }),
      ...(gamepads === undefined ? {} : { gamepads }),
    })
    // A new language says the touch buttons again. Stopped with the game.
    const unfollow = locale.onChange(() => input.relabel(locale.words))
    cleanup = () => {
      unfollow?.()
      input.destroy()
      renderer.destroy()
      leaveRoom()
    }
    input.setSwapSides(touchSettingsOf(touchSettings).swapSides)
    wireTouchRoom(input, renderer, levelData.view !== undefined)
    // This page plays one player. The room's other players' hands are theirs, and arrive in the room's ticks.
    input.setPlayers([seat])

    // The room can put this page back on its own state (a sync): ticks heard before it are not the ticks after it.
    const buzzer = createBuzzer({
      content: simOptions.content,
      host,
      device: (player) => input.device(player),
      tickHz: session.sim.tickHz,
      on: touchSettingsOf(touchSettings).vibration,
    })
    let syncsHeard = session.stats().syncs
    const step = (): void => {
      const advance = session.advance(input.poll(session.sim.tick))
      for (const delta of advance.deltas) renderer.apply(delta)
      follow()
      for (const heard of advance.steps) buzzer.hear(heard)
      if (audio === undefined) return
      const syncs = session.stats().syncs
      if (syncs !== syncsHeard) {
        syncsHeard = syncs
        audio.begin()
      }
      // One step at a time, each on its own tick, so two jumps that reached this page together are two sounds.
      for (const heard of advance.steps) audio.hear(heard)
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
    // The screen is kept lit exactly while the loop runs, as in `startGame`.
    const sync = (): void => {
      if (stopped) return
      if (host.visible()) loop.start()
      else loop.stop()
      host.keepAwake(host.visible())
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
        host.keepAwake(false)
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

    // The level is on screen: a new sim is about to be heard, and the page says the level started.
    audio?.begin()
    audio?.raise('level.started')
    const removeNotice =
      audio !== undefined && noticeOption !== false
        ? soundNotice({
            mount,
            audio,
            locale,
            ...(typeof noticeOption === 'string' ? { words: noticeOption } : {}),
          })
        : undefined
    // Last of all, like the notice: the browser's own zoom, selection, menus and pull are kept off the game.
    const unguard = guardPlay(mount)
    sync()
    return {
      sim: session.sim,
      seat,
      code: joined.code,
      status: () => status,
      stats: () => session.stats(),
      setVibration: (on) => buzzer.setOn(on),
      leave() {
        if (stopped) return
        stopped = true
        if (timer !== undefined) clearTimeout(timer)
        loop.stop()
        unlisten()
        unsilence?.()
        host.keepAwake(false)
        unguard()
        removeNotice?.()
        cleanup()
      },
    }
  } catch (error) {
    cleanup()
    throw error
  }
}
