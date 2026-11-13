// The controls the fixture game's hero plugin reads: left and right under the left thumb, jump under the right.
import type { Controls } from '#src/features/input/input.ts'

export const fixtureControls: Controls = {
  left: { label: 'Left', keys: ['ArrowLeft', 'KeyA'], side: 'left' },
  right: { label: 'Right', keys: ['ArrowRight', 'KeyD'], side: 'left' },
  jump: { label: 'Jump', keys: ['Space', 'ArrowUp'], side: 'right' },
}
