import { expect, test } from 'vitest'
import { type ContentType, jsonSchemaFor } from '#src/features/content/content.ts'

type Described = { title?: string; properties: Record<string, { description?: string }> }

test('the JSON Schema of a level names every field, each with a description', () => {
  const schema = jsonSchemaFor('level') as Described
  expect(schema.title).toBe('Level')
  expect(Object.keys(schema.properties)).toEqual([
    'format',
    'id',
    'tileset',
    'sky',
    'ground',
    'tiles',
    'things',
    'starts',
    'joints',
  ])
  for (const [name, field] of Object.entries(schema.properties)) {
    expect(field.description, `${name} has a description`).toMatch(/\w{4,}/)
  }
})

test('the JSON Schema of a character names every field, each with a description', () => {
  const schema = jsonSchemaFor('character') as Described
  expect(schema.title).toBe('Character')
  expect(Object.keys(schema.properties)).toEqual([
    'format',
    'id',
    'body',
    'size',
    'color',
    'upright',
    'kind',
    'behaviour',
    'tuning',
    'touch',
  ])
  for (const [name, field] of Object.entries(schema.properties)) {
    expect(field.description, `${name} has a description`).toMatch(/\w{4,}/)
  }
})

test('a schema does not allow keys it does not know', () => {
  expect((jsonSchemaFor('level') as { additionalProperties?: unknown }).additionalProperties).toBe(false)
})

/** A kind's schema: its title, its fields in order, a description on every field, and no keys it does not know. */
function expectSchema(type: ContentType, title: string, fields: string[]): void {
  const schema = jsonSchemaFor(type) as Described & { additionalProperties?: unknown }
  expect(schema.title).toBe(title)
  expect(Object.keys(schema.properties)).toEqual(fields)
  for (const [name, field] of Object.entries(schema.properties))
    expect(field.description, `${type}.${name} has a description`).toMatch(/\w{4,}/)
  expect(schema.additionalProperties).toBe(false)
}

test('the JSON Schema of a tileset', () =>
  expectSchema('tileset', 'Tileset', ['format', 'id', 'image', 'tileSize', 'columns', 'tiles']))

test('the JSON Schema of a behaviour', () =>
  expectSchema('behaviour', 'Behaviour', ['format', 'id', 'rules']))

test('the JSON Schema of a tuning', () =>
  expectSchema('tuning', 'Tuning', ['format', 'id', 'numbers', 'controls']))

test('the JSON Schema of a feel', () =>
  expectSchema('feel', 'Feel', ['format', 'id', 'on', 'dust', 'shake', 'freeze']))

test('the JSON Schema of a sound, a track and a list of cues', () => {
  expectSchema('sound', 'Sound', ['format', 'id', 'volume', 'voices'])
  expectSchema('music', 'Music', ['format', 'id', 'tempo', 'stepsPerBeat', 'volume', 'loop', 'parts'])
  expectSchema('cues', 'Cues', ['format', 'id', 'cues'])
})

test('the JSON Schema of messages, a conversation and a cutscene', () => {
  expectSchema('messages', 'Messages', ['format', 'id', 'messages'])
  expectSchema('conversation', 'Conversation', ['format', 'id', 'start', 'nodes'])
  expectSchema('cutscene', 'Cutscene', ['format', 'id', 'level', 'length', 'camera', 'actors', 'lines'])
})
