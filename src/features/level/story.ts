// The story in the sim: a cutscene that plays on sim ticks and a conversation that moves on a player's commands, both
// switched on by content (`usesStory`), so a game with neither has no `Story` and its recorded hashes stay as they
// were. The order of one tick's work is the plan's contract: `level.story.hold` in `input`, after `commands.controls`,
// ends and starts what is playing and holds the players' hands; the rest follows in the later phases.
//
// What the old repo did and this keeps: a cutscene is sim ticks that start at tick T and end at T plus its length or
// on a skip, and a player's input is ignored while it plays; a start while one plays replaces it (AutomataFrameworkFailed
// at ed8592e8, `extensions/cutscenes/src/shared/sim/cutscene.system.ts`).
import { ControlsCommand, Player } from '../commands/commands.ts'
import type { ConversationFile, GameContent } from '../content/content.ts'
import { Body, Transform } from '../physics/physics.ts'
import {
  definePlugin,
  defineSystem,
  type EntityRef,
  hypot,
  type PluginDef,
  type SimContext,
  type SystemDef,
} from '../sim/sim.ts'
import { Thing } from './components.ts'
import {
  ChooseCommand,
  ConversationChosen,
  ConversationEnded,
  ConversationSaid,
  ConversationStarted,
  CutsceneEnded,
  CutsceneStarted,
  NextCommand,
  SKIP_AFTER,
  SkipCommand,
  Story,
  type StoryState,
  TALK_REACH,
} from './story-state.ts'
import { choosePlace, nextPlace, openAt, type TalkPlace } from './talk.ts'
import { type ActorPlace, actorsAt } from './timeline.ts'

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

/** Puts each actor where `places` says: the thing whose id it is, one that is not in the game is passed over. */
function placeActors(ctx: SimContext, places: readonly ActorPlace[]): void {
  if (places.length === 0) return
  const things = new Map<string, EntityRef>()
  for (const e of ctx.query(Thing)) things.set(e.get(Thing).id, e)
  for (const place of places) {
    const e = things.get(place.who)
    if (e === undefined) continue
    const at = e.get(Transform)
    const moved = at.x !== Math.fround(place.x) || at.y !== Math.fround(place.y)
    if (moved) e.set(Transform, { x: place.x, y: place.y })
    // Nothing is left moving, so physics leaves the body where the key says.
    if (e.has(Body)) {
      const body = e.get(Body)
      if (body.vx !== 0 || body.vy !== 0 || body.angvel !== 0) e.set(Body, { vx: 0, vy: 0, angvel: 0 })
    }
  }
}

/**
 * Ends the cutscene that is playing, in time or skipped: every actor is put where its last key says, so what the story
 * changed is the same whether or not the player watched. It is `seen` now, and the page is told.
 */
function endScene(ctx: SimContext, story: StoryState, skipped: boolean): void {
  const scene = story.scene
  if (scene === null) return
  story.scene = null
  const file = (ctx.content as GameContent).cutscenes?.[scene.cutscene]
  if (file !== undefined) placeActors(ctx, actorsAt(file, file.length))
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
  // Whatever is on is cut short: a conversation ends unfinished, a cutscene ends as if skipped.
  endTalk(ctx, story, false)
  endScene(ctx, story, true)
  story.scene = { cutscene: id, since: ctx.tick }
  ctx.emit(CutsceneStarted, { cutscene: id })
  return true
}

/** The id of the thing with this sid, or '' when it has none or is gone. */
function thingId(ctx: SimContext, sid: number): string {
  const e = sid === 0 ? undefined : ctx.entity(sid)
  return e?.has(Thing) ? e.get(Thing).id : ''
}

/** Tells the page the line the conversation is on. */
function say(ctx: SimContext, file: ConversationFile, talk: { conversation: string } & TalkPlace): void {
  const node = file.nodes.find((n) => n.id === talk.node)
  const line = node?.lines[talk.line]
  if (node === undefined || line === undefined) return
  ctx.emit(ConversationSaid, {
    conversation: talk.conversation,
    node: node.id,
    line,
    speaker: node.speaker ?? '',
  })
}

/**
 * Ends the conversation that is open. `finished` is false when it was cut short, and then nothing is kept; otherwise the
 * node it ended on is kept, as the place the player got to.
 */
function endTalk(ctx: SimContext, story: StoryState, finished: boolean): void {
  const talk = story.talk
  if (talk === null) return
  story.talk = null
  if (finished) story.ended = { ...story.ended, [talk.conversation]: talk.node }
  ctx.emit(ConversationEnded, {
    conversation: talk.conversation,
    node: talk.node,
    player: talk.player,
    finished,
  })
  // The last node may send the players straight into a cutscene, in the same tick, so there is no gap to run in.
  if (!finished) return
  const content = ctx.content as GameContent
  const next = content.conversations?.[talk.conversation]?.nodes.find((n) => n.id === talk.node)?.cutscene
  if (next !== undefined) startCutscene(ctx, next)
}

/**
 * Opens the conversation `id` for `player` with the thing `thing` (a sid; leave it out for none), for a game's own
 * system. False, and nothing happens, when the game has no such conversation, the player has no hero, the thing is not
 * in the game, or a conversation or cutscene is on.
 */
export function startConversation(ctx: SimContext, id: string, player: number, thing = 0): boolean {
  const file = (ctx.content as GameContent).conversations?.[id]
  if (file === undefined) return false
  const story = ctx.resource(Story)
  if (story.talk !== null || story.scene !== null) return false
  if (!ctx.query(Player).some((e) => e.get(Player).number === player)) return false
  if (thing !== 0 && ctx.entity(thing) === undefined) return false
  story.talk = { conversation: id, player, thing, ...openAt(file) }
  ctx.emit(ConversationStarted, { conversation: id, player, thing: thingId(ctx, thing) })
  say(ctx, file, story.talk)
  return true
}

/** Moves the conversation to `place` and says the line it is on. */
function goTo(ctx: SimContext, file: ConversationFile, story: StoryState, place: TalkPlace): void {
  if (story.talk === null) return
  story.talk = { ...story.talk, ...place }
  say(ctx, file, story.talk)
}

/** The talker's Next and choose commands of this tick, in the order they were sent, each moving the conversation once. */
function talkCommands(ctx: SimContext, file: ConversationFile, story: StoryState): void {
  const nexts = ctx.commands.of(NextCommand).map(({ source, seq }) => ({ source, seq, choice: undefined }))
  const picks = ctx.commands
    .of(ChooseCommand)
    .map(({ source, seq, payload }) => ({ source, seq, choice: payload.choice }))
  const asked = [...nexts, ...picks].sort((a, b) => a.seq - b.seq)
  for (const { source, choice } of asked) {
    const talk = story.talk
    if (talk === null) return
    if (source !== talk.player) continue
    if (choice === undefined) {
      const next = nextPlace(file, talk)
      if (next === 'end') endTalk(ctx, story, true)
      else if (next !== 'pick') goTo(ctx, file, story, next)
    } else {
      const next = choosePlace(file, talk, choice)
      const chosen = file.nodes.find((n) => n.id === talk.node)?.choices?.[choice]
      if (next === undefined || chosen === undefined) continue
      ctx.emit(ConversationChosen, {
        conversation: talk.conversation,
        node: talk.node,
        choice,
        line: chosen.line,
        player: talk.player,
      })
      goTo(ctx, file, story, next)
    }
  }
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
    // 3. A skip from a player with a hero ends the cutscene, once it has played long enough to be meant.
    if (story.scene !== null && ctx.tick - story.scene.since >= SKIP_AFTER) {
      const heroes = new Set(ctx.query(Player).map((e) => e.get(Player).number))
      if (ctx.commands.of(SkipCommand).some((c) => heroes.has(c.source))) endScene(ctx, story, true)
    }
    // 4. A conversation whose talker or thing has gone ends, unfinished.
    const talk = story.talk
    if (talk !== null) {
      const talkerHere = ctx.query(Player).some((e) => e.get(Player).number === talk.player)
      const thingHere = talk.thing === 0 || ctx.entity(talk.thing) !== undefined
      if (!talkerHere || !thingHere) endTalk(ctx, story, false)
    }
    // 5. The talker's commands.
    const talkFile = story.talk === null ? undefined : content.conversations?.[story.talk.conversation]
    if (talkFile !== undefined) talkCommands(ctx, talkFile, story)
    // 6. Hands.
    holdHands(ctx, story)
  },
})

const stageSystem: SystemDef = defineSystem({
  name: 'level.story.stage',
  phase: 'prePhysics',
  // Said, not left to the names' order: physics must see where the actors were put.
  before: ['physics.sync-in'],
  run(ctx) {
    const scene = ctx.resource(Story).scene
    const file = scene === null ? undefined : (ctx.content as GameContent).cutscenes?.[scene.cutscene]
    if (scene !== null && file !== undefined) placeActors(ctx, actorsAt(file, ctx.tick - scene.since))
  },
})

/**
 * Who is within reach of whom, as `'<thing sid>:<player>'`: every thing that is not a player whose character has a
 * conversation the game has, with every hero whose middle is `TALK_REACH` or less from its middle.
 */
function pairsInReach(ctx: SimContext, content: GameContent): string[] {
  const heroes = ctx
    .query(Player, Transform)
    .map((e) => ({ number: e.get(Player).number, at: e.get(Transform) }))
    .sort((a, b) => a.number - b.number)
  const pairs: string[] = []
  for (const thing of ctx.query(Thing, Transform)) {
    if (thing.has(Player)) continue
    const conversation = content.characters[thing.get(Thing).character]?.conversation
    if (conversation === undefined || content.conversations?.[conversation] === undefined) continue
    const there = thing.get(Transform)
    for (const hero of heroes) {
      const near = hypot(hero.at.x - there.x, hero.at.y - there.y) <= TALK_REACH
      if (near) pairs.push(`${thing.sid}:${hero.number}`)
    }
  }
  return pairs.sort()
}

const meetSystem: SystemDef = defineSystem({
  name: 'level.story.meet',
  phase: 'gameplay',
  run(ctx) {
    const story = ctx.resource(Story)
    const reach = pairsInReach(ctx, ctx.content as GameContent)
    // A pair that comes within reach while a conversation or a cutscene is on is kept out, so it counts as new on the
    // first tick nothing is on.
    const busy = story.talk !== null || story.scene !== null
    // Opening a conversation when a pair meets waits on the Owner's answer to plan T's question (when it opens: on
    // every walk-up, until it has been finished once, or only with a Talk button), so nothing opens here yet.
    const met = busy ? reach.filter((pair) => story.met.includes(pair)) : reach
    if (met.length !== story.met.length || met.some((pair, i) => pair !== story.met[i])) story.met = met
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
  systems: [holdSystem, stageSystem, meetSystem],
})
