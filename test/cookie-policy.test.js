// @vitest-environment node
// The Cookie policy page (added 20 October 2026) says exactly what the site stores on a visitor's device and which other companies it loads things from.
// These tests tie that page to the code, so it cannot quietly become untrue: add a new kind of storage, a new outside service, a cookie or an analytics tool,
// and a test here fails until the page (and the Privacy policy's short cookies section) says so.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { LEGAL_PAGES } from '../src/data/legalPages'
import { PAGES } from '../src/data/pageMeta'

const root = process.cwd()
const read = (p) => readFileSync(join(root, p), 'utf8')
const walk = (dir) => readdirSync(join(root, dir)).flatMap((n) => { const rel = `${dir}/${n}`; return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel] })
const sources = walk('src').filter((f) => /\.(js|jsx)$/.test(f))
const styles = walk('src').filter((f) => f.endsWith('.css'))
const server = [...walk('api'), ...walk('lib')].filter((f) => f.endsWith('.js'))
const cookies = LEGAL_PAGES.find((p) => p.slug === 'cookies')
const privacy = LEGAL_PAGES.find((p) => p.slug === 'privacy')
const policy = cookies.sections.flatMap((s) => s.paragraphs).join('\n')
const withText = (needle, files) => files.filter((f) => read(f).includes(needle))

describe('the page itself', () => {
  it('is there, with a title, a date to fill in, and its sections', () => {
    expect(cookies.title).toBe('Cookie policy'); expect(cookies.updated).toBe('[date]')
    expect(cookies.sections.map((s) => s.title)).toEqual(['The short version', 'What the site keeps on your device', 'What other companies set or see', "What we don't use", 'Your choices', 'If this changes'])
  })
  it('has no gap but the date, and no contact address typed by hand (it points to the Contact page, so the address lives in one place)', () => {
    expect(JSON.stringify(cookies.sections)).not.toMatch(/@|\[[A-Z ]+\]/); expect(policy).toContain('(/page/contact)')
  })
  it('is linked from the footer, from the Privacy policy, and is kept out of search results until it is ready', () => {
    expect(read('src/components/Footer.jsx')).toContain("['Cookie policy', '/page/cookies']")
    expect(privacy.sections.find((s) => s.title === 'Cookies and similar technologies').paragraphs.join(' ')).toContain('(/page/cookies)')
    expect(PAGES['/page/cookies']).toMatchObject({ title: 'Cookie policy', index: false })
  })
})

describe('what the site keeps on a visitor\u2019s device: the page names all of it', () => {
  it('uses browser storage in exactly two places, the cart and the passes choice (and nothing else, anywhere in the site)', () => {
    const using = sources.filter((f) => /\b(localStorage|sessionStorage|indexedDB)\b|document\.cookie/.test(read(f))).sort()
    expect(using).toEqual(['src/cart/cartStore.js', 'src/membership/MembershipPage.jsx'])
  })
  it('keeps the cart in local storage under sf-cart-v1, and the passes choice in session storage under sf-membership-choice, as the page says', () => {
    expect(read('src/cart/cartStore.js')).toMatch(/STORAGE_KEY = 'sf-cart-v1'/); expect(read('src/cart/cartStore.js')).toContain('window.localStorage')
    expect(read('src/membership/MembershipPage.jsx')).toMatch(/CHOICE_KEY = 'sf-membership-choice'/); expect(read('src/membership/MembershipPage.jsx')).toContain('window.sessionStorage')
    expect(policy).toContain('**sf-cart-v1**'); expect(policy).toContain('**sf-membership-choice**')
    expect(policy).toMatch(/local storage/); expect(policy).toMatch(/session storage/)
  })
  it('keeps the sign-in where the library puts it by default (local storage, a name starting sb- and ending -auth-token): the client has no storage or cookie options', () => {
    expect(read('src/supabaseClient.js')).toContain('createClient(supabaseUrl, supabaseAnonKey)')
    expect(policy).toContain('starts **sb-**'); expect(policy).toContain('ends **-auth-token**')
  })
  it('puts nothing about the person in the cart (so "not your name or address" stays true)', () => {
    const cart = read('src/cart/cartStore.js'); expect(cart).not.toMatch(/\b(email|address|phone|name:)\b/i)
  })
  it('sets no cookie from the server either (so "the site itself sets no cookies" stays true)', () => {
    expect(server.filter((f) => /set-cookie/i.test(read(f)))).toEqual([]); expect(policy).toContain('The site itself sets no cookies')
  })
})

describe('what other companies set or see: the page names each one, and nothing else is loaded', () => {
  it('loads nothing from outside in index.html (no scripts, no stylesheets, no tracking snippets)', () => {
    expect(read('index.html')).not.toMatch(/https?:\/\//)
  })
  it('uses no analytics, advertising or tracking tool: not in the packages, not in the code', () => {
    const pkg = JSON.parse(read('package.json')); const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ')
    expect(deps).not.toMatch(/analytics|speed-insights|gtag|googletagmanager|plausible|posthog|sentry|hotjar|mixpanel|segment|fullstory|clarity|pixel|amplitude|matomo/i)
    expect(sources.filter((f) => /gtag\(|fbq\(|ttq\.|googletagmanager|plausible|hotjar|posthog|mixpanel|fullstory|clarity\.ms|connect\.facebook|platform\.twitter|static\.ads/i.test(read(f)))).toEqual([])
    expect(policy).toContain("We don't use advertising cookies, analytics, visitor tracking")
  })
  it('names Google Fonts if (and only if) the site fetches its fonts from Google (if the fonts are ever hosted on this site, take that line out of the page)', () => {
    const fromGoogle = [...withText('fonts.googleapis.com', styles), ...withText('fonts.googleapis.com', sources)].length > 0
    expect(policy.includes('**Google Fonts.**'), 'the page and the code disagree about Google Fonts').toBe(fromGoogle)
    expect(JSON.stringify(privacy.sections.find((s) => s.title === 'Cookies and similar technologies')).includes('fonts from Google'), 'the Privacy policy and the code disagree about Google Fonts').toBe(fromGoogle)
  })
  it('loads no other outside stylesheet or font than the one the page names', () => {
    const hosts = styles.flatMap((f) => [...read(f).matchAll(/(?:@import\s+url\(|url\()\s*['"]?(https?:\/\/[^/'")]+)/g)].map((m) => m[1]))
    expect([...new Set(hosts)].filter((h) => h !== 'https://fonts.googleapis.com')).toEqual([])
  })
  it('shows an outside video only inside YouTube\u2019s privacy-enhanced player, and only the page\u2019s two kinds of frame exist', () => {
    const frames = sources.flatMap((f) => [...read(f).matchAll(/<iframe[^>]*src=\{?[`'"]([^`'"]+)/g)].map((m) => m[1]))
    expect(frames.length).toBeGreaterThan(0)
    for (const src of frames) expect(src, src).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\//)
    expect(sources.filter((f) => /youtube\.com\/embed/.test(read(f)))).toEqual([])
    expect(policy).toContain('Nothing loads from YouTube until you press play'); expect(policy).toContain('privacy-enhanced player')
  })
  it('sends people to Stripe\u2019s own page to pay (no Stripe code runs inside our pages), as the page says', () => {
    const pkg = JSON.parse(read('package.json')); expect(Object.keys(pkg.dependencies)).not.toContain('@stripe/stripe-js')
    expect(sources.filter((f) => /js\.stripe\.com|loadStripe|@stripe\/stripe-js/.test(read(f)))).toEqual([])
    expect(policy).toContain('you leave our site for Stripe\u2019s own page'.replace('\u2019', "'"))
  })
})
