# AutomataFramework roadmap

The order we build AutomataFramework in. One page, read top to bottom.

## The rules

**We finish slice 3, and only slice 3.** (Proposed, for the owner to confirm: slice 3 is the shell and World editor
mockups, approved.) Everything below slice 3 is marked **Later**. Nothing marked Later starts until slice 3 is done
and the owner says go.

1. **One thing at a time.** There is one **Now**. Nothing else is built until it is done.
2. **Slices go in order.** A slice starts only when the one before it is merged and green.
3. **New ideas wait.** A new idea goes in "Not yet placed" at the bottom. It moves up only when the owner says where it
   goes.
4. **Designs can wait in line.** An approved design sits under its slice until that slice comes up. Approved is not
   the same as building.
5. "Done" means merged to main and green there. Nothing else counts as done.

How to read each list: **Done** is merged and green. **Now** is the one thing being built. **Next** is in line, in
order. **Waiting** is approved, but its turn has not come. **Later** is after slice 3: not worked on now.

## Slice 0: Start

1. Done: the design, the workflow, the four repos, the tests that run on every change, the check on who wrote each
   commit.

## Slice 1: A game plays in the browser

1. Done: the framework, the demo game (one level, the hero and a crate), the editors' first screen and the site, on
   phones, tablets and computers (pull requests #1 to #14; Examples #1 to #9; Editors #1 to #9; Site #1 to #6).
2. Done: the look of the demo's screens and the site (Examples #10 to #22; Site #7 to #19).
3. Done: the demo plays itself on the site (#28, #29, #31, #49; Examples #23 to #30; Site #22, #24, #25, #30).

## Slice 2: A game made from its files

1. Done: levels, saves, gamepads and new keys, playing together online, ropes and pins, pictures, sound and six
   languages, each from a file (plans C, V, I, N, P, A, S and L, #30 to #88).
2. Done: the `automata` command, so an agent makes, checks and replays a game (plan K).
3. Done: the hero walks, jumps, double jumps, wall jumps and dashes, set in its file (plan H, #91 to #133).
4. Done: a first visit goes warnings, language, splash, menu, play, pause (#89 to #136).
5. Done: the demo speaks six languages, has a room server and the built-in hero (Examples #35 to #42).

## Slice 3: The shell and World editor mockups, approved

1. Done: three rounds of mockups of all five editors (Editors #34, open while it is reviewed), the check against
   professional tools, the first harsh review of the shell and World, what World takes from LDtk, and the Apple Pencil
   review (Editors #49, #51, #52).
2. **Now: the fixes from the harsh review, the LDtk picks and the Apple Pencil review, in the shell and World
   mockups.**
3. Next: the plain-words audit of the shell and World.
4. Next: two design checks, with fixes after each.
5. Next: a second harsh review.
6. Next: the owner looks. Steps 2 to 6 repeat until the owner says the shell and World are fine.

---

# Later: after slice 3

## Slice 4: A new game passes the game checklist

1. Done: the spec, the plan and its audit, parts 1, 2a and 2b: Try again, How to play, the goal line, the score and
   best score, Delete all my saves, Back, the loading bar (#137 to #148), and the pause note (#151).
2. Later: part 3, the starter game on the new game flow. It changes the starter game's recorded play, so the owner
   sees it before and after.
3. Later: parts 4 and 5, then the audit and its fixes.

## Slice 5: The demo plays three levels with a door, for one or two players

1. Later: the levels and rules (Examples #41, open). It changes five recorded plays, so the owner sees them first.
2. Later: the page half: changing level, the teaching steps, the journeys.

## Slice 6: The demo's feel and story

1. Done: the feel spec, plan and audit (#105, #111, #115); the story plan and audit (#58, #60).
2. Later: the feel build (#120, open) and the story build (#64, open), then their audits and fixes.
3. Later: in the demo, dust when the hero lands, a shake and a short freeze; the keeper talks and a cutscene plays.

## Slice 7: The demo's sound

1. Done: the sound formats spec, plan and audit (#106, #112, #118).
2. Later: the sound formats build. Pull request #125 was closed on 2026-11-15 (last commit `59d3ffe`); it is rebuilt
   from its plan, `plans/2026-11-15-sound-formats.md`, when its turn comes.
3. Later: the demo's music and sounds.

## Slice 8: A button opens a door, and two levels join on a world map

1. Later: the spec. Pull request #149 was closed on 2026-11-15 (last commit `c449fca`), with 8 questions for the owner;
   it is picked up from there when its turn comes.
2. Later: the plan, the build, the audit and its fixes; then the demo uses it.

## Slice 9: The demo's screens, saves and "What's inside"

1. Later: the thumbs remember what a player has learned. Pull request #142 was closed on 2026-11-15 (last commit
   `6b0a79d`); it is rebuilt when its turn comes.
2. Later: the demo's screens, its saves and "What's inside".

## Slice 10: The editor shell, built

1. Done: a level drawn still, at a view (#95, #102); the editors' colours, fonts and words, levels in the game's own
   art, Approve kept still (Editors #21, #25, #27).
2. Done, being taken back: every level change, and the room with its panels (Editors #28, #45). Editors #50 (open)
   takes them back until the mockups are approved.
3. Later: the editors' old look. Editors #12 was closed on 2026-11-15 (last commit `e0648b0`); it is not rebuilt, the
   approved mockups replace it.
4. Later: the editor plans redone from the approved mockups, audited, then the shell built.

## Slice 11: The demo's real art, made in the builders

1. Done: the figure builder's spec, plan and audit (Editors #29, #36, #43); the rigged figures spec, plan, audit and
   part 0 (#104, #109, #117, #119).
2. Done: the environment builder's spec (Editors #31); Scenes, ground painted with photo materials: plans, parts A
   to D, the audit and its fixes (Editors #37, #42; #113, #116, #128 to #147).
3. Waiting: the Characters mockups, drawn in Editors #34, reviewed the same way as slice 3.
4. Later: rigged figures part 1. Pull request #124 was closed on 2026-11-15 (last commit `150260a`); it is rebuilt from
   its plan, `plans/2026-11-15-rigged-figures.md`, when its turn comes. Then parts 2 to 5.
5. Later: Scenes fix I1. It changes the scene pictures' record, so the owner sees it first.
6. Later: the figure builder and the environment builder.
7. Later: an agent draws every figure and scene in the builders, the owner finishes them, and the owner plays the demo
   end to end and says it is fine.

## Slice 12: The rest of the editors

1. Done: the Feel editor's spec and plan audit (Editors #30, #40), and live move numbers for it (#107, #114, #122,
   #130).
2. Done: the Sound editor's spec, plan and audit (Editors #33, #39, #44); the Story editor's spec, plan audit and fixes
   (Editors #32, #41, #46, #48).
3. Later: World: open a level, change it on an iPad, save it into the game.
4. Later: Feel with Tuner, then Sound, then Story, each with its mockups approved first.

## Before launch

Later. Each is built after the slices above, in this order.

1. Release 1: 2D finished, the framework and the demo game. The owner starts it by hand.
2. Release 2: the 2D editors, in the browser and as an app for iPad, Android and computers.
3. The sales site, live, with the finished demo on it. Its spec is done (Site #23).
4. Shipping a game to itch.io, Wavedash (if its rules fit) and computers, and the editor app.

## Launch

The date is not set. Launch is when the owner starts the releases above.

## After launch

Later.

1. 3D, as its own layer on top of 2D, then the same order again for 3D.

## Not yet placed: needs the owner

Later. Nothing here is built until the owner says where it goes.

1. The feel and story builds (#120, #64) are open: finish merging them now, or pause them until slice 6?
