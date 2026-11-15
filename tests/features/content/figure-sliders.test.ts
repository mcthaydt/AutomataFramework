import { expect, test } from 'vitest'
import { FACE_SLIDERS, FACE_STYLES, jsonSchemaFor, PERSON_SLIDERS } from '#src/features/content/content.ts'
import { FACE_ABOUT, FACE_KEYS, FACE_NORMAL, type Slider } from '#src/features/content/figure-sliders.ts'

const all: readonly Slider[] = [...PERSON_SLIDERS, ...FACE_SLIDERS]

test('a person has these sliders, in this order', () =>
  expect(PERSON_SLIDERS.map((s) => s.id)).toEqual([
    'height',
    'build',
    'legs',
    'arms',
    'shoulders',
    'hips',
    'fat',
    'muscle',
    'head',
    'neck',
    'neckLength',
    'hands',
    'feet',
    'posture',
    'hunch',
    'headTilt',
    'age',
    'chunk',
  ]))

test('every slider has a plain sentence, a group and a normal inside its range', () => {
  for (const one of all) {
    expect(one.about, `${one.id} has a sentence`).toMatch(/^[A-Z][^.]*\.$/)
    expect(one.group, `${one.id} has a group`).toMatch(/^[a-z]+$/)
    expect(one.normal, `${one.id}'s normal is in its range`).toBeGreaterThanOrEqual(one.min)
    expect(one.normal, `${one.id}'s normal is in its range`).toBeLessThanOrEqual(one.max)
  }
  expect(new Set(all.map((s) => s.id)).size).toBe(all.length)
})

test('every slider runs from -0.2 to 1.2 but height and head tilt, and the face runs from 0 to 1', () => {
  for (const one of PERSON_SLIDERS) {
    if (one.id === 'height') expect([one.min, one.max, one.normal]).toEqual([8, 120, 24])
    else if (one.id === 'headTilt') expect([one.min, one.max, one.normal]).toEqual([-30, 30, 0])
    else expect([one.min, one.max], one.id).toEqual([-0.2, 1.2])
  }
  for (const one of FACE_SLIDERS) expect([one.min, one.max], one.id).toEqual([0, 1])
})

test('a few normals the plan names', () => {
  const normal = (id: string): number | undefined => all.find((s) => s.id === id)?.normal
  expect(normal('fat')).toBe(0.4)
  expect(normal('head')).toBe(0.6)
  expect(normal('neckLength')).toBe(0.4)
  expect(normal('hunch')).toBe(0)
  expect(normal('age')).toBe(0.3)
  expect(normal('chunk')).toBe(1)
  expect(normal('nose')).toBe(0.3)
  expect(normal('cheeks')).toBe(0.3)
  expect(normal('jaw')).toBe(0.5)
})

test('the face has these styles, each with a sentence and a normal that is one of them', () => {
  expect(FACE_STYLES).toEqual({
    eyes: ['dots', 'ovals', 'wide', 'sleepy', 'closed'],
    brows: ['none', 'soft', 'straight', 'heavy', 'arched'],
    mouth: ['none', 'line', 'smile', 'frown', 'open'],
  })
  for (const kind of ['eyes', 'brows', 'mouth'] as const) {
    expect(FACE_STYLES[kind]).toContain(FACE_NORMAL[kind])
    expect(FACE_ABOUT[kind]).toMatch(/^[A-Z].*\.$/)
  }
  expect(FACE_NORMAL).toEqual({ eyes: 'dots', brows: 'soft', mouth: 'line' })
})

test('a face is written style, then its numbers, and every key is a style or a slider', () => {
  expect(FACE_KEYS).toEqual([
    'eyes',
    'eyeSize',
    'eyeSpacing',
    'eyeTilt',
    'brows',
    'browWeight',
    'mouth',
    'nose',
    'cheeks',
    'jaw',
  ])
  const known = new Set([...Object.keys(FACE_STYLES), ...FACE_SLIDERS.map((s) => s.id)])
  expect(new Set(FACE_KEYS)).toEqual(known)
})

type Field = { description?: string; minimum?: number; maximum?: number; enum?: string[] }
type Shape = { properties: Record<string, Field & { properties?: Record<string, Field> }> }

/** The JSON Schema's fields of a rigged figure: the second shape of the figure kind. */
function riggedShape(): Shape {
  const schema = jsonSchemaFor('figure') as { oneOf?: Shape[]; anyOf?: Shape[] }
  const shape = (schema.oneOf ?? schema.anyOf ?? [])[1]
  if (shape === undefined) throw new Error('the figure schema has no second shape')
  return shape
}

test('the JSON Schema says every slider and face choice, with its sentence and its range', () => {
  const sliders = riggedShape().properties.sliders?.properties ?? {}
  expect(Object.keys(sliders)).toEqual(PERSON_SLIDERS.map((s) => s.id))
  for (const one of PERSON_SLIDERS) {
    expect(sliders[one.id]?.description, one.id).toBe(one.about)
    expect([sliders[one.id]?.minimum, sliders[one.id]?.maximum], one.id).toEqual([one.min, one.max])
  }
  const face = riggedShape().properties.face?.properties ?? {}
  expect(Object.keys(face)).toEqual([...FACE_KEYS])
  for (const one of FACE_SLIDERS) expect(face[one.id]?.description, one.id).toBe(one.about)
  expect(face.eyes?.enum).toEqual([...FACE_STYLES.eyes])
  expect(face.brows?.description).toBe(FACE_ABOUT.brows)
})
