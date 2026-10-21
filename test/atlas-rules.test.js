// The Star Atlas rules (src/atlas/atlasRules.js): what get_my_atlas() is made into, the rooms, and the Story Ledger mapping.
import { describe, it, expect } from 'vitest'
import { ATLAS_ROOMS, STARTER_STAMPS, atlasRoomFor, cleanAtlas, galaxyPercent, litStars, stampsLine, missingStarter, allStarterEarned, earnsFirstChapters, isCountryCode, countryOptions, WORDS } from '../src/atlas/atlasRules'

describe('the rooms', () => {
  it('are the eight stamp rooms with the planet counts from the brief, and no Factory Floor', () => {
    expect(ATLAS_ROOMS.map((r) => [r.room, r.total])).toEqual([['knowledge-nook', 12], ['explorers-bay', 12], ['story-ledger', 12], ['drafting-desk', 12], ['art-loft', 6], ['idea-hatchery', 12], ['sarah-jrs-den', 2], ['leadership-lounge', 3]])
    expect(ATLAS_ROOMS.find((r) => r.room === 'factory-floor')).toBeUndefined()
  })
  it('maps the site’s story-ledger door inside knowledge-nook to the atlas room story-ledger, and leaves the rest alone', () => {
    expect(atlasRoomFor('knowledge-nook', 'story-ledger')).toBe('story-ledger')
    expect(atlasRoomFor('knowledge-nook', 'book-club')).toBe('knowledge-nook')
    expect(atlasRoomFor('explorers-bay', undefined)).toBe('explorers-bay')
    expect(atlasRoomFor('factory-floor', undefined)).toBeNull()
  })
})

describe('cleanAtlas', () => {
  it('turns the database answer into plain numbers, with every room present', () => {
    const a = cleanAtlas({ year: 2026, galaxy: 'The Milky Way', stardust_needed: 100, stardust_earned: 42, is_paid: true, has_country: true, starter: ['joined'], rooms: { 'knowledge-nook': 7, 'art-loft': '2' } })
    expect(a).toMatchObject({ year: 2026, galaxy: 'The Milky Way', needed: 100, earned: 42, isPaid: true, hasCountry: true, starter: ['joined'] })
    expect(a.rooms['knowledge-nook']).toBe(7)
    expect(a.rooms['art-loft']).toBe(2)
    expect(a.rooms['story-ledger']).toBe(0)
  })
  it('copes with a missing galaxy and odd numbers, and says null for nothing', () => {
    expect(cleanAtlas({ galaxy: null, stardust_needed: 'x', stardust_earned: -4 })).toMatchObject({ galaxy: 'Your galaxy', needed: 100, earned: 0, isPaid: false, hasCountry: false, starter: [] })
    expect(cleanAtlas(null)).toBeNull()
  })
})

describe('the numbers', () => {
  it('fills the galaxy bar from stardust earned and never past 100', () => {
    expect(galaxyPercent(42, 100)).toBe(42)
    expect(galaxyPercent(250, 100)).toBe(100)
    expect(galaxyPercent(0, 100)).toBe(0)
  })
  it('never lights more stars than a room has', () => {
    expect(litStars(9, 6)).toBe(6)
    expect(litStars(-1, 6)).toBe(0)
    expect(stampsLine(7, 12)).toBe('7 of 12 stamps')
    expect(stampsLine(5, 2)).toBe('2 of 2 stamps')
  })
})

describe('the starter stamps', () => {
  it('are Joined, First country and First three chapters, with the keys the database uses', () => {
    expect(STARTER_STAMPS.map((s) => s.key)).toEqual(['joined', 'first-country', 'first-chapters'])
    expect(missingStarter(['joined'])).toEqual(['first-country', 'first-chapters'])
    expect(allStarterEarned(['joined', 'first-country', 'first-chapters'])).toBe(true)
  })
  it('are earned for chapter 3 only', () => {
    expect([1, 2, 3, 4].map(earnsFirstChapters)).toEqual([false, false, true, false])
  })
})

describe('countries and wording', () => {
  it('only accepts a listed two-letter code', () => {
    expect(isCountryCode('GB')).toBe(true)
    expect(isCountryCode('gb')).toBe(false)
    expect(isCountryCode('ZZ')).toBe(false)
    expect(isCountryCode("GB'; drop table")).toBe(false)
    expect(countryOptions().length).toBeGreaterThan(190)
  })
  it('keeps the Figma wording for what unlocks with a pass', () => {
    expect(WORDS.badgesFree).toBe('Badges unlock with a pass.')
    expect(WORDS.galaxiesNote(2026)).toBe('2026 filling. 2027 opens 1 January.')
  })
})
