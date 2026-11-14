// The screens a game is looked at on: [name, width, height]. The names are the picture files a person looks at on the
// `ci-screens` branch. Shared by every test that measures or photographs a screen.

/** Phone and tablet, upright and sideways, and a desktop window. */
export const SCREENS = [
  ['phone-390x844', 390, 844],
  ['tablet-820x1180', 820, 1180],
  ['phone-844x390', 844, 390],
  ['tablet-1180x820', 1180, 820],
  ['desktop-1280x720', 1280, 720],
] as const
