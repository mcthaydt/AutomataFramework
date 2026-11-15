# Plan Q (the game checklist): plan audit

Stage 3 of the workflow, for [`plans/2026-11-15-game-checklist.md`](../plans/2026-11-15-game-checklist.md) as written
in `77b26982` (PR 139, stacked on the spec in PR 137), against
[`specs/2026-11-15-game-checklist-design.md`](../specs/2026-11-15-game-checklist-design.md) with the Owner's cuts
(2026-11-15), plan U's plan and its audit, plan K's Step U, and the code on `main`. Written 2026-11-15.

**Verdict:** sound, and ready for stage 4 once the fixes below are in. Every "Must have" box the spec keeps has a task
and a test; nothing cut by the Owner is left in a task; every pull request has real-browser tests; the one golden that
moves is held for the Owner. No critical fault was found. Seven important ones were, and eleven minor ones. The
findings are for the plan thread to fix in the plan; this audit changes nothing else.

How it was checked: the spec and the plan were read whole. On `main`: `level/game-sim.ts`, `level/uses.ts`,
`level/sim-content.ts`, `level/touch.ts`, `level/moves.ts`, `flow/steps.ts`, `flow/loading.ts` (`endsLevel`), the
line counts of `flow/*.ts` (`flow.ts` is 578, as the plan says), `cli/check-rules.ts`, `cli/report.ts`,
`cli/check.ts`, `cli/replay.ts` (`replaysStep`, `readyOf`), `cli/ports.ts` (`GameCode`, `CodeService`),
`cli/live.ts`, `sim/create-sim.ts` (the `Sim` interface), `sim/definitions.ts` (`PluginDef`), `web/speaker.ts`,
`locale/names.ts`, `locale/labels.ts`, `locale/library/en.json` (every reused key exists), `tests/fixtures/flow/game.ts`,
`tests/fixtures/game/hero.ts`, `tests/golden/` (no golden uses the flow's fixture game), the whole `template/`
(`automata.toml`, the level, the characters, `hero-moves.json`, `src/`, `package.template.json`, `vite.config.ts`,
`.github/workflows/check.yml`) and `tests/template/hero-play.ts`. Every file the plan names to modify exists. Nothing
was run (GitHub CI only).

## The coordinator's questions

**Does it cover every game-specific Must have box that remains?** Yes. *It works:* Play again always works and needs no
reload (Tasks 3, 6, 21), never stuck (Tasks 6, 19), switching apps (13, 21), reloading (21), no scrolling (10, 21),
fits the screen (13, 21), no sound before a tap and playable muted (13, 21), slow or failed loading says so (11, 21).
*There's a game here:* the goal line, the waiting start and How to play (7, 15), win or lose (1 to 3, 6, 15, the note
in 19), enough to do (8, the list in 20). *Its own thing:* the art is the maker's (the list, 20). *Finished:* test
words and half-made menus (19, 20), the rest by the list (20). *Honest:* nothing pops up (18). *Safe:* passwords and
details, other windows, background work (18). The one gap is wording, not coverage (M7).

**No Ruken-specific items?** None is left. Ads, money, tracking and the lockdown on outside sites (no content security
policy, no `[network] allow`, no address rule in the `page` part), the unchanged-starter gate and the device and
gamepad checks appear only in the Global Constraints' list of cuts and in the Handoffs, where the later export target
picks them up. Two things that look close are not cuts and rightly stay: plan U's standing rule that every screen
works by touch, pad and keys (and Step U's "a second player added with a gamepad", which is plan K's), and the Owner's
Q1 answer, a play test at a phone and a desktop size in Chromium and WebKit, which the spec keeps after the cut.

**Bite-sized, test first, end to end?** Yes in shape: every task pushes its tests red before its code, and every pull
request has browser tests (the fall's parity in four engines; each screen at five sizes; the template's page and the
create journey; `check --ship` through the packed package; the made game in three engines and its own play test in
two). Tasks 7 and 9 each carry two features and are the largest (M8).

**The split into pull requests?** Correct in its order: B before A, so the template's recording moves once, after
everything it names exists. Two improvements: Part C need not wait for the Owner's gate on Part A (M8), and pull
request 2, eight tasks, can be split in two (M8).

**The template golden held for the Owner?** Yes. Task 15 moves `template/replays/level-1.json` once, in a commit that
names it; Step 5 sends the before and after to the coordinator and pull request 3 does not merge until the Owner says
yes; Task 21 stops on any fix that would move it again. `tests/golden/fall.json` is new, not a move. Nothing else can
move: the fall plugin joins only a game that names `lost = "hero.fell"`, no golden uses the flow's fixture game, and
Task 20's `meta.save` is written only for a game that exports `gameSave`, which the template does not.

## The five departures from the spec

The plan's self-review lists five calls the spec was brought into line with; the plan's memory of them also counted a
sixth, now gone.

1. **The best score is a settings section, `records`** (call 8). Right: a best score is the player's on this device,
   not one of three saved games, and a game with its own save has nowhere else to keep it. "Delete all my saves" clears
   it (call 10), which is what a player means.
2. **Mute is a `muted` flag** (call 9). Right: the sliders keep their place, and old settings read as not muted.
3. **The goal line is the message `level.<id>.goal`** (call 5). Right: no level file changes shape and no hash moves
   for a word; it sits beside `level.<id>.name`, which the flow already reads. M11 adds the one thing it lacks.
4. **The problem screen keeps "Load the page again"** (call 13). Right: "Try again" means one thing.
5. **`hero.fell` is its own plugin, joined only when `lost = "hero.fell"`** (call 2). Right, and it is what keeps every
   other recording still. It contradicts itself on whether the hero needs `moves` (I1).

The sixth, no `<room>` in a page policy, is moot: the Owner cut the policy, and call 14 says so.

## Important

**I1. Does a falling hero need `moves`? The plan says both.** Task 2's fixture (`fall-game.ts`, the fixture game, whose
hero has no `moves`: `tests/fixtures/game/hero.ts` moves it by hand) and Task 6's flow fixture (the same hero, with
`lost` defaulting to `'hero.fell'`) need a fall plugin that finds heroes by `Player` alone. Task 19's fourth row says
the opposite (`lost = "hero.fell" needs a hero the framework moves`) and its third row's sentence says "A hero with
"moves" raises hero.fell". *Fix:* `fallPlugin` finds heroes as `Player` with `Body` (depends on `physics` and
`commands`, not on the moves plugin), so any hero can fall; `usesFalls` is `lost === "hero.fell"` alone; drop Task 19's
fourth row; the third row's sentence becomes `… Write lost = "hero.fell" and the framework raises it when a hero falls
out of the level, or name an event your own rules raise.`

**I2. `endProblems` has nowhere to get the event and resource ids from.** The `Sim` interface exposes neither, and the
framework's own plugins (touch, moves, join, the new fall) are built inside `createGameSim` and never listed anywhere a
caller can read. "Read from a sim made with its plugins, as the replays step makes one" cannot be written as stated.
*Fix:* Task 2 moves the list `createGameSim` builds into an exported `gameSimPlugins(options)` (headless entry;
`createGameSim` calls it, so nothing moves), and Task 19 reads event ids from each plugin's `events` and resource ids
from its `resources`, taking a field's value from a sim made by `createGameSim` and Task 8's `Sim.read`. It must use the
game's own copy of the framework (`game.code.framework`), as the replays step does. `rulesStep` gets `game.code` from
`GameFolder`, so the rows can stay in `rules`; say what it reports when the code did not load (nothing, as the plan has
it).

**I3. Back stops working after the first return to the menu.** Call 11 pushes the entry "the first time a level
starts", and `backMeans` consumes it on pause, Well done and Try again. Play a level, Back, Back (the menu), Play again:
no entry is pushed, so Back while playing leaves the page. *Fix:* keep whether an entry is held; push one whenever
`playing` is entered and none is held, and after each `again: true`. Add to `back.browser.test.ts`: "Play, Back, Back to
the menu, Play again, Back: paused, not gone".

**I4. The press that chose Play can start a waiting level.** Call 6 starts the sim on "a key, a gamepad button or a
touch". The Enter, the pad's bottom button or the tap that pressed Play is still down when the level begins, and a pad is
polled, so the level can start before the player has looked, which is what the waiting start is for. *Fix:* only a
press that begins after the level is shown counts: a `keydown` that is not a repeat, a pad button that was up and goes
down, a `pointerdown`. A direction pressed that way still walks from tick 0. Add to `start-card.browser.test.ts`: "the
Enter, the pad button and the tap that pressed Play do not start the level".

**I5. A framed game's Back is not the Site's to turn off.** The Handoffs ask the Site to pass `back: false`, but the
Site only frames the demo's built page and never calls `startFlow`. A `pushState` in a frame joins the top page's
history, so Back on the Site would pause the framed game first. *Fix:* `back` defaults to on only when the page is not
framed (`window.top === window.self`, which a frame of another origin may read); `back: true` or `false` overrides it.
Add the test, and rewrite the Site handoff as "nothing to do; the framework leaves Back alone in a frame".

**I6. The compressor makes every game's quiet sounds louder.** A Web Audio `DynamicsCompressorNode` adds its own make-up
gain, worked out from its curve. With threshold −12 dB, ratio 8 and knee 12 that is about +6 dB on everything below the
threshold, so every existing game's mix changes, not only its loud moments. *Fix:* set it as a limiter, with a high
threshold (around −3 dB), a hard knee and a high ratio (20), which leaves little make-up gain, or lower the master to
match, and add the test "one voice alone is within 1 dB of what it was before". Render the "no sample above 1" test
with an `OfflineAudioContext` in all three engines; that is what the parity of the compressor's look-ahead depends on.

**I7. The saves-version check cannot see `gameSave`.** Task 20 reads `gameSave` from a game's `src/headless.ts`, but the
game's code is loaded in `cli/live.ts` into `GameCode` (`cli/ports.ts`), which carries only `plugins` and `actions`.
Neither file is in Task 20's list, and "a hash of the schema" is not defined. *Fix:* add both files; `GameCode.rules`
gains `save?: SaveDef`; the hash is the framework's hash of the save schema's JSON Schema (`z.toJSONSchema`, `io:
'input'`, as `describeSchemas` makes it), so the same schema hashes the same in every engine and every run.

## Minor

**M1.** `levelGoal` belongs in `locale/labels.ts`, beside `levelName`, which reads `level.<id>.name`; Task 7 names
`locale/names.ts`, which holds only the language names.

**M2.** Task 3's table leaves rows unsaid: `level-lost` in any step but `playing`, and `again` in `menu`, `done` or
`playing`, should give the very same object; and `to()` ("what a visit carries … and nothing else") must carry
`attempt`. Add a test that walks every step with both new events.

**M3.** Task 18's patterns will catch innocent code: a bare `open(` (a game's own `open` function), a game's own
`confirm` or `prompt`, `db.open(` if the dot is missed. Match `window.`, `globalThis.` and `self.` forms, and a bare
call only when the file declares no such name; add tests with `const confirm = …` and `indexedDB.open(…)`.
`withoutComments` strips script comments, not `<!-- -->` in `index.html`: say so, or strip those too.

**M4.** Task 20's `screens` rule overlaps the `types` step, which already fails an import that does not resolve. Define
it on what `types` cannot see (a key of the `screens` option whose file is missing from `content` or `src` when the
import is dynamic), or drop it and leave half-made menus to the list, saying so in the spec's table.

**M5.** The template's crate stands between the hero and the gap, so every won play pushes it into a bottomless gap
where it falls for ever. Either put it where it cannot fall (past the gap) or say in the plan and in the level's comment
that this is meant; the recording's assertion "pushes the crate" holds either way.

**M6.** The template's play test plays in real time: "jump at the gap's edge" from a polled position can be several
ticks late. Jump a tile before the edge, and add to `hero.test.ts` "a jump started up to one tile before the edge clears
the gap", so the browser test has margin and does not flake.

**M7.** The self-review says "money, tracking and other sites are cut". The spec keeps "No other sites or windows unless
asked" (Done + Check, Task 18's `window.open` row); only the lockdown on outside sites is cut. Fix the sentence.

**M8.** Size and order. Task 7 is three features (the waiting start, the goal card, How to play) and Task 9 two; split
Task 7 into 7a and 7b. Pull request 2 is eight tasks; it can be 2a (Tasks 6 to 9) and 2b (10 to 13) with no other
change. Part C needs Part B only (its tests hold on either template), so pull request 4 may start once pull request 3
is green and waiting only for the Owner; whichever merges second merges `main` (both touch `template/AGENTS.md` and the
README). The branch count stays under five.

**M9.** The plan D handoff should say the demo's journeys must press once before the sim steps (the waiting start), or
pass the flow's option for a test page; otherwise the demo's pin move turns its journeys red.

**M10.** Task 18 bans service workers. That is the spec's box, but Release 4 (distribution) may want one for play
offline. Add a line to the Handoffs so that plan reopens it on purpose rather than tripping on it.

**M11.** The goal line is optional, so a game can quietly have none, which is the first Must have ("in five seconds,
it's clear what you do"). `--ship` should note a level in `levels` with no `level.<id>.goal` in the source language.
