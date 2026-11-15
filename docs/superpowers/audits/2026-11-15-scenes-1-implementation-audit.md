# Scenes, slice 1 (the framework's side): implementation audit

Stage 5 of the Scenes cycle, 2026-11-15. The build is four pull requests, all merged to `main`: Part A (AF 128,
`2c6c4ca`, Tasks 1 to 8), Part B (AF 134, `0e0d8d0`, Tasks 9 to 12), Part C (AF 138, `46b1c13`, Task 13) and Part D
(AF 141, `0377e40`, Tasks 14 to 16). Audited against
[`plans/2026-11-15-scenes-1-ground-and-materials.md`](../plans/2026-11-15-scenes-1-ground-and-materials.md), its
[plan audit](2026-11-15-scenes-1-plan-audit.md), the spec
([`2026-11-15-2d-environment-builder-design.md`](https://github.com/mcthaydt/AutomataFrameworkEditors/blob/main/docs/superpowers/specs/2026-11-15-2d-environment-builder-design.md),
in AutomataFrameworkEditors) and the code on `main`. Done with the project's audit prompt: "Audit all of your work for
completeness, consistency, cohesion, and harmony, both within itself and relative to the spec and relative to the
codebase. Assume nothing. Verify everything. Investigate any incomplete implementations or incomplete integrations. Do
your best work."

Nothing was run here. This stage read each part's diff (`git diff <merge>^1 <merge>`), the code it touches, the tests,
the CI run of PR 141's head (every check green: `check`, `package`, `engines` in Chromium, WebKit and Firefox,
`online`, `create-pack`, `create-play`, `create` on three systems, `screens`, `commit-authors`), the `package` job's
log (it prints `ok  a game moved onto a scene still checks, paints and plays its recorded run`, so `scene-smoke.mjs`
does run), and the scene pictures CI put on `ci-screens` (`14a9971/<engine>/scene-<size>.png`).

**Verdict: sound, with four important fixes.** The shape is the plan's: `content` gains the `scene` and `photo` kinds,
the PNG reader and its inflate, the photo pipeline and the ground painter; `level` builds the ground's colliders as
plain data; `physics` gains two slope shapes and a one-way ledge that a sim without them never meets; `render` draws
the ground pages and a scene's tileset squares; `cli` gains `automata scene from-level`, and `art` and `check` take
photos. Imports go down (`content` below `level` and `physics`, `render` above them), every new painter file is held
to the painter's math by `tests/architecture/rules.ts`, and everything the builder's plan names is on the headless
entry (`tests/public-surface.test.ts`). **No golden moved:** the four merges touch only new files under
`tests/golden/` (`photos.json`, `scene-art.json`, `scene.json`, `slopes.json`, and a fifth the plan did not name,
`slope-ledge.json`, recorded in the tracker), and nothing under `template/replays/`. No dependency was added; the one
workflow line (`node scene-smoke.mjs` in `ci.yml`'s `package` job) is the one the plan names. Every commit is by
McThayDT with no AI credit.

The four important findings: the photo materials paint as almost one colour at the fixture's settings, a half slope
whose foot is half way down a tile can leave solid ground nobody can see, the README and the skill promise that a
moved level's recordings still end where they did (they do not, by design), and the path every new game takes through
`from-level` has no same-world proof. No Owner decision is needed to fix them, but I1 changes how scenes look, so its
before and after pictures go to the Owner, and fixing it moves `scene-art.json`, which needs the Owner's yes before it
merges.

## Findings

Sorted by weight. Every fix is for stage 6 (Sonnet, high effort), as one pull request unless the Owner splits I1 out.

| # | Weight | Finding | Fix |
|---|---|---|---|
| I1 | Important | Photo materials come out nearly flat. | Measure, find the cause, test it; the Owner sees the pictures. |
| I2 | Important | A half slope with a half-high foot leaves ground nobody can see. | The slope check covers the foot row. |
| I3 | Important | The docs say a moved level's recordings still end where they did. | Say what really happens. |
| I4 | Important | No same-world proof for a `#` level with the built-in hero. | A fourth case in `scene.parity.test.ts`. |
| M1 | Minor | The shape sentence still says `0..2`. | Name every code. |
| M2 | Minor | The missing-shape sentence names five of nine shapes. | Name all nine. |
| M3 | Minor | A `tiles` ledge is drawn as a whole square. | Refuse it, as a slope is. |
| M4 | Minor | The slope lift's comment contradicts the dash. | Say why the two differ. |
| M5 | Minor | Two ledge-hook changes from the plan are not recorded. | Record them in the tracker. |
| M6 | Minor | `paintedPaths` writes the picture-path rule a second time. | Use `paintedPath`. |
| M7 | Minor | `Art.groundPages`'s type is not exported. | Export it. |
| M8 | Minor | One refusal says "Say what is wrong". | Plain words. |
| M9 | Minor | `oneBoxPerRow` keeps a rule the game may later drop. | Say so in the skill. |

### I1. Photo materials paint as almost one colour

The point of a photo material is that the ground looks like the photo: dirt with clods, bricks with mortar. In CI's own
picture of the fixture's meadow (`ci-screens`, `14a9971/chromium/scene-1280x720.png`, drawn from `artFiles`' bytes by
`tests/features/game/scene.browser.test.ts`), counted pixel by pixel:

- the `brick` patch (photo `brick`, a three-paint `ladder` and a three-paint `accent`, shown one step down as a `back`
  tile) is **one colour**, `#6e3b34` (`brick-dark`), on all 15,000 pixels: no mortar, no second paint;
- the `rock` wall (photo `stone`, `match: 4`) is **one colour**, `#7d7468` (`mortar-dark`), on all 15,500 pixels;
- the `earth` floor (photo `dirt`, three-paint `ladder`, `wear: 0.3`) is 98% `soil`, with scattered `soil-dark` dots.

So at `tile` 16 with the default knobs, two photo materials of three paint as flat colour and the third nearly so. No
test notices: `photo-tile.test.ts` uses a 16 by 16 picture made in the test, and `scene-art.json` pins whatever bytes
the painter gave, flat ones included. A likely cause, not proved (nothing was run): `materialTile` shrinks a 256-pixel
photo to `size * scale * tile` pixels (16 for a one-tile brick) by `resample`, which averages a brick's two-pixel
mortar lines away, and then `clean` with `cluster: 4` takes what is left; the plan dropped the old pipeline's texel-scale
snapping ("No texel-scale snapping"), which is what kept that detail in the first attempt. **Fix:** first a failing
test in `photo-tile.test.ts` that reads real library photos (`dirt`, `brick`, `stone`, at least) at `tile` 16 with the
default knobs and asks for at least three places in a ladder of three, with no one place over 85% of the tile; then
find the stage that loses the detail (print each stage's count of distinct places from the test, in CI) and fix that
stage, keeping the painter's math. The fix moves `tests/golden/scene-art.json` (and, if the fixture changes,
`scene.json` does not: a paint is not in the sim's content). Put the CI pictures before and after in the pull request,
and hold it for the Owner's yes on the golden and the look.

### I2. A half slope with a half-high foot leaves ground nobody can see

`gapsUnder` (the check behind "A slope stands on ground") asks only for the tiles wholly inside a run's triangle
(`tilesUnder`, `row + 1 <= runBottom(run)`). When a run's foot is half way down a tile (an up run that starts on
`half-up-high`, or a down run that ends on `half-down-high`) and the run is longer than one tile, the triangle's
lowest half-row runs on under the next tiles of that row, which the check never asks about. Example: rows `.lh.`,
`h...`, `####`. The run is `{ col: 0, row: 1, w: 3, rise: 1.5, leftY: 1.5 }`; its collider (`groundColliders`:
`row: runTop = 0`, `h: 1.5`) reaches down to 1.5, so the top halves of tiles (1, 1) and (2, 1), both air, are solid in
the sim. `paintScene` paints them as air (`covers` of no shape), the check passes, and a hero walks on ground nobody
can see. The half box `groundColliders` adds is only under the run's own first (or last) tile. **Fix:** in
`scene-ground.ts`, `gapsUnder` also returns each tile of the foot row that the triangle reaches into (its top edge is
above `runBottom`), other than the run's own tiles, when it is not `solid`; `tilesUnder` is unchanged (the boxes there
stay, and their top corners are under the line). Tests: `scene-ground.test.ts` gives the example its two gaps, and
`scene.test.ts` refuses it with the existing sentence at row 1.

### I3. The docs say a moved level's recordings still end where they did

The README's Scenes section says the level "plays and hashes as it did, so its recordings still end where they did",
its `automata scene` section says "The level plays and hashes as it did ... so a recorded play of it still ends where
it did", and `skills/automata-content/scenes.md` ("The commands") says "The level plays and hashes as it did". The
build itself found that this cannot be: a snapshot's hash includes the content's hash, and the scene is content, so
`automata replay` on a moved game says "The game's content has changed since this was recorded, so its hashes were not
compared" (`scene-smoke.mjs` asserts exactly that, and `scene.parity.test.ts` proves the world the same with that hash
blanked). An agent reading the docs will expect a passing replay and be told to record again. **Fix:** the three places
say what is true: the level plays as it did (the same world, tick for tick), and `automata replay` will say the content
changed; record each replay again with the command it gives. `tests/docs/readme.test.ts` gains a line that the README
does not say "hashes as it did".

### I4. No same-world proof for a `#` level with the built-in hero

`sceneFromLevel` writes `oneBoxPerRow` only for a level with no tileset whose hero has no `moves`, because
`spawnLevel` joins the boxes of a `#` level once the hero has `moves`. That is the template's case: `template/` has
`#` rows and a hero with `moves`, so it is what every `automata create` game meets first. `scene.parity.test.ts`
proves three cases the same tick for tick: the fixture game (`#`, no `moves`), the full game (a tileset, `moves`) and
Examples' level (`#`, no `moves`). None is `#` with `moves`, and `scene-smoke.mjs` cannot prove it, since its replay
only plays. The rule is short and very likely right, but it is the one path the plan's "a moved level plays to the same
hash" goal most needs. **Fix:** a fourth case in `scene.parity.test.ts`: the moves game (`tests/fixtures/game/moves-game.ts`,
or the template's own files) played by a fixed list of commands that walks into the wall and jumps, before and after
`withScene`, the worlds compared every 60 ticks with the content hash blanked, as the other three are.

### Minor

- **M1.** `physics/checks.ts` now takes codes 16 to 18, but its sentence still says ``expected a ShapeKind (0..2)``.
  Say `expected a ShapeKind (0, 1, 2, 16, 17 or 18)` and change the one test line.
- **M2.** `sceneInfo.missing['ground.letters.shape']` says `Write "solid", "slope-up", "slope-down", "ledge" or
  "back".`, leaving out the four half shapes. Name all nine, or say `like "solid"` and point at the list in the skill.
- **M3.** A letter whose material is `tiles` may be a `ledge`. The renderer draws the tileset's whole square there and
  the sim holds only its top quarter, so a hero stands on the top of a square it can walk through the bottom of. Refuse
  it beside the slope sentence (`A ledge needs a photo or a flat material: a tileset's tile is a whole square.`), or
  keep it and say so in the skill; the first is the plan's own reasoning for slopes.
- **M4.** `move-step.ts`, step 9b: the comment says the slope's lift of `5/8` of `hover` is taken "as a dash's `hover`
  is taken", but a dash writes all of `hover` (`vy = hover`). Either one is wrong for its job or the comment is: say
  why a dash's full lift is right in the air and `5/8` is right on a slope (the slope parity test pins the second).
- **M5.** Two ledge-hook changes from the plan are sound and in the code's comments, but not in the tracker's rulings:
  the hook reads facts gathered before the step (`ledgeFacts`), because Rapier has the world borrowed while it calls
  the hook, where the plan (and its audit's I4) had the hook read `activeHooks()` from the world; and a body passes up
  through a ledge only when rising faster than `LEDGE_RISE` (0.5 tiles a second), where the plan said any upward speed
  (`linvel().y >= 0` holds). Record both as deviations with those reasons.
- **M6.** `cli/art.ts`'s `paintedPaths` builds `x.png` and `x.atlas.json` from the project's list itself, the rule
  `content/art.ts`'s `paintedPath` and private `atlasPath` already hold. Two copies can drift (a later folder form of
  `[[content]]` is the likely one). Export `atlasPath` beside `paintedPath` and use both.
- **M7.** `Art.groundPages` is typed `readonly GroundPageArt[]`, and `GroundPageArt` is not exported, so the API report
  shows a name a reader cannot import. Export it (it is the same shape as `TileSprite` with `w` and `h`), and take the
  report's new text from the `package` job's log.
- **M8.** `runSceneFromLevel`'s refusal when the made scene does not load ends "Say what is wrong, or write the scene by
  hand." Nobody is there to say it to. Write: `The problems are listed above. Fix them in the level, or write the scene
  by hand.`
- **M9.** `oneBoxPerRow` records a fact about the game when it was moved (its hero had no `moves`). If the game later
  gives its hero `moves`, a moved level keeps one box a row, the seams `spawn-level.ts`'s own comment says a hero
  catches on, where a level with its own rows would have joined them. Say in `scenes.md` that a scene written by hand
  leaves it out, and that a game that switches on `moves` takes it out of its moved scenes.

## Checked and found sound

- **The format and its checks** (`scene.ts`, `scene-ground.ts`) match "The format" key for key, with every sentence
  of the plan's table; "too big" uses the plan audit's M2 formula (`pictureSize`), so 256 by 64 at 16 is the biggest
  (two pages, 2048 tall), as the skill says.
- **`slopeRuns` and `tilesUnder`** agree with the plan audit's sums: a three-tile steep run has three tiles under it,
  a four-tile half run has its two, and a lone `half-up-high` has none and gets a half box from `groundColliders`
  (the plan audit's I5). A run's own tiles are never counted under it.
- **The sim reads only the ground.** `simScene` keeps `format`, `id`, `size` and the ground's `color`, `oneBoxPerRow`,
  letters (letter and shape) and rows; `photo` is in `LEFT_OUT`; a game with no scene and no photo gets the very same
  object (`sim-content.test.ts`).
- **Slopes are switched on by content.** `Ground` exists only in a sim made with `physics({ touching: true, slopes:
  true })`, which `createGameSim` asks for only when the hero has `moves` and a scene has a slope; `stepMoves` with no
  `slope`, or a flat one, is untouched, and a dash returns before step 9b. `moves.json` and `schema-hash.json` did not
  move in any of the four merges.
- **The ledge keeps no state across a step.** `facts` is rebuilt before every `world.step` from the world itself, and
  `isLedge` reads the flag Rapier keeps in the world and its snapshot, so a restored sim needs nothing (the plan
  audit's I4). `colliderMatches` maps our codes 16 to 18 to Rapier's convex polygon and cuboid first, compares a
  slope's three corners as a set, and tells a ledge by its hook flag; `convexHull` answering `null` throws with the
  slope's size.
- **`felt`'s change** (a contact steep enough to be ground is never a wall) can only change a contact whose normal is
  within a hair of 45 degrees both ways (`STEEP` is 0.7), which a game of boxes does not make; no golden moved.
- **The renderer** draws the pages at `(col, 0)` under the tiles, cuts a scene's tileset squares by `placedTiles`, and
  stops drawing boxes once pictures are drawn; `levelViews` gives a slope a sid and no view, so a view's sid is its
  entity's; `LevelPicture.showScene` swaps the art and the sky and redraws (the plan audit's I7).
- **`automata scene from-level`** makes everything and loads it back as a game before writing the first file, refuses
  each case the plan lists with its sentence, adds the block with plan R's `listContent` (one writer for
  `automata.toml`), and paints. The MCP tool `scene_from_level` makes fifteen, and `create-smoke.mjs` counts fifteen.
- **The builder's four noted deviations**, each checked:
  1. *The packed-package replay asserts "the content changed", not the final hash.* Right: the hash includes the
     content hash, so the plan's "the final hash did not [change]" could never hold; the world is proved the same in
     `scene.parity.test.ts` with that hash blanked. What the docs say about it is I3, and the case it leaves out is I4.
  2. *`paintedPaths` derived from the project's list.* Right for the files step (it must not need a painted picture to
     know a path belongs to the game); the second copy of the rule is M6.
  3. *The browser test opts the hero into the example figure.* Right: `loadSceneMovesGame(start, figure = false)`
     keeps `slopes.json`'s content as recorded, and only the browser journey asks for the figure.
  4. *`scene-smoke.mjs`'s line in CI.* The plan names that one workflow line; the `package` job's log shows it ran and
     passed on PR 141's head.
- **Words.** The sentences a person reads say what is wrong and what to write, apart from M2 and M8. The README and
  the skill say "scene file" where a reader could take the browser entry's `Scene` for it (the plan audit's M4).

## Seen in CI's pictures, for the Owner

Not defects of this plan, and nothing to fix in stage 6: on a slope the hero's box rests on its uphill corner, so a
gap shows under its downhill side (a box on a slope does that; a figure with feet drawn at its centre would hide it);
and at a tall or narrow screen the sky fills the room above and below the level, as it does for every level today.
