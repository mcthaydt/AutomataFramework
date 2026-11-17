import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// The `gate` job is the one aggregate check main requires: it must know every other job, or a new job could fail
// without turning it red.
const ci = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8')
const jobs = ci.slice(ci.indexOf('\njobs:'))
const names = [...jobs.matchAll(/^ {2}([a-z][a-z-]*):$/gm)].map((m) => m[1] ?? '')
const gate = jobs.slice(jobs.indexOf('\n  gate:'))
const others = names.filter((name) => name !== 'gate')

test('the gate needs every other job', () => {
  const needs = gate.match(/^ {4}needs: \[(.*)\]$/m)?.[1]?.split(', ') ?? []
  expect(needs.toSorted()).toEqual(others.toSorted())
})

test('the gate says for every job whether it applies', () => {
  const applies = gate.match(/APPLIES: >-\n\s+(\{.*\})$/m)?.[1] ?? ''
  const listed = [...applies.matchAll(/"([a-z-]+)":/g)].map((m) => m[1] ?? '')
  expect(listed.toSorted()).toEqual(others.toSorted())
})

test('the gate always runs, and only a draft calls it quick', () => {
  expect(gate).toMatch(/^ {4}if: always\(\)$/m)
  expect(gate).toContain("name: ${{ needs.plan.outputs.quick == 'quick ' && 'quick ' || '' }}gate")
})
