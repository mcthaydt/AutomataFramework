# Plan F plan audit: the feel runtime

Stage 3 of Cycle 8. The plan audited is
[`plans/2026-11-15-feel-runtime.md`](../plans/2026-11-15-feel-runtime.md) (PR 111), against its spec
[`specs/2026-11-15-feel-runtime-design.md`](../specs/2026-11-15-feel-runtime-design.md) (PR 105, carried by PR 111),
the M2 spec, plan H (PR 93 and 96; the build on PR 101, branch `claude/project-thread-wgynlp`, read at `fb4ad08`),
plan U (merged in PR 103; its audit's fixes on PR 108), the Feel editor's spec (Editors PR 30, item F4) and
`progress.md`. The code read is `main` at `29dd191` plus plan H's branch, because plan F is built on plan H.

The audit prompt, as given: "Audit all of your work for completeness, consistency, cohesion, and harmony, both within
itself and relative to the spec and relative to the codebase. Assume nothing. Verify everything. Investigate any
incomplete implementations or incomplete integrations. Do your best work."

Nothing was run. Every fact below comes from reading the files at the commits named.

## Verdict

**Sound once one critical gap is closed.** One critical, five important, eight minor. Every important and minor point
is fixed in the plan (and four places in the spec) in this pull request. The critical one is fixed in the plan too, but
the cheapest place for its code is plan H's build, which is running now, so it is handed to the coordinator. No Owner
question is open: the fix carries out the Owner's own answer ("effects are presentation only").

## The Owner's decisions, checked

| Decision (2026-11-15) | Where the plan meets it | Verdict |
|---|---|---|
| Freeze is a real pause played alone, a held picture online | Builder's call 6, Tasks 4, 7, 8 (`freezes: 'game'`), 9 (`watchReplay` holds, `startOnlineGame` picture only), 10 (`showFeel` picture only) | Met |
| "Screen shake" switch, on by default, off first under reduced motion, a saved choice wins | Tasks 1 (`feelSettingsFirst`, `feelSettingsOf`), 5 (`Host.reducedMotion`), 8 (`feelSettings`, `setShake`), 11 (the word) | Met as data; **on screen was nobody's task** (I4, fixed) |
| Effects are presentation only, so no golden moves | Global constraints; nothing under `feel` steps the sim | **Not met at the content level** (C1, fixed in the plan, handed to plan H) |

## The two flagged deviations

**D1. Dust starts at the thing's feet as of the newest step (the last picture only for a thing just taken away).
Accepted.** The event is raised inside the step, `renderer.apply` has already taken that step's delta, and the frame
drawn next is posed between the step before and the newest one. On a landing the newest step has the hero on the
ground and the one before has it up to a step's fall above, so "the last picture drawn" would start the dust in the
air, which fails the spec's own test ("dust is drawn at its feet"). The spec's reason for "the last picture" (a spark
taken in that very step still has a place) is kept by the fallback. The spec's sentence is the builder's call (*My
call*), not the Owner's, so the spec is brought in line in this pull request. One consequence is now written down: a
landing heard during an online picture hold starts its dust where the hero is now, not where the held picture shows
it; the hold is at most half a second and the picture then catches up, so this stands.

**D2. `hold(seconds)` beside `frame(seconds, place)`. Accepted.** The loop takes its steps before it draws, and
`frame` is a drawing call. A hold of the whole game must be known before the steps are counted, or the held time is
owed and the game fast-forwards afterwards, which the spec forbids. `frame` alone cannot answer that in time. Keeping
the count in the feel runtime (not the loop) is also what makes "pausing keeps the rest" fall out: a stopped loop calls
nothing. The spec's list of methods is brought in line.

## Critical

**C1. A feel file is part of the sim's content, so changing one moves every hash.** `simContent`
(`src/features/level/sim-content.ts`) leaves out `messages`, `sound`, `music`, `cues`, `figure` and `backdrop`, and
nothing else. Feel files stay in: they are canonicalised into the sim's content, `contentHash` is in the snapshot's
header, and `sim.hash()` is the hash of the snapshot. Nothing in the sim reads `content.feels` (only `game/buzz.ts`
does, outside it). So, with the plan as written:

- adding the demo's three feel files (plan D, Part 6) moves the demo's hashes, and every slide in the Feel editor
  moves them again, each time "the content changed" in the demo's replay check;
- a replay made before a feel was tuned no longer verifies after;
- two pages whose feel files differ cannot share a room;
- Task 8's proof ("the same play with the three feel files taken out records the same commands") compares commands,
  so it passes while the hashes differ.

That is the opposite of the spec ("no recorded hash moves", "feel is presentation"), of `sim-content.ts`'s own rule
("None of them says what happens, so ... must not move a hash"), and of the Owner's "effects are presentation only".

*Fix (in the plan):* `'feel'` joins `LEFT_OUT`, with its map, as the file's comment asks of any plan that takes a kind
out. Its test mirrors the sound one in `tests/features/level/sim-content.parity.test.ts`: the full game with its three
feel files and without them has the same `contentHash`; a level change still moves it. Task 8's proof also compares
the final hash. On `main` no recorded golden's game lists a feel file (the full game's parity test records none, the
M1 fixture and the template have none), so this moves nothing there.

*Timing:* plan H's Task 14 adds the template's `land.json` and records `template/replays/level-1.json` once. If
`'feel'` is left out before that recording, nothing ever moves for it. If plan F adds it after, that golden moves a
second time, and a golden moves only with the Owner seeing. So the plan now asks for it in "Before starting" and the
coordinator is asked to hand it to plan H's build (one line and one test, before Task 14). If plan H has already
recorded, plan F's Task 1 does it and stops for the Owner's look at the moved hash.

## Important

**I1. Online, a sync must be heard before the steps that follow it.** `startOnlineGame`'s step today calls
`buzzer.hear` for each step, then checks for a sync and calls `audio.begin()`, then `audio.hear`. The buzzer has no
tick memory, so its order never mattered. The feel runtime ignores a tick at or below the last one heard (as audio
does), and the plan puts `wiring.begin()` "where `audio.begin()` is called". Done in that place, a sync's own steps,
which can carry ticks at or below the last one heard, reach `wiring.hear` before `begin`, and their landings are
dropped. The planned test ("after a sync the next landing still makes dust") lands later and would pass anyway.
*Fixed:* Task 9 says to check for a sync first, before the `audio === undefined` early return, call `wiring.begin()`
(and `audio?.begin()`), then hear the steps; a test lands in the very advance that syncs.

**I2. A key pressed and let go inside a hold is never seen.** The plan expects this might fail and says to stop.
It will: `input/keyboard.ts` keeps only what is down now, and `heldBy` reads it once per poll, so a press wholly
inside a hold (up to 30 ticks) leaves no trace. Gamepads are read the same way. Touch already keeps a tap until the
next poll (`thumbs.ts`, `tapped`). Latching key presses is a change to `input` and to what every game records, so it
is not plan F's. *Fixed:* the test is "a key pressed during the hold and still down when it ends jumps on the first
step after it", with a second test that a tap on the thumbs during the hold still jumps; the spec's sentence says
what is kept, and the short tap of a key wholly inside a freeze is named as a limit under "Later, when a game needs
it". A freeze in the template is 4 to 6 ticks, shorter than a key tap.

**I3. "No single hold runs past 30 ticks" is measured from the wrong moment.** The plan sets a hold to the later of
what is left and the new freeze, capped at 30 ticks *from now*. Offline a game hold cannot be extended (no steps run
while held, so no event fires), but a picture hold can: online the steps go on, and each new spark resets it, so a
stream of sparks holds the picture without end; repeated "Show me" presses do the same. The spec's words are "no single
hold runs past 30 ticks ... so a chain of sparks can never stall the game". *Fixed:* a hold ends no later than 30
ticks after the moment it began; a freeze heard after that waits for the hold to end and starts a new one. Task 4's
test pins it (a picture hold extended every 20 ticks is over by tick 30 and a fresh picture is drawn).

**I4. The switch on screen had no task.** Plan U's plan (merged) and its audit fixes (PR 108) list sections
`controls`, `sound` and `touch` and the words `automata.settings.vibration`; neither names the `feel` section or
"Screen shake". Plan F hands the switch to plan U, and says that if plan U lands first, plan F's executor adds it, but
no task, file list, tracker share or test row says so. Plan U's build is running now (PR 110, part A). The Owner's
answer 2 needs the switch on the settings screen. *Fixed:* a new Task 13 (conditional, 0% if plan U's settings screen
is not on `main`, when it stays a handoff) owns the section, the toggle and its test; it takes 5% from the last green
run's share, so the plan still adds to 100%. The coordinator is asked to tell plan U's execution thread, so whichever lands second
does it once.

**I5. While the picture is held, `heroes()` answers the newest step.** `Renderer.heroes()` is "as of the last picture
drawn" (its own doc), and plan U puts a number over each hero from it. Under a held picture (online, or `showFeel`)
the plan keeps the stage's views but `heroes()` still reads `scene.views(drawnAt)`, so the boxes would sit where the
heroes are now, off the held picture. *Fixed:* Task 6 says `heroes()` answers from the views the held picture shows,
and adds that test.

## Minor (all fixed in the plan)

- **M1.** Task 5 names `tests/features/host/test.test.ts`; the file is `tests/features/host/test-host.test.ts`.
- **M2.** Task 11 lists `automata.translations.toml` to change. An unread word is one with no mark (format 2, `[read.<language>]` tables only), and the file today has none, so nothing is written there. Writing a mark would claim a read that never happened.
- **M3.** Task 12's new page (`tests/fixtures/feel/page/main.ts`) must be a `knip.json` entry, as `tests/fixtures/online/page/main.ts` is, or knip calls it unused.
- **M4.** `tests/public-surface.test.ts` lists what the headless entry must export; the new names (`createFeel`, `FeelSettingsSchema`, `feelSettingsFirst`, `feelSettingsOf`, `MAX_FREEZE_TICKS`) join it in Task 1 and 4, and `src/headless.ts`'s first comment names the feature.
- **M5.** Float slack. "Ticks still held, rounded up" and "a hold is over" are computed from sums of frame times in seconds; `(4/60 - 1/60) * 60` need not be exactly 3, and `Math.ceil` of a hair over 3 is 4. The loop already has `SLACK_MS` for this. The runtime now treats what is left under a millionth of a second as nothing and rounds up with the same slack.
- **M6.** The feel math rule (no `Math` function an engine may round its own way) is enforced only by the new golden. `rules.ts` already has the painter's list (`PAINTER_MATH`); Task 1 holds `src/features/feel/` to it too, so the architecture test, not a parity run, says it first.
- **M7.** The template has no `content/feels/land.json` yet: it is plan H's Task 14, and plan H is at Task 7 of 15 in its tracker (its branch is further). The plan's "Before starting" stop already covers this; the build waits for PR 101.
- **M8.** Tracker numbering: plan G (PR 107) also calls itself Cycle 8. Whichever of PR 107 and PR 111 merges second renumbers its section to Cycle 9. Left to the merge, named here so it is not missed.

## Checked and sound

- **Layers.** `feel` after `server` and before `render` imports only `content`, `sim` and `level` (`colourNumber` is
  in `level/colours.ts`; `sin` and `cos` in `sim/dmath.ts`); `render` and `game` are above it. `PURE_FEATURES` gives it
  the no-clock rule. No name clashes with what the headless entry already exports.
- **The schema's limits** in `limits.ts` (count 64, speed 32, life 120, strength 1, shake 60 ticks, freeze 30) match
  `content/feel.ts`.
- **Event payloads.** `hero.*` carry `{ player, sid }` (`level/moves.ts`); `<kind>.taken` carries the taken thing's
  `sid` (`level/touch.ts`), so a spark's dust starts at the spark. `SimEvent.type` is the name `on` is matched to.
- **Determinism of `feel-frames.json`.** Only `+ - * /`, `Math.imul`, `floor`, `ceil`, `min`, `max`, `abs` and `dmath`;
  JSON's number text is the same in every engine; `expectGolden` takes `{ ticks, finalHash, checks }`.
- **The dust formulas.** Within 60 degrees of up gives `|vx| <= |vy| * tan 60` (the test's 1.7321 is above
  1.73205); half to all of `speed`; the quarter-tile sink at `u = 1`; size 1/8, never under two device pixels.
- **The loop.** Taking the held time out before it reaches the pool, and dropping a whole tick only when the cap
  stopped the steps, never owes time; `start()` resets the clock and the pool but not the hold, which lives in the
  feel runtime, so a pause keeps the rest. A freeze heard in a step stops that frame's later steps through `held()`.
- **Watch.** `sim.restore(start)` between rounds is where `begin()` goes; a watch makes no buzzer.
- **F4.** `showFeel(feel, at?)` on `startGame`'s `Game`, playing or paused, a `RangeError` in plain words for a draft
  `FeelSchema` refuses (`checkData` is in `content/parse.ts`, exported in Task 10 if needed), picture-only freeze:
  everything the Editors spec's F4 asks.
- **Settings.** `saves/settings.ts` keeps `initial` without writing it, so the device's wish holds until the player
  sets the switch, as the handoff says.
- **Line budgets.** `stage.ts` 354, `game.ts` 268, `online.ts` 348 on plan H's branch, as the plan says.

## Hand-offs from this audit

- **To the coordinator, for plan H's build (PR 101):** add `'feel'` (and `feels`) to `LEFT_OUT` in
  `level/sim-content.ts`, with the parity test, before Task 14 records `template/replays/level-1.json` (C1).
- **To the coordinator, for plan U's build (PR 110 onward):** the `feel` section and the "Screen shake" toggle
  (plan F's Handoffs and its new Task 13); whichever lands second builds it (I4).
- **To the merge session:** PR 111 first, then this one (it is built on PR 111's branch); the Cycle 8 clash with
  PR 107 (M8).
