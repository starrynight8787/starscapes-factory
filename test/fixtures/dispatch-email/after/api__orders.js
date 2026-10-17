// Vercel serverless function: the owner's list of orders, for the publish page. Locked to the shop owner.
import { requireOwner, sendDenied } from '../lib/ownerGuard.js'
import { databaseUrl, serviceKeys, serviceFetch, saidWhat } from '../lib/serviceKey.js'

const COLUMNS = 'id,created_at,status,livemode,customer_name,customer_email,shipping,amount_total,currency,items,creativehub_order_id,creativehub_status,note'
// Added later (sql/orders-creativehub.sql). If that has not been run yet, the list is read without them rather than not at all.
const EXTRA = 'creativehub_order_number,creativehub_due,creativehub_checked_at,sent_at'
// Added later still (sql/orders-confirmation.sql): whether the customer's confirmation email went.
const CONFIRMATION = 'confirmation_status,confirmation_note,confirmation_sent_at'
// And the "your order has been posted" email (sql/orders-dispatch.sql).
const DISPATCH = 'dispatch_status,dispatch_note,dispatch_sent_at,tracking_url,tracking_number'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const who = await requireOwner(req)
  if (!who.ok) return sendDenied(res, who)
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Orders can only be looked at here.' })

  if (!databaseUrl() || serviceKeys().length === 0) {
    return res.status(503).json({ ok: false, message: 'No server database key is set on this deployment. In Vercel, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is needed, so orders cannot be read.' })
  }
  try {
    const read = (columns) => serviceFetch(`/rest/v1/orders?select=${columns}&order=created_at.desc&limit=50`, { headers: { Accept: 'application/json' } })
    let response = await read(`${COLUMNS},${EXTRA},${CONFIRMATION},${DISPATCH}`)
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
