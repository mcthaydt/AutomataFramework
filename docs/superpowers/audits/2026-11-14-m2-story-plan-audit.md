# M2 plan T (story): plan audit

Stage 3 of the workflow, for [`plans/2026-11-14-m2-story.md`](../plans/2026-11-14-m2-story.md) as merged in `b352052`
(PR 58), against the [M2 spec](../specs/2026-11-14-m2-design.md)'s "Story (plan T)", its content table, the showcase
table's Story and Behaviour rules rows and its journeys, the code on `main` at `b352052`, and the other M2 plans as
they stand there: C (content, built and fixed), I (input, built and fixed), V (saves and the host, built and fixed),
P (joints and touch, planned and audited, not built), N (networking, built; it merged as pull request 44 while this
audit was written, and was read again on `main` after it), A (art, planned and
audited, PR 56, not built) and S (audio, planned, PR 57). Written 2026-11-14.

**Verdict:** sound, and ready for stage 4 once the Owner answers one question (Q1), which holds only Task 6's
opening rule. The central call holds against the code: the part that decides lives in `level`, which every caller of
`createGameSim` gets (a page, a replay check, plan N's room server), and it joins a sim only when the content asks
for it, so no recorded hash moves. No critical fault was found. Five important ones were, the worst a jump fired by
the very press that closes the speech box; all five are fixed in the plan. Eleven minor ones are fixed or handed to the
plan they belong to, and the journeys gain five tests.

How it was checked: the plan was read whole, and the spec's parts named above. On `main`, these were read for every
call the plan makes: `src/features/content/` (`conversation.ts`, `cutscene.ts`, `behaviour.ts`, `character.ts`,
`messages.ts`), `src/features/level/` (all nine files), `src/features/commands/players.ts`, `replay.ts`,
`recorder.ts` and `play.ts`, `src/features/sim/` (`create-sim.ts`'s resources, snapshot and command rejection,
`schedule.ts`'s ordering, `entity-store.ts`'s first sid, `dmath.ts`'s `hypot`), `src/features/physics/` (the
components' units, `systems.ts`'s phases, `rapier.ts`'s `updateBody`), `src/features/input/` (`keyboard.ts`,
`menu.ts`, `input.ts`'s `inset`, `seats`, `onMenu`), `src/features/game/game.ts` and `watch.ts`,
`tests/architecture/rules.ts`, the four goldens, the M1 and full fixture games, `tests/fixtures/game/controls.ts`
and `tests/install/smoke.mjs`. Plan A's contract (`usesSprites`, `setClip`, `setFacing`, `Renderer.look`) and plan
N's use of `createGameSim`. In AutomataFrameworkExamples: `automata.toml` and its test game. Nothing was run.

## The coordinator's questions

- **Is the sim's part in `level`, beside `join`, sound and deterministic?** Yes. `createGameSim` is the one place a
  page, `verifyReplay`, `watchReplay` and plan N's room (`createGameSim({ ...game, level, seed, players })`) all
  make a sim, so putting `behaviourPlugin` and `storyPlugin` there, switched on by content as `joinPlugin` is by
  `players`, is what keeps a room server and a page on the same sim; a pure `story` feature whose plugins each caller
  must pass would not. `story` as a page feature above `host` fits `rules.ts` (it needs the input's menu presses and
  the renderer). The arithmetic is deterministic: distances through `dmath`'s `hypot`, easing with `+ - * /` only,
  `Mind`'s fields f32 or u32 or strings, the `Story` resource plain JSON (Zod's `nullable` and `record`, which
  `canonicalJson` sorts and the snapshot round-trips), and every walk in sid, player or `source` then `seq` order.
  Commands from an unknown type are `rejected` (`create-sim.ts`), as Task 5's test expects. Two holes were found and
  fixed: the start progress was outside the replay (I2), and the stage system's place before physics' sync-in rested
  on the names' order (M2).
- **Does any golden move?** No. The four goldens (`push-crate`, `co-op`, `physics-scene`, `bounce`) are made from
  games that list no behaviour, conversation or cutscene, so neither plugin joins their sims and the schema hash is
  unchanged; no existing plugin gains a config key; every new content field is optional with no default, so the M1
  game's content hash is unchanged. The full fixture game is changed by Task 1, but nothing records a hash of it
  (`full-game.parity.test.ts` compares bytes; `smoke.mjs` only loads it). Examples' game lists none of the three
  kinds, so moving its pin to plan T's merge moves neither of its goldens. `tests/golden/story.json` is new. One
  trap for later is fixed (M5).
- **Is it right that Task 11 waits for plan A's build?** Yes. Task 11 is the only user of `Renderer.look`, `setClip`,
  `setFacing` and `ActorKey.clip`, all plan A's, and plan A waits on the Owner's format answer. Building a camera here
  would build ahead of its owner and collide with plan A's camera limit and resync rules (its audit, I1 and I2).
  Everything else stands without it: actors move by `Transform`, lines and Skip show, and the journeys run. Two
  things the later pull request must also do are now written into Task 11 (M5, M6).
- **A conversation opens when a hero walks up, with no button. Does that hold?** The spec does not settle it: it says
  only that conversations run in the sim and a choice is a command. Walking up is the right call for a first-time
  player, who cannot miss the keeper. But as written it opens again every time the hero walks away and back, and the
  demo's keeper gives "a hint about the seesaw", where a player goes back and forth. Being stopped mid-run each time
  fails the drunk-grandma test the other way. It changes what the player meets, so it is the Owner's: **Q1** below,
  sent to the coordinator. The plan marks call 3 as open and Task 6's opening rule as waiting; nothing was defaulted.
- **Are the e2e tests enough?** Nearly. Task 12 drives the whole game in three browsers at five sizes by keyboard,
  on a phone by thumb, by gamepad, with two players and watched, and an agent's journey edits two files. Missing were
  touch at the sideways phone and tablet sizes, rotation mid-conversation, the closing press, a fast Enter into a
  cutscene and the shared keyboard. All five are added (E1 to E5).

## The Owner question

**Q1. When does the keeper talk?**

- (a) Every time a hero walks up (the plan as written). Never missed; it stops the player every time they pass.
- (b) **Recommended.** When a hero walks up, until the conversation has been finished once; after that the keeper
  stays quiet. A first-time player cannot miss it, and it never stops them twice. A game that wants it again calls
  `startConversation`. The change is one line in Task 6 (a conversation in `ended` is not opened by walking up) and
  one test.
- (c) Never by itself: a "Talk" button shows while a hero is near (a fourth touch button, a key, a pad button). The
  player decides, but it is one more thing to learn and can be missed, and the touch layout gains a button.

## Important

**I1. The press that closes the box makes the hero jump.** `commands.controls` works out `pressed` against `held`,
and while a player is held the plan blanks `held` to `''`. On the tick a conversation or cutscene ends, a `controls`
command that arrived that tick is therefore all "pressed". The plan's let-go rule set `held` back to the stale
`hands` entry (which was refreshed only for a player still held) and left `pressed` as it was. The fixture's controls
bind Space and a pad's south to jump, and Space on the focused Next button and south as the pad's `accept` are
exactly how a player says Next: so the last Next of the keeper's conversation would jump, and `held` would lose the
jump key that is down. Review Focus 3 says this must never happen, and Task 5's tests did not reach it. *Fixed:* a
player let go takes `held` from this tick's `controls` command when one arrived, else from `hands`, and `pressed` is
set to `''`. Task 5 gains "the press on the tick it ends is held, not pressed", and Task 12 checks both presses (E3).

**I2. Where a game started is not in its replay.** A replay holds the seed, the content hash and the commands
(`replay.ts`); the new `story` option is a start condition like `level` and `players`, and the `Story` resource it
fills is hashed from tick 0. A continued game's replay, checked on a fresh sim, would play the opening it skipped and
fail as a divergence, not as "the content changed". Worse, `WatchOptions` extends `GameSimOptions`, so it would
accept `story`, but `watchReplay` forwards a fixed list of options to `createGameSim` and would drop it silently.
*Fixed:* `startGame` records `meta.story` (canonical JSON) when it is given; `storyOfReplay(replay)` reads it back;
`watchReplay` passes `story` from its options or the replay; plan N's handoff says a room started from a saved story
does the same. Task 10 gains a test.

**I3. Tapping through the keeper's lines skips the cutscene after them.** The tip node's last Next starts `glade-tip`
in the same tick, and in a cutscene Enter skips, so a second Enter, a held Enter's repeat, or a second tap where Next
just was skips a cutscene nobody saw. The plan kept Space from skipping for the same reason, but Enter is the key that
advances the lines. *Fixed:* `SKIP_AFTER = 30`: the sim ignores a skip before a cutscene has played half a second
(so a replay, a pad and a tap agree), the box shows no Skip until then, and a key's repeats are never presses. Tests
in Tasks 7, 9 and 12 (E4).

**I4. Four choices cannot fit a sideways phone as specified.** The box was at most 40% of the mount's height, its
buttons never scroll away, and each is at least 48 px. At 844 by 390, 40% is 156 px; four choices one to a row with a
speaker and a line need about 290 px, and the room above the 96 px of touch buttons is 282. Task 9's own size test
could not pass. *Fixed:* the 40% cap is the text's; the buttons always fit whole, two to a row where the room above
the touch buttons is under 480 px, and the box may use all of that room. A test at 844 by 390 with four choices.

**I5. The box's keys fight the game's.** Two ways. First, the input's keyboard calls `preventDefault` on every bound
key at the window (`keyboard.ts`), and Space is jump, so a button's native Space activation cannot be relied on
across engines. Second, on a shared keyboard player 2's half is the arrows (`controls.ts`'s `shared`), and the box
used Up and Down to move among choices: player 2 jumping would move player 1's pick. *Fixed:* the box hears its keys
in its own `keydown` listener; where seats share the keyboard it leaves alone any key another playing seat has
bound, and the talker picks with the digits, Tab and Enter. Task 12 gains the shared-keyboard journey (E5).

## Minor

- **M1.** `talk.thing` had no value for a conversation started by game code with no thing, and step 4 ("a
  conversation whose thing is gone ends") would end it at once. *Fixed:* 0 is none (sids start at 1), and step 4
  checks a thing only when it is not 0.
- **M2.** `level.story.stage` and `physics.sync-in` are both `prePhysics`; the stage ran first only because "level"
  sorts before "physics". *Fixed:* `before: ['physics.sync-in']`, said.
- **M3.** A hero who comes within reach while a cutscene plays was added to `met` and so never spoken to after it.
  *Fixed:* pairs are kept out of `met` while something is on, so the keeper talks on the first free tick.
- **M4.** `level.behaviour` reads `Story` without `behaviourPlugin` depending on `storyPlugin`. Right as written: a
  resource is found by its definition, and the plan reads it only when `usesStory`. Noted, not changed.
- **M5.** Task 11's camera test gives a level a `view`, and plan A's `usesSprites` is true for "a level with a view":
  done on the story fixture, `spritesPlugin` would join and `story.json` would move, which Task 11's own step 4 stops
  on. *Fixed:* the test's view is content made in memory.
- **M6.** When Task 11 lands as its own pull request, the README's "Story" section (written in Task 13) does not yet
  say the camera moves, and Task 12's pictures were taken without it. *Fixed:* Task 11 lists the README and its test,
  and takes the pictures again.
- **M7.** `wordsOf` is in `story`, but `locale` sits below `story` and plan L is not written yet. *Handed to plan L:*
  if it makes its own words function, `wordsOf` moves down to it and `story` re-exports it, rather than two.
- **M8.** The default box background is 88% opaque over another team's art, so its contrast against itself alone
  says little. *Fixed:* the test lays it over white and over black.
- **M9.** The touch buttons still show while the hero is held and do nothing. *Handed to plan U:* dim them then.
- **M11.** Plan N merged while this audit was written (pull request 44), so `startOnlineGame` is on `main` in
  `src/features/game/online.ts` and the plan's handoff ("`startOnlineGame` wires the view as `startGame` does") had
  no one left to do it. Its room records `level`, `players` and `seats` in `meta`, the same way I2 records `story`.
  *Fixed:* Task 10 wires the view into `online.ts`; a `story` room option waits for the first game that goes online.
- **M10.** A game that opens each level in a new sim loses the keeper's `ended` and the seen cutscenes between
  levels unless it hands them on. *Handed to plan D:* its step passes `storyProgress` from one level's sim to the
  next.

## The journeys, added

- **E1.** By touch at 844 by 390, 820 by 1180 and 1180 by 820, not only upright on a phone.
- **E2.** Turned from upright to sideways while the choices show: the same choice keeps the focus.
- **E3.** The last Next by Space and by a pad's south: no jump in the 30 ticks after (I1).
- **E4.** Enter tapped fast through the tip does not skip the cutscene after it (I3).
- **E5.** On a shared keyboard, player 2's arrows walk player 2 while player 1 picks with the digits (I5).

## Checked and found right

- **Holding hands.** `commands.controls` runs first in `input` and clears last tick's `pressed`; a key held through
  a hold and still down after comes back as held with no press, and one let go during it stays let go, as Tasks 5's
  tests say (with I1's fix for the closing tick).
- **Moving a fixed keeper.** `updateBody` compares the entity's `Transform` with Rapier's and calls `setTranslation`
  for any body that is not kinematic, so a cutscene can move a fixed body; the plan's first test proves it and stops
  if not.
- **Behaviour.** `blocked` and `on-ground` read `Body` after physics wrote it (gameplay runs after `postPhysics`);
  with gravity 30 at 60 Hz a jump's `vy` changes by 0.5 a tick, so "under 0.01 for two ticks" is never true at the
  top of a jump. The critter fixture's `run-away` and `wander` rules, and the hero's `kind: "hero"`, are what the
  tests expect. Speeds are tiles a second, which is `Body.vx`'s unit (a tile is a metre).
- **Conversations.** The fixture conversation's nodes, choices and keys match Task 4's and Task 6's expectations;
  plan C's checks (no node with both choices and `next`, no loop without a choice) keep `nextPlace` finite.
- **Cutscenes.** The camera's worked examples in Task 4 follow from the rules (smooth at half is half; at a quarter,
  4 + 4 × 0.15625 = 4.625). A cutscene's `who` is a level thing or `player-N`, which `Thing.id` already is.
- **Commands.** The view takes its `seq` from the shared `sequence`, so no `story.*` command collides with a
  `controls` command's number (`duplicate-seq`).
- **Layers and the headless entry.** `story` between `host` and `web`, a page feature; `level` stays pure.
- **Old code.** The old `narrative`, `cutscenes` and `interact` rules the plan keeps (advance only on a command, a
  cutscene is sim ticks, a start replaces one playing, reach by distance) are the ones it names.

## For other plans, not fixed here

- **Plan N:** a room started from a saved story passes the same `story` and records `meta.story` (I2). Written into
  the handoff.
- **Plan L:** where `wordsOf` lives (M7). Written into the handoff.
- **Plan U:** dim the touch buttons while held (M9). Written into the handoff.
- **Plan D:** story progress across levels (M10). Written into its step.
- **Plan K:** a content sentence for a hero character that names a `conversation` (today it is ignored, as Task 6
  tests), once plan A's `Listed.hero` lets a check know which character is the hero.
