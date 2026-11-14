// The actions the rules list and the actions the page's controls name are one list, so a play session and a player agree.
import { expect, test } from 'vitest'
import { CONTROLS } from '../../template/src/features/page/controls.ts'
import { actions } from '../../template/src/headless.ts'

test("the template's actions are the actions its controls name, in the same order", () => {
  expect([...actions]).toEqual(Object.keys(CONTROLS))
})
