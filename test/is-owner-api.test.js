// @vitest-environment node
// The server's yes-or-no answer to "is this person the owner?"
import { describe, it, expect, vi, beforeEach } from 'vitest'

// A plain stand-in for the shared owner check (not a spy: a spy reports a deliberately failing check as a failure of the test)
const guard = vi.hoisted(() => ({ impl: null, asked: 0, requireOwner: (...args) => { guard.asked += 1; return guard.impl(...args) } }))
vi.mock('../lib/ownerGuard.js', () => guard)

import handler from '../api/is-owner.js'

const call = async (req) => {
  const out = { headers: {}, status: null, body: null }
  const res = { setHeader: (k, v) => { out.headers[k] = v }, status(n) { out.status = n; return res }, json(b) { out.body = b; return res } }
  await handler(req, res)
  return out
}
const answers = (value) => { guard.impl = async () => value }
beforeEach(() => { guard.asked = 0; guard.impl = null })

describe('/api/is-owner', () => {
  it('says yes to the owner', async () => {
    answers({ ok: true, email: 'gill@example.com' })
    const out = await call({ method: 'GET', headers: { authorization: 'Bearer abc' } })
    expect(out.status).toBe(200)
    expect(out.body).toEqual({ owner: true })
  })
  it('never sends back the owner\u2019s email, or anything but the yes', async () => {
    answers({ ok: true, email: 'gill@example.com' })
    const out = await call({ method: 'GET', headers: {} })
    expect(JSON.stringify(out.body)).not.toMatch(/gill|example|@/)
    expect(Object.keys(out.body)).toEqual(['owner'])
  })
  it.each([
    ['a stranger', { ok: false, status: 403, reason: 'not_owner', message: 'These tools are for the shop owner only.' }],
    ['nobody signed in', { ok: false, status: 401, reason: 'not_signed_in', message: 'Please sign in.' }],
    ['a server that is not set up', { ok: false, status: 503, reason: 'owner_not_set', message: 'OWNER_EMAIL is not set on this deployment.' }],
    ['an empty answer from the check', undefined],
  ])('gives %s the same plain no, with no reason and no message', async (_, denial) => {
    answers(denial)
    const out = await call({ method: 'GET', headers: {} })
    expect(out.status).toBe(200)
    expect(out.body).toEqual({ owner: false })
  })
  it('says no, and does not fall over, if the check throws at once', async () => {
    guard.impl = () => { throw new Error('boom') }
    const out = await call({ method: 'GET', headers: {} })
    expect(out.status).toBe(200)
    expect(out.body).toEqual({ owner: false })
  })
  it('says no, and does not fall over, if the check fails a moment later', async () => {
    guard.impl = async () => { await new Promise((r) => setTimeout(r, 5)); throw new Error('later') }
    const out = await call({ method: 'GET', headers: {} })
    expect(out.status).toBe(200)
    expect(out.body).toEqual({ owner: false })
  })
  it('only answers to a plain request, without even asking the check', async () => {
    const post = await call({ method: 'POST', headers: {} })
    expect(post.status).toBe(405)
    expect(post.body).toEqual({ owner: false })
    expect(guard.asked).toBe(0)
  })
  it('never lets the answer be saved by the browser or anything in between', async () => {
    answers({ ok: true })
    const get = await call({ method: 'GET', headers: {} })
    expect(get.headers['Cache-Control']).toBe('no-store')
    const post = await call({ method: 'POST', headers: {} })
    expect(post.headers['Cache-Control']).toBe('no-store')
  })
})
