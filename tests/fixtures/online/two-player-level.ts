// The fixture game's level-1 with a second start for player 2, so a room of two has two heroes to play.
// It imports nothing, so plain Node can load it too: the fixture server (`server.ts`) uses it.

/** `levelText` is the fixture's `content/levels/level-1.json`; the result is the same level with one more start. */
export function twoPlayerLevel(levelText: string): string {
  const level = JSON.parse(levelText) as { starts: { player: number; x: number; y: number }[] }
  level.starts.push({ player: 2, x: 13.5, y: 7.5 })
  return JSON.stringify(level, null, 2)
}
