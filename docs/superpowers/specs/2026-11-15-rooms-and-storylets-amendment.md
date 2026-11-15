# Amendment: rooms that join edge to edge, and a story made of facts and conditions

The Owner's answers, 2026-11-15. This page changes two specs and one plan that are not built yet. It rewrites none of
them: each is changed by this page when its slice comes up, and its plan is written or rewritten from it then. Until the
Owner says this page is fine, it is a proposal.

| Changes | Where it is today |
|---|---|
| The level links and world map spec | Closed pull request #149, last commit `c449fca` (`specs/2026-11-15-level-links-and-world-map-design.md`), the next framework build in slice 3 |
| The Story editor's spec | AutomataFrameworkEditors, `docs/superpowers/specs/2026-11-15-story-editor-design.md` |
| The story plan (plan T) | `plans/2026-11-14-m2-story.md`, rebuilt from its plan in slice 7 |

## Principles served

- **1, agent-first.** Rooms and storylets are files an agent writes and `automata check` reads, like levels and
  conversations today. A generated place is made from a seed and the room files, so an agent can make it again, read
  it and replay it. Nothing is hidden in game code that an editor cannot see.
- **3, layers in order.** Both are 2D formats with no 2D-only words, so the 3D layer reuses them (a room's openings gain
  a depth; facts and storylets are the same in both layers, as Story is).
- It breaks none: no new dependency, no 3D, nothing built ahead of its slice.

## 1. Rooms that join edge to edge

The world map spec joins levels by doors only and lists "levels that touch edge to edge" as a non-goal. The Owner:
levels can join edge to edge. That non-goal is removed, and the spec gains these.

- **A room is a level marked as a room** (`"room": true` or a `room` block in the level file; the plan decides which).
  It is drawn in World like any level.
- **Openings.** A room marks where its edges are open: which edge (left, right, top, bottom), and the tiles along it.
  `automata check` fails an opening that a solid tile blocks.
- **Edge joins.** Beside the door's `leads-to`, the world file may say that two levels or rooms touch along an edge,
  with an offset. Walking off an open edge enters the level it touches, for every player at once, as a door does. The
  world file stops being "the map's arrangement only" for these joins: an edge join is read by the flow, and `check`
  holds both sides of it to the same openings.
- **Put together from a seed.** A layout of rooms may be made by the game from a seed and a set of rooms, Spelunky
  style: rooms whose openings meet are joined into one place. The seed is the sim's seed, so the same seed gives the
  same place in every browser, and a replay records it as today. The part that puts rooms together is its own later
  plan; this amendment only makes the formats ready for it.
- **Things in a made room** get their ids from the room, its place in the layout and the thing's own id, so a saved
  game can say "the thing taken in room 3" and Continue finds it again. Links between things (the spec's values) stay
  inside one room.
- **The editor (World).** Rooms are edited as levels are; the map shows hand-joined levels at their places, and a
  "Try a seed" view shows one made layout to look at, never saved. The mockups need no change until the World editor's
  own spec, which picks this up.

## 2. A story made of facts and conditions

The Story editor's spec and plan T both leave out "conditions, facts, standing, storylets". The Owner: **all story is
facts and conditions, as salience-based storylets.** Those non-goals are removed, and the formats gain these.

- **Facts.** A game's facts are named values the sim keeps and a save keeps: a number, a yes or no, or a choice from a
  list, each declared once with its first value and its limits (one `facts` file, or a block in an existing file; the
  plan decides). Only the sim changes a fact.
- **Conditions.** A condition reads facts: equal, not equal, at least, at most, between, and all of / any of. The same
  condition shape is used everywhere something can be switched on by the story.
- **Storylets.** A storylet is a piece of story (a conversation, a cutscene, or a line) with the conditions it needs and
  the facts it changes when it plays. When the game asks "what happens now" for a character, a place or a moment, the
  sim picks from every storylet whose conditions hold, by **salience**: the one whose conditions are most specific (the
  most facts it checks) wins, ties broken by a stated order, never by chance unless the storylet says so, and then by
  the seeded random.
- **Conversations become storylets.** A conversation's steps and choices stay as they are; a step or a choice may
  carry a condition (shown only when it holds) and the facts it changes. What opens a conversation is no longer a fixed
  rule (plan T's Owner question about when the keeper talks): it is the storylets that hold.
- **Other parts read conditions too.** A behaviour rule may sense a fact (a character who likes you comes to help); a
  scene, a track or a level's look may switch on a condition (the same place looks different after the story turns).
  Each joins the sim only for a game that uses it, so no game without facts moves a hash.
- **The editor (Story).** Facts get their own list in Story; a storylet shows its conditions and what it changes in
  plain words ("Only when the player owes more than 100"; "Then: the shop is open"), never as code. The Story editor's
  spec takes this in when slice 7 starts; its map of cards stays.

## 3. Fights, turn by turn (for the record)

The Owner also chose turn-based fights, with timed presses during a move, as a game feature to support, expecting little change to the editors. The
honest reading: a turn-based fight is new content (who fights, their stats, their moves, what each move does, which
fight starts where), so it needs a format and a home in the editors. It fits the planned editors without a new one:
stats and moves on a character in **Characters**, the numbers and the timing windows of a timed press in **Feel**, which fight starts and when in **Story**
(a storylet), and the fight screen and how it is reached in **Screens** (the UI and the game's flow). It is not in any slice yet; it waits for the Owner to place it.
