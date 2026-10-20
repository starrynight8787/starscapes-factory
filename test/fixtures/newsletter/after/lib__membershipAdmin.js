// The owner's admin requests about memberships: "Passes and members" (and, later, "Promotions"). Handled here, not in a function of its own, because the free
// Vercel plan allows 12 functions and all 12 are used: api/membership-checkout.js hands anything with ?admin=... to this file, like the member's own account
// requests (lib/membershipAccount.js) and the daily reminders (lib/membershipReminders.js).
//
// Every request here is locked to the owner (OWNER_EMAIL in Vercel) before anything is read. Only the owner ever sees members' email addresses, which come from
// the sign-in system (they are not in the memberships table), and a member's full account id is never sent to the browser.
import { requireOwner, sendDenied } from './ownerGuard.js'
import { databaseUrl, serviceKeys, serviceFetch, saidWhat } from './serviceKey.js'
import { stripeMode } from './membershipStripe.js'
import { accountView } from '../src/membership/account.js'
import { handlePromotions } from './promotionsAdmin.js'
import { handleNewsletterAdmin } from './newsletterAdmin.js'
import { cleanPassIds } from '../src/membership/passes.js'

const clean = (v) => String(v || '').trim()
const COLUMNS = 'user_id,status,passes,billing_interval,current_period_end,cancel_at_period_end,offer_ends_at,offer_note,created_at,updated_at,stripe_customer_id'
const MAX_MEMBERS = 1000
const PAGE = 1000
const MAX_PAGES = 5

export const isAdminRequest = (req) => Boolean(req && req.query && typeof req.query.admin === 'string' && req.query.admin !== '')

// The email addresses of the people who have signed in, by account id. Never throws: if the sign-in system cannot be asked just now, the page still shows the members
// and says the addresses are missing (ok is false).
export async function fetchEmails() {
  const byId = {}
  try {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const response = await serviceFetch(`/auth/v1/admin/users?page=${page}&per_page=${PAGE}`, { headers: { Accept: 'application/json' } })
      if (!response || !response.ok) return { byId, ok: false }
      const body = await response.json()
      const users = Array.isArray(body && body.users) ? body.users : []
      for (const u of users) if (u && u.id && u.email) byId[u.id] = String(u.email)
      if (users.length < PAGE) return { byId, ok: true }
    }
    return { byId, ok: true }
  } catch (e) {
    return { byId, ok: false }
  }
}

// A membership row, as the page needs it. Only what the page shows: the account id is cut to a short label, and the Stripe customer id is only kept if it looks like one.
export function shapeMember(row, emailById = {}) {
  const id = clean(row && row.user_id)
  const customer = clean(row && row.stripe_customer_id)
  return {
    ref: id.slice(0, 8),
    email: emailById[id] || '',
    status: clean(row && row.status),
    view: accountView(row),
    passes: cleanPassIds(row && row.passes),
    interval: row && row.billing_interval === 'year' ? 'year' : 'month',
    periodEnd: (row && row.current_period_end) || null,
    cancelling: Boolean(row && row.cancel_at_period_end),
    offerEndsAt: (row && row.offer_ends_at) || null,
    offerNote: clean(row && row.offer_note) || null,
    since: (row && row.created_at) || null,
    updated: (row && row.updated_at) || null,
    customer: /^cus_[A-Za-z0-9]+$/.test(customer) ? customer : '',
  }
}

export const shapeMembers = (rows, emailById) => (Array.isArray(rows) ? rows : []).map((r) => shapeMember(r, emailById))

async function members(res) {
  if (!databaseUrl() || serviceKeys().length === 0) {
    return res.status(503).json({ ok: false, message: 'No server database key is set on this deployment, so the members cannot be read. In Vercel, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is needed.' })
  }
  let rows
  try {
    const response = await serviceFetch(`/rest/v1/memberships?select=${COLUMNS}&order=updated_at.desc&limit=${MAX_MEMBERS}`, { headers: { Accept: 'application/json' } })
    if (!response.ok) {
      const why = await saidWhat(response)
      return res.status(502).json({ ok: false, message: `The members could not be read just now${why ? ` (${why})` : ''}. Please try again in a moment.` })
    }
    rows = await response.json()
  } catch (e) {
    return res.status(502).json({ ok: false, message: 'The members could not be read just now. Please try again in a moment.' })
  }
  const emails = await fetchEmails()
  return res.status(200).json({
    ok: true,
    mode: stripeMode(process.env.STRIPE_SECRET_KEY),
    emails_ok: emails.ok,
    members: shapeMembers(rows, emails.byId),
  })
}

export async function handleAdmin(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const who = await requireOwner(req)
  if (!who.ok) return sendDenied(res, who)
  if (clean(req.query && req.query.admin) === 'promotions') return handlePromotions(req, res) // codes can be made as well as looked at
  if (clean(req.query && req.query.admin) === 'newsletter') return handleNewsletterAdmin(req, res, who) // the newsletter can be written and sent as well as looked at
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, message: 'This can only be looked at here.' })
  }
  const what = clean(req.query && req.query.admin)
  if (what === 'members') return members(res)
  return res.status(404).json({ ok: false, message: 'That is not something the admin can do yet.' })
}
