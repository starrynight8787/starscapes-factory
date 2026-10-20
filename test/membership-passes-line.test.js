// @vitest-environment node
// The line a member sees on the checkout page, the receipt and the invoice names WHICH passes they pay for (Gill, 20 October 2026: the invoice said only "4 passes").
import { describe, it, expect, vi } from 'vitest'
import { passesLineName, productIdFor, ensureProduct, buildCheckoutForm, PRODUCT_ID } from '../lib/membershipStripe.js'
import { PASSES } from '../src/membership/passes.js'

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) })
const user = { id: 'u1', email: 'a@b.co' }
const form = (passes, interval = 'month') => buildCheckoutForm({ user, passes, interval, consentAt: '2026-10-20T10:00:00Z', returnTo: 'https://starscapesfactory.com', vatRateId: 'txr_1abc' })

describe('the name of the line', () => {
  it('lists the passes in the order they are drawn, with commas and "and"', () => {
    expect(passesLineName(['blueprints'])).toBe('Starscapes Factory pass: Blueprints')
    expect(passesLineName(['blueprints', 'authors-notebook'])).toBe("Starscapes Factory passes: The Author's Notebook and Blueprints")
    expect(passesLineName(['book-club', 'come-write-with-me', 'blueprints', 'early-drafts'])).toBe('Starscapes Factory passes: Early drafts and book background, Come Write With Me, Blueprints and Book Club')
    expect(passesLineName(PASSES.map((p) => p.id))).toBe("Starscapes Factory passes: The Author's Notebook, Early drafts and book background, Come Write With Me, Blueprints and Book Club")
  })
  it('names each pass once, and only real ones (anything made up is thrown away)', () => {
    expect(passesLineName(['blueprints', 'blueprints', 'made-up'])).toBe('Starscapes Factory pass: Blueprints')
    expect(passesLineName([])).toBe('Starscapes Factory passes'); expect(passesLineName(null)).toBe('Starscapes Factory passes')
  })
  it('is short enough for Stripe, even with all five', () => {
    expect(passesLineName(PASSES.map((p) => p.id)).length).toBeLessThan(200)
  })
  it('is on the checkout line, with a plain second line saying how often it is billed', () => {
    const f = form(['authors-notebook', 'blueprints', 'book-club'])
    expect(f.get('line_items[0][price_data][product_data][name]')).toBe("Starscapes Factory passes: The Author's Notebook, Blueprints and Book Club")
    expect(f.get('line_items[0][price_data][product_data][description]')).toBe('Billed every month.')
    expect(form(['blueprints'], 'year').get('line_items[0][price_data][product_data][description]')).toBe('Billed every year.')
  })
  it('no longer says only a count ("4 passes")', () => {
    expect(form(['authors-notebook', 'early-drafts', 'come-write-with-me', 'blueprints']).get('line_items[0][price_data][product_data][name]')).not.toMatch(/\d passes?$/)
  })
})

describe('the product used when passes are changed', () => {
  it('has one id for one set of passes, however it is given, and a different id for another set', () => {
    expect(productIdFor(['blueprints', 'authors-notebook'])).toBe('starscapes-passes-authors-notebook-blueprints')
    expect(productIdFor(['authors-notebook', 'blueprints'])).toBe(productIdFor(['blueprints', 'authors-notebook']))
    expect(productIdFor(['blueprints'])).not.toBe(productIdFor(['book-club']))
  })
  it('is made active and named for the passes, once', async () => {
    const fn = vi.fn(async () => json({ id: 'x' }))
    await expect(ensureProduct('sk_test_x', fn, ['blueprints', 'book-club'])).resolves.toBe('starscapes-passes-blueprints-book-club')
    expect(fn).toHaveBeenCalledTimes(1); const [url, init] = fn.mock.calls[0]; const f = new URLSearchParams(init.body)
    expect(url).toBe('https://api.stripe.com/v1/products'); expect([f.get('id'), f.get('name'), f.get('active')]).toEqual(['starscapes-passes-blueprints-book-club', 'Starscapes Factory passes: Blueprints and Book Club', 'true'])
  })
  it('is reused if it exists, and made active again with the current name (a pass may have been renamed)', async () => {
    const calls = []
    const fn = vi.fn(async (url, init) => { calls.push([url, new URLSearchParams(init.body)]); return calls.length === 1 ? json({ error: { code: 'resource_already_exists' } }, 400) : json({ id: 'x' }) })
    await expect(ensureProduct('sk_test_x', fn, ['blueprints'])).resolves.toBe('starscapes-passes-blueprints')
    expect(calls[1][0]).toBe('https://api.stripe.com/v1/products/starscapes-passes-blueprints'); expect([calls[1][1].get('name'), calls[1][1].get('active')]).toEqual(['Starscapes Factory pass: Blueprints', 'true'])
  })
  it('says so plainly if it cannot be made or updated, and never goes on without a product', async () => {
    await expect(ensureProduct('sk_test_x', async () => json({ error: { message: 'no' } }, 403), ['blueprints'])).rejects.toThrow()
    let n = 0; await expect(ensureProduct('sk_test_x', async () => (++n === 1 ? json({ error: { code: 'resource_already_exists' } }, 400) : json({ error: { message: 'no' } }, 403)), ['blueprints'])).rejects.toThrow()
  })
  it('refuses an empty set of passes', async () => {
    await expect(ensureProduct('sk_test_x', async () => json({ id: 'x' }), [])).rejects.toThrow(/no passes/)
    await expect(ensureProduct('sk_test_x', async () => json({ id: 'x' }), ['made-up'])).rejects.toThrow(/no passes/)
  })
  it('still makes the one general product when no passes are given (as before)', async () => {
    const fn = vi.fn(async () => json({ id: 'x' })); await expect(ensureProduct('sk_test_x', fn)).resolves.toBe(PRODUCT_ID)
    expect(new URLSearchParams(fn.mock.calls[0][1].body).get('name')).toBe('Starscapes Factory passes')
  })
})
