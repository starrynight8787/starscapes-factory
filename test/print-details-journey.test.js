// @vitest-environment node
// How long a print takes, as the print pages say it (src/artloft/printDetails.js). Creative Hub, in writing on 20 October 2026: "The standard 6-10 working day SLA applies to both framed and
// unframed prints", and it covers production AND delivery together. These used to be added up (making days plus delivery days), which told customers 7 to 15, or 11 to 20 for a frame.
import { describe, it, expect } from 'vitest'
import { JOURNEY_DAYS, REST_OF_WORLD_DAYS, SHIPS_IN_6_TO_10, detailsFor } from '../src/artloft/printDetails.js'
import { LAUNCH_COUNTRIES } from '../src/cart/launchCountries.js'

describe('the journey, from the order to the parcel arriving', () => {
  it('is 6 to 10 working days for the whole of it, and up to 15 for countries outside the standard list', () => {
    expect(JOURNEY_DAYS).toEqual([6, 10]); expect(REST_OF_WORLD_DAYS).toBe(15)
  })
  it('is said once, the same for a framed print and an unframed one, with no making days added on top', () => {
    const framed = detailsFor({ framed: true, size_label: '60 × 80 cm' }); const plain = detailsFor({ framed: false, size_label: '30 × 40 cm' })
    expect(plain).toContain('Printed to order and delivered to you in 6 to 10 working days.')
    expect(framed).toContain('Framed to order and delivered to you in 6 to 10 working days.')
    for (const line of [...framed, ...plain]) expect(line, line).not.toMatch(/7 to 15|11 to 20|then \d+ to \d+ working days|in all/)
  })
  it('says nothing for a print with no size and finish chosen yet', () => {
    expect(detailsFor(null)).toEqual([]); expect(detailsFor(undefined)).toEqual([])
  })
})

describe('the countries the shop sells to', () => {
  it('are all ones where Creative Hub gives the standard time, so the shop never says 6 to 10 where it is longer', () => {
    for (const country of LAUNCH_COUNTRIES) expect(SHIPS_IN_6_TO_10.has(country), country).toBe(true)
  })
  it('do not include anywhere that takes up to 15 (Australia, New Zealand and the rest of the world)', () => {
    for (const country of ['AU', 'NZ', 'JP', 'BR']) expect(SHIPS_IN_6_TO_10.has(country), country).toBe(false)
  })
})
