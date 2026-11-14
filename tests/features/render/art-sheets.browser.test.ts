// Nothing is compared here: these are the pictures a person looks at. Each painted picture of the full game, four times
// its size on the level's own sky, is photographed in each real browser and kept on the `ci-screens` branch as
// `sheet-<id>.png`, so a person (or a session) can see whether the hero is a hero before a hash is recorded for it.
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { fullGamePictures } from '../../fixtures/full-game/pictures.ts'

/** The sky a level has when it names none. */
const SKY = '#9fd3f0'

for (const path of Object.keys(await fullGamePictures()).filter((name) => name.endsWith('.png'))) {
  const id = path.slice(path.lastIndexOf('/') + 1, -'.png'.length)
  test(`the picture of ${id} is photographed for a person to look at`, async () => {
    const bytes = (await fullGamePictures())[path] as Uint8Array
    const url = URL.createObjectURL(new Blob([bytes.slice()], { type: 'image/png' }))
    const holder = document.createElement('div')
    holder.style.cssText = `display:inline-block;padding:8px;background:${SKY}`
    const image = new Image()
    image.style.cssText = 'display:block;image-rendering:pixelated'
    image.src = url
    holder.append(image)
    document.body.append(holder)
    try {
      await image.decode()
      image.style.width = `${image.naturalWidth * 4}px`
      image.style.height = `${image.naturalHeight * 4}px`
      expect(image.naturalWidth).toBeGreaterThan(0)
      await page.screenshot({ element: holder, path: `__screenshots__/sheet-${id}.png` })
    } finally {
      holder.remove()
      URL.revokeObjectURL(url)
    }
  })
}
