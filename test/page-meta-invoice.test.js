// @vitest-environment node
// The invoice page (/invoice) has a name in the tab, is kept out of search results and the sitemap, and is on the page table like the other private pages.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PAGES, IMAGES } from '../src/data/pageMeta'

describe('the invoice page in the page table', () => {
  const page = PAGES['/invoice']
  it('is there, with a plain title and description', () => {
    expect(page).toBeTruthy(); expect(page.title).toBe('Your invoice'); expect(page.description).toBe('Your invoice for your order from Starscapes Factory.')
  })
  it('is private: told not to appear in search results, as a customer\u2019s own invoice should be', () => {
    expect(page.index).toBe(false)
  })
  it('sets its own tab title as you arrive (it is one of the pages with no title of its own), and uses a share picture that exists', () => {
    expect(page.client).toBe(true); expect(IMAGES[page.image]).toBeTruthy()
  })
  it('is a real page in App.jsx (the table never names a page that does not exist)', () => {
    expect(readFileSync(join(process.cwd(), 'src/App.jsx'), 'utf8')).toMatch(/path="\/invoice"/)
  })
})
