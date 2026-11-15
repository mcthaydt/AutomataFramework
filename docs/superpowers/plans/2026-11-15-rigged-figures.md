# Plan R: Rigged Figures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session at a time, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One `figure` file makes a whole person or four-legged animal from sliders, dressed from a library, walking,
standing and posed by its hands and feet, painted by the framework as shaded pixel art from the side, the front and the
back; free figures (format 1) stay exactly as they are; and a new content file can be listed in `automata.toml` by a
function and a command.

**Architecture:** Everything is in the `content` feature, flat, one job per file. A rigged figure (`"format": 2`) is
read by the same `figure` kind as a free one. Its sliders become a flat skeleton (`rig-*.ts`); a pose is two bends per
joint, written straight or solved from where a hand or a foot is put (`rig-solve.ts`); gaits and stands make poses
(`motion-*.ts`); pieces are shapes laid on bones; a **kit** (`figure-kit.ts`) is the library's pieces, gaits, stands
and palette with the game's own on top. One painter (`paint-rigged.ts` over `paint-shapes.ts`) fills each view's shapes
in steps of a colour's ramp. `paintFigure` and `figureSheet` take the kit and send a free figure down today's path
untouched. `level` gains a switched-on `Side` component for the view; `render` picks the picture by pose, view and
player. `cli` gains `automata add`.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.6.6, smol-toml (already in `content`), PixiJS 8.22.0, Koota 0.6.6,
Effect (the `cli` feature only), Vitest 5.0.3 (browser mode and journeys on Playwright 1.63.0), Biome 2.5.15, knip
6.39.0, pnpm 10.34.6, Node 24.21.0. **No new dependency.**

**Spec:** [`docs/superpowers/specs/2026-11-15-rigged-figures-design.md`](../specs/2026-11-15-rigged-figures-design.md).
Read it first; this plan argues from it and does not repeat its reasons. Its partner, the builder's spec, is
AutomataFrameworkEditors' `docs/superpowers/specs/2026-11-15-2d-figure-builder-design.md`; "For the editors" at the end
of this plan lists what that builder takes from here. Principles served: 5, 1, 3 and 7.

## Global Constraints

- **No existing golden moves.** Everything in `tests/golden/` today (`art.json`, `sprites.json`, `schema-hash.json` and
  the rest) and `template/replays/level-1.json` keep their hashes. A format 1 figure reads to the same value, paints
  the same bytes and has the same sheet and atlas. If one differs in CI, stop that task and report it. Never re-record.
- **One new golden:** `tests/golden/figures.json`, the hashes of the rigged fixtures' pictures and atlases. Each task
  that adds pictures commits their keys with `""` and takes the hashes from CI's "GOLDEN NOT RECORDED" message, as
  `art.parity.test.ts` does. Before recording, look at the contact sheet on `ci-screens` (Task 5 makes it). A hash
  recorded in an earlier task of this plan may move in a later one only when the commit names it and says why.
- **Free figures are not touched.** `paint-figure.ts` keeps its code but for one line: its type import becomes
  `import type { FreeFigure as FigureFile, FigurePart, FigurePose } from './figure.ts'`, because once `FigureFile` is the
  union its `figure.parts` no longer types (audit I3). Its function keeps its name; `paint.ts` imports it as
  `paintFigure as paintFree`. `figure.ts` keeps the format 1 schema, types and words as they are. The template and the
  full-game fixture are not changed by this plan.
- **Public names.** Every name this plan adds reaches `src/headless.ts` and `src/index.ts` through `export *`, beside
  physics' `Body` and render's `View`: a second `Body` or `View` is a TS2308 error there (audit I2). A body plan is
  `BodyPlan` and a figure's view is `FigureView`; check every new exported name against `tests/public-surface.test.ts`
  and the API report before using it. Each task exports what it makes from `content.ts` when it makes it, and adds
  those names to the public-surface test, so the editors can use a part as soon as it is on `main`.
- **Painter rule.** Every file that paints or works out a pose (`paint*.ts`, `rig-*.ts`, `motion-*.ts`, `figure-poses.ts`) uses `+ - * /`,
  comparisons, `Math.min`, `Math.max`, `Math.abs`, `Math.floor`, `Math.ceil`, `Math.sqrt` (every engine rounds it
  the same way), and `sim/dmath.ts` for `sin`, `cos`, `atan2` and `hypot`. No other `Math` function, no clock, no
  I/O, no canvas. `asin(s)` is `atan2(s, Math.sqrt(1 - s·s))`; nothing is added to `dmath`. Widen `PAINTER_FILES` in
  `tests/architecture/rules.ts` to cover `paint.ts`, `rig-`, `motion-` and `figure-poses.ts` in Task 3 (today's
  pattern, `paint-[^/]+`, does not match `paint.ts`). `Math.sqrt` already passes the rule (it is not in
  `PAINTER_MATH`, and `dmath.hypot` uses it).
- **Angles are degrees in files and in code; whole or one decimal.** Lengths in files are pixels of the picture.
- **No 3D maths:** no matrices, no quaternions, no camera. A bone's direction is two angles (below).
- **A picture is at most 2048 pixels a side** and has at most 255 colours.
- **Every field has a `.describe()` sentence** in the plain voice, and every refusal a sentence that says what to write.
  Words never name a colour for what it looks like on screen (a ramp's id is a name, which is fine).
- **No file over 600 lines.** `figure.ts` is at 282: the rigged schema goes in its own files.
- **Strategy, pricing and positioning stay out** of every file.
- **No new dependency.** If a task seems to need a package, stop and report.
- **Tests run only in GitHub-hosted CI.** Run nothing locally: no install, typecheck, lint, build, test or generator.
  Push, then read the pull request's CI run. Write each test first and push it red before its code.
- **Generated files.** `schemas/*.json` and `docs/api/framework.api.md` are committed. When the `package` job fails on
  `pnpm schemas --check` or `pnpm api-report`, take the new text from that job's log and commit it.
- **Commits:** author and committer `McThayDT <107786093+mcthaydt@users.noreply.github.com>`; set the config before
  every commit; a local hook refuses any other author; no AI attribution anywhere; never force-push.
- **An Owner question is never defaulted.** Send it to the coordinator with options and a recommendation, and wait.
- **Tracker:** after each task, update `docs/superpowers/progress.md` (Cycle 7). Tasks 1 to 20 are 4.5% of stage 4
  each; the last 10% is the final green run of each part.

## How the work is cut

Seven parts, each its own branch and pull request, merged in order, each leaving `main` green and each ending with
something Examples can use once it moves its pin. A part is a fresh session (the 90-minute rule); the tracker says
where the last one stopped.

**Part 0 comes first** (audit I1). `listContent` and `automata add` need nothing from the rig, and three plans each
planned their own `project-write.ts` (this one, the scenes plan's slice 1 in pull request 113, and the sound plan M's
`withFolders` in pull request 112), while the editors' plan G needs the writer in its first pull request. Part 0 is
the one writer; the others take it. Its tasks keep their numbers (17 and 18) so every reference below still holds.

| Part | Tasks | After it, a game can |
|---|---|---|
| 0. The way in for a new file | 17 and 18 | be given any new content file by `listContent` or `automata add` |
| 1. A person from the side | 1 to 5 | list a palette and a format 2 person, and paint it standing, shaded, with players' colours |
| 2. Pieces | 6 to 8 | dress it from the library and its own piece files |
| 3. Motion | 9 to 12 | pose it by bends or by hands and feet, and give it a walk, a run and an idle for clips to play |
| 4. Views | 13 to 14 | paint front and back views and show them in play (starts after plan H, pull request 101, and plan T, pull request 64, are on `main`: Task 14 changes `hero.ts`, which plan H rewrites, and the cutscene player is plan T's) |
| 5. Animals | 15 to 16 | do all of that for a four-legged animal |
| 6. Starters and the docs | 19 to 20 | start from a starter, and read how in the README and skills, end to end |

## Review Focus

Each line is pinned by a test in the task named.

1. **A file between the two formats** (a format 1 file with `body`, a format 2 file with `parts`, a format 2 file with
   no `body`): one sentence that says which format has that key, never a page of both formats' complaints. (Task 2)
2. **Sliders at their ends together** (every slider at -0.2, every one at 1.2, `height` 8 in a 128 frame, `height`
   equal to the frame): the painter never throws, never gives a number that is not finite, and paints at least one
   pixel. (Task 5)
3. **The game's own piece, gait, stand or palette with the library's id** wins, and one for the other body plan is
   refused where it is used, naming the body. (Task 6)
4. **A pose that both places a hand and bends that arm** is refused with a sentence that says to keep one. (Task 10)
5. **An `automata.toml` a person has changed** (Windows line ends, no newline at the end, a comment after the last
   block, `content = [ … ]` written on one line): the writer keeps every byte it does not add, or refuses with a
   sentence; it never rewrites the file. (Task 17)

## The model (read once; every task uses it)

### Two bends per joint

A bone has a length and two angles from "hanging straight down": `bend` (forward is more, back is less) and `out` (away
from the body's middle is more). A child's angles are its parent's plus its own. A bone with angles `b` and `o` points

```
forward = sin(b) · cos(o)      sideways = sin(o)      down = cos(b) · cos(o)
```

The side view draws `(forward, down)`, facing right. The front view draws `(sideways, down)`, with the figure's own
left on the picture's right; the back view draws `(-sideways, down)`. In the front and back views `forward` only
orders what is in front of what. This is the spec's "a rule, not a camera", and the whole of the figure's third
direction. A person's trunk bones (hips, spine, chest, neck, head) are measured from "pointing straight up" the
same way, so a standing person is all zeros. An animal's are not (audit I7): its `hips`, `spine` and `chest` are
measured from "pointing forward, along the ground", its `tail-1` from "pointing back, along the ground", and its
`neck`, `head`, `jaw` and ears from "pointing forward" too, so `bend` raises them (more is up) and a standing animal
is all zeros under the rest bends Task 15 gives (the neck's 40 up, the ears' droop, the tail's curl). Its legs hang
from "straight down" as a person's do.

### Where it stands

The figure's middle is at `x = floor(frame.w / 2)`; the ground is the row `frame.h - 1`, or `frame.h - 2` when the
figure has an outline. What falls outside the frame is cut off, as for a free figure.

### Bones, places and limits

**Person** (19 bones): `hips`, `spine`, `chest`, `neck`, `head`; for `left` and `right`: `shoulder-<side>`,
`upper-arm-<side>`, `forearm-<side>`, `hand-<side>`, `thigh-<side>`, `shin-<side>`, `foot-<side>`. Parents: `spine`
on `hips`, `chest` on `spine`, `neck` on `chest`, `head` on `neck`, `shoulder` on `chest`, then down the arm; `thigh`
on `hips`, then down the leg. Places: `hand-left`, `hand-right`, `foot-left`, `foot-right`, `head`, `hips`.

**Animal** (23 bones): `hips`, `spine`, `chest`, `neck`, `head`, `jaw`, `ear-left`, `ear-right`, `tail-1`, `tail-2`,
`tail-3`; for `front-left`, `front-right`, `hind-left`, `hind-right`: `<leg>-upper`, `<leg>-lower`, `<leg>-foot`. The
spine runs along the ground (the side view draws `hips` to `chest` left to right). Places: the four `<leg>-foot`,
`head`, `hips`, `tail-3`.

Limits, in degrees, own bend from least to most (from the old builder's `DEFAULT_RIG_LIMITS`, laid flat):

| Joint | `bend` | `out` | | Joint | `bend` | `out` |
|---|---|---|---|---|---|---|
| `spine`, `chest` | -20 to 30 | -15 to 15 | | `<leg>-upper` (front) | -60 to 60 | -30 to 30 |
| `neck` | -20 to 25 | -20 to 20 | | `<leg>-lower` (front) | -120 to 10 | -30 to 30 |
| `head` | -25 to 30 | -25 to 25 | | `<leg>-upper` (hind) | -70 to 50 | -30 to 30 |
| `shoulder` | -10 to 10 | -10 to 20 | | `<leg>-lower` (hind) | -10 to 120 | -30 to 30 |
| `upper-arm` | -60 to 170 | -20 to 170 | | `<leg>-foot` | -40 to 40 | -20 to 20 |
| `forearm` | 0 to 150 | -90 to 90 | | `tail-1` to `tail-3` | -90 to 90 | -45 to 45 |
| `hand` | -60 to 60 | -30 to 30 | | `jaw` | 0 to 35 | 0 |
| `thigh` | -30 to 120 | -20 to 90 | | `ear` | -45 to 45 | -45 to 45 |
| `shin` | -150 to 0 | -90 to 90 | | animal `neck`, `head` | -45 to 60 | -30 to 30 |
| `foot` | -40 to 50 | -20 to 20 | | animal `spine`, `chest` | -15 to 15 | -15 to 15 |

### Names of pictures

A rigged figure's poses, in this order: `idle-1` to `idle-n` (its stand), `walk-1` to `walk-n` and then `run-1` to
`run-n` (a person's gait) or `trot-1` to `trot-n` (an animal's), then its own poses in file order. The first picture is
always `idle-1`. A frame is named `<pose>` in the side view, `front/<pose>` and `back/<pose>` in the others, and
`<variant>/…` before any of those for a variant. A rigged figure's sheet has `min(32, floor(2048 / frame.w))` pictures
in a row (a free figure keeps 8), in the order: the figure then each variant; in each, side then front then back; in
each, the poses. A sheet taller than 2048 is refused with the numbers; it never spills into a second picture (the
spec left this open: 32 across and 51 rows hold 1,632 pictures of 32 by 40, enough for the demo's figures several
times over. A figure at every limit at once, 72 poses in three views for itself and eight variants, is 1,944 pictures
and is refused with the numbers, which is the right answer for a figure that big).

## File structure

All under `src/features/content/` unless a path says otherwise.

```
palette.ts            the `palette` kind: colour ramps
figure.ts             (modify) format 1 as it is; `FigureFile` becomes the union; `figureInfo` reads both
figure-rigged.ts      the format 2 types and schema, and its checks inside one file
figure-sliders.ts     the slider and face tables: name, range, default, sentence (people, animals, faces)
figure-check.ts       the format 2 checks against other files (palette, pieces, gait, stand, sheet size)
figure-kit.ts         the library read once, and a game's own files laid over it
figure-poses.ts       every pose of a figure by name, as bends: idle, walk, run or trot, its own
rig.ts                bones, parents, places and limits for each body plan; the two-bends rule
rig-person.ts         a person's sliders to bone lengths and widths
rig-animal.ts         an animal's sliders to bone lengths and widths
rig-pose.ts           bends to where every bone is in a view, and what is in front of what
rig-solve.ts          a place to bends: the two-bone rule in a plane, the trunk's lean, the limits
piece.ts              the `piece` kind
gait.ts, stand.ts     the `gait` and `stand` kinds
motion-walk.ts        a gait's numbers to walk, run and trot poses
motion-idle.ts        a stand's numbers to idle poses
paint-shapes.ts       filling one shape in the steps of a ramp, the far-part line, the outline
paint-face.ts         eyes, brows, mouth and nose on a head
paint-rigged.ts       a rigged figure's sheet: body, pieces and face, for every pose, view and variant
paint-figure.ts       (unchanged) the free painter
paint.ts              `paintFigure(figure, kit?)` and `paintFrame(…)`: which painter runs
sheet.ts              (modify) `figureSheet(figure, kit?)`
art.ts, load.ts, content-types.ts, content.ts, character.ts, backdrop.ts, cutscene.ts   (modify)
project-write.ts      `listContent`: one `[[content]]` block added to the project's text
library/palette.json, pieces-person.json, pieces-animal.json, gaits.json, stands.json, starters.json
src/features/level/side.ts        the `Side` component, `setSide`, `usesSides`
src/features/render/{scene,art,stage,still}.ts   (modify) the view chooses the picture
src/features/cli/add.ts           `automata add`
tests/fixtures/figures/           a small game: a palette, a person, an animal, a free figure, its own piece
tests/features/content/…          one test file for each source file above
tests/golden/figures.json
```

`paint.ts` exists so `paint-figure.ts` is not edited: move the export of `paintFigure` in `content.ts` to it.

---

## Part 1: a person from the side

### Task 1: The `palette` kind and the library's palette

**Files:** Create `palette.ts`, `library/palette.json`; modify `content-types.ts` (the row goes after `figure`),
`load.ts` (`GameContent.palettes?`), `content.ts`. Tests: `palette.test.ts`, `content-types.test.ts`,
`json-schema.test.ts`, `tests/features/cli/mcp.test.ts` (it counts the schema resources, 15 today; each new kind in
Tasks 1, 6, 11 and 12 adds one, so 19 by Task 12).

**Interfaces:**
- Produces: `interface Ramp { id: string; colors: readonly string[] }`,
  `interface PaletteFile { format: 1; id: string; ink?: string; ramps: readonly Ramp[] }`, `PaletteSchema`, `paletteInfo` (title
  "Palette", plural `palettes`, editor `characters`, part `palette`, noun "palette"),
  `LIBRARY_PALETTE: PaletteFile` (id `automata`), `lightness(colour: string): number`,
  `inkOf(palette: PaletteFile): string` (its `ink`, else the darkest step of its darkest ramp).

| Field | Rule |
|---|---|
| `format`, `id` | as every kind |
| `ink` | opt, a colour: "The one near-black an "ink" edge, eyes and brows are drawn in. Left out means the darkest shade in the palette." (audit I5) |
| `ramps` | 1 to 64 of `{ id, colors }` |
| `ramps.id` | `Id`: "A name for this colour, like "tan" or "moss"." |
| `ramps.colors` | 3 to 6 colours: "The colour's shades, from dark to light. A figure is shaded with them." |

Checks: `unique` on ramp ids (noun "colour"). `lightness` is `2126·r + 7152·g + 722·b` in whole numbers; at
`ramps[i].colors[j]` when it is not more than the one before:
`These shades must go from dark to light, and "#885041" is not lighter than "#9a624c".`

**The library's palette** is the old builder's DUEL ramps
(`AutomataFrameworkFailed@ed8592e8:extensions/figures/src/shared/paint/duel-ramps.ts`, rows 0 to 31 in order), each
ramp the row's steps 1, 2, 3, 5 and 6, named in row order: `slate`, `cream`, `brown`, `sea`, `ember`, `lilac`, `moss`,
`navy`, `sage`, `rose`, `steel`, `clay`, `bark`, `plum`, `teal`, `sand`, `tan`, `violet`, `crimson`, `russet`, `olive`,
`gold`, `dusk`, `leaf`, `umber`, `mint`, `cobalt`, `sunset`, `amethyst`, `indigo`, `mauve`, `flame`. Row 28 is not
called `ink`: its kept steps run from `#3c3151` to `#baabf7`, a purple, and a ramp called `ink` would put purple eyes
on every figure that left `eyes` out (audit I5). The library's `ink` is the old painter's outline colour,
`RAMP_OUTLINE` (`#002219`, row 6's step 0), so an "ink" edge looks as the old builder's did. Where a row's five
steps do not get lighter each time, take the nearest step that does and say so in the commit. The file opens with the
row it came from in no field: JSON has no comments, so the port is recorded in `palette.ts`'s header comment.

- [ ] **Step 1: Write the failing tests:** a palette reads and `writeContent` gives it back byte for byte; each rule
  and sentence above; an unknown key is refused; `LIBRARY_PALETTE` reads through `PaletteSchema`, has 32 ramps of 5
  and the ids above in order; `loadGame` on a game with no palette has no `palettes` key (its content hashes as it
  did); the content table lists `palette` after `figure`.
- [ ] **Step 2: Push; `check` fails.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Push; take `schemas/palette.schema.json` from the `package` job's log; push; every job passes.**
- [ ] **Step 5: Commit** `feat(content): palettes of colour ramps, and the library's palette`

### Task 2: The format 2 file for a person, with every slider a sentence

**Files:** Create `figure-rigged.ts`, `figure-sliders.ts`, `figure-check.ts`; modify `figure.ts`, `content.ts`,
`character.ts` and `backdrop.ts` (they read `figure.poses`; see Produces). Tests: `figure-rigged.test.ts`,
`figure-sliders.test.ts`, `figure.test.ts` (untouched assertions still pass).

**Interfaces:**
- Consumes: `PaletteFile`, `LIBRARY_PALETTE` (Task 1).
- Produces:
  - `type FreeFigure` (today's `FigureFile`, renamed; `format: 1`), `interface RiggedFigure` (`format: 2`),
    `type FigureFile = FreeFigure | RiggedFigure`, `isRigged(figure): figure is RiggedFigure`.
  - `interface Slider { id: string; min: number; max: number; normal: number; about: string; group: string }`,
    `PERSON_SLIDERS`, `FACE_SLIDERS`, `FACE_STYLES` (`readonly Slider[]` and
    `{ eyes: readonly string[]; brows: readonly string[]; mouth: readonly string[] }`).
  - `posesOf(figure: FigureFile): readonly string[]` in `figure.ts`: a free figure's pose ids; for a rigged one, for
    now, `['idle-1']`. `noPose` takes the list. `character.ts` and `backdrop.ts` call `posesOf`, so later tasks widen
    one function. When Task 5 widens it to take the kit, move it to `figure-poses.ts` and have `character.ts` and
    `backdrop.ts` import it there: `figure-poses.ts` needs `isRigged` from `figure.ts`, so `posesOf` left in
    `figure.ts` would make a file cycle, which `tests/architecture.test.ts` refuses.
  - `FigureSchema` reads both: told apart by `format` (the `variants` helper in `shared.ts`; if Zod refuses refined
    options there, keep two schemas and choose by `format` in one `z.custom` that runs the right one and passes its
    issues through). `figureInfo.check` is `checkRigged` from `figure-check.ts` for a rigged figure and nothing for a
    free one.
  - `figureInfo.missing` is one map for both formats (`Voice.missing`, keyed by the path without list numbers), and
    today's advice for `paints`, `outline`, `variants.paints` and `poses.moves` is format 1's ("each with an id and a
    color"), which is wrong for a format 2 file (audit I10). Write every key both formats share in words true of
    both, give format 2's own keys their own advice (`body`, `sliders`, `paints.skin`, `palette`, `pieces.piece`,
    `poses.bends`, …), and keep each format 1 sentence word for word where it already fits.

The file, in key order (this task's keys; later tasks add `pieces`, `shapes`, `gait`, `stand`, `poses`, `views` where
the table says):

| Field | Rule |
|---|---|
| `format` | `2` |
| `id` | as every kind |
| `body` | `"person"` (Task 15 adds `"animal"`): "What it is built on." |
| `tile` | as format 1 |
| `frame` | as format 1 |
| `views` | Task 13 |
| `sliders` | opt, the table below; a slider left out is at its normal |
| `face` | opt: `eyes`, `brows`, `mouth` (each one of `FACE_STYLES`) and the face sliders |
| `paints` | `{ skin, hair?, eyes? }`, each a ramp's id; `hair` left out means no cap of hair is drawn (a hair piece or a hat still may be); `eyes` left out are drawn in the palette's `inkOf`. No default names a library ramp, because a game's own palette need not have it (audit I5) |
| `pieces`, `shapes` | Tasks 6 and 7 |
| `gait`, `stand`, `poses` | Tasks 9 to 12 |
| `palette` | opt, `Id`: "The palette its colours are named in. Left out means the framework's own." |
| `outline` | opt, `"dark"` or `"ink"`: "An edge one pixel wide round the figure: "dark" is each colour's darkest shade, "ink" is one near-black. Left out means no edge." |
| `variants` | opt, at most 8 of `{ id, paints?, pieces? }`; `paints` as above, every key optional (`pieces` Task 6); an id of `side`, `front` or `back` is refused: `"front" is the name of a view. Give these colours another name, like "two".` |

**Sliders (a person).** Every slider but `height` and `headTilt` runs -0.2 to 1.2 ("a little past either end, for
figures meant to look wrong"); `group` is how the editors fold them.

| `id` | Normal | Group | Sentence |
|---|---|---|---|
| `height` | 24 (8 to 120) | body | How tall it stands, in pixels, from the ground to the top of its head. |
| `build` | 0.5 | body | How big its frame is, from slight to broad. |
| `legs` | 0.5 | body | How long the legs are, from short to long. |
| `arms` | 0.5 | shape | How long the arms are, from short to long. |
| `shoulders` | 0.5 | shape | How wide the shoulders are, from narrow to wide. |
| `hips` | 0.5 | shape | How wide the hips are, from narrow to wide. |
| `fat` | 0.4 | shape | How soft and round it is, from lean to round. |
| `muscle` | 0.5 | shape | How thick its arms and legs are, from thin to strong. |
| `head` | 0.6 | head | How big the head is, from small to big. |
| `neck` | 0.5 | head | How thick the neck is, from thin to thick. |
| `neckLength` | 0.4 | head | How long the neck is, from none to long. |
| `hands` | 0.5 | ends | How big the hands are, from small to big. |
| `feet` | 0.5 | ends | How big the feet are, from small to big. |
| `posture` | 0.5 | stance | How it carries itself, from slouched to proud. |
| `hunch` | 0 | stance | How far the shoulders round forward, from square to hunched. |
| `headTilt` | 0 (-30 to 30) | stance | How far the head leans to one side, in degrees. |
| `age` | 0.3 | age | How old it looks, from young to old: an older figure stoops and steps shorter. |
| `chunk` | 1 | style | How blocky it is, from life-like to chunky pixel art. |

**Face sliders** (0 to 1, normal 0.5 unless said): `eyeSize`, `eyeSpacing`, `eyeTilt`, `browWeight`, `nose` (0.3),
`cheeks` (0.3), `jaw`. Styles: `eyes` one of `dots`, `ovals`, `wide`, `sleepy`, `closed` (normal `dots`); `brows` one
of `none`, `soft`, `straight`, `heavy`, `arched` (normal `soft`); `mouth` one of `none`, `line`, `smile`, `frown`,
`open` (normal `line`). Write each one's sentence in the same voice ("How far apart the eyes are, from close to
wide."). The styles are a list in code, not content files: a face is a handful of pixels, and a style is how the
painter places them (a recorded reading of the spec's "from the library").

Checks inside the file: `height` at most `frame.h - 2`:
`This figure is 40 pixels tall but its frame is 32. Make "height" 30 or less, or the frame taller.`
Checks against other files (`checkRigged`): the palette is the game's or the library's, else the shared `noSuch`
sentence (owner "This game and the framework"); each paint's ramp is in that palette, else
`There is no colour called "tann" in the palette "automata". It has: bark, brown, …`.

- [ ] **Step 1: Write the failing tests:** the spec's example file, cut to this task's keys, reads and writes back
  byte for byte; a slider at its normal still writes when written (the file is kept as written); each rule and
  sentence; every slider and style has a sentence, a group and a normal inside its range; Review Focus 1's three
  files, each giving exactly one problem; every format 1 fixture and the template's two figures read to the value
  they read to on `main` (compare `JSON.stringify` of the parse with the file's own text); `posesOf`; a format 2
  file missing `paints`, and one with a variant missing `paints`, each give advice that is true of format 2, and the
  same keys on a format 1 file give today's words; a figure on a game palette with no `bark` and no `ink` ramp,
  leaving `hair` and `eyes` out, has no problem.
- [ ] **Step 2: Push; red.** **Step 3: Implement.**
- [ ] **Step 4: Push; take `schemas/figure.schema.json` and the API report from the `package` job's log; green; no
  golden moved.**
- [ ] **Step 5: Commit** `feat(content): the rigged figure file for a person, every slider with its sentence`

### Task 3: A person's skeleton, and where its bones are

**Files:** Create `rig.ts`, `rig-person.ts`, `rig-pose.ts`; modify `tests/architecture/rules.ts` (`PAINTER_FILES`).
Tests: `rig.test.ts`, `rig-person.test.ts`, `rig-pose.test.ts`.

**Interfaces:**
- Consumes: `RiggedFigure`, `PERSON_SLIDERS`.
- Produces:
  - `type BodyPlan = 'person' | 'animal'`, `type FigureView = 'side' | 'front' | 'back'`,
    `BONES: Record<BodyPlan, readonly { id: string; parent: string | undefined; trunk: boolean; side: -1 | 0 | 1 }[]>`,
    `PLACES: Record<BodyPlan, readonly string[]>`,
    `LIMITS: Record<BodyPlan, Record<string, { bend: readonly [number, number]; out: readonly [number, number] }>>`
    (the table in "The model"; a sided bone is looked up without its side).
  - `interface Bone { id: string; length: number; near: number; far: number; offset: { forward: number; sideways: number; down: number } }`
    (`near` and `far` are its half-width at each end; `offset` is where it starts from its parent's end),
    `interface Skeleton { body: BodyPlan; bones: readonly Bone[]; ground: number; middle: number }`,
    `skeletonOf(figure: RiggedFigure): Skeleton`.
  - `type Bends = Readonly<Record<string, { bend?: number; out?: number }>>`,
    `interface Placed { id: string; ax: number; ay: number; bx: number; by: number; depth: number; near: number; far: number; shown: number }`
    (a bone's two ends in the frame's pixels in one view, how near the eye it is, and how much of its length shows),
    `placeBones(skeleton: Skeleton, bends: Bends, view: FigureView, hips?: { x: number; y: number }): readonly Placed[]`,
    sorted back to front.

**A person's measures**, with `H = height`, `lerp(a, b, t) = a + (b - a)·t`, and `c = chunk`:

| Measure | Rule |
|---|---|
| head height | `H · lerp(0.14, 0.26, head) · lerp(1, 1.25, c)`; head width `0.85` of it, `· lerp(0.9, 1.1, jaw)` |
| neck | length `H · lerp(0, 0.06, neckLength) · lerp(1, 0.5, c)`; half-width `H · lerp(0.02, 0.05, neck)` |
| legs (thigh + shin + foot height) | `(H - head - neck) · lerp(0.42, 0.6, legs)`; thigh and shin half each; foot height `H · 0.04` |
| trunk (hips + spine + chest) | what is left, split 0.3, 0.3, 0.4 |
| arm | `H · lerp(0.3, 0.44, arms)`; upper arm 0.45, forearm 0.4, hand 0.15 of it, the hand `· lerp(0.8, 1.3, hands)` |
| shoulder half-width (front) | `H · lerp(0.09, 0.16, shoulders) · lerp(0.9, 1.15, build)` |
| hip half-width (front) | `H · lerp(0.07, 0.13, hips) · lerp(0.9, 1.15, build)` |
| trunk half-depth (side) | `H · lerp(0.05, 0.09, build) · lerp(1, 1.5, fat)` |
| limb half-width | `H · lerp(0.02, 0.045, muscle) · lerp(1, 1.3, c)`, the shin and forearm 0.8 of it |
| foot length | `H · lerp(0.08, 0.14, feet)` |
| standing bends | `spine.bend = lerp(8, -4, posture) + 6·age`, `chest.bend = 10·hunch + 6·age`, `neck.bend = 8·hunch`, `head.out = headTilt` |

A measure is never less than half a pixel. The standing bends are part of the skeleton's rest: `placeBones` adds them
under whatever a pose says.

`placeBones` walks parents before children, adds angles, and draws by the two-bends rule. Depth: in the side view the
figure's left arm and leg are the far ones (`depth` -1), the trunk 0, the right ones 1; in the front view depth is
`forward` at the bone's middle (the trunk 0), and the back view is the front's with depth turned over.

- [ ] **Step 1: Write the failing tests:** every bone but `hips` has a parent in the list, and every limit names a
  bone; at the normals with `height` 24 the head's top is at `ground - 24` within half a pixel and both feet end on
  the ground; `legs` at 1 makes the thigh longer than at 0 and leaves the height the same; a zero pose in the side
  view draws both arms straight down; `upper-arm-right` with `bend: 90` ends `length` pixels forward of its start in
  the side view and is drawn with `shown` 0 (end on) in the front view; with `out: 90` the other way round; the back
  view mirrors the front; sliders at -0.2 and at 1.2 give finite, positive lengths.
- [ ] **Step 2: Push; red.** **Step 3: Implement.** **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(content): a person's skeleton from sliders, placed by two bends a joint`

### Task 4: Fill a shape in the shades of a colour

**Files:** Create `paint-shapes.ts`. Test: `paint-shapes.test.ts`.

**Interfaces:**
- Consumes: `Picture`, `createPicture` (`pixels.ts`).
- Produces:
  - `interface Ink { readonly steps: readonly number[] }` (a ramp's places in the picture's palette, dark to light),
  - `interface Layer { readonly picture: Picture; readonly owner: Uint8Array }` and
    `createLayer(w: number, h: number, palette: readonly number[]): Layer` (which part painted each pixel),
  - `fillLimb(layer, part: number, ax, ay, bx, by, near, far, ink: Ink, dim: boolean): void` (a line with round ends
    whose half-width goes from `near` to `far`),
  - `fillRound(layer, part, cx, cy, rx, ry, turn, ink, dim): void`, `fillBlock(layer, part, cx, cy, w, h, turn, ink, dim): void`,
  - `edge(layer: Layer, mode: 'dark' | 'ink', inks: ReadonlyMap<number, Ink>, inkPlace: number): void`.

The rules (the old painter's, `paint-style.ts` and `paint-tones.ts` at `ed8592e8`, kept and laid flat):

1. A pixel is in a shape when its middle is; it is painted or clear, never half.
2. The base shade is the ramp's middle step, `floor(steps.length / 2)`. The light comes from up and left. For a pixel
   whose middle is `(dx, dy)` from the shape's own middle line, as a share of the shape's half-width there,
   `t = -(0.6·dx + 0.8·dy)`: `t > 0.35` is one step lighter, `t < -0.35` one step darker, else the base. `dim` (a far
   arm or leg) is one step darker throughout. Steps stop at the ramp's ends.
3. When a shape is painted over pixels another part owns, every pixel just outside the new shape's edge (above,
   below, left or right) that the other part owns is set to that part's darkest step: the line where one part passes
   in front of another. `fill*` takes the other part's ink from the layer (keep each part's `Ink` in the layer when it
   first paints).
4. `edge` is last: every clear pixel with a painted one above, below, left or right becomes the darkest step of that
   neighbour's part (`dark`; looked for in that order) or `inkPlace` (`ink`).

- [ ] **Step 1: Write the failing tests** on small pictures, read as rows of letters: a round of radius 4 has three
  shades, the lightest up and left; a ramp of three never steps outside 0 to 2; `dim` is one darker; a limb laid
  over a block leaves the block's darkest shade along the limb's edge and nowhere else; `edge` in each mode; a shape
  wholly outside the picture paints nothing and does not throw; a limb with both ends at one point is a round.
- [ ] **Step 2: Push; red.** **Step 3: Implement.** **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(content): shapes filled in the shades of a ramp`

### Task 5: Paint a standing person, and its sheet

**Files:** Create `figure-kit.ts`, `figure-poses.ts`, `paint-face.ts`, `paint-rigged.ts`, `paint.ts`,
`tests/fixtures/figures/` (`automata.toml`, `content/palettes/meadow.json`, `content/figures/person.json`,
`content/figures/block.json` (a format 1 figure), `read.ts`, `pictures.ts` as the full game's), `tests/golden/figures.json`;
modify `sheet.ts`, `art.ts`, `content.ts`, `src/features/render/art.ts`, `src/features/cli/*` where `figureSheet` or
`paintFigure` is called. Tests: `paint-rigged.test.ts`, `figures.parity.test.ts`, `sheet.test.ts`,
`figures-sheet.browser.test.ts` (the contact sheet).

**Interfaces:**
- Consumes: Tasks 1 to 4.
- Produces:
  - `interface FigureKit { palettes: Readonly<Record<string, PaletteFile>>; pieces: …; gaits: …; stands: … }` (the last
    three are empty maps until Tasks 6, 11 and 12), `LIBRARY_KIT: FigureKit`,
    `figureKit(content: GameContent): FigureKit` (the library with the game's files over it, by id),
    `kitOf(game: Listed): FigureKit` (the same from a check's view of the game).
  - `interface NamedPose { id: string; bends: Bends; hips?: { x: number; y: number } }`,
    `figurePoses(figure: RiggedFigure, kit: FigureKit): readonly NamedPose[]` (for now one, `idle-1`, all zeros);
    `posesOf(figure, kit?)` uses it.
  - `figureSheet(figure: FigureFile, kit: FigureKit = LIBRARY_KIT): Sheet`; `paintFigure(figure: FigureFile, kit: FigureKit = LIBRARY_KIT): IndexedPicture`;
    `paintFrame(figure: RiggedFigure, kit: FigureKit, pose: NamedPose, view: FigureView, variant?: string): IndexedPicture`
    (one picture, for an editor that repaints on every change).
  - `pictureColours(figure: RiggedFigure, kit: FigureKit): readonly number[]`: the picture's colour table, in the
    order the next paragraph gives, worked out from the file and the kit with no painting (the editors' API checks
    a saved picture's table against it, since it does not paint; audit G-I4). `paintFigure` uses it, so the two
    cannot differ.
  - `frameName(pose: string, view: FigureView, variant?: string): string` (moved here from Task 13, audit G-I1, so
    the editors' second pull request has it; until Task 13 only `side` is painted, and it gives `<pose>` and
    `<variant>/<pose>`).
  - `artFiles`, `artProblems` and `loadArt` pass `figureKit(content)`. In `render/art.ts`, the fallback for an empty
    or unknown pose (today `figure.poses[0]?.id`) becomes `posesOf(figure, kit)[0]`, so a rigged figure falls back to
    `idle-1`; `paint.ts` holds `paintFigure` (the dispatcher) and imports the free painter as
    `paintFigure as paintFree` from `paint-figure.ts`.
  - The kit's library reaches every game's page through `render/art.ts` (`figureSheet` needs the gait's and the
    stand's picture counts). Report the built page's size before and after this part, and again after Parts 2 and 3,
    in the pull request (the Site says the demo is about 1.2 MB).

**Painting a person** in one view, back to front by `Placed.depth`, each bone its own part number: limbs as
`fillLimb` in `skin`, far ones `dim`; `hips`, `spine` and `chest` as limbs whose half-widths are the trunk's depth
(side) or the hip and shoulder widths (front, back); feet as a block `foot length` by `foot height` pointing the way
it faces (side) or a round (front, back); hands as rounds; the head as a round, then `paint-face.ts` on it. The face
(side: one eye, the nose a pixel proud of the head when `nose > 0.5`; front: both eyes, brows and mouth; back: none)
is drawn in the `eyes` ramp's darkest step for eyes and brows and the skin's darkest for the mouth and nose, placed
by `eyeSpacing`, `eyeSize` (1 or 2 pixels when the head is under 10 pixels, up to 3 above) and `eyeTilt`; `cheeks`
above 0.6 adds one pixel of the skin's lightest step under each eye. Hair with no hair piece is a cap of the `hair`
ramp over the top third of the head (Task 8's hair pieces replace it). Then `edge`. The palette of the PNG is clear,
then each ramp the figure uses in the order `skin`, `hair`, `eyes`, then pieces' in file order, then the palette's
`inkOf` (when the edge is `ink` or `eyes` is left out), then
each variant's new ramps; more than 255 is refused in `checkRigged`:
`This figure uses 260 colours, and a picture can hold 255. Use fewer colours or fewer variants.`

**The contact sheet:** `figures-sheet.browser.test.ts` paints every fixture figure (and from Task 8 the library's
pieces on the normal person), draws each sheet six times bigger on a page with its name, and saves
`__screenshots__/figures-<name>.png`; the `screens` job already carries those to `ci-screens`. It asserts only that
each picture has painted pixels. It is how a session that can run nothing looks at what it painted.

- [ ] **Step 1: Write the failing tests:** the fixture game loads; `figureSheet` of the person has one frame
  `idle-1` and of a figure with two variants three, named `two/idle-1` and so on; a format 1 figure's sheet and
  bytes are what `paintFigure` gave on `main` (`art.json` passes untouched); the painted person has pixels of at
  least three shades of the skin, its lowest painted row is the ground row, and its highest is `ground - height`
  within one; a variant changes only the pixels of the ramp it changes; `paintFrame` equals the same frame cut from
  `paintFigure`; Review Focus 2 as a property test (`tests/fixtures/property.ts`) over random sliders including the
  ends; `figures.json` holds `content/figures/person.png` and its atlas with `""`.
- [ ] **Step 2: Push; red.** **Step 3: Implement.**
- [ ] **Step 4: Push; look at `figures-person.png` on `ci-screens` (`pr-<number>/chromium/`); if it does not read as
  a person standing, fix the measures and say what changed in the commit. Then record `figures.json` from the log.
  Every job passes in four engines; no other golden moved.**
- [ ] **Step 5: Commit** `feat(content): a standing person painted in shades, with its sheet and atlas`
- [ ] **Step 6: Open Part 1's pull request; when it is green, tell the merge session.**

---

## Part 2: pieces

### Task 6: The `piece` kind, a figure's `pieces`, and the kit

**Files:** Create `piece.ts`; modify `figure-rigged.ts`, `figure-check.ts`, `figure-kit.ts`, `content-types.ts` (after
`palette`), `load.ts`, `content.ts`; add `tests/fixtures/figures/content/pieces/sash.json`. Tests: `piece.test.ts`,
`figure-kit.test.ts`, `figure-rigged.test.ts`.

**Interfaces:**
- Produces: `PieceFile`, `PieceShape`, `PieceSchema`, `pieceInfo` (plural `pieces`, editor `characters`, part
  `figure`, noun "piece"), `PIECE_KINDS: Record<BodyPlan, readonly string[]>`, `GameContent.pieces?`,
  `FigureKit.pieces: Readonly<Record<string, PieceFile>>`; on `RiggedFigure`:
  `pieces?: readonly { piece: string; paint?: string; trim?: string; hand?: 'left' | 'right'; choices?: Record<string, string> }[]`
  and `variants[].pieces?: Record<string, { paint?: string; trim?: string }>` (by the piece's id).

A piece file:

| Field | Rule |
|---|---|
| `format`, `id` | as every kind |
| `body` | `person` or `animal` |
| `kind` | a person's: `top`, `legs`, `shoes`, `cape`, `hat`, `belt`, `scarf`, `hair`, `mark`, `held`; an animal's: `collar`, `saddle`, `coat`, `marking` |
| `about` | 1 to 120 letters: one sentence a person reads in the library, like "A long shirt with a belt line." |
| `paint`, `trim` | opt, ramp ids: the colours it has when the figure names none |
| `choices` | opt, at most 4 of `{ id, about, options }`, `options` 2 to 6 `Id`s; the first is the normal |
| `shapes` | 1 to 12 of the shape below, drawn first to last |

A shape: `on` (a bone of its body; `hand` for a `held` piece, which the figure's `hand` turns into `hand-left` or
`hand-right`; a sided bone may be written without its side, like `upper-arm`, and is then laid on both); `shape`
(`wrap`, `block` or `round`); for `wrap`, `from` and `to` (0 to 1 along the bone) and `grow` (0 to 3 units: how far
past the bone's own width); for `block` and `round`, `at` (0 to 1 along the bone), `x` and `y` (units across and
along from there), `w`, `h`, `turn?`; `paint` (`main`, `trim`, `skin` or `hair`) or `ramp` (a fixed ramp id, for a
flame or a blade); `views?` (the views it shows in; left out, all); `behind?` (true to draw it before its bone, for
a cape or long hair); `when?` (`{ <choice>: <option> }`: only with that choice). One **unit** is `height / 24`
pixels, so a piece fits a figure of any size.

Checks in the file: unique choice ids; `when` names a choice and one of its options; `on` is a bone of `body`
(`A person has no bone called "tail-1". It has: chest, foot-left, …`); `hand` only in a `held` piece. Checks from the
figure (`checkRigged`): each piece is in the kit (`noSuch`, owner "This game and the framework"); its `body` is the
figure's (`The piece "saddle" is for an animal, and this figure is a person.`); a piece is worn once; `hand` is
written for a `held` piece and only for one, at most one piece a hand; `choices` name the piece's own; `paint` and
`trim` are ramps of the figure's palette; a variant's `pieces` name pieces the figure wears.

- [ ] **Step 1: Write the failing tests:** each rule and sentence; a piece file writes back byte for byte; Review
  Focus 3 (the fixture's `sash` and a game piece called `tunic` both win over the library; the same for a palette
  called `automata`); `kitOf` and `figureKit` give the same kit for the same game.
- [ ] **Step 2: Push; red.** **Step 3: Implement.** **Step 4: Push; schemas and API report from the log; green.**
- [ ] **Step 5: Commit** `feat(content): pieces a figure wears, the game's own over the library's`

### Task 7: Paint pieces and a figure's own shapes

**Files:** Modify `paint-rigged.ts`, `figure-rigged.ts`. Tests: `paint-rigged.test.ts`, `figure-rigged.test.ts`.

**Interfaces:**
- Produces: on `RiggedFigure`,
  `shapes?: readonly { id: string; on: string; shape: 'block' | 'round'; x: number; y: number; w: number; h: number; turn?: number; paint: string; views?: readonly FigureView[] }[]`
  (at most 16; `x`, `y`, `w`, `h` in pixels from the bone's middle; `paint` a ramp id).

A piece's shape is painted straight after the bone it is on (before it when `behind`), as a part of its own, in the
figure's `pieces` order where two are on one bone, so the list's order is the order they are drawn. `wrap` is the
bone's own limb between `from` and `to` with `grow` added to each half-width. `block` and `round` turn with the bone.
A `held` piece's shapes follow the hand. The figure's own `shapes` come after every piece on that bone. A far limb's
pieces are `dim` with it. A `hair` piece takes off Task 5's cap of hair.

- [ ] **Step 1: Write the failing tests:** the fixture person in the `sash`: the sash's pixels are in its ramp and
  inside the chest's box grown by `grow`; with `upper-arm-right` bent 90 the sleeve of a two-shape test piece is
  where the arm now is; a `behind` shape is covered by its bone; a `when` shape shows only with its choice; `trim`
  falls back to the piece's own, then to `paint`; a variant's piece colour changes only that piece; a figure's own
  shape on `chest` in pixels; the fixture's hashes for the dressed person are added to `figures.json` as `""`.
- [ ] **Step 2: Push; red.** **Step 3: Implement.** **Step 4: Push; look at the sheet; record; green.**
- [ ] **Step 5: Commit** `feat(content): pieces and a figure's own shapes painted on its bones`

### Task 8: The library's pieces for a person

**Files:** Create `library/pieces-person.json` (one JSON list of piece files); modify `figure-kit.ts`,
`figures-sheet.browser.test.ts`. Test: `library.test.ts`.

**Interfaces:** Produces `LIBRARY_KIT.pieces` with these ids (41), each at most 12 shapes, each with `about`:

| Kind | Ids (choices) |
|---|---|
| `top` | `shirt` (sleeves: long, short, none), `tunic` (sleeves), `vest`, `coat` (length: hip, knee), `robe`, `armour` |
| `legs` | `trousers`, `shorts`, `skirt`, `long-skirt` |
| `shoes` | `shoes`, `boots` (height: ankle, knee), `sandals` |
| `cape` | `cape` (length: waist, knee, ground), `cloak` |
| `hat` | `cap`, `hat` (brim: narrow, wide), `hood`, `helmet`, `crown` |
| `belt`, `scarf` | `belt`, `scarf` |
| `hair` | `hair-short`, `hair-bob`, `hair-long`, `hair-tail`, `hair-bun`, `hair-spikes`, `hair-curls` |
| `mark` | `beard-short`, `beard-long`, `stubble`, `moustache`, `freckles`, `scar`, `glasses` |
| `held` | `torch`, `sword`, `shield`, `lantern`, `staff` |

The shapes are the builder's to draw, held to: clothes are `wrap`s on the bones they cover with `grow` 0.5 to 1.5 and
a `trim` shape where the old garment had one (a cuff, a hem, a belt line, a brim); hair and capes that fall behind
are `behind`; a face mark shows in `side` and `front` only; a held thing's flame, blade or glass is a fixed `ramp`
(`flame`, `steel`, `gold`). The old builder's garments, hair library and items
(`extensions/figures/src/shared/outfit/`, `hair/library/hair.json`, `outfit/library/items.json` at `ed8592e8`) are
the reference for what each is and where its trim goes; none of their code or numbers is copied where it is 3D.

- [ ] **Step 1: Write the failing tests:** the list reads through `PieceSchema` with exactly the ids and kinds above;
  every piece painted alone on the normal person paints at least four pixels in its own ramp in the side view;
  every choice's every option paints; no two pieces share an `about`; the contact sheet gains one picture a kind.
- [ ] **Step 2: Push; red.** **Step 3: Draw them.**
- [ ] **Step 4: Push; look at every kind's sheet on `ci-screens`; redraw what does not read as what it is called
  (two rounds at most, then report to the coordinator with the pictures). Green.**
- [ ] **Step 5: Commit** `feat(content): the library's forty-one pieces for a person`
- [ ] **Step 6: Open Part 2's pull request; when green, tell the merge session.**

---

## Part 3: motion

### Task 9: Poses written as bends

**Files:** Modify `figure-rigged.ts`, `figure-poses.ts`, `rig.ts`. Tests: `figure-poses.test.ts`,
`figure-rigged.test.ts`, `character.test.ts`, `backdrop.test.ts`.

**Interfaces:**
- Produces: on `RiggedFigure`, `poses?: readonly FigurePoseR[]` (at most 48) with
  `interface FigurePoseR { id: string; bends?: Bends; place?: Places }` (`place` is Task 10's);
  `limitProblem(body: BodyPlan, bone: string, bends: { bend?: number; out?: number }): string | undefined`;
  `figurePoses` gives `idle-1` then the figure's own; `posesOf` follows.

Checks: unique pose ids; a bone the body has (the bone sentence of Task 6); a bend inside the table:
`"forearm-left" cannot bend 170 degrees. It bends from 0 to 150.` (and `… cannot turn out 100 degrees. It turns out from -90 to 90.`);
a pose with neither `bends` nor `place`: `Say how the figure stands: add "bends" or "place".`; a pose called
`idle-…`, `walk-…`, `run-…` or `trot-…` and a number: `"walk-1" is a name the figure's walk uses. Give this pose another name.`

- [ ] **Step 1: Write the failing tests:** each rule and sentence; a pose with `upper-arm-right` bent 90 paints the
  arm forward in the sheet's second frame; a character's clip may name `idle-1` and the figure's pose and may not
  name another (the `noPose` sentence lists both); a backdrop's prop the same.
- [ ] **Step 2: Push; red.** **Step 3: Implement.** **Step 4: Push; schemas from the log; green.**
- [ ] **Step 5: Commit** `feat(content): a rigged figure's own poses, as bends inside each joint's limits`

### Task 10: Poses written by where hands, feet, head and hips are

**Files:** Create `rig-solve.ts`; modify `figure-rigged.ts`, `figure-poses.ts`. Tests: `rig-solve.test.ts`,
`figure-poses.test.ts`.

**Interfaces:**
- Produces:
  - `type Places = Readonly<Record<string, { x?: number; y?: number; out?: number; turn?: number }>>` (keys are the
    body's `PLACES`; `x`, `y` are in **units** (a unit is `height / 24` pixels, as a piece's are) from the point the
    hips stand at in the side view, `x` forward and `y` down; `out` is units to its own side; `turn` is the end
    bone's own bend, in degrees. Not frame pixels (audit I8): a pose written in pixels breaks when Look changes
    `height`, `legs` or `arms`, or Surprise me runs, and a figure that saved fine would then fail `automata check`.
    In units from the hips, the spec's `wave` (`x 6, y -14`: the hand above the head) is a wave at any size. The solve
    multiplies by the unit and adds the hips' point before step 1),
  - `solvePose(skeleton: Skeleton, pose: { bends?: Bends; place?: Places }): { ok: true; bends: Bends; hips: { x: number; y: number } } | { ok: false; problems: readonly { path: string; message: string }[] }`,
  - `reachOf(skeleton: Skeleton, place: string): number` (how far that hand or foot can be from its root, in pixels).

**The solve**, in this order:

1. `hips`: `x`, `y` move the root; left out, it is where it stands.
2. `head` with `x` or `y`: `spine`, `chest` and `neck` each take the same bend `θ`; find the `θ` inside the tightest
   of their three limits that brings the head's middle nearest the point, by halving the range 16 times; further than
   one pixel off is the reach sentence. `head.turn` is the head's own bend; `head.out` its own `out` in degrees.
3. A hand or a foot (a two-bone chain: `upper-arm` and `forearm`, or `thigh` and `shin`; an animal's leg `upper` and
   `lower`), by the old builder's rule (`two-bone-ik.ts` at `ed8592e8`) in the flat model: with the root joint at
   `R`, the target `T = (x - R.x, out ?? 0, y - R.y)` as `(forward, sideways, down)`, `d = |T|`, lengths `l1`, `l2`:
   refuse when `d > l1 + l2 + 0.5` or `d < |l1 - l2| - 0.5`; else clamp `d` into that range. The pole is forward for
   a knee and an animal's hind leg, backward for an elbow and an animal's front leg; take the pole's part across
   `T`'s direction (if that is nothing, use down, then forward). `cosA = (l1² + d² - l2²) / (2·l1·d)`; the upper
   bone points along `cosA · dir + sinA · pole`; the lower from its end to the target. Each bone's angles come back
   from its direction as `out = asin(sideways)`, `bend = atan2(forward, down)`, and its own bend is that less its
   parent's. `turn` sets the hand's or foot's own bend; left out, a foot on the ground row lies flat.
4. A foot nobody placed, on a leg nobody bent, stays where it stands, and is solved like a placed one: so lowering
   the hips bends the knees.
5. `bends` are then laid over the result for every bone no place solved. A bone both solved and bent is refused
   (Review Focus 4): `The pose puts the right hand somewhere and also bends "forearm-right". Keep one of them.`
6. Every own bend is held to its limit with Task 9's sentence, naming the place that asked:
   `Putting the left hand at (4, 2) would bend "upper-arm-left" 190 degrees. It bends from -60 to 170.`

The reach sentence: `The right hand cannot reach (30, 2): the arm is 11 pixels long and that is 19 away. Put it nearer, or move the hips.`
Problems are reported at `poses[i].place.<name>`, by the schema's own check (the skeleton needs only the file).

- [ ] **Step 1: Write the failing tests:** for twenty points inside reach on a ring round the shoulder, the solved
  hand's end (through `placeBones`) is within one pixel of the point in the side view, and with `out` within one in
  the front view; the elbow never bends backwards and the knee never forwards; hips lowered by 3 keeps both feet on
  the ground row and bends both knees; each sentence above; a point exactly at full reach solves with a straight
  arm; the spec's `wave` pose solves, and still solves on the same figure with `height` 16 and with `height` 60.
- [ ] **Step 2: Push; red.** **Step 3: Implement.**
- [ ] **Step 4: Push; green in four engines.**
- [ ] **Step 5: Commit** `feat(content): poses placed by hands, feet, head and hips`

### Task 11: The `gait` kind: a walk and a run

**Files:** Create `gait.ts`, `motion-walk.ts`, `library/gaits.json`; modify `figure-rigged.ts` (`gait?: Id`),
`figure-check.ts`, `figure-kit.ts`, `figure-poses.ts`, `content-types.ts`, `load.ts`, `content.ts`. Tests:
`gait.test.ts`, `motion-walk.test.ts`.

**Interfaces:**
- Produces: `GaitFile`, `GaitSchema`, `gaitInfo` (plural `gaits`, editor `characters`, part `figure`, noun "gait"),
  `GAIT_NUMBERS: readonly Slider[]`, `walkPoses(skeleton: Skeleton, step: GaitStep, name: 'walk' | 'run' | 'trot'): readonly NamedPose[]`,
  `GameContent.gaits?`, `FigureKit.gaits`.

A gait file: `format`, `id`, `body`, `about`, `walk` (a step), and opt `run` (a person's) or `trot` (an animal's). A
step's numbers (the old gait's numbers that show in a flat figure, in shares of the leg's length and degrees):

| Number | Range | Sentence |
|---|---|---|
| `pictures` | 4, 6 or 8 | How many pictures one cycle of two steps has. (Even only, audit I6: the left foot is the right half a cycle on, so picture `k + n/2` must exist.) |
| `stride` | 0 to 1.5 | How long a step is, as a share of the leg. |
| `lift` | 0 to 0.5 | How high the feet lift. |
| `bob` | 0 to 0.2 | How much the body rises and falls. |
| `sway` | 0 to 0.2 | How much the hips swing to each side, seen from the front. |
| `lean` | -20 to 30 | How far it leans into the walk, in degrees. |
| `armSwing` | 0 to 90 | How much the arms swing, in degrees. |
| `elbow` | 0 to 120 | How bent the elbows are, in degrees. |
| `heel` | 0 to 40 | How far the toes lift when a foot lands, in degrees. |
| `push` | 0 to 40 | How far the heel lifts when a foot pushes off, in degrees. |
| `bounce` | 0 to 1 | How springy it is: at 1 both feet leave the ground between steps. |

**Making picture `k` of `n`** (`p = k / n`, `L` the leg's length, `S = stride · L / 2`): each foot has its own phase,
the right `p`, the left `p + 0.5` (an animal: `hind-left` `p`, `front-right` `p` for a trot, `p + 0.25` for a walk,
and the other pair half a cycle on). With `φ` the phase's part after the point: on the ground while `φ < 0.5`, at
`x = S · (1 - 4φ)`, its `turn` `-heel` while `φ < 0.1` and `push` while `φ > 0.4`; in the air after, at
`x = -S + 4S · (φ - 0.5)`, raised by `lift · L · sin(2π · (φ - 0.5))`, and by a further `bounce · lift · L` for both
feet at once in a run. **The hips are lowered** (audit I6) first by the crouch the stride needs, `L - √(L² - S²)`
for the whole cycle (a foot planted `S` ahead of the hips cannot touch the ground under straight legs: at the
starting numbers that is 7% of the leg for `brisk`'s walk and 20% for its run), and then by the bob: for a walk
`bob · L · (0.5 + 0.5 · cos(4π · p))`, lowest when both feet are down (`p` 0 and 0.5) and highest over the standing
foot, as a walk goes; for a run `bob · L · (0.5 - 0.5 · cos(4π · p))`, lowest over the standing foot. They are moved
`sway · L · sin(2π · p)` to the side; `spine.bend` gains `lean`; each `upper-arm` bends `armSwing · sin(2π · p)`,
against the leg on its side; each `forearm` bends `elbow`. The feet are placed and the legs solved with Task 10's rule
(a foot too far is brought to full reach, never refused: a gait must always walk). `age` shortens the stride by
`lerp(1, 0.7, age)`. At `φ = 0.5` both branches put the foot on the ground row, so in a walk each foot is down for
`n/2 + 1` pictures and both are down at pictures 1 and `n/2 + 1`; in a run with `bounce` above 0 those two pictures
raise both feet instead.

A figure with `gait` gets `walk-1` to `walk-n` and the run or trot if the gait has one; with none, no walk. Checks:
the gait is in the kit and for the figure's body; then the sheet's height with every picture counted (the sentence of
"Names of pictures").

**The library's gaits**, from the old builder's `gaits.json`, each with `about`: a person's `brisk`, `strut`, `loose`,
`bounce` and `shuffle` (the old `still`), each with a `run`; an animal's `pad`, `prance` and `lumber`, each with a
`trot` (their numbers are Task 16's to set; the files' person entries are this task's). Starting numbers for `brisk`:
walk `pictures 8, stride 0.75, lift 0.12, bob 0.05, sway 0.04, lean 4, armSwing 30, elbow 15, heel 15, push 20, bounce 0`;
run `pictures 6, stride 1.2, lift 0.3, bob 0.08, sway 0.03, lean 14, armSwing 50, elbow 80, heel 10, push 30, bounce 0.6`.
`strut`: more `sway` and `armSwing`, a backward `lean` of -2. `loose`: longer `pictures`-for-stride feel, low `lift`,
`elbow` 5. `bounce`: `bob` 0.12, `bounce` 0.5. `shuffle`: `stride` 0.3, `lift` 0.03, `armSwing` 8.

- [ ] **Step 1: Write the failing tests:** each rule and sentence; over one walk cycle each foot is on the ground row
  for `n / 2 + 1` pictures in a row and off it for the rest, and at `brisk`'s numbers and at `stride` 1.5 no planted
  foot is lifted by the reach (a run with `bounce` above 0 has a picture with neither on it); `pictures` 5 is refused;
  the right arm is forward when the right leg is back; a walk's hips are lowest when both feet are down and a run's
  over the standing foot; picture `k` and `k + n/2`
  are each other with left and right swapped; the figure's poses are `idle-1`, `walk-1` … `run-n`, then its own; a
  character's `run` clip may name them; every library gait reads; the fixture person gains `"gait": "brisk"` and its
  hashes are `""`.
- [ ] **Step 2: Push; red.** **Step 3: Implement.** **Step 4: Push; look at the walk on the sheet; record; green.**
- [ ] **Step 5: Commit** `feat(content): gaits that make a walk and a run`

### Task 12: The `stand` kind: how it stands and its idle

**Files:** Create `stand.ts`, `motion-idle.ts`, `library/stands.json`; modify as Task 11. Tests: `stand.test.ts`,
`motion-idle.test.ts`.

**Interfaces:**
- Produces: `StandFile`, `StandSchema`, `standInfo` (plural `stands`, noun "stand"),
  `idlePoses(skeleton: Skeleton, stand: StandFile): readonly NamedPose[]`, `GameContent.stands?`, `FigureKit.stands`.

A stand file: `format`, `id`, `body`, `about`, `bends?` and `place?` (a pose, as Tasks 9 and 10), `pictures` (1 to 8,
whole: "How many pictures its idle has."), `breath` (0 to 1: "How much it breathes."), `shift` (0 to 1: "How much it
shifts its weight."). `idle-k` is the stand's pose with the chest raised `breath · sin(2π · k / n)` pixels (rounded
to a whole pixel, so a small figure breathes one pixel or not at all) and the hips moved `shift · sin(2π · k / n)`
pixels sideways with the feet kept where they are. A figure's `stand` left out is `easy`.

**The library's stands** (the old builder's, `games/base-3d/content/figure-stands/` and
`packages/3d/tests/fixtures/content/figure-stands/` at `ed8592e8`, laid flat): a person's `easy` (arms at the sides,
`pictures 4, breath 0.6, shift 0.3`), `hand-on-hip`, `arms-crossed`, `thumbs-in-pockets`, `hand-in-pocket` and
`hip-and-pocket` (the old builder's, which read from the side), and `hands-behind`, which is **new** (the spec's
example names it, but the old builder had no such stand: its seven were hand on hip, arms crossed, thumbs in
pockets, hand in pocket, hand in jacket pocket, hip and pocket, kangaroo pocket; audit M3). The two jacket and
kangaroo pockets need a garment with a pocket and are left out, said in `stand.ts`'s header. An animal's
`four-square`, `sit` and `alert` (Task 16 sets theirs).

A stand a figure cannot reach is a **problem** from `checkRigged`, which fails `automata check` (audit M4); the
painter still paints that figure's idle with `easy`'s arms, only so `paintFrame` has something to show beside the
problem in an editor. It is never a silent fallback.

- [ ] **Step 1: Write the failing tests:** each rule; `hand-on-hip` puts the right hand within a pixel of the hip's
  side; `arms-crossed` solves on the normal person and on sliders at both ends (a stand that cannot be reached is
  `checkRigged`'s problem:
  `This figure's arms are too short to stand "arms-crossed". Choose another stand, or make "arms" longer.`); `idle-1`
  is the first pose and what a character with no clips shows; `breath` 0 and `shift` 0 make every idle picture the
  same; the fixture's hashes.
- [ ] **Step 2: Push; red.** **Step 3: Implement.** **Step 4: Push; look; record; green.**
- [ ] **Step 5: Commit** `feat(content): stands that make an idle`
- [ ] **Step 6: Open Part 3's pull request; when green, tell the merge session.**

---

## Part 4: views

### Task 13: Paint the front and the back

**Files:** Modify `figure-rigged.ts` (`views`), `sheet.ts`, `paint-rigged.ts`, `paint-face.ts`, `figure-check.ts`.
Tests: `paint-rigged.test.ts`, `sheet.test.ts`, `figures.parity.test.ts`.

**Interfaces:**
- Produces: on `RiggedFigure`, `views?: readonly FigureView[]` (1 to 3, no repeat, `side` always in it:
  `Every figure paints the side view. Add "side" to "views".`; left out means `["side"]`: "The views it is painted
  in. "front" and "back" are for a game seen from above, or a cutscene where someone faces you.");
  `figureSheet` names and orders frames as "Names of pictures" says; `frameName` (Task 5) gains the `front/` and
  `back/` names.

Front and back use the same parts with the front measures (Task 3) and `Placed.shown` shortening a limb bent toward
the eye; a limb with `shown` under 0.25 is drawn as a round of its near half-width (a fist or a knee coming at you).
A piece's shape is drawn in a view unless its `views` leaves it out. The back view draws no face and draws `behind`
shapes last, in front of the body (a cape seen from behind covers the back).

- [ ] **Step 1: Write the failing tests:** a figure with three views has three times the frames, named `front/idle-1`
  and `two/back/walk-3`; the side frames of a three-view figure are byte for byte the frames of the same figure with
  only the side (so adding views never changes the side); the front view is as wide as the shoulder measure says and
  has two eyes; the back has none; an arm bent 90 forward is a round in the front view; a cape covers the back in
  the back view and is hidden behind the body in the front; the fixture person gains all three views; hashes `""`.
- [ ] **Step 2: Push; red.** **Step 3: Implement.** **Step 4: Push; look; record; green.**
- [ ] **Step 5: Commit** `feat(content): rigged figures painted from the front and the back`

### Task 14: Show a view in play

**Files:** Create `src/features/level/side.ts`; modify `level/uses.ts`, `level/level.ts`, `level/game-sim.ts`,
`level/hero.ts` and `level/spawn-level.ts` (the parts a character gets), `content/cutscene.ts`, plan T's cutscene
player (audit I9: on `main` today `cutscene.ts` is only the file's schema and nothing applies `face`; the player is in
pull request 64, open, so this task starts after it merges, and after plan H's pull request 101, which rewrites
`hero.ts`; if either is still open when Parts 1 to 3 are done, Part 5 may go before Part 4), `render/scene.ts`, `render/art.ts`, `render/stage.ts`, `render/still.ts`, `src/index.ts`
and `src/headless.ts`. Tests: `tests/features/level/side.test.ts`, `side.parity.test.ts`, `render/scene.test.ts`,
`render/art.browser.test.ts`, `content/cutscene.test.ts`, `tests/golden/sides.json`.

**Interfaces:**
- Produces:
  - `usesSides(content: GameContent): boolean` (true when any figure a character names paints `front` or `back`),
  - `Side: ComponentDef<{ view: 'string' }>` (`'side'`, `'front'` or `'back'`), added to every sprite and switched on
    by `usesSides`, so a game with only side views keeps exactly the sim it has (the `Sprite` component does not
    change, and `schema-hash.json`, `sprites.json` and the template's replay do not move),
  - `setSide(entity: EntityRef, view: 'side' | 'front' | 'back'): void` (throws in a game without sides, as `setClip`
    does without sprites),
  - cutscene `ActorKey.view?: 'side' | 'front' | 'back'` after `face` ("Which way it is seen from here on. Left out
    means no change."); checked across files: the actor's figure paints that view, else
    `The figure "keeper" is not painted from the front. Add "front" to its "views".`,
  - `ViewSprite.view: FigureView`; `Art.figure(character, pose, player, view)` falls back to the side view when the figure
    has no such view, then to today's fallbacks.

A behaviour file sets no view: no act of a behaviour sets which way a thing faces today (the acts are `stay`,
`wander`, `flee`, `follow` and `jump`; facing follows the speed in `level.sprites`), so there is nothing to hang it on.
The spec's "or a behaviour" waits for the act that needs it; record this as a deviation in the tracker. **The audit
checked this reading and holds it, but it narrows a line of the spec the Owner read, so it is the Owner's to confirm
(audit Q2).** Until the answer, build Task 14 as written; the answer can only add, never take away from it.

- [ ] **Step 1: Write the failing tests:** `usesSides` is false for the template, the full game and Part 1 to 3's
  fixture as it was before Task 13, and true once a named figure has `front`; a sim of the template has no `side`
  component in its snapshot; `setSide` changes what `createScene` reports; a cutscene key's `view` reaches the sprite
  and is refused for an unpainted view; in a real browser the stage draws `front/idle-1`'s texture for a sprite seen
  from the front and mirrors only the side view by `face`; `sides.json`, a 120-tick play of the figures fixture with
  one `setSide`, the same hash in four engines, committed `""` and recorded from CI.
- [ ] **Step 2: Push; red.** **Step 3: Implement.**
- [ ] **Step 4: Push; record `sides.json`; every other golden unchanged; green.**
- [ ] **Step 5: Commit** `feat(level): a sprite's view, switched on only by a figure painted from the front or back`
- [ ] **Step 6: Open Part 4's pull request; when green, tell the merge session.**

---

## Part 5: animals

### Task 15: An animal's file and skeleton

**Files:** Create `rig-animal.ts`; modify `figure-sliders.ts`, `figure-rigged.ts`, `rig.ts`. Tests:
`rig-animal.test.ts`, `figure-rigged.test.ts`, `figure-sliders.test.ts`.

**Interfaces:** Produces `ANIMAL_SLIDERS`, `ANIMAL_FACE_STYLES` (`eyes`: `dots`, `ovals`, `closed`; `nose`: `dot`,
`wide`, `none`; `mouth`: `none`, `line`, `open`); `body: "animal"`; `skeletonOf` for it; `paints` is
`{ coat, eyes?, nose? }` for an animal (`eyes` and `nose` left out are `ink`).

| `id` | Normal | Group | Sentence |
|---|---|---|---|
| `height` | 14 (4 to 96) | body | How tall it stands at the shoulder, in pixels. |
| `length` | 0.5 | body | How long its body is, from short to long. |
| `legs` | 0.5 | body | How long the legs are, from short to long. |
| `legThickness` | 0.5 | shape | How thick the legs are, from thin to sturdy. |
| `build` | 0.5 | shape | How deep its chest is, from slight to broad. |
| `fat` | 0.4 | shape | How round its belly is, from lean to round. |
| `neck` | 0.5 | head | How long the neck is, from none to long. |
| `head` | 0.5 | head | How big the head is, from small to big. |
| `snout` | 0.5 | head | How long the nose is, from flat to long. |
| `ears` | 0.5 | head | How big the ears are, from small to big. |
| `earDroop` | 0.2 | head | How the ears sit, from pricked up to hanging down. |
| `tail` | 0.5 | tail | How long the tail is, from a stub to long. |
| `tailCurl` | 0.3 | tail | How the tail is carried, from hanging to curled over the back. |
| `chunk` | 1 | style | How blocky it is, from life-like to chunky pixel art. |

Measures, with `H = height`: legs `H · lerp(0.4, 0.7, legs)` (upper 0.5, lower 0.4, foot 0.1 of it); body length
`H · lerp(1.0, 2.0, length)` from hips to chest, the spine half of it; body half-depth `H · lerp(0.14, 0.24, build)`,
the belly `· lerp(1, 1.4, fat)`; neck `H · lerp(0.05, 0.6, neck)` at a standing bend of 40 degrees up and forward;
head length `H · lerp(0.25, 0.5, head)`, the snout a further `· lerp(0, 0.8, snout)` of it; ear length
`H · lerp(0.08, 0.3, ears)` at a standing bend of `lerp(-20, 120, earDroop)`; tail three bones of
`H · lerp(0.05, 0.3, tail)` each, each bent `lerp(-30, 50, tailCurl)` up from the last; leg half-width
`H · lerp(0.03, 0.08, legThickness) · lerp(1, 1.3, chunk)`. In the front and back views the body is a round of the
chest's depth, the legs `H · 0.18 · lerp(0.9, 1.2, build)` either side of the middle, and the body's length is not
shown (it is `forward`).

- [ ] **Step 1: Write the failing tests:** an animal file reads and writes back; a person's slider on an animal is
  refused by name (`An animal has no slider called "shoulders". It has: build, chunk, …`); at the normals all four
  feet are on the ground row and the shoulder is `H` above it; `length` at 1 is longer than at 0 with the same
  height; the tail's end is higher with `tailCurl` 1 than 0; both ends of every slider give finite sizes; the frame
  check uses the whole animal (`This animal is 44 pixels long but its frame is 32 wide.`).
- [ ] **Step 2: Push; red.** **Step 3: Implement.** **Step 4: Push; schemas from the log; green.**
- [ ] **Step 5: Commit** `feat(content): four-legged animals: their file, sliders and skeleton`

### Task 16: Paint, dress and move an animal

**Files:** Create `library/pieces-animal.json`; modify `paint-rigged.ts`, `paint-face.ts`, `rig-solve.ts`,
`motion-walk.ts`, `motion-idle.ts`, `library/gaits.json`, `library/stands.json`,
`tests/fixtures/figures/content/figures/animal.json`. Tests: `paint-rigged.test.ts`, `motion-walk.test.ts`,
`library.test.ts`, `figures.parity.test.ts`.

**Interfaces:** Produces the animal's painting (body, belly, neck, head with snout, jaw, ears, tail, legs; the far
pair of legs `dim`; the face in the side and front views), its solve (each leg a two-bone chain with Task 10's
poles; `tail-3` placed bends the three tail bones equally, as the head's trunk does; `head` leans the neck), its
gaits (`pad`, `prance`, `lumber`, each a walk with the phases of Task 11 and a `trot`) and stands (`four-square`,
`sit`: hips lowered to the ground and hind legs folded, `alert`: head high, tail up), and its pieces (12):

| Kind | Ids |
|---|---|
| `collar` | `collar`, `bandana` |
| `saddle` | `saddle`, `pack` |
| `coat` | `coat-short`, `coat-shaggy`, `mane` |
| `marking` | `spots`, `stripes`, `pale-belly`, `socks`, `mask` |

A `coat` or `marking` shape may be `wrap` with `paint: "trim"` over part of a bone; `spots` and `stripes` are rounds
and blocks along `spine` and `chest`.

- [ ] **Step 1: Write the failing tests:** the fixture animal has pixels in three shades of its coat and stands on
  the ground row; in a walk the diagonal pairs are a quarter cycle apart and in a trot they land together; `sit`
  solves at the normals and at both ends of `legs`; every animal piece paints on the normal animal; a person's piece
  on an animal is refused (Task 6's sentence); a dog-like, a cat-like and a deer-like set of sliders each paint
  inside a 48 by 32 frame; the animal's hashes in all three views are `""`.
- [ ] **Step 2: Push; red.** **Step 3: Implement.**
- [ ] **Step 4: Push; look at the animal's sheets and its pieces' on `ci-screens`; fix what does not read (two rounds
  at most, then report); record; green.**
- [ ] **Step 5: Commit** `feat(content): animals painted, dressed, walking, trotting and standing`
- [ ] **Step 6: Open Part 5's pull request; when green, tell the merge session.**

---

## Part 6: new files and the way in

### Task 17: List a new file in `automata.toml` (Part 0: built first)

**Part 0 is built before Part 1, as its own pull request** (audit I1). It is the one `automata.toml` writer for every
plan: the scenes plan's slice 1 (AutomataFramework pull request 113, its Task 14, `listContent(projectText, ref):
string`) already says "if another plan has landed one first, use it and report", and takes this one; the sound plan
M (pull request 112) adds its `withFolders` beside it in this same file, and when its folder blocks land,
`listContent` counts a path inside a listed folder of that kind as already listed. If either of those lands first,
take its file and add `listContent` beside what is there, with this signature, and say so in the tracker.

**Files:** Create `project-write.ts`; modify `content.ts`. Test: `project-write.test.ts`.

**Interfaces:**
- Produces: `listContent(text: string, entry: ContentRef, about?: string): Parsed<string>` (`about` is one line
  written as a `#` comment above the block; the value is the whole new text).

It adds, at the end of the text, one blank line and then

```
# <about>
[[content]]
type = "figure"
path = "content/figures/keeper.json"
```

with the line ends the text already uses and one at the end, exactly the shape of the blocks `automata create`
writes. It never parses and re-prints: every byte that was there is still there, in order. It refuses, with the
file's diagnostics, a text that `parseProject` refuses; an entry already listed gives the text back unchanged (`ok`);
a path `isGamePath` refuses gives `PATH_HINT`; a kind not in the table gives the kinds; a project whose `content` is
written as one `content = [ … ]` value has no block to follow:
`This automata.toml lists its files in one "content = […]" value. Add this file there by hand: { type = "figure", path = "content/figures/keeper.json" }.`
The result always passes `parseProject` and lists the entry last; the function checks that before answering.

- [ ] **Step 1: Write the failing tests:** the template's `automata.toml` with its last block cut off, given that
  block back, is the template's bytes; comments and order are kept (the text before is a prefix of the text after);
  Review Focus 5's four files; an `about` with a line break is refused; each sentence above; ten entries added one
  after another parse to those ten in order.
- [ ] **Step 2: Push; red.** **Step 3: Implement.** **Step 4: Push; API report from the log; green.**
- [ ] **Step 5: Commit** `feat(content): list a new content file in automata.toml without touching the rest`

### Task 18: `automata add`, and the agent's `add` tool

**Files:** Create `src/features/cli/add.ts`; modify `cli/args.ts`, `cli/cli.ts`, `cli/help.ts`, `cli/mcp-tools.ts`,
`src/headless.ts` (it re-exports `listContent`). Tests: `tests/features/cli/add.test.ts`, `args.test.ts`,
`cli.test.ts`, `mcp-tools.test.ts`.

**Interfaces:**
- Produces: the command `automata add [folder] --type <kind> --path <file> [--about <words>] [--json]`;
  `runAdd(options: { folder: string; type: string; path: string; about?: string }): Effect.Effect<AddReport, CliError, Ports>`
  with `interface AddReport { ok: boolean; listed: boolean; problems: readonly Diagnostic[] }`; the MCP tool `add`
  (`folder`, `type`, `path`, `about?`), which runs the same command. `add` goes after `art` in `COMMAND_NAMES`.

It reads the game's `automata.toml`, calls `listContent`, and writes the file only when the text changed. The file
named by `--path` must be there (`There is no file at content/figures/keeper.json. Write it first, then run this again.`)
and must read as that kind (its problems are printed, and nothing is written). It prints `Listed
content/figures/keeper.json as a figure.` or `content/figures/keeper.json is already listed.`, then, for a figure or
a backdrop, `Run "automata art" to paint its picture.` Exit 0 when listed or already listed, 1 when the file has
problems, 2 when it could not do its work.

- [ ] **Step 1: Write the failing tests** with the memory ports: each line above and its exit status; `--type` or
  `--path` left out is a sentence that shows the whole command; the bytes written are `listContent`'s; `--json`
  prints the report; `automata --help` lists `add` with one line; the MCP server lists fourteen tools and its `add`
  gives the command's answer.
- [ ] **Step 2: Push; red.** **Step 3: Implement.** **Step 4: Push; green.**
- [ ] **Step 5: Commit** `feat(cli): automata add lists a new content file`

### Task 19: Starters, and what the editors read

**Files:** Create `library/starters.json`; modify `figure-kit.ts`, `content.ts`, `src/headless.ts`, `src/index.ts`.
Tests: `library.test.ts`, `tests/public-surface.test.ts`.

**Interfaces:**
- Produces: `STARTERS: readonly RiggedFigure[]`, six figures that use only the library and the library's palette,
  each with three views, a gait and a stand: `adventurer` (tunic, trousers, boots, belt, short hair, a sword),
  `villager` (shirt, long skirt, shoes, a bun, a scarf), `keeper` (the spec's example: robe, hood, long beard, a
  lantern, `hands-behind`), `child` (`height` 16, `head` 0.9, shorts, cap), `dog` (collar, `pale-belly`, `pad`) and
  `deer` (long legs and neck, `spots`, `prance`). Their ids are placeholders a game renames.
- The public surface (`src/headless.ts`, and so `src/index.ts`) has, by the end of this task, for the editors and any
  agent's tools (each name is exported from `content.ts` by the task that makes it, under Global Constraints'
  "Public names", so the editors' plan G can take Parts 0 to 3 before this task; this task adds `STARTERS` and checks
  the whole list):
  `PaletteFile`, `PieceFile`, `GaitFile`, `StandFile`, `FreeFigure`, `RiggedFigure`, `isRigged`, `PERSON_SLIDERS`,
  `ANIMAL_SLIDERS`, `FACE_SLIDERS`, `FACE_STYLES`, `ANIMAL_FACE_STYLES`, `GAIT_NUMBERS`, `BONES`, `PLACES`, `LIMITS`,
  `PIECE_KINDS`, `LIBRARY_KIT`, `LIBRARY_PALETTE`, `STARTERS`, `figureKit`, `figurePoses`, `posesOf`, `skeletonOf`,
  `placeBones`, `solvePose`, `reachOf`, `limitProblem`, `paintFrame`, `frameName`, `lightness`, `listContent`, and
  their types.

- [ ] **Step 1: Write the failing tests:** each starter reads through `FigureSchema`, passes `checkRigged` against the
  library alone, and paints; none names a ramp or piece outside the library; the public surface test lists the names
  above; the contact sheet gains the six starters.
- [ ] **Step 2: Push; red.** **Step 3: Implement.** **Step 4: Push; look at the six; API report from the log; green.**
- [ ] **Step 5: Commit** `feat(content): six starter figures, and the figure tools on the public surface`

### Task 20: The docs, the skills, and the whole way through in real browsers

**Files:** Modify `README.md` (the art section, the commands table, the content table), `skills/automata-content/SKILL.md`,
`skills/automata/SKILL.md`, `template/AGENTS.md` where it lists commands; create `tests/create/figure.journey.test.ts`;
modify `tests/docs/readme.test.ts`, `tests/skills/*` as their lists need.

**Interfaces:** Consumes everything above. Produces no code.

The README gains "A person or an animal": the spec's example file whole, the three body plans in one table, where
the sliders' sentences are (`schemas/figure.schema.json`), how colours are named (a palette's ramps), the library's
kinds with three ids each and how to see them all (`automata mcp`'s `schema` tool and the `content_types` list), a
game's own piece in ten lines, a pose by `place` and by `bends`, the names of the pictures, `views` and `setSide`,
and `automata add`. Every sentence passes the drunk-grandma test and says what to type.

**The journey** (`create-play` job, the three browsers, the five sizes of `create.journey.test.ts`, whose set-up it
shares by moving the shared helpers to `tests/create/game.ts`): make a game from the packed package as the README
says; write `content/figures/keeper.json` (the `keeper` starter's text, `"id": "keeper"`) and
`content/characters/keeper.json` (fixed, with `"figure": "keeper"` and an `idle` clip of `idle-1` to `idle-4`);
`automata add` both; put the keeper in `level-1`'s things; `automata art` (it prints `Painted
content/figures/keeper.png`); `automata check` exits 0 (if its replay step says the content changed, run the command
its own message names first, as a person would); `automata play`; in each browser the page's sim has an entity whose
sprite's character is `keeper` and whose pose is one of `idle-1` to `idle-4`, the pixel at the keeper's middle on the
canvas is not the sky's colour, and after 30 ticks the pose has changed; a picture of each size is saved for
`ci-screens`.

- [ ] **Step 1: Write the journey and the README test's new lines** (the README names `automata add`, `"format": 2`,
  `views` and `setSide`; the example in it reads through `FigureSchema`).
- [ ] **Step 2: Push; red.** **Step 3: Write the docs.** **Step 4: Push; green in every job; look at the journey's
  pictures on `ci-screens`.**
- [ ] **Step 5: Commit** `docs: rigged figures in the README and skills, and a new game given one, end to end`
- [ ] **Step 6: Open Part 6's pull request; when green, tell the merge session. Update the tracker to stage 4 at 100%
  and write the handoffs below into it.**

---

## For the editors (AutomataFrameworkEditors' figure builder)

What that plan takes from this one, by the names in Task 19: the slider tables (label, range, normal, group) for the
Body and Face panels; `LIBRARY_KIT` and `figureKit` for the Wear tray and the colours; `paintFrame` for the canvas on
every change and `paintFigure` plus `artFiles` for what is saved; `placeBones` for where the handles are, `reachOf`
and `solvePose` to stop a handle where the arm ends, `limitProblem` for joint by joint; `figurePoses` for the strips
in Move and Pose; `STARTERS` for New figure; `listContent` for the one `automata.toml` block. The builder may ship by
part as these parts land, each stage only what the pinned framework paints.

## Handoffs

- **Examples (plan D):** the demo's hero, keeper and critter are format 2 files in Examples, drafted by an agent from
  `STARTERS` and finished in the builder (the Owner: "the real art comes from the builders"). Examples moves its pin
  after each part. Its palette is its own file with the Owner's No. 276 colours as ramps. Its goldens are plan D's.
  **The Owner's answer to audit Q1 (2026-11-15): shades mixed from the four.** No. 276 has four colours (`#111314`,
  `#f37f94`, `#afd472`, `#fdd4bd`), and a ramp needs three to six that get lighter each time. The demo's ramps are
  made of those four and of even mixes of two of them (each channel the mean of the two, rounded half up), the way
  the Site mixes its shades from its own palette; every ramp still gets lighter step by step, which plan R's palette
  check already holds. Examples' palette check (plan D) accepts the four and the six even mixes, and fails any other
  colour. Nothing in plan R's code changes. Also for Part 9's art list: a rigged figure's walk and
  run come from its gait (`walk-1` …, `run-1` …), and those names are refused as its own poses, so the hero's "run
  (2)" becomes its gait's run.
- **The template** stays on its two free figures; `automata create` is unchanged.
- **Lamps, swaying cloth and hair, a behaviour that sets a view, a second picture for a big sheet:** not built; the
  spec's non-goals and this plan's recorded readings.

## Self-review (done while writing)

- **Spec coverage:** body plans and bones (model, Tasks 3, 15); two bends and limits (model, Tasks 3, 9, 10);
  sliders for people, animals and faces (Tasks 2, 15); palette, outline, variants (Tasks 1, 2, 5); pieces, the
  library, a game's own, shapes on a bone (Tasks 6 to 8, 16); gaits, stands, poses by place and by bends (Tasks 9 to
  12, 16); views and the sprite's view (Tasks 13, 14); painting rules and the sheet (Tasks 4, 5, 13); free figures
  byte for byte (constraints, Tasks 2, 5); the `automata.toml` writer and command (Tasks 17, 18); checks and words
  (each task's sentences); the spec's tests (schema tests each task; goldens in four engines Tasks 5 to 16; the solve
  Task 10; the gait Task 11; the writer Task 17; end to end Task 20).
- **Readings of the spec recorded here:** face styles are a list in code; a behaviour sets no view; a sheet never
  spills; `stand` left out is `easy` and `gait` left out is no walk; starters are added for the builder's New figure.

## Plan audit (2026-11-15)

Audited in [`audits/2026-11-15-rigged-figures-plan-audit.md`](../audits/2026-11-15-rigged-figures-plan-audit.md). The
fixes are in this page: the writer is Part 0 and built first (I1); `BodyPlan` and `FigureView`, and every new name
exported as it is made (I2); `paint-figure.ts`'s one-line type import (I3); a palette's `ink`, row 28 renamed, and no
default naming a library ramp (I5); even walk pictures, the stride's crouch and the walk's bob (I6); an animal's trunk
measured from forward (I7); places in units from the hips (I8); Part 4 after plans H and T (I9); advice for missing
keys that fits each format (I10); the sheet's numbers (I11); and the minor ones. The Owner answered Q1 (the demo's
shades are even mixes of palette No. 276's four colours; see the plan D handoff). Q2 (a behaviour that sets a view) is
open and does not stop Parts 0 to 3.
