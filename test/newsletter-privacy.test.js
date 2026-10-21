// @vitest-environment node
// The Privacy policy's newsletter wording, tied to what the code and the database really do, so the page can never promise something the site does not do (SFW-233, SFW-250).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LEGAL_PAGES } from '../src/data/legalPages'
import { CONSENT_TEXT, UNCONFIRMED_DAYS } from '../src/newsletter/newsletterRules'

const read = (rel) => readFileSync(join(process.cwd(), rel), 'utf8')
const privacy = LEGAL_PAGES.find((p) => p.slug === 'privacy')
const section = (title) => privacy.sections.find((s) => s.title === title).paragraphs.join('\n')
const rows = () => section('What we collect and why').split('\n').filter((l) => l.startsWith('|')).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
const between = (src, from, to) => src.slice(src.indexOf(from), src.indexOf(to, src.indexOf(from)))

describe('what the policy says it keeps', () => {
  it('has a row for the newsletter: what, when, why and the legal reason, and the other rows are still there', () => {
    const r = rows().find((x) => /sign up for the newsletter/.test(x[1]))
    expect(r).toHaveLength(4)
    expect(r[0]).toMatch(/email address/); expect(r[0]).toMatch(/date and wording you agreed to/); expect(r[0]).toMatch(/whether and when you confirmed it/); expect(r[0]).toMatch(/if you leave, that you left/)
    expect(r[2]).toMatch(/send you the newsletter/); expect(r[2]).toMatch(/if you asked for it, the free ebook/); expect(r[2]).toMatch(/proof that you asked and confirmed/); expect(r[2]).toMatch(/nobody who has unsubscribed is emailed again/)
    expect(r[3]).toMatch(/Your consent, which you can take back at any time/); expect(r[3]).toMatch(/legitimate interest in making sure we never email someone who has asked us to stop/)
    expect(rows().filter((x) => /free ebook/.test(x[1]))).toHaveLength(1); expect(rows().filter((x) => /newsletter/.test(x[1]))).toHaveLength(1); expect(rows()).toHaveLength(12) // the heading line, the divider line, and ten rows: the newsletter and the free ebook are ONE list, so one row
  })
  it('keeps exactly what the table in the database keeps: the address, the words agreed to, when, whether confirmed, and whether they left (and no name, no phone, nothing else)', () => {
    const sql = read('sql/newsletter.sql'); const table = between(sql, 'create table if not exists public.newsletter_subscribers', 'create table if not exists public.newsletter_issues')
    for (const column of ['email', 'status', 'token', 'consent_text', 'source', 'created_at', 'confirmation_sent_at', 'confirmed_at', 'unsubscribed_at']) expect(table, column).toMatch(new RegExp(`\\n  ${column} `))
    for (const never of ['name', 'phone', 'address text', 'ip', 'user_agent', 'location']) expect(table, never).not.toMatch(new RegExp(`\\n  ${never}[ _a-z]* `))
    expect(table).toMatch(/status in \('pending', 'confirmed', 'unsubscribed'\)/)
  })
})

describe('who the policy says sends it', () => {
  it('names Resend as the one that sends the confirmation email and the newsletter, and that is the only company the code sends it through', () => {
    const t = section('Who we share your information with')
    expect(t).toMatch(/\*\*Resend\*\* sends our emails/); expect(t).toMatch(/if you sign up for the newsletter or the free ebook, the email asking you to confirm, the link to the ebook, and then the newsletter/); expect(t).not.toMatch(/our free blog posts/)
    const sends = ['lib/newsletter.js', 'lib/newsletterAdmin.js', 'lib/sendEmail.js'].map(read).join('\n')
    expect([...sends.matchAll(/https?:\/\/[a-z0-9.-]+/gi)].map((m) => m[0]).filter((u) => !/starscapesfactory\.com|db\.test/.test(u))).toEqual(expect.arrayContaining(['https://api.resend.com'])); expect(new Set([...sends.matchAll(/https:\/\/(?:api|www)\.[a-z0-9.-]+/gi)].map((m) => m[0]))).toEqual(new Set(['https://api.resend.com']))
  })
})

describe('what the policy says about leaving, confirming and how long it keeps things', () => {
  it('says nobody is added until they press the link, and the code adds them as pending and only ever sends to confirmed people', () => {
    const m = section('Marketing'); expect(m).toMatch(/If you sign up for the newsletter, or ask for the free ebook, you are saying yes to the newsletter/); expect(m).toMatch(/We first email you a link, and you are only added once you press it/)
    const pub = read('lib/newsletter.js'); expect(pub).toMatch(/status: 'pending', consent_text: consentFor\(source\)/); expect(pub).not.toMatch(/status: 'confirmed', consent_text/)
    expect(read('lib/newsletterAdmin.js')).toMatch(/newsletter_subscribers\?status=eq\.confirmed/); expect(read('lib/newsletterAdmin.js')).toMatch(/r\.newsletter_subscribers\.status === 'confirmed'/)
  })
  it('says what they agreed to in the same words as the sign-up box', () => {
    expect(CONSENT_TEXT).toMatch(/newsletter by email: new posts and news/); expect(section('Marketing')).toMatch(/new posts and news from Starscapes Factory, by email/); expect(CONSENT_TEXT).toMatch(/unsubscribe at any time/)
  })
  it('says every newsletter has an unsubscribe link, and the newsletter really does, plus the one-click header mail programs use', () => {
    expect(section('Marketing')).toMatch(/Every newsletter has a link to unsubscribe/); expect(section('Marketing')).toMatch(/unsubscribe button that many email programs show/)
    const rules = read('src/newsletter/newsletterRules.js'); expect(rules).toMatch(/Unsubscribe<\/a> at any time/); expect(read('lib/newsletterAdmin.js')).toMatch(/'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'/)
  })
  it('says someone who unsubscribes is kept, marked as unsubscribed, and the code does exactly that: it marks them, and never deletes them', () => {
    const t = section('How long we keep it'); expect(t).toMatch(/If you unsubscribe from the newsletter:\*\* we keep your email address, marked as unsubscribed, so that we never email you again by mistake/); expect(section('Marketing')).toMatch(/we keep your address, marked as unsubscribed/)
    const pub = read('lib/newsletter.js'); const leave = between(pub, 'async function unsubscribe', '// The daily tidy-up')
    expect(leave).toMatch(/status: 'unsubscribed', unsubscribed_at/); expect(leave).not.toMatch(/DELETE/)
    expect((pub.match(/method: 'DELETE'/g) || [])).toHaveLength(1) // the only delete in the public code is the tidy-up of people who never confirmed
  })
  it('says it will delete an address completely if asked, and the owner really can (the Remove button deletes the row)', () => {
    expect(section('How long we keep it')).toMatch(/If you would rather we deleted it completely, ask us and we will/); expect(section('Your rights')).toMatch(/delete your information, where we have no good reason to keep it/)
    expect(read('lib/newsletterAdmin.js')).toMatch(/newsletter_subscribers\?id=eq\.\$\{input\.id\}`, 'DELETE'/); expect(read('sql/newsletter.sql')).toMatch(/subscriber_id uuid not null references public\.newsletter_subscribers \(id\) on delete cascade/)
  })
  it('says a sign-up that is never confirmed is deleted after the number of days the daily job really uses', () => {
    const said = section('How long we keep it').match(/Newsletter and free ebook sign-ups \(they are one list\):\*\*[^\n]*?we delete your address after (\d+) days/)
    expect(said, 'the policy names the number of days').toBeTruthy(); expect(Number(said[1])).toBe(UNCONFIRMED_DAYS); expect(UNCONFIRMED_DAYS).toBe(30)
    expect(read('lib/newsletter.js')).toMatch(/UNCONFIRMED_DAYS \* 86400000/)
    const cron = JSON.parse(read('vercel.json')).crons.find((c) => c.path === '/api/ebook-signup?newsletter=tidy'); expect(cron, 'the daily job is scheduled').toBeTruthy(); expect(cron.schedule).toMatch(/^\d+ \d+ \* \* \*$/) // once a day
  })
  it('says newsletter sign-ups are kept until the person unsubscribes or asks, beside the ebook ones', () => {
    expect(section('How long we keep it')).toMatch(/Newsletter and free ebook sign-ups \(they are one list\):\*\* until you unsubscribe or ask us to delete your email address/)
  })
})

describe('the policy is still an honest draft', () => {
  it('has no new gap to fill: the only one is still the date it is published, and it is not live until the owner decides', () => {
    const text = [privacy.updated, ...privacy.intro, ...privacy.sections.flatMap((s) => s.paragraphs)].join('\n').replace(/\[[^\]\n]+\]\([^)\s]*\)/g, '')
    expect([...text.matchAll(/\[[^\]\n]+\]/g)].map((m) => m[0])).toEqual(['[date]']); expect(privacy.updated).toBe('[date]'); expect(privacy.ready).toBe(false)
  })
})
