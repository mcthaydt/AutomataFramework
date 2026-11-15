// What a collider's `shape` may hold: the three Rapier shapes and the three of ours, and nothing between.
import { expect, test } from 'vitest'
import { checkCollider } from '#src/features/physics/checks.ts'
import { ShapeKind } from '#src/features/physics/physics.ts'

test('every ShapeKind is accepted', () => {
  for (const shape of Object.values(ShapeKind))
    expect(() => checkCollider(7, 'physics.collider', shape, 1, 1)).not.toThrow()
})

test('a code that is not a ShapeKind is refused with the sentence that names the entity and the field', () => {
  expect(() => checkCollider(7, 'physics.collider', 3, 1, 1)).toThrow(
    'entity 7: physics.collider.shape is 3; expected a ShapeKind (0..2)',
  )
  expect(() => checkCollider(7, 'physics.collider', 19, 1, 1)).toThrow('entity 7: physics.collider.shape is 19')
})

test('a slope and a ledge need both sizes positive, as a box does', () => {
  for (const shape of [ShapeKind.slopeUp, ShapeKind.slopeDown, ShapeKind.ledge]) {
    expect(() => checkCollider(7, 'physics.collider', shape, 0, 1)).toThrow('physics.collider.hx is 0')
    expect(() => checkCollider(7, 'physics.collider', shape, 1, 0)).toThrow('physics.collider.hy is 0')
  }
})
