# Progress

The tracker every stage reads first and updates last. One section per cycle; newest first.

## Cycle 13: level links and the world map (values on things, doors and edges between levels, level pictures)

Spec: [`specs/2026-11-15-level-links-and-world-map-design.md`](specs/2026-11-15-level-links-and-world-map-design.md),
second version. From the LDtk report (picks 3, 4, 8 and 10). The Owner (2026-11-15): values and links on things, the
world map, doors between levels, level pictures and a public list of format changes; then levels that also join edge to
edge (for rooms put together from a seed later) and all story as facts and conditions
(`specs/2026-11-15-rooms-and-storylets-amendment.md`). The first version was closed pull request #149 (`c449fca`).

Overall: **20%** (stages 1 and 2 done; stage 3, the plan audit, is next; stages 4 to 7 follow)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Second version done (2026-11-15), 100%. The Owner's answers: edge joins come from where levels sit on the map (LDtk's way); a joined place plays as one seamless world, everything crossing, the whole place running at once (streaming later); what was done for good is remembered, as facts the story can read; the test game gets a third level joined by an edge; all twelve calls fine | the spec |
| 2. Plan (plan W) | Written, in review (2026-11-15), 100%; plan W at 0% built. Fifteen framework tasks in five pull requests (formats and checks; switches and gates; a place; doors and what is remembered; the commands and the docs), then three tasks in AutomataFrameworkExamples in two pull requests (the pin; three levels, a door and an edge). Three new goldens (`switch.json`, `place.json`, `level-picture.json`), none moved in this repo; in Examples `replays/level-1.json` moves once (the Owner sees it first) and `replays/level-2.json` is new. The World editor's five tasks are listed and gated behind the mockups. No new dependency | `plans/2026-11-15-level-links-and-world-map.md` |
| 3. Plan audit | Next: Opus, medium | |
| 4 to 7 | Not started | |

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
- **Twelve calls of the plan's own** are listed in it for the audit and the Owner to overrule: the main ones are a
  press worked out from boxes and not from Rapier's events, a place's ground as one grid, pictures with numbered badges
  and a list in the source language, and no "level done" screen at a door.

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
no "level done" screen). One thing waits on the Owner: whether the template keeps one level (recommended) or gets two
with a door between. The handoff below is history: where it differs from the return note, the note wins.

**Handoff (2026-11-15, paused at the coordinator's word: the Owner wants one thing at a time and picked the shell and World mockups).** Pull requests 1, 2a and 2b are merged into `main` (`3ead000`). Pull request 3 (Tasks 14 to 17, the template on `startFlow`) is NOT started: no template file is changed and no branch or pull request exists for it. A fresh session resumes at Task 14, from `main`:

- Rewrite `template/src/features/page/page.ts` as one `startFlow` call (keep `fetchBeside` and `fetchPictureBeside`, under 60 lines, `watch` reads `replays/level-1.json` on `?watch`); `template/src/main.ts` sets `window.automataFlow` and keeps `window.automataGame` as a getter of `flow.game()`; drop `.loading`, `.hint` and `.problem` from `template/src/style.css` and the three `page.*` words from the six message files; rewrite `tests/template/page.browser.test.ts` on the flow and add the two new template tests (page.ts imports only the framework and the game's own files and is under 60 lines; no message key starts with `page.`).
- Then Task 15 (the level with a gap, a door and a second start; the template's golden `template/replays/level-1.json` moves; show the coordinator before and after hashes, both levels and a `ci-screens` picture at 390x844, and do not merge until the Owner says yes), Task 16 (Playwright play test and a `play` job in every game's own CI) and Task 17 (the create journey on the flow, `builtins.test.ts`, README and AGENTS pages).
- Facts a fresh session needs: the template's gravity is 30 tiles a second squared, walk speed 6, so a jump clears about 4.8 tiles and a 2-tile gap leaves margin (if not, stop and report); `flow.ts` is exactly 600 lines (put new flow code in another file); `mcp__github__create_pull_request` adds a "Generated by Claude Code" footer that fails `commit-authors`, so strip it with `update_pull_request` and read the PR back; set the git author before each commit.
- Rulings so far to put in the final report: the speaker's limiter is a WaveShaper curve, not a compressor (the browsers' compressors added different make-up gain); `backMeans`/`drop` seam; `onDeleteSaves` returns `{ok}`; no `libraryWords`; no fade-out; the Back history entry is re-pushed after each Back; fixture `press.ts` removed; the fixture pit gap is 4 wide; `recordScore` lives in `records.ts`.

Nothing was run: these stages wrote documents.

## The Scenes cycle (the framework's side of the 2D environment builder)

Unnumbered, as the merge session keeps it (2026-11-15); the plan first said Cycle 8, which other plans took (the plan audit's I1).

Spec: [`2026-11-15-2d-environment-builder-design.md`](https://github.com/mcthaydt/AutomataFrameworkEditors/blob/main/docs/superpowers/specs/2026-11-15-2d-environment-builder-design.md)
in AutomataFrameworkEditors (its Cycle 4). Six slices, each a framework plan here and a builder plan there, the
framework's first. It is on the path to Release 1: the demo's real art comes from the builders.

Overall: **100%** of stage 5 (all four parts of stage 4 are merged: AF 128, 134, 138 and 141; the implementation audit is written, sound with four important fixes and nine minor; stage 6, the fixes, is under way)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Merged in AutomataFrameworkEditors (PR 31). The Owner (2026-11-15): a full scene builder, as powerful as the first attempt's 3D one; the scene owns the ground and the level only places what plays; all six slices | the link above |
| 2. Plan, slice 1 (ground and materials) | Written, in review (2026-11-15). Sixteen tasks in four pull requests (5.5% each, 12% for the last green run): a PNG reader of our own; the photo library (38 CC0 photos with their records); the `scene` file (nine ground shapes; photo, tiles and flat materials); a game's own photos; a level names its scene; the photo pipeline, engine-proof; the ground's picture; scenes in a game's art and `sceneFromLevel`; the ground's colliders as plain data; slopes and a one-way ledge in physics; a level's sim reads its scene (a moved level plays to the same hash); the built-in hero on a slope (waits for plan H's build, PR 101); the renderer; `automata scene from-level` with `art` and `check`; the skill and the README; three end-to-end journeys. No golden moves; four new ones; no dependency. Fourteen calls the spec left to the builder are settled in it for the audit. Open to the audit: four Rapier names for the ledge's contact hook could not be checked from the planning session; `listContent` (one writer for `automata.toml`) may overlap another plan's. Slices 2 to 6 are outlined | [`plans/2026-11-15-scenes-1-ground-and-materials.md`](plans/2026-11-15-scenes-1-ground-and-materials.md); the builder's: [`2026-11-15-scenes-1-ground-and-materials.md`](https://github.com/mcthaydt/AutomataFrameworkEditors/blob/main/docs/superpowers/plans/2026-11-15-scenes-1-ground-and-materials.md) |
| 3. Plan audit | Done (2026-11-15), slice 1, both plans: ready once fixed, and the fixes are in the plan. No blocking finding; seven important (the cycle number, now unnumbered; plan H's files overlap Parts B and C, which now wait for PR 101; one `project-write.ts` for three plans, plan R's `listContent` shape; the ledge hook reads `activeHooks()` and keeps no handles; a lone half-high tile's box; a copy of Examples' `level-1` in the same-hash proof; `LevelPicture.showScene` for the builder's live repaint); six minor. The four Rapier names are checked against 0.21.0's declarations. The Owner's four answers (2026-11-15, 01:02 UTC) are the builder plan's rulings 1, 13, 14 and 15 as written: only working tools, two simple starts, "Paint ground, press Save", size by agents only for now | [`audits/2026-11-15-scenes-1-plan-audit.md`](audits/2026-11-15-scenes-1-plan-audit.md) |
| 4. Execution, slice 1 | Part A merged (AF 128, `2c6c4ca`): Tasks 1 to 8 (PNG reader, photo library, scene file, photos, level names its scene, photo pipeline, ground painter, scenes in a game's art and `sceneFromLevel`). Rulings: a material's `edge` paints the owning material's edge, after its top. Part B merged (AF 134, `0e0d8d0`), Tasks 9 to 12: `groundColliders` (a scene's boxes, slopes and ledges as plain data in spawn order, with `tilesUnder`), slopes and a one-way ledge in physics, a level's sim reads its scene (`worldSize`, `skyOf` and `groundOf` take the content; `simContent` cuts a scene to its size and ground and leaves photos out), and the built-in hero on a slope (`Felt.gx`/`gy`, the `Ground` component, `stepMoves`' `slope`). Rulings: a half slope's "half a tile down" is a triangle half a tile high with a box for the half tile under it; a level the hero moves keeps joined boxes (`sceneFromLevel` writes `oneBoxPerRow` only for a `#` level whose hero has no `moves`); a tileset of more than 32 kinds is a clear error from `sceneFromLevel`, not a partial scene; the same-hash proof compares the world with the content hash blanked, because a snapshot's hash includes the content hash and a scene is content (the plan said "same finalHash"); slope skirt and sink in the collider and an idle lift of 5/8 of a tick of gravity in the hero (no hold speed); the ledge's contact hook judges a faller by where its lowest point was a tick ago, since Rapier finds a contact only once the two overlap; (two more changes from the plan, recorded by the implementation audit's M5: the hook reads facts gathered before the step (`ledgeFacts`), because Rapier has the world borrowed while it calls the hook, where the plan had it read `activeHooks()` from the world; and a body passes up through a ledge only when rising faster than `LEDGE_RISE`, 0.5 tiles a second, where the plan said any upward speed, since `linvel().y >= 0` also holds for a body at rest on the ledge); three goldens recorded for the first time (`scene.json`, `slopes.json`, `slope-ledge.json`). Part C merged (AF 138, `46b1c13`), Task 13: a scene's painted ground pages and tiles-material squares drawn under the figures, `levelViews` for a scene level, `LevelPicture.showScene`. Part D built (2026-11-15), Tasks 14 to 16: `automata scene from-level` (`--as`, `--json`, the MCP tool `scene_from_level`), `readPhotos` so `automata art` and `check`'s `art` step paint and judge a scene with photos (a game's own photo first, a library photo from the package's `photos/`; a game's own photo with no readable picture stops the painter and the file is named), the scenes page for agents (`skills/automata-content/scenes.md`), the README's Scenes section, a changeset, and three journeys (the packed package moves a created game onto a scene and its replay says the content changed and plays every recorded tick; an agent writes a scene by hand; a player walks the slope and jumps through the ledge in three browsers). Rulings: `paintedPaths` (what the files step knows belongs to the game) is now worked out from the project's list with nothing painted; `materialTile`, `MaterialTile`, `groundPages` and `placedTiles` are now exported (the plan's handoff names them); the packed-package journey cannot expect the recorded final hash, because a snapshot's hash includes the content hash and a scene is content (the same-hash proof stays in `scene.parity.test.ts`, with that hash blanked); the browser test gives its hero the example figure (opt-in in `loadSceneMovesGame`, so the slopes golden's content is unchanged) | PR 141 (Part D) |
| 5. Implementation audit | Written (2026-11-15), stage at 100%: sound, no golden moved, no dependency, the one named workflow line. Four important: I1 the photo materials paint almost flat at the fixture's settings (CI's own picture: the brick and rock materials are one colour each, the earth 98% one), so a test on real library photos and a fix in the pipeline, whose golden move (`scene-art.json`) and look go to the Owner first; I2 a half slope whose foot is half way down a tile, longer than one tile, makes solid ground over air that the slope check never asks about; I3 the README and the skill say a moved level's recordings still end where they did, but `automata replay` says the content changed (by design); I4 no same-world proof for a `#` level with the built-in hero, the template's path. Nine minor (a stale shape sentence, the missing-shape sentence, a `tiles` ledge, the slope lift's comment, two ledge-hook deviations to record, a second copy of the picture-path rule, an unexported type, one refusal's words, `oneBoxPerRow` kept after a game gains `moves`). The builder's four noted deviations are checked and sound. Nothing was run | [`audits/2026-11-15-scenes-1-implementation-audit.md`](audits/2026-11-15-scenes-1-implementation-audit.md) |
| 6. Fixes | In progress, 2026-11-15, in two pull requests because I1 moves a golden and waits for the Owner. First (this branch): I2 `gapsUnder` also asks for the foot row's other tiles when a half slope's foot is half way down a tile (`footRowTiles`), with tests in `scene-ground.test.ts` and `scene.test.ts`; I3 the README, the skill and two code comments say a moved level plays as it did but its recordings must be made again with `automata replay --accept` (a docs test holds the words out); I4 a fourth same-world case in `scene.parity.test.ts`, the moves game's `#` level with the built-in hero; M1 to M9 (M1 the shape sentence names every code; M2 the missing-shape sentence names all nine; M3 a `ledge` of a `tiles` material is refused; M4 the slope lift's comment says why `5/8` of `hover` and not all of it; M5 the two ledge-hook deviations above; M6 `paintedFiles` is the one place the painted-path rule is written, and `automata check`'s files step uses it; M7 `GroundPageArt` and `TileSprite` are exported from the browser entry and the API report; M8 plain words for the refusal; M9 the skill says a game that gains `moves` takes `oneBoxPerRow` out of its moved scenes). Second, after the first merges: I1, the photo materials, with before and after pictures for the Owner. **The first is pull request 147, green in every check on `59b099c` (check, package with the hand-written API report, the three engines, online, create on three systems, create-play, screens, commit-authors), no golden moved; ready for the merge session. I1 is not started (handoff below).** Paused at the Owner's word (2026-11-15, one thing at a time) | PR 147 |
| 7. Owner review | Not started | |

**Handoff, Scenes stage 6 (2026-11-15).** Resume at I1 once PR 147 has merged: restart `claude/project-thread-11i5qp` from `main` (the branch is the one allowed; its PR 147 will have merged) and open a second pull request that waits for the Owner's yes, because it moves `tests/golden/scene-art.json`. Nothing of I1 is written; this is what the reading found, from the code only, nothing run.
- *What the code does* (`src/features/content/photo-tile.ts`, `materialTile`): flatten (blur radius `max(side)/8`, 3 passes) → Kuwahara facet (radius 1 on the full photo) → `resample` to `size × scale × tile` pixels (area average) → index → wear → clean (`cluster` 4). The library's `brick` is 128 by 128 pixels and `size` 1 by 1 tile, so at `tile` 16 it is shrunk 8 times to 16 by 16, and a mortar line a pixel or two wide is averaged to about an eighth of a pixel. `dirt` is 1.3 tiles (about 21 pixels), `stone` 2.09 tiles (about 33).
- *Ladder mode* (`indexLadder`): a texel's step is `round((L - median) / contrast)` with `contrast` 0.07 in OKLab lightness, kept inside the ladder. After the shrink the lightness hardly varies by half a step, so every texel is step 0; the `accent` share is under 3% so it is switched off. This is the likeliest cause for `brick` and `earth`: an absolute `contrast` against a photo that was averaged flat. A fix that keeps the painter's math: take the step from the tile's own spread (for example scale `contrast` so the 10th to 90th percentile of lightness spans the ladder), or do the facet and the accent test after the shrink, at the size the player sees.
- *Match mode* (`indexMatch`, `rock`: `stone`, `match: 4`): k-means keeps four colours, each moved to the nearest of the scene's paints. The fixture's paints have one warm grey that is nearest to all four, so all four become `mortar-dark` (the audit counted 15,500 of 15,500 pixels). A fix: give the clusters different paints when the scene has enough (nearest unused paint, darkest to lightest), or take the paints' own spread into account.
- *Diagnose first, in CI* (nothing runs locally): push a temporary test that loads the fixture's `meadow.json` materials `earth`, `brick` and `rock` and the library photos `dirt`, `brick` and `stone` (`libraryPhotos` in `tests/fixtures/content/photo-files.ts`), and `console.log`s, for the default knobs and for each of `facet` 0, `flatten` 0, `wear` 0, `cluster` 1, `scale` 2 and 4, `tile` 32 and 64, `contrast` 0.04 to 0.01 and `match` 2 to 8: the number of distinct places and the top four shares. Read it with `get_job_logs` on the `check` job (about 400 lines from the end). Then write the real failing test in `photo-tile.test.ts`: the three real photos at `tile` 16 and the fixture's knobs give at least three places in a ladder of three, and no place over 85% of the tile (for `rock` at least three places too).
- *After the fix*: `tests/golden/scene-art.json` moves (record it the way the Node job's log prints it), and the Owner gets before and after pictures: `ci-screens` has the scene pictures per engine (`<sha>/<engine>/scene-<size>.png`, the audit names `14a9971/chromium/scene-1280x720.png` for before). Hold the pull request for the Owner's yes on the golden and the look; the merge session holds it too.
- *Rules that bit this session*: `mcp__github__create_pull_request` appends a "Generated by Claude Code" footer that fails `commit-authors`; strip it at once with `update_pull_request` (the same body). Biome's format is checked by `pnpm lint` first and stops the `check` job, so format by hand to 110 columns (a long string stays on its own line after its key).


## Cycle 11: live move numbers and the jump's path

Spec: the Feel editor's, in AutomataFrameworkEditors
([`2026-11-15-feel-editor-design.md`](https://github.com/mcthaydt/AutomataFrameworkEditors/blob/main/docs/superpowers/specs/2026-11-15-feel-editor-design.md),
"What Feel needs from the framework", F1 to F3). F4 is plan F's.

Overall: **85%** (stage 1 is the Feel spec; stages 2 and 3, the plan and its audit, are merged; stage 4 is built and green; stage 5, the
implementation audit, is done; stage 6, its fixes, is in pull request 122; stage 7 is the Owner's)

| Stage | State | Output |
|---|---|---|
| 1. Spec | The Feel spec (Editors pull request 30); the Owner answered its Q1 to Q4 (2026-11-15) | the link above |
| 2. Plan (plan G) | Written, in review. Four tasks in one pull request (22% each, 12% for the last green run): the numbers from plain values and the names Feel reads; `jumpPaths`, what a jump reaches, as one pure function over `stepMoves`, held to the real sim by a parity test; a tune as a command and a resource, joined to a sim only when it is made with `tunable`; `game.tune`, the docs and the API report. No golden moves, none is added, no dependency. Builder's call for the audit: a tune is a command, so a tuned play still replays (plan H's handoff said a number cannot change in a running game). No Owner question is open | `plans/2026-11-15-live-tuning.md` |
| 3. Plan audit | Done (2026-11-15): sound; three important fixes (a tuned replay now carries `meta.tunable`, so `automata replay` and watch can play it; the plain sim's check no longer reads a schema hash the moves golden does not hold; `heroControls` is page-side and left off the headless list) and seven small ones, all made in the plan. No Owner question | `audits/2026-11-15-live-tuning-plan-audit.md` |
| 4. Execution | In progress, pull request 122 (branch `claude/project-thread-nhh28u`). Task 1: `moveNumbersOf`, and the names Feel reads from the headless entry (`stepMoves` and its types). Task 2: `jumpPaths`, held to the real sim by a parity test on a flat level made in the test. Task 3: `tune`, the command, the `level.tuned` resource and the `level.tune` system, in a sim made `tunable` only. Task 4: `game.tune`, `meta.tunable` read by `automata replay` and `watchReplay`, the README, the skill and the changeset. Rulings so far: an air jump is pressed after a one-tick let-go (a press is an up-to-down change, so the real sim could not otherwise press); the browser tests are in `tests/features/game/tune.browser.test.ts`, not `game.browser.test.ts` (their game is the moves fixture, built as `hero-controls.browser.test.ts` builds it). The path moves the place by Rapier's four substeps to a tick (the speed the tick began with plus 5/8 of a tick's pull), which the parity test showed: the framework jump is 2.375 tiles up and 4.8 across, not the plan's 2.3 and 4.7 (the plan's sums used a smooth fall); the unit test holds the corrected numbers The API report is taken from the `package` job's log, as the plan says (applied to `docs/api/framework.api.md` after the last source change) | branch `claude/project-thread-nhh28u`, PR 122 |
| 5. Implementation audit | Done (2026-11-15), pull request 130: sound, ready to merge after two important fixes (I1: `meta.tunable` was read by `automata replay` and `watchReplay` with no test; I2: `jumpPaths().wallJump.up` was not held to the real sim) and four minors (M1: a tune to other numbers mid-air; M2: `airJump.rise` is every air jump together, not one, which the Feel plan is told; M3: the substep count is Rapier's default; M4: the air-jump parity case takes its press tick from the path and checks `across`) | `audits/2026-11-15-live-tuning-implementation-audit.md` |
| 6. Fixes | In progress on pull request 122: I1 is `tests/features/cli/replay-tuned.test.ts` and a `watchReplay` case in `tune.browser.test.ts`; I2 is a wall-jump parity case beside a wall of the flat level; M1, M3 and M4 as above. M2 is a note for the Feel plan: `airJump.rise` is `airJump.up - jump.up`, every air jump the hero has together (`air-jumps` of them) | branch `claude/project-thread-nhh28u`, PR 122 |
| 7. Owner review | Not started | |

Nothing was run: this stage wrote documents.
## Cycle 10: sound formats (recordings, loops, chords, motifs, MIDI, content folders)

Spec: [`specs/2026-11-15-sound-formats-design.md`](specs/2026-11-15-sound-formats-design.md), written with the Sound
editor's spec in AutomataFrameworkEditors (`docs/superpowers/specs/2026-11-15-sound-editor-design.md`).

Overall: **18%** (the spec, plan M and its audit are written and in review; stages 4 to 7 follow)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Written, in review, 100%. The Owner answered (2026-11-15): recorded sounds are in (Q4 B), music as GarageBand-style loops, chords and motifs (Q3), new formats in the framework first (Q5 A) with MIDI to JSON and back, and content folders listed once in `automata.toml` (Q6 A). Flagged: the Feel editor's cycle lists one line per effect, which differs from Q6 | `specs/2026-11-15-sound-formats-design.md` |
| 2. Plan (plan M) | Written, in review, 100%. Eighteen tasks (5% each, 10% for the last green run): a folder in a `[[content]]` block and `withFolders`; the loader lists folders (`loadGame(read, list)`, and `automata.folders.json` for a page, which cannot list one); the recording file (`src/lib/wav.ts`), its voice and its limits; keys, chords and steps as pitches; the `loop` kind; the `motif` kind and a motif as a sound's voice; music format 2; instruments, plain notes (`notesOf`) and `scoreOf` for a song; motif voices and recordings through the speaker (`keep`); the page's speaker plays a recording; sound kinds (`makeSound`); 26 loops and four styles named in nine languages; a MIDI file's bytes (`src/lib/midi.ts`); `musicToMidi`; `midiToMusic` and the round trip; `automata music import` and `export` and `automata sound new`, with MCP tools; the template with folders, a sound, a song and its audio; one game with everything in four engines, and the docs. No hash moves, three new goldens (`song.json`, `kinds.json`, `full-sound.json`), no dependency. Folders work for every kind, so Feel lists its folder once too (the Owner, 2026-11-15). Settled in the plan because the spec is silent: a page reads folders from a generated `automata.folders.json`; four beats to a bar; `automata sound new`. The instruments, kinds and loops are first values for the Owner's ears. No Owner question is open | `plans/2026-11-15-sound-formats.md` |
| 3. Plan audit | Written, in review, 100%. Sound, no critical fault; seven important and six minor, all fixed in the plan but one (the tracker's Cycle 8 is also plan F's; the second to merge renumbers): the order in which games may start listing folders (the Editors and the Site first, then the demo); MIDI cut into loops only where no note crosses a bar line, and long songs joined into loops of up to 8 bars; styles only on sixteenths; `MidiDropped` codes so the editors can word them; `project-write.ts` the one writer of `automata.toml` (plan R's `listContent` and `withFolders` side by side); the template's feel block left alone so its golden cannot move. No Owner question | `audits/2026-11-15-plan-m-plan-audit.md` |
| 4 to 7 | Not started | |

## Cycle 9: the feel runtime (dust, shake and freeze on screen)

Spec: [`specs/2026-11-15-feel-runtime-design.md`](specs/2026-11-15-feel-runtime-design.md)

Overall: **30%** (the spec, plan F and its plan audit are written and in review, with the audit's fixes in the plan; stages 4 to 7 follow; the build waits for plan H)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Written, in review, 100%. The Owner answered (2026-11-15): freeze is a real pause offline and a held picture online (A); a "Screen shake" switch in the game's settings, on by default and off first when the device asks for reduced motion (A). Also covers the Feel editor's "Show me" (Editors PR 30, F4): `showFeel` plays one feel file once in a running game, presentation only. No golden moves; no new dependency | `specs/2026-11-15-feel-runtime-design.md` |
| 2. Plan (plan F) | Written, in review, 100%; plan F at 0% built. Twelve tasks (7.5% each, 10% for the last green run): the `feel` feature's place (pure, between `server` and `render`), its noise and the "Screen shake" setting as plain data; dust as numbers and the limits a file plays inside; shake as numbers; `createFeel` (events in, frames out) with a new golden of its frames in four engines; `Host.reducedMotion()`; the renderer draws a feel frame (a dust layer, an offset in whole device pixels, a held picture); the loop can hold without owing the time; a game played alone draws its feel and really pauses for a freeze; watched and online games (online a freeze holds only the picture; a watch never buzzes); `showFeel`, playing or paused; the word in six languages, the README and the skills; journeys at five sizes in three browsers. No golden moves (one new: `tests/golden/feel-frames.json`); no dependency is added. Two builder's calls differ from the spec's words and are named for the audit: dust starts at the thing's feet as of the newest step (the last picture only for a thing just taken away), and the runtime has `hold(seconds)` beside `frame`. Handoffs: plan U shows the switch (`automata.feel.shake`, the `feel` settings section), plan D Part 6 (three feel files and its `crate.dropped` plugin), the Feel editor's Part 3 (`showFeel`, `game.feel()`), and every hand-made `Host` gains `reducedMotion()`. No Owner question is open | `plans/2026-11-15-feel-runtime.md` |
| 3. Plan audit | Written, in review, 100%. Sound once one critical gap is closed: one critical, five important, eight minor, all fixed in the plan (and four places in the spec). Both flagged deviations accepted (dust at the newest step; `hold` beside `frame`). Critical: a feel file is still part of the sim's content (`simContent` leaves out words, sounds and pictures, not feel), so tuning one moves every hash; `'feel'` joins `LEFT_OUT`, asked of plan H's build before it records the template's replay. Important: online a sync is heard before its steps; a key tapped wholly inside a hold is not seen (named as a limit, touch taps kept); the 30-tick cap counts from the hold's start; a new Task 13 puts the "Screen shake" switch on plan U's settings screen if that lands first; `heroes()` follows the held picture. Plan F is now 13 tasks (1 to 12 at 7.5%, Task 13 at 5%, the last green run 5%). No Owner question is open. Renumbered Cycle 9 at the merge, after plan R took Cycle 8 | `audits/2026-11-15-plan-f-plan-audit.md` |
| 4 to 7 (plan F) | Not started; the build lands after plan H, before plan D's Part 6 | |

## Cycle 8: rigged figures (people, animals and free shapes)

Spec: [`specs/2026-11-15-rigged-figures-design.md`](specs/2026-11-15-rigged-figures-design.md). It widens M2 plan A's
`figure` format so the editors' 2D figure builder (its spec is in AutomataFrameworkEditors) can be as powerful as the
old 3D builder (the Owner, 2026-11-15). The Owner answered Q1 to Q5 on 2026-11-15.

Overall: **17%** (stage 1 counts 4 points, stage 2 is 4, stage 3 is 4, stage 4 is 60 and is at 9%, stage 5 is 10, stage 6 is 12,
stage 7 is 6; the cycle is one plan, plan R, built in six parts, each its own pull request)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Written; in review | [`specs/2026-11-15-rigged-figures-design.md`](specs/2026-11-15-rigged-figures-design.md) |
| 2. Plan (plan R) | Written, in review, 100%. Twenty tasks in six parts, each part its own branch and pull request that leaves `main` green (each task is 4.5% of stage 4; the last 10% is the parts' final green runs): 1, a person from the side (the `palette` kind and the library's 32 ramps; the format 2 file with eighteen sliders, each with its sentence; the skeleton and the two-bends rule; shapes filled in a ramp's shades; a standing person, its sheet and a contact sheet on `ci-screens`); 2, pieces (the `piece` kind, a game's own over the library's, painting them, the library's 41 for a person); 3, motion (poses as bends inside each joint's limits; poses placed by hands, feet, head and hips; the `gait` kind with a walk and a run; the `stand` kind with an idle); 4, views (front and back painted; a `Side` component switched on only by a figure that paints them, `setSide`, a cutscene key's `view`); 5, animals (their file, fourteen sliders and skeleton; painting, 12 pieces, walk, trot and stands); 6, new files and the way in (`listContent`, `automata add` and the agent's `add` tool, six starters and the figure tools on the public surface, the README and skills, and a new game given a rigged figure and played in three browsers at five sizes). No existing golden moves (free figures stay format 1 and keep their painter untouched); two new ones, `figures.json` and `sides.json`. No dependency is added. Readings of the spec the plan records for the audit: face styles are a list in code, not library files; a behaviour sets no view (no act sets facing today); a sheet never spills into a second picture (a rigged sheet is up to 32 pictures across); `stand` left out is `easy` and `gait` left out is no walk; six starter figures are added for the builder's New figure. No Owner question is open | [`plans/2026-11-15-rigged-figures.md`](plans/2026-11-15-rigged-figures.md) |
| 3. Plan audit | Done, 100%: no critical finding, eleven important, eight minor, all fixed in the plan in the audit's pull request. The `automata.toml` writer (Tasks 17 and 18) is now Part 0, built first, as the one writer the scenes and sound plans also take; `BodyPlan` and `FigureView` replace two names that clashed on the public surface; `paint-figure.ts` changes one type import; a palette has its own `ink`; the walk's numbers are fixed (even pictures, the stride's crouch); an animal's trunk is measured from forward; a pose's places are units from the hips; Part 4 starts after plans H and T merge. Q1 is settled (the Owner, 2026-11-15): games' art uses Lospec's DUEL palette (256 colours) in place of No. 276, and the UI keeps its palettes; Task 1 exports `DUEL_COLOURS` for a game's CI. The Owner answered Q2 (2026-11-15): in a game seen from above a figure turns by itself to show its front walking down and its back walking up, and a behaviour or cutscene can override it; plan R's new Task 14b builds it in Part 4. Nothing was run | [`audits/2026-11-15-rigged-figures-plan-audit.md`](audits/2026-11-15-rigged-figures-plan-audit.md) |
| 4. Execution | Under way, 9% (Tasks 17 and 18 of 20, 4.5% each). **Part 0 is built and green in every check** (pull request 119): `listContent` in `project-write.ts` is the one writer of `automata.toml`, and `automata add` and the agent's `add` tool (fourteen tools now) use it; the sound plan's `withFolders` and the scenes plan's slice 1 take this file. Rulings: `listContent` takes `{ type: string, path }` (not `ContentRef`) so a command can pass what was typed and get the sentence about the kind; a file already listed as another kind is refused, where the plan said an entry already listed is given back unchanged; a refusal of the project, kind, path or note is exit 2 in `automata add`, and only a content file that does not read is exit 1. Parts 1 to 6 not started | |
| 5. Implementation audit | Not started | |
| 6. Fixes | Not started | |
| 7. Owner review | Not started | |

## Cycle 7: the default game flow (plan U)

Spec: [`specs/2026-11-14-m2-design.md`](specs/2026-11-14-m2-design.md) ("UI, screens and layouts (plan U)"), with the
order of the flow from [`specs/2026-11-14-no-default-language-design.md`](specs/2026-11-14-no-default-language-design.md)
and the touch settings from [`specs/2026-11-14-content-hero-controls-design.md`](specs/2026-11-14-content-hero-controls-design.md)

Overall: **100%** (stage 4 is built and green: part A is merged (PR 110) and PR 123, with Tasks 2 and 5 to 18, has every check green on `5ce5de2`: check, package, online, create (three systems), create-play, Chromium, WebKit, Firefox and the screens' pictures; stage 5, the implementation audit, follows)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Merged (M2's spec, PR 30; the flow's order is the Owner's, 2026-11-14: warnings if needed, the language picker, the splash, the main menu, the game with pause, back to the main menu) | `specs/2026-11-14-m2-design.md` |
| 2. Plan (plan U) | Written, in review, 100%; plan U at 0% built. Eighteen tasks (5% each, 10% for the last green run) in three parts. Part A needs nothing and can start at once (Tasks 1 to 4): the project file's `levels`, `done`, `warnings` and `splash`, kept out of the sim so no hash moves; what a `Game` tells a screen (`onStep`, `paused`, `broken`); the flow's steps as one pure function; progress and the party. Part B (Tasks 5 to 13) is the screens and `startFlow`, and waits for the Owner's three answers and for plan H to be merged. Part C (Tasks 14 to 18) is settings, saved games, adding a player, the journeys at five sizes in three browsers, and the docs. Three new page features: `ui`, `screens`, `flow`. No golden moves. **The Owner answered all three questions with the recommended option (a), relayed by the coordinator on 2026-11-15:** Q1, yes to `svelte` 5.57.1 and, for development, `@sveltejs/vite-plugin-svelte` 7.3.1 and `svelte-check` 4.7.6; Q2, the framework's and the game's warnings on one screen with OK, in the device's language when the game has it, else right after the flags; Q3, the game's own logo or name for two seconds, any press skips | `plans/2026-11-15-game-flow.md` |
| 3. Plan audit | Written, in review, 100%. Sound and ready for stage 4: no critical, eight important (the `flow` folder had no entry until Task 13, so pull request A could not pass `feature-has-entry`; the test that the four new fields stay out of the sim could not fail; Task 2 edits `game.ts` and `render.ts`, which plan H's open build rewrites, so it moves to pull request B; nothing told TypeScript what a `.svelte` import is; the packed-install check never read the new `screens.ts`; `svelte-check` on TypeScript 7 is unproven, so its first push prints what it runs on; a crate pushed into the door would have ended the level; Escape on the mount is not heard after a tap on the canvas), eleven minor. All fixed in the plan; the held lines are lifted. Part A is now Tasks 1, 3 and 4 and can start at once; Task 2 and Part B wait for plan H on `main`. No golden moves, no Owner question open | `audits/2026-11-15-plan-u-plan-audit.md` |
| 4. Execution (plan U) | Part A built, 15% of 100% (Tasks 1, 3 and 4 of 18; every check green on `119068a`, PR 110). Task 1: `levels`, `done`, `warnings` and `splash` in `automata.toml`, each read and checked against the rest of the game with the plan's sentences, and left out of what the sim is given (so a game that writes only one still hashes as it did); `levelOrder` and `nextLevel`. Task 3: the `flow` layer above `game` and `flow/steps.ts`, the whole table of the flow as one pure `advance` that gives back the very same object for an event that means nothing. Task 4: `flow/progress.ts` (the save a game gets when it names none, `newest`, `firstEmpty`, `reached`, `progressLabel`) and `flow/party.ts`. Rulings: the tests of all three tasks were pushed red together, not task by task, to save two CI rounds; a game with `warnings` and no words gets the sentence "This game lists no words, so a warning has nothing to say. List a messages file, or take the warnings line out." (the plan names none); `newest` is `saves`' `latestSlot`, not a second copy; a start level that does not exist is reported once, not also as "not in levels". No golden moved. Part A merged as 183712a. Part B (PR 123, branch `claude/plan-u-flow-b`, built on `main` after plan H, b634dce): **Task 2 is pushed** (`Game.onStep`, `paused`, `broken`, `onBroken`, a kept `replay()` after `stop`, `padMenu` naming the pad, the canvas hidden until the first step; the tests of it are in `game.browser.test.ts`, `loop.test.ts`, `pad-menu.browser.test.ts` and `art.browser.test.ts`) and was waiting for its first full CI run when the 90-minute handoff was written. Rulings: `onStep` tells the tick the sim is at after the step (1 for the first), as the sound is told, not tick 0 as the plan's test comment said; the tests were pushed red together with part A's, and Task 2's code followed at once without a separate red run. **Update, Tasks 2, 5 and 6:** PR 123's first CI run found three things: the API report (applied), a test of mine that counted the input's own frames as the game's (the input keeps asking for pad frames after a game breaks; fixed), and one thumbs test that failed once in Chromium alone and touches nothing this branch changed (watched, not touched). Task 5 puts Svelte 5 in the build: `svelte` 5.57.1 is a dependency, `@sveltejs/vite-plugin-svelte` 7.3.1 and `svelte-check` 4.7.6 are development tools, `ui` and `screens` sit between `web` and `game` in the layer rules, only they may hold a `.svelte` file or import `svelte`, and one button proves it. Rulings: a pnpm override does not reach a peer dependency (the lockfile still gave `svelte-check` TypeScript 7), and nor does a package extension, so `.pnpmfile.cjs` turns `svelte-check`'s TypeScript peer into its own dependency on 6.0.3 (proved in the lockfile before any push); `typecheck` prints which TypeScript `svelte-check` was installed with, for this first push; Biome leaves `.svelte` files out, as the Editors' does. Task 6 is the kit: slider, switch, list, key row, dialog, frame, the spatial focus walk and the screen's pad and arrow keys (a key held over from the last screen is not pressed). **Update, Tasks 7 to 9:** Task 7 is the words of the screens in six languages (74 keys each, a table test that checks them, and a `WAITING_FOR_SCREENS` list in the library test that shrinks as each screen uses its keys); Task 8 is the warnings screen (`show`, the screens' one mounting function, and `warningsFor`); Task 9 is the splash (the game's picture or name for two seconds, any press skips). Rulings: the kit's `Frame` is exported as `ScreenFrame` (`content` already exports a `Frame`); a sentence on a screen is at most 14 words. **Update, Tasks 10 to 14:** Tasks 10 to 12 are the screens the flow draws itself: the main menu (`menuItems` says which buttons from three facts, the first is the primary one), the hud (the pause button on the side away from the jump thumb, the numbers over the heroes, and the whole-screen "Tap it to play" while a recording plays), the pause screen ("Keep playing" first; leaving asks first) and the "Well done!" and problem screens. Task 13 is `startFlow` (`flow.ts`, with `types.ts`, `loading.ts`, `sections.ts`, `events.ts`) and its browser tests; a door touched by a crate does not end a level, only a hero does (`endsLevel`). Task 14 is the settings screen (`settings-rows.ts`, `settings.ts`, `Settings.svelte`): language flags, two volume sliders that play a sample when let go, Swap sides and Vibration, and every key and gamepad button changed by touch, key or pad; the flow opens it from the menu (on an input made for it) and from pause (on the game's own), and `places.ts` and `overs.ts` took the saved games and the screens on top out of `flow.ts`, which was at its 600-line limit. Rulings: the flags in Settings are plain buttons (a flag does not choose itself when focus arrives, as it does on the picker); `controlRows` reads the controls, not `inputsFor` (that is empty for a finger); `resolveControls` and `buttonLabel` are exported so the menu's input is made the way the game's is. **Next:** read the CI of these, update the API report from its log, then Task 15. Earlier note: read PR 123's CI, fix what it shows, update the API report from the `package` job's log (`GameStep`, `Game.paused/onStep/broken/onBroken`), then Task 5 (Svelte in the build: `pnpm install --lockfile-only` is the one command allowed, and its first push must print what `svelte-check` runs on; TypeScript 7 there is a failed attempt under the stop rule), then Tasks 6 to 13 in order **Update, Tasks 15 to 18:** Task 15 is the saved games: `saves` (three places, each opened, begun anew or emptied after a question), Continue first on the menu once there is a game to continue, and a new game that asks which place to write over when every place is taken. Task 16 is "Add a player" (`players`): a gamepad's button or Enter shares the keyboard, the screen says who is in, and from pause the hero comes at once (and "Take out player 2" sits beside Settings); the party is kept from level to level and each player's device is claimed again when a level starts. Task 17 is the journeys (`journey-touch`, `journey-pad`, `journey-keys`, `journey-sizes`) and the grandma test: by thumb at 390 by 844, by gamepad at 1180 by 820, by keyboard at 1280 by 720, and every screen at the five sizes with a picture of each under `flow-<size>-<screen>.png`. Task 18 is the README's "Screens and the flow", the skills, the public-surface and install checks. Rulings: Settings names no main button (it has a list and Back at the top, so there is nothing to choose between); the flow hears Escape while capturing so the Escape that keeps playing on the pause screen does not pause again (the keys journey would have shown it); a test waits for the game to exist after `playing`, since the step comes before the game and a key sent between them is lost; `WAITING_FOR_SCREENS` and `NOT_YET` are gone, as the plan said they would be. The fixture game's art is boxes, so the pictures show the screens' look and not a game's. **Final run, 100%:** green on `5ce5de2` after seven rounds of CI fixes, none of them to the flow's own behaviour except two: the pad that opened "Add a player" no longer joins itself, and the kit's frame also re-measured when the window resizes (removed again in PR 136: it was not the fix). The rest were tests that read the wrong thing (Continue replaces Play once a game is saved, the last level has no "next", a question's two buttons sit side by side, the menu has no frame to turn), two types, an unused export and the word scan's two-part keys. One thing is watched, not explained: the turning journey (`journey-sizes`) failed in Chromium alone on three runs and passed on the fourth, the one that also counts the window's resize events, so it may be a rendering race in the test browser and is reported as a flake to fix on its second sighting. | PR 110, PR 123 |
| 5. Implementation audit | Written, in review, 100%. Sound, no critical: six important (a hidden page does not pause the flow; taking over watch mode always starts a new saved game at the first level, in place of Continue; the flow's sound is never tested and the fixture says it is; the watch take-over is tested only as far as the picker; the pad that opens "Add a player" not joining itself has no test; the Chromium turning failure is unexplained), six minor. No golden moves for any fix | `audits/2026-11-15-plan-u-implementation-audit.md` |
| 6. Fixes (plan U) | **PR 136, in CI:** I1 a hidden page now pauses the flow and it stays paused until Keep playing (tested with `host.hide()`); I2 a tap on a watching game opens the newest saved game, not a new one (`places.newestLevel`, `facts().first`); I3 the flow's fixture has cues and sounds and a speaker the tests read: the three `screen.*` cues in order, the press cue, and the music turned down and kept; I4 the watch take-over is walked through the flags to the level and out to the menu (`watching, picking, playing`); I5 the pad that opened Add a player and pressed Done does not join (journey-pad also checks each pad drives its own hero; the party's claims are not readable from outside, so `pad-1` itself is not asserted); I6 see below; M1 the pause button is 12 px plus the safe area; M2 a rule's own message is no longer on the problem screen; M3 the splash picture through the flow, and the name when the picture cannot be read; M5 the pad journey, the turning journey on four more screens, and a check that only a list scrolls; M6 Settings names no main button, written into plan Task 17. **I6:** the window `resize` listener in the kit's frame is removed: the turning journey failed in Chromium three times with it in, so it was never shown to be the fix, and a frame test now proves the frame measures a box resized by style alone. The cause of that journey's failure is **not found**; the diagnostic counters are dropped. Rule: a second sighting of that failure is fixed before any other work, with its text reported the same day. **Second and third sightings (AF 137, AF 139, 2026-11-15), PR 144:** the turning journey said `['tall']` at 844 by 390 after 1.4 s of a test, and the frame test "a box that is resized by its style" got `narrow/tall` for `wide/short`; the first sighting's print had the frame's box turned and its words still `narrow/tall`, with neither the window's `resize` nor a box watcher having fired. The same week Firefox lost a Space (the switch's test, then the button's) and a first try at waiting for `document.hasFocus()` showed it false, with the element focused, in all three engines. **Cause:** Vitest runs the test files of a browser project side by side in frames of one page, and a page has one focus, one keyboard and one frame drawn at full speed: a key went to another file's frame, and a frame out of view stopped drawing so a box that changed size was not heard. **Fix:** the three browser projects run one file at a time (`fileParallelism: false` in `vitest.config.ts`); the waits for a frame keep the page drawing and print what the frame said, its real box and the frames drawn; the button test waits for each key-release press. The engines jobs take longer; if that is too slow, split the files that type or measure a frame into a project of their own and let the rest run side by side. **M4, handoff to plan H's fix stage:** `Input` has no way to read and set its hint counts, so the flow cannot keep them in a `hints` section; give `Input` that and the flow keeps them. The Firefox-only flake of the switch's Space test (seen twice) is fixed in the test by waiting until the page and the switch hold the focus and sending Space once, asserted at exactly two entries; if it fails again with the focus confirmed, it is a product bug in the switch | PR 136 |
| 7. Owner review (plan U) | Not started | |

## Cycle 6: the built-in hero (walk, jump and more, from content)

Spec: [`specs/2026-11-14-content-hero-controls-design.md`](specs/2026-11-14-content-hero-controls-design.md)

Overall: **90%** (the spec, plan H, its audit, the build (PR 101, `b634dce`) and the implementation audit (PR 126) are merged; stage 6, the fixes, follows, then the Owner's review)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Merged (PR 91), 100%. The Owner answered (2026-11-14): walk and jump with the fair-jump numbers, plus double jump, wall jump and dash, each switched on in the file (C); the demo teaches one new move per level, the starter stays walk and jump (B); touch first, then gamepad, then keyboard, with AAA phone controls. Three goldens move once (the template's and the demo's two); no framework golden moves | `specs/2026-11-14-content-hero-controls-design.md` |
| 2. Plan (plan H) | Merged (PR 93), 100%; the audit's fixes are in it. Fifteen tasks (6% each, 10% for the last green run): `moves` in a character file; the eighteen numbers, their limits and the hero's controls; `buzz` in a feel file; `Touching`, what a body stands on and leans against, from Rapier's contact normals; how a hero moves as one pure step; the `moves` plugin, added only when the hero has `moves`; three clips; the golden `moves.json` in four engines, co-op and online; the controls from the tuning file (`startGame` needs no `controls` and no `plugins`); `buzz` through the host; the thumb gestures as rules with no page; the thumb scheme on the page; the words and the key and gamepad hints in six languages; the scheme at five sizes in three browsers; the template moved over. No framework golden moves, `template/replays/level-1.json` moves once, and no dependency is added. Found while planning: no plan owns the feel runtime (dust, shake and freeze are read and not drawn), so plan H builds only the part that buzzes. No Owner question is open | `plans/2026-11-14-built-in-hero.md` |
| 3. Plan audit | Written, in review, 100%. Sound and ready for stage 4: no critical, nine important (the walk started from the speed friction left, so it never held its own number; a refused range said the game still played; a tuning file with no list threw away the code's controls; a level with no view put the floor under the thumbs; nothing proved a touch on an element over a half never walks; the Editors handoff promised a physics-only picture Task 19 does not do and an `Art` `startGame` cannot take; two places for the hero's tuning file; a buzz with no drawn sign beside it; plan T could not see the shared ground answer), five minor. Eight fixed in the plan (one in plan T's plan), one handed on. The feel runtime should be its own plan in this repo (plan F), presentation only, after plan H and before plan D's demo step, starting with a short addendum spec. No Owner question is open | `audits/2026-11-14-built-in-hero-plan-audit.md` |
| 4. Execution (plan H) | Merged (PR 101, `b634dce`), 100%: 15 of 15 tasks built (tests and implementation are pushed together per task; CI is the only place anything runs; every CI job was green on the merged commit). Tasks 1 to 7: `moves` in a character file; the eighteen numbers and the hero's controls; `buzz`; `Touching`; the pure move step; the `moves` plugin; the clips. Tasks 8 to 14: the golden `moves.json` (replay text, co-op and online recorded; the node hash and checks come from the next CI run), the controls from the tuning file, `buzz` through the host, the thumb rules and scheme, the words and hints in six languages, the scheme at five sizes. Task 15: the template's own hero and controls are deleted, its hero says `moves`, and its content gains a tuning file and a feel file; skills and READMEs say so. Rulings: the wall stop is a superset of the spec's; no face change during the wall-jump lock; a wall jump gives the air jumps back; the walk's arrival epsilon is 1e-4; the walk test tolerates 4% (friction); a game with a built-in hero gets its solids from joined boxes (a hero leaning on stacked row boxes caught on the seams); three air jumps in the moves script; the touching test no longer asserts the floor at the end; `feel` is left out of the sim's content (plan F audit); the tuning folder is `content/tunings/`. The template's replay moved once (Task 15), recorded from CI, the Owner saying yes (2026-11-15): finalHash d0da8dfb33f7afc5 to f20369d0e71c0e73, contentHash 22d45e379ac5df24 to 6ca39659adb6c7e5, schemaHash 6dfe31c12bbfab6d to b36a740f6793385f; `tests/golden/moves.json` is new, and the three engines agree on both. The create smoke accepts `code-changed` as well as `diverged` when a rule of the game's own reaches for the hero's body (the rules' shape changes, which `replay` names before it plays) | branch `claude/project-thread-wgynlp`, PR 101 |
| 5. Implementation audit | Merged (PR 126), 100%. Sound, no critical: five important (the dash hint is hidden with the walk hint after three walks; the template's key hint passes `dash: false`; the `create-play` journey never jumps or reaches the spark; the hints come back under a held thumb; the "screen turned" thumb test failed once in Chromium, likely a one-second wait on a `ResizeObserver`), eleven minor, two for the Owner's phone review (a quick walk start is a dash; the template's 15 ms landing buzz). The touch hints' colour and the circles over the floor edge are left to the Owner's card. No golden moves for any fix | `audits/2026-11-15-built-in-hero-implementation-audit.md` |
| 6. Fixes (plan H) | Built, every CI job green, 95% (merges with PR 127): the five important findings (I5: the turned-screen test now waits for the resize itself) and minors M5 (a press outlives a mask) and M6 (a turned tablet keeps a held thumb), each with a test; the Owner's two look choices are in: a dark chip behind the hints' words, and a taller room under the game on a tablet or desktop so the circles leave the floor's edge; the audit's notes M2, M3, M7 and M8 are in the plan. No golden moves. Left for later: M1, M4, M9, M10, M11 and the two phone items for the Owner's real phone | branch `claude/plan-h-fixes`. The leftover minors M1, M4, M10 and M11 are done in their own pull request (a comment on `lockDir`; a kinematic platform's side is not a wall; a real-touch journey in Chromium; a near-miss tuning number is named); M9 follows in its own, because it moves `tests/golden/moves.json` |
| 7. Owner review (plan H) | Not started: the pictures with the dark chip and the circles under the floor edge are in the review page (artifact 8kw9hFfc9WrYEXDGyzcuRo); the Owner will try the two phone items on a real phone | |

## Cycle 5: no default language

Spec: [`specs/2026-11-14-no-default-language-design.md`](specs/2026-11-14-no-default-language-design.md)

Overall: **95%** (the spec, plan W, its audit, the build and the implementation audit are done; the fixes are pushed and wait for CI; stage 7, the Owner's review, follows)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Merged (PR 89), 100%. The Owner answered every question (2026-11-14): players and editor users only, an asked-for language with a flag-only picker on every first visit, the player's own language first, then by first-language speakers, the US flag for English and Mexico's for Spanish, US spelling. No golden moves | `specs/2026-11-14-no-default-language-design.md` |
| 2. Plan (plan W) | Written, in review, 100%. Ten tasks (9% each, 10% for the last green run): the speakers' order and US English; `source` in `automata.toml`; read marks format 2; a locale that answers a language or none, with the picker's rules; every caller passes the player's language (`startGame` now needs a `locale` and refuses to start before a language is chosen); six SVG flags and the picker screen; the template's page; `automata words` and the MCP `words` tool; `automata create --source`; the rule that fails on English named as a fallback, and the docs. No golden moves and no dependency is added. No Owner question is open | `plans/2026-11-14-no-default-language.md` |
| 3. Plan audit (plan W) | Written, fixes applied to the plan in the same pull request, in review; stage at 100%, plan W at 0% built. No critical, five important (the `startGame` guard let a watching locale through: it now tests `asked()`; the flags could not be imported from `locale/` under `through-the-entry`: they live in `web/library/flags/`, a recorded deviation; the no-English rule exempted two whole files: now two lines; the speakers' counts could not be checked, so none goes into code; `automata words --compile` had no owner: plan K Step U), three minor. No golden moves, no dependency, no Owner question | `audits/2026-11-14-no-default-language-plan-audit.md` |
| 4. Execution (plan W) | Built, 100% (Tasks 1 to 10 of 10; the last run, on `d00a135`, is green in every check; Tasks 1 to 5: Tasks 1 to 3 green in CI on `469b875`, Tasks 4 and 5 green on `044e2a9`; Tasks 6 to 10 below). Task 1: the languages are listed by first-language speakers and English is US English (`en-US`, US list joining). Task 2: `source` in `automata.toml` names the language a game's words are written in, and every check runs against it, not against English; `compileWords` takes it as the base language. Task 3: the read marks are format 2 and name the language they were made against (`source`); a format 1 file still reads, as made against English, and marks made against another source are ignored. Task 4: a locale answers a language or none (`asked()`, `suggested()`, `listed()`, `wordsIn`), the picker's rules are `createPicker`, and the words of the library are in each language. Task 5: `startGame` and `startOnlineGame` refuse to start until the player has a language, `words` is always given to input and touch, and a refused rebind is a key and values, never a sentence. Rulings so far: `compileWords` was pulled forward from Task 8 (the new order broke English as its base); a conversation in a game with no words keeps its "no words yet" sentence. The `online` journey's known crate race (`p2-x`, AF PR 85) failed once and passed on one rerun. No golden moved Task 6: six SVG flags (`web/library/flags/`) and the picker screen (`languagePicker`: flags only, Go does nothing until one is chosen, arrows, Enter, Space and the pad walk and press). Task 7: the template's page shows the picker first (`loading`, `picking`, `playing`, `problem`), a kept language skips it, and `index.html` has no `lang` of its own (the page sets it). Task 8: `automata words` lists the translated words nobody has read, each beside the game's own text, and `--read <language> [words]` marks them (the marks file is the only file it writes); the MCP server has a `words` tool (thirteen tools); `check`'s one note for each language says the same. Task 9: `automata create --source <language>` writes the game's own language (left out, the machine's first language the framework has words in; none is a sentence that asks, never English); the marks file is made against it. Task 10: the architecture rule `no-default-language` fails on English named as a language of its own in `src/` (the list of languages and the format 1 marks line are the two lines it allows), and the docs and skills list the languages in the fixed order with a game's own `source`. Further rulings: the flags live in `web/library/flags/`, not `locale/library/flags/` (the plan audit's I2); the fixture page's calls wait for the game to start; the words stop sentence for a key only the translation has was left out (such a game does not load); `emptyReadMarks` is not in the game's content API (unused). No golden moved | branch `claude/project-thread-tgb8f0`, PR 94 |
| 5. Implementation audit (plan W) | Written, in review, 100%. The build is sound and green on `d00a135` (every check); no golden moved, no dependency. No critical, two important (the README never shows `languagePicker`, its `startOnlineGame` example has no `locale` and calls `onlineWords(status)`, and its content rule still says English comes first; PR 94's description had a "Generated by Claude Code" line that `commit-authors` does not catch: the line is taken out, the check's pattern is stage 6's), six minor (three comments still say English; the flags jump when the first is chosen; `create`'s stop sentence always says `my-game`; the new game's `index.html` does not say why it has no `lang`; the rule misses `'en-US'`; the tracker's two 135 counts, fixed here). All nine builder rulings accepted. No Owner question | `audits/2026-11-14-plan-w-implementation-audit.md` |
| 6. Fixes (plan W) | Pushed, in CI, 100% of the audit's findings. I1: the README's first example makes the locale and shows `languagePicker` before `startGame`, the Languages section shows the picker on its own, the `startOnlineGame` example passes `locale` and `onlineWords(status, locale.words)`, "plain English" and "English comes first" are gone (`tests/docs/readme.test.ts` holds all three). I2: `commit-authors` now fails "Generated by Claude Code" and the tool's italic footer, and also "created", "made", "written" and "authored" with or by Claude (its test lists each). M1: three comments and `readMark`'s parameter name say the game's own language. M2: the globe and the title share one 56-pixel box, so choosing a flag moves nothing (a picker journey reads every flag's and Go's top before and after a tap). M3: `create`'s stop sentence uses the folder as typed. M4: the template's `index.html` says why it has no `lang`. M5: the rule fails `'en-US'` too and allows the one `LANGUAGE_TAGS` line. No golden moved, no dependency. The other three repos carry their own copy of `check-commit-authors.ts`: the same widening is theirs to take | branch `claude/project-thread-69qsgb` |
| 7. Owner review | Not started | |

Plan W's handoffs (Task 10): see "Handoffs from plan W" in the Cycle 4 log below.

## Cycle 4: M2, the 2D framework in full

Spec: [`specs/2026-11-14-m2-design.md`](specs/2026-11-14-m2-design.md)

Overall: **5%** (stage 1, the spec, is written and in review; M2 is eleven plans, each running stages 2 to 7)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Written, in review | `specs/2026-11-14-m2-design.md` |
| 2 to 7, per plan | Not started (plans C, I, V and N can start at once) | |
| Plan C (content): 2. Plan | Done (merged, PR 33): twelve tasks, twelve new kinds of file and the widened character and level | `plans/2026-11-14-m2-content.md` |
| Plan C (content): 3. Plan audit | Done, 100%: two critical faults (the content hash, the tileset test) and six important ones fixed in the plan; one Owner question open (the figure and backdrop formats), which holds those two halves of Tasks 3 and 4; plan C at 0% built | `audits/2026-11-14-m2-content-plan-audit.md` |
| Plan C (content): 4. Execution | Done, merged (PR 43, `0c48f3e`), 100% of the plan's tasks: twelve kinds of file, each with a schema, a test and a fixture, the tileset in a level, the full fixture game in four engines, the package and README; `figure` and `backdrop` go to plan A (the Owner's answer); no golden moved | PR 43 |
| Plan C (content): 5. Implementation audit | Written, in review; stage at 100%, plan C at 80%: no critical, two important (a cutscene's `clip` is unchecked and belongs to plan A; the duplicate-id sentence reads "a cues"), eight minor; nine fixes for stage 6; no Owner question | `audits/2026-11-14-m2-content-implementation-audit.md` |
| Plan V (saves and the host port): 2. Plan | Done, 100% (merged, PR 32) | `plans/2026-11-14-m2-saves-host.md` |
| Plan V: 3. Plan audit | Written, in review; stage at 100%, plan V at 20%. Ten findings, all applied to the plan | `audits/2026-11-14-m2-saves-host-plan-audit.md` |
| Plan V: 4. Execution | Done, 100% (all eight tasks, PR 40, green in Node and in Chromium, WebKit and Firefox, and the packed package; merged as `8811935`) | `plans/2026-11-14-m2-saves-host.md`, ticked |
| Plan V: 5. Implementation audit | Written, in review; stage at 100%, plan V at 80%: no critical, one important (a save's label is not checked on write, so a save can be written that its own reader calls damaged, losing the save it replaced), ten minor, five notes; eleven fixes for stage 6; no Owner question | `audits/2026-11-14-m2-saves-host-implementation-audit.md` |
| Plan V: 6. Fixes | Done, **100%** (the implementation audit's 11 fixes; the tests pushed red first, then the fixes; CI green), AutomataFramework PR 55 | `audits/2026-11-14-m2-saves-host-implementation-audit.md` |
| Plan I (input), stage 2: plan | Written, in review; **0%** of the plan built (ten tasks, 10% each) | `plans/2026-11-14-m2-input.md` |
| Plan I (input), stage 3: plan audit | Done, 100%: 3 blocking, 12 should-fix and 5 notes, all applied to the plan; ready for stage 4 | `audits/2026-11-14-m2-input-plan-audit.md` |
| Plan I (input), stage 4: execution | Done, 100%: all ten tasks built, merged (PR 42, `2aa020b`), green on `eb7e32e` | `plans/2026-11-14-m2-input.md` |
| Plan I (input), stage 5: implementation audit | Done, 100%, in review: no critical, two important (both in `addPlayer`), ten minor, five notes; thirteen fixes for stage 6; no Owner question | `audits/2026-11-14-m2-input-implementation-audit.md` |
| Plan I (input), stage 6: fixes | Done, **100%** (the audit's 13 fixes; each test pushed red first, then its fix; CI green), AutomataFramework PR 51 | `audits/2026-11-14-m2-input-implementation-audit.md` |
| Plan N, networking: 2. Plan, 3. Plan audit | Plan written; audit done (stage 3 at 100%), ten findings F1 to F10 applied to the plan, in review; 0% built (12 tasks; Task 11 waits for plan I's `join` and `leave`) | `plans/2026-11-14-m2-networking.md`, `audits/2026-11-14-m2-networking-plan-audit.md` |
| Plan N, networking: 4. Execution | Done, 100% (all 12 tasks built, in PR 44 with every check green: the layers and rules, the wire, the room engine, the client session, proof 1 with the golden `online-two-players`, the room server, the process, the words, `startOnlineGame`, the `online` job with real browsers playing one room, the four-player co-op room, the README); waits for the implementation audit and the owner's `online` required check | PR 44 |
| Plan N, networking: 5. Implementation audit | Done, 100%, in review: no critical; three important (a dropped line tries once to get back in, a quiet room stops the hero after `lead` ticks and `MAX_AHEAD` is never reached, the no-eval promise rests on chunk order: `lib/zod.ts`); eight minor; six notes; all eight rulings accepted; nine fixes for stage 6; no Owner question | `audits/2026-11-14-m2-networking-implementation-audit.md` |
| Plan N, networking: 6. Fixes | Done, 100%: I1, I2 and M1 to M8 merged in PR 63; I3 in its own pull request (`src/lib/no-eval.ts` is now `src/lib/zod.ts`, which sets `jitless` and re-exports `z`; every file under `src/` that names Zod imports it from there; an architecture rule holds them to it; the online journey's page is no longer forced into one script) | PR 63, the I3 pull request |
| Plan P (physics: joints and touch): 2. Plan | Written, in review; twelve tasks; stage at 100%, plan P at 10%; waits on plan C | `plans/2026-11-14-m2-physics.md` |
| Plan P (physics: joints and touch): 3. Plan audit | Written, in review; stage at 100%, plan P at 20%: one critical (a rope's length through `Math.hypot`, now `dmath`'s `hypot`), eight important and nine minor findings, all but one minor applied to the plan; no Owner question; waits on plan C | `audits/2026-11-14-m2-physics-plan-audit.md` |
| Plan P (physics: joints and touch): 4. Execution | Done, 100% (all twelve tasks, AutomataFramework PR 46, every check green on the head): `joints` in a level file (pin, rope), `touch` in a character file (sense, take), the sim's touch events named after the kind, `ctx.events.of`, ropes and pins drawn, the playground game played by key and by thumb in three browsers at five sizes, the package, README and install check; two new goldens (`joints-scene`, `playground`), no existing golden moved | `plans/2026-11-14-m2-physics.md` Note for plans S and T: `sim/create-sim.ts` is 586 lines of the 600 allowed, so whichever of them touches it first moves `describeSchemas` and `register` to `src/features/sim/schema-hash.ts` before adding anything. |
| Plan P (physics: joints and touch): 5. Implementation audit | Written, in review; stage at 100%, plan P at 80%: no critical, one important (the journey never checks the door), seven minor (a wrong sentence for two fixed things, an upright thing on a pin, a pin too small on a phone, the README snippet, the no-body error, writable event payloads, `create-sim.ts` at 586 lines: plans S and T split `schema-hash.ts` out first), five notes; all seven build rulings accepted; eight fixes, none moves a golden; no Owner question | `audits/2026-11-14-m2-physics-implementation-audit.md` |
| Plan P (physics: joints and touch): 6. Fixes | Done, **100%** (the audit's eight fixes; the tests pushed red first, then the fixes; no golden moved), AutomataFramework PR 68 | `audits/2026-11-14-m2-physics-implementation-audit.md` |
| Plan A (art): 2. Plan | Written, in review; fourteen tasks; stage at 100%, plan A at 10%. The `figure` and `backdrop` formats, their painter (our own PNG writer, the same bytes in four engines), clips, tiles, backdrops, the camera, and M1's minors M7 and M8. One Owner question open (these formats, or the old painter ported), which holds every task but 1, 8 and 11 | `plans/2026-11-14-m2-art.md` |
| Plan A (art): 3. Plan audit | Written, in review; stage at 100%, plan A at 20%: no critical, eight important (the camera's limit from the spec, `view.most`; a watched replay's camera after a restore; `heroes()` out of reach of plan U; `sprites.json` on a game later plans grow; shimmer at a fractional scale; plan D's CI job would never merge as described; the painter's rule; and who repaints after an editor's save), twelve minor; all but one applied to the plan. No Owner question open. Answered 2026-11-14: the new formats are the ones (no task waits), painted pictures are committed, and an editor's save writes them too | `audits/2026-11-14-m2-art-plan-audit.md` |
| Plan A (art): 4. Execution | Done, **100%** (all 14 tasks, AutomataFramework PR 78, every check green on `b474f3c`: node 1609 tests, 481 in each of Chromium, Firefox and WebKit, `online` 5, `create-play` 3, `create` on Linux, Windows and macOS). A `figure` and a `backdrop` are two new kinds of file with a painter of our own (`paintFigure`, `paintBackdrop`, a PNG writer in `lib/png.ts`) that makes the same bytes in four engines; a character's `clips`, a level's `tileset`, `backdrop`, `sky`, `ground` and `view`; `automata art` is plan K's wiring of `artFiles` and `artProblems`. The renderer loads and checks the pictures (`loadArt`, `ArtError`), draws tiles, backdrop layers that drift and repeat, props and figures in the right pose and facing, and keeps a camera (`frameHeroes`, `easeShot`, `placeCamera`, whole device pixels) that stops at `view.most`; `Game.heroes()` for plan U; M1's minors M7 and M8 are closed. New goldens `art.json` and `sprites.json`; no existing golden moved. The fifteen pictures are on `ci-screens` under `pr-78/<engine>/art-*.png` and `backdrop.png`. **Known and not fixed:** a one-pixel, slightly darker column shows where a backdrop strip repeats in the screenshot at 1180 by 820 and 1280 by 720 | PR 78 |
| Plan A (art): 5. Implementation audit | Written, fixes applied in the same pull request, in review; stage at 100%, plan A at 80%: no critical, three important (the darker column is a tile's edge reading the next square of a shared texture under antialiasing, not the backdrop: each picture is now a texture of its own; the words named `automata art`, which plan K's Step A has since added (`17a86d6`); an online game ignored `readPicture` and `view`: it now loads the art before joining, and a resync moves the camera straight only past one tile so a rollback keeps the glide), five minor (three fixed); every reported deviation judged, two not accepted and fixed; none moves a golden; no Owner question | `audits/2026-11-14-m2-art-implementation-audit.md` |
| Plan S (audio): 2. Plan | Written, in review; eleven tasks (9% each, 1% for the last green run); stage at 100%, plan S at 10%. A headless `audio` feature (cues, the cue log, sounds, one track, two volumes) over a `Speaker` port, the page's speaker and the "Tap to start the sound" button in `web`, and the three audio kinds taken out of what the sim hashes. No Owner question; three calls marked for the audit | `plans/2026-11-14-m2-audio.md` |
| Plan S (audio): 3. Plan audit | Written, in review; stage at 100%, plan S at 20%: no critical, five important (`sounding.json` on a game of its own; plan A's order no longer applies, the stop rule rewritten; the online game's audio and plan N's `advance` giving steps one by one; the fixture hero's landing at the top of a jump; the three rules the cue log's determinism rests on), ten minor; all applied to the plan. No Owner question | `audits/2026-11-14-m2-audio-plan-audit.md` |
| Plan S (audio): 4. Execution | Done, **100%** (all eleven tasks, each test pushed red before its code; `audio` is on the headless entry; the sounding run's golden `tests/golden/sounding.json` was recorded in CI, and moved once, inside this PR, when the plan L audit's point was applied: `simContent` also drops the project's list of sound, music and cue files, so listing one moves no hash; no golden on `main` moved), AutomataFramework PR 61. Open for the audit: the `online` journey's rollback check failed once and passed on the next run | `plans/2026-11-14-m2-audio.md` |
| Plan S (audio): 5. Implementation audit | Written, in review; stage at 100%, plan S at 80%: no critical, two important (the session's rollback count missed every correction on a page slower than its lead, which is the `online` journey's flake; the sound journey proved less than the plan asked, and nothing in Firefox), four minor noted, two notes; all four build deviations accepted; three fixes in the same pull request, tests red first, none moves a golden; no Owner question | `audits/2026-11-14-m2-audio-implementation-audit.md` |
| Plan T (story): 2. Plan | Written, in review; fourteen tasks; stage at 100%, plan T at 10%. Behaviour rules, conversations and cutscenes run in the sim (in `level`, switched on by content, so no recorded hash moves), stepped by three commands; a new page feature, `story`, shows the speech box and the cutscene's camera. Task 11 (the camera, and an actor's clip and face) waits for plan A to be built; no Owner question | `plans/2026-11-14-m2-story.md` |
| Plan T (story): 3. Plan audit | Written, in review; stage at 100%, plan T at 20%: no critical, five important (the press that closes the box jumped; a continued game's start was not in its replay, and `watchReplay` dropped it; a fast Enter skipped the cutscene after the lines; four choices could not fit a sideways phone; the box's keys fought the game's), eleven minor, five journeys added; all applied to the plan or handed on. One Owner question open (when the keeper talks: every visit, until finished once, or a Talk button), which holds only Task 6's opening rule | `audits/2026-11-14-m2-story-plan-audit.md` |
| Plan K (the `automata` command, MCP and skills): 2. Plan | Written, in review; stage at 100%, plan K at 10%. Part 1 is fifteen tasks that `main` can take today: a Node-only `cli` feature behind the package's `automata` bin; `check` (files, rules, lint, types, replays, tests), `replay` (with `--accept` and `--state`), `create` from a template that is a real game in `template/`, `play`, four skills, and `mcp` (our own small server, with headless play sessions); replay format 2 with `code-changed` (M4), the replay file's own checks (M5) and the packed declarations (M9); a journey that follows the README in a clean folder on Linux, Windows and macOS and plays the new game in three browsers. Part 2 is six small steps, one after each of plans A, P, S, T, L and U, that give the template that plan's built-in. One Owner question open (how `mcp` speaks MCP: a development-only dependency or none), which holds Task 11; the template works under either answer to plan A's question on committed pictures | `plans/2026-11-14-m2-cli.md` |
| Plan K (the `automata` command, MCP and skills): 3. Plan audit | Written, in review; stage at 100%, plan K at 20%: one critical (a running `automata mcp` answered from the game's code as first loaded, so an agent was told "as recorded" after changing the rules: game code now runs in a child or a Worker), eight important (a bare `npx automata` fetches npm's unrelated `automata`; the README's `github:` route needed pnpm; the template's recording is a golden nobody else knew of; painted atlases would fail the `files` step; the create and online journeys would run each other; `play` never ran off Linux; a first-time player was told no keys; the README's first command and the smoke's differed), twenty minor, seven end-to-end checks added; all applied to the plan or handed on. One Owner question open (Q1, how `mcp` speaks MCP), which holds Task 11 | `audits/2026-11-14-m2-cli-plan-audit.md` |
| Plan K (the `automata` command, MCP and skills): 4. Execution | In review, **100%** (all fifteen tasks built, AutomataFramework PR 71; the Owner answered Q1 with (b), so `automata mcp` is our own server with the official SDK as a development-only dependency that one test uses). `automata create`, `check`, `replay`, `play` and `mcp` (eleven tools: the three commands, `content_types`, `schema`, `skill`, and five `play_` tools that run a session in a Worker), four skills, the `actions` list the template exports, replay format 2 with `code-changed`, the replay file's own checks, the packed declarations, the README's first section, `create-smoke` (Linux, Windows, macOS; it now talks to `automata mcp` with raw JSON lines and changes the rules under the running server) and `create-play` (real browsers, five sizes). Two new goldens: `tests/golden/schema-hash.json` and `template/replays/level-1.json`; no golden on `main` moved. Tests were pushed with the code, not red first | `plans/2026-11-14-m2-cli.md` |
| Plan K (the `automata` command, MCP and skills): 5. Implementation audit | Written, fixes applied in the same pull request, in review; stage at 100%, plan K at 75% (Part 1 built and audited, Step P built; the other five template steps wait on their plans): no critical, two important (what a game's rules print broke `--json`, and through a play session's Worker the MCP protocol itself; a recording that started with nobody, as a co-op room's does, was played with player 1, undoing the plan audit's M16), seven minor (words after the folder dropped, `play_step` reading `"01"` as player 1, `play_save` writing over a recording, `play` saying "Starting" before "not installed", a recording in a folder under `replays/`, `create`'s `cd` line with a space, Task 15's boxes); every reported deviation accepted; nine fixes, none moves a golden; no Owner question | `audits/2026-11-14-m2-plan-k-implementation-audit.md` |
| Plan K (the `automata` command, MCP and skills): 5. Implementation audit of Part 2 Steps P, L and A | Written, fixes applied in the same pull request (AutomataFramework PR 87), in review; stage at 100%, plan K stays at 75% (Steps S, T and U wait on their plans): no critical, three important (skill `automata` and the template's `AGENTS.md` still sent a word to `src/features/page/`: fixed; the page's missing-picture screen was English only, told the player to fix a painted file and had no test: fixed with two new words in six languages; no command marks a language as read, which plan L handed to Step L: the Owner chose `automata words`, with no language as the fixed source, so it is built after plan L gives a game its own source language), six minor (one fixed); no golden moves | `audits/2026-11-14-m2-plan-k-part2-implementation-audit.md` |
| Plan L (languages): 2. Plan | Written, in review; eleven tasks (9% each, 1% for the last green run) and a twelfth held; stage at 100%, plan L at 10%. A headless `locale` feature right above `host` (which language a player gets, words by key with `{name}` values, the `language` settings section, level names and save labels), the framework's own sentences in six languages, a check that says which words are not translated, marks for a native speaker's read, and the words taken out of what the sim hashes. One Owner question open (Paraglide: use it, or leave it out of M2 with a written reason), which holds only Task 12 | `plans/2026-11-14-m2-languages.md` |
| Plan L (languages): 3. Plan audit | Written, in review; stage at 100%, plan L at 20%: one critical (Task 1 kept the list of words files in the hash, so adding or dropping a language still moved every hash, Examples' `level-1.json` included: `simContent` now drops those `project.content` entries too, and plan S's has the same hole), three important (the touch buttons' own words could not be translated or changed, now `controls.<action>` and `Touch.relabel`; the Spanish was Spain's, not Latin America's; the overlay had no way to change its label), ten minor, three journey checks added; all fixed in the plan. The Owner question on Paraglide is still open (the audit agrees with leaving it out of M2) and holds only Task 12 | `audits/2026-11-14-m2-languages-plan-audit.md` |
| Plan L (languages): 4. Execution | Done, **100%** for Tasks 1 to 11 (Task 12, Paraglide, is its own pull request, PR 82, and is not in this number), AutomataFramework PR 76 (Task 1 merged alone as PR 73). `locale` sits right above `host` and runs in Node: `createLocale` picks the language (saved, host, device, English), words are read by key with `{name}` values, the pick is kept in the `language` settings section, `followLanguage` sets `<html lang>`, and the framework's own sentences (the room's status, why a join is refused, the touch overlay's label) are in six languages in `src/features/locale/library/`. `translationProblems` and the read marks (`automata.translations.toml`) are checks of their own, not part of `loadGame`. Node tests 1403; the language journeys run in Chromium, WebKit and Firefox, and the online journey has a Spanish page. No golden moved and no schema changed. The pictures on `ci-screens` draw every language's letters in all three browsers. **Before Release 1:** every framework and demo word has a read mark, so `unreadWords` is empty. Today 145 of the framework's words (29 for each of five languages, since plan W added the picker's two) and the demo game's 45 wait for a native speaker's read | `plans/2026-11-14-m2-languages.md` |
| Plan L (languages): 5. Implementation audit | Written, in review; stage at 100%, plan L at 80%: no critical, three important (the sound's button stayed English, though plan L came after plan S; a refused change of key was English only, in a feature below `locale`; Paraglide's two packages were installed by every game though nothing a game installs loads them, now development dependencies until a command runs the compiler), four minor, all fixed in the same pull request with their tests first; seven of the builder's rulings accepted; no golden moved. The Owner's new direction (no default language) is its own spec. The framework words waiting for a native read are now 135 (27 keys, five languages) | `audits/2026-11-14-m2-plan-l-implementation-audit.md` |

### Log
- 2026-11-14, plan W (no default language), execution: Tasks 1 to 10 built on PR 94. The framework's library now has 29 words in
  each language, so 145 words wait for a native speaker's read before Release 1 (the "135" lines below are history).
  Handoffs from plan W:
  - **Plan U (screens):** the default flow is Warnings (if needed), Language picker, Splash, Main menu, Gameplay (with pause),
    Main menu. The picker is `languagePicker` and is already the template page's first step; plan U moves it into the flow
    between the warnings and the splash. Settings' language part is `languageRow` over `locale.listed()` with `locale.set`.
    `padMenu` gives a screen gamepad presses while no game runs. `automata.saves.refused.*` (plan L's audit, M3) joins the
    library in all six.
  - **Plan D (Examples):** `source = "en"` in the demo's `automata.toml`, written in the same change as its first messages
    file (a `source` with no words file is a load problem, and the demo has none today); marks to format 2; the page shows
    the picker on a first visit, and in watch mode makes its locale with `watching: true` and, when a player takes over,
    shows the picker whenever `!locale.asked()` (never by testing `language()`, which a watching locale has);
    `--automata-picker-chosen` is Peach Red; the picker's title needs the demo's Korean, Japanese and Chinese fonts; the
    `ci-screens` pictures add the picker at the five sizes; `startGame` now needs `locale`; the pin moves to the commit that
    lands this plan. Neither golden moves.
  - **Editors:** no call they make changes shape (`loadGame`, `parseProject`, `parseContent`, `writeContent` and the level
    helpers). When their pin moves, a game with words and no `source` shows the load sentence; their fixture game lists no
    words, so no test there moves. The nine flags and the editors' own picker are M3.
  - **Plan K:** `compileWords` takes the `source` as its base language. The two inlang packages stay development dependencies
    and `bindParaglide` still has no command that makes its `runtime.js`; plan K Step U wires `automata words --compile
    <outdir>` and moves the two packages to `dependencies` (`tests/package.test.ts` says so), since plan U is the first to
    show a game's words through Paraglide on a page. The coordinator may move it.
  - **The other repos' `CLAUDE.md` pages** list the languages in the old order; each is corrected with that repo's next pull
    request.

- 2026-11-14, the editors' Blueprint redesign, Task 2 (AutomataFrameworkEditors plan): `createLevelPicture`, a level drawn
  still with room kept clear on four sides, for the editors' level screen and card pictures. The same pull request fixes
  a break found moving the editors' pin: `scripts/fix-dts.ts` ran in a package installed from git, which unpacks under
  `node_modules`, where Node refuses to strip types, so no commit since that script landed could be a git dependency. It
  is `fix-dts.mjs` now.
- 2026-11-14, plan L (languages): implementation audit written, AutomataFramework PR 88. `automata.sound.start` and six
  `automata.rebind.*` sentences join the library in six languages: the sound's button follows the locale, and a refused
  `rebind` is a key and values said in the input's words. `createLocale` asks its host for its two languages only; the
  words compiler removes only a word's own generated file; Paraglide's packages are `devDependencies` while no command
  loads them (plan W's `automata words` does not compile, so they stay development dependencies until plan K Step U wires
  `automata words --compile`). Before Release 1: 145 framework words (since plan W) and the
  full game's 45 wait for a native read.

- 2026-11-14, plan K, Part 2 Steps P, L and A, implementation audit: skill `automata` and the template's `AGENTS.md` now send
  a word to `content/messages/`, not to the page; a picture that was never painted is said in the player's language with
  "Run npm run art", two new words in all six messages files (`page.problem-title`, `page.paint-again`), tested in the
  page's browser test. The Owner answered Q1: `automata words`, built once a game names its own source language (English is not the default).
- 2026-11-14, plan K, Part 2 step A: `automata art` is the sixth command (`src/features/cli/art.ts`, from plan A's
  `scripts/art.ts`, which is removed with its `package.json` script; its test is `tests/features/cli/art.test.ts` with every
  assertion kept, now over files in memory). `check` has an `art` step after `files`, `play` and `create` paint first, and the
  files step does not call a painted atlas unlisted. The MCP server has an `art` tool (twelve now). The template's hero and crate
  each have a figure (`content/figures/`), the page passes `readPicture`, and an `ArtError` is shown as a problem, not as "try
  another browser". The Owner's answer was (a), pictures committed in a game: the template's `gitignore` does not list them and
  its `AGENTS.md` says to commit them; in this repo they are ignored, since `create` paints them. Skills: `automata` names the
  command, and `automata-content` says to run it after a figure or a backdrop. The recording moves (`Sprite` joins the sim);
  re-recorded in CI in a commit that names it, with the hashes sent to the coordinator.
- 2026-11-14, plan K (the `automata` command): the implementation audit is written and its fixes applied. A game's
  rules that print now leave `--json` and `automata mcp` alone: `main` points `console.log` at stderr under `--json`,
  and a play session's Worker writes its output to stderr, not into the protocol; the smoke's rule change now prints
  on every tick on three systems to prove it. A recording whose `meta.players` is `''` is played with nobody again.
- 2026-11-14, plan K, Part 2 step L: the template has `content/messages/` in all six languages (every word its page shows:
  the touch buttons, the key hint and each key's name, the level's name, and "could not start") and an
  `automata.translations.toml` with no marks yet; the page makes a locale from them and follows it, so a device that
  speaks Japanese is told the keys in Japanese. `automata check`'s `files` step adds `translationProblems`, and prints
  `unreadWords` as a note with a count for each language, never a failure. The recording should not move (words are
  not in the sim's hash); if CI says it did, it is re-recorded in a named commit. Open for the Owner: a command that marks a
  language as read (plan L named it plan K's to name) is not built, since no step of plan K's text asks for it.
- 2026-11-14, plan K, Part 2 step P: the template's level gains a spark (`content/characters/spark.json`, `"touch": "take"`),
  and the hero's rules count it from `spark.taken` into a `hero.score` resource (`template/src/features/hero/score.ts`).
  `automata-rules` gains "Answering an event". The recorded play `template/replays/level-1.json` moves (the hero now takes
  the spark on the way; before: `caf2ae13ae5ba7d4`), re-recorded in CI in a commit that names it. Tests: the template's
  own, the parity replay, the skill, one assertion in `create-smoke.mjs` and one in the create journey. Part 2 is now 5%
  of 30% done.
- 2026-11-14, plan S (audio): the implementation audit is written. The `online` journey's one failure was real: a
  page whose frame took longer than its lead confirmed past its own guess, and the old rule counted no rollback, so
  the count is now of guesses the room put right, and the journey's friend has a slow line from the let-go on, so a correction is certain. A second sighting of
  the same failure was on another branch (job 132442260066).
- 2026-11-14, plan K (the `automata` command): Task 11 built after the Owner's answer (b). The server is about two
  hundred lines on JSON-RPC over lines; `create`, `check` and `replay` run as `automata <words> --json` in a child,
  a play session in a Worker, and neither the server nor its tools import a game's code (a test reads the imports).
  The official SDK client connects to the real command in a Node test, and the smoke speaks to the installed one
  with raw lines on three systems.
- 2026-11-14, plan K (the `automata` command): executed, all but Task 11. Game code runs only in a child process
  (`--json`) or a Worker (play sessions), so a session started after the rules changed plays the new rules (audit
  C1); the README and the skills write `npx --no automata`, never a bare `npx automata`. Windows needed three
  things: a `.cmd` tool is started from one quoted string, the framework folder is never `realpath`ed (8.3 names
  made two copies of it), and the smoke reads JSON from stdout alone. A recording with no players in its meta plays
  for player 1. The template exports `actions`, which `play` sessions check a held action against. Held for the
  Owner (Q1): the `mcp` server, `Runner.command`, the README's MCP section and the smoke's MCP step.
- 2026-11-14, plan S (audio): executed. The game hears its events on their own ticks, online too (`Advance`
  gained `steps`, one entry per tick the page predicted, and the page calls `audio.begin()` after a sync). The
  sound button is a browser journey with the real speaker on five screens; Firefox on a runner with no sound card
  leaves the sound waiting, and the test only asks that the button is there exactly while the sound is not on.
  `knip` ignored `audio.ts` until the headless entry exported it (Task 11); the ignore is gone.
- 2026-11-14, plan L (languages), Task 12 (Paraglide, the Owner said yes: "localization is first class"): built in its own
  pull request, AutomataFramework PR 82; every check green on the head. `compileWords` (the `cli` feature) makes the
  inlang project in a temporary folder for each compile, runs Paraglide with the `baseLocale` strategy only, and copies
  only what differs into the game's `outdir` (a second compile writes nothing; a word taken out loses its file; an
  `outdir` inside `content/`, absolute, or with `..` is refused in words; two words that would be one function name
  are named). `bindParaglide(runtime, locale)` makes a generated runtime answer in the locale's language. Both
  packages are named by `src/features/cli/words.ts` alone (architecture rule, package test, `knip.json` ignore) and
  loaded only when words compile. No command runs `compileWords` yet. Node tests 1622.
- 2026-11-14, plan L (languages): executed (Tasks 1 to 11; Task 12 waits for its own pull request). The framework's
  features below `locale` answer with a key and its values (`Message`), and `locale.say` turns them into words, so
  `net` and `game` carry no English of their own. A device's `ko_KR.UTF-8` and `pt-BR` find their language; a saved
  language the game lacks is left stored and not used; a refused store changes the language for the visit and says
  so. Each journey page reads its settings from its script's address, because a frame made from `srcdoc` has none.
- 2026-11-14, plan L (languages): the plan audit is written. Task 1 stands alone and is the right fix, but it kept
  `project.content`, which lists every words file, so a language added or dropped still moved every hash (and would
  have moved Examples' golden when plan D adds the demo's words); fixed, and passed to plan S, whose `simContent`
  has the same hole. The touch buttons' words become messages a game may give, and the overlay can be relabelled.
  Paraglide is still the Owner's to answer; the audit recommends leaving it out of M2.
- 2026-11-14, plan L (languages): the plan is written. Words are content read at run time: `locale` picks the
  language (saved, then the host's, then the device's, then English), looks a word up by key and fills in its
  values. Features below it answer with a key and its values, never a sentence. A game's words leave what the sim
  hashes, so a translation moves no replay; no golden on `main` lists a messages file, and Task 1 can go first as
  its own pull request so plan T's `story.json` never moves. The missing-translation check is its own function,
  not part of `loadGame`: a game with a word missing still runs, in English for that word, and CI fails. Read
  marks are kept by the texts that were read, so a changed word waits again by itself. Asked of the Owner through
  the coordinator: Paraglide as the spec says (one more package to approve), or left out of M2 with a reason.
- 2026-11-14, plan K (the `automata` command): the plan is written. The command is a `bin` of the framework's own
  package, built from a new Node-only feature, `cli`, on Effect; each command runs in a test on files in memory. A
  game is read and run with the framework that game installed, and its rules are found by one name, `gamePlugins`
  in `src/headless.ts`. Changed content passes `check` with a note; changed rules and a diverged play fail it, and
  `automata replay --accept` records again. The template is a real game in `template/`, checked here like any game.
  An agent's "running game" is a headless session it steps and reads over MCP. The template is built for what
  `main` has now and grows by one step per later plan. Asked of the Owner through the coordinator: whether the
  official MCP SDK joins as a development-only dependency.
- 2026-11-14, plan T (story): the plan audit is written. The sim's part in `level` holds and no golden moves. Fixed in
  the plan: a player let go takes this tick's controls with no press; `meta.story` records where a continued game
  started; a skip counts only after `SKIP_AFTER` ticks; the box's buttons always fit; the box hears its own keys and
  leaves a sharing player's alone. Q1 (when the keeper talks) is with the Owner.
- 2026-11-14, plan S (audio): the plan audit. Task 1 is sound and has no order to keep: plan A's `sprites.json` is no
  longer on the full game, and no golden on `main` or a branch is from a game with audio files. Audio cannot reach
  the sim or move a golden. Fixed in the plan: the sounding run and its golden play a game of their own; the fixture
  hero lands only after falling; page sounds are not counted by the limits, waiting ones are, and a page event before
  any step is tick 0; an online game calls `hear` once per fresh step (passed to plan N); `audio` joins the pure
  features. No Owner question.
- 2026-11-14, plan T (story): the plan is written. What decides is in `level`, beside `join`: a `Mind` component
  and a behaviour system for a character with a `behaviour`, and a `Story` resource for conversations and
  cutscenes, moved by the commands `story.next`, `story.choose` and `story.skip`, so a replay has every press. A
  conversation opens when a hero walks up; the sim holds the talker's hands itself, and everyone's in a cutscene.
  What shows is the new page feature `story`: a speech box in plain words and the cutscene's camera, which read
  the sim's state and decide nothing. Four optional fields join content (`name` and `conversation` on a character,
  `cutscene` on a conversation's node, `opens` on a cutscene). Goldens are recorded on a story fixture of its own.
- 2026-11-14, plan S (audio): the plan is written. `audio` is headless and is handed a step's events, never the
  sim, so it has nothing to change; it keeps a cue log of what was asked for and plays through a `Speaker` port
  (`testSpeaker` in Node, `webSpeaker` on Web Audio in `web`). Music is handed to the speaker a little ahead of the
  speaker's own clock. Task 1 leaves `sounds`, `music` and `cues` out of the content the sim hashes, so changing a
  sound moves no hash; no recorded golden is from a game with audio files. The framework draws the "Tap to start
  the sound" button until plan U's screens take it over. No new dependency.
- 2026-11-14, plan A (art): the Owner answered audit I7 with (a). Painted pictures are committed in the game's repo, and an editor's save writes the pictures and atlases for what it changed in the same commit, because people may need to share them. The plan's handoffs to plan D and the Editors say so; no task changes. The format question is settled too: the Owner chose the new formats, so no task waits and stage 4 may start.
- 2026-11-14, plan A (art): the plan audit. The no-golden-moves claims and the PNG writer's determinism hold. Fixed in the plan: the camera stops at `view.most` (the spec's limit), which plan D's pull-along reads; a restore puts the camera straight on its shot; `Game.heroes()` for plan U; `sprites.json` on a game of its own; the level's offset in whole pixels; the painter's rule covers the clock and I/O; plan D's pictures go through a `ci-art` branch the thread fetches. Asked of the Owner: whether painted pictures are committed, and so who repaints one after an editor's save.
- 2026-11-14: plan V's implementation audit. Nothing critical; all six of the build's deviations are accepted. V1: `save`
  writes any label, but the reader refuses one that is empty or over 80 characters, so the new save lists as damaged
  and the one it replaced is gone. Ten minor fixes (storage switched off answers `failed`, a rejecting store, two tabs
  undoing each other's settings, a throwing listener, freezing the caller's object, words in a doc and the README,
  the journey's damaged case, the settings format check, the contract's two type names) go in the fixes branch.
- 2026-11-14, plan A (art): the plan is written. A `figure` is parts with poses and paints anything (a character,
  a tile, a prop); a `backdrop` is layers that repeat and drift, with figures as props. Both are painted by the
  `content` feature with no page and no Node in it, into a PNG our own writer makes, so `automata art`, a browser
  and the M3 builders give the same bytes. Which pose shows is sim state (`Sprite`), switched on by content, so no
  recorded hash moves. Asked of the Owner through the coordinator: these formats, or the old painter ported.
- 2026-11-14: plan V executed (PR 40). `saves` (slots, one settings record, versions and upgrades), the grown `Host`
  port with `testHost`, and the `web` feature (`webHost` with seams, saves in `localStorage`). Two things differ from
  the plan, both recorded in the plan's Task 7 and the PR: a frame's page is loaded with a `<script src>` (WebKit
  never settled an inline `import()` in a `srcdoc` frame), and every task that changed the public surface also
  regenerated `docs/api/framework.api.md`, since CI checks it on every pull request.
- 2026-11-14: plan I's implementation audit. Nothing critical. I1: removing a player and adding one before the
  game steps answers "yes" and adds nobody; I2: `addPlayer` cannot see a claim made through `game.input.claim`, so one
  gamepad can drive two heroes. Ten minor fixes (touch through a pause, triggers, a reason, `ListedPad`, and tests)
  go in the same fixes branch; fixes 1 to 3 come before plan U's pause and "Add a player" screens.
- 2026-11-14: plan V's audit. Three major findings, fixed in the plan: `host` moves below `locale`, `ui` and
  `screens` in the layers (they read it); both entries export `z`, so a game that may import only the framework can
  write a save's schema; `input` and `audio` export their settings' schemas and plan U makes the sections. The
  contract's `Host.saves` is now `Host.store`.
- 2026-11-14, plan N (networking): the plan is written. Two new features, `net` (the wire, the room's rules, the
  client's two sims with rollback) and `server` (the Colyseus room, the process on Effect), a third package entry
  `/server`, and three proofs: a scripted two-player run in four engines with a golden, two headless players over
  real sockets, and two real browsers against a server CI starts. Nothing is deployed.
- 2026-11-14: the M2 spec, with the Owner's answers: the demo has same-screen co-op for 2 to 4 players, and online
  play is built and proven in CI, not deployed; the showcase is one short real game of three levels plus a "What's
  inside" page. M2 is cut into small plans that can run side by side.

## Cycle 3: the demo game plays itself (watch mode)

Spec: [`specs/2026-11-14-watch-mode-design.md`](specs/2026-11-14-watch-mode-design.md). The plan, its audit and the
tracker for the other three parts are in AutomataFrameworkExamples (`docs/superpowers/plans/2026-11-14-watch-mode.md`).
This repo has Part A only: one function.

| Task | State |
|---|---|
| 1. `watchReplay` draws a replay with no input | Done, 100% (merged, PR 29, `cc281c9`) |
| The Owner's answers, Q1 (a), Q2 (a), Q3 (b), Q4 (a) | Recorded in the spec addendum, 2026-11-14 |
| Stage 6, F1: `rounds` stops on the recording's last tick even when a late frame carries several ticks | Done, 100% (a guard at the top of `step`, and a test that delivers the end in one frame of four ticks), in review |
| Stage 6, F4 (the Owner chose to swap the package): Rapier's binary is its own file, not base64 in a script | Written, in review: the plain `@dimforge/rapier2d-deterministic` 0.21.0 (a development dependency now, since its code is built into the framework's files) replaces `-compat`; `vite-rapier-wasm.ts` answers the package's wasm import and emits `dist/rapier_wasm2d_bg.wasm` (2.4 MB, 933 kB gzipped) and `dist/rapier.LICENSE`; `physics/rapier-wasm.ts` gives the instance to the package, with the bytes read by a module the plugin writes (from disk in Node, fetched elsewhere; I/O stays out of `src`, as the sim's purity rule needs). Same Rapier, same version, same binary, so no golden may move; CI's four engines and the packed install are the proof |

## Cycle 1: the 2D first layer

Spec: [`specs/2026-11-13-2d-first-layer-design.md`](specs/2026-11-13-2d-first-layer-design.md)

Overall: **44%** (stages 1 to 3 are 12 points, stage 4 is worth 18, stage 5 is worth 8 and stage 6 is worth 6, so the
figure is 12 + 18 + 8 + 6; stage 4 is now whole, because publishing 0.1.0 is no longer part of M1, see the log)

| Stage | State | Output |
|---|---|---|
| 1. Spec | Done, 100% (merged, PR 1) | `specs/2026-11-13-2d-first-layer-design.md` |
| 2. Plan (M1, framework) | Done, 100% (merged, PR 3) | `plans/2026-11-13-m1-thin-thread-framework.md` |
| 3. Plan audit | Done, 100% (merged) | `audits/2026-11-13-m1-framework-plan-audit.md` |
| 4. Execution | Done, 100% (merged, PR 6, `b7b672f`; Task 15's publish step is deferred to Release 1) | `docs/superpowers/plans/2026-11-13-m1-thin-thread-framework.md`, ticked as it goes |
| 5. Implementation audit | Done, 100% (in review) | `audits/2026-11-13-m1-framework-implementation-audit.md` |
| 6. Fixes | Done, 100% (PR 9, green on all four engines; F4's layout in PR 14, green) | `audits/2026-11-13-m1-framework-implementation-audit.md`, F1 to F8 |
| 7. Owner review | Not started | |

Milestones (each runs stages 2 to 7 per repo):

| Milestone | State |
|---|---|
| M1 The thin thread | Framework: built, audited and fixed (PR 9); publishing deferred to Release 1. Examples, Editors, Site: waiting for their repos, then one plan each |
| M2 The framework in full | Not started |
| M3 The editors in full | Not started |
| M4 The site and publishing | Not started |

Releases (the Owner, 2026-11-13; the spec's Releases section): nothing is published per milestone.

| Release | What ships | State |
|---|---|---|
| 1 | 2D finished: framework in full and the demo game (M1, M2) | Not started; `release.yml` is manual-only until then |
| 2 | The 2D editors (M3) | Not started |
| 3 | The website (M4's site) | Not started |
| 4 | Distribution (M4's publishing) | Not started |
| 5 | 3D, then the loop repeats for 3D | Not started |

### Log

- 2026-11-14: a level file may set `sky` and `ground` (`#rrggbb`, both optional, default the old light blue and slate), in
  pull request 25. Asked for by the Owner's choice of palette No. 276 for the example games' art, whose sky and ground
  were framework constants no content file could change. A level that sets neither is unchanged, goldens included.
- 2026-11-14: The touch buttons read their look from seven `--automata-touch-*` CSS properties (today's look is the
  default), and carry the classes `automata-touch` and `automata-touch-button` and `data-action`, so the demo game's
  Blueprint look (Examples cycle 2) needs no more than CSS. No change to the public API and none to the progress
  figure.
- 2026-11-14: The spec's Visual direction takes its colours from "A Dictionary of Color Combinations" (the Owner):
  No. 325 for the site, No. 310 for the editors, No. 340 for the demo game's screens and No. 276 for the example
  games' own art, replacing the Blueprint blue and yellow and the tint per editor. The product is "Automata
  Framework" and its wordmark is the word "automata". Fonts: Fraunces, Onest and JetBrains Mono for the site and
  the editors; Fredoka with rounded Japanese, Korean and Chinese partners for the demo's screens and the demo
  games; IBM Plex Sans Condensed leaves the UI. Layout, type, icons and the drawing notes are unchanged. No
  change to the progress figure.
- 2026-11-14: The spec gains a Visual direction section (the Owner): Blueprint as the editors' and the site's skin,
  dark by default, canvas first with floating tools, a drawing-notes layer over the game's real art, Phosphor
  regular icons as an approved dependency, and the Examples demo game's screens in the same look. No change to the
  progress figure.
- 2026-11-13: The spec combines the editors into five (the Owner): World (Levels, Tiles, the environment builder),
  Characters (the figure builder, clips and entity kinds, Schematic), Feel (Feel, Tuner), Sound (Audio) and Story
  (Writer, Sequence). World and Characters have a 2D and a 3D version; the 2D ones work the way the old 3D builders
  did. M1's Levels editor is the start of World; M3's first slice is Feel, with Tuner inside it. Spec change only.

- 2026-11-13: F4 pulled forward from M2 (the Owner: fix it now). Root cause of the cut-off pictures: Vitest's browser page
  is 414 by 896 by default, so the sideways and tablet pictures were clipped there (the white strip and the missing
  Jump button were off the page, not missing from the game). The real problem under it, the buttons sitting over the
  level, is fixed in PR 14: the level is fitted above the buttons. Details in "F4 follow-up" below.

- 2026-11-13: The spec follows the Owner's answers to the Editors' plan audit: someone who has not signed in can
  open only the demo game (every other game is its team's), and keeping a copy gives the level's JSON to paste back
  into an agent or a game's files. "Try it now" opens the demo game.
- 2026-11-13: The spec follows the Owner's decisions made while the Editors' M1 plan was written: the editors are for
  teams; sign-in is a GitHub App, which does the editors' GitHub work through Pages Functions; five access levels kept
  in `automata.access.toml` with a Share screen, all in M1; Save commits straight in for Edit and Owner levels and
  opens a suggestion for the rest. The plan is in AutomataFrameworkEditors (PR 1). Added the same day: the editors
  change authorable content only (the JSON files); anyone can use them without signing in and keep a copy, and
  saving or working with others needs a sign-in.
- 2026-11-13: `package.json` gains `"prepare": "pnpm build"`. Found while planning Examples' M1: a git install of
  this package had no `dist/` (it is not committed, and a package manager builds a git dependency only when it has a
  `prepare` script). Tried with pnpm 10.34.6: with the script, `dist/` is built on install. The consuming repo must
  also allow the build, by listing the pinned source in its `pnpm.onlyBuiltDependencies`. Every pin in Examples,
  Editors and Site must be this change's merge commit or newer. `tests/package.test.ts` keeps the script there.
- 2026-11-13: The Owner chose how Examples gets the framework before Release 1: a git dependency pinned to a commit on
  the framework's `main`, moved by pull request; npm from Release 1. Recorded in the spec's Releases section.
- 2026-11-13: Release policy (the Owner): releases are big and few, Release 1 to 5 as above; small releases come back
  only once the product is feature complete. `release.yml` no longer starts when `ci` passes on `main`: it runs only by
  hand, from `main`, and first checks that `ci` passed for a push of that commit. Publishing 0.1.0 is no longer a
  done-criterion of M1; Task 15's Step 5 (the publish) is deferred to Release 1. How the Examples repo gets the
  framework before Release 1 was left to the Owner (answered, see above).
- 2026-11-13: Stage 1. Spec written from the Owner's brainstorm, then updated with the Owner's answers (sign-in on Cloudflare
  Pages, file formats, languages, Android, GitHub-style merges, protected main). Open items are in the spec.
- 2026-11-13: Stage 2. The framework's M1 plan written: 15 tasks, from the repo's skeleton and CI to publishing 0.1.0.
  The sim core and the Rapier integration are lifted from AutomataFrameworkFailed@ed8592e8; the rest is fresh. Stages 2
  to 7 above track this plan; the other three repos' M1 plans are written in their own repos once the Owner creates
  them. The Owner's answers the same day: the npm scope is `@automataframework` (the spec and `CLAUDE.md` still say
  `@automata` and need a follow-up edit); `@types/node` and `@vitest/browser-playwright` are approved; the old repo's
  hosted-runner refusals came from it being private.
- 2026-11-13: Stage 3. The plan audit: the plan matches the spec and every lift path exists at ed8592e8, but five
  blocking findings (an unlifted fixture seven tests import, unnamed helpers, renames that move lifted hashes, 3D-only
  physics tests, rule tests that double-trip) and nine should-fix items, which the execution stage applies (the Owner).
  The spec and `CLAUDE.md` now say `@automataframework`. The stale branch `claude/project-thread-5h5fpo` still exists.

### Stage 6: fixes (2026-11-13)

PR 9, branch `claude/project-thread-glweo1`, each fix with its test first. What was done:

- F2: `release.yml` now starts from the `ci` run finishing (`workflow_run`), only for a green run of a push to `main`,
  checking out that run's commit; `workflow_dispatch` starts it by hand, from `main` only. `tests/workflows/release.test.ts`
  reads the workflow's text. The Owner can now add `NPM_TOKEN` and start the release by hand.
- F1: `stage.resize` draws the last views again after setting the size, and keeps views asked for before the mount had
  a size. Minor M1 is closed with it: `Renderer.apply` draws the first delta at once. Three new browser tests.
- F3: every box has a dark (`#1b1b24`) one-pixel edge, inside the box, one screen pixel wide at any scale. A browser
  test reads canvas pixels of a white box.
- F5: the button panel is `rgba(20,20,30,0.55)`; a browser test works out the contrast over the sky (at least 4.5 to 1).
- F6: `checkControls` checks `side` and `keys` with plain messages; two tests.
- F7: the README example uses `formatDiagnostic` (`tests/docs/readme.test.ts`). F8: `CLAUDE.md`'s Structure block lists
  `src/headless.ts`, `tests/lib/`, `tests/fixtures/`, `tests/install/` and the new `tests/workflows/` and `tests/docs/`.
- F4: the sideways pictures (`phone-844x390`, `tablet-1180x820`) are in `game.browser.test.ts`. The layout (moving the
  level or the buttons so they do not cover the hero) is the Owner's call; with no answer, it is **deferred to M2's
  layouts**, as the audit recommends (option A).

CI on the PR's head `18b5317` (run 43510352137): `check` (lint, typecheck, knip, 376 Node tests in 58 files, up from
370 in 56), `package`, and Chromium, WebKit and Firefox all passed; WebKit ran 113 tests in 13 files (up from 106).
Tests were not run locally; lint, typecheck and knip were. The `screens-*` artifacts now hold four pictures per engine,
which still need a person's eyes (the cloud network refuses the artifact host).

Not done, on purpose: the sideways layout. The Owner's question about it (audit, "For the Owner" 1) had no answer when
this stage ended, so option A stands: M2's layouts plan moves the level or the buttons. `NPM_TOKEN` is still the
Owner's; publishing now waits for Release 1 (see the log).

### F4 follow-up: the sideways layout (2026-11-13, PR 14)

Overall for this fix: **100%, green in CI on PR 14's head `a681062` (check, package, Chromium, WebKit, Firefox)**.

- Cause one, found from the pictures themselves: every picture ends at x 414, and the tablet upright one at y 896, which
  is Vitest's default browser page (414 by 896). The mount was wider than the page, so its right part, including the Jump
  button, was never in the screenshot. Nothing was wrong with the canvas.
- Cause two, from the audit: sideways, the level fills the height and the buttons sit on its lower corners.
- Test first: `tests/features/game/layout.browser.test.ts` sets the real viewport at the four sizes (and checks the page
  has it), then checks the canvas fills the screen, each of Left, Right and Jump is whole, at least 48 px, not covered
  and not overlapping, and the drawn level ends above the buttons. It took over the four pictures from
  `game.browser.test.ts`. Renderer and input got tests for the room the buttons take.
- Fix: `Renderer.setInset(px)` keeps the bottom `px` free and fits the level into the rest (never more than half the
  height); `Input.inset()` and `Input.onInset()` give the height of the button strip (0 while hidden); `startGame`
  wires them. Sideways phone: the level is 523 by 294, above 96 px of buttons.
- The coordinator also asked for an "editors open pull requests" line in `CLAUDE.md`. Not added: after the merge with
  `main` the page already holds the Owner's rule (Edit and Owner levels save straight in, Suggest opens a suggestion),
  and a blanket "open pull requests" line would contradict it. Raised with the coordinator.
- The first CI run on the tests alone failed as it should: the two sideways screens said the level ended at 390 while
  the buttons began at 311 (and 742 against 741 on the tablet), upright passed, and the canvas filled the screen in
  all four, which is how the pictures' cut-off was shown not to be the game's.

### Stage 5: implementation audit (2026-11-13)

[`audits/2026-11-13-m1-framework-implementation-audit.md`](audits/2026-11-13-m1-framework-implementation-audit.md),
for `main` at `b7b672f`. The build matches the spec and the plan; `main` is green (370 Node tests in 56 files, 106 in 13
files on Chromium, WebKit, Firefox and `package` passing); no golden moved after it was recorded; no attribution or
strategy text. Nothing blocks M1. Eight should-fix findings for Stage 6: F1 a resize while paused leaves a blank
canvas; F2 the release does not wait for CI; F3 boxes hard to see against the sky (add an outline); F4 sideways
phone pictures missing, and the buttons cover the hero there; F5 the button words a little faint; F6 `checkControls`
misses a bad `side` or `keys`; F7 the README's example drops the place of a problem; F8 `CLAUDE.md`'s Structure block.
Nine minors (M1 to M9) are noted for later plans; Stage 4's deferred minors and rulings were reviewed and stand.

Not done: the `screens-*` pictures were not looked at, because the container's network refuses the artifact host
(`productionresultssa7.blob.core.windows.net`); the check was worked out from the code instead. The release failed
with `ENEEDAUTH` (no `NPM_TOKEN`), which is the Owner's to add; F2 should land before it is re-run.

### Stage 4 close (Tasks 12 to 15, 2026-11-13)

Tasks 12 to 15 ran in a second session. Input (12), the loop, host and `startGame` (13) and the public surface, build,
API report and install smoke (14) were green in CI; Task 15 added changesets, `release.yml`, the version 0.1.0 and the
`version.test.ts` that ties `FRAMEWORK_VERSION` to `package.json`. `NPM_TOKEN` is a repository secret, which no session
can read, so whether it exists is known only when the `release` run on `main` publishes (Task 15 Step 5, after the merge).

Rulings in this session:
- Task 12: `ACTION_NAME` and `MAX_ACTIONS` are now exported from `commands` so `checkControls` and the `controls` command
  share one definition. A key press with Ctrl, Cmd or Alt held is left to the browser. Touch buttons are never smaller
  than 64 px (the plan's test asserts 48).
- Task 13: a loop frame that throws stops the loop and rethrows. `startGame` checks the controls before the sim is made.
  The screenshots go to `tests/features/game/__screenshots__/`, which is git-ignored and uploaded by CI.
- Task 14: the public surface and schemas already existed, so the red state was the unrecorded `idleHash60` (the Node job
  printed `fa986edc200c5437`; the installed package printed the same). `load.ts` imported `#src/...`, which the emitted
  declarations would keep; it is now a relative import. `package.json` no longer says `sideEffects: false`, because the
  browser entry sets Zod's `jitless` when it loads. The api-report extractor is lifted without the break check, the
  Svelte kind and the `.d.ts` reader (nothing to compare with before 0.1.0 is published; knip rejects unused exports).
  `schemas/` and `docs/api/` are generated files and are left out of Biome. The packed `.d.ts` files keep `.ts` import
  specifiers; TypeScript 7 resolves them, and the smoke typechecks a consumer against the tarball with `skipLibCheck` off.
- Task 15: `release.yml` sets a git identity and runs `git push origin --tags` (the checkout is detached and `main` is
  protected, so `--follow-tags` would fail). Provenance is switched on in `publishConfig` and in the job.

Whole-branch review (a self-review: the project allows no subagents, so there was no fresh reader). One finding was
fixed with a test first: a thumb sliding from one touch button onto the next let go of the first and never pressed the
second (`pointerenter` now presses, while the finger is still down). Deferred minors:
- `startGame` draws nothing until its second frame (the first only sets the clock), so a phone shows sky for about 16 ms.
- `game.replay()` throws after `game.stop()`, because stopping disposes the sim; a "save what I just did" button must ask first.
- The phone and tablet pictures exist as `screens-*` artifacts but were not looked at in this session (no download access
  here); the implementation audit reads them for the drunk-grandma test.
- Browser test counts per engine were not read from the logs; Node ran 370 tests in 56 files on the last full read.

### Handoff 1 (after Task 11, 2026-11-13)

**State.** Tasks 1 to 11 of 15 are done and green on PR 6 (draft, branch `claude/project-thread-kcc4b8`), one commit
per red step, code step and golden step. The Node test count was 341 after Task 10; Task 11 added the scene and fit
tests in Node and four render tests per browser. CI (lint, typecheck, knip, Node tests, and Chromium, WebKit and Firefox
jobs) passed on the last code commit, `a043d50`. WebGL started in all three engines, so nothing was skipped.

**Resume at Task 12 (keyboard and touch input).** Read the plan's Task 12 first, then 13, 14, 15. After them: the whole
branch review (`superpowers:executing-plans`, "Final Review"), mark the PR ready, and send the coordinator the end
summary (rulings and deferred minors).

**How the loop has run, so the next session can repeat it.**
- Set the author before any commit: `git config --global user.name "McThayDT" && git config --global user.email "107786093+mcthaydt@users.noreply.github.com"`. No Claude trailers anywhere.
- Per task: write the tests, check `npx biome check --write src tests`, `npx tsc --noEmit` and `npx knip` locally (these are allowed; tests are never run locally), push the red state, write the code, push, read the CI result with the GitHub actions tools, fix, then record the task in the plan (tick its steps) and in this file, and send the coordinator one line.
- A new golden is committed with `"finalHash": ""`; the Node job's log prints the JSON to commit (`get_job_logs` with `return_content` and a `tail_lines` of about 110). Record once, then all four engines must match.
- Every test disposes every sim it creates (Koota allows 16 worlds). `exampleLevel`, `loadFixtureGame`, `readFixture`, `heroPlugin` and `pushScript` live under `tests/fixtures/`.
- `pnpm add <pkg>@<exact>` when the task first imports a package (knip fails on unused dependencies). Still to add: `@changesets/cli` (Task 15). `pixi.js` 8.22.0 and `smol-toml` 1.9.0 are in.

**Carry-overs the plan does not say.**
- Task 14: set Zod's `config({ jitless: true })` in `src/index.ts` (audit S4). `render/stage.ts` already imports `pixi.js/unsafe-eval` and turns off Pixi's texture worker probe. `src/index.ts` already re-exports render; add input, host and game as they land.
- Task 14: smoke typechecks a consumer `.ts` against the packed tarball (S6); `idleHash60` runs with no game plugin (N4); the README describes only what the framework does and how to use it (no strategy, market, competitor or pricing words, no reference to `docs/research/`); the `typescript-6` alias dev dependency.
- Task 15: check `NPM_TOKEN` is in the environment before anything else; stop and report if it is missing. `release.yml` gets `--provenance` and a tag push (S9).
- Task 12: input must not leave the hero running when a key is held and the window loses focus, or a touch is cancelled by the system (Review Focus 2).
- Task 13: coming back to a tab after a minute, or a slow frame, must not fast-forward or freeze (Review Focus 3).
- Public names: content exports `LevelThing` and `LevelStart` (the level feature's `Thing` is a component); `levelPlugin` is defined in `level/plugin.ts`.

**Rulings made so far (all also in the git-ignored ledger).**
- B1: `fixture-world.ts` lifted to `tests/fixtures/`. B2: `sim.test.ts` hash barrel repointed to `src/lib`; bounce golden test closes over its own seeded stream. B3: physics renames cover system names and error text; the old inline hash is replaced by `tests/golden/physics-scene.json`. B4: physics-world test rewritten onto the 2D names; `property.ts` lifted. B5: architecture rule tests name the feature's entry as the offender so one violation fires.
- S1: `expectGolden` compares only ticks, final hash and checks. S2: check hashes fall after each step on a multiple of 60 ticks, never at tick 0, never for the last tick. S3: `fixedRotation` field before the physics golden. S5: every test disposes its sims. S7: `tests/fixtures/raw.d.ts` declares `*?raw`. S8: `physics()` default gravity is y-down `{ x: 0, y: 9.81 }`; `createGameSim` defaults to `{ x: 0, y: 30 }`. N1 to N4 applied (N4 in Task 14).
- Task 1: Biome line width 110 (the old repo's value) so lifted files stay as they were; dependencies added by the task that first imports them; CI runs on `pull_request`, so the draft PR opened at the first push.
- Task 2: added `tests/lib/deep-freeze.test.ts` (nothing used `deepFreeze` until Task 9). Task 3: the architecture `no-cycles` rule ignores type-only imports (the lifted `context.ts` and `definitions.ts` only import each other's types).
- Task 4: error classes moved to `errors.ts` to keep `create-sim.ts` under 600 lines. Task 5: after a restore the physics adapter trusts the entity's `fixedRotation` instead of re-locking (re-locking woke sleeping bodies and broke restored-equals-straight); cost: a `fixedRotation` edit made after the last sync-in and before a snapshot is lost in the restored sim until edited again.
- Task 8: unknown-key problems are one per key; missing fields are found by reading the raw data; `exampleLevel` moved to a fixture file (Biome forbids exports from tests). Task 9: two files claiming one id are reported (beyond the plan); any failed read counts as "missing". Task 10: `LevelThing`/`LevelStart` rename, `level/plugin.ts`.
- Owner: no AI attribution anywhere; credit line "Requested by **McThayDT**"; history was rewritten once at the Owner's word; author is McThayDT. PR bodies are edited only with the GitHub MCP `update_pull_request`.

**Deferred minors.** None yet; the whole-branch review has not run.

