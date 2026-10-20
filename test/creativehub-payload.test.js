// @vitest-environment node
// The order sent to Creative Hub (lib/creativehubOrders.js, buildPayload): the delivery address in particular. Their field for the second address line is delivery_line2, confirmed in writing on 20 October 2026.
import { describe, it, expect } from 'vitest'
import { buildPayload, LINE2_FIELD, LIMITS } from '../lib/creativehubOrders.js'

const order = (address = {}, extra = {}) => ({
  customer_name: 'Jane Smith', customer_phone: '+44 7700 900123',
  items: [{ ch_variant_id: 'var_123', qty: 1 }],
  shipping: { name: 'Jane Smith', address: { line1: '1 High Street', city: 'Leeds', state: 'West Yorkshire', postal_code: 'LS1 1AA', country: 'gb', ...address } },
  ...extra,
})

describe('the second address line', () => {
  it('goes in its own field, delivery_line2, as Creative Hub confirmed, and the first line stays as it is', () => {
    expect(LINE2_FIELD).toBe('delivery_line2')
    const r = buildPayload(order({ line2: 'Flat 2' }))
    expect(r.ok).toBe(true)
    expect(r.payload.delivery_line1).toBe('1 High Street'); expect(r.payload.delivery_line2).toBe('Flat 2')
  })
  it('is left out when there is none (no empty field is sent)', () => {
    const p = buildPayload(order()).payload
    expect(Object.keys(p)).not.toContain('delivery_line2'); expect(p.delivery_line1).toBe('1 High Street')
    expect(Object.keys(buildPayload(order({ line2: '   ' })).payload)).not.toContain('delivery_line2')
  })
  it('is never joined onto the first line any more (that was only a stopgap until the field name was known)', () => {
    expect(buildPayload(order({ line2: 'Flat 2' })).payload.delivery_line1).not.toContain('Flat 2')
  })
  it('is tidied: extra spaces and line breaks become single spaces, and it is kept to a sensible length', () => {
    expect(buildPayload(order({ line2: '  Flat\n 2,   Block  B ' })).payload.delivery_line2).toBe('Flat 2, Block B')
    expect(buildPayload(order({ line2: 'x'.repeat(500) })).payload.delivery_line2.length).toBeLessThanOrEqual(LIMITS.text)
  })
})

describe('the rest of the delivery address', () => {
  it('sends the name, first line, town, country in capitals, postcode, county and phone under Creative Hub\u2019s own names', () => {
    const p = buildPayload(order({ line2: 'Flat 2' })).payload
    expect(p).toMatchObject({ delivery_name: 'Jane Smith', delivery_line1: '1 High Street', delivery_line2: 'Flat 2', delivery_city: 'Leeds', delivery_country_code: 'GB', delivery_postcode: 'LS1 1AA', delivery_county: 'West Yorkshire' })
    expect(p.delivery_phone).toBeTruthy(); expect(p.items).toEqual([{ variant_id: 'var_123', quantity: 1 }])
  })
  it('refuses an order with no delivery name, no first line, no town, or no real country, saying which', () => {
    expect(buildPayload(order({}, { customer_name: '', shipping: { address: { line1: 'x', city: 'y', country: 'GB' } } }))).toMatchObject({ ok: false })
    expect(buildPayload(order({ line1: '' }))).toMatchObject({ ok: false, message: expect.stringMatching(/first line/) })
    expect(buildPayload(order({ city: '' }))).toMatchObject({ ok: false, message: expect.stringMatching(/town or city/) })
    for (const country of ['', 'GBR', 'G', '12']) expect(buildPayload(order({ country })), country).toMatchObject({ ok: false, message: expect.stringMatching(/country/) })
  })
  it('never sends the customer\u2019s email address (the field is optional and deliberately not sent: SFW-17)', () => {
    expect(Object.keys(buildPayload(order({}, { customer_email: 'jane@example.com' })).payload)).not.toContain('delivery_email')
  })
})
