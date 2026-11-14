// "Add a player": waiting for people to pick up a gamepad. Each open invite offers a free pad once, when a button on it
// goes down after the invite opened. A pad that only just appeared with a button down counts as that press, since a
// browser shows a pad to a page only once a button on it is pressed: the press that makes it appear is the person's "I
// want to play" and must not have to be made twice.
import { PAD_BUTTONS, type PadInput } from '../commands/commands.ts'

type Held = ReadonlyMap<number, ReadonlySet<PadInput>>

const BUTTON_NAMES: ReadonlySet<string> = new Set(PAD_BUTTONS)

export interface Invites {
  /** Starts an invite from what is held now. Returns the function that stops it. */
  open(onPad: (pad: number) => void, held: Held): () => void
  /** Reads one frame. Returns the pads whose press an invite took, so a menu does not also hear it. */
  step(held: Held, free: (pad: number) => boolean): Set<number>
}

interface Open {
  readonly onPad: (pad: number) => void
  readonly offered: Set<number>
  before: Held
}

export function createInvites(): Invites {
  const open = new Set<Open>()
  return {
    open(onPad, held) {
      const invite: Open = { onPad, offered: new Set(), before: held }
      open.add(invite)
      return () => open.delete(invite)
    },
    step(held, free) {
      const taken = new Set<number>()
      for (const invite of [...open]) {
        const before = invite.before
        invite.before = held
        for (const [pad, now] of held) {
          if (invite.offered.has(pad)) continue
          const was = before.get(pad)
          // Only a button counts: a stick is leaned on by accident.
          const pressed = [...now].some((input) => BUTTON_NAMES.has(input) && !was?.has(input))
          if (!pressed || !free(pad)) continue
          invite.offered.add(pad)
          taken.add(pad)
          if (open.has(invite)) invite.onPad(pad)
        }
      }
      return taken
    },
  }
}
