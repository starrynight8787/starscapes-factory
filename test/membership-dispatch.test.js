// @vitest-environment node
// Which membership requests are "a member's own passes" (handled in lib/membershipAccount.js) and which are "start a payment" (the rest of api/membership-checkout.js).
import { describe, it, expect } from 'vitest'
import { isAccountRequest } from '../lib/membershipAccount.js'

describe('telling an account request from a payment', () => {
  it('knows a GET for the card (account=1), and not a GET for a promo code or the open check', () => {
    expect(isAccountRequest({ method: 'GET', query: { account: '1' } })).toBe(true)
    for (const query of [{ code: 'WELCOME' }, {}, undefined, { account: '0' }, { account: 'yes' }]) expect(isAccountRequest({ method: 'GET', query }), JSON.stringify(query)).toBe(false)
  })
  it('knows a POST that names portal, resume or change, in an object or as text', () => {
    for (const action of ['portal', 'resume', 'change']) { expect(isAccountRequest({ method: 'POST', body: { action } })).toBe(true); expect(isAccountRequest({ method: 'POST', body: JSON.stringify({ action }) })).toBe(true) }
  })
  it('leaves everything else to the payment: no action, an unknown action, nonsense, an oversized body, or any other method', () => {
    for (const body of [{ passes: ['blueprints'], interval: 'month', consent: true }, { action: 'delete' }, { action: ['portal'] }, 'not json', null, undefined, 42, JSON.stringify({ action: 'portal', pad: 'x'.repeat(5000) })]) {
      expect(isAccountRequest({ method: 'POST', body }), JSON.stringify(body)).toBe(false)
    }
    expect(isAccountRequest({ method: 'DELETE', body: { action: 'portal' } })).toBe(false); expect(isAccountRequest({ method: 'PUT', query: { account: '1' } })).toBe(false); expect(isAccountRequest(null)).toBe(false)
  })
})
