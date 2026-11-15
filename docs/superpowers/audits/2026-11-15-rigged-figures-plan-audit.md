# Plan R (rigged figures): plan audit

Stage 3 of Cycle 7 (rigged figures). Audited: [`plans/2026-11-15-rigged-figures.md`](../plans/2026-11-15-rigged-figures.md)
as written in pull request 109 (`bdb59a6`), against [`specs/2026-11-15-rigged-figures-design.md`](../specs/2026-11-15-rigged-figures-design.md)
(pull request 104), the code on `main` (`29dd191`), the open pull requests that touch the same files (64, 101, 110,
112, 113), the old builder in AutomataFrameworkFailed at `ed8592e8`, the Editors' spec and plan G (Editors pull
requests 29 and 36), the Editors' redesign plan, Examples' plan D and both trackers. Its partner is the Editors'
[`2026-11-15-2d-figure-builder-plan-audit.md`](https://github.com/mcthaydt/AutomataFrameworkEditors/blob/main/docs/superpowers/audits/2026-11-15-2d-figure-builder-plan-audit.md);
findings there are numbered G-…. Nothing was run: every fact below is read from the files, or is said to be unchecked.

**Verdict: ready for execution of Parts 0 to 3 once the fixes below are in the plan; they are, in this pull request.**
No critical finding, eleven important, eight minor. Q1 is settled (the Owner moved the games to Lospec's DUEL palette, 256 colours); Q2 is open and does not stop Parts 0 to 3.
No existing golden moves under the plan as fixed. No new dependency.

## The questions the coordinator asked

1. **Owner decisions.** As powerful as the old 3D builder: yes, and more in places (the old library at `ed8592e8` has
   five hair styles, one held item, a torch, and seven stands; the plan's has 7 hair pieces, 41 person pieces, 12
   animal pieces and the old gaits). Its stands left out two of the old ones that read from the side; added (M3). A
   2D-native rig: yes, no matrices or camera; the two-bends rule is a 3-vector from two angles, which is the spec's
   "a rule, not a camera" and solved in the chain's own plane. Side, front and back: yes (Tasks 13, 14). People,
   four-legged animals and free shapes: yes (Tasks 2 to 16; free figures untouched). The builder makes new figures:
   yes (`listContent`, `automata add`, starters), now built first (I1). Clips in their own tab and move switches in
   Characters: the plan changes no clip or move format, correctly. No Editors-side build before the mockups: that is
   plan G's gate 1, and it holds; nothing in plan R waits for it.
2. **"A behaviour file can't set which way a figure is seen."** True on `main`: the acts are `stay`, `wander`, `flee`,
   `follow` and `jump` (`content/behaviour.ts`), and facing follows speed in `level.sprites` (`level/sprite.ts`); no
   act sets facing, so none can set a view. The reading is sound and building nothing for it is right by "build
   nothing ahead of its user" (the demo is a side-view platformer). It does narrow a sentence of the spec the Owner
   read ("set by the game, a cutscene or a behaviour"), so it goes to the Owner as Q2 rather than standing as a quiet
   deviation. Task 14 is built as written either way: the answer can only add to it.
3. **"The page paints the pictures at save, and the API only checks their size."** That is plan G's ruling; it is
   audited there (G-I4) and held, with three conditions. The one plan R owes it is a way to know a picture's colour
   table without painting: `pictureColours` is added to Task 5.

## Important

**I1. Three plans each make their own `automata.toml` writer, and the editors need it first.** Task 17 creates
`content/project-write.ts` with `listContent(text, entry, about?): Parsed<string>`. The scenes plan's slice 1
(pull request 113, its Task 14) creates the same file with `listContent(projectText, ref): string` that throws; the
sound plan M (pull request 112) creates it with `withFolders`, and adds folder blocks to `[[content]]` that change
what "already listed" means. Plan G's first pull request (its Task 2, the API's `list`) and its fourth (a game copy of
a walk) need the writer, but plan R put it in Part 6. **Fixed in the plan:** Tasks 17 and 18 are Part 0, built before
Part 1 (they need nothing from the rig), with this signature as the one writer; the scenes plan already says to use
one that landed first; plan M's `withFolders` goes beside it, and `listContent` counts a path under a listed folder of
its kind as listed once M lands. The coordinator is told, since two other threads hold the other plans.

**I2. Two new public names clash with ones already public.** Task 3's `type Body` and `type View` reach
`src/headless.ts` through `export * from './features/content/content.ts'`, beside physics' `Body` (a component,
asserted by `tests/public-surface.test.ts`) and, in `src/index.ts`, render's `View` (`render/render.ts` exports
`type View` from `scene.ts`). Two `export *` of one name is TS2308, so `typecheck` fails the moment either is
exported. **Fixed:** `BodyPlan` and `FigureView` throughout (and in plan G); a Global Constraint says to check every
new exported name against the public-surface test, and that each task exports what it makes as it makes it (Task 19
had read as if nothing was public until Part 6, which plan G could not wait for).

**I3. `paint-figure.ts` cannot stay byte for byte unchanged.** It imports `type FigureFile` and reads `figure.parts`
and `figure.poses`; once `FigureFile` is the union, `parts` does not exist on `RiggedFigure` and it no longer
type-checks. And `paint.ts`'s new `paintFigure` has the same name as its export. **Fixed:** its one type import becomes
`FreeFigure as FigureFile` (no other line moves); `paint.ts` imports it as `paintFree`; `render/art.ts`'s first-pose
fallback (`figure.poses[0]?.id`, line 229) becomes `posesOf(…)[0]`, so a rigged figure falls back to `idle-1`.

**I4. The demo's palette rule meets a palette of ramps.** The Owner's rule for the example games' art is palette
No. 276, and Examples' CI fails any other colour (plan D audit, Q1, answer A). No. 276 has four colours: `#111314`,
`#f37f94`, `#afd472`, `#fdd4bd`. A ramp is three to six colours, each lighter than the one before, and the spec wants
"never one flat fill". By `lightness` the four make exactly one ramp, black, pink, green and cream, so every part of
every demo figure would be shaded through those four. The plan does not say; plan D's Part 9 would find it out when
it drafts the art. This is the Owner's (Q1). **Settled (the Owner, 2026-11-15):** "We can just use the duel 256
palette from lopsec for the games, use current the palette for UI." Lospec has no 128-colour DUEL, so it is the 256.
The games' art moves from No. 276 to Lospec's DUEL, whose 32 rows of 8 the library's ramps already are: Lospec's
`.hex` (in the project's files) matches the old builder's `duel-ramps.ts` colour for colour. **Fixed:** Task 1
exports `DUEL_COLOURS` (the 256) for a game's CI, and the plan D handoff says Examples' art check holds the pictures
to it.

**I5. The library's `ink` is purple, and the "ink" edge has no colour.** Row 28 of the DUEL ramps, named `ink`, keeps
steps 1, 2, 3, 5 and 6: `#3c3151` to `#baabf7`, a lilac. `eyes` left out is `ink`, so every figure's eyes would be
purple, and the outline `"ink"` ("one near-black") was given no colour at all. `hair` left out is `bark` and `eyes`
`ink`: both are library ids, so a figure on a game's own palette without them fails its check for keys it never
wrote. **Fixed:** row 28 is `amethyst`; a palette has an optional `ink` colour (`inkOf`: else its darkest shade); the
library's is the old painter's `RAMP_OUTLINE`, `#002219`; `hair` left out draws no cap, `eyes` left out are drawn in
the palette's ink.

**I6. The walk's numbers break the walk's own tests.** (a) At `φ = 0.5` both the ground branch's end and the air
branch's start put the foot on the ground row, so a foot is down `n/2 + 1` pictures, not the `n/2` the test asks.
(b) `pictures` may be 5 or 7, but "picture `k` and `k + n/2` are each other with left and right swapped" needs `n`
even. (c) The hips stand on straight legs and are lowered only by `bob · L · (0.5 − 0.5 cos 4πp)`, which is 0 when
both feet are down. A foot planted `S = stride · L / 2` ahead needs the hips `L − √(L² − S²)` lower to touch the
ground: 7% of the leg at `brisk`'s walk, 20% at its run, against a bob of 5% and 8%. The solve brings an unreachable
foot to full reach, so the planted foot leaves the ground row and the "on the ground" test fails, and the walk
floats. (d) The bob was lowest over the standing foot, which is a run's, not a walk's. **Fixed:** `pictures` is 4, 6
or 8; the hips take the stride's crouch for the whole cycle, then a walk's bob lowest at the changeovers and a run's
lowest over the standing foot; the test counts `n/2 + 1` with both feet down at the changeovers, and checks no
planted foot is lifted at `stride` 1.5.

**I7. An animal's spine cannot point up.** "Trunk bones (hips, spine, chest, neck, head, tail, jaw, ears) are measured
from pointing straight up, so a standing figure is all zeros", yet the animal's spine "runs along the ground", its
limit is ±15, and its neck stands "40 degrees up and forward". A spine at zero would stand on end. **Fixed in "The
model":** an animal's hips, spine, chest, neck, head, jaw and ears are measured from forward (bend raises them), its
tail from backward, its legs from straight down.

**I8. A placed pose is in frame pixels, so Look can break it.** `place.<name>.x, y` are "pixels in the side view's
frame". Change `height`, `legs` or `arms` (or press Surprise me in the builder) and a saved `wave` is out of reach or
in the wrong place, and a figure that passed its check now fails it. A piece's shapes are in units "so a piece fits a
figure of any size"; a pose should be too. **Fixed:** places are units (`height / 24`) from the hips' standing point,
`x` forward, `y` down; the spec's `wave` (`6, -14`) reads as a hand over the head at any size, and the test now solves
it at `height` 16 and 60. Plan G's `movePlace` follows (G-I6).

**I9. Task 14 edits code that is not on `main` yet.** It modifies "the cutscene player that applies `face` today".
On `main` `content/cutscene.ts` is the file's schema and nothing applies `face` (`setFacing` is called by nothing);
the player is plan T's, open as pull request 64. It also modifies `level/hero.ts`, which plan H (pull request 101,
being built) rewrites. **Fixed:** Part 4 starts after both merge; if either is still open when Part 3 is done, Part 5
may go first.

**I10. One map of advice for two formats.** `figureInfo.missing` (`Voice.missing`) is one record keyed by path. Its
advice for `paints` ("List the colours the parts use, each with an id and a color"), `outline`, `variants.paints` and
`poses.moves` is format 1's, and a format 2 file missing them would be told to write the wrong thing. **Fixed:**
shared keys get words true of both formats, format 2's own keys their own, format 1's kept word for word where they
fit; Task 2 tests a missing `paints` on each format.

**I11. The sheet's sum was wrong.** "32 across holds 1,600 pictures of 32 by 40, which is more than any figure the
limits allow": 32 across and 51 rows hold 1,632, and a figure at every limit (8 idle, 8 walk, 8 run and 48 of its
own, in three views, for itself and eight variants) is 1,944. The refusal is still the right answer; the sentence is
corrected so an executor does not rely on it.

## Minor

- **M1.** `tests/features/cli/mcp.test.ts` asserts 15 schema resources; Tasks 1, 6, 11 and 12 each add a kind (19 by
  Task 12). Named in Task 1.
- **M2.** `PAINTER_FILES` is `paint-[^/]+|pixels|sheet|art`, which does not match `paint.ts`, and `figure-poses.ts`
  does pose arithmetic. Both added; `Math.sqrt` already passes the rule (it is not in `PAINTER_MATH`).
- **M3.** `hands-behind` is not one of the old builder's stands; its seven are hand on hip, arms crossed, thumbs in
  pockets, hand in pocket, hand in jacket pocket, hip and pocket, kangaroo pocket. Recorded as new; `hand-in-pocket`
  and `hip-and-pocket` added, the two that need a jacket or a pouch left out with the reason.
- **M4.** An unreachable stand both "falls back to `easy`'s arms" and is reported by `checkRigged`. Now it is a
  problem that fails `automata check`; the painter's stand-in exists only so an editor has a picture beside the
  problem.
- **M5.** `posesOf` in `figure.ts` calling `figure-poses.ts`, which needs `isRigged` from `figure.ts`, is a file cycle
  `tests/architecture.test.ts` refuses. It moves to `figure-poses.ts` when it takes the kit.
- **M6.** The kit's library reaches every game's page through `render/art.ts`. The pull requests of Parts 1 to 3 now
  report the built page's size before and after.
- **M7.** `frameName` moves from Task 13 to Task 5, so plan G's second pull request has it (G-I1).
- **M8.** The tracker has two "Cycle 7" sections (this one and plan U's). Left as they are: renaming plan U's is its
  thread's, and the merge queue keeps them apart by title. Said here so nobody merges one into the other.

## Checked and fine

- No golden moves: format 1 reads through the same schema object (a discriminated union on `format`; Zod 4 keeps a
  refined object a `ZodObject`, so the union should accept it, which was read from Zod's design and not run, and the
  plan already has the `z.custom` way round if it does not), `paint-figure.ts`'s code and `figureSheet`'s format 1 path are kept, `schema-hash.json`
  is the sim's schemas (not content's), and `Side` is switched on only by `usesSides`, as `usesJoints` and
  `usesSprites` already do (`level/uses.ts`).
- `dmath` has `sin`, `cos`, `atan2` and `hypot` (`sim/dmath.ts`); `tests/fixtures/property.ts`, the `screens` job and
  `ci-screens`, the `GOLDEN NOT RECORDED` path of `art.parity.test.ts`, `tests/skills/`, `tests/create/` and the four
  skills folders exist as the plan names them. A `library/` of JSON imported `with { type: 'json' }` is the locale
  feature's pattern already.
- The MCP server has 13 tools today, so `add` makes the plan's 14; `COMMAND_NAMES` has `art` for `add` to follow.
- The template's `automata.toml` ends on a block with no comment, so "cut the last block and add it back" holds.
- The old builder's files the plan cites (`duel-ramps.ts`, `paint-style.ts`, `paint-tones.ts`, `two-bone-ik.ts`,
  `figure-rigs/default.toml`, `gaits.json`, `hair.json`, `items.json`, the stands) are at `ed8592e8` where it says.
- Spec coverage is as the plan's self-review says, with the readings above.

## For the Owner

**Q1. The demo's figures are shaded in steps of a colour. Palette No. 276 has four colours. How should they be shaded?**

**Settled another way (the Owner, 2026-11-15):** the games use Lospec's DUEL palette (256 colours), and the UI keeps its own
palettes; No. 276 is no longer the games' palette, so none of the options below applies. See I4.

- **A. Shades mixed from the four (recommended).** Each shade is an even mix of two of No. 276's colours, the way the
  Site mixes its two shades from its own palette. The figures look like the old builder's, in the demo's four
  colours, and CI checks every colour is one of the four or such a mix.
- **B. Only the four.** Every part is shaded through the same four colours, black to pink to green to cream. Nothing
  new, but a pink skin's shadow is black and its light is green.
- **C. Flat parts allowed.** A colour may have one shade, so a part is one flat colour; this bends the spec's "never
  one flat fill" for games with a fixed few colours.

**Q2. Should a behaviour be able to turn a figure to face you or show its back?**

- **A. Not yet (recommended).** The game's code and cutscenes set it. No behaviour can set which way a thing faces
  today either, and the demo is seen from the side. It is added when a game seen from above needs it.
- **B. Yes, now.** A figure painted from the front and back turns by itself to show its front when it walks down and
  its back when it walks up, like it turns left and right today.

## What was not checked

- The DUEL rows' steps 1, 2, 3, 5 and 6 were not each checked for rising lightness (nothing was run); the plan already
  says what to do where one does not.
- Whether Zod 4's JSON Schema output for a discriminated union of refined objects reads well in the editors' forms;
  `schemas/figure.schema.json` comes from CI.
- How the pictures look: that is the contact sheet's job in CI, and the Owner's.
