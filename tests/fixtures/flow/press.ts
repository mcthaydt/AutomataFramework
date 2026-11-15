// The press that starts a level (plan Q, Task 7a). A level on the flow's page stands still until the player presses
// something after it appears; a journey that only wants the level moving calls this once it shows.
import type { Drive } from './drive.ts'
import { TICK } from './page.ts'

/** A key nobody has bound goes down and up, after a frame, as a person's first press does. */
export function pressToStart(drive: Drive): void {
  drive.frames.advance(TICK)
  drive.key('keydown', 'F13')
  drive.key('keyup', 'F13')
  drive.frames.advance(TICK)
}
