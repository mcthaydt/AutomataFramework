// The level file as an author writes it: 16 tiles wide, 3 tall, one crate and one start.
type ExampleLevel = {
  format: number
  id: string
  tiles: string[]
  things: { id: string; character: string; x: number; y: number }[]
  starts: { player: number; x: number; y: number }[]
}
export const exampleLevel = (): ExampleLevel => ({
  format: 1,
  id: 'level-1',
  tiles: ['................', '................', '################'],
  things: [{ id: 'crate-1', character: 'crate', x: 8.5, y: 1.5 }],
  starts: [{ player: 1, x: 2.5, y: 1.5 }],
})
