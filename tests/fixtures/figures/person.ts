// The example rigged figures (plan R): a person as an agent writes it, and a way to change one. Files here are values, as
// a test builds them; a game that lists them is made with `gameFiles` from `../content/kind.ts`.

/** A rigged figure as written: the same keys in any order, since `writeContent` puts them in the schema's. */
export type RiggedWritten = { format: 2; id: string } & Record<string, unknown>

/** An old keeper: the framework's own palette, every slider and face choice a file may write, and one variant. */
export const keeperPerson = (): RiggedWritten => ({
  format: 2 as const,
  id: 'keeper',
  body: 'person',
  tile: 16,
  frame: { w: 32, h: 40 },
  sliders: {
    height: 30,
    build: 0.4,
    legs: 0.45,
    arms: 0.5,
    shoulders: 0.4,
    hips: 0.5,
    fat: 0.3,
    muscle: 0.5,
    head: 0.6,
    neck: 0.5,
    neckLength: 0.4,
    hands: 0.5,
    feet: 0.5,
    posture: 0.6,
    hunch: 0.1,
    headTilt: -5,
    age: 0.8,
    chunk: 1,
  },
  face: {
    eyes: 'dots',
    eyeSize: 0.5,
    eyeSpacing: 0.5,
    eyeTilt: 0.5,
    brows: 'soft',
    browWeight: 0.5,
    mouth: 'smile',
    nose: 0.3,
    cheeks: 0.3,
    jaw: 0.5,
  },
  paints: { skin: 'tan', hair: 'slate', eyes: 'bark' },
  palette: 'automata',
  outline: 'dark',
  variants: [{ id: 'two', paints: { hair: 'gold' } }],
})

/** The keeper with only what a file must have. */
export const plainPerson = (): RiggedWritten => ({
  format: 2 as const,
  id: 'keeper',
  body: 'person',
  tile: 16,
  frame: { w: 32, h: 40 },
  paints: { skin: 'tan' },
})
