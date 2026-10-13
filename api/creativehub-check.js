// Vercel serverless function: checks that the Creative Hub API token works.
//
// - It only READS. It never places an order and never costs anything.
// - It never shows the token. The token lives in Vercel as CREATIVEHUB_API_KEY (server side only).
// - Visit /api/creativehub-check on your live site to run it.
//
// Optional second setting: CREATIVEHUB_API_BASE, to point at a different Creative Hub address
// (for example a sandbox). If it isn't set, https://api.creativehub.io is used.


// ---------------------------------------------------------------------------------------------
// "Docs mode": /api/creativehub-check?docs=paths   lists every address the API offers
//              /api/creativehub-check?docs=orders  shows just the ordering parts (quotes, orders,
//                                                   SKUs, delivery, webhooks) with their field lists
// It only reads Creative Hub's public API description (openapi.json). It never returns your token
// and never returns any order or customer data.
// ---------------------------------------------------------------------------------------------
const WANTED = ['order', 'quote', 'sku', 'delivery', 'shipping', 'price', 'webhook', 'card']

function refsIn(value, found) {
  if (Array.isArray(value)) {
    value.forEach((v) => refsIn(v, found))
  } else if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (key === '$ref' && typeof v === 'string') found.add(v)
      else refsIn(v, found)
    }
  }
}

function trimSpec(spec) {
  const paths = {}
  for (const [path, item] of Object.entries(spec.paths || {})) {
    if (WANTED.some((word) => path.toLowerCase().includes(word))) paths[path] = item
  }
  const schemas = {}
  const first = new Set()
  refsIn(paths, first)
  const queue = [...first]
  while (queue.length && Object.keys(schemas).length < 80) {
    const ref = queue.shift()
    if (!ref.startsWith('#/components/schemas/')) continue
    const name = ref.split('/').pop()
    const schema = spec.components && spec.components.schemas && spec.components.schemas[name]
    if (!schema || schemas[name]) continue
    schemas[name] = schema
    const inner = new Set()
    refsIn(schema, inner)
    for (const r of inner) if (!schemas[r.split('/').pop()]) queue.push(r)
  }
  return { info: spec.info, servers: spec.servers, paths, schemas }
}

async function readDocs(mode, base, token) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${base}/openapi.json`, { headers, signal: AbortSignal.timeout(10000) })
  if (!response.ok) {
    return { docs: false, status: response.status, message: 'Could not read the API description (openapi.json).' }
  }
  const spec = await response.json()
  if (mode === 'paths') {
    const lines = []
    for (const [path, item] of Object.entries(spec.paths || {})) {
      for (const [method, op] of Object.entries(item)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          lines.push(`${method.toUpperCase()} ${path}${op && op.summary ? ' - ' + op.summary : ''}`)
        }
      }
    }
    return { docs: true, count: lines.length, endpoints: lines }
  }
  return { docs: true, ...trimSpec(spec) }
}

// Harmless "list" addresses to try, in order. Creative Hub's help pages disagree about which ones
// a token covers, so we try both and report what happened.
const CHECKS = ['/v1/orders', '/v1/drops']

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  const token = process.env.CREATIVEHUB_API_KEY || process.env.CREATIVEHUB_API_TOKEN
  const base = (process.env.CREATIVEHUB_API_BASE || 'https://api.creativehub.io').replace(/\/+$/, '')

  const docsMode = req && req.query && req.query.docs
  if (docsMode === 'paths' || docsMode === 'orders') {
    try {
      return res.status(200).json(await readDocs(docsMode, base, token))
    } catch (error) {
      return res.status(200).json({ docs: false, message: 'Could not read the API description. ' + (error && error.name === 'TimeoutError' ? 'It took too long.' : '') })
    }
  }

  if (!token) {
    return res.status(200).json({
      connected: false,
      reason: 'no_token',
      message: 'CREATIVEHUB_API_KEY is not set on this deployment. Add it in Vercel, then redeploy.',
    })
  }

  const tried = []
  try {
    for (const path of CHECKS) {
      const response = await fetch(`${base}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      })
      tried.push({ path, status: response.status })

      if (response.ok) {
        return res.status(200).json({ connected: true, tried, message: `Creative Hub accepted the token (${path}).` })
      }
      if (response.status === 401) {
        return res.status(200).json({
          connected: false, reason: 'invalid_token', tried,
          message: 'Creative Hub did not accept this token. It may be wrong, revoked, or copied with a space.',
        })
      }
      if (response.status === 403) {
        return res.status(200).json({
          connected: false, reason: 'api_access_disabled', tried,
          message: 'The token was read, but API access is not switched on for this account.',
        })
      }
      if (response.status === 429) {
        return res.status(200).json({
          connected: false, reason: 'rate_limited', tried,
          message: 'Too many requests just now. Try again in a minute.',
        })
      }
      // anything else (usually 404): try the next address
    }

    return res.status(200).json({
      connected: false,
      reason: 'addresses_not_recognised',
      tried,
      message:
        'Creative Hub did not recognise the addresses this check uses. The token may still be fine. ' +
        'Send Claude the API reference so the check can be pointed at the right place.',
    })
  } catch (error) {
    return res.status(200).json({
      connected: false,
      reason: 'network_error',
      tried,
      message: 'Could not reach Creative Hub. ' + (error && error.name === 'TimeoutError' ? 'It took too long to answer.' : ''),
    })
  }
}
