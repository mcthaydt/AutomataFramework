# Scenes, slice 1 (the framework's side): plan audit

Stage 3 of the Scenes cycle. Audited: [`plans/2026-11-15-scenes-1-ground-and-materials.md`](../plans/2026-11-15-scenes-1-ground-and-materials.md)
as written in PR 113 (`af1b7d3`), against the spec
([`2026-11-15-2d-environment-builder-design.md`](https://github.com/mcthaydt/AutomataFrameworkEditors/blob/main/docs/superpowers/specs/2026-11-15-2d-environment-builder-design.md),
Editors PR 31), the builder's plan of the same name (Editors PR 37, audited beside this one), the code on `main`
(`29dd191`), plan H's build (PR 101, open), and the other plans in review that touch the same files: rigged figures
(PR 109), live tuning (PR 107), plan F (PR 111) and the sound formats (plan M, PR 112).

Nothing was run. Every fact below is read from a file on `main`, on a named branch, or from the published
`@dimforge/rapier2d-deterministic@0.21.0` package's type declarations (read, not installed).

**Verdict: ready for execution once the fixes below are in the plan; they are, in this pull request.** No blocking
finding, seven important, six minor. No golden moves under the plan as fixed. No new dependency.

## The Owner's answers (2026-11-15, 01:02 UTC)

The four questions open on cards were the builder's (Editors plan rulings 1, 13, 14 and 15). The Owner chose, in
order: the first run before props is "Paint ground, press Save"; a scene's size is set by agents only for now; only
working tools are shown; an empty game gets two simple starts. Each is what the builder's plan already ruled, so
nothing in this plan changes. They are recorded in both trackers.

## The coordinator's three flags

1. **The page paints the picture; the API checks only its shape.** A builder question, judged in the Editors audit
   (its E3). For this plan it adds one need: the API and the page must write the atlas with the same bytes `artFiles`
   does, and today that text is built inside `art.ts`'s private `pair`. Fixed by M5.
2. **Four Rapier names for the ledge's contact hook.** All four exist in 0.21.0, by these names
   (`pipeline/physics_hooks.d.ts`, `geometry/collider.d.ts`, `pipeline/world.d.ts`): `RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS`
   (1), `RAPIER.SolverFlags.COMPUTE_IMPULSE` (1) and `EMPTY` (0), `RAPIER.ColliderDesc.convexHull(points: Float32Array):
   ColliderDesc | null`, and `World.step(eventQueue?: EventQueue, hooks?: PhysicsHooks)`. Also there:
   `ColliderDesc.setActiveHooks`, `Collider.activeHooks()`, `Collider.vertices(): Float32Array`, `halfExtents()`,
   `halfHeight()`, `radius()`, `ShapeType.ConvexPolygon = 9`, and `filterContactPair(c1, c2, b1, b2): SolverFlags |
   null`. Task 10's stop rule for the names is now moot; two details the plan did not know are fixed by I4.
3. **`listContent` as the one writer of `automata.toml`.** Three framework plans create the same file,
   `src/features/content/project-write.ts`, in three shapes. Fixed by I3.

## Important

**I1. The tracker's cycle number is taken three times over.** The plan writes "Cycle 8". Live tuning (PR 107), plan F
(PR 111) and the sound formats (PR 112) each add a "Cycle 8" section, and "Cycle 7" is already used twice on open
branches (plan U and rigged figures). Each merge would leave the next one's tracker ambiguous. *Fix:* the section is
unnumbered, "The Scenes cycle", as the merge session keeps it (2026-11-15), and the plan's tracker line and
`progress.md` say so.

**I2. Plan H's build is not as separate as the plan says.** "Before starting" says Tasks 1 to 11 and 13 to 16 touch
nothing of plan H. PR 101 changes `level/spawn-level.ts`, `level/uses.ts`, `level/level.ts`, `level/game-sim.ts`,
`physics/physics-world.ts`, `physics/rapier.ts`, `physics/physics.ts`, `physics/components.ts`,
`game/game.ts`, `game/online.ts` and `render/render.ts`: every file of Tasks 10 and 11 and several of Task 13. Building
Part B beside it means two branches rewriting `rapier.ts`'s `step` and `spawnLevel`'s order at once. *Fix:* Part A
(Tasks 1 to 8, all in `content` and `lib`) may start now; Parts B and C start only after PR 101 is merged, and Task
12's "if a name differs on `main`" rule covers all of Part B.

**I3. Three plans write `project-write.ts`.** Rigged figures (PR 109, Task 17) makes `listContent(text, entry,
about?): Parsed<string>`, which answers rather than throws and has a sentence for an `automata.toml` that lists its
files in one `content = […]` value; the sound formats (PR 112) make `withFolders(text, refs)` in the same file, for
the new folder form of `[[content]]` (`type` and `folder`); this plan makes `listContent(projectText, ref): string`,
which throws. Whichever lands second breaks the first's tests. The folder form also changes two of this plan's
assumptions: a game may list a scenes folder, so `from-level` must not add a block for a file the folder already
covers, and `paintedPath` finds a file by `entry.path`, which a folder entry does not have. *Fix:* this plan does not make
the file. The coordinator ruled (2026-11-15, after the rigged-figures audit, AF PR 117) that plan R's Part 0 builds
`project-write.ts` first and it is the one writer; Task 14 consumes `listContent(text, entry, about?): Parsed<string>`,
handles its answer instead of a throw, and stops if Part 0 is not on `main` when it starts. Task 14's `from-level` adds a block only when no
listed folder holds the new path, and if plan M has landed, `paintedPath` and `photosUsed` read listed files through
the loader's own list of files rather than `project.content`'s paths.

**I4. The ledge hook keeps state it does not need, and the slope's collider can be `null`.** The plan keeps a `Set`
of ledge handles in the adapter, filled in `createCollider` and, after a restore, "the first time `colliderMatches`
sees it". Two problems. Handles are per world: after `restore` makes a new world, a handle left in the set from the
old one can name a different collider, so a restored sim and an unbroken one can disagree on a tick, which is a hash
mismatch. And the sync-in loop does call `colliderMatches` before the first step (`physics-world.ts`, the
`sortedSids` loop), but that is an accident of today's order, not a rule. Rapier already keeps the flag:
`Collider.activeHooks()` is in the world and in its snapshot. Separately, `convexHull` takes a `Float32Array` and
answers `ColliderDesc | null`, and a hull may start at any of its corners, so `vertices()` must be compared as a set
of three points. *Fix:* the hook reads `world.getCollider(handle).activeHooks()` (and the ledge's top from that
collider's own translation and half extents) and keeps nothing; a `null` hull is a thrown error with the slope's
size (never a silent box); `colliderMatches` compares the three corners in any order. Also said in the task:
`colliderMatches`'s first line (`shapeType() !== c.shape`) must map our codes 16 to 18 to Rapier's 9 and 1 first, or
every slope and ledge is rebuilt every tick, and `kinds.ts`'s comment ("They equal Rapier's own ShapeType values")
changes to say which codes are ours.

**I5. Task 9 contradicts its own test.** "Boxes come from the `solid` letters only", yet the test asks a lone
`half-up-high` tile for "one box for its lower half". In a half run of two or more tiles the run's triangle already
holds each high tile's lower half; only a high tile with no partner needs that half box. *Fix:* the rule now says so:
a `half-up-high` or `half-down-high` tile that is a run of one gives a slope of `h: 0.5` and a box of `h: 0.5` under
it, in the slopes' place in the order.

**I6. The spec's same-hash proof names a copy of the Examples goldens; the plan proves only its own fixtures.** The
spec's Testing says "a level and its `from-level` scene play to the same hash (the fixture game and a copy of the
Examples goldens)". Examples' `replays/level-1.json` plays that repo's own hero plugin, which the framework cannot
run, so a straight copy cannot be replayed here. What the framework can hold is the level itself: Examples'
`level-1.json` is `#` and `.` rows with its own `sky` (`#111314`) and `ground` (`#fdd4bd`), checked on `main` today.
*Fix:* Task 11's test (a) gains a third case, a copy of that level's file as `tests/fixtures/examples-level-1.json`,
played with `tests/fixtures/game`'s characters by a fixed command list, before and after `sceneFromLevel`, same
`finalHash` in four engines; the replay of the real goldens stays plan D's (the Handoffs already say so). Recorded
as the spec's wording met in part, with the reason.

**I7. A scene's picture cannot be swapped into a picture already on the screen.** The builder repaints the ground at
most once a frame while a finger drags (its ruling 16) and hands the result to `createLevelPicture`. But
`LevelPicture.show(level)` requires "its size, tileset and backdrop must be those the picture was made with",
`createLevelPicture` keeps the `content` it was given (so `levelViews` draws the old scene's boxes and ledges), and the
picture owns its `Art` for life. The only way left is to destroy and remake the Pixi picture each frame. *Fix:* Task 13
gives `LevelPicture` one more member, `showScene(content: GameContent, art: Art): void`, which takes a game whose
level names the same scene id with any ground, swaps the ground pages and tile sprites (destroying the old `Art`),
and redraws the views from the new content; same size only (a size change still remakes the picture). Its test: two
`showScene` calls with different rows change the canvas pixel at a painted tile and free the first `Art`. The
Handoffs name it.

## Minor

**M1. The painter-math test duplicates a rule that exists.** `tests/architecture/rules.ts` already holds painter
files to their math (`PAINTER_FILES`, `PAINTER_MATH`, tested in `rules.test.ts`). A second test reading the same files
would drift from it. *Fix:* Task 6 widens `PAINTER_FILES` to the new files (`scene-ground`, `photo-library`, `lab`,
`photo-tile`, `scene-from-level`, `src/lib/inflate.ts`, `src/lib/png-read.ts`; `paint-scene` and `sheet` already
match) and adds `**`, `Math.cbrt`, `Float32Array` and a `.sort()` with no argument to the rule, each with its
made-up case in `rules.test.ts`; `painter-math.test.ts` is not written.

**M2. "Too big to paint" has no formula.** *Fix:* stated in Task 3: `pages = ceil(w / groundPageTiles(tile))`;
the picture is `min(w, groundPageTiles(tile)) * tile` wide and `pages * h * tile` tall; it is too big when the height
is over `MAX_PICTURE_SIDE`. The sentence's numbers come from the same three lines.

**M3. Task 6 names `pow` from `sim/sim.ts` and the global rule from `sim/dmath.ts`.** The same function (`sim.ts`
re-exports `dmath.ts`); `content` imports features through their entry, so `sim/sim.ts` is right. *Fix:* the global
rule says "`dmath`'s `pow`, through `sim/sim.ts`".

**M4. `render/scene.ts` and the browser entry's `Scene` already exist** (the drawn scene graph, `createScene`). The
plan rightly calls the file's type `SceneFile`. *Fix:* the skill page and the README say "scene file" where a reader
could take `Scene` for the content, and `render/ground.ts` keeps its name.

**M5. The atlas's bytes are private to `art.ts`.** The page, the API and `artFiles` must give the same atlas text.
*Fix:* Task 8 exports `atlasText(sheet: Sheet, image: string): string` from `sheet.ts` (the `JSON.stringify(…, null,
2)` plus newline `art.ts` writes today) and `art.ts` uses it; the headless entry exports it and `sceneSheet`, and the
Handoffs list both.

**M6. Task 10's ledge test uses `halfExtents().y` for a crate that may turn.** The rule reads an upright half
height, so a crate on its corner is judged by its upright box. Acceptable for slice 1 (the hero has fixed rotation);
*fix:* the task says so in its comment, and its crate case sets `fixedRotation` so the test pins the rule and not the
tumble.

## Checked and found sound

- The format, the nine shapes, the slope rule (call 5) and the builder's fill under a drag agree: a 3-tile steep run
  has 3 tiles under it, a 4-tile one 6 (`gapsUnder`, Task 9's test and the builder's Task 4 test all agree).
- `simScene` keeps exactly what the sim reads today. `spawnLevel` reads a level's `ground` colour for each box's
  `Look` and its rows, and nothing reads `sky` in the sim (`skyOf` is used only by `game.ts`, `online.ts`, `watch.ts`
  and `render/still.ts`, all drawing), so leaving `sky`, `paints`, `materials`, `seed`, `tile` and `backdrop` out
  moves no hash. `world: levelSize(level)` in `game.ts` goes to the renderer, not the sim.
- Call 8 matches `spawnLevel` today: a level without a tileset spawns `tileRuns` one box a row, one with a tileset
  `tileBoxes`, both before the things; `from-level`'s `oneBoxPerRow` keeps the first.
- `art.ts`'s `artProblems` compares every painted file byte for byte, so a picture saved by any hand that is not
  `artFiles`' bytes fails `automata check` with "older than its scene file". The builder's ruling 8 leans on that.
- `MAX_PICTURE_SIDE` is 2048 (`sheet.ts`); `level.ts` is 442 lines and `stage.ts` 373, as the plan says.
- `src/lib/png.ts` writes an 8-bit palette PNG with `PLTE` and a `tRNS` for index 0, so a page-painted picture can be
  checked for the scene's paints without painting (the Editors audit's E3 uses this).
- Examples' `level-1` is `#` and `.` with its own `sky` and `ground`, as the Handoffs say.
