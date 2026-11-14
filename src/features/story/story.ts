// The story's view: what a player sees and presses while a keeper talks or a cutscene plays. It reads the sim (never
// writes it), shows one speech box, and turns each press into a `story.*` command that goes out with the next tick's
// commands, so a replay of the play holds every press. The sim decides what is said; this file only shows it and sends
// what the player pressed.
import type { Sequence } from '../commands/commands.ts'
import type { GameContent } from '../content/content.ts'
import type { Input, Seat } from '../input/input.ts'
import {
  chooseCommand,
  nextCommand,
  SKIP_AFTER,
  type SceneView,
  sceneOf,
  skipCommand,
  type TalkView,
  talkOf,
} from '../level/level.ts'
import type { Command, Sim } from '../sim/sim.ts'
import { type BoxState, createBox, type StoryBox } from './box.ts'
import { type BoxWords, type Words, wordsOf } from './words.ts'

export { STORY_PROPERTIES } from './box.ts'
export { type BoxWords, type Words, wordsOf } from './words.ts'

/** What the page holds of the story. */
export interface StoryView {
  /** This tick's `story.*` commands, in the order they were pressed. */
  commands(tick: number): Command[]
  /** Call after each step (and after a restore): shows what the sim is on now. */
  update(): void
  /** While held (the game is paused) the box stays and its buttons do nothing. */
  hold(on: boolean): void
  /** The touch buttons now take `px` from the bottom of the mount: the box sits above them. */
  setInset(px: number): void
  destroy(): void
}

export interface StoryViewOptions {
  readonly mount: HTMLElement
  readonly sim: Sim
  readonly content: GameContent
  /** The game's one count of command numbers, shared with the input and the players' joins. */
  readonly sequence: Sequence
  /** Default: `wordsOf(content)`. */
  readonly words?: Words
  /** The words on the box's own two buttons. Default: Next and Skip. */
  readonly boxWords?: BoxWords
  /** A gamepad's menu presses, as `Input.onMenu` gives them. Left out, no pad moves the box. */
  readonly onMenu?: Input['onMenu']
  /** Who plays on this page. Left out, a press counts for whoever is talking. */
  readonly seats?: () => readonly Seat[]
  /** The key codes a player's keyboard holds: where players share the keyboard, the box leaves a second player's keys alone. */
  readonly keysOf?: (player: number) => readonly string[]
  /** How many CSS pixels the touch buttons take from the bottom. */
  readonly inset?: () => number
  /** A page that only watches: the box shows what is said, with no buttons and no keys, and sends nothing. */
  readonly watching?: boolean
}

/** What a press will send, kept until the next tick's commands. */
interface Press {
  readonly player: number
  readonly make: (tick: number, seq: number) => Command
}

/** The words for a speaker's name: a character's `name` is a message key, and a speaker with no name has none. */
function nameOf(content: GameContent, words: Words, speaker: string | undefined): string | undefined {
  const key = speaker === undefined ? undefined : content.characters[speaker]?.name
  return key === undefined ? undefined : words(key)
}

/** What the box shows for a conversation's line. */
function talkState(content: GameContent, words: Words, talk: TalkView): BoxState {
  const speaker = nameOf(content, words, talk.speaker)
  return {
    ...(speaker === undefined ? {} : { speaker }),
    text: words(talk.line),
    choices: talk.choices.map(words),
    next: talk.choices.length === 0,
    skip: false,
  }
}

/**
 * What the box shows for a cutscene: its first line showing now, with Skip once it has played `SKIP_AFTER` ticks.
 * Before then there is no Skip, so a tap meant for the last Next cannot land on it; a cutscene with nothing to say yet
 * and nothing to skip shows no box at all.
 */
function sceneState(content: GameContent, words: Words, scene: SceneView): BoxState | undefined {
  const first = scene.lines[0]
  const skip = scene.t >= SKIP_AFTER
  if (first === undefined && !skip) return undefined
  const speaker = first === undefined ? undefined : nameOf(content, words, first.speaker)
  return {
    ...(speaker === undefined ? {} : { speaker }),
    text: first === undefined ? '' : words(first.line),
    choices: [],
    next: false,
    skip,
  }
}

/** Makes the story's view: the box in `mount`, and the presses it turns into commands. */
export function createStoryView(options: StoryViewOptions): StoryView {
  const { mount, sim, content, sequence, seats, onMenu } = options
  const watching = options.watching === true
  const words = options.words ?? wordsOf(content)
  const local = (): readonly number[] => seats?.().map((seat) => seat.player) ?? []
  const pressed: Press[] = []
  /** The lowest-numbered player on this page: the one who skips, the same in every window of the same game. */
  const lowest = (): number => {
    const players = local()
    return players.length === 0 ? 1 : Math.min(...players)
  }

  /** The player a press speaks for: the one talking, if they play on this page. */
  const talker = (): number | undefined => {
    const talk = talkOf(sim, content)
    if (talk === undefined) return undefined
    return seats === undefined || local().includes(talk.player) ? talk.player : undefined
  }
  // What the box shows now, so it is told only when that changes and the focus is not thrown about.
  let shown = ''
  const queue = (press: Press): void => {
    if (watching) return
    pressed.push(press)
    // A press leaves the box waiting for its next `show`, even when the next line looks the same as this one.
    shown = ''
  }

  const box: StoryBox = createBox(
    mount,
    {
      next() {
        const player = talker()
        if (player !== undefined) queue({ player, make: (tick, seq) => nextCommand(tick, player, seq) })
      },
      choose(choice) {
        const player = talker()
        if (player !== undefined) queue({ player, make: (tick, seq) => chooseCommand(tick, player, seq, choice) })
      },
      skip() {
        const player = lowest()
        queue({ player, make: (tick, seq) => skipCommand(tick, player, seq) })
      },
    },
    options.boxWords,
    {
      watching,
      ignores(e) {
        const talking = talkOf(sim, content)?.player
        const others = local().filter((player) => player !== talking)
        return others.some((player) => options.keysOf?.(player).includes(e.code) === true)
      },
    },
  )
  box.setInset(options.inset?.() ?? 0)

  // A gamepad's presses: the talker's own pad moves the box and presses; any pad's "back" skips a cutscene that can be
  // skipped. `accept` does not skip, because it is most games' jump button.
  const seatHas = (player: number, pad: number): boolean =>
    seats === undefined || seats().some((seat) => seat.player === player && seat.devices.includes(`pad-${pad}`))
  let held = false
  const unlisten =
    watching || onMenu === undefined
      ? undefined
      : onMenu((press, pad) => {
          if (held) return
          const talk = talkOf(sim, content)
          if (press === 'back') {
            const scene = sceneOf(sim, content)
            if (talk === undefined && scene !== undefined && scene.t >= SKIP_AFTER && pressed.length === 0) {
              const player = lowest()
              queue({ player, make: (tick, seq) => skipCommand(tick, player, seq) })
            }
            return
          }
          if (talk === undefined || !seatHas(talk.player, pad)) return
          if (press === 'down') box.move(1)
          else if (press === 'up') box.move(-1)
          else if (press === 'accept') box.press()
        })

  return {
    commands(tick) {
      return pressed.splice(0).map((press) => press.make(tick, sequence.next(press.player)))
    },
    update() {
      const talk = talkOf(sim, content)
      const scene = talk === undefined ? sceneOf(sim, content) : undefined
      const state =
        talk !== undefined
          ? talkState(content, words, talk)
          : scene === undefined
            ? undefined
            : sceneState(content, words, scene)
      const now = JSON.stringify(state ?? null)
      if (now === shown) return
      shown = now
      box.show(state)
    },
    hold(on) {
      held = on
      box.setHeld(on)
    },
    setInset: (px) => box.setInset(px),
    destroy() {
      unlisten?.()
      box.destroy()
    },
  }
}
