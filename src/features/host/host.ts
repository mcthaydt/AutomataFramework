// The host feature's entry: the port a game talks to its surroundings through. A game never reads `document` or an
// itch or desktop API itself, so each place a game can run is one adapter behind this interface. M1 has the web (in
// the `web` feature, which needs a page).

/** What a game needs to know of where it runs. M1 needs only "is the game on screen". */
export interface Host {
  readonly target: 'web'
  /** True while the player can see the game. */
  visible(): boolean
  /** Calls `listener` whenever that changes. Returns a function that stops listening. */
  onVisibility(listener: (visible: boolean) => void): () => void
}
