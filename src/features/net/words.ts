// What a person reads about a room, in plain words. The page decides where to show them; plan L translates these.
// Nothing here names the machinery (a socket, a tick, a seat): a drunk grandma has to know what is happening and what
// to do next.
import type { OnlineProblem } from './protocol.ts'

/** Where a page in a room is, as a person sees it. */
export type OnlineStatus =
  | { readonly state: 'waiting'; readonly code: string; readonly missing: number }
  | { readonly state: 'playing'; readonly away: readonly number[] }
  | { readonly state: 'reconnecting' }
  | { readonly state: 'ended'; readonly problem: OnlineProblem }

const ENDED: Record<OnlineProblem, string> = {
  'different-version':
    'This game is a different version from the room. Reload the page to get the newest one, then join again.',
  'room-full': 'That room is full. Start a new room, or ask for another code.',
  'no-room': 'No room has that code. Check the code and try again.',
  'server-full': 'The server has no space for another room right now. Try again in a minute.',
  'bad-room': 'That room could not be made. Check the level and the number of players.',
  'no-server': 'Could not reach the game server. Check your internet and try again.',
  lost: 'The connection was lost and could not be got back. Start or join a room to play again.',
}

/** "Player 2", "Players 1 and 3", "Players 1, 2 and 4": the same list the level's own errors use. */
function who(numbers: readonly number[]): string {
  const last = numbers[numbers.length - 1]
  return numbers.length === 1 ? `Player ${last}` : `Players ${numbers.slice(0, -1).join(', ')} and ${last}`
}

/** The plain English for a status; '' while playing with everyone here. */
export function onlineWords(status: OnlineStatus): string {
  switch (status.state) {
    case 'waiting':
      return status.missing === 1
        ? `Waiting for 1 more player. Share this code so a friend can join: ${status.code}`
        : `Waiting for ${status.missing} more players. Share this code so friends can join: ${status.code}`
    case 'playing':
      return status.away.length === 0 ? '' : `${who(status.away)} lost their connection. The game goes on.`
    case 'reconnecting':
      return 'Connection lost. Trying to get you back in.'
    case 'ended':
      return ENDED[status.problem]
  }
}
