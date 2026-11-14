// A game may open a web page outside itself, but only a plain `https:` address: the one rule every host shares, so a
// bad address is refused the same way on the web, on a desktop and in a test.
import { expect, test } from 'vitest'
import { isOpenableLink } from '#src/features/host/host.ts'

test('an https address can be opened', () => {
  expect(isOpenableLink('https://example.com/a?b=c')).toBe(true)
})

test('nothing else can', () => {
  for (const bad of [
    'http://example.com',
    'javascript:alert(1)',
    'data:text/html,x',
    'example.com',
    '',
    'https://',
    'https://name:word@example.com',
    'https://name@example.com',
    `https://example.com/${'a'.repeat(2049)}`,
  ])
    expect(isOpenableLink(bad), JSON.stringify(bad.slice(0, 40))).toBe(false)
  // The limit is 2048 characters in all, not 2048 after the host.
  expect(isOpenableLink(`https://example.com/${'a'.repeat(2048 - 'https://example.com/'.length)}`)).toBe(true)
})
