// The design review fixes: friendly blog tags, tidy phone door list, membership margins, footer tap size, shop heading, tab titles, log-in when signed in.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { friendlyTag, hiddenFromBlog, HIDDEN_BLOG_TAGS } from '../src/pages/blogTags'
import { PAGES } from '../src/data/pageMeta'
import { LEGAL_PAGES } from '../src/data/legalPages'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')

describe('blog tags', () => {
  it('shows tags as plain words', () => {
    expect(friendlyTag('lessons-from-the-road')).toBe('Lessons from the road')
    expect(friendlyTag('  stop_motion ')).toBe('Stop motion')
    expect(friendlyTag('')).toBe('')
  })
  it('leaves out our own working and test tags', () => {
    for (const t of ['test-import', 'testing', 'repeat', 'multiple', 'factory-floor', 'archive-entries', 'TESTING', 'Archive Entry']) expect(hiddenFromBlog(t), t).toBe(true)
    for (const t of ['art', 'travel', 'lessons-from-the-road', 'poems']) expect(hiddenFromBlog(t), t).toBe(false)
    expect(HIDDEN_BLOG_TAGS).toContain('test-import')
  })
})

describe('the CSS fixes', () => {
  it('the phone door list is left-aligned with the writing filling its box', () => {
    const css = read('src/rooms/roomscene.css')
    expect(css).toMatch(/\.rs-list a,\s*\.rs-list \.is-locked \{[^}]*text-align: left/)
    expect(css).toMatch(/\.rs-list a > span,\s*\.rs-list \.is-locked > span \{[^}]*flex: 1 1 auto/)
  })
  it('the closed membership page has side margins like the other pages', () => {
    expect(read('src/membership/membership.css')).toMatch(/\.container:has\(> \.mb--closed\) \{[^}]*padding: 24px 20px 80px/)
  })
  it('footer links are at least 24 pixels tall', () => {
    expect(read('src/components/footer.css')).toMatch(/\.ft__col a \{[^}]*min-height: 24px/)
    expect(read('src/styles/site.css')).toMatch(/\.sf-footer__links a \{[^}]*min-height: 24px/)
  })
})

describe('the shop page', () => {
  it('is called Art Loft prints in its heading and its tab, with no emoji', () => {
    expect(read('src/pages/ProductGallery.jsx')).toContain('<h1>Art Loft prints</h1>')
    expect(read('src/pages/ProductGallery.jsx')).not.toContain('\u{1F3A8}')
    expect(read('src/data/pageMeta.js')).toContain("'/products': { title: 'Art Loft prints'")
  })
})

describe('tab titles match the page headings', () => {
  it('the legal pages use the same title in the tab before and after the page loads', () => {
    for (const page of LEGAL_PAGES) {
      const meta = PAGES[`/page/${page.slug}`]
      expect(meta, page.slug).toBeTruthy()
      expect(meta.title, page.slug).toBe(page.title)
    }
  })
})

describe('log in', () => {
  it('sends someone who is already signed in home instead of showing the form', () => {
    expect(read('src/App.jsx')).toMatch(/path="\/login" element=\{session \? <Navigate to="\/" replace \/> : <Login \/>\}/)
  })
})
