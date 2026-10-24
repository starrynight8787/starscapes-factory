// @vitest-environment node
// Writing one page's own words into its HTML.
import { describe, it, expect } from 'vitest'
import { renderHead, fileFor, sitemapXml, esc } from '../scripts/shareHead.mjs'

const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script type="module" src="/assets/app.js"></script>
    <title>Old title</title>
    <meta name="description" content="Old description" />
  </head>
  <body><div id="root"></div></body>
</html>
`
const meta = { title: 'The Idea Hatchery | Starscapes Factory', description: 'Where ideas get tested.', siteName: 'Starscapes Factory', url: 'https://starscapesfactory.com/idea-hatchery', imageUrl: 'https://starscapesfactory.com/share/idea-hatchery.png', imageAlt: 'A lab bench.' }
const count = (html, needle) => html.split(needle).length - 1

describe('renderHead', () => {
  it('writes the title, description, address and share picture for sharing sites and search engines', () => {
    const html = renderHead(SHELL, { ...meta, imageWidth: 1200, imageHeight: 630 }) // sizes are only written when they are given (see test/print-pages-pinterest.test.js)
    expect(html).toContain('<title>The Idea Hatchery | Starscapes Factory</title>')
    expect(html).toContain('<meta name="description" content="Where ideas get tested." />')
    expect(html).toContain('<link rel="canonical" href="https://starscapesfactory.com/idea-hatchery" />')
    for (const tag of ['og:title', 'og:description', 'og:url', 'og:image"', 'og:image:alt', 'og:site_name', 'og:type']) expect(html, tag).toContain(`property="${tag.replace(/"$/, '')}"`)
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
    expect(html).toContain('content="https://starscapesfactory.com/share/idea-hatchery.png"')
    expect(html).toContain('og:image:width" content="1200"')
    expect(html).toContain('og:image:height" content="630"')
  })
  it('replaces the old title and description instead of adding to them, so there is only one of each', () => {
    const html = renderHead(SHELL, meta)
    expect(html).not.toContain('Old title')
    expect(html).not.toContain('Old description')
    expect(count(html, '<title>')).toBe(1)
    expect(count(html, 'name="description"')).toBe(1)
  })
  it('keeps everything else in the page exactly as it was', () => {
    const html = renderHead(SHELL, meta)
    for (const keep of ['<meta charset="UTF-8" />', 'name="viewport"', '<script type="module" src="/assets/app.js"></script>', '<div id="root"></div>']) expect(html).toContain(keep)
  })
  it('gives the same result when run twice, so a rebuild can never pile tags up', () => {
    const once = renderHead(SHELL, meta)
    expect(renderHead(once, meta)).toBe(once)
  })
  it('tells search engines to leave a private page out, and says nothing of the kind for a public one', () => {
    expect(renderHead(SHELL, { ...meta, index: false })).toContain('<meta name="robots" content="noindex" />')
    expect(renderHead(SHELL, meta)).not.toContain('noindex')
    expect(renderHead(renderHead(SHELL, { ...meta, index: false }), meta)).not.toContain('noindex')
  })
  it('writes no address at all for a page that has none (the home page, which is also the fallback for every unlisted address)', () => {
    const html = renderHead(SHELL, { ...meta, url: undefined })
    expect(html).not.toContain('rel="canonical"')
    expect(html).not.toContain('og:url')
  })
  it('escapes quotes and angle brackets, so words from the table can never break the page', () => {
    const html = renderHead(SHELL, { ...meta, title: 'A "quoted" <b>title</b> & more', description: `It's "odd" <script>` })
    expect(html).not.toContain('<b>')
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('A &quot;quoted&quot; &lt;b&gt;title&lt;/b&gt; &amp; more')
    expect(esc(null)).toBe('')
  })
  it('adds the site icon and the theme colour', () => {
    const html = renderHead(SHELL, meta)
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/icons/star.svg" />')
    expect(html).toContain('<link rel="icon" type="image/png" sizes="32x32" href="/icons/star-32.png" />')
    expect(html).toContain('<meta name="theme-color" content="#14306A" />')
  })
  it('refuses a page with no head, rather than quietly doing nothing', () => {
    expect(() => renderHead('<html><body></body></html>', meta)).toThrow(/no <\/head>/)
  })
})

describe('where each page is written, and the sitemap', () => {
  it('writes the home page to index.html and every other page to its own folder', () => {
    expect(fileFor('/')).toBe('index.html')
    expect(fileFor('/art-loft')).toBe('art-loft/index.html')
    expect(fileFor('/factory-floor/floor')).toBe('factory-floor/floor/index.html')
  })
  it('lists addresses in a sitemap, with anything odd escaped', () => {
    const xml = sitemapXml(['https://a.example/x', 'https://a.example/y?a=1&b=2'])
    expect(xml).toContain('<loc>https://a.example/x</loc>')
    expect(xml).toContain('a=1&amp;b=2')
    expect(xml).toMatch(/^<\?xml/)
  })
})
