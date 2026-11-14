// The controls the fixture game's hero plugin reads: left and right under the left thumb, jump under the right. Each
// has gamepad buttons, and keys for two people sharing one keyboard (the first person's, the second's).
import type { Controls } from '#src/features/input/input.ts'

export const fixtureControls: Controls = {
  left: {
    label: 'Left',
    keys: ['ArrowLeft', 'KeyA'],
    side: 'left',
    pad: ['dpad-left', 'left-stick-left'],
    shared: [['KeyA'], ['ArrowLeft']],
  },
  right: {
    label: 'Right',
    keys: ['ArrowRight', 'KeyD'],
    side: 'left',
    pad: ['dpad-right', 'left-stick-right'],
    shared: [['KeyD'], ['ArrowRight']],
  },
  jump: {
    label: 'Jump',
    keys: ['Space', 'ArrowUp'],
    side: 'right',
    pad: ['south'],
    shared: [['KeyW'], ['ArrowUp']],
  },
}
