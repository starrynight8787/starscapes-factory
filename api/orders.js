// Vercel serverless function: the owner's list of orders, for the publish page. Locked to the shop owner.
import { requireOwner, sendDenied } from '../lib/ownerGuard.js'
import { databaseUrl, serviceKeys, serviceFetch, saidWhat } from '../lib/serviceKey.js'
import { buildInvoice, isSessionId } from '../lib/invoiceData.js'

const COLUMNS = 'id,created_at,status,livemode,stripe_payment_intent,customer_name,customer_email,shipping,amount_total,currency,items,creativehub_order_id,creativehub_status,note'
// Added later (sql/orders-creativehub.sql). If that has not been run yet, the list is read without them rather than not at all.
const EXTRA = 'creativehub_order_number,creativehub_due,creativehub_checked_at,sent_at'
// Added later still (sql/orders-confirmation.sql): whether the customer's confirmation email went.
const CONFIRMATION = 'confirmation_status,confirmation_note,confirmation_sent_at'
// And the "your order has been posted" email (sql/orders-dispatch.sql).
const DISPATCH = 'dispatch_status,dispatch_note,dispatch_sent_at,tracking_url,tracking_number'
// And the "we have received your payment" and "we could not accept your order" notices, and when a refund was recorded (sql/orders-notices.sql).
const NOTICES = 'notice_kind,notice_status,notice_note,notice_sent_at,refunded_at'

// A customer's own invoice, found by the Stripe session id from their thank-you page or confirmation email. Open to anyone holding that id (it cannot be guessed),
// and it only ever returns what belongs on an invoice.
async function invoice(req, res) {
  const id = String(req.query && req.query.invoice ? req.query.invoice : '')
  if (!isSessionId(id)) return res.status(400).json({ ok: false, message: 'That is not an invoice link.' })
  if (!databaseUrl() || serviceKeys().length === 0) return res.status(503).json({ ok: false, message: 'Invoices are not available just now. Please try again soon.' })
  try {
    const response = await serviceFetch(`/rest/v1/orders?stripe_session_id=eq.${encodeURIComponent(id)}&select=stripe_session_id,created_at,livemode,customer_name,customer_email,shipping,amount_total,currency,items&limit=1`, { headers: { Accept: 'application/json' } })
    if (!response.ok) return res.status(502).json({ ok: false, message: 'Invoices are not available just now. Please try again soon.' })
    const rows = await response.json()
    if (!Array.isArray(rows) || !rows[0]) return res.status(404).json({ ok: false, message: 'We have not found this order yet. It can take a minute after paying: refresh in a moment.' })
    return res.status(200).json({ ok: true, invoice: buildInvoice(rows[0]) })
  } catch (e) {
    return res.status(502).json({ ok: false, message: 'Invoices are not available just now. Please try again soon.' })
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'GET' && req.query && req.query.invoice) return invoice(req, res)
  const who = await requireOwner(req)
  if (!who.ok) return sendDenied(res, who)
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Orders can only be looked at here.' })

  if (!databaseUrl() || serviceKeys().length === 0) {
    return res.status(503).json({ ok: false, message: 'No server database key is set on this deployment. In Vercel, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is needed, so orders cannot be read.' })
  }
  try {
    const read = (columns) => serviceFetch(`/rest/v1/orders?select=${columns}&order=created_at.desc&limit=50`, { headers: { Accept: 'application/json' } })
    let response = await read(`${COLUMNS},${EXTRA},${CONFIRMATION},${DISPATCH},${NOTICES}`)
    if (response.status === 400) response = await read(`${COLUMNS},${EXTRA},${CONFIRMATION},${DISPATCH}`)
    if (response.status === 400) response = await read(`${COLUMNS},${EXTRA},${CONFIRMATION}`)
    if (response.status === 400) response = await read(`${COLUMNS},${EXTRA}`)
    if (response.status === 400) response = await read(COLUMNS)
    if (response.status === 404) return res.status(200).json({ ok: false, message: 'The orders table has not been created yet. Run the orders SQL in Supabase first.' })
    if (!response.ok) {
      const said = await saidWhat(response)
      // 42501 means the key was accepted but the TABLE has not been given permission for the server; anything else
      // at 401 or 403 means the key itself was refused
      const hint = /\b42501\b/.test(said)
        ? ' The server key is fine, but the orders table has not been given permission for it. Run the three grant lines from sql/orders.sql in the Supabase SQL editor.'
        : response.status === 401 || response.status === 403
          ? ' The database refused the server key, so check SUPABASE_SERVICE_ROLE_KEY and SUPABASE_SECRET_KEY in Vercel.'
          : ''
      return res.status(200).json({ ok: false, message: `Could not read the orders: the database answered ${response.status}${said ? ` (${said})` : ''}.${hint}` })
    }
    const orders = await response.json()
    return res.status(200).json({ ok: true, orders: Array.isArray(orders) ? orders : [] })
  } catch (e) {
    return res.status(200).json({ ok: false, message: 'Could not read the orders just now. Try again in a minute.' })
  }
}
