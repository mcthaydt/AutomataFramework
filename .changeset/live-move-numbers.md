---
'@automataframework/framework': patch
---

An editor can change a built-in hero's numbers while the game plays: `startGame({ tunable: true })` and `game.tune({ 'jump-speed': 13 })`, sent as a `tune` command so a tuned play still records, restores and replays (a recording carries `meta.tunable`, which `automata replay` and `watchReplay` pass on). `jumpPaths` says how high and how far a jump, an air jump, a wall jump and a dash reach, by the hero's own move step. `moveNumbersOf` makes the eighteen numbers from plain values, and the headless entry exports `stepMoves` and its types.
