// The actions the rules list and the actions the hero's controls name are one list, so a play session and a player
// agree. The controls are in the hero's tuning file now, not in code.
import { expect, test } from 'vitest'
import { actions } from '../../template/src/headless.ts'
import { loadTemplateGame } from './game.ts'

test("the template's actions are the actions its tuning file's controls name, in the same order", async () => {
  const tuning = (await loadTemplateGame()).tunings?.['hero-moves']
  expect([...actions]).toEqual((tuning?.controls ?? []).map((control) => control.action))
})
