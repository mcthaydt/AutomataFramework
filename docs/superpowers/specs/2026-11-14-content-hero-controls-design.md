# The built-in hero: walk, jump and more, switched on from content

An addendum to [`2026-11-14-m2-design.md`](2026-11-14-m2-design.md). Today a hero moves only because the game's own code
says so: the template and the demo each carry the same fifty lines (`src/features/hero/move.ts`: run at 6, jump at 12
when standing) and their own list of keys. The framework alone runs physics and nothing else, so a tool that reads a
game's content files and never its code (the editors) can show a level but cannot play it.

The Owner chose (2026-11-14) that the editors' Play button gives **real play**, not a physics-only preview. This spec
adds the piece that makes it possible: a built-in hero, switched on in the hero's character file and tuned in a tuning
file, that the framework plays with no game code. The template and the demo move to it.

It also writes down the Owner's rule for play controls (2026-11-14): **mobile is first class.** "The majority of users
will play AF games on their phone, so it's mobile, then gamepad, then keyboard and mouse," with "a AAA mobile
experience ... and not just adding buttons on a screen as if it were a direct PC support." The built-in hero's touch
controls are designed for two thumbs on glass first.

## Principles served

- **1, agent-first.** How the hero moves is two documented JSON files (the character's `moves`, the tuning file's
  numbers and controls), each with a JSON Schema and plain-word diagnostics. An agent changes a jump by changing a
  number, the same number the Feel editor's slider changes. Nothing about movement is hidden in game code any more.
- **2, iPad-first editors.** The editors' Play runs the real game on an iPad from content alone, with the same touch
  controls a player gets.
- **Onboarding comes first** (the Owner, 2026-11-13). A first-time player on a phone is shown where their thumbs go and
  told, in their language, that they did it. A first-time developer gets a hero that moves without writing a line.

It breaks none: 2D only, nothing ported ahead of its user (the editors' Play and the demo use it at once), and **no new
dependency**.

## The Owner's answers (2026-11-14)

| Question | Answer |
|---|---|
| Q1. How much does the built-in hero do? | **C.** Walk and jump, with the three numbers that make jumping fair (a moment's grace after running off a ledge, a press just before landing still jumps, holding jump goes higher than tapping), plus **double jump, wall jump and dash**, each switched on in the file. |
| Q2. Which games use the new moves? | **B.** The demo does, each of its three levels teaching one move. The starter game from `automata create` stays walk and jump, so a first game is simple and has fewer things to learn on a phone. |
| Controls | **Mobile first, then gamepad, then keyboard and mouse.** AAA touch controls, not PC buttons pasted on the screen. |

## Goals

- A hero whose character file has `moves` walks, jumps and (when switched on) double jumps, wall jumps and dashes,
  played by the framework with no game code: `createGameSim({ content })` with no `plugins` plays it.
- Every movement number lives in a tuning file with a range, so the Feel editor's Tuner can slide it and an agent can
  write it.
- The controls come from the tuning file's `controls`, so a game with no code still has keys, gamepad buttons and the
  touch scheme.
- Touch controls that feel made for a phone: no small buttons for movement, nothing to aim at, instant response,
  haptics where the device allows, left-handed play.
- The same seed, content and inputs give the same hash in Node, Chromium, WebKit and Firefox, single-player, co-op and
  online.
- The template and the demo drop their own movement code and controls list.

## Non-goals

- Moves beyond the five (crouch, climb, swim, ledge grab, ground pound). They can be added later the same way, each
  switched on in the file, without moving any golden of a game that does not switch it on.
- Other characters' movement. Critters move by behaviour rules (plan T); behaviour rules do not drive heroes.
- Mouse play. A mouse works the menus; it does not move the hero.
- Touch for more than one player on one screen (the M2 spec's call stays: touch is one player).

## Anti-goals (failure even if it technically works)

- **PC buttons pasted on glass**: a row of small labelled buttons in the corners that a thumb must find without
  looking. That is today's scheme, and it is what the Owner ruled out for play.
- A thumb that hides the hero, or a control that needs a second look away from the game.
- A jump that fires when the thumb lifts, or that waits a frame for a gesture to be told apart: the jump starts on the
  tick the thumb lands.
- A move that only works by touch, or only by keyboard. Every move works on all three.
- Any game that does not switch the built-in hero on seeing its recordings move.
- Haptics that are the only sign something happened, or that cannot be turned off.

## Approaches considered

| Approach | Trade-off | Verdict |
|---|---|---|
| **A. A built-in `moves` plugin in `level`, switched on by the hero's character file, numbers from a tuning file** | One new sim plugin, added only when content asks for it (the pattern `touch`, `joints` and `sprites` already follow), so no other game's hash moves. The tuning file kind already exists and nothing reads it yet. | **Chosen** (my call; the Owner handed over the how) |
| B. Heroes driven by behaviour rules, with "the player holds left" as a sense | One rule system for everyone, but behaviour rules are for characters that decide; a fair jump (grace, buffer, cut) as rules would be a pile of rules nobody could read, and Tuner would have nothing to slide. | Dropped |
| C. A hero plugin the framework exports and each game lists in its code | Least change to the sim, but the editors never run a game's code, so their Play would still not play. It fails the reason this spec exists. | Dropped |

## The files

### The hero's character file: `moves`

A character gets an optional `moves` object. A character with one is a hero the framework moves; the project's `hero`
is the character that has it in every game this spec touches.

```json
"moves": {
  "tuning": "hero-moves",
  "double-jump": true,
  "wall-jump": true,
  "dash": true
}
```

- `tuning` (required): the id of the tuning file that holds the numbers and the controls.
- Walk and jump are always on when `moves` is there. `double-jump`, `wall-jump` and `dash` are each `false` when left
  out.
- Checks, in plain words: a `moves` on a character whose body is not `dynamic`, or that is not `upright`, is refused
  ("A hero that walks needs a moving body that stays upright: make its body "dynamic" and "upright" true."); a
  `tuning` that names no listed tuning file is refused; a `moves` on a character that also has `touch` is refused.

### The tuning file: the numbers

The numbers the built-in hero reads have fixed ids. A number left out of the file takes the framework's value. A
number in the file keeps the file's own `min`, `max` and `step` for the slider, but the framework holds it inside its
own limits (below), and `automata check` says so plainly when the file's range goes outside them.

The defaults keep today's walk (6) and jump (12), so a game that moves to the built-in plays nearly as it did.

| id | What it does, in the file's `about` | Default | Framework limits |
|---|---|---|---|
| `walk-speed` | How fast the hero walks, in tiles a second | 6 | 1 to 20 |
| `walk-grip` | How quickly the hero reaches full speed and stops on the ground, in ticks (0 is at once) | 3 | 0 to 30 |
| `air-grip` | The same in the air | 6 | 0 to 60 |
| `jump-speed` | How fast a jump leaves the ground, in tiles a second | 12 | 4 to 30 |
| `jump-cut` | How much of a jump is kept when jump is let go early, 0 to 1 (1 means holding makes no difference) | 0.5 | 0.1 to 1 |
| `ledge-grace` | How long after running off a ledge a jump still works, in ticks | 6 | 0 to 15 |
| `early-press` | How long before landing a jump press is kept, in ticks | 6 | 0 to 15 |
| `fall-speed` | The fastest the hero falls, in tiles a second | 20 | 5 to 40 |
| `air-jumps` | How many extra jumps in the air (with `double-jump`) | 1 | 1 to 3 |
| `air-jump-speed` | How fast a jump in the air goes up, in tiles a second | 10 | 4 to 30 |
| `wall-slide-speed` | How fast the hero slides down a wall it holds against (with `wall-jump`) | 3 | 0 to 20 |
| `wall-jump-out` | How fast a wall jump pushes away from the wall, in tiles a second | 7 | 1 to 20 |
| `wall-jump-up` | How fast a wall jump goes up, in tiles a second | 11 | 4 to 30 |
| `wall-jump-lock` | How long after a wall jump the hero keeps going away from the wall, in ticks | 8 | 0 to 20 |
| `dash-speed` | How fast a dash goes, in tiles a second (with `dash`) | 18 | 6 to 40 |
| `dash-ticks` | How long a dash lasts, in ticks | 10 | 4 to 30 |
| `dash-rest` | How long before the hero can dash again, in ticks | 30 | 0 to 120 |
| `air-dashes` | How many dashes before the hero touches the ground again | 1 | 1 to 3 |

*My calls:* the walk and air "grip" numbers (acceleration, written as ticks to full speed, which a person can picture)
and `fall-speed` are in because the Owner's bar is AAA feel and Tuner needs them; at 0 grip the hero moves exactly as
today. The switches are booleans in the character file, not "0 means off" numbers, so a slider never switches a move
off by accident. A tuning file may hold other numbers of its own; the framework reads only these ids.

### The tuning file: the controls

The tuning file's `controls` list (plan C's format, unchanged) gives the keys and gamepad buttons. The built-in hero
reads the actions `left`, `right`, `jump` and, with `dash`, `dash`. `automata check` names one of these that is
missing. The framework's defaults, which the template's and the demo's tuning files write out in full:

| Action | Keyboard | Gamepad |
|---|---|---|
| `left`, `right` | Arrows, A and D | Left stick, D-pad |
| `jump` | Space, Up arrow, W | South (A on Xbox, Cross on PlayStation) |
| `dash` | Shift, X | West (X on Xbox, Square on PlayStation), and the right trigger |

Double jump and wall jump are `jump` pressed in the air or against a wall: no extra action, no extra button. A dash
goes the way the hero faces, or the way the player holds.

A `Controls` object passed in code (the `CONTROLS` the template and the demo have today) still works for games with
their own rules. When both are given, the tuning file wins, and `startGame` says so once in the console for the
developer.

## How it plays (the sim)

The `moves` plugin lives in `level` (`src/features/level/moves.ts`, one job per file beside it as the plan splits it),
and `createGameSim` adds it only when a character in the content has `moves`, after `touch` and before the game's own
plugins. It is a `gameplay` system: it reads what each player holds (`isHeld`, `wasPressed`), the hero's contacts and
its own remembered state, and writes the body's speed. Physics does the rest.

- **Ground and walls are felt, not guessed.** Today's "two ticks without moving up or down" is replaced by what
  physics says the hero is touching: ground under it, a wall to its left or right. *Left to the plan:* Rapier's
  contact normals or a short shape cast, whichever the deterministic build gives the same in every engine; plan T's
  `on-ground` sense uses the same answer.
- **Walk.** The speed moves toward the held direction over `walk-grip` ticks (`air-grip` in the air).
- **Jump.** A press counts for `early-press` ticks; the ground counts for `ledge-grace` ticks after leaving it. Letting
  go while still rising keeps `jump-cut` of the upward speed. Falling never goes faster than `fall-speed`.
- **Double jump.** In the air, with no ground grace left, a press uses one of `air-jumps`; they come back on landing
  or on a wall.
- **Wall jump.** In the air against a wall while holding toward it, the hero slides no faster than `wall-slide-speed`;
  a press jumps up and away, and holding toward the wall does nothing for `wall-jump-lock` ticks, so the hero clears
  it.
- **Dash.** A press sets the speed along the facing for `dash-ticks`, with no fall during it, then `dash-rest` before
  the next; in the air at most `air-dashes`.
- **Events,** for sound cues (plan S), feel (dust, shake, freeze) and the onboarding: `hero.walked` (first step after
  standing), `hero.jumped`, `hero.landed`, `hero.left-ground`, `hero.air-jumped`, `hero.wall-slid`, `hero.wall-jumped`,
  `hero.dashed`, each with the player's number. These are the names the content examples already use.
- **Clips.** The character's clips (plan A) widen by three, each with a nearest stand-in so a figure without them still
  plays: `air-jump` (else `jump`), `wall` (else `fall`), `dash` (else `run`). `motionClip` takes the hero's move state
  when it has one.
- **Determinism.** All sim math goes through `sim/dmath.ts`; no `Math.hypot` or `Math.sign` on sim state where engines
  can differ. The move state is a component of plain integers and numbers, so snapshots, rollback (plan N) and replays
  carry it.

## How it is played (touch first)

When the game's hero has `moves`, the touch screen uses the framework's **thumb scheme** instead of a button per
action. A game whose hero has no `moves` keeps today's buttons.

**Two thumbs, two halves, nothing to aim at.**

```
 sideways phone
 +--------------------------------------------------+
 | [II]                                             |
 |                   the level, full screen         |
 |                                                  |
 |   (  o  )                                  ^     |
 |  slide to walk                        tap to jump |
 |  flick to dash                                   |
 +--------------------------------------------------+
   left half: walk                 right half: jump
```

- **The left half walks.** Put the thumb down anywhere on the left half; a soft ring appears under it. Slide left or
  right past a small dead zone to walk; lift to stop. If the thumb slides far, the ring follows it, so the thumb never
  runs off the control. *My call:* the ring is a floating one (it starts where the thumb lands), the standard of good
  phone platformers, because a fixed pad is the "aim at a button" the Owner ruled out.
- **The right half jumps.** A touch anywhere on the right half jumps on the tick it lands. Holding is a high jump;
  lifting early is a short one (`jump-cut`). In the air the same tap is the double jump; against a wall it is the wall
  jump. Nothing new to learn.
- **Flick to dash.** A quick flick of the walking thumb (fast and short, toward a side) dashes that way. *My call:* the
  dash is on the walking thumb, not a swipe of the jumping thumb, because the jump must start the instant the right
  thumb lands, and a swipe there could not be told from a jump without waiting. On a game whose hero dashes, a small
  "dash" mark sits above the right half as well, for a player who would rather tap; it is 64 px, the size today's
  buttons are.
- **A game's own extra actions** (a `use` or `talk` the game adds) are round buttons stacked above the right half,
  at least 64 px, out of the jumping thumb's path. Pause stays at the top corner (plan U).
- **Upright phones.** The two halves are the bottom band under the level, as today's rule fits the level above the
  buttons. **Sideways phones and tablets:** the halves cover the game itself, and the camera (plan A) keeps the hero
  clear of the bottom corners, where thumbs rest. *My call:* on a sideways phone a band would take a third of a
  small screen; AAA phone games play under the thumbs.
- **Seeing where the thumbs go.** Before a thumb has ever touched, a faint ring sits in the left half's corner and a
  faint arrow in the right half's, with words under each ("Slide to walk", "Tap to jump"), in the player's language.
  Each fades once the player has done it three times, and comes back after the game has been left alone for a while.
  The demo's levels teach the new moves the same way, one at a time (see "The template and the demo").
- **Feel.** Touch input is read on `pointerdown` and `pointermove` for the tick it arrives in, never on `click` or
  `pointerup`. The ring and the arrow light while held (the game's own look through `--automata-touch-*`). A thumb
  that leaves the screen, or a touch the system cancels, lets go, as today.
- **Haptics.** A new `buzz` effect in feel files (`{ "strength": 0 to 1, "ticks": n }`) gives a short buzz on an
  event, like dust and shake. The template's and the demo's feel files buzz lightly on landing, a wall jump and a
  dash. It goes through the host port (a new `buzz` capability): the web host uses `navigator.vibrate` where the
  browser has it (Android); where it does not (iOS Safari) the buzz is skipped and nothing else changes; the Tauri app
  (Release 4) gets real haptics through its adapter. Settings (plan U) has "Vibration: on / off", saved with the
  settings, on by default. A buzz is never the only sign: every event that buzzes also has a sound or feel.
- **Left-handed.** Settings has "Swap sides", which puts walking on the right half and jumping on the left. Saved with
  the settings.
- **Accessibility.** The two halves are one `role="group"` each with a name ("Walk", "Jump", in the player's
  language) for screen readers. Every move still works by keyboard and gamepad, so a player who cannot use the touch
  scheme has another way.

**Gamepad, then keyboard.** The gamepad gets the same moves with the table above, and the left stick walks with the
same `walk-grip` feel. The keyboard is last in the order but complete: every move, remappable in settings, the
shared-keyboard halves (plan I) for two players.

## The template and the demo

- **Template** (`automata create`'s starter): `src/features/hero/move.ts` and the `CONTROLS` list in
  `src/features/page/controls.ts` go. `content/characters/hero.json` gets `"moves": { "tuning": "hero-moves" }`, and
  a new `content/tuning/hero-moves.json` lists every number above with its `about`, and the controls. Walk and jump
  only (the Owner's Q2). `hintFor` and the key words move to the framework's thumb scheme and key hints. The score
  (`score.ts`) stays game code: the template still shows how a game adds its own rules.
- **Demo** (AutomataFrameworkExamples, plan D's three levels): the same change, with `double-jump`, `wall-jump` and
  `dash` on. Level one teaches walk and jump, level two the double jump, level three the wall jump and the dash (the
  Owner's "each of its three levels teaching one move"; *my call* to pair wall jump and dash on the last level, since
  walk and jump are level one's). Each new move is taught where it is first needed, with the right control for the
  device in use ("Tap again in the air" on a phone, "Press A again" on a gamepad, "Press Space again" at a keyboard),
  and a clear sign when it is done.
- **The editors' Play** (AutomataFrameworkEditors, the redesign plan's last slice) builds the sim from content only,
  so the hero walks, jumps and does whatever the files switch on, with the thumb scheme on an iPad. The game's own
  plugins (the template's score) do not run there; the editors say nothing that depends on them.

## Goldens

- **No framework golden moves.** The plugin is added only when content asks for it, so `tests/golden/*` (including
  `schema-hash.json`) stay, because none of their games has `moves`.
- **Moves once, named in the commit, the Owner shown before and after:** `template/replays/level-1.json` (the
  template's recorded play), and in AutomataFrameworkExamples `replays/level-1.json` and `replays/test-game.json`
  (their games' schemas change: the game's own `hero` component goes and the framework's move state comes in). Each is
  re-recorded in CI, never typed.
- **New:** `tests/golden/moves.json`, a recorded run of a fixture game with every move on (walk, short and long jump,
  a ledge-grace jump, an early press, double jump, wall slide and wall jump, dash in the air and on the ground), played
  in Node and three browsers.

## Tests

Unit (Node): each number's effect at its limits; ledge grace and early press at exactly their tick counts; the jump
cut; air jumps used and given back; wall slide, wall jump and its lock; dash, its rest and air dashes; the events, one
each, on the right tick; the character and tuning checks' words; a `createGameSim` with no `plugins` moves the hero
(the editors' case); a game without `moves` has the same schema hash as before.

Parity: `moves.json` in Node, Chromium, WebKit and Firefox; a co-op run (two heroes, one dashing into the other) and an
online run through plan N's rollback with moves on.

DOM and real-browser: the thumb scheme in Chromium, WebKit and Firefox with real touch events at the five sizes the
project tests (phone upright and sideways, tablet upright and sideways, desktop): the ring appears where the thumb
lands and follows it; a jump on the tick the thumb lands; hold versus tap heights; the flick dashes; a cancelled touch
lets go; "Swap sides"; the hints fade after three uses; extra actions' buttons are 64 px and clear of the jumping
thumb; nothing scrolls or zooms. Haptics: a fake host is asked to `buzz` with the feel file's strength, and nothing
breaks where the browser has no vibration.

End to end (journeys):
- `create-play`: a game made by `automata create`, with no movement code, played in real browsers by keyboard, by
  gamepad (the test's own pad) and by thumbs, from the start to the door.
- AutomataFrameworkExamples: the three demo levels played by thumbs on a phone size and by keyboard, each new move's
  teaching shown, done, and gone.
- AutomataFrameworkEditors (its own plan): Play on the demo level by thumbs at iPad size, and a Tuner change to
  `jump-speed` felt in the next Play.

## Done means

The template and the demo have no movement code and no controls list in code; a game made by `automata create` plays
by thumbs, gamepad and keyboard with no line of code; `moves.json` is green in four engines; the three moved goldens
were shown to the Owner; the editors' Play can build its sim from content alone. Merged to `main` and green there.

## Plan

One plan, **plan H (the built-in hero)**, in this repo, then a demo step in AutomataFrameworkExamples (inside plan D)
and the editors' Play slice in AutomataFrameworkEditors. It needs plans C, I, P, A and S as built on `main` (they are),
and it hands plan U the two new settings ("Vibration", "Swap sides") and plan T the shared ground answer. Plan K's
template and skills change in the same plan (the template and `skills/` say how to tune the hero).

## Left to the builder

- How ground and walls are felt (contact normals or shape casts), held to the same answer in four engines.
- The ring's dead zone, follow distance and the flick's speed and length, in CSS pixels, tuned on real phones in the
  touch journeys' sizes; and where the faint hints sit at each size.
- How long "left alone for a while" is before the hints come back.
- The order of the move state's fields and the snapshot format's version step.
- The exact words of the hints and the check messages, in all six languages, under the framework's `automata.*` keys
  (plan L, with no default language: plan W).
