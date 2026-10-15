// Vercel serverless function: the owner's list of orders, for the publish page. Locked to the shop owner.
import { requireOwner, sendDenied } from '../lib/ownerGuard.js'

const clean = (v) => String(v || '').trim()
const COLUMNS = 'id,created_at,status,livemode,customer_name,customer_email,shipping,amount_total,currency,items,creativehub_order_id,creativehub_status,note'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const who = await requireOwner(req)
  if (!who.ok) return sendDenied(res, who)
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Orders can only be looked at here.' })

  const url = clean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/+$/, '')
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!url || !key) return res.status(503).json({ ok: false, message: 'SUPABASE_SERVICE_ROLE_KEY is not set on this deployment, so orders cannot be read.' })
  try {
    const response = await fetch(`${url}/rest/v1/orders?select=${COLUMNS}&order=created_at.desc&limit=50`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (response.status === 404) return res.status(200).json({ ok: false, message: 'The orders table has not been created yet. Run the orders SQL in Supabase first.' })
    if (!response.ok) return res.status(200).json({ ok: false, message: 'Could not read the orders just now. Try again in a minute.' })
    const orders = await response.json()
    return res.status(200).json({ ok: true, orders: Array.isArray(orders) ? orders : [] })
  } catch (e) {
    return res.status(200).json({ ok: false, message: 'Could not read the orders just now. Try again in a minute.' })
  }
}
