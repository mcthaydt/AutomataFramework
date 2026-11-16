# Progress

The tracker every stage reads first and updates last. It keeps **only open work**, one short line per task
(the Owner, 2026-11-16); finished and parked work moves to [`history.md`](history.md), which threads read only
when asked. One section per cycle; newest first.

## Cycle 13: level links and the world map (values on things, doors and edges between levels, level pictures)

Spec: [`specs/2026-11-15-level-links-and-world-map-design.md`](specs/2026-11-15-level-links-and-world-map-design.md),
second version. From the LDtk report (picks 3, 4, 8 and 10). The Owner (2026-11-15): values and links on things, the
world map, doors between levels, level pictures and a public list of format changes; then levels that also join edge to
edge (for rooms put together from a seed later) and all story as facts and conditions
(`specs/2026-11-15-rooms-and-storylets-amendment.md`). The first version was closed pull request #149 (`c449fca`).

Overall: **72%** (stages 1 to 3 and the plan's fix round done; stage 4, the execution, is under way: pull requests 1 and 2 (tasks 1 to 7) are merged and pull request 3 (tasks 8 to 10, a place) is built and in CI, 42% of the stage; stages 5 to 7 follow)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Second version done (2026-11-15), 100%. The Owner's answers: edge joins come from where levels sit on the map (LDtk's way); a joined place plays as one seamless world, everything crossing, the whole place running at once (streaming later); what was done for good is remembered, as facts the story can read; the test game gets a third level joined by an edge; all twelve calls fine | the spec |
| 2. Plan (plan W) | Written (2026-11-15), 100%, and fixed after its audit (below); plan W at 0% built. Fifteen framework tasks in five pull requests (formats and checks; switches and gates; a place; doors and what is remembered; the commands and the docs), then three tasks in AutomataFrameworkExamples in two pull requests (the pin; three levels, a door and an edge). Three new goldens (`switch.json`, `place.json`, `level-picture.json`), none moved in this repo; in Examples `replays/level-1.json` moves once (the Owner sees it first) and `replays/level-2.json` is new. The World editor's five tasks are listed and gated behind the mockups. No new dependency | `plans/2026-11-15-level-links-and-world-map.md` |
| 3. Plan audit | Done (2026-11-15), 100%: 22 findings (2 high, 6 medium, 14 low) and 2 questions for the Owner (numbered badges in pictures; no "level done" screen at a door) | `audits/2026-11-15-plan-w-plan-audit.md` |
| 3b. Plan fix round | Done (2026-11-15), 100%: all 22 fixed in the plan in one round, low ones included, and the table "After the plan audit" says where each went. The two high ones: a hero comes in beside a door, clear of it, never inside (so a door that leads back does not bounce them); the sim believes a `facts` command only from source 0 on tick 0. The Owner answered both questions (22:59 UTC, "1. a 2. a"): pictures use numbered badges with a list, and a door opens the next level at once. The spec's three matching sentences changed with it. Plan Q's return note (#169) is met in three places: `startGame` steps tick 0 with the facts before the first picture, a door's state carries `door: true` and always starts a level (so it can raise `attempt`), and the template's door stays the `done` touch | `plans/2026-11-15-level-links-and-world-map.md`, `specs/2026-11-15-level-links-and-world-map-design.md` |
| 4. Execution (Sonnet, high) | Started (2026-11-15). Plan W pull request 3, a place (tasks 8 to 10), is in pull request 177: levels that join along their edges are built as one world (`spawnPlace`; a floor that runs through a seam is one body), a hero comes in beside a door and never inside it (`arrivalSpots`, with `meta.arrive` in a recording), each hero carries the level it is in and `level.entered` says once when it passes into another, and the page follows the lead hero's level (sky, backdrop, `Renderer.enter`; the game steps tick 0 with its facts before the first picture). New golden `place.json` (recorded from CI); no existing golden moves. Rulings: `heroLevels(sim, opened?)` takes the level the sim was opened at, since a sim of one level has no `where` to name it before its first tick, and it must not ask for `In`, which only a place registers. Plan W pull request 2, switches and gates (tasks 5 to 7), is merged as pull request 173: `Where` and `valuesOf` (a thing's values from game code), `boxesOverlap`, and the `switches` plugin (a plate or a button is pressed by what stands on it and opens the gates it links; a button that `stays` opens a gate for good, raises `fact.kept`, and the `facts` command, believed only from source 0 on tick 0, tells a sim what was done for good). New golden `switch.json` (recorded from CI); no existing golden moves. Rulings: `switchPlugin` takes the gate kinds (it must register `<kind>.opened` and `<kind>.closed`); the plan's `switch.json` run could not pass as written (the hero leaves the plate two ticks before the crate reaches a gate at x 11.25, so the gate shuts in its face), so the parity test moves the gate to x 10.25 by an override; the no-overlap-at-spawn test leaves out sensors (the hero's start in `room-2` is inside the door `door-in`, by design, since arriving beside a door is Task 8's). Plan W pull request 1, formats and checks (tasks 1 to 4), is built and green in every check of the full run (on `2aaaf03`), in pull request 171: a character declares `values`, `switch`, `opens` and `one-per-level`; a thing holds `values`, checked against its character; the `world` kind and the loader's `places`; `docs/formats/changes.md`, held to the schemas by a test. Pull requests 2 to 5 and the two Examples pull requests are for the threads that start after this one merges (the sim chain; the commands). Rulings: `ThingValue` stays in `level.ts` and `values.ts` imports it as a type, which keeps the layers acyclic; a value no shape fits is refused by the schema itself, so its test writes the level by hand; the full game gets a one-level world file, since a test holds every kind to be in it; the CI logs gave the schemas, the API report and the format page's hashes. No golden moves; none is new in this pull request | this pull request |
| 5 to 7 | Not started | |

What the plan found, for every later stage:

- **Paths wait for Characters (the Owner, 2026-11-15, "B, one thing at a time").** Nothing on `main` runs a character's
  behaviour rules (the runner was built with the story work, #64, and parked). A `path` value and the `walk-path` act
  are written, checked and drawn in this cycle; no critter walks until the Characters slice. The plan's last section
  lists what that slice lifts.
- **The spec was written before the slice cut.** Scenes, ledges, slopes, falls, the goal line and the PNG reader are
  off `main`, so an open edge is read from the tiles alone, and a level's picture has flat ground and no backdrop. The
  plan's table "What is on main and what is not" says what each returning plan widens.
- **The test game's page calls `startGame`, not `startFlow`,** so a door is read by one pure function (`doorTaken`)
  that the flow and that page both call.
- **Fifteen calls of the plan's own** are listed in it for the audit and the Owner to overrule: the main ones are a
  press worked out from boxes and not from Rapier's events, a place's ground as one grid, pictures with numbered badges
  and a list in the source language, and no "level done" screen at a door. The audit stood by calls 1, 2, 6 and 10 (10
  with a guard on who may send facts) and added three (a hero comes in beside a door, a late joiner comes in at the opened level, a `words` value must be
  a key the source language has). The Owner approved the two they were asked about (2026-11-15, 22:59 UTC): numbered
  badges and a list, and a door straight into the next level.
- **One audit claim did not hold as written** (M6, a joint's anchor in a shifted level): the anchor at the place's corner
  with the joints' places shifted is right, so the plan says so and adds the pin test instead of moving the anchor.

Stage 4's weights, when it starts: 14% for each of the five framework pull requests, 5% for the pin, 15% for the test
game, 10% for the last green run and the Owner's yes to the moved recording.

Nothing was run: these stages wrote documents.

## Cycle 12: the game checklist in every game (plan Q)

Spec: [`specs/2026-11-15-game-checklist-design.md`](specs/2026-11-15-game-checklist-design.md). The Owner (2026-11-15):
every "Must have" box of the Owner's game checklist is met by every game by default, plus the "Good to have" boxes that
make sense; only the boxes about the game itself, not about sending it to a host.

Overall: **15%** (stages 1 to 3 done, 15 points; stage 4, worth 60, is back at 0% on `main`: pull requests 1, 2a and 2b were built and merged, then taken off `main` by the slice cut, AF 153, and are kept by the tag `archive/before-slice-cut`; the plan's return note says how they come back after plan W's pull request 4; stages 5 to 7 follow)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Written, in review, 100%. Every box mapped to done (with proof), framework, template, check or the game maker; new: losing (`lost` and Try again), How to play, the goal line, `score` and best, a `page` part of the `rules` step, `automata check --ship`; Part A takes over plan K's Step U (the template on `startFlow`) and moves the template's recording once, for the Owner to see. The Owner answered Q1 (2026-11-15): A, Playwright and a play test in every game's own CI. The Owner cut the boxes that are Ruken's rules (no ads, money, tracking and the lockdown, the unchanged starter, the device and gamepad checks); the Ruken target, later, enforces the full list | `specs/2026-11-15-game-checklist-design.md` |
| 2. Plan (plan Q) | Written, in review (2026-11-15), 100%; plan Q at 0% built. Twenty-two tasks (the seventh in two halves) in six pull requests, 1, 2a, 2b, 3, 4 and 5 (4% each, 12% for the last green run and the Owner's yes to the moved recording), built B1, B2, A, C, D so the template's recording moves once: B1 what needs no page (`lost` and `score` in the project file; `hero.fell` as a plugin joined only to a game that names it; the `lost` step; the best score; the words in six languages); B2 the screens (Try again, Start again, the goal line, a level that waits for the first press, How to play, the score, the sound switch, Delete all my saves, the page-wide defaults, Back, the loading bar, a compressor, fades); A the template on `startFlow`, a level with a gap and a door for two players, and Playwright in every game's own CI (plan K's Step U); C the checks (`page`, words, ends, `--ship`); D the made game's journeys and the docs. One golden moves, once (`template/replays/level-1.json`, Task 15, shown to the Owner before merge); one is new (`fall.json`). No framework dependency; the template gains `playwright` 1.63.0 (Q1, A). Cut by the Owner as one host's rules, and not in the plan: no ads, money, tracking and the outside-site lockdown (no content security policy, no `[network] allow`), a `--ship` that fails an unchanged starter, and the device and gamepad checks; a later Ruken export target holds a game to the whole list (the plan's Handoffs). Five of the plan's calls are now the spec's too (records, `muted`, `level.<id>.goal`, `hero.fell` joined only by `lost`, "Load the page again"); the rest are listed in the plan's self-review. The plan audit's seven important and eleven minor findings are all in the plan (2026-11-15), listed in its self-review | `plans/2026-11-15-game-checklist.md` |
| 3. Plan audit | Done (2026-11-15), 100%. Sound, and the plan has taken every fix, so stage 4 can start: no critical, seven important (whether a falling hero needs `moves`; where the ends check gets the event ids; Back after the first return to the menu; the press that chose Play starting a waiting level; Back in a framed game; the compressor's make-up gain; `gameSave` not loaded), eleven minor. Every kept Must have box is covered, nothing the Owner cut is left, the one golden move is held for the Owner | `audits/2026-11-15-plan-q-plan-audit.md` |
| 4. Execution | Off `main` since the slice cut (AF 153), 0% on `main`; it was at 52% on the tag `archive/before-slice-cut` (pull request 1 is merged, AF 143: Tasks 1 to 5; pull request 2a is merged, AF 145: Tasks 6 to 9, Try again and Start again, the goal line, a level that waits for the first press, How to play, the score and the best score, a sound switch on pause, and Delete all my saves; pull request 2b is merged, AF 148, `3ead000`: Tasks 10 to 13, the page-wide defaults, Back, the loading bar with one more try, a limiter on the speaker and a fade-in for screens, with the checks of names, contrast and a hidden page). `lost` and `score` in the project file; `hero.fell` as a plugin joined only to a game that names it (new golden `tests/golden/fall.json`, no existing golden moves); the flow's `lost` step with `again` and the attempt count; the best score as a settings section and a `muted` flag; the new words in six languages. Pull requests 3, 4 and 5 follow (68%, 80%, 88%, then 100% on the last green run). One ruling so far: the fall's test gap is wide, since a hero pushing right sticks to the far wall of a narrow one | `plans/2026-11-15-game-checklist.md` |
| 5 to 7 | Not started | |

**Return note (2026-11-15, a documents-only refresh).** Plan Q now opens with a return note: it is built again only
after plan W's pull request 4 (doors and what is remembered) is merged. Pull requests 1, 2a and 2b come back from the
tag (merges `ce7524bd`, `66726259`, `3ead0001`, code and tests only), and 3, 4 and 5 are written fresh. Fourteen
changes for plan W: `flow.ts` gets no new line; the level name and goal line follow the level player 1 is in
(`heroLevels`); a fall in a place counts from the place's bottom; Try again and Start again bring the player in where
Continue would, and a door raises `attempt`; a level opened by a door does not wait, and a level with facts steps
tick 0 before it waits; a score is one sim's; Delete all my saves takes `last` and `facts`; `flow/page-guard.ts` does
not come back, since `guardPlay` (AF 155) covers it, and gains only the no-scroll rule; the ends check follows doors
and joins; recordings carry `meta.arrive` and `meta.save`. The Owner answered plan W's door question (2026-11-15: straight through,
no "level done" screen). The Owner also chose one level for the template (2026-11-15). Nothing waits on the
Owner before the build. The handoff below is history: where it differs from the return note, the note wins.

**Handoff (2026-11-15, paused at the coordinator's word: the Owner wants one thing at a time and picked the shell and World mockups).** Pull requests 1, 2a and 2b are merged into `main` (`3ead000`). Pull request 3 (Tasks 14 to 17, the template on `startFlow`) is NOT started: no template file is changed and no branch or pull request exists for it. A fresh session resumes at Task 14, from `main`:

- Rewrite `template/src/features/page/page.ts` as one `startFlow` call (keep `fetchBeside` and `fetchPictureBeside`, under 60 lines, `watch` reads `replays/level-1.json` on `?watch`); `template/src/main.ts` sets `window.automataFlow` and keeps `window.automataGame` as a getter of `flow.game()`; drop `.loading`, `.hint` and `.problem` from `template/src/style.css` and the three `page.*` words from the six message files; rewrite `tests/template/page.browser.test.ts` on the flow and add the two new template tests (page.ts imports only the framework and the game's own files and is under 60 lines; no message key starts with `page.`).
- Then Task 15 (the level with a gap, a door and a second start; the template's golden `template/replays/level-1.json` moves; show the coordinator before and after hashes, both levels and a `ci-screens` picture at 390x844, and do not merge until the Owner says yes), Task 16 (Playwright play test and a `play` job in every game's own CI) and Task 17 (the create journey on the flow, `builtins.test.ts`, README and AGENTS pages).
- Facts a fresh session needs: the template's gravity is 30 tiles a second squared, walk speed 6, so a jump clears about 4.8 tiles and a 2-tile gap leaves margin (if not, stop and report); `flow.ts` is exactly 600 lines (put new flow code in another file); `mcp__github__create_pull_request` adds a "Generated by Claude Code" footer that fails `commit-authors`, so strip it with `update_pull_request` and read the PR back; set the git author before each commit.
- Rulings so far to put in the final report: the speaker's limiter is a WaveShaper curve, not a compressor (the browsers' compressors added different make-up gain); `backMeans`/`drop` seam; `onDeleteSaves` returns `{ok}`; no `libraryWords`; no fade-out; the Back history entry is re-pushed after each Back; fixture `press.ts` removed; the fixture pit gap is 4 wide; `recordScore` lives in `records.ts`.

Nothing was run: these stages wrote documents.

