// Opens a fresh page of the sounding game's sound (`page.ts`), the way `openPage` opens the saves page.
import { openPage } from '../saves/open-page.ts'
import type { AudioPage } from './page.ts'

const AUDIO_PAGE_URL = new URL('./page.ts', import.meta.url).href

/** A new page (frame) of `size` with the sounding game's audio; `close` removes it. */
export function openAudioPage(
  size: { width: number; height: number } = { width: 390, height: 844 },
): Promise<{ page: AudioPage; close(): void }> {
  return openPage<AudioPage>(size, AUDIO_PAGE_URL)
}
