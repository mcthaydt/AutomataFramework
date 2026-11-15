# Scenes, Slice 1 (Framework): Ground and Materials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, in
> one session, with no subagents (project rule). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A game can keep a place in one `scene` file: its ground (solid, slopes, ledges, back walls), painted from
photo materials, tilesets or flat colours, with a level that only names the scene and places what plays; an old level
moves onto a scene with one command and plays to the same hash.

**Architecture:** `content` gains two kinds of file (`scene`, `photo`), a PNG reader of our own, the photo pipeline
and a ground painter that give the same bytes in every engine. `level` reads the ground's colliders from the scene;
`physics` gains two slope shapes and a one-way ledge, none of which changes a sim that does not use them. `render`
draws the scene's ground picture where it drew a level's tiles. `cli` gains `automata scene from-level`, and `automata
art` and `check` learn scenes. Everything the editors' Scenes part needs is exported from the headless entry, so an
iPad paints what `automata art` paints.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.6.6, Rapier's deterministic 2D build 0.21.0, Koota 0.6.6, PixiJS
8.22.0, Effect 3.22.2 (the `cli` feature only), Vitest 5.0.3, Biome 2.5.15, knip 6.39.0, pnpm 10.34.6, Node 24.21.0.
**No new dependency.**

**Plan audit:** [`audits/2026-11-15-scenes-1-plan-audit.md`](../audits/2026-11-15-scenes-1-plan-audit.md) (stage 3,
2026-11-15). Its fixes are written into this plan; each fixed place names its finding (I1 to I7, M1 to M6).

**Spec:** [`2026-11-15-2d-environment-builder-design.md`](https://github.com/mcthaydt/AutomataFrameworkEditors/blob/main/docs/superpowers/specs/2026-11-15-2d-environment-builder-design.md)
in AutomataFrameworkEditors. Read it first: "What a scene can hold", "How a
scene and a level split", "The framework's side", "Slices" (this is the framework part of slice 1), "Testing" and
"Constraints". Principles served: 5 (the environment builder, carried over), 1 (a scene is one JSON file and every
action is a command), 3 (2D only). The builder's part of slice 1 is the Editors' plan of the same name.

The old code this plan ports from is `AutomataFrameworkFailed@ed8592e8`, `extensions/world-kit/`: read for its rules,
never copied whole (principle 7). Each task names the file it reads.

## Global Constraints

- **No golden moves.** Everything in `tests/golden/`, `schema-hash.json` included, and `template/replays/level-1.json`
  keep their hashes: none of those games has a scene. If one differs in CI, stop that task and report. Never re-record.
- **New goldens** (each committed with empty hashes and recorded from CI's log, as earlier plans did):
  `tests/golden/photos.json` (Task 2), `tests/golden/scene-art.json` (Task 8), `tests/golden/scene.json` (Task 11),
  `tests/golden/slopes.json` (Task 12).
- **No new dependency.** The PNG reader and its inflate are ours. If a task seems to need a package, stop and report.
- **Painter math** (every file under `src/features/content/` this plan adds, and `src/lib/inflate.ts`,
  `src/lib/png-read.ts`): `+ - * /`, comparisons, `Math.min`, `Math.max`, `Math.abs`, `Math.floor`, `Math.round`,
  `Math.sqrt`, `Math.imul`, and `dmath`'s `pow` (imported through `sim/sim.ts`, M3) for a root or a power. Never `**`, `Math.pow`, `Math.cbrt`,
  `Math.hypot`, `Math.exp`, `Math.log` or a trigonometric `Math` function: those differ between engines. Typed arrays
  are `Float64Array`, `Uint8Array`, `Uint16Array` or `Int32Array`. A sort always has a comparator that never answers 0
  for two different items. Task 6 widens the architecture rule that already holds painter files to this (M1).
- **Sim math** (the `level` and `physics` code added here): as plan H's: `+ - * /`, comparisons, `Math.min`,
  `Math.max`, `Math.abs`, `Math.floor`; `dmath` for anything else.
- **Presentation never reaches the sim.** A scene's `paints`, `materials`, `seed`, `tile`, `sky` and `backdrop` are not
  in the content the sim hashes (Task 11), so repainting a scene never moves a hash or stops a replay.
- **y points down.** A tile is one unit. A tick is 1/60 of a second.
- **Words:** every sentence a person reads is plain (the drunk-grandma test): what is wrong, then what to write. US
  spelling in new files' keys (`color`), as the content formats have it.
- **No file over 600 lines.** `content/level.ts` is at 442 and `render/stage.ts` at 373: Task 5 and Task 13 say where
  new code goes instead.
- **Tests run only in GitHub-hosted CI.** Run nothing locally: no install, typecheck, lint, test, build or generator.
  Push, then read the pull request's checks (`gh pr checks <number> --watch`). Write each test first and push it red
  before its code.
- **Generated files.** `schemas/*.json` and `docs/api/framework.api.md` are committed. When the `package` job fails on
  `pnpm schemas --check` or `pnpm api-report`, take the new text from that job's log and commit it.
- **Commits:** author and committer `McThayDT <107786093+mcthaydt@users.noreply.github.com>`; set the config before
  every commit; a local hook refuses any other author; no AI attribution anywhere; never force-push.
- **An Owner question is never defaulted.** Send it to the coordinator with options and a recommendation, and wait.
- **Stop rules.** Stop and report at once on: a golden that moved; the third fix for the same failure; a need for a
  dependency or a workflow change not named here; an `engines` job over 25 minutes; Rapier lacking a call Task 10
  names.
- **Tracker:** after each task, update `docs/superpowers/progress.md` (Cycle 12, the number the merge session gave
  this cycle; "Cycle 8" is taken by other plans, I1). Tasks 1 to 16 are 5.5% each;
  the last 12% is the final green run with every check passing.

## Before starting

- **Plan H (the built-in hero) is being built** (pull request 101). It changes `spawn-level.ts`, `uses.ts`,
  `level.ts`, `game-sim.ts`, `physics-world.ts`, `rapier.ts`, `physics.ts`, `components.ts`, `game.ts`, `online.ts`
  and `render.ts` (I2). **Part A (Tasks 1 to 8) can start now; Parts B and C start only after pull request 101 is
  merged.** Task 12 names plan H's files as they are on that branch on 2026-11-15 (`physics/touching.ts`,
  `level/move-step.ts`, `level/moves.ts`, `Touching`, `usesMoves`). If a name in Part B or C differs on `main`, use
  `main`'s and report the difference as a deviation.
- **The rigged-figures spec and plan U** are in review and touch other files. Rebase before each push.
- **One pull request per part**, each a draft, each merged by the merge session before the next part's is opened:
  Part A (Tasks 1 to 8), Part B (Tasks 9 to 12), Part C (Task 13), Part D (Tasks 14 to 16).

## The builder's calls

The spec leaves these to the plan ("Left to the builder"). They are settled here so the executor makes none. The plan
audit may challenge each; the Owner may overrule any.

1. **One picture for the ground.** A scene's ground is painted whole into `content/scenes/<id>.png`, cut into pages no
   wider than the picture limit and stacked top to bottom, with an atlas beside it (`<id>.atlas.json`) naming each page
   `ground/0`, `ground/1`. Painting the ground whole is what lets a photo run across tiles with no seam and lets the
   painter work out every edge. Later slices add `<id>.layers.png` and `<id>.props.png`; none changes this one.
2. **Three kinds of material.** `photo` (a photo through the pipeline, in the scene's paints), `tiles` (one kind of
   tile of a tileset, drawn by the renderer from the tileset's own picture, as a level's tiles are today) and `flat`
   (one paint). A slope must be `photo` or `flat`: a tileset's tile is a whole square.
3. **A photo takes the scene's colors two ways** (the old pipeline's two modes): `ladder`, the photo's light as steps
   on a list of the scene's paints, dark to light, with a second list (`accent`) where the photo's hue parts from the
   rest (brick and mortar); or `match`, the photo's own few main colors, each moved to the scene's nearest paint.
4. **Nine shapes:** `solid`, `slope-up` and `slope-down` (one tile up or down per tile, read left to right),
   `half-up-low`, `half-up-high`, `half-down-high`, `half-down-low` (half a tile per tile, two letters a step),
   `ledge` (stood on from above, passed through from below; the top quarter of its tile) and `back` (seen, never
   solid). No ceiling slopes: the spec lists none.
5. **A slope stands on ground.** Slope tiles on one straight line are one collider, a triangle down to the level of
   the line's foot, and every tile under the line inside that triangle must be `solid`. That is what keeps a hero's
   foot from catching between tiles (one collider has no seams), and the check says which tile to fill.
6. **A ledge passes a body moving up, or one whose feet are below its top.** The rule is in a Rapier contact hook and
   reads only positions and speeds, so a restored sim needs nothing remembered.
7. **Slopes are switched on by content.** A game with a slope in any scene gets one more component (`Ground`, the
   slope under a body), so the built-in hero can walk along it. A game with none has the sim it has today.
8. **Old levels keep their boxes.** A level in `#` and `.` spawns one box a row; one with a tileset joins stacked
   rows. A scene joins them unless its ground says `"oneBoxPerRow": true`, which only `from-level` writes, for a level
   that had no tileset. That and the copied colors are what make a moved level play to the same hash.
9. **What is behind, for now.** A slice 1 scene may name a `backdrop` file, so a moved level keeps what was behind it.
   Slice 3 gives scenes their own layers, turns this into them and removes the key. Nothing is released before then,
   so the format stays 1.
10. **Photos ship as files.** The 38 CC0 photos go in `photos/` at the package's root (2.9 MB), with their records
    in `src/features/content/library/photos.json`. A game's own photo is a `photo` content file beside its PNG, at
    most 256 pixels a side, 8 bits a channel, not interlaced: the library's own limits.
11. **The painter is handed its photos.** `artFiles(content, photos)` takes a function that gives a photo's pixels by
    id. The command reads them from the package and the game's folder; the editors fetch them. The painter itself
    reads no file.
12. **A photo's size is in tiles.** The old records' metres become tiles, one for one.
13. **The level's size is its scene's.** `worldSize(content, level)` answers for both kinds of level; `levelSize`
    stays for a level with tiles, so nothing pinned to it breaks.
14. **`automata.toml` gets one writer,** `listContent`, that adds a `[[content]]` block and changes nothing else in
    the file's text. **This plan does not make it** (I3, and the coordinator, 2026-11-15, after the rigged-figures
    audit, AF PR 117): plan R's Part 0 builds `src/features/content/project-write.ts` first and it is the one writer,
    `listContent(text, entry, about?): Parsed<string>`; the sound formats (PR 112) add `withFolders` to the same file.
    Task 14 consumes plan R's, adapting to its answer (`ok` or a sentence) rather than a throw, and stops if Part 0 is
    not on `main` when Task 14 starts. When a listed folder (plan M's folder form) already holds a new file's path, no
    block is added.

## Review Focus

Inputs the spec implies and a person will meet. Each has its test in the task named.

1. **A level with both `tiles` and `scene`, or neither.** One sentence that says which to keep, never a crash.
   Task 5 (`level.test.ts`, "a level with a scene and tiles").
2. **A scene too big for its pictures** (256 by 64 tiles at 32 pixels a tile). The check names the scene, the size its
   picture would be and what to make smaller. Task 3 (`scene.test.ts`, "too big to paint").
3. **A photo that is not there, or not one the reader takes** (a JPEG renamed `.png`, an interlaced or 16-bit PNG, a
   file cut short). A sentence naming the file and what to save it as; never a thrown stack. Tasks 1 and 4
   (`png-read.test.ts`, "bytes that are not a PNG", and `photo.test.ts`).
4. **A slope with air under it, a lone half slope, a slope that runs off the scene's edge.** The first is refused
   with the tile to fill; the other two still play, each tile its own collider. Tasks 3 and 9.
5. **A hero standing still on a slope, and a crate dropped on a ledge from below and from above.** The hero does not
   creep; the crate passes up and rests on top. Tasks 10 and 12 (`slopes.parity.test.ts`).

---

## File structure

```
photos/                               the 38 library photos (Task 2)
src/lib/
  inflate.ts                          zlib's inflate, ours (Task 1)
  png-read.ts                         decodePng: 8-bit grey, RGB, RGBA or palette, not interlaced (Task 1)
src/features/content/
  library/photos.json                 each library photo's record (Task 2)
  photo-library.ts                    PHOTO_LIBRARY, PhotoRecord, PhotoPixels, Photos (Task 2)
  scene.ts                            SceneFile, SceneSchema, sceneInfo (Task 3)
  scene-ground.ts                     shapes, coverOf, slopeRuns, the ground's own checks (Task 3)
  photo.ts                            PhotoFile, PhotoSchema, photoInfo (Task 4)
  level.ts, level-checks.ts           a level names a scene; the checks across fields move out (Task 5)
  lab.ts                              sRGB to OKLab and back, engine-proof (Task 6)
  photo-tile.ts                       the pipeline: flatten, facet, resample, index, wear, clean (Task 6)
  paint-scene.ts                      paintScene: the ground's picture (Task 7)
  sheet.ts                            sceneSheet (Task 7)
  art.ts                              scenes painted and judged; photos handed in (Task 8)
  scene-from-level.ts                 sceneFromLevel (Task 8)
src/features/level/
  ground.ts                           groundColliders (Task 9)
  spawn-level.ts, sim-content.ts, uses.ts, tile-runs.ts (worldSize)   (Task 11)
  move-step.ts, moves.ts              the hero along a slope (Task 12)
src/features/physics/
  kinds.ts, spawn.ts, checks.ts, rapier.ts, physics-world.ts   slope shapes, the ledge (Task 10)
  components.ts, touching.ts, physics.ts                        Ground (Task 12)
src/features/render/
  ground.ts                           the ground pages and tile sprites of a scene (Task 13)
  art.ts, stage.ts, still.ts          a level with a scene, drawn (Task 13)
src/features/cli/
  scene.ts                            automata scene from-level (Task 14)
  photos.ts                           the photos a game's painter needs, read from disk (Task 14)
  art.ts, args.ts, cli.ts, help.ts, mcp-tools.ts   (Task 14)
skills/automata-content/scenes.md     the scenes page (Task 15)
tests/fixtures/scene-game/            a game with a scene: every shape, all three kinds of material (Task 3 on)
```

`content` stays below `level`, `physics` below `level`, `render` above both; nothing here imports upward. Add each new
file to `tests/architecture/` only if a rule there lists files by name.

## The format

One scene, as `writeContent('scene', …)` writes it. Keys in this order; `?` may be left out.

```jsonc
{
  "format": 1,
  "id": "meadow",                      // the file's name
  "seed": 7,                           // 0 to 4294967295: another number, another painting
  "tile": 16,                          // pixels a tile, 4 to 64
  "size": { "w": 32, "h": 18 },        // tiles, each 1 to 256
  "sky": "#9fd3f0",                    // ? left out: the framework's light blue
  "backdrop": "valley",                // ? a backdrop file, until slice 3 (call 9)
  "paints": [                          // 1 to 64, named for what they are for
    { "id": "soil-dark", "color": "#4a3324" }, { "id": "soil", "color": "#6b4a33" },
    { "id": "soil-light", "color": "#8a6444" }, { "id": "grass", "color": "#5fa04a" }
  ],
  "materials": [                       // 1 to 32
    { "id": "earth", "kind": "photo", "photo": "dirt",
      "ladder": ["soil-dark", "soil", "soil-light"],   // 2 to 6 paints, dark to light
      "top": { "material": "turf", "deep": 5 },        // ? another material on top, this many pixels deep
      "edge": "soil-dark",                             // ? a one-pixel line where the ground meets air
      "wear": 0.3 },                                   // ? 0 new to 1 derelict
    { "id": "turf", "kind": "flat", "paint": "grass" },
    { "id": "stone", "kind": "tiles", "tileset": "meadow", "tile": "stone" }
  ],
  "ground": {
    "color": "#3b4a5a",                // ? the boxes' color when no picture is drawn; left out: the framework's slate
    "oneBoxPerRow": true,              // ? only from-level writes it (call 8)
    "letters": [                       // 0 to 93; "." is always air
      { "letter": "G", "material": "earth", "shape": "solid" },
      { "letter": "/", "material": "earth", "shape": "slope-up" }
    ],
    "rows": ["....", "../G", "GGGG"]   // size.h rows of size.w letters, top to bottom
  }
}
```

A `photo` material's other knobs, each optional, with the old pipeline's defaults (`TEXTURE_DEFAULTS`, world-kit
`src/features/textures/texture-spec.ts`):

| Key | Default | Limits | What it does |
|---|---|---|---|
| `accent` | none | 2 to 6 paints, as long as `ladder` | the second ladder, for texels whose hue parts from the rest |
| `match` | none | 2 to 8 | in place of `ladder`: keep this many of the photo's own colors, each as the scene's nearest paint |
| `scale` | 1 | 0.25 to 8 | the photo this many times bigger in the scene |
| `turn` | false | | a quarter turn |
| `wear` | 0.3 | 0 to 1 | worn patches a step darker |
| `seed` | 0 | 0 to 4294967295 | moves where it wears |
| `flatten` | 0.85 | 0 to 1 | how much slow light change is taken out |
| `facet` | 1 | 0 to 4, whole | the Kuwahara radius |
| `contrast` | 0.07 | 0.01 to 0.5 | the lightness one ladder step spans |
| `hue` | 0.06 | 0 to 0.5 | how far a texel's hue must part to take `accent` (the old `accent` knob) |
| `cluster` | 4 | 1 to 64, whole | the smallest patch the clean-up keeps |

Exactly one of `ladder` and `match`. `accent` and `contrast` only with `ladder`. `top` and `edge` on `photo` and
`flat`.

A level that names a scene (Task 5): `"scene": "meadow"` and no `tiles`, `tileset`, `backdrop`, `sky` or `ground`.

A game's own photo, `content/photos/moss.json` (Task 4), the same record the library keeps:

```json
{ "format": 1, "id": "moss", "image": "content/photos/moss.png", "size": { "w": 1, "h": 1 },
  "source": "my own photo, 2026", "licence": "CC0", "credit": "Dana, taken in the garden" }
```

---

## Part A: the files and the painter (pull request 1)

### Task 1: A PNG reader of our own

**Files:**
- Create: `src/lib/inflate.ts`, `src/lib/png-read.ts`
- Modify: `src/headless.ts` (export `decodePng`, `type RgbaPicture`, `PngError`)
- Test: `tests/lib/inflate.test.ts`, `tests/lib/png-read.test.ts`, `tests/lib/png-read.parity.test.ts`

**Interfaces:**
- Produces:

```ts
// inflate.ts
/** The bytes a zlib stream (RFC 1950) unpacks to. Throws `InflateError` when the stream is cut short or wrong. */
export function inflate(zlib: Uint8Array): Uint8Array
export class InflateError extends Error {}
// png-read.ts
export interface RgbaPicture { readonly width: number; readonly height: number; readonly rgba: Uint8Array }
/** A sentence a person can act on: what the file is, and what to save it as. */
export class PngError extends Error {}
/** Reads a PNG: 8 bits a channel, grey, grey with alpha, RGB, RGBA or palette (with tRNS), not interlaced. */
export function decodePng(bytes: Uint8Array): RgbaPicture
```

Read world-kit `src/features/textures/png.ts` for the chunk walk and the five row filters; it inflates with
`node:zlib`, which this must not. `inflate` handles stored, fixed and dynamic Huffman blocks (RFC 1951) and checks the
Adler-32. `decodePng` checks every chunk's CRC with the table `png.ts` already has (export `crc32` from `png.ts` and
import it; do not copy it).

- [ ] **Step 1: Failing tests.**
  - `inflate.test.ts`: a stored block, a fixed block and a dynamic block (three byte arrays written in the test, each
    with its expected text) unpack; a stream cut one byte short, a bad Adler-32 and a block of type 3 each throw
    `InflateError`.
  - `png-read.test.ts`: `decodePng(encodePng(p))` gives `p`'s pixels as RGBA for a 3 by 2 picture with a clear pixel
    (alpha 0) and two colors; each of the five row filters (five tiny files written as byte arrays in
    `tests/fixtures/content/png-samples.ts`); "bytes that are not a PNG" throws `PngError` with `This file is not a
    PNG picture.`; a JPEG's first bytes the same; an interlaced header throws `This PNG is interlaced. Save it again
    without interlacing.`; 16 bits a channel throws `This PNG has 16 bits a channel. Save it again with 8.`; a file
    cut in the middle of its data throws `This PNG is cut short. Save it again.`; a wrong CRC throws the same.
  - `png-read.parity.test.ts`: the xxhash64 of `decodePng` of `photos/brick.png` (read through Vite's `?url` and
    `fetch` in a browser, `node:fs` in Node, by the helper the other parity tests use for files) is one fixed hash in
    all four engines. It waits for Task 2's file: write it in Task 2's first step and leave this bullet's file out
    until then.
- [ ] **Step 2:** Push; red. **Step 3:** Implement. **Step 4:** Push; green.
- [ ] **Step 5:** Commit `feat(lib): a PNG reader with its own inflate`. Report `Task 1: <commit>, <tests>, surprises`.

### Task 2: The photo library

**Files:**
- Create: `photos/*.png` (38 files, copied byte for byte from world-kit `assets/photos/`), `photos/README.md`
- Create: `src/features/content/library/photos.json`, `src/features/content/photo-library.ts`
- Modify: `package.json` (`files` gains `"photos"`; `exports` gains `"./photos/*": "./photos/*"`),
  `src/features/content/content.ts`, `tests/package.test.ts`
- Test: `tests/features/content/photo-library.test.ts`, `tests/features/content/photo-library.parity.test.ts`,
  `tests/golden/photos.json`

**Interfaces:**
- Consumes: `decodePng` (Task 1).
- Produces:

```ts
export interface PhotoRecord {
  readonly file: string                                  // 'brick.png'
  readonly size: { readonly w: number; readonly h: number }   // tiles the photo spans
  readonly source: string; readonly licence: string; readonly credit: string
}
/** Every library photo by id, sorted. Frozen. */
export const PHOTO_LIBRARY: Readonly<Record<string, PhotoRecord>>
/** A photo ready for the pipeline. */
export interface PhotoPixels extends RgbaPicture { readonly size: { readonly w: number; readonly h: number } }
/** Gives a photo by id (the game's own first, then the library's), or undefined. */
export type Photos = (id: string) => PhotoPixels | undefined
```

`photos.json` is world-kit's `assets/photos/photos.json` with `size: [w, h]` written as `{ "w": w, "h": h }` (call
12) and nothing else changed. `photos/README.md` says in three sentences what the folder is, that every photo is CC0
from Poly Haven, and that `photos.json` in the package's source names each one's source and credit.

- [ ] **Step 1: Failing tests.** `photo-library.test.ts`: 38 records; each has a non-empty `source`, `licence` and
      `credit`; each `file` exists in `photos/` and no file there (but `README.md`) lacks a record; each decodes, is
      at most 256 pixels a side and is square or as wide and tall as its record's proportions within one pixel in
      eight. `package.test.ts`: the packed file list holds `photos/brick.png`. The parity test: for every photo, the
      xxhash64 of its decoded pixels equals `tests/golden/photos.json` in Node and three browsers. Task 1's
      `png-read.parity.test.ts` is added here.
- [ ] **Step 2:** Push; red (the golden is empty). **Step 3:** Copy the photos, write the records. **Step 4:** Push;
      take the 38 hashes from the Node job's log into `tests/golden/photos.json`; push; green in four engines. If two
      engines print different hashes, stop: the reader is not engine-proof.
- [ ] **Step 5:** Commit `feat(content): the photo library, 38 CC0 photos with their records`. Report `Task 2`.

### Task 3: The `scene` file

**Files:**
- Create: `src/features/content/scene.ts`, `src/features/content/scene-ground.ts`
- Modify: `src/features/content/content-types.ts`, `content.ts`, `load.ts` (`GameContent.scenes?`),
  `schemas/scene.schema.json` (from the `package` job's log), `scripts/write-schemas.ts` only if it lists kinds by hand
- Create: `tests/fixtures/scene-game/` (`automata.toml`, `content/scenes/meadow.json`, `content/levels/level-1.json`
  as an old level for now, the characters and the `meadow` tileset copied from `tests/fixtures/full-game`)
- Test: `tests/features/content/scene.test.ts`, `scene-ground.test.ts`, `content-types.test.ts`, `write.test.ts`

**Interfaces:**
- Produces (types as "The format" above; unions told apart by `kind`):

```ts
// scene.ts
export interface ScenePaint { readonly id: string; readonly color: string }
export type SceneMaterial = PhotoMaterial | TilesMaterial | FlatMaterial
export interface SceneLetter { readonly letter: string; readonly material: string; readonly shape: GroundShape }
export interface SceneGround {
  readonly color?: string | undefined; readonly oneBoxPerRow?: true | undefined
  readonly letters: readonly SceneLetter[]; readonly rows: readonly string[]
}
export interface SceneFile { readonly format: 1; readonly id: string; readonly seed: number; readonly tile: number
  readonly size: { readonly w: number; readonly h: number }; readonly sky?: string | undefined
  readonly backdrop?: string | undefined; readonly paints: readonly ScenePaint[]
  readonly materials: readonly SceneMaterial[]; readonly ground: SceneGround }
export const SceneSchema: z.ZodType<SceneFile, SceneFile>
export const sceneInfo: ContentTypeInfo<SceneFile, SceneFile>   // plural 'scenes', editor 'world', part 'scenes', noun 'scene'
// scene-ground.ts: plain geometry, used by the checks, the painter (Task 7) and the sim (Task 9)
export const GROUND_SHAPES = ['solid', 'slope-up', 'slope-down', 'half-up-low', 'half-up-high',
  'half-down-high', 'half-down-low', 'ledge', 'back'] as const
export type GroundShape = (typeof GROUND_SHAPES)[number]
/** How much of a ledge's tile is ledge, from its top. */
export const LEDGE_DEEP = 0.25
/** How far below the tile's top the shape's surface is at `x` (0 to 1 across the tile): 0 for solid, 1 - x for slope-up. */
export function surfaceAt(shape: GroundShape, x: number): number
/** True when the point (`x`, `y`, each 0 to 1 inside the tile, y down) is inside the shape. `back` is never inside. */
export function covers(shape: GroundShape, x: number, y: number): boolean
/** The shape of each tile: `shapeAt(col, row)` is undefined for air and outside the scene. */
export function shapesOf(ground: SceneGround): (col: number, row: number) => GroundShape | undefined
/** A straight line of slope tiles, left to right. `rise` is tiles up (negative: down) from its left end to its right. */
export interface SlopeRun { readonly col: number; readonly row: number; readonly w: number; readonly rise: number }
/** Every slope tile in exactly one run. A run is as long as its line stays straight and its tiles well formed. */
export function slopeRuns(ground: SceneGround): SlopeRun[]
/** The tiles under a run's line, inside its triangle, that are not `solid`: what call 5 asks to be filled. */
export function gapsUnder(ground: SceneGround, run: SlopeRun): { col: number; row: number }[]
```

`SlopeRun.row` is the row of the run's lowest tile; `col` its leftmost column. `slopeRuns` orders runs by `col`,
then `row`. A `slope-up` run is tiles at (`col + i`, `row - i`); a `slope-down` run at (`col + i`, `row - w + 1 + i`)
read so its lowest tile is its last. A half run is `half-up-low`, `half-up-high` in one row, then the next pair one
row up (and the mirror for down); a half tile with no partner, or a pair out of order, is a run of one tile.

The schema's own checks (`superRefine`, coping with a half-read file), each one sentence:

| What is wrong | Where | Sentence |
|---|---|---|
| a row's length, or the number of rows | `ground.rows[i]`, `ground.rows` | `This row has 30 tiles but the scene is 32 wide. Every row must be 32 long.` / `This scene is 18 tiles tall but has 17 rows. Write 18 rows.` |
| a letter no entry has | `ground.rows[i]` | `The letter "Q" is not in this scene's letters. It has: /, G.` |
| a letter twice, or `.` | `ground.letters[i].letter` | the tileset's two sentences, word for word |
| an unknown material, paint, `top.material` | at the key | `noSuch('material', …, 'This scene')`, `noSuch('paint', …, 'This scene')` |
| `top` naming itself, or a `tiles` material | `materials[i].top.material` | `A material cannot be its own top.` / `The top must be a photo or a flat material.` |
| `top.deep` over `tile` | `materials[i].top.deep` | `The top can be 16 pixels deep at most, one tile. Write 16 or less.` |
| both or neither of `ladder` and `match` | `materials[i]` | `Write "ladder" (a list of paints, dark to light) or "match" (a number of colors), not both.` |
| `accent` not as long as `ladder` | `materials[i].accent` | `"accent" must list 3 paints, as "ladder" does.` |
| a slope whose material is `tiles` | `ground.letters[i].shape` | `A slope needs a photo or a flat material: a tileset's tile is a whole square.` |
| air or a non-solid tile under a slope's line | `ground.rows[row]` | `The slope that starts at column 4 needs solid ground under it. The tile at column 6, row 12 is not solid: fill it, or shorten the slope.` |
| too big to paint | `size` | `This scene's ground picture would be 8192 by 2048 pixels, cut into 4 pages stacked 8192 pixels tall. A picture can be 2048 at most: use a smaller "tile", or a smaller scene.` |

Too big (M2): `pages = ceil(w / groundPageTiles(tile))`; the picture is `min(w, groundPageTiles(tile)) * tile` wide
and `pages * h * tile` tall; it is too big when that height is over `MAX_PICTURE_SIDE`. The sentence's numbers come
from these lines.

`sceneInfo.check` (across files): `backdrop` is a listed backdrop; a `tiles` material's `tileset` is listed and has
the `tile` (`The tileset "meadow" has no tile called "stone". It has: dirt, grass.`); a `photo` material's `photo` is a
listed `photo` file or in `PHOTO_LIBRARY` (`There is no photo called "dirt2". This game has: moss. The library has:
aggregate, asphalt, … .`). `missing` has a sentence for every required key, as the other kinds do. `tidy` sorts
nothing: the order of paints, materials and letters is the author's.

- [ ] **Step 1: Failing tests.** `scene.test.ts`: the fixture's `meadow.json` reads; `writeContent('scene', value)`
      of it parses back to the same value and writes keys in the format's order; every row of the table above, by its
      exact sentence and path; "too big to paint" (256 by 64 at tile 32); every `missing` key. `scene-ground.test.ts`:
      `covers` at the four corners and the middle of each of the nine shapes; `surfaceAt('half-up-high', 0.5)` is
      0.25; `slopeRuns` of a 3-tile `slope-up`, a 4-tile half-up, a `slope-down`, a lone `half-up-high` (a run of one),
      two runs that touch at a peak (two runs); `gapsUnder` of a 3-tile slope with air under its third tile names that
      tile. `content-types.test.ts`: the table has `scene` after `backdrop`.
- [ ] **Step 2:** Push; red. **Step 3:** Implement. **Step 4:** Push; green; commit `schemas/scene.schema.json` from
      the `package` job's log.
- [ ] **Step 5:** Commit `feat(content): the scene file`. Report `Task 3`.

The fixture's `meadow` is 24 by 12 at tile 16, seed 7, with: a floor of `earth` (photo `dirt`, a three-paint ladder,
`top` of flat `turf` 4 deep, `edge`); a 3-tile `slope-up` and a 4-tile half-down run on it; two `ledge` tiles of flat
`plank`; a 3 by 2 patch of `back` in photo `brick` with `ladder` and `accent`; one `stone` tile of the `meadow`
tileset; one `match` material (photo `stone`, `match: 4`) as a wall. Later tasks' tests name these.

### Task 4: A game's own photos

**Files:**
- Create: `src/features/content/photo.ts`; `tests/fixtures/scene-game/content/photos/moss.json` and `moss.png` (a
  copy of `photos/bark.png`), listed in the fixture's `automata.toml`
- Modify: `content-types.ts`, `content.ts`, `load.ts` (`GameContent.photos?`), `schemas/photo.schema.json`
- Test: `tests/features/content/photo.test.ts`

**Interfaces:**
- Produces: `PhotoFile` (the record in "The format"), `PhotoSchema`, `photoInfo` (plural `photos`, editor `world`,
  part `scenes`, noun `photo`), and:

```ts
/** What is wrong with a game's own photo's picture, or undefined: not a PNG the reader takes, or over 256 a side. */
export function photoPictureProblem(photo: PhotoFile, bytes: Uint8Array | undefined): string | undefined
```

Sentences: missing bytes `There is no picture at "content/photos/moss.png". Put the photo there.`; too big `This
photo is 512 by 512 pixels. A photo can be 256 at most: make it smaller.`; a `PngError`'s own sentence otherwise.
`source`, `licence` and `credit` are each 1 to 200 characters; a missing one says `Write where the photo came from`,
`Write its licence, like "CC0"`, `Write who made it`. A game's photo with a library photo's id is allowed and wins.

- [ ] **Step 1: Failing tests** for each sentence, the read and the write. **Steps 2 to 4:** red, implement, green,
      schema from the log. **Step 5:** Commit `feat(content): a game's own photos`. Report `Task 4`.

### Task 5: A level names its scene

**Files:**
- Create: `src/features/content/level-checks.ts` (move `checkView` and `checkLevel`'s body here, unchanged, first;
  `level.ts` is near the size limit)
- Modify: `src/features/content/level.ts`, `schemas/level.schema.json`; the fixture's `level-1.json` becomes a level
  with `"scene": "meadow"`, and `level-old.json` keeps the old shape
- Test: `tests/features/content/level.test.ts`, `load.test.ts`

**Interfaces:**
- Produces: on `Level`, `readonly scene?: string | undefined` and `readonly tiles?: readonly string[] | undefined`
  (was required). In the written file `scene` comes after `id`.

Rules. Exactly one of `scene` and `tiles` (`level.ts`'s own check, at path `scene`):
`This level has a scene and its own tiles. A level with a scene takes its ground from the scene: remove "tiles".` /
`This level has no ground. Name a scene, like "scene": "meadow", or write "tiles".` With `scene`, each of `tileset`,
`backdrop`, `sky` and `ground` is refused at its own key: `A level with a scene takes this from the scene. Remove
"sky", and set it in the scene "meadow".` The checks that need the size (things, starts, joints and the view inside
the level) run in the schema for a level with `tiles`, as today, and in `levelInfo.check` for a level with a `scene`,
against the scene's `size`, with the same sentences; they are one function in `level-checks.ts` that takes a width and
a height. A scene that is not listed: `noSuch('scene', …)`. Every existing level test passes unchanged.

- [ ] **Step 1: Failing tests:** the six sentences; a thing outside a scene's size is refused with today's sentence;
      a level with a scene and no start for player 2 in a two-player game still gets today's sentence (`load.ts`).
- [ ] **Steps 2 to 4.** Every caller of `level.tiles` in `src/` now meets `undefined`: in this task give each the
      smallest safe answer (`level.tiles ?? []`) and nothing more; Tasks 11 and 13 give them scenes.
- [ ] **Step 5:** Commit `feat(content): a level names its scene`. Report `Task 5`.

### Task 6: The photo pipeline

**Files:**
- Create: `src/features/content/lab.ts`, `src/features/content/photo-tile.ts`
- Modify: `tests/architecture/rules.ts` (`PAINTER_FILES`, `PAINTER_MATH`), `tests/architecture/rules.test.ts` (M1)
- Test: `tests/features/content/lab.test.ts`, `photo-tile.test.ts`, `tests/architecture/rules.test.ts`

**Interfaces:**
- Consumes: `PhotoPixels`, `PhotoMaterial`, `ScenePaint`, `pow` from `sim/sim.ts`.
- Produces:

```ts
// lab.ts
/** 0xrrggbb as OKLab. Roots and powers through `dmath`'s `pow`, so every engine gives the same three numbers. */
export function labOf(rgb: number): readonly [number, number, number]
// photo-tile.ts
/** A material's tile: `width` by `height` pixels that repeat with no seam, each a place in the scene's paints (0-based). */
export interface MaterialTile { readonly width: number; readonly height: number; readonly places: Uint8Array }
/** The whole pipeline for one photo material at the scene's tile size. */
export function materialTile(material: PhotoMaterial, paints: readonly ScenePaint[], tile: number, photo: PhotoPixels): MaterialTile
```

Port, stage by stage, from world-kit `src/features/textures/pipeline.ts` and `tile.ts` (`photoToTile`,
`tileFromLab`), keeping each stage's rule and rewriting its math to the painter's rules (no `Float32Array`, no
`Math.hypot`: `Math.sqrt(a * a + b * b)`; no `** 2`). What changes from the old code:

- **Size:** `width = max(2, round(photo.size.w * scale * tile))`, the same for height; with `turn`, swapped. No
  texel-scale snapping.
- **`ladder` mode** is the old tone mode: offsets from the median lightness in steps of `contrast`, kept between
  `lo = -floor(n / 2)` and `lo + n - 1` for a ladder of `n` paints; a texel's paint is `ladder[offset - lo]`, or
  `accent[offset - lo]` where the old code chose slot 1 (hue distance over `hue`, and the accent's share between 3%
  and 60%). The median is the element at `length >> 1` of the lightnesses sorted with ties broken by index.
- **`match` mode** is the old photo mode: k-means from the lightness quantiles, 8 rounds, `k = match`; each centre
  takes the scene paint nearest it in OKLab (squared distance, the lower index on a tie).
- **Wear** steps a texel one place down its own ladder (never below its first paint); in `match` mode, to the next
  darker of the kept paints by OKLab lightness. Its seed is `material.seed * 31 + 7`, as before, through `hash3`
  (world-kit `colour.ts`, whole-number work, ported as it is).
- **Clean** as before, on places.

- [ ] **Step 1: Failing tests.** `lab.test.ts`: `labOf(0xffffff)` is within 1e-6 of (1, 0, 0); black is (0, 0, 0);
      `labOf(0xff0000)` within 1e-4 of (0.62796, 0.22486, 0.12585). `photo-tile.test.ts`, on a 16 by 16 photo made in
      the test (a checker of two greys with one red pixel block): the tile is `size * tile` pixels each way and twice
      that with `scale: 2`; `turn` swaps a 2 by 1 photo's sides; every place is an index of a paint the material
      names (ladder mode) or of the scene (match mode); a flat grey photo gives one place everywhere at `wear: 0`;
      `wear: 1` darkens some texels and none below the first paint; the same input gives the same bytes twice, and
      another `seed` gives other bytes; the left column's neighbours wrap (a run that touches both edges is one run
      to `clean`); `ladder` with `accent` puts the red block on the accent's paints. The architecture rule (M1):
      `PAINTER_FILES` gains `scene-ground`, `photo-library`, `lab`, `photo-tile`, `scene-from-level`,
      `src/lib/inflate.ts` and `src/lib/png-read.ts`; `PAINTER_MATH` (or a sibling pattern) gains `**`, `Math.cbrt`,
      `Float32Array` and `.sort()` with no argument; `rules.test.ts` has a made-up file failing on each, naming the
      file and the line. No separate `painter-math.test.ts`.
- [ ] **Steps 2 to 4:** red, implement, green. **Step 5:** Commit `feat(content): the photo pipeline`. Report `Task 6`.

### Task 7: The ground's picture

**Files:**
- Create: `src/features/content/paint-scene.ts`
- Modify: `src/features/content/sheet.ts` (`sceneSheet`), `content.ts`
- Test: `tests/features/content/paint-scene.test.ts`, `sheet.test.ts`

**Interfaces:**
- Consumes: `materialTile`, `covers`, `surfaceAt`, `shapesOf`, `createPicture`, `rgb`, `createRng`, `deriveSeed`.
- Produces:

```ts
// sheet.ts
/** How many tiles wide one page of a scene's ground is: `floor(MAX_PICTURE_SIDE / tile)`. */
export function groundPageTiles(tile: number): number
/** The ground's pages, `ground/0` first, each `size.h * tile` tall, stacked top to bottom. */
export function sceneSheet(scene: SceneFile): Sheet
// paint-scene.ts
/** The picture of a scene's ground, laid out as `sceneSheet` says, in the scene's paints (place i + 1 is paint i). */
export function paintScene(scene: SceneFile, photos: Photos): IndexedPicture
/** Thrown by `paintScene` when `photos` has no photo a material names. The message names the material and the photo. */
export class MissingPhotoError extends Error {}
```

How a pixel gets its paint, in this order (the tests pin each):

1. **Which tile, which shape.** The pixel's tile is its position divided by `tile`; the pixel is ground when
   `covers(shape, (px + 0.5) / tile, (py + 0.5) / tile)` of its tile's shape. A `ledge` covers its top `LEDGE_DEEP`.
   A `back` tile is painted over its whole square (it is seen) but counts as air for steps 3 and 4. A tile whose
   material is `tiles` is left clear: the renderer draws it.
2. **Its material's paint.** `photo`: the material's tile at (`x mod width`, `y mod height`), `x` and `y` being the
   pixel's place in the whole scene, so the photo runs across tiles with no seam. `flat`: its paint. `back` shows the
   paint one step down its own ladder (the first stays; a `flat` or `match` material keeps its paint).
3. **The top.** When the material has `top`, a ground pixel within `deep` pixels below its column's surface (the
   first air or `back` pixel straight above it, with nothing but that material's ground between) takes the top
   material's paint instead; the depth at each column is `deep - 1`, `deep` or `deep + 1`, drawn from
   `createRng(deriveSeed(scene.seed, material.id))`, one draw a column left to right, so the lower line of the grass
   is ragged and the same every time. A scene's top row has air above it.
4. **The edge.** When the material has `edge`, a ground pixel with an air or `back` pixel on any of its four sides
   takes that paint (after the top, so grass has its edge too). The scene's own border is not air.

- [ ] **Step 1: Failing tests,** on small scenes made in the test with `flat` materials (and one `photo` with a
      two-pixel photo), reading `paintScene(...).pixels`: a solid tile fills its square and air is 0; a `slope-up`
      tile fills exactly the pixels under its line (count them: `tile * (tile + 1) / 2` minus the diagonal's own
      rounding, pinned as the number for tile 8); a `ledge` fills its top quarter; a `back` tile of a three-paint
      ladder shows the ladder one step down; two solid tiles side by side of one photo material continue the photo
      (pixel at `x = tile` equals the tile's pixel at `tile mod width`); the top is 3, 4 or 5 deep at `deep: 4` and
      follows a slope; the edge is one pixel and not drawn at the scene's border; a `tiles` material's square is
      clear; the fixture's `meadow` paints the same bytes twice and other bytes with another `seed`; a material whose
      photo `photos` does not have throws `MissingPhotoError`: `The material "earth" uses the photo "dirt", and no
      such photo was given to the painter.` `sheet.test.ts`: a 24 by 12 scene at 16 is one page 384 by 192; a 200 by
      10 scene at 16 is two pages (128 and 72 tiles wide) stacked, 2048 by 320.
- [ ] **Steps 2 to 4.** **Step 5:** Commit `feat(content): the painter of a scene's ground`. Report `Task 7`.

### Task 8: Scenes in a game's art, and a scene from a level

**Files:**
- Modify: `src/features/content/art.ts`, `content.ts`
- Create: `src/features/content/scene-from-level.ts`
- Test: `tests/features/content/art.test.ts`, `art.parity.test.ts` (and `tests/golden/scene-art.json`),
  `scene-from-level.test.ts`

**Interfaces:**
- Produces:

```ts
// art.ts: `photos` is asked only when a scene has a photo material
export function artFiles(content: GameContent, photos?: Photos): ArtFile[]
export function artProblems(content: GameContent, read: (path: string) => Promise<Uint8Array | undefined>, photos?: Photos): Promise<Diagnostic[]>
export function paintedPath(content: GameContent, type: 'figure' | 'backdrop' | 'scene', id: string): string | undefined
/** The ids of the photos this game's scenes use, sorted, each once: what a caller must be ready to hand the painter. */
export function photosUsed(content: GameContent): string[]
// scene-from-level.ts
/** The scene an old level's ground is, and the level pointing at it. Throws if the level already has a scene. */
export function sceneFromLevel(content: GameContent, levelId: string, sceneId: string): { scene: SceneFile; level: Level }
```

`sheet.ts` exports `atlasText(sheet: Sheet, image: string): string`, the text `art.ts` writes today
(`JSON.stringify(atlasOf(…), null, 2)` and a newline), and `art.ts`'s `pair` uses it, so the editors write the atlas
with the same bytes (M5).

A scene's two files come where the project lists the scene, the picture before its atlas; a problem's `from` is `scene
file`. `artProblems` also says, for each listed `photo` file, `photoPictureProblem`'s sentence at the photo's file.
With no `photos` given and a scene that needs one, `artFiles` throws `MissingPhotoError`.

`sceneFromLevel`: `size` from the rows; `tile` 16; `seed` 0; `sky` and `backdrop` as the level has them; `ground.color`
the level's `ground`. A level with no tileset: one paint `ground` (the level's `ground` color or `#3b4a5a`), one
`flat` material `ground`, one letter `#` `solid`, the rows as they are, and `oneBoxPerRow: true`. A level with a
tileset: one `tiles` material a tile kind (its id), one letter each (`solid` when the kind is solid, else `back`),
one paint `ground` (a scene needs one), and no `oneBoxPerRow`. The level keeps `id`, `view`, `things`, `starts` and
`joints`, gains `scene` and loses `tiles`, `tileset`, `backdrop`, `sky` and `ground`. Both results pass their schemas.

- [ ] **Step 1: Failing tests.** `art.test.ts`: the fixture's files now include `content/scenes/meadow.png` and
      `.atlas.json`, and the atlas names `ground/0` at 0, 0, 384, 192; a changed paint makes the picture "older than
      its scene file"; `photosUsed` of the fixture is `['brick', 'dirt', 'stone']` plus `moss` once the fixture uses
      it; a `photo` file whose picture is missing has its sentence. The parity test: the xxhash64 of each file
      `artFiles` gives for the fixture equals `tests/golden/scene-art.json` in four engines.
      `scene-from-level.test.ts`: `tests/fixtures/full-game`'s level (a tileset) and `tests/fixtures/game`'s (`#`
      and `.`) each give a scene and a level that `writeContent` accepts; the `#` level's scene has `oneBoxPerRow`;
      a non-solid tile becomes `back`; a level that already has a scene throws `Level "level-1" already has a scene,
      "meadow".`
- [ ] **Steps 2 to 4,** recording `scene-art.json` from the Node job's log. If engines disagree, stop: find the
      painter-math slip; never record per engine.
- [ ] **Step 5:** Commit `feat(content): scenes are painted with a game's art, and made from old levels`. Open Part
      A's pull request as a draft when its checks are green; report Tasks 1 to 8 and message the merge session.

---

## Part B: the sim (pull request 2)

### Task 9: The ground's colliders, as plain data

**Files:**
- Create: `src/features/level/ground.ts`
- Modify: `src/features/level/level.ts`
- Test: `tests/features/level/ground.test.ts`

**Interfaces:**
- Consumes: `slopeRuns`, `shapesOf`, `tileRuns`, `tileBoxes`, `LEDGE_DEEP`.
- Produces:

```ts
/** One fixed collider of a scene's ground, in tiles: a box by its top left corner, or a slope by its box's. */
export type GroundCollider =
  | { readonly kind: 'box'; readonly col: number; readonly row: number; readonly w: number; readonly h: number }
  | { readonly kind: 'ledge'; readonly col: number; readonly row: number; readonly w: number }
  | { readonly kind: 'slope'; readonly col: number; readonly row: number; readonly w: number; readonly h: number
      /** 1: rises to the right. -1: rises to the left. */ readonly rises: 1 | -1 }
/** A scene's colliders in spawn order: boxes (as `tileBoxes` or, with `oneBoxPerRow`, one a row), then slopes by `slopeRuns`' order, then ledges, rows top to bottom. */
export function groundColliders(ground: SceneGround): GroundCollider[]
```

Boxes come from the `solid` letters only, **less every tile under a slope run's line inside its triangle** (those are
inside the slope's collider; a box corner on the line is what a foot catches on). A slope's `col`, `row`, `w`, `h` are
its triangle's bounding box (`h` is `|rise|`). The one box a slope tile gives (I5): a `half-up-high` or
`half-down-high` tile that is a run of one gives its slope (`h: 0.5`, starting half a tile down) and a box `h: 0.5`
for its lower half, both in the slopes' place in the order; in a longer half run the run's triangle holds that half. A run of `ledge` tiles in one row is one ledge. `back` gives nothing.

- [ ] **Step 1: Failing tests:** a `#` scene with `oneBoxPerRow` gives exactly `tileRuns`' boxes in order, and
      without it `tileBoxes`'; a 3-tile `slope-up` on a floor gives one slope `{ w: 3, h: 3, rises: 1 }` and the three
      tiles under its line are in no box; a 4-tile half-down gives `{ w: 4, h: 2, rises: -1 }`; a lone
      `half-up-high` gives one slope of `w: 1, h: 0.5` whose box starts half a tile down, and one box for its lower
      half; three ledges in a row are one; the order is boxes, slopes, ledges.
- [ ] **Steps 2 to 4.** **Step 5:** Commit `feat(level): a scene's ground as colliders`. Report `Task 9`.

### Task 10: Slopes and ledges in physics

**Files:**
- Modify: `src/features/physics/kinds.ts`, `spawn.ts`, `checks.ts`, `rapier.ts`, `physics-world.ts` (only if the
  adapter's interface needs a new member), `physics.ts`
- Test: `tests/features/physics/slope.parity.test.ts`, `ledge.parity.test.ts`, `checks.test.ts`

**Interfaces:**
- Produces:

```ts
// kinds.ts: three more codes. These are ours, not Rapier's: the adapter maps them.
export const ShapeKind = { ball: 0, cuboid: 1, capsule: 2, slopeUp: 16, slopeDown: 17, ledge: 18 }
// spawn.ts
collider.slope(hx: number, hy: number, rises: 1 | -1, opts?: ColliderOptions): SpawnPart   // a right triangle filling half its box
collider.ledge(hx: number, hy: number, opts?: ColliderOptions): SpawnPart                  // a box that only holds what comes from above
```

No component gains a field and the plugin's config does not change, so no schema hash moves. In `rapier.ts`:

- A slope is `RAPIER.ColliderDesc.convexHull` of its three corners about the box's centre (`slopeUp`: bottom left,
  bottom right, top right). `colliderMatches` tells one by `shapeType()` being Rapier's convex polygon and its
  `vertices()` giving the same box and the same missing corner.
- A ledge is a cuboid with `setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS)`. `step` passes one hooks object
  to `world.step(queue, hooks)`. Its `filterContactPair(c1, c2, b1, b2)` finds which collider is the ledge by reading
  `world.getCollider(handle).activeHooks()` (I4: the flag is in the world and its snapshot, so the adapter keeps no set
  of handles, which after a restore could name another world's colliders), takes the ledge's top from that collider's
  own `translation().y - halfExtents().y`, and answers `RAPIER.SolverFlags.COMPUTE_IMPULSE` only when the other collider's body is
  not moving up (`linvel().y >= 0`) and its lowest point is at or above the ledge's top plus `LEDGE_SLOP = 0.05`
  (the other's `translation().y` plus its half height: `halfExtents().y` for a cuboid, `halfHeight() + radius()` for a
  capsule, `radius()` for a ball); otherwise `RAPIER.SolverFlags.EMPTY`. `filterIntersectionPair` answers true.
  `colliderMatches` tells a ledge by `activeHooks()`.
- The names are checked (the plan audit read 0.21.0's declarations): `ActiveHooks.FILTER_CONTACT_PAIRS = 1`,
  `SolverFlags.COMPUTE_IMPULSE = 1`, `SolverFlags.EMPTY = 0`, `ColliderDesc.convexHull(points: Float32Array):
  ColliderDesc | null`, `World.step(eventQueue?, hooks?)`, `Collider.activeHooks()`, `Collider.vertices()`,
  `ShapeType.ConvexPolygon = 9`. A `null` hull throws an error naming the slope's size, never a silent box; `vertices()`
  is compared as a set of three corners (a hull may start at any of them).
- `colliderMatches`'s first line (`shapeType() !== c.shape`) maps our codes first (16 and 17 to 9, 18 to 1), or every
  slope and ledge is rebuilt every tick; `kinds.ts`'s comment ("They equal Rapier's own ShapeType values") says which
  codes are ours.
- The ledge rule reads an upright half height, so a turned crate is judged by its upright box; slice 1 accepts that
  (the hero has fixed rotation), says so in a comment, and the crate cases below set `fixedRotation` (M6).

- [ ] **Step 1: Failing tests** (each a small sim built with `createSim`, run in four engines, with its final hash
      equal across engines and its positions asserted): a ball dropped on a slope rolls down it and ends lower and to
      the low side; a box with `fixedRotation` set down on a 3-tile slope's line rests on the line (its lowest corner
      within 0.02 of it) for 120 ticks; a box sliding along a floor onto a 6-tile slope whose line passes six tile
      corners never has its sideways speed drop to 0 before the top; a box thrown up from under a ledge passes it
      and comes to rest on its top; a box falling from above rests on it; a box resting on a ledge is still there
      after `snapshot` and `restore` into a new sim, 120 ticks on, with the two sims' hashes equal; `checkCollider`
      accepts the three codes and refuses 3 with today's sentence. Every existing parity golden is unchanged.
- [ ] **Steps 2 to 4.** **Step 5:** Commit `feat(physics): slopes, and ledges that pass from below`. Report `Task 10`.

### Task 11: A level's sim reads its scene

**Files:**
- Modify: `src/features/level/spawn-level.ts`, `sim-content.ts`, `uses.ts`, `tile-runs.ts`, `colours.ts`, `level.ts`;
  `src/features/game/game.ts`, `online.ts`, `watch.ts` and `src/features/content/cutscene.ts` where they read a
  level's size or colors (`git grep -n "levelSize(\|skyOf(\|groundOf(\|\.tiles\b" src`)
- Test: `tests/features/level/spawn-level.test.ts`, `sim-content.test.ts`, `scene.parity.test.ts`,
  `tests/golden/scene.json`

**Interfaces:**
- Consumes: `groundColliders`, `collider.slope`, `collider.ledge`, `sceneFromLevel`.
- Produces:

```ts
// tile-runs.ts
/** A level's width and height in tiles: its scene's size, or its own rows'. 0 by 0 for a scene the game lacks. */
export function worldSize(content: GameContent, level: Level): { readonly w: number; readonly h: number }
// colours.ts: each gains the content, to look in the level's scene
export function skyOf(content: GameContent, level: Level): number
export function groundOf(content: GameContent, level: Level): number
// uses.ts
/** Whether any scene has a slope tile. Task 12 switches `Ground` on by it. */
export function usesSlopes(content: GameContent): boolean
```

`spawnLevel` for a level with a scene: one fixed entity a collider in `groundColliders`' order (a box and a ledge
with `Look` in `groundOf`'s color, a ledge `LEDGE_DEEP` tall at its tile's top, a slope with no `Look`), then things,
the anchor, joints and heroes as today. A scene the content lacks is a `LevelError`: `Level "level-1" uses the scene
"meadow", and this game has no such scene.`

`simContent`: `photo` joins `LEFT_OUT` (with `content.photos`). A scene stays, cut down to what the sim reads:
`{ format, id, size, ground: { color, oneBoxPerRow, letters: [{ letter, shape }], rows } }` (absent keys stay absent),
through one `simScene` function in `sim-content.ts`, and the scene's entry stays in the project's list. So a paint, a
material, the seed, `tile`, `sky` or `backdrop` changed moves no hash; a row or a shape changed does. A game with no
scene and no photo still gets the very same object back.

- [ ] **Step 1: Failing tests.** `spawn-level.test.ts`: the fixture's level spawns `groundColliders`' count of fixed
      entities before its first thing; a slope entity has no `Look`. `sim-content.test.ts`: changing a paint, a
      material's `wear` and the scene's `seed` leaves `contentHash` the same; changing a row moves it; a game with no
      scene gets the same object. `scene.parity.test.ts`: **(a)** for `tests/fixtures/game` (a `#` level) and
      `tests/fixtures/full-game` (a tileset), the recorded play in `tests/golden/push-crate.json` (and the one each
      fixture's own parity test uses) run on the content after `sceneFromLevel` ends on the **same `finalHash`** as on
      the content before, in four engines; and the same for `tests/fixtures/examples-level-1.json`, a byte copy of
      AutomataFrameworkExamples' `content/levels/level-1.json` (`#` rows, its own `sky` and `ground`), played with
      `tests/fixtures/game`'s characters by a fixed command list (I6: the spec's "a copy of the Examples goldens"; their
      recorded plays need that repo's hero plugin, so plan D replays them there); **(b)** the fixture `scene-game`, played by a fixed list of commands for
      600 ticks, ends on `tests/golden/scene.json`'s hash in four engines. Every existing golden is unchanged.
- [ ] **Steps 2 to 4,** recording `scene.json` from CI. If (a) differs, the entity order or a `Look` color differs:
      print both sims' first differing entity with `--state` and fix the spawn order; never touch the golden.
- [ ] **Step 5:** Commit `feat(level): a level's ground comes from its scene`. Report `Task 11`.

### Task 12: The built-in hero on a slope (after plan H is merged)

**Files:**
- Modify: `src/features/physics/touching.ts`, `components.ts`, `physics.ts`, `physics-world.ts`, `rapier.ts`;
  `src/features/level/move-step.ts`, `moves.ts`, `game-sim.ts`
- Test: `tests/features/physics/touching.test.ts`, `tests/features/level/move-step.test.ts`,
  `slopes.parity.test.ts`, `tests/golden/slopes.json`

**Interfaces:**
- Produces:

```ts
// touching.ts: `Felt` gains the ground's normal (0, -1 on flat ground or in the air)
export interface Felt { readonly below: boolean; readonly left: boolean; readonly right: boolean; readonly gx: number; readonly gy: number }
// components.ts: only in a sim made with physics({ touching: true, slopes: true })
export const Ground: ComponentDef<{ nx: 'f32'; ny: 'f32' }>   // 'physics.ground', not drawn
// move-step.ts: `MoveInput` gains an optional slope
readonly slope?: { readonly nx: number; readonly ny: number } | undefined
```

- **`felt`:** a contact steep enough to be ground (`ny <= -STEEP`) is never a wall, so a 45-degree slope is stood on
  and not leaned on. `gx`, `gy` are the normal of the ground contact with the smallest `ny` (the most upright).
- **`createGameSim`:** `physics({ …, slopes: usesSlopes(content) && usesMoves(content) })`. The hero gets `Ground`
  beside `Touching` only then. No other game's schema changes.
- **`stepMoves` with `slope` given, on the ground, not dashing and not on the tick it jumps:** the walk's speed runs
  along the slope: with the tangent `tx = -ny`, `ty = nx` (pointing right), `vx = run * tx`, `vy = run * ty`; and
  with `dir` 0 and `run` 0 the speed written is the one that one tick of gravity along the slope brings to nothing
  (`moves.ts` hands in gravity's size times the tick, as it hands `hover`), so a hero left alone does not creep. With
  no `slope` given, or a flat one (`nx` 0), every line of `stepMoves` gives what it gives today: `moves.json` keeps
  its hash.

- [ ] **Step 1: Failing tests.** `touching.test.ts`: a contact with normal (0.7071, -0.7071) is `below` and not
      `left`; `gx`, `gy` are it. `move-step.test.ts`: every existing case passes untouched; walking right at
      `walkSpeed` on an up-slope's normal gives `vx = vy`'s size with `vy < 0`; standing gives the holding speed.
      `slopes.parity.test.ts` (the fixture `scene-game` with `moves` on its hero, four engines, hash in
      `tests/golden/slopes.json`): the hero left alone on the 3-tile slope for 600 ticks moves less than 0.02 tiles;
      holding right from the floor it reaches the slope's top in under 90 ticks and `Touching.below` is true on every
      tick of the climb; holding left from the top it walks down with `below` true on all but at most 2 ticks; it
      jumps up through the ledge and lands on it; a jump from the slope goes up. `tests/golden/moves.json` and
      `schema-hash.json` are unchanged.
- [ ] **Steps 2 to 4.** **Step 5:** Commit `feat(level): the built-in hero walks slopes`. Open Part B's pull request
      when green; report Tasks 9 to 12.

---

## Part C: the renderer (pull request 3)

### Task 13: A level with a scene, drawn

**Files:**
- Create: `src/features/render/ground.ts`
- Modify: `src/features/render/art.ts`, `tiles.ts`, `stage.ts`, `still.ts`, `render.ts`
- Test: `tests/features/render/ground.test.ts`, `tiles.test.ts`, `scene.browser.test.ts`, `still.test.ts`

**Interfaces:**
- Produces:

```ts
// tiles.ts: the rows and the kinds, so a scene's `tiles` materials use it too. `tilePictures(level, tileset)` stays, calling it.
export function placedTiles(rows: readonly string[], kindOf: (letter: string) => TileKind | undefined): PlacedTile[]
// ground.ts (no Pixi): where each ground page goes in the level, in tiles
export interface GroundPage { readonly frame: string; readonly col: number; readonly w: number; readonly h: number }
export function groundPages(scene: SceneFile): GroundPage[]
// art.ts: on `Art`
/** A scene's ground: its pages as textures, back of the tiles. Empty for a level with no scene. */
readonly groundPages: readonly { readonly col: number; readonly w: number; readonly h: number; readonly texture: Texture }[]
```

`loadArt` for a level with a scene: reads `paintedPath(content, 'scene', id)`, checks its size against `sceneSheet`
(`…but its scene file makes it…`), cuts each page; cuts each `tiles` material's squares from its tileset's picture by
`placedTiles` (a neighbour is `same` when it has the same letter, as today); loads the scene's `backdrop` as it loads
a level's; `ground` is `groundColliders`' boxes and ledges as `TileBox`es, so the stage does not draw them. A scene
with no `photo` or `flat` ground still has its (clear) picture. `needsPictures` is true for a level with a scene.
The stage adds each page as a sprite at (`col`, 0), `w` by `h` tiles, under the tile layer; `createStage`,
`levelViews` and `createLevelPicture` take the world's size and sky from `worldSize` and `skyOf(content, level)`.
`LevelPicture` gains `showScene(content: GameContent, art: Art): void` (I7): the same level, its scene's ground
changed (same scene id and size), drawn from the new content and art; the old `Art` is destroyed; a size change still
needs a new picture. The builder repaints through it at most once a frame.
`levelViews` for a level with a scene gives the boxes and ledges `spawnLevel` makes, with sids in spawn order (a
slope takes a sid and gives no view), so a view's sid is still the entity's.

- [ ] **Step 1: Failing tests.** `ground.test.ts`: the pages of a 200-wide scene at 16 are at columns 0 and 128.
      `tiles.test.ts`: `placedTiles` equals `tilePictures` on the old fixture. `still.test.ts`: `levelViews` of the
      fixture has a view a box and a ledge and none for a slope, and the first thing's sid is `groundColliders`'
      count plus 1. `scene.browser.test.ts` (three engines; the fixture's pictures served from
      `artFiles(content, photos)` in memory, never from committed PNGs): the canvas pixel at the middle of a solid
      `earth` tile is one of the ladder's three colors, at the top of the floor it is `turf`'s, at a `back` tile the
      ladder's darker step, over the upper half of a `slope-up` tile it is the sky's, at the tileset's `stone` tile it
      is not clear; no dark box edge is drawn over the ground; a picture one pixel too narrow stops with the
      `ArtError` sentence; the picture is the same before and after a resize; two `showScene` calls with different
      rows change the canvas pixel at the changed tile and destroy the first `Art` (I7).
- [ ] **Steps 2 to 4.** **Step 5:** Commit `feat(render): a scene's ground, drawn`. Open Part C's pull request when
      green; report `Task 13`.

---

## Part D: the commands, the skill and the proof (pull request 4)

### Task 14: `automata scene from-level`, and art and check with photos

**Files:**
- Create: `src/features/cli/scene.ts`, `src/features/cli/photos.ts` (`listContent` is plan R's Part 0, call 14)
- Modify: `src/features/cli/args.ts`, `cli.ts`, `help.ts`, `art.ts`, `game-folder.ts` (only if the game's own
  `artFiles` needs the photos passed through), `mcp-tools.ts`, `mcp-library.ts`; `src/features/content/content.ts`
- Test: `tests/features/cli/scene.test.ts`, `photos.test.ts`,
  `art.test.ts`, `args.test.ts`, `mcp-tools.test.ts`, `tests/docs/readme.test.ts`

**Interfaces:**
- Produces:

```ts
// consumed, plan R's Part 0 (project-write.ts): listContent(text, entry, about?): Parsed<string>
// cli/photos.ts
/** The photos a game's scenes use, read and decoded: the game's own from its folder, the library's from the package's `photos/`. */
export function readPhotos(game: GameFolder): Effect.Effect<Photos, CliError, FilesService>
// cli/scene.ts
export interface SceneReport { readonly ok: boolean; readonly wrote: readonly string[]; readonly sentence?: string }
export function runSceneFromLevel(options: { folder: string; level: string; as?: string }): Effect.Effect<SceneReport, CliError, Ports>
```

The command: `automata scene from-level <level> [folder] [--as <scene id>] [--json]`. `args.ts` gains the command
`scene`, whose first word is its action (`from-level`; slices 2 and 5 add `another`, `furnish`, `new`) and whose
second is the level; anything else is `automata scene needs an action, like: automata scene from-level level-1`. The
scene's id is `--as`, or the level's id with `level` swapped for `scene` (`level-1` gives `scene-1`), or the id plus
`-scene`. It writes `content/scenes/<id>.json` beside where the project keeps scenes (or `content/scenes/`), rewrites
the level's file, adds the `[[content]]` block with `listContent`, then paints (`paintArt`). It refuses, writing
nothing, when the game does not load, the level is not there, the level already has a scene, or the scene's file
exists (`There is already a file at content/scenes/scene-1.json. Pick another name with --as.`). It prints each file
written and then `Level "level-1" now takes its ground from the scene "scene-1". It plays as it did.`

`automata art` and `check`'s `art` step hand `readPhotos` to the painter; a library photo that will not decode is an
error in the package, said as `Something went wrong inside automata` says today. `ART_HELP`, `ROOT_HELP` and
`CHECK_HELP` say "figure, backdrop and scene files". The MCP server gains one tool, `scene_from_level` (`level`, `as`),
thin over `runSceneFromLevel`; its count in the tests and the docs goes up by one.

- [ ] **Step 1: Failing tests.** (`listContent`'s own cases are plan R's.) `scene.test.ts` (the memory ports): from the `game` fixture the three files are written and
      `loadGame` of the result is fine; each refusal's sentence, with nothing written; `--json` prints the report.
      `photos.test.ts`: the game's own `moss` wins over a library photo of the same id; a photo no scene uses is not
      read. `art.test.ts`: `automata art` on `scene-game` paints `content/scenes/meadow.png`. `args.test.ts`: the
      three ways to mistype. `readme.test.ts`: the README names `automata scene from-level`.
- [ ] **Steps 2 to 4.** **Step 5:** Commit `feat(cli): automata scene from-level`. Report `Task 14`.

### Task 15: The skill, the README and the API report

**Files:**
- Create: `skills/automata-content/scenes.md`
- Modify: `skills/automata-content/SKILL.md` (one line that points at it), `README.md` (a "Scenes" section: what a
  scene is, the smallest scene file, the nine shapes as a table, the three kinds of material, the photo library,
  `from-level`), `docs/api/framework.api.md` (from the `package` job's log), `CHANGELOG.md` and a changeset if the
  repo's rule asks for one, `CLAUDE.md` ("Structure": `photos/`)
- Test: `tests/skills/` (the existing test that every skill page's examples load), `tests/docs/readme.test.ts`,
  `tests/public-surface.test.ts`

The scenes page is written for an agent that will draft a scene for a person to finish in the builder: the format
with every key, each shape drawn as a three-row example, each material kind with a whole example, every knob's table,
the 38 photo ids with what each is, the rule that a slope stands on ground, how big a scene can be, and the commands.
Every example in it is a whole file the test loads.

- [ ] **Step 1: Failing tests:** each JSON block in `scenes.md` reads as its kind; the headless entry exports
      `SceneSchema`, `PhotoSchema`, `paintScene`, `sceneSheet`, `materialTile`, `sceneFromLevel`, `listContent`,
      `groundColliders`, `slopeRuns`, `covers`, `surfaceAt`, `GROUND_SHAPES`, `PHOTO_LIBRARY`, `photosUsed`,
      `worldSize`, `decodePng`, `sceneSheet`, `atlasText`; the browser entry `groundPages` and `placedTiles`. The
      scenes page and the README say "scene file" where a reader could take the browser entry's `Scene` (the drawn
      scene graph) for it (M4).
- [ ] **Steps 2 to 4.** **Step 5:** Commit `docs: scenes for agents and people`. Report `Task 15`.

### Task 16: End to end

**Files:**
- Test: `tests/install/scene-smoke.mjs` (and its step in the `package` job's install smoke, which already runs the
  packed package in an empty folder: add the call there; that one workflow line is the only workflow change, and it
  is named here), `tests/features/content/agent-journey.test.ts`, `tests/features/game/scene.browser.test.ts`

Three journeys, each a path a real person or agent takes:

1. **An agent moves a game onto a scene, with the packed package** (`scene-smoke.mjs`, Node only): `automata create
   g`, `automata scene from-level level-1 g`, `automata check g --only files`, `--only art`, `automata replay g`:
   every command exits 0 and the replay says the level ends where it did (the content changed, the final hash did
   not).
2. **An agent writes a scene by hand** (`agent-journey.test.ts`): from the skill page's smallest scene, add a slope
   with air under it and read the sentence; fix it; `artProblems` says the picture is not painted; write
   `artFiles`' bytes; no problems.
3. **A player plays it** (`scene.browser.test.ts`, three engines): `startGame` on `scene-game` with the built-in hero
   (after Task 12; until then with the fixture's own plugin), pictures from memory: the ground is drawn, holding
   right walks the hero up the slope (its view's `y` falls), a jump under the ledge ends on it, and a picture is
   taken at phone upright, phone sideways, iPad upright, iPad sideways and desktop for `ci-screens`.

- [ ] **Step 1:** Write the three, push, red where code is missing (none should be: these prove Tasks 1 to 15).
- [ ] **Step 2:** Fix what they find, in the task's own file, with a test there.
- [ ] **Step 3:** The last run: every check green, no golden but this plan's four new ones changed
      (`git diff --stat origin/main -- tests/golden template/replays`). Tracker to 100% of stage 4. Commit `test:
      scenes end to end`. Open Part D's pull request; report Tasks 14 to 16, then the summary: each task's commit, the
      test count, every deviation and its reason.

---

## Handoffs

- **The Editors' slice 1 plan** (`2026-11-15-scenes-1-ground-and-materials.md` there) pins the commit that merges Part
  D. It uses, from the headless entry: `SceneSchema`, `writeContent('scene' | 'level' | 'photo', …)`, `artFiles(content,
  photos)`, `photosUsed`, `PHOTO_LIBRARY`, `decodePng`, `materialTile` (a material's swatch), `sceneFromLevel`,
  `listContent`, `covers`, `slopeRuns`, `gapsUnder`, `worldSize`, `sceneSheet`, `atlasText`; and from the browser
  entry `createLevelPicture` (which now draws a level with a scene) and `LevelPicture.showScene`. It serves the library photos from the package's `photos/` folder.
- **Examples' plan D, Part 9** (the demo's real art): its `level-1` is `#` and `.` with its own `sky` and `ground`
  colors, so `automata scene from-level level-1` moves it with `oneBoxPerRow` and both of that repo's goldens keep
  their final hashes; plan D's own test proves it there. The agent then drafts the three scenes as files by the skill
  page, and the Owner finishes them in the builder.
- **Plan F (the feel runtime) and plan T (story)** read `Touching.below`; nothing here changes it for a game without
  slopes.

## Later slices (outlines; each gets its own plan, audit and build, framework first)

Each adds optional keys to the scene file (left out means none), a painter that gives the same bytes in every engine
with goldens in four engines, its commands and MCP tools thin over exported functions, a section of the scenes skill
page, and the three journeys of Task 16 for its own part. None moves an existing golden.

2. **Props.** `props` in the scene: `{ id, kind, x, up, flip?, front?, seed?, …the kind's numbers }` or `{ id, figure,
   pose? }`. The kinds are world-kit's generators (`src/features/props/*.ts`, `library/props.json`) read for their
   rules and redrawn side-on in the scene's paints: trees, rocks, plants, fences, houses, lamps (drawn; their light is
   slice 4), furniture. `paintProp(kind, numbers, seed, paints)`, a registry `PROP_KINDS` with each number's limits
   and plain name, the picture `<id>.props.png` with a frame a prop, drawn by the renderer in front of or behind the
   ground. `automata scene another <scene> <prop>` (the next seed). Every kind from two seeds as goldens.
3. **Layers.** `layers` in the scene, back to front, each behind or in front of the ground, with `drift`; today's
   four kinds from `paint-backdrop.ts` and more (tree lines, roofs, far towns, water); `<id>.layers.png`. The
   renderer draws layers in front last. `backdrop` in a scene becomes layers (call 9) and `from-level` writes them;
   the `backdrop` kind still reads until Release 1.
4. **Light, sky and weather.** `light` (`time`: dawn, day, dusk, night, or a number between; world-kit's
   `times.json` for the colors) and `weather` (rain, snow, leaves, stars, glow, each with "how much"). Presentation
   only: a Pixi layer over the pictures, lamps as soft circles, motion from a stream seeded by the scene and the sim's
   tick, still under reduced motion. Proof: on and off give the same hash; the same tick gives the same picture.
5. **Furnish and whole scenes.** The kits (world-kit `library/kits.json`, `src/features/furnish/`) as eight words;
   `furnish(scene, { from, to, word, seed })` writes ordinary props named `forest:3` and keeps the stretch's word and
   seed; `newScene(name, number)` writes a whole file. `automata scene furnish`, `automata scene new`.
6. **Signs, wear and the reads check.** A sign prop whose words are a message key, painted per language (the plan
   settles Chinese, Japanese and Korean glyphs); grime, puddles and litter as kit props and a material's `wear`
   shown in the builder; `automata check`'s `reads` step paints each level's scene with its characters and fails a
   character that does not stand out (edge read 1.1 and the hot rule, world-kit `src/features/reads/`).

## Self-review

- **Spec coverage, slice 1's framework part:** the `scene` file (Task 3); the level's `scene` (5); `from-level` (8,
  14) and the same-hash proof (11, 16); slopes and ledges in the sim, switched on by content (9 to 12); photo
  materials and the photo library with records (2, 4, 6); the painter's edges, the same bytes in every engine (7, 8);
  the renderer (13); `automata art` and `check` (14); the skill (15). The spec's `layers`, `props`, `light`,
  `weather`, the other commands and the reads check are slices 2 to 6, outlined above. The backdrop is bridged (call
  9), not folded, until slice 3.
- **Types:** `Photos`, `PhotoPixels`, `SceneFile`, `GroundShape`, `SlopeRun`, `GroundCollider`, `MaterialTile` and
  `worldSize` are each defined once and used by the same name in later tasks.
- **Review Focus:** each of the five has its test in the task named.
- **Open to the audit:** call 5 (a slope must stand on solid ground) is a rule a person meets; call 9 (the bridge)
  and call 8 (`oneBoxPerRow`) are formats' warts taken on for the same-hash goal; Task 10 leans on four Rapier names
  that could not be checked from this session (no install, no network to the package). The plan audit checked them
  all (see Task 10).
