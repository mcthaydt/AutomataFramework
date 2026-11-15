# Rigged figures: people, animals and free shapes, painted as pixel art

Stage 1 (spec) of Cycle 7 in AutomataFramework. Written 2026-11-15 with the Owner through the coordinator. It widens
the `figure` content format that M2 plan A made, so the editors' figure builder can be as powerful as the old 3D figure
builder. Its partner is the builder's own spec in AutomataFrameworkEditors,
[`2026-11-15-2d-figure-builder-design.md`](https://github.com/mcthaydt/AutomataFrameworkEditors/blob/main/docs/superpowers/specs/2026-11-15-2d-figure-builder-design.md),
which says what a person sees and does; this page says what the file holds and how the framework paints it.

## Principles served

- **5. Characters and scenes come from the environment builder and figure builder.** The Owner (2026-11-15): "the real
  art comes from the builders", and the 2D figure builder "should be as complex as the 3D counterpart". The builder
  can only be as powerful as the file it writes, so the file grows first.
- **1. Agent-first.** Everything the builder can do is a field in a documented JSON file, with a range and a sentence,
  so an agent makes the same character by writing the same numbers, and `automata art` paints the same bytes.
- **3. Layers in order.** This is 2D: a flat skeleton seen from the side, the front and the back, painted into pixels.
  It has no meshes, no 3D maths and no camera; the 3D layer's figures stay a later, separate thing.
- **7. Port in layer order.** The old builder (AutomataFrameworkFailed at `ed8592e8`: `packages/3d/src/features/figures`,
  `extensions/figures`, `packages/editor-3d/src/features/studio`) is the reference for what a figure can be: its
  sliders, outfits, hair, face, items, walks, stands and painting rules. Its numbers and names are reviewed and brought
  over where they fit a flat figure; its code is not.

It breaks none. It adds no dependency.

## Why

M2 plan A gave the framework a small figure: blocks and rounds in named colours, moved by poses. It paints the
template's hero and crate, and it is the only art format a game has. The Owner settled then that the old 13,847-line
painter would not be ported. On 2026-11-15 the Owner set the bar for the builders: the 2D figure builder must be as
powerful as the old 3D one. The old builder made a whole person from sliders, dressed them from a library, walked them
with a gait and posed them by their hands and feet. A figure file of blocks cannot hold that, so the format grows. The
answer to "port the old painter?" is still no (the Owner chose a 2D-native figure, Q2 below); the answer to "as much
as it could do?" is now yes.

## Decided with the Owner (2026-11-15)

| | Question | The Owner's answer |
|---|---|---|
| — | Where does the art come from? | **From the builders.** The demo game's characters are made with the figure builder. |
| — | How powerful is the 2D figure builder? | **As powerful as the old 3D one.** Format changes are expected and live in this spec. |
| Q1 | Do clips belong to the figure builder? | **No.** Clips stay in the character file and get their own part of the Characters editor. |
| Q2 | How is the 2D figure built? | **A 2D-native rigged figure**, with the same features as the old builder, not a port of its painter. |
| Q3 | Which views? | **Side, front and back.** The side view is mirrored to face left. |
| Q4 | Which bodies? | **People, four-legged animals and free shapes.** |
| Q5 | Can the editors make a new figure? | **Yes**, so the framework needs a way to list a new content file in `automata.toml` (below). |

Also decided (2026-11-15): the hero's move switches (double jump, wall jump, dash) are a character's parts, so they
are changed in the Characters editor, not in Feel. That changes no format here; it is noted for the editors.

## Goals

1. **One `figure` file makes a whole character**: a person or a four-legged animal from sliders, dressed, with hair, a
   face and held things; or a free figure of shapes, as today.
2. **It is painted as pixel art** by the framework, in a side, a front and a back view, with shading, an outline and
   colours for players 2 to 4, into the same picture and atlas beside the file.
3. **It moves**: a walk (and for animals a trot) and an idle made from the figure's gait numbers and its stand, and
   poses made by placing its hands, feet and head, each painted as a pose a clip can play.
4. **Every number has a range and a sentence**, read by the editors' sliders and an agent alike.
5. **The same bytes in Node, Chromium, WebKit and Firefox**, and no recorded hash moves for a game whose figures stay
   as they are.

## Non-goals

- **3D**, meshes, or more than three views. Eight directions are the 3D layer's.
- **Lighting by the world** (the old normal maps lit by lamps and a time of day). The framework's 2D renderer has no
  lamps; a figure paints its own light into its pixels. Lamps would be a renderer spec of their own.
- **Cloth and hair that sway in play** (the old hair springs and hems). The painted poses can show hair and capes
  in motion; nothing moves between pictures. A later spec may add it.
- **Clips, behaviour, moves and tuning.** They stay in the character, behaviour and tuning files.
- **A pixel pencil.** Nothing in the file is a painted pixel; everything is made from numbers an agent can read.

## Anti-goals

- A field whose meaning only the editor knows.
- A figure that paints differently in one engine.
- A change that moves the template's or the demo's recorded hashes without the figure files changing.
- A library so big that an agent cannot read what is in it, or so small the demo's three characters cannot be made.

## Approaches considered

1. **A flat skeleton, shaped by sliders, dressed from a library, painted per view** (chosen, Q2). Each body plan
   (person, animal) has a fixed set of bones. Sliders give their lengths and widths. Each bone bends two ways, so one
   pose serves all three views. Pieces (clothes, hair, face marks, held things) are shapes laid on bones. The painter
   fills each view's shapes and shades them. Same features as the old builder; all 2D maths.
2. **Port the old painter** (a 3D rig painted to pixels). Most power at once, but about 13,000 lines with its kit,
   3D maths in the 2D layer, and eight directions a platformer does not need. The Owner chose 1.
3. **Grow the free figure** (more shapes, bones on blocks). Smallest, but a person would still be built part by part,
   with no sliders, no library and no walk: not the old builder's power. Kept only as the free body plan.

## The file

A figure file gains a `body` and keeps `format` at 1 for the free figure (so no file and no hash changes). A rigged
figure is `"format": 2`. Both are one content type, `figure`, read by one schema with two shapes.

```json
{
  "format": 2,
  "id": "keeper",
  "body": "person",
  "tile": 16,
  "frame": { "w": 32, "h": 40 },
  "views": ["side", "front", "back"],
  "sliders": { "height": 30, "build": 0.4, "head": 0.6, "legs": 0.45, "arms": 0.5, "shoulders": 0.4, "hips": 0.5, "fat": 0.3, "posture": 0.6, "age": 0.8 },
  "face": { "eyes": "dots", "eyeSize": 0.5, "eyeSpacing": 0.5, "brows": "soft", "mouth": "smile", "nose": 0.3 },
  "paints": { "skin": "tan", "hair": "silver", "eyes": "ink" },
  "pieces": [
    { "piece": "tunic", "paint": "moss", "trim": "gold" },
    { "piece": "trousers", "paint": "bark" },
    { "piece": "boots", "paint": "bark" },
    { "piece": "beard-long", "paint": "silver" },
    { "piece": "hood", "paint": "moss" },
    { "piece": "lantern", "hand": "left" }
  ],
  "shapes": [{ "id": "badge", "on": "chest", "shape": "round", "x": 2, "y": -1, "w": 2, "h": 2, "paint": "gold" }],
  "gait": "amble",
  "stand": "hands-behind",
  "poses": [
    { "id": "wave", "place": { "hand-right": { "x": 6, "y": -14 }, "head": { "turn": 10 } } }
  ],
  "palette": "crate-game",
  "outline": "dark",
  "variants": [{ "id": "two", "paints": { "hair": "copper" } }]
}
```

The example is to show the shape of the file; the exact field names, ranges and defaults are the plan's, held to
these rules:

### Body plans and bones

- **`person`**: hips, spine, chest, neck, head; for each side shoulder, upper arm, forearm, hand, thigh, shin, foot.
  The old builder's bones, less its fingers and toes, which a pixel figure does not have.
- **`animal`** (four legs): hips, spine, chest, neck, head, jaw, tail (three bones); for each of the four legs an upper,
  a lower and a foot; ears. Enough for a dog, a cat, a fox, a deer, a horse or the demo's critter.
- **`free`**: today's figure, unchanged: blocks and rounds in the frame, poses that move them. A free figure has no bones,
  no sliders and no pieces.
- **Two bends per joint.** Each bone turns forward and back (seen in the side view) and out and in (seen in the front
  and back views). A pose writes both, so one pose paints in every view. A side-view picture shows the forward bend;
  a front picture shows the out bend and draws a forward-bent limb shorter by the cosine of its bend. This is the one
  place the figure is more than flat, and it is a rule, not a camera.
- **Rig limits**: each joint has a range it bends in (an elbow does not bend backwards), from the old builder's
  `figure-rigs` default. A pose outside it is refused with the joint named.

### Sliders

- **People**: the old builder's body sliders that a pixel figure can show: height (in the frame's pixels), build,
  muscle, fat, shoulders, hips, legs, arms, head, neck, neck length, hands, feet, posture, hunch, age, head tilt and
  chunk (how blocky the shapes are). Each runs 0 to 1 (height in pixels, head tilt in degrees), with the old ranges'
  "a little past either end, for figures meant to look wrong".
- **Animals**: length, height at the shoulder, legs, leg thickness, neck, head, snout, ears (size and droop), tail
  (length and curl), build, fat, chunk.
- **Face**: the old builder's fourteen face sliders cut to what shows in a head of 8 to 16 pixels: eye style (from the
  library), eye size, spacing and tilt; brow style and weight; mouth style; nose; cheeks; jaw. An animal's face is its
  eyes, nose and mouth styles and the snout.
- Each slider's sentence says what it changes in plain words ("How long the legs are, from short to long").

### Colours and the palette

- **A palette file** (a new content type, `palette`) lists colour ramps: each a name and three to six colours, dark to
  light (the old builder's DUEL ramps and swatches, as the game's own). A figure names its `palette`; its `paints` are
  ramp names (`"skin": "tan"`), as a free figure's paints are colours. The painter shades with the ramp's steps, so a figure has three to six tones of each
  colour, never one flat fill. The framework ships a default palette; the demo's palette (the Owner's No. 276 for
  example games' art) is Examples' own file.
- **The outline** is `"dark"` (each colour's darkest step, as the old painter drew where parts cross), `"ink"` (one
  near-black, as now), or none.
- **Players 2 to 4** (`variants`) change named colours, as today.

### Pieces: the library

- **A piece** is a garment, hair, a face mark or a held thing: shapes laid on named bones, which follow the bones as
  they bend, with where its colour and its second colour (`trim`) go. The old builder's garment kinds come over:
  tops (with sleeves and cuffs), trousers, skirts, shoes and boots, capes, caps, hats and hoods, belts, scarves; hair
  styles (from its hair library); face marks (beards, stubble, freckles, scars, glasses); held things (from its items:
  a torch, a sword, a shield, a lantern, a staff). Animals have their own: collars, saddles, coats and markings
  (spots, stripes, a pale belly).
- **The framework ships a library** of pieces, gaits, stands and a palette under `src/features/content/library/`, the
  feature's JSON data, each with a sentence. A game may add its own pieces, gaits and stands as content files (new
  content types `piece`, `gait` and `stand`, listed in `automata.toml` like any other), and an agent may write them by
  hand. A figure names a piece by id; the game's own file wins over the library's.
- **Shapes on a bone** (`shapes`): any figure may add blocks and rounds of its own on a bone (a badge, horns, a
  backpack), for what the library does not have.
- The plan sets the library's size; the floor is enough to make the demo's hero, keeper and critter and the template's
  hero, with choice in every kind.

### Motion: gaits, stands and poses

- **A gait** (the old builder's gait numbers that show in a flat figure: cycle, stride, lift, bob, sway, lean, arm swing,
  elbow, heel, push, bounce) makes a walk of 4 to 8 pictures, painted as poses `walk-1` to `walk-n`. A gait may also
  make a run (`run-1` …). Animals' gaits make a walk and a trot. The library ships the old builder's gaits that fit
  (`brisk`, `strut`, `loose`, `bounce`, `still`) and animal ones.
- **A stand** (the old builder's stands: hand on hip, arms crossed, thumbs in pockets, hands behind) and its breath and
  shift make an idle of 1 to 8 pictures, `idle-1` to `idle-n`.
- **A pose** is written by where things are, as the old builder posed by its handles: a hand, a foot, the head or the
  hips placed at a point in the frame (and turned), and the bones between solved by the two-bone rule the old
  builder used (`two-bone-ik.ts`), inside the rig limits. A pose may also set a joint's two bends straight, for an agent
  who wants exact angles. The same sentence names a pose the solve cannot reach.
- **Poses are view-free**: `walk-3` is one pose, painted once in each view. A character's clips name poses as they do
  today, and the renderer picks the view.

### Views and facing

- `views` lists the views painted: `side` always, `front` and `back` when the game wants them (a top-down game, a
  cutscene where someone faces the camera). The side view is drawn facing right and mirrored for left, as the
  renderer's `face` already does.
- The `Sprite` component gains a view (side, front, back), set by the game, a cutscene or a behaviour; a side-scrolling
  game never sets it and draws as now.

### Painting

- **Pure and the same everywhere**: whole-number rasterising and `dmath`, no canvas, no clock, as `paint-figure.ts`
  already is. The old painter's rules come over: a pixel is painted or clear, never half; one key light from up and
  left; the shadow side a step down the ramp; where one part passes in front of another, a line in the far part's
  dark step; the outline last; the face drawn on the lit head in steps of the skin's ramp.
- **The sheet**: every pose in every view, for the figure and each variant, with the atlas naming each picture by pose,
  view and variant. A sheet too big for one picture (2048 pixels a side) is refused with the numbers, as now; the plan
  may let it spill into a second picture.
- **Free figures paint byte for byte as today.** The template's hero and crate, and every recorded hash, do not move.

## Listing a new file in `automata.toml`

The editors' builder makes new figures (Q5), and a new figure must be listed in `automata.toml` to be used. The
framework gains one function that adds a `[[content]]` entry to the project's text, keeping its comments and layout,
writing the entry exactly as `automata create` writes its own; `automata` gets the matching command so an agent and the
editors write the same bytes. It is the only TOML the editors ever write.

## Checks and words

- The schema refuses unknown keys, a slider out of range, a piece, gait, stand or palette that is not there (naming
  what is), a piece on a bone the body plan does not have, a colour name not in the palette, a pose that names a bone
  the body does not have or bends a joint past its limit, and a sheet too big.
- `artProblems` judges rigged pictures as it judges free ones.
- Every message is in the framework's plain voice; `automata check` prints them.

## Tests

- Schema tests for each rule above, with the sentence each refusal gives.
- **Painter goldens**: a person, an animal and a free figure, every pose in every view, recorded once in CI and
  compared in Node, Chromium, WebKit and Firefox (the parity suite). The free figure's golden is today's, unchanged.
- The solve: a pose's hand lands where it was put, within a pixel, or the refusal names why.
- The gait: a walk's feet touch the ground once each a cycle; the pictures are what the numbers say.
- The `automata.toml` writer: comments and order kept; the bytes equal what `automata create` writes.
- **End to end**: `automata create`, then `automata` adds a rigged figure and a character that uses it, then `automata
  art` and `automata check` pass, and the game plays it in real browsers (the `create-play` job).

## Constraints

- The existing figure file (`format: 1`) and every game using it keep working and keep their hashes.
- The library's JSON is the feature's own `library/` data, read through a strict schema.
- No 3D maths: the solve is the two-bone rule in a plane; a front view's shortening is a cosine.
- Strategy, pricing and positioning stay out of this file.

## Left to the plan

- The exact field names, ranges, defaults and the library's contents and size.
- How poses are named when a gait makes them (`walk-1` or another spelling), and how many pictures a walk or idle has.
- Whether a big sheet spills into a second picture.
- How the work is cut: likely the palette and the person's body first (sliders, bones, painting, side view), then
  pieces and the library, then motion (gaits, stands, solved poses), then the front and back views, then animals,
  then the `automata.toml` writer and command. Each plan ends with Examples able to use it.
- How Examples' demo characters are made with it: in the editors' builder once it lands, or by an agent writing the
  same files first (the Owner's "the real art comes from the builders" says the builder makes them).
