// Vercel serverless function: the owner's list of orders, for the publish page. Locked to the shop owner.
import { requireOwner, sendDenied } from '../lib/ownerGuard.js'
import { databaseUrl, serviceKeys, serviceFetch, saidWhat } from '../lib/serviceKey.js'

const COLUMNS = 'id,created_at,status,livemode,customer_name,customer_email,shipping,amount_total,currency,items,creativehub_order_id,creativehub_status,note'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const who = await requireOwner(req)
  if (!who.ok) return sendDenied(res, who)
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Orders can only be looked at here.' })

  if (!databaseUrl() || serviceKeys().length === 0) {
    return res.status(503).json({ ok: false, message: 'No server database key is set on this deployment. In Vercel, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is needed, so orders cannot be read.' })
  }
  try {
    const response = await serviceFetch(`/rest/v1/orders?select=${COLUMNS}&order=created_at.desc&limit=50`, { headers: { Accept: 'application/json' } })
    if (response.status === 404) return res.status(200).json({ ok: false, message: 'The orders table has not been created yet. Run the orders SQL in Supabase first.' })
    if (!response.ok) {
      const said = await saidWhat(response)
      const hint = response.status === 401 || response.status === 403 ? ' The database refused the server key, so check SUPABASE_SERVICE_ROLE_KEY and SUPABASE_SECRET_KEY in Vercel.' : ''
      return res.status(200).json({ ok: false, message: `Could not read the orders: the database answered ${response.status}${said ? ` (${said})` : ''}.${hint}` })
    }
    const orders = await response.json()
    return res.status(200).json({ ok: true, orders: Array.isArray(orders) ? orders : [] })
  } catch (e) {
    return res.status(200).json({ ok: false, message: 'Could not read the orders just now. Try again in a minute.' })
  }
}
