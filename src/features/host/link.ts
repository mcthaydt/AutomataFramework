// The one rule about links every host shares: a game may send the player to a plain web page and nothing else. Ported
// from the first attempt as it was, so a link is refused the same way on the web, on a desktop and in a test.

/** The longest address a host will be asked to open; a longer one is a mistake or a trick. */
const MAX_LINK_LENGTH = 2048

/** True for an `https:` address with a host name and no user name or password, of at most 2048 characters. */
export function isOpenableLink(url: string): boolean {
  if (url.length > MAX_LINK_LENGTH) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  return (
    parsed.protocol === 'https:' && parsed.hostname !== '' && parsed.username === '' && parsed.password === ''
  )
}
