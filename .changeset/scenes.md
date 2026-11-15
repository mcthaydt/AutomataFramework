---
'@automataframework/framework': patch
---

A scene file holds a level's ground: nine tile shapes (slopes, half slopes, a ledge, a wall to look at) the sim and the pictures both read, and materials made of a flat paint, a tileset's tile or one of 38 CC0 photos turned into the scene's paints. `automata scene from-level` moves an old level onto a scene and it plays as it did (its recordings are made again with `automata replay --accept`), `automata art` and `automata check` paint and judge the scene's picture, and the page entry draws it (`LevelPicture.showScene`, `groundPages`, `placedTiles`). A hero walks up a slope and onto a ledge. The scenes page for agents is `skills/automata-content/scenes.md`.
