// @vitest-environment node
// The legal pages update of 22 October 2026 (SFW-181, the review against free official guidance): what changed, and the rails that keep it true.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { LEGAL_PAGES } from '../src/data/legalPages'
import { LARGE_FRAMED_SIZES, LARGE_FRAMED_RETURN } from '../src/data/returns'
import { ACRYLIC_SIZES_CM } from '../src/artloft/printDetails'
import { buildConfirmation, buildSections, RETURN, COMPANY } from '../lib/orderEmailText'
import { CONTACT_EMAIL } from '../src/data/contact'
import { DRAFT } from './legalState'

const read = (p) => fs.readFileSync(p, 'utf8')
const page = (slug) => LEGAL_PAGES.find((p) => p.slug === slug)
const sec = (slug, startsWith) => { const s = page(slug).sections.find((x) => x.title.startsWith(startsWith)); if (!s) throw new Error(`no section starting "${startsWith}" in ${slug}`); return s.paragraphs.join('\n') }
const whole = (slug) => [page(slug).intro.join('\n'), ...page(slug).sections.map((s) => s.paragraphs.join('\n'))].join('\n')
const everything = () => LEGAL_PAGES.map((p) => whole(p.slug)).join('\n')
const order = { stripe_session_id: 'cs_test_a1B2c3D4e5F6g7H8', livemode: false, created_at: '2026-10-17T10:00:00Z', customer_name: 'Jane Smith', customer_email: 'jane@example.com', shipping: { name: 'Jane Smith', address: { line1: '1 High Street', city: 'Leeds', postal_code: 'LS1 1AA', country: 'GB' } }, amount_total: 14900, currency: 'gbp', items: [{ title: 'Forests', description: '30 × 40 cm, unframed', qty: 1, unit_amount: 14900 }] }
const sourceFiles = (dir) => fs.readdirSync(dir, { recursive: true }).map(String).filter((f) => /\.jsx?$/.test(f) && !/\.test\./.test(f)).map((f) => path.join(dir, f))

describe('large framed prints: Gill arranges and pays for the return (D5)', () => {
  it('"large" means exactly the three acrylic sizes, and the wording is built from the same list the print pages use', () => {
    expect(ACRYLIC_SIZES_CM).toEqual([[59.4, 84.1], [60, 80], [70, 100]]) // if this list changes, this wording must be re-read, so this test says so
    expect(LARGE_FRAMED_SIZES).toBe('A1, 60 x 80 cm and 70 x 100 cm')
  })
  it('the sentence says what it will do, and for every other print the customer pays', () => {
    expect(LARGE_FRAMED_RETURN).toMatch(/^For framed prints in the large sizes \(A1, 60 x 80 cm and 70 x 100 cm\), we will arrange the return for you and pay for it, so please don't send one back yourself\. For every other print you pay the cost of sending it back$/)
  })
  it('the Returns page uses that sentence, keeps "email us first", and the old "you pay" / "can cost a lot" wording is gone', () => {
    const t = sec('returns', 'If you change your mind')
    expect(t).toContain(`${LARGE_FRAMED_RETURN}, and you are responsible for it until it reaches us`); expect(t).toContain('email us first')
    expect(t).not.toMatch(/can cost a lot to post back/); expect(t).not.toMatch(/You pay the cost of sending it back, and/)
  })
  it('the order confirmation email says the same sentence (one source for both), and no longer says "You pay the cost of sending it back." on its own', () => {
    expect(RETURN.largeFramedNote).toBe(`${LARGE_FRAMED_RETURN}.`)
    const { text } = buildConfirmation(order); expect(text).toContain(`${LARGE_FRAMED_RETURN}.`); expect(text).not.toMatch(/(^|\. )You pay the cost of sending it back\./m)
    expect(read('lib/orderEmailText.js')).toMatch(/from '\.\.\/src\/data\/returns\.js'/); expect(read('src/data/legalPages.js')).toMatch(/from '\.\/returns'/)
  })
})

describe('the cancellation form on the Returns page is the official wording, the same as in the email', () => {
  const form = () => page('returns').sections.find((s) => s.title === 'Cancellation form').paragraphs.find((p) => p.startsWith('>'))
  const emailForm = () => buildSections(order).find((s) => s.heading === 'Model cancellation form').form.join('\n').replaceAll('[*]', '(*)')
  it.each(['hereby give notice that I / We (*) cancel my / our contract of sale of the following goods (*)', 'Ordered on (*) / received on (*)', 'Name of consumer(s)', 'Address of consumer(s)', 'Signature of consumer(s) (only if this form is sent on paper)', 'Delete as appropriate'])('both say: %s', (phrase) => {
    expect(form()).toContain(phrase); expect(emailForm()).toContain(phrase)
  })
  it('names the trader, its address and its email, the address being the same one the email and the Terms give', () => {
    expect(form()).toContain('To Starscapes Factory Ltd'); expect(form()).toContain(COMPANY.office); expect(form()).toContain(`mailto:${CONTACT_EMAIL}`); expect(sec('terms', 'About us')).toContain(COMPANY.office)
  })
  it('its blanks are in round brackets, so the owner banner does not count them as gaps (only the link has square brackets)', () => {
    expect(form().replace(/\[[^\]]*\]\([^)]*\)/g, '')).not.toMatch(/[[\]]/)
  })
})

describe('Returns: refunds, cancelling before delivery, and what is claimed about the print studio', () => {
  it('a refund for a faulty print is given within 14 days of agreeing it is owed', () => { expect(sec('returns', 'If your print is faulty')).toContain('within 14 days of agreeing that you are entitled to it') })
  it('cancelling BEFORE the print is posted is covered, and we confirm the cancellation by email', () => {
    const t = sec('returns', 'If you change your mind'); expect(t).toContain('If you cancel before your print has been posted, we will refund you within 14 days of you telling us.'); expect(t).toContain('We will email you to confirm we have received your cancellation.')
  })
  it('claims nothing about the print studio photographing orders (Creative Hub has not confirmed it: SFW-252), and says it will check with the studio', () => {
    const t = sec('returns', "If your print isn't what you ordered"); expect(t).toContain('We will check your order with the print studio.'); expect(t).not.toMatch(/photos taken at the print studio|compare your photos|before your order was packed/)
  })
})

describe('Terms', () => {
  it('names the print studio by its legal name, the same way as the Privacy policy, and "The Print Space" is nowhere', () => {
    expect(sec('terms', 'What we sell')).toContain('Creative Hub (the trading name of Printspace Studios Limited)'); expect(sec('privacy', 'Who we share')).toContain('Printspace Studios Limited'); expect(everything()).not.toMatch(/The Print Space/)
  })
  it('"a long time" is now 30 days', () => { const t = sec('terms', 'Events outside our control'); expect(t).toContain('more than 30 days'); expect(t).not.toMatch(/a long time/) })
  it('a change to the terms that affects passes already held needs 30 days\' email notice and the right to cancel', () => { expect(sec('terms', 'Changes to these terms')).toContain('we will email you at least 30 days before the change applies, and you can cancel before then') })
})

describe('Privacy, Cookie and AI policy: Cloudflare and the other corrections', () => {
  it('Privacy names Cloudflare as a recipient (the Turnstile bot check) and abroad, in the technical-details row, and in the cookies section', () => {
    expect(sec('privacy', 'Who we share')).toMatch(/\*\*Cloudflare\*\* runs the security check \(called Turnstile\)/); expect(sec('privacy', 'Sending information abroad')).toContain('and Cloudflare, which runs our security check')
    expect(sec('privacy', 'What we collect')).toContain("the signals Cloudflare's security check reads from your browser"); const c = sec('privacy', 'Cookies and similar'); expect(c).toContain('a security check from Cloudflare also runs'); expect(c).not.toMatch(/All three are kept on your own device/)
  })
  it('the Cookie policy says Cloudflare may keep something in the browser, on three pages only, and does NOT say it leaves nothing (Chrome showed it stores data)', () => {
    const t = whole('cookies'); expect(sec('cookies', 'What other companies')).toMatch(/\*\*Cloudflare \(security check\)\.\*\* On the sign-up, log-in and forgot-password pages only/); expect(t).toContain('a cookie or browser storage')
    expect(t).not.toMatch(/does not leave a cookie|leaves nothing|no cookies from Cloudflare/i); expect(sec('cookies', 'The short version')).toContain('a security check from Cloudflare may keep something too'); expect(t).not.toMatch(/Because the three things below/)
  })
  it('both policies name the same three pages', () => { for (const t of [whole('privacy'), whole('cookies')]) expect(t).toContain('sign-up, log-in and forgot-password pages') })
  it('Privacy: backups are kept 3 months; automated decisions are explained (Stripe and Cloudflare fraud and bot checks); complaints can be made any way', () => {
    expect(sec('privacy', 'How long we keep it')).toContain('we delete old ones after 3 months'); const r = sec('privacy', 'Your rights'); expect(r).toContain('Stripe and Cloudflare run automatic fraud and bot checks'); expect(r).not.toContain('We do not use automated decision-making or profiling.')
    expect(sec('privacy', 'Complaints')).toContain('You can complain to us in any way you like, including by email or through our social media pages.')
  })
  it('the AI policy says the fraud and bot checks are Stripe\'s and Cloudflare\'s systems, not the shop\'s', () => { expect(sec('ai-policy', 'What I never use AI for')).toContain('(Stripe and Cloudflare run automatic fraud and bot checks. Those are their systems, working under their own policies.)') })
})

describe('GUARDS: the conditions for needing no consent banner for the bot check', () => {
  it('if the site loads anything from challenges.cloudflare.com, the Cookie policy and the Privacy policy name Cloudflare; if it does not, they do not claim it', () => {
    const loads = sourceFiles('src').some((f) => read(f).includes('challenges.cloudflare.com'))
    expect(/Cloudflare/.test(whole('cookies'))).toBe(loads); expect(/Cloudflare/.test(whole('privacy'))).toBe(loads)
  })
  it('the bot check is on the Sign up, Log in and Forgot password pages ONLY (never site-wide, never on the Clubhouse)', () => {
    const users = sourceFiles('src').filter((f) => /import\s+CaptchaCheck\b|from\s+['"][^'"]*CaptchaCheck['"]/.test(read(f))).map((f) => path.basename(f)).sort()
    expect(users).toEqual(['ForgotPassword.jsx', 'Login.jsx', 'Signup.jsx'])
  })
})

describe('the state of the five pages (SFW-186)', () => {
  it('no stray placeholder in any page, in either state: the only square-bracket gap is [date], and only while a page is a draft', () => {
    const strays = [...everything().matchAll(/\[([^\]]*)\](?!\()/g)].map((m) => m[1]); expect(strays).toEqual([])
    for (const p of LEGAL_PAGES) expect(p.updated === '[date]', p.slug).toBe(p.ready !== true)
  })
  it.runIf(DRAFT)('while they are drafts: all five are not ready, each still waits for its date', () => {
    for (const p of LEGAL_PAGES) { expect(p.ready, p.slug).toBe(false); expect(p.updated, p.slug).toBe('[date]') }
  })
})
