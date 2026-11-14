# M2 plan A (art): plan audit

Stage 3 of the workflow, for [`plans/2026-11-14-m2-art.md`](../plans/2026-11-14-m2-art.md) as merged in `869d5b7`
(PR 52), against the [M2 spec](../specs/2026-11-14-m2-design.md)'s "Art (plan A)", its content table, "M1's deferred
minors" and "Multiplayer in the demo", the code on `main` at `869d5b7`, and the other M2 plans as they stand there:
C (content, built and fixed, PRs 43 and 48), I (input, built and fixed, PRs 42 and 51), V (saves and the host, built,
PR 40), N (networking, planned and audited, PRs 35 and 41) and P (joints and touch, planned and audited, PRs 37 and
45; not built). Written 2026-11-14.

**Verdict:** sound, and ready for stage 4 once the Owner answers the format question. The plan's central calls hold
against the code: every new field is optional with no default, a new kind's map is in `GameContent` only when it is
listed, `Sprite` sits in a plugin of its own that only a game with a figure or a view gets, and tile boxes join only
in a level with a tileset, so no recorded hash moves. The PNG writer is pure integer work and deterministic. No
critical fault was found. Eight important ones were, two of them in what the plan hands to other plans; all but one
are fixed in the plan, and that one is a question for the Owner. Twelve minor ones are fixed or noted.

How it was checked: the plan was read whole. On `main`, these were read for every call the plan makes:
`src/features/content/` (`cutscene.ts`, `character.ts`, `level.ts`, `tileset.ts`, `shared.ts`, `type-info.ts`,
`load.ts`, `content.ts`), `src/features/sim/` (`create-sim.ts`'s two hashes, `fields.ts`, `dmath.ts`, `rng.ts`,
`entity-store.ts`'s render rows, `sim.ts`'s exports), `src/features/level/` (`hero.ts`, `join.ts`, `components.ts`,
`game-sim.ts`, `spawn-level.ts`, `tile-runs.ts`), `src/features/render/` (all four files), `src/features/game/game.ts`
and `watch.ts`, `tests/architecture/rules.ts`, the goldens and the tests that record them, `tileset.parity.test.ts`,
`full-game.parity.test.ts`, the full fixture game, the strict-CSP fixture, `scripts/` and the CI `package` job. In
AutomataFrameworkExamples: its `automata.toml`, its level, `tests/game/game-files.test.ts`, `ci.yml`'s `ci-screens`
job and `commit-authors.yml` with its script. In AutomataFrameworkFailed at `ed8592e`: `extensions/figures/` (its
size, its `Math.sin` and `Math.cos`, its `@napi-rs/canvas`). Nothing was run.

## The coordinator's questions

- **Does the plan add back the cutscene `clip`, `character.clips` and their check?** Yes. On `main`, `cutscene.ts`'s
  actor key has `at`, `who`, `x`, `y` and `face` and no `clip` (plan C's fixes took it out); the plan's "Before
  starting" stops if it is still there. Task 2 adds `figure` and `clips` to `character`, `clip` to an actor's key
  (after `y`, before `face`, optional, no default), and the check across files: a thing's clip is its character's, a
  `player-N`'s is the project's `hero`'s (through a new `Listed.hero`), each with its sentence and a test. `Listed` is
  not in `GameContent`, so `hero` on it hashes nothing. Right as written.
- **Do the no-golden-moves claims hold?** Yes, with one trap for later (I4) and one wording to keep (M3). The
  framework's four goldens (`push-crate`, `co-op`, `physics-scene`, `bounce`) are made from games with no figure, no
  view and no tileset; the content hash of an M1 game is unchanged because no parsed file gains a key; `Sprite` is a
  plugin of its own; `tileset.parity.test.ts`'s level has a floor and no stacked rows, so its joined boxes are its
  runs; Examples' game lists no tileset, figure or view, so moving its pin to plan A's merge moves neither of its
  goldens.
- **Is its PNG writer deterministic?** Yes. Every step (the filter byte, a greedy match at distance 1 or one row up,
  fixed Huffman codes, Adler-32, CRC-32) is integer work on bytes, with one way to make each choice and ties settled
  in writing. Distances stay under deflate's 32,768 (one row up is at most 4,097). The painter it encodes uses `+ - *
  /`, `Math.floor`, `Math.round`, `Math.min`, `Math.max`, `Math.abs` (all exact in IEEE), and `dmath`'s `sin` and
  `cos`, which are fdlibm kernels over correctly rounded steps, accurate far beyond any angle a figure or a hill uses.
  The random draws are `xoshiro128**` on 32-bit integers. I8 closes the one gap in the rule that guards this.
- **Is sprite state only switched on by content?** Yes: `usesSprites(content)` asks the whole game (a character with
  a figure, or a level with a view), so every level of one game has the same schema hash. Two things must stay so,
  and the plan now says both (M3): `Sprite` is not added to `levelPlugin`, and `joinPlugin` works the answer out from
  `ctx.content` instead of taking a new config key (its config is hashed, so a key would move `co-op.json`).
- **The number above each hero (plan U) and the pull-along (plan D).** Neither handoff was sound as written. Plan U
  cannot reach `heroes()` from a started game (I3). The pull-along has no number to pull to, because the plan's camera
  has no limit, and the spec gives it one (I1).
- **Plan D's pictures, painted and committed by a CI job.** Not workable as written; workable in the form `ci-screens`
  already uses (I6). Who keeps pictures fresh when an editor saves is the Owner's (I7).
- **Do the e2e tests cover enough?** For the framework, nearly. Task 12 plays the full game in three browsers at five
  sizes with the pictures painted in each engine, and covers running, turning, jumping, a second player, a watched
  replay, a missing picture and a game with no pictures; the agent journey covers a person-free change of art. Two
  gaps are closed in the plan: the watch mode's loop (I2) and drawing under the strict CSP (M12). Fetching pictures
  over the network from a built page is plan D's, in Examples' journeys, and is written into its handoff.

## The open format question

Audited as if the Owner answers (a), the new small formats. What changes under the others:

- **(b), port the old painter.** Most of the plan. The old painter is about 14,600 lines of TypeScript under
  `extensions/figures/src` at `ed8592e` (the plan says 13,847; either way, more than twenty files' worth under the
  600-line rule), paints with `Math.sin` and `Math.cos` in `hair/`, `lighting/` and elsewhere, and writes PNGs through
  `@napi-rs/canvas`, a native Node package. So: a new dependency for the Owner's yes; the painter cannot run in a page,
  so the "same bytes in four engines" constraint, `art.parity.test.ts` in three browsers, Task 12's "each engine both
  paints and plays" and the M3 builders painting on an iPad all go; it cannot live in the `content` feature, which
  the page entry loads, and becomes Node tooling beside plan K; Tasks 1, 2 (the `figure` table), 4 and 6 are
  replaced, and its 256-colour lit palette collides with "every colour is the file's" and the fixture's four colours.
  Tasks 3, 5 and 7 to 13 mostly stand, since they read only `figureSheet`'s frames.
- **(c), these formats now and the old painter in M3.** Nothing in this plan changes, if two things are kept: the
  frames contract (`figureSheet`'s frame names `<pose>` and `<variant>/<pose>`, `SHEET_COLUMNS`, the atlas) is what
  any painter must give, so clips, `Sprite` and the renderer never learn which painter ran; and a second painter
  behind the same `figure` kind needs a way to tell the two files apart, which `z.strictObject` allows later as one
  new optional key. The plan now says both in "My calls" 1.

## Important

**I1. The camera has no limit, and the spec gives it one.** The spec ("Multiplayer in the demo"): "the camera keeps
every player on screen and zooms out as they spread, up to a limit, beyond which a player off screen is pulled along".
The plan's `frameHeroes` pulls back "as far as the whole level", and its table of what it leaves out says the camera
"can always pull back to the whole level". On a level of 100 tiles that is a phone showing a strip of crumbs, and the
pull-along plan D is handed has no number to pull to. The limit has to be one number both sides read: the camera in
`render`, and the pull-along rule in the sim, which may not ask the renderer. *Fixed:* `view` gains `most`
(optional, `{ w, h }`, at least `w` and `h`, at most the level; left out, the whole level, as the plan had): the
shot never grows past it, and when the heroes spread wider it is centred on the middle of their box. Its sentence,
its schema field and three camera tests are in Tasks 3 and 10, and plan D's handoff says its pull-along reads
`level.view.most`.

**I2. A watched replay's next round would slide the camera across the level.** `watchReplay` restores the sim to tick
0 after each round, and the restore makes the next delta a resync, "so the picture jumps to the start and nothing
slides there from where the last round ended" (`watch.ts`). The plan's camera eases toward each new shot and goes
straight only on the very first `apply`, so on a level wider than its view each round would start with the camera
gliding back from the far end: on the Site's home page, every few seconds. *Fixed:* a resync delta puts the camera
straight on its shot, as the first one does, with a test in Task 10. Noted for plan N: a rollback must not hand the
renderer a resync on every re-step, or the camera would jump. This audit did not check how plan N's rollback feeds
the renderer; its execution should.

**I3. Plan U cannot reach `heroes()`.** `Renderer.heroes()` is what plan U is told to use for the number over each
head, but `startGame` keeps its renderer to itself: `Game` has `sim`, `input`, players, pause, replay and stop, and no
renderer (`game.ts`), and the watch handle the same. *Fixed:* Task 12 adds `heroes()` to `Game` and to the watch
handle, passing the renderer's through, with a test. Its comment says what plan U must know: the boxes are in CSS
pixels from the mount's top-left corner, change every frame (read them after each draw), and the list is empty in a
game whose heroes have no `Sprite` (no figure and no view), because `Sprite.player` is how the renderer tells a hero
from a crate.

**I4. `sprites.json` would be recorded on a game every later plan grows.** Task 7's parity test plays the full
fixture game, the one every kind of file lives in. Its critter already has a behaviour file and its level a cutscene,
which nothing runs today; once plan T makes them run, or any plan adds a system switched on by the full game's
content, the hash moves and a golden on `main` needs the Owner's before and after for a change that has nothing to do
with art. *Fixed:* the parity test plays a game of its own, the M1 fixture game with the hero given a figure and
clips (`tests/fixtures/game/sprite-game.ts`, built in the test as `tileset.parity.test.ts` builds its variant), so
only a change to how clips play can move it.

**I5. Pixel art at a fractional scale crawls as the camera moves.** The level's scale is whatever fits the screen
(`placeCamera`, like `fitWorld`), so one picture pixel is usually not a whole number of screen pixels, and the
camera's middle eases by fractions of a tile every tick. With sharp (nearest) pixels, each frame then rounds the
picture's pixels to the screen differently: edges shimmer, and the hero's one-pixel eye grows and shrinks as the
camera glides. *Fixed:* in `stage.ts`, the level's offset on the screen is rounded to whole device pixels after the
camera is placed, so the picture moves in whole pixels; and a test in Task 10 holds a still hero while the camera
eases, checking its eye is the same number of pixels wide in each frame. (Scaling by whole numbers only would leave
big bars on a phone, so it is not done.)

**I6. Plan D's pictures, as the ruling describes them, would never merge.** A push made with a workflow's own token
starts no workflow, so a CI job that commits the painted pictures to the pull request's branch leaves its new head
with none of `main`'s required checks (`check` and the three `engines`) and the pull request cannot merge. It would
also give write access to a job that runs the pull request's code. The form that works is the one `ci-screens`
already uses in both repos: the job paints (calling `artFiles`, as `pnpm art` does) and pushes the files to a branch
of its own, `ci-art`, under `pr-<number>/`, sharing no history with `main`; the thread `git fetch`es that branch,
copies the files beside their content and commits them as McThayDT (a fetch and a copy run nothing); then CI's
`artProblems` check proves them. Two things in Examples change with the first picture, and plan D's handoff now says
both: `tests/game/game-files.test.ts` ("every file under content/ is listed") must also allow the pictures and
atlases `artFiles` gives; and the workflow change itself is one more job like `ci-screens`. *Fixed* in "What the
other plans rely on". The coordinator's ruling stands; this is how to carry it out.

**I7. Who repaints a picture after an editor's save. (Owner question, sent to the coordinator, not defaulted.)**
Pictures beside their files are committed, and `artProblems` fails a stale one. In M3 an Edit-level save goes
straight to `main`; if it changes a figure and writes only the JSON, as the Editors' rule says ("opens, writes and
exports only the content files (JSON) a game's `automata.toml` lists"), `main` goes red, and the Site keeps showing
the last green commit, so the person's change never appears. The options:

- (a) An editor's save also writes the pictures and atlases `artFiles` gives for what it changed, in the same
  commit, the same bytes `automata art` makes. The Editors' rule widens to say so.
- (b) Painted pictures are never committed: the game's build and dev server paint them, `.gitignore` keeps them out,
  `automata art` still paints them beside their files for anyone who wants to look, and `artProblems` checks only a
  tileset's hand-drawn picture. Plan D's CI job (I6) is then not needed at all.

The audit recommends (b): it removes three moving parts at once (a CI job that commits, a picture that can go stale,
a change to the Editors' rule) and keeps pictures out of git's history; its cost is that a game's build gains a
paint step and a picture cannot be seen on GitHub without one. Either way this plan's tasks stand as written: (a) or
(b) changes plan D, plan K's template and the Editors, not the framework. So it holds nothing here.

**I8. The painter's rule guards less than the plan says.** "The same bytes everywhere" is enforced by a new
`painter-math` rule that bans some `Math` calls. But the `content` feature is not one of `rules.ts`'s pure features
(`sim`, `physics`, `commands`, `level`), so the painter's files are not held to the clock, `fetch` or `node:` rules
that `src/lib/png.ts` is. *Fixed:* the rule also applies the pure features' list (`Date.now`, `new Date`,
`performance.now`, timers, `fetch(`) and refuses a `node:` import in the painter's files, with a test that each fires.

## Minor

- **M1.** The plan imports `sin` and `cos` from `src/features/sim/dmath.ts`; the `through-the-entry` rule fails that
  from `content`. `sim.ts` re-exports `dmath` and `createRng`, `deriveSeed`. *Fixed:* the plan names
  `src/features/sim/sim.ts`.
- **M2.** `content/shared.ts` already has a `picturePath` (the Zod field for a tileset's `image`). A second, public
  `picturePath` in `art.ts` means two functions of one name in one feature. *Fixed:* `art.ts`'s is `paintedPath`.
- **M3.** Two things the plan implies and now says, because each would move `co-op.json`: `Sprite` is in
  `spritesPlugin` and never in `levelPlugin`'s components; `joinPlugin` reads `usesSprites(ctx.content)` itself and
  gets no new config key.
- **M4.** Task 2's tests reach `loadGame` with a hero figure of seven poses, but the full game's figures are written
  in Task 6. *Fixed:* Task 2's tests build the files they need.
- **M5.** `scripts/art.ts` "runs on its last line"; the test imports it, which would run it. *Fixed:* the
  command-line guard `scripts/check-commit-authors.ts` uses.
- **M6.** `createImageBitmap` may convert colours or premultiply. Exact pixel checks (`#f37f94` at the hero's body)
  should not depend on an engine's choice. *Fixed:* `loadArt` and the PNG browser test pass
  `{ colorSpaceConversion: 'none', premultiplyAlpha: 'none' }`.
- **M7.** `stage.ts`'s first comment says it is the only file that talks to Pixi; `art.ts` will be the second.
  *Fixed:* the comment changes with it.
- **M8.** A tileset whose picture is a figure's with more than eight poses must say `"columns": 8`, since the sheet
  wraps at `SHEET_COLUMNS`. `loadArt`'s width sentence already catches it; the README now says so.
- **M9 (not changed).** Joining tile boxes only with a tileset means a level written in `#` and `.` keeps one box a
  row, so M8 is fixed only for levels with a tileset, and `tileset.parity.test.ts`'s promise ("plays exactly like")
  holds because its level has only a floor. Joining everywhere would move no framework golden, but would move both
  of Examples' at its next pin move, whatever that move is for. The plan's call stands; the README says it, and the
  parity test's comment says why its level has no wall.
- **M10.** `tileBoxes` joins a run only to a box of the same column and width, so a wall whose rows differ in width
  (a ledge) still has joins down its face. Enough for M2's levels; written into Task 8 so it is not mistaken for all
  of M8.
- **M11.** Task 12's "a recorded play is watched with the same pictures on the same ticks" holds because both games'
  cameras start fresh; with I2's fix it also holds after a round. No change.
- **M12.** Nothing proves a sprite can be drawn under the strict CSP: the no-eval tests only load the entries, and a
  textured batch is a new path through Pixi. *Fixed:* Task 12 starts the full game inside `attemptsToBuildCode` and
  expects no attempt.

## Checked and found right

- **The content hash.** `createSim` hashes the canonical JSON of the whole `GameContent`; an optional field with no
  default leaves a parsed M1 file's JSON as it was, and `figures` and `backdrops` appear only when listed, by plan
  C's rule in `load.ts`.
- **The schema hash.** Plugin names, configs, components, events and systems are hashed (`create-sim.ts`); a separate
  `spritesPlugin` added only for sprite games keeps every other game's hash.
- **String fields.** `Sprite`'s `character`, `clip`, `pose` and `by` are `string` fields, which `fields.ts`
  supports, and render rows carry an entity's whole render state with strings, so a pose change with no move still
  reaches the scene.
- **Velocities.** `Body.vx` and `vy` are f32 in tiles a second (a tile is a metre), with y down, as `motionClip`'s
  thresholds assume; the `cleanup` phase runs after physics writes them back.
- **The deflate stream.** Fixed codes cover literals 0 to 255 (palette numbers), lengths 3 to 258, and the two
  distances; `a wide flat picture is small` is right (about 510 matches of 258 at distance 513, near 1.4 KB).
- **The palette sizes.** At most 1 + 16 + 1 + 8 × 16 = 146 entries for a figure and 9 for a backdrop, under PNG's 256.
- **The camera's worked examples.** Each of Task 10's five expected shots follows from the rules as written.
- **The tileset fixture.** The meadow figure's four poses in one row make a 64-pixel-wide picture, which is
  `columns` 4 at `tileSize` 16, and frames 0 to 3 are the four the tileset names.
- **Plan P.** Not built; its files overlap and the plan already says to keep both, with links drawn last.
- **Plans I and N.** A hero who joins gets `Sprite` through `heroParts`; a room with no hero yet gives a camera with
  nobody to follow, which Review Focus 4 covers.
- **The old code's rules.** One clear-or-painted texel, a one-pixel outline drawn last, a figure standing on its feet
  and hashes that fail on one texel are what the plan's painter and goldens keep.

## For other plans, not fixed here

- **Plan D:** I1 (the pull-along reads `level.view.most`), I6 (`ci-art`, and `game-files.test.ts`), and fetching the
  pictures from a built page under the strict CSP in its journeys. Written into the plan's handoff.
- **Plan U:** I3 (`Game.heroes()`, empty without `Sprite`). Written into the handoff.
- **Plan N:** I2's note on rollbacks and the renderer's resync.
- **Plan K and the Editors:** I7, once the Owner answers.
