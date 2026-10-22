import { describe, it, expect } from 'vitest'
import { cleanCountry, cleanYear, cleanAdviceUrl, travelPayload, travelChanges, travelProblems, bodyBlocks, photoLine, photoProblems, scaledSize, byCountry, yearsLine, countryName, isLesson, photoSource } from '../src/explorers/travelRules'

describe('country, year and advice link', () => {
  it('accepts two capital letters from the list and nothing else', () => {
    expect(cleanCountry('gb')).toBe('GB')
    expect(cleanCountry(' JP ')).toBe('JP')
    for (const bad of ['', 'ZZ', 'GBR', '1A', null, undefined, 5]) expect(cleanCountry(bad)).toBe('')
    expect(countryName('JP')).toBe('Japan')
    expect(countryName('nope')).toBe('')
  })
  it('accepts a four digit year from 1950 to next year', () => {
    expect(cleanYear('2019', 2026)).toBe(2019)
    expect(cleanYear(2027, 2026)).toBe(2027)
    for (const bad of ['', '19', '2028', '1949', 'abcd', null]) expect(cleanYear(bad, 2026)).toBeNull()
  })
  it('keeps only a secure address with a real host', () => {
    expect(cleanAdviceUrl('https://www.gov.uk/foreign-travel-advice/japan')).toBe('https://www.gov.uk/foreign-travel-advice/japan')
    for (const bad of ['http://gov.uk', 'javascript:alert(1)', 'https://user:pw@gov.uk', 'https://localhost', 'https://a b.com', '', null, 'gov.uk']) expect(cleanAdviceUrl(bad)).toBe('')
  })
  it('saves the fields only for Explorer’s Bay posts, and only those filled in', () => {
    expect(travelPayload('knowledge-nook', { country: 'GB' })).toEqual({})
    expect(travelPayload('explorers-bay', {})).toEqual({})
    expect(travelPayload('explorers-bay', { country: 'jp', year: '2023', advice: 'https://www.gov.uk/x' })).toEqual({ country: 'JP', year_visited: 2023, advice_url: 'https://www.gov.uk/x' })
    expect(travelChanges('explorers-bay', { country: '', year: '', advice: '' })).toEqual({ country: null, year_visited: null, advice_url: null })
    expect(travelChanges('art-loft', { country: 'JP' })).toEqual({})
  })
  it('explains each problem in plain words, and asks a lesson for its country', () => {
    expect(travelProblems({ channel: 'art-loft', tags: ['lessons-from-the-road'] })).toEqual({})
    expect(travelProblems({ channel: 'explorers-bay', tags: ['Lessons from the road'.replace(/ /g, '-')], country: '' }).country).toMatch(/needs its country/)
    expect(travelProblems({ channel: 'explorers-bay', tags: [], country: 'ZZ' }).country).toMatch(/Choose a country/)
    expect(travelProblems({ channel: 'explorers-bay', tags: [], year: '23' }).year).toMatch(/four digits/)
    expect(travelProblems({ channel: 'explorers-bay', tags: [], advice: 'http://x.com' }).advice).toMatch(/https/)
    expect(travelProblems({ channel: 'explorers-bay', tags: ['writing-in-transit'] })).toEqual({})
  })
})

describe('photos inside an article', () => {
  it('turns a photo line into a photo with its description, and the rest into paragraphs', () => {
    const text = `First part.\n\n${photoLine('https://x.supabase.co/a.jpg', 'A market stall at dusk')}\n\nSecond part.`
    expect(bodyBlocks(text)).toEqual([
      { type: 'text', text: 'First part.' },
      { type: 'photo', url: 'https://x.supabase.co/a.jpg', alt: 'A market stall at dusk' },
      { type: 'text', text: 'Second part.' },
    ])
  })
  it('never shows a photo without a description or with an unusable address, and never shows the code', () => {
    const text = '[photo: https://x.co/a.jpg | ]\n[photo: javascript:alert(1) | hi]\n[photo: broken\nreal words'
    expect(bodyBlocks(text)).toEqual([{ type: 'text', text: 'real words' }])
    expect(photoSource('//evil.com/x.jpg')).toBe('')
    expect(photoSource('/images/a.jpg')).toBe('/images/a.jpg')
  })
  it('tells the editor which photo lines would not show', () => {
    expect(photoProblems('[photo: https://x.co/a.jpg | ok]')).toEqual([])
    expect(photoProblems('[photo: https://x.co/a.jpg | ]')[0]).toMatch(/description/)
    expect(photoProblems('[photo: http://x.co/a.jpg | hi]')[0]).toMatch(/address/)
    expect(photoProblems('[photo: oops')[0]).toMatch(/not written/)
  })
  it('keeps a description from breaking the line, and draws photos no larger than 2000 px', () => {
    expect(photoLine('https://x.co/a.jpg', 'a ] b\nc')).toBe('[photo: https://x.co/a.jpg | a b c]')
    expect(scaledSize(4000, 3000)).toEqual({ width: 2000, height: 1500 })
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 })
    expect(scaledSize(0, 5)).toEqual({ width: 0, height: 0 })
  })
})

describe('the map’s countries', () => {
  const posts = [
    { id: 1, tags: ['lessons-from-the-road'], country: 'JP', year_visited: 2023 },
    { id: 2, tags: ['lessons-from-the-road'], country: 'JP', year_visited: 2019 },
    { id: 3, tags: ['writing-in-transit'], country: 'JP' },
    { id: 4, tags: ['writing-in-transit'], country: null },
    { id: 5, tags: ['lessons-from-the-road'], country: 'FR', year_visited: 2021 },
  ]
  it('groups pieces by country, sorts the years, and leaves out posts with no country', () => {
    const g = byCountry(posts)
    expect(Object.keys(g).sort()).toEqual(['FR', 'JP'])
    expect(g.JP.years).toEqual([2019, 2023])
    expect(g.JP.lessons.map((p) => p.id)).toEqual([1, 2])
    expect(g.JP.writing.map((p) => p.id)).toEqual([3])
    expect(isLesson(posts[4])).toBe(true)
  })
  it('says the years in words', () => {
    expect(yearsLine([])).toBe('')
    expect(yearsLine([2019])).toBe('Visited 2019')
    expect(yearsLine([2019, 2023])).toBe('Visited 2019 and 2023')
    expect(yearsLine([2017, 2019, 2023])).toBe('Visited 2017, 2019 and 2023')
  })
})
