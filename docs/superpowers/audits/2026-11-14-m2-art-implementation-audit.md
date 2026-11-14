# M2 plan A (art): implementation audit

Stage 5 of the workflow, for the code of [`plans/2026-11-14-m2-art.md`](../plans/2026-11-14-m2-art.md) as merged in
PR 78 (`4e9948f`, branch head `9c43e03`), against that plan, its [plan audit](2026-11-14-m2-art-plan-audit.md) (PR 56),
the [M2 spec](../specs/2026-11-14-m2-design.md) ("Art (plan A)", the content table's `figure`, `backdrop` and
`character` rows, M7 and M8) and the build's report of its deviations and one known fault. Written 2026-11-14.

**Verdict:** the build is sound and close to the plan. All fourteen tasks are there, and every finding of the plan
audit is in the code: I1 the camera stops at `view.most`, I2 a restore puts the camera straight on its shot, I3
`Game.heroes()` and the watch handle's, I4 `sprites.json` on `tests/fixtures/game/sprite-game.ts`, I5 the level's
offset in whole device pixels, I6 and I7 in the handoffs, I8 the painter's rule (`painter-math` and the pure features'
list over `paint-*.ts`, `pixels.ts`, `sheet.ts`, `art.ts` and `lib/png.ts`); M3 `Sprite` only in `spritesPlugin`, M6
`createImageBitmap` with no colour space and no premultiplied alpha, M7 the comment in `stage.ts`, M8 and M9 in the
README, M12 the game drawn under the strict CSP. The PNG writer is the one the plan describes, byte for byte (one
fixed-code block, matches at distance 1 and one row up, CRC-32 and Adler-32 of our own), the painters use only whole
numbers, `Math.round`, `Math.floor` and `dmath`, and no golden on `main` moved: `tests/golden/` gained `art.json` and
`sprites.json` and nothing else, and `tests/fixtures/game/` gained two new files and changed none.

No critical fault was found. Three important ones were: the known "darker column" is not the backdrop but the tiles,
and comes from cutting every picture out of one shared texture; the words a game's author reads name an `automata art`
that `main` does not have yet; and an online game quietly drew boxes, ignoring `readPicture` and the level's `view`.
Five minor ones are noted, three of them fixed. No question for the Owner.

How it was checked: the plan, its audit and the whole diff of PR 78 (`4e9948f^1..4e9948f`, 108 files) were read: every
new file under `src/features/content/`, `src/features/level/` and `src/features/render/`, `src/lib/png.ts`,
`src/features/game/art.ts`, the changes to `game.ts`, `watch.ts`, `sim-content.ts`, `spawn-level.ts`, `hero.ts`,
`tile-runs.ts`, `scene.ts`, `stage.ts` and `render.ts`, `scripts/art.ts`, every new test and fixture, the README's
"Art" section and the skill. `entity-store.ts` was read for what `setClip` does without the component, and
`game/online.ts` and `net/session.ts` for how an online game feeds the renderer. The fifteen `art-*.png` pictures and
the sheets on `ci-screens` under `pr-78/` were read by eye and by pixel (the cause of the column below). Nothing was
run here but that reading of pictures.

## The coordinator's points

- **The darker column** at 1180 by 820 and 1280 by 720: see I1. Overlapping the backdrop's strips by a pixel would
  not have touched it, because it is not where a strip repeats.
- **The reported deviations**, each judged:
  - *Tests written with their code, not pushed red first.* Accepted as done, not as practice: each behaviour the plan
    names has its test on `main` today (every sentence in the plan is quoted by a test, checked by search), so nothing
    is unproved, but no run showed those tests failing for the right reason. This audit's own fixes were pushed red
    first.
  - *`figure` and `backdrop` out of the sim's content.* Accepted, and better than the plan: they say how a thing looks,
    never what happens, so they join the words and the sounds in `simContent`'s list. Which clip plays stays in, since
    it is the `character` file's. A test proves a colour changed in a figure moves no content hash and no state hash.
  - *`fullGamePictures` is async.* Accepted: it loads the game with `loadGame`, which is async.
  - *`props` required on `backdrop`.* Accepted: the plan's table did not mark it optional, the hint says
    `Write [] if nothing stands on the layers.`, and a required list is one form for an agent to write.
  - *`characterParts` takes `sprites`.* Accepted: `spawnLevel` and `heroParts` work `usesSprites` out once and pass
    it, which is the plan's "pass the same answer".
  - *Camera tests in their own file* (`camera.browser.test.ts`). Accepted: the plan's `art.browser.test.ts` would have
    passed 600 lines.
  - *A new fixture, `tests/fixtures/game/snapshot.ts`.* Accepted: the rule is that the M1 fixture game's files do not
    change, and they do not; a new helper beside them changes nothing recorded.
  - *Journeys keyboard-only at every size.* Not accepted for the phone: see M3, fixed.
  - *The smoke imports `tests/fixtures/xxhash64-reference.ts`, copied by one more name in `ci.yml`'s `cp`.* Accepted:
    the package does not export `xxhash64`, and a hash of the tests' own means the installed package is not checked
    by itself. The workflow edit is the one the plan allowed (one more file in the same `cp`).
  - *Online games get no art.* Not accepted: see I3, fixed.
  - *No skill names `automata art`.* Accepted for the skill, which must not name a command that does not exist; but
    see I2.
- **The new goldens.** `art.json` holds the PNG writer's noise picture and the hash of every file the full game paints;
  `sprites.json` is the M1 fixture game with a hero figure and clips, played by `pushScript`. Both were recorded in CI
  inside the pull request. No fix here moves either: the painters, the sheets and the sim are not changed.

## Critical

None.

## Important

**I1. A thin dark line beside a tile: every picture was cut from one shared texture.** The line in `art-1280x720.png`
(Chromium and WebKit) is one pixel wide at x 223, on rows 5 and 7 of the level only, and nowhere on row 6. x 223 is
exactly the left edge of the level's column 2 (the level starts at 85 and a tile is 69.3 pixels), and rows 5 and 7 are
where the flowers (`~`) are. Its colour is the background times 0.78 on the sky and on the hills alike: a quarter of
the meadow's ink. So it is the flower tile, not the backdrop. The canvas is antialiased (four samples a pixel), and a
pixel that a tile covers by less than half has one sample inside the tile while its middle is outside it; the GPU
colours that sample from the pixel's middle, which is past the tile's left edge. Every tile's texture was a frame of
the meadow's one shared picture, so past the flowers' left edge is the plain grass square, whose last column is soil.
At 1180 by 820 the same thing shows at two other tile edges. Firefox in CI draws without antialiasing and shows
nothing, which fits. The same could happen to any picture cut from a sheet whose neighbour reaches the frame's edge:
a pose, a strip, a prop. *Fix:* `loadArt` copies each picture of a sheet into an `ImageBitmap` and a texture of its
own (`createImageBitmap(sheet, x, y, w, h)` with the same exact-colour options), so the edge a sample is clamped to is
the picture's own. A test in three browsers draws the full game's tiles on canvases whose width puts the flowers' edge
part way across a pixel, and finds the pixel beside the edge the colour of the air beside it; it failed in Chromium
and WebKit before the fix.

**I2. The words a game's author reads name an `automata art` that `main` does not have.** `artProblems` says
`Run "automata art".`, `ArtError` says `Run "automata art" to paint it.`, and the README's "Art" says `automata art`
writes the files and `automata check` runs `artProblems`. On `main` there is no `art` command and `check` has no
`art` step: they are plan K's Step A, which waited for this plan. Until it lands an author with the installed package
is told to run a command that is not there. It is not fixed here: Step A is written and is the change that makes all
three true at once. *Handed to plan K's Step A* — **resolved on `main`** while this audit was in review: Step A
merged as `17a86d6` (PR 84), with `automata art` and an `art` step in `automata check`, and is merged into this
pull request.

**I3. An online game drew boxes and ignored `readPicture` and the level's `view`, without a word.** `OnlineOptions`
extends `GameOptions`, so it accepted `readPicture`, and passed it on unread; `startOnlineGame` gave the renderer no
art and no view. The spec builds every game as if it were multiplayer, and a refused or missing capability is never a
quiet fallback. *Fix:* `startOnlineGame` loads the level's art as `startGame` does, before it joins a room (a game
that cannot be drawn joins nothing and leaves nothing on the page), and gives the renderer the art and the level's
`view`. One more thing had to change for the camera to work online: a rollback hands the renderer a resync delta, and
the renderer went straight to the camera's shot on every resync (the plan audit's I2, written for a restore), so an
online camera would have stopped gliding at each correction (plan A's handoff to plan N said to check this). The
renderer now goes straight only when a resync moves the camera's aim more than a tile; a restore moves it far and
still jumps, and a rollback puts the heroes back by a step or two and keeps the glide. Tests: an online game with
pictures and no `readPicture` says what to pass and joins no room; a missing picture stops it with the sentence before
it joins; the hero is drawn as its figure and the crate as its box; and a resync that moves the hero a tenth of a tile
keeps the camera gliding, while the restore test still passes.

## Minor

- **M1. The README's `readPicture` read a missing file as a picture.** `fetch(...).then((r) => r.blob())` resolves for a
  404, so a missing picture was reported as `... is not a picture a browser can read.` instead of
  `The picture ... is missing. Run "automata art" to paint it.` *Fixed:* the README's reader throws when the answer is
  not `ok`, and says why; `ReadPicture`'s comment says the same. The README also says `startOnlineGame` and
  `watchReplay` take `readPicture`.
- **M2. A bitmap was left open when a check stopped the load.** `loadArt` kept a decoded bitmap only once it made a
  texture from it, so a picture of the wrong size, or a tileset whose columns did not fit, left its bitmap to the
  garbage collector. *Fixed* with I1: every bitmap is kept the moment it is read.
- **M3. The phone journey ran with the keyboard.** The plan's "holding right" journey at 390 by 844 holds the Right
  touch button; the build used the arrow key at every size, so no journey played a game with pictures by touch.
  *Fixed:* at 390 by 844 a thumb holds the `Right` button, as the playground journey does.
- **M4. `setClip` and `setFacing` throw a sim error in a game with no sprites.** In a game where no character has a
  figure and no level has a view, the sim has no sprite component, and the call throws
  `unknown component "sprite": register it in a plugin`. A game only calls them for a character it gave clips, and
  clips need a figure, so it is unlikely. *Fixed* in the words only: both comments say when they can be called.
- **M5. The tileset sentence always names `content/figures/meadow.png`.** `There is no picture at "art/meadow.png". Put
  one there, or use a figure's picture, like content/figures/meadow.png.` is the plan's sentence and reads as an
  example, but in another game that file does not exist. *Noted*, not changed: plan K's Step A kept the sentence as it
  is; naming the game's own first painted picture is a small change for whichever plan next touches `artProblems`.

## Notes

- `needsPictures` is true for any level with a tileset, so a game made with plan C's tilesets and no pictures now
  needs `readPicture`. Nothing outside this repo had one (Examples' level has no tileset), and the plan asked for it.
- An online game's camera follows every hero in the room, including the other players', as a shared screen does. A
  page that should follow only its own player is a choice for plan U's screens, through `look`.
- `loadArt` loads the figure of every character in the game, not only those in the level. It is what the plan says,
  and a game's cast is small; a game with many levels may want it per level later.

## Fixes

Each test was pushed red first, then the code.

1. `tests/features/render/art.browser.test.ts`: `a tile whose edge falls part way across a pixel shows nothing of the
   square beside it in the picture`. `src/features/render/art.ts`: each picture of a sheet is a texture of its own,
   and every bitmap is kept as it is read (I1, M2).
2. `tests/features/game/online-art.browser.test.ts` (new) and `tests/features/render/camera.browser.test.ts`:
   `an online game's rollback, a resync that moves the hero a little, keeps the glide`. `src/features/game/online.ts`
   loads the art and passes the art and the view; `src/features/game/art.ts` speaks for `startOnlineGame`;
   `src/features/render/render.ts` jumps on a resync only past one tile (I3).
3. `tests/features/game/art.browser.test.ts`: the phone's run holds the Right button (M3).
4. `README.md` and `ReadPicture`'s comment: a reader that throws for a missing file; online and watch take
   `readPicture` (M1). `src/features/level/sprite.ts`: when `setClip` and `setFacing` can be called (M4).

None moves a golden, and nothing exported changes its type, so the API report does not move.
