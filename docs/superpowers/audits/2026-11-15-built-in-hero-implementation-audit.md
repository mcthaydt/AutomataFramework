# Plan H implementation audit: the built-in hero

Stage 5 of Cycle 6. What was audited: the merged build, PR 101 at `b634dce`, against the spec
([`specs/2026-11-14-content-hero-controls-design.md`](../specs/2026-11-14-content-hero-controls-design.md), PR 91), the
plan ([`plans/2026-11-14-built-in-hero.md`](../plans/2026-11-14-built-in-hero.md), PRs 93 and 96) and the plan audit
([`audits/2026-11-14-built-in-hero-plan-audit.md`](2026-11-14-built-in-hero-plan-audit.md)). The code was read, not
run: nothing runs locally, and the proof that the tests pass is PR 101's CI.

## Verdict

**Sound. No critical finding.** The sim side is the strongest part: one pure step function, every number from the
tuning file and held inside the framework's limits, ground and walls read from Rapier's own contacts, the plugin and
both components added only when the hero has `moves`, so no framework golden moved. The new golden plays every move
in four engines, alone, in co-op and online through a rollback. The weak spots are on the touch side and in the
journeys: one onboarding hint disappears before its move is learned, the template's key hint forgets the dash a
developer is told to switch on, and the `create-play` journey proves much less than the plan asked.

**5 important, 11 minor, 2 for the Owner's phone review.** None needs an Owner decision before the fix stage starts;
the two phone items are numbers to settle on a real phone and are listed so they are not lost.

**Left out on purpose:** the touch hints' colour on the pale sky and the circles over the floor edge at tablet
sideways and desktop. That is already open, and the Owner is choosing the fix on a card.

**Main is not proven green yet.** The push run for `b634dce` (run 648) was cancelled by the next merge, and the run
on `8112669` (run 650) was queued when this was written. PR 101's own runs were green on the merged tree.

## What was checked

| Area | Result |
|---|---|
| `moves` in the character file, its checks and words | As planned (Task 1, with audit I7) |
| The eighteen numbers, limits, clamp, refusals | As planned (Task 2, audit I2): `loadGame` refuses a range or a fraction; `moveNumbers` clamps content that never went through it |
| `buzz` in a feel file | As planned (Task 3) |
| `Touching` from contact normals | As planned, plus a corner rule for wall seams (below) |
| `stepMoves`, the order of a tick | As planned, with three small, sound deviations (below) |
| The plugin, `usesMoves`, the hero's parts | As planned (Task 6); joins only when the hero has `moves` |
| Clips `air-jump`, `wall`, `dash` and their stand-ins | As planned (Task 7); `pickClip` now walks the stand-in chain |
| `moves.json` golden: single, co-op, online, restore | Recorded from CI; three engines agree |
| Controls from the tuning file, file over code, audit I3 | As planned (Task 9), in one place for both entry points (`game/controls.ts`) |
| Host `buzz`, the buzzer, touch settings | As planned, one deviation (web buzz length, below) |
| Thumb rules and the page scheme | As planned, findings I1, M5, M6 |
| Words in six languages, key and pad hints | As planned (Task 13); pad buttons named by position |
| The template, its replay, the skills, the README | Moved over; finding I2; replay moved once with the Owner's yes |
| Determinism | No clock, no `Math.random`, no `Math.sign`/`hypot`/`round` in sim code; `felt` is order-free over Rapier's pair walk; move state is a component, so snapshots and rollback carry it |
| Online buzz on a rollback | Correct: re-stepped ticks are not "fresh", so a landing never buzzes twice |

## Important

**I1. The dash hint goes away before the player has dashed.** `src/features/input/thumbs.ts:203` puts the "Flick to
dash" words inside the walk hint's box, and `refreshHints` (`:323`) only switches the words themselves. The walk hint's
box is hidden once the player has walked three times, which takes a few seconds, so the dash hint is hidden with it
whatever its own count says. In the demo's third level, the one that teaches the dash, a phone player will usually
never see it. No test covers it: the hints test checks walk and jump only.
*Fix:* give the dash hint a box of its own (or show the walk box while either hint is due), and add a test: walk three
times, the dash hint still shows; flick three times, it goes.

**I2. The template's key hint never names the dash.** `template/src/features/page/page.ts:216` passes `dash: false` to
`playHint`. The template's README and AGENTS.md tell a developer to switch the dash on in `hero.json`; after they do,
the hero dashes and the keyboard hint still says only how to move and jump. A first-time developer following the
README gets a hint that is wrong for their game.
*Fix:* read it from the content: `dash: loaded.value.characters[loaded.value.project.hero]?.moves?.dash === true`, and
add a template test that a hero with `dash` gets the dash words in the hint.

**I3. The `create-play` journey proves less than the plan asked.** Task 15 Step 1 and builder's call 11: a game made by
`automata create` is played "from the start to the spark by keyboard, by gamepad and by thumbs", and the spark's count
is the sign it got there. `tests/create/create.journey.test.ts:265-283` holds right (key or thumb) until the hero is
half a tile further right; `:371-411` pushes the stick until the same. Nobody jumps, nobody reaches the spark, the count
is never read, and the jump half and the gamepad's bottom button are never pressed in a made game. The moves fixture's
browser tests do cover jumping by thumb and pad, but not in the game a new developer gets.
*Fix:* extend the three runs to the spark (the template's `hero-play.ts` script already knows the way: walk, push the
crate, jump), and assert the score.

**I4. A hint can come back over the game while the player is playing.** `lastTouch` is set on a finger landing and
lifting (`thumbs.ts:231`, `:348`, `:359`), never while one is down and moving. A player who holds the walking thumb
down for twenty seconds without touching the jump half (a long walk, or a level that asks for patience) gets every
hint back over the game mid-play. The spec's rule is "comes back after the game has been left alone for a while", and a
thumb on the glass is not alone.
*Fix:* count a finger that is down as touching (refresh `lastTouch` on `pointermove`, or treat any finger down as
`msSinceTouch` 0), with a test that holds a thumb for 21 s and sees no hint.

**I5. A thumb test failed once on a run that changed only this doc.** On this audit's own pull request (PR 126, run
43667409175, `engines (chromium)`), `tests/features/input/thumbs.browser.test.ts` "the screen turned with a thumb down"
failed at line 171: still `['right']` held after the mount was resized to 390 by 844. The same test passed on PR 101.
The likely cause is the test's wait, not the code: the halves are redrawn from a `ResizeObserver`, and the test waits
for that with `vi.waitFor`'s default of one second, on a runner that reported its workers 95% busy over a 251-second
run. That is a guess from the log; nothing has proved it yet. The project's rule is that a test which fails once is a
defect, not a flake. *Fix:* have the test wait for the observer itself (for example, wait for the band's height to
change before checking what is held), or call `layout` from a resize the test can await. Then run it to see whether
it still fails.

## Minor

**M1. `lockDir` is written and never read** (`move-step.ts:234`). It is part of the component, so of the schema hash
and both moved goldens; taking it out moves `moves.json` and the template's replay. *Recommendation:* leave it, and say
in its comment that it is kept for the hash and for a later move that needs it, or take it out the next time those
goldens move for another reason.

**M2. A deviation the plan does not record: a hero rising from a jump is never "below".** `move-step.ts:139`. Rapier
fills its contacts before it integrates, so on the tick after a jump the feet still touch, and without this line the
jump would land at once and could not be cut. It is right, and the comment says why; the plan's tick order (step 1)
should say it too, so the next reader does not take it out.

**M3. Two more small deviations in `stepMoves`, both sound:** the walk's "never push into a wall" uses the sign of
`run`, not of `dir` (so a hero gliding toward a wall with nothing held also stops at it), and a tick with a press does
not start a wall slide (it wall jumps). Record both in the plan.

**M4. Kinematic bodies count as walls.** `rapier.ts:275` marks only dynamic bodies as moving, so a kinematic moving
platform's side is a wall the hero can slide on and jump from. No level has one yet. The spec says a wall is
"something that does not move". Decide it when moving platforms arrive, and pin it with a test then.

**M5. A press can outlive `mask()`.** `thumb-rules.ts:138` drops the fingers but keeps `pending`, and `thumbs.ts`'s
`mask` keeps `tapped`. A tap on the jump half that lands just before a pause is drained on the first poll after it, so
the hero jumps on resume. Rare (the loop is stopped while paused), but it is exactly what `mask` is for. *Fix:* clear
both in `mask`.

**M6. Turning a tablet does not let go.** `layout()` clears the rules only when the shape changes (band to over). An
iPad turned from upright to sideways is "over" both times, so a held thumb keeps its ring at the old place. iOS
usually cancels the touches itself, which is why nothing has shown it. *Fix:* also clear when the mount's size changes
by more than a little, and cover it in `thumbs.browser.test.ts`.

**M7. The web buzz is shorter than the plan says.** Builder's call 18: the web host "buzzes for the feel file's time
and skips a strength of 0". `web.ts:65` scales the time by the strength instead, so the template's landing (0.3, three
ticks) is a 15 ms buzz, which many Android phones do not make felt. A deviation not reported. See also P2.

**M8. The walk test's tolerance went from 2% to 4%** (`tests/features/level/moves.test.ts:82`). Friction on the
ground eats more than the plan expected. Not reported as a deviation; say so in the plan, or find where the extra 2%
goes (it may be the first tick from rest, which `walk-grip` 3 accounts for).

**M9. The golden does not show an early press jumping on a landing.** The script's early press is spent as an air
jump, because the fixture has the double jump on (the test's own comment says so). The spec lists "an early press" in
`moves.json`. The unit tests cover it; the golden would, with the press placed after the air jump is used.

**M10. The thumb tests send made-up pointer events.** The spec asks for "real touch events" in three browsers; the
browser tests dispatch `PointerEvent`s with `pointerType: 'touch'`. That proves the rules and the page, not the
browser's own touch handling (`touch-action`, capture on a real finger). Playwright has only a touch tap; a CDP touch
drag works in Chromium. Worth one Chromium test with real touch input.

**M11. A misspelt number does nothing, silently.** A hero's tuning file with `"jump-sped"` is read as a number of the
game's own (the spec allows those), and the jump keeps its default. For an agent-first framework a near miss should be
named: *"jump-sped" is not a number the hero reads. Did you mean "jump-speed"?* Small, in `heroTuningProblems`. Also:
`hints.ts:35` capitalises with `toUpperCase`, not the plan's `toLocaleUpperCase` with the language's tag; no shipped
language differs, so it is a note only.

## For the Owner's phone review (no change until then)

**P1. A quick start of a walk is a dash.** The flick is measured from where the thumb landed (`thumb-rules.ts:112`,
`armed: true`), so a thumb that lands and slides 56 px within 110 ms dashes instead of walking. In a level with a pit
that is a dash into the pit. The plan put the thumb numbers on the Owner's real-phone review; this is the one to try
first. If it feels wrong, the smallest change is that a flick cannot start in the first 80 ms after the thumb lands.

**P2. The landing buzz may not be felt** (M7). Feel it on an Android phone before the demo copies the template's
numbers.

## Spec and plan items that are not done, by design

- The feel runtime (dust, shake, freeze) is plan F's; the template's landing buzzes and its dust is not drawn yet.
- The settings screen's "Swap sides" and "Vibration" toggles are plan U's; the data and `setSwapSides`/`setVibration`
  are here.
- The demo's move to the built-in hero and its two goldens are plan D's.

## For the fix stage

In order: I1, I2, I4, I5, M5, M6 (the touch side, one PR is fine), then I3 (the journey), then the notes M2, M3, M7, M8
into the plan. M1, M4, M9, M10, M11 can wait for a later cycle or ride along. No golden moves for any of these, unless
the fix stage takes out `lockDir` (M1), which it should not.
