// The story in the sim: a cutscene that plays on sim ticks and a conversation that moves on a player's commands, both
// switched on by content (`usesStory`), so a game with neither has no `Story` and its recorded hashes stay as they
// were. The order of one tick's work is the plan's contract: `level.story.hold` in `input`, after `commands.controls`,
// ends and starts what is playing and holds the players' hands; the rest follows in the later phases.
//
// What the old repo did and this keeps: a cutscene is sim ticks that start at tick T and end at T plus its length or
// on a skip, and a player's input is ignored while it plays; a start while one plays replaces it (AutomataFrameworkFailed
// at ed8592e8, `extensions/cutscenes/src/shared/sim/cutscene.system.ts`).
import { ControlsCommand, Player } from '../commands/commands.ts'
import type { GameContent } from '../content/content.ts'
import {
  definePlugin,
  defineSystem,
  type PluginDef,
  type SimContext,
  type SystemDef,
} from '../sim/sim.ts'
import {
  ChooseCommand,
  ConversationChosen,
  ConversationEnded,
  ConversationSaid,
  ConversationStarted,
  CutsceneEnded,
  CutsceneStarted,
  NextCommand,
  SkipCommand,
  Story,
  type StoryState,
} from './story-state.ts'

/** True when the project lists a conversation or a cutscene: the only games that get this plugin. */
export function usesStory(content: GameContent): boolean {
  return (
    Object.keys(content.conversations ?? {}).length > 0 || Object.keys(content.cutscenes ?? {}).length > 0
  )
}

/** `list` with `id` in it once, in UTF-16 order (a `Story` list is sorted and has no repeats). */
function withId(list: readonly string[], id: string): string[] {
  return [...new Set([...list, id])].sort()
}

/** Ends the cutscene that is playing: it is `seen` now, and the page is told. */
function endScene(ctx: SimContext, story: StoryState, skipped: boolean): void {
  const scene = story.scene
  if (scene === null) return
  story.scene = null
  story.seen = withId(story.seen, scene.cutscene)
  ctx.emit(CutsceneEnded, { cutscene: scene.cutscene, skipped })
}

/**
 * Starts the cutscene `id`, for a game's own system. False, and nothing happens, when the game has no such cutscene or
 * it is staged in another level than the one open. A cutscene that is playing is replaced (it ends, skipped).
 */
export function startCutscene(ctx: SimContext, id: string): boolean {
  const file = (ctx.content as GameContent).cutscenes?.[id]
  if (file === undefined) return false
  const story = ctx.resource(Story)
  if (file.level !== story.level) return false
  endScene(ctx, story, true)
  story.scene = { cutscene: id, since: ctx.tick }
  ctx.emit(CutsceneStarted, { cutscene: id })
  return true
}

/**
 * Holds the hands of every player in a cutscene, or of the talker in a conversation, and lets go of the rest. The sim
 * blanks what a held player holds, so a game's own hero code needs no change and cannot forget. A key still down when
 * the hold ends is held again, and is never a new press: `Player.pressed` is set to '' (not left), because
 * `commands.controls` worked it out against the blanked ''.
 */
function holdHands(ctx: SimContext, story: StoryState): void {
  const arrived = new Set(ctx.commands.of(ControlsCommand).map((c) => c.source))
  // Who is held after this tick, and what each is really holding. A player who has left is not in it.
  const hands: Record<string, string> = {}
  for (const hero of ctx.query(Player)) {
    const { number, held, pressed } = hero.get(Player)
    const key = String(number)
    const before = story.hands[key]
    if (story.scene !== null || (story.talk !== null && story.talk.player === number)) {
      // What they hold is what `commands.controls` left, when it just heard from them or they were free before.
      hands[key] = arrived.has(number) || before === undefined ? held : before
      if (held !== '' || pressed !== '') hero.set(Player, { held: '', pressed: '' })
    } else if (before !== undefined) {
      hero.set(Player, { held: arrived.has(number) ? held : before, pressed: '' })
    }
  }
  story.hands = hands
}

const holdSystem: SystemDef = defineSystem({
  name: 'level.story.hold',
  phase: 'input',
  after: ['commands.controls'],
  run(ctx) {
    const content = ctx.content as GameContent
    const story = ctx.resource(Story)
    // 1. The level opens with its cutscene, unless an earlier play has seen it.
    if (ctx.tick === 0 && story.scene === null) {
      const opening = Object.keys(content.cutscenes ?? {})
        .sort()
        .find((id) => {
          const file = content.cutscenes?.[id]
          return file?.opens === true && file.level === story.level && !story.seen.includes(id)
        })
      if (opening !== undefined) startCutscene(ctx, opening)
    }
    // 2. A cutscene whose time is up ends.
    const scene = story.scene
    if (scene !== null) {
      const length = content.cutscenes?.[scene.cutscene]?.length ?? 0
      if (ctx.tick - scene.since >= length) endScene(ctx, story, false)
    }
    // 6. Hands.
    holdHands(ctx, story)
  },
})

/**
 * The plugin a game with a conversation or a cutscene gets: name 'story', depends on 'level'. It holds the `story`
 * resource, the three commands and the six events; its systems are in the phases the contract names.
 */
export const storyPlugin: PluginDef = definePlugin({
  name: 'story',
  dependsOn: ['level'],
  resources: [Story],
  commands: [NextCommand, ChooseCommand, SkipCommand],
  events: [
    ConversationStarted,
    ConversationSaid,
    ConversationChosen,
    ConversationEnded,
    CutsceneStarted,
    CutsceneEnded,
  ],
  systems: [holdSystem],
})
