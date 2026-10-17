// @vitest-environment node
// Sending one email through Resend: safe, plain about failures, and it never shows the key.
import { describe, it, expect, vi } from 'vitest'
import { sendEmail, isEmailAddress, FROM } from '../lib/sendEmail'
import { CONTACT_EMAIL } from '../src/data/contact'

const KEY = 're_secretkey_1234567890abcdefghijklmnop'
const env = { RESEND_API_KEY: KEY }
const msg = { to: 'jane@example.com', subject: 'Hello', text: 'plain', html: '<p>html</p>' }
const answer = (status, body) => vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }))

describe('sendEmail', () => {
  it('sends nothing, and says why, when there is no key', async () => {
    const fetchImpl = vi.fn()
    const out = await sendEmail(msg, { env: {}, fetchImpl })
    expect(out).toMatchObject({ ok: false, reason: 'no_key' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('sends to Resend over https, from the contact address, with replies coming to the contact address', async () => {
    const fetchImpl = answer(200, { id: 'abc' })
    const out = await sendEmail({ ...msg, idempotencyKey: 'order-confirmation-cs_1' }, { env, fetchImpl })
    expect(out).toEqual({ ok: true, id: 'abc' })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe(`Bearer ${KEY}`)
    expect(init.headers['Idempotency-Key']).toBe('order-confirmation-cs_1')
    const body = JSON.parse(init.body)
    expect(body.from).toBe(FROM)
    expect(FROM).toContain(CONTACT_EMAIL)
    expect(body.reply_to).toBe(CONTACT_EMAIL)
    expect(body.to).toEqual(['jane@example.com'])
  })
  it('refuses a bad address, or one that could add a header line, without calling Resend', async () => {
    for (const to of ['', 'nobody', 'a@b', 'a b@example.com', 'a@example.com\r\nBcc: x@y.com', 'a@example.com,b@example.com', '<a@example.com>']) {
      const fetchImpl = vi.fn()
      const out = await sendEmail({ ...msg, to }, { env, fetchImpl })
      expect(out.ok).toBe(false)
      expect(fetchImpl).not.toHaveBeenCalled()
    }
    expect(isEmailAddress('jane@example.com')).toBe(true)
  })
  it('refuses a subject with a line break in it, or an empty message', async () => {
    const fetchImpl = vi.fn()
    expect((await sendEmail({ ...msg, subject: 'Hi\r\nBcc: x@y.com' }, { env, fetchImpl })).ok).toBe(false)
    expect((await sendEmail({ ...msg, text: '' }, { env, fetchImpl })).ok).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
  it('says what Resend refused, in a few words, and never shows the key', async () => {
    const out = await sendEmail(msg, { env, fetchImpl: answer(403, { message: `The domain is not verified for ${KEY}` }) })
    expect(out).toMatchObject({ ok: false, reason: 'refused' })
    expect(out.detail).toMatch(/403/)
    expect(JSON.stringify(out)).not.toContain(KEY)
    expect(JSON.stringify(out)).not.toMatch(/re_secret/)
  })
  it('says so plainly when Resend cannot be reached, and never throws', async () => {
    const out = await sendEmail(msg, { env, fetchImpl: vi.fn(async () => { throw new Error(`boom ${KEY}`) }) })
    expect(out).toMatchObject({ ok: false, reason: 'unreachable' })
    expect(JSON.stringify(out)).not.toContain(KEY)
  })
  it('treats a yes with no email id as a failure, because nothing is known to have been sent', async () => {
    const out = await sendEmail(msg, { env, fetchImpl: answer(200, {}) })
    expect(out.ok).toBe(false)
  })
})
