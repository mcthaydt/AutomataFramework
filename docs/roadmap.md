# AutomataFramework roadmap

The order we build AutomataFramework in. One page, read top to bottom.

## The rules

**We finish Release 1, 2D finished, and only Release 1.** (Proposed. The owner has not yet named the one release to
finish.) Release 1 is the framework in full and the demo game. Everything after it is marked **Later**. Nothing marked
Later starts until Release 1 is done and the owner says go.

1. **One thing at a time.** There is one **Now**. Nothing else is built until it is done.
2. **One design track.** Beside the Now, one design can be worked on: today, the shell and World mockups. Only one
   editor is designed at a time, and no editor is built until the owner approves its design.
3. **Releases go in order.** A release starts only when the one before it is merged and green.
4. **New ideas wait.** A new idea goes in "Not yet placed" at the bottom. It moves up only when the owner says where it
   goes.
5. **Designs can wait in line.** An approved design sits under its release until that release comes up. Approved is not
   the same as building.
6. "Done" means merged to main and green there. Nothing else counts as done.

How to read each list: **Done** is merged and green. **Now** is the one thing being built. **Next** is in line, in
order. **Waiting** is approved, but its turn has not come. **Later** is after Release 1: not worked on now.

## Release 1: 2D finished

1. Done: the first thin slice: the framework, the demo game, the editors' first screen and the site, each with its
   tests on every change.
2. Done: content files, saves, input with gamepads and new keys, playing together online, physics joints and touch,
   art, sound, languages, the `automata` command for agents.
3. Done: the built-in hero (walk, jump, double jump, wall jump, dash), no default language, the default game flow
   (warnings, language picker, splash, menu, pause), live move numbers.
4. Done: Scenes part 1 (painted ground and photo materials), its audit and its fixes (#147), except fix I1.
5. Done: the game checklist, parts 1, 2a and 2b (#143, #145, #148).
6. Done: the demo game's words in six languages, its room server and the built-in hero (Examples #37, #39, #40), and
   the demo playing itself.
7. **Now: the feel runtime and the story (plans F and T, #120 and #64), being merged.**
8. Next: the game checklist, the rest: the starter game on the new game flow (part 3), the checks (part 4), the last
   part (part 5), then its audit and fixes. Part 3 changes the starter game's recorded play, so the owner sees it
   before and after.
9. Next: the demo's three levels, the door and playing together (Examples #41, then the page). It changes five
   recorded plays, so the owner sees them first.
10. Next: Scenes fix I1 (photo materials). It changes the scene pictures' record, so the owner sees it first.
11. Next: the sound formats (plan M) and the rigged figures (plan R), restarted from main, one at a time.
12. Next: links on things and the world map: the 8 questions asked again, then the spec, plan, build and audit. The
    demo then uses it: a button opens a door, and two levels are joined by a door.
13. Next: the demo's sound, feel, story, and screens, saves and "What's inside" (Parts 5 to 8), each right after the
    framework work it uses.
14. Next: the 2D figure and environment builders. Their designs come first (see the design track), because the demo's
    real art is made in them.
15. Next: the demo's real art and the close (Parts 9 and 10): an agent drafts every figure and scene, the owner
    finishes them, and the owner plays the demo and says it is fine.
16. Next: the owner's reviews still owed on finished work: the built-in hero, no default language, live move numbers,
    the game flow, and the site's and demo's earlier rounds.
17. Next: the owner starts Release 1 by hand.

### The design track: the editor mockups

1. Done: three rounds of mockups of all five editors (Editors #34), the plain-words audit, two design checks, the
   first harsh review of the shell and World, what World takes from LDtk, and the Apple Pencil review.
2. **Now: the shell and World: the fixes from the harsh review, then the plain-words audit, two design checks, a second
   harsh review, then the owner. Again until the owner is satisfied.**
3. Waiting: Characters, Feel, Sound and Story, one at a time, the same way. Characters goes first, for the demo's art.

---

# Later: after Release 1

## Release 2: the 2D editors

1. Done: the plans for the figure builder, the environment builder, Feel, Sound and Story.
2. Waiting: taking back the two editor builds made too early (Editors #50; the owner said yes).
3. Later: the editor specs and plans brought in line with the approved mockups, then audited.
4. Later: the shell first, then World's Levels, then Feel with Tuner, then the rest of the five editors.
5. Later: the editors as an app for iPad, Android and computers.

## Release 3: the website

1. Done: the home page, its look, and the demo playing itself on it.
2. Later: the sales site (spec done), built once the demo has landed.
3. Later: the site live on its Cloudflare address.

## Release 4: distribution

Later. Games ship to the web, itch.io, Wavedash (if its rules fit) and computers. The editor app ships.

## Release 5: 3D

Later. 3D as its own layer on top of 2D, then the same loop again for 3D.

## Not yet placed: needs the owner

Later. Nothing here moves until the owner says.

1. This page: is Release 1 the one release to finish, and is this the order?
2. The old unfinished work: the sound formats (#125) and rigged figures (#124) were closed. Keep them closed and
   restart each from main when its turn comes? Same for the editors' old look (Editors #12).
3. The 8 world map questions, asked again when that item comes up.
4. The recorded plays that change (the demo's five, the starter game's, the scene pictures'): each one shown to the
   owner before it goes in.
