// The commands feature's entry: numbered players, the one command a player sends (what they are holding down), and
// replays. Everything a game or another feature may use of them is exported from here.
export {
  ControlsCommand,
  commandsPlugin,
  controlsCommand,
  isHeld,
  MAX_PLAYERS,
  Player,
  wasPressed,
} from './players.ts'
