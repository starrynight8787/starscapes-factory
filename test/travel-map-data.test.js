import { describe, it, expect } from 'vitest'
import map from '../src/explorers/mapData.json'
import { COUNTRY_CODES } from '../src/atlas/atlasRules'

describe('the map drawn in the site’s own code', () => {
  it('has outlines kept in the project, not fetched from anywhere', () => {
    expect(map.w).toBe(1000)
    expect(map.countries.length).toBeGreaterThan(200)
    for (const c of map.countries) expect(c.d, c.c).toMatch(/^[MmLlHhVvCcZz0-9 .,-]+$/)
  })
  it('uses two-letter codes, once each, and covers the main countries the post form offers', () => {
    const codes = map.countries.map((c) => c.c)
    expect(new Set(codes).size).toBe(codes.length)
    for (const c of codes) expect(c).toMatch(/^[A-Z]{2}$/)
    const offered = COUNTRY_CODES.filter((c) => codes.includes(c))
    expect(offered.length).toBeGreaterThan(180) // a few tiny places in the list have no outline of their own
  })
  it('has the larger countries, and a marker for the tiny ones', () => {
    for (const c of ['GB', 'JP', 'FR', 'US', 'AU', 'BR']) expect(map.countries.some((x) => x.c === c), c).toBe(true)
    expect(map.countries.find((c) => c.c === 'SG').p).toHaveLength(2)
  })
})
