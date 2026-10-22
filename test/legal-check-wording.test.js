// @vitest-environment node
// The wording added after the legal check against official guidance (SFW-181, 21 October 2026): every promise is tied to the other pages or to the code, so it cannot quietly stop being true.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { LEGAL_PAGES } from '../src/data/legalPages'

const read = (rel) => readFileSync(join(process.cwd(), rel), 'utf8')
const page = (slug) => LEGAL_PAGES.find((p) => p.slug === slug)
const section = (slug, title) => page(slug).sections.find((s) => s.title === title).paragraphs.join('\n')
const everything = LEGAL_PAGES.flatMap((p) => p.sections.flatMap((s) => s.paragraphs)).join('\n')

describe('the AI promise: customers\u2019 personal details never go into AI tools, said the same way on both pages', () => {
  const ai = () => section('ai-policy', 'What I never use AI for'); const safe = () => section('privacy', 'Keeping it safe')
  it('both pages say it plainly and without exceptions: "ever"', () => {
    expect(ai()).toMatch(/\*\*Handling your information\.\*\* I do not put customers' personal details into AI tools, ever\./)
    expect(safe()).toMatch(/We do not put customers' personal details into AI tools, ever\./)
  })
  it('neither page, nor any other, softens it with an exception, or still makes the older, narrower wording', () => {
    for (const text of [ai(), safe()]) { expect(text).not.toMatch(/except where/); expect(text).not.toMatch(/only what is needed/) }
    expect(everything).not.toMatch(/I never put customers/); expect(everything).not.toMatch(/We don't put customers' personal details into AI tools/)
  })
  it('keeps the heading that matches it, and the other things it promises: no chatbot, no decisions about you, no AI reviews, no training on the work', () => {
    expect(page('ai-policy').sections.map((s) => s.title)).toContain('What I never use AI for'); const t = ai()
    for (const piece of ['I don\'t use a chatbot', 'Nothing about your order, your account or your payment is decided by an AI system', 'I don\'t use AI to write reviews or testimonials', 'I don\'t give permission for my artwork or writing to be used to train AI models']) expect(t, piece).toContain(piece)
  })
  it('is true of the site itself: nothing in its code sends anything to an AI service (the rest is how it is worked on, which the AI policy explains and the promise covers)', () => {
    const walk = (dir) => readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.(js|jsx|mjs)$/.test(e.name) ? [`${dir}/${e.name}`] : []))
    const files = [...walk('api'), ...walk('lib'), ...walk('src')]; expect(files.length).toBeGreaterThan(100)
    expect(files.filter((f) => /api\.anthropic\.com|api\.openai\.com|generativelanguage\.googleapis\.com|@anthropic-ai|from 'openai'/.test(read(f)))).toEqual([])
  })
})

describe('the Privacy policy says what the ICO checklist asks, and it matches the code', () => {
  it('says what you must give to order, and what is your choice', () => {
    const t = section('privacy', 'What we collect and why'); expect(t).toMatch(/If you order, we need your name, email, delivery address and phone number to make and deliver your order: without them we cannot\. Everything else, such as the newsletter, suggestions and votes, is your choice/)
  })
  it('names exactly what checkout asks for: an email, a delivery address and a phone number (so the sentence cannot drift from the code)', () => {
    const checkout = read('api/checkout.js'); expect(checkout).toMatch(/phone_number_collection\[enabled\]', 'true'/); expect(checkout).toMatch(/shipping_address_collection\[allowed_countries\]/)
  })
  it('gives the rule for website logs instead of a vague "short time", and the site really keeps no log of its own (no table for visits, requests or analytics)', () => {
    const k = section('privacy', 'How long we keep it'); expect(k).toMatch(/\*\*Website logs:\*\* only as long as needed to keep the site secure and fix faults\. Our hosting provider sets this, and we do not keep our own copy\./); expect(k).not.toMatch(/short time only/)
    const tables = readdirSync(join(process.cwd(), 'sql')).flatMap((f) => [...read(`sql/${f}`).matchAll(/create table if not exists public\.([a-z_]+)/g)].map((m) => m[1])); expect(tables.length).toBeGreaterThan(15)
    expect(tables.filter((t) => /log|visit|request|analytic|tracking/.test(t) && t !== 'email_requests')).toEqual([]) // email_requests is the free ebook's one-purpose requests (people who asked for something by email), not a log of visits
  })
  it('promises to acknowledge a complaint within 30 days and to say what was found, while keeping the way to the ICO', () => {
    const c = section('privacy', 'Complaints'); expect(c).toMatch(/We will acknowledge your complaint within 30 days, look into it, and tell you what we found/); expect(c).toMatch(/Information Commissioner/); expect(c).toMatch(/0303 123 1113/)
  })
  it('puts the right to object in a paragraph of its own (not only a bullet), and explains the automated decisions position (no significant automated decisions; Stripe and Cloudflare run fraud and bot checks)', () => {
    const paragraphs = page('privacy').sections.find((s) => s.title === 'Your rights').paragraphs
    expect(paragraphs.some((p) => /^You can object to us using your information where we rely on our legitimate interest\. Tell us and we will stop, unless we have a strong reason not to\./.test(p))).toBe(true)
    expect(everything).toMatch(/We do not make decisions about you with a legal or similarly significant effect by automated means/); expect(everything).toMatch(/Stripe and Cloudflare run automatic fraud and bot checks on payments and sign-ins/)
  })
})

describe('Returns: the right to cancel starts when you order', () => {
  it('says so, and still gives 14 days after delivery, the refund time, who pays the return, and the cancellation form', () => {
    const r = page('returns').sections.map((s) => s.paragraphs.join('\n')).join('\n')
    expect(r).toMatch(/You can cancel from the moment you place your order until 14 days after the day your print is delivered/); expect(r).toMatch(/\*\*To cancel:\*\* email .* in that time, with your name and order details/)
    expect(r).toMatch(/within 14 days of getting the print back/); expect(r).toMatch(/For every other print you pay the cost of sending it back/); expect(r).toMatch(/we will arrange the return for you and pay for it/); expect(page('returns').sections.map((s) => s.title)).toContain('Cancellation form')
  })
  it('keeps the 30-day right to reject a faulty print, and the line that legal rights do not stop after 30 days', () => {
    const r = section('returns', 'If your print is faulty or damaged'); expect(r).toMatch(/within 30 days of delivery/); expect(r).toMatch(/Your legal rights don't stop after 30 days/)
  })
})

describe('the Cookie policy', () => {
  it('says the law treats the browser storage like cookies and why none needs consent, instead of "they are not cookies"', () => {
    const c = section('cookies', 'What the site keeps on your device'); expect(c).toMatch(/The law treats these like cookies, and none of them needs your consent, because each is needed for something you asked the site to do/); expect(c).not.toMatch(/They are not cookies/)
  })
  it('still lists exactly the three things the site keeps, and still says there is no banner because of it', () => {
    const c = section('cookies', 'What the site keeps on your device'); for (const name of ['sb-', 'sf-cart-v1', 'sf-membership-choice']) expect(c, name).toContain(name); expect(section('cookies', 'The short version')).toMatch(/we don't show a cookie banner/)
  })
})

describe('everything is still a draft', () => {
  it('none of the five pages is switched on, each still waits for its date, and the date is the only placeholder left', () => {
    expect(LEGAL_PAGES.filter((p) => ['terms', 'privacy', 'returns', 'ai-policy', 'cookies'].includes(p.slug))).toHaveLength(5)
    for (const slug of ['terms', 'privacy', 'returns', 'ai-policy', 'cookies']) { expect(page(slug).ready, slug).toBe(false); expect(page(slug).updated, slug).toBe('[date]') }
    const gaps = new Set(LEGAL_PAGES.flatMap((p) => [p.updated, ...p.intro, ...p.sections.flatMap((s) => s.paragraphs)]).join('\n').replace(/\[[^\]\n]+\]\([^)\s]*\)/g, '').match(/\[[^\]\n]+\]/g)); expect([...gaps].sort()).toEqual(['[date]'])
  })
})
