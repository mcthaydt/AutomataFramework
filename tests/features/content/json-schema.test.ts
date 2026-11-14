import { expect, test } from 'vitest'
import { jsonSchemaFor } from '#src/features/content/content.ts'

type Described = { title?: string; properties: Record<string, { description?: string }> }

test('the JSON Schema of a level names every field, each with a description', () => {
  const schema = jsonSchemaFor('level') as Described
  expect(schema.title).toBe('Level')
  expect(Object.keys(schema.properties)).toEqual([
    'format',
    'id',
    'sky',
    'ground',
    'tiles',
    'things',
    'starts',
  ])
  for (const [name, field] of Object.entries(schema.properties)) {
    expect(field.description, `${name} has a description`).toMatch(/\w{4,}/)
  }
})

test('the JSON Schema of a character names every field, each with a description', () => {
  const schema = jsonSchemaFor('character') as Described
  expect(schema.title).toBe('Character')
  expect(Object.keys(schema.properties)).toEqual(['format', 'id', 'body', 'size', 'color', 'upright'])
  for (const [name, field] of Object.entries(schema.properties)) {
    expect(field.description, `${name} has a description`).toMatch(/\w{4,}/)
  }
})

test('a schema does not allow keys it does not know', () => {
  expect((jsonSchemaFor('level') as { additionalProperties?: unknown }).additionalProperties).toBe(false)
})
