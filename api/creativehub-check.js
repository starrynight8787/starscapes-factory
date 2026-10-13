// Vercel serverless function: checks that the Creative Hub API token works, and (read-only) helps
// find out what the API offers.
//
// - It only READS. It never places an order and never costs anything.
// - It never shows the token. The token lives in Vercel as CREATIVEHUB_API_KEY (server side only).
// - Visit /api/creativehub-check to run the basic check.
//
// Optional second setting: CREATIVEHUB_API_BASE, to point at a different Creative Hub address
// (for example a sandbox). If it isn't set, https://api.creativehub.io is used.
//
// Discovery pages (temporary, we remove them once ordering is built):
//   ?docs=find    where does Creative Hub keep its API description?
//   ?docs=paths   list every address the API offers (needs the description to be found)
//   ?docs=orders  just the ordering parts, with their field lists
//   ?docs=probe   which likely quote/order/SKU addresses exist (GET only, status codes only)
//   ?docs=shape   the field NAMES of an order record (no values, so no customer details)

const WANTED = ['order', 'quote', 'sku', 'delivery', 'shipping', 'price', 'webhook', 'card']

// Places an API description is commonly kept
const SPEC_PATHS = [
  '/openapi.json', '/v1/openapi.json', '/swagger.json', '/v1/swagger.json', '/swagger/v1/swagger.json',
  '/api-docs', '/api-docs.json', '/docs/openapi.json', '/docs/json', '/openapi', '/v1/docs', '/docs', '/swagger', '/redoc',
]

// Likely addresses for quotes, orders, products and so on. Probed with GET only.
const PROBE_PATHS = [
  '/v1/orders', '/v1/orders/quote', '/v1/orders/quotes', '/v1/quote', '/v1/quotes', '/v1/prices', '/v1/products',
  '/v1/skus', '/v1/catalog', '/v1/delivery-options', '/v1/shipping', '/v1/account', '/v1/me', '/v1/cards',
  '/v1/saved-card', '/v1/webhooks', '/v1/drops',
]

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

// Field names and types only. Never any values.
function shapeOf(value, depth = 0) {
  if (Array.isArray(value)) return value.length ? [shapeOf(value[0], depth + 1)] : []
  if (value && typeof value === 'object') {
    if (depth > 4) return '{...}'
    const out = {}
    for (const [key, v] of Object.entries(value)) out[key] = shapeOf(v, depth + 1)
    return out
  }
  return value === null ? 'null' : typeof value
}

function authHeaders(token) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function findSpec(base, token) {
  const tried = []
  for (const path of SPEC_PATHS) {
    try {
      const response = await fetch(`${base}${path}`, { headers: authHeaders(token), signal: AbortSignal.timeout(6000) })
      const type = (response.headers && response.headers.get && response.headers.get('content-type')) || ''
      tried.push({ path, status: response.status, type: type.split(';')[0] })
      if (response.ok && type.includes('json')) {
        const spec = await response.json()
        if (spec && spec.paths) return { spec, foundAt: path, tried }
      }
    } catch (error) {
      tried.push({ path, status: 'error' })
    }
  }
  return { spec: null, tried }
}

async function probe(base, token) {
  const results = []
  for (const path of PROBE_PATHS) {
    try {
      const response = await fetch(`${base}${path}`, { headers: authHeaders(token), signal: AbortSignal.timeout(6000) })
      const allow = response.headers && response.headers.get && response.headers.get('allow')
      results.push({ path, status: response.status, ...(allow ? { allow } : {}) })
    } catch (error) {
      results.push({ path, status: 'error' })
    }
  }
  return results
}

async function runDocs(mode, base, token) {
  if (mode === 'probe') {
    return {
      note: '404 = not there. 405 = there, but it wants a different method (the allow field says which). 200 = there and readable. 401/403 = there but not allowed.',
      results: await probe(base, token),
    }
  }
  if (mode === 'shape') {
    const response = await fetch(`${base}/v1/orders`, { headers: authHeaders(token), signal: AbortSignal.timeout(8000) })
    if (!response.ok) return { status: response.status, message: 'Could not read the orders list.' }
    const body = await response.json()
    return { status: response.status, note: 'Field names and types only, no values.', shape: shapeOf(body) }
  }
  const { spec, foundAt, tried } = await findSpec(base, token)
  if (mode === 'find') {
    return spec
      ? { docs: true, foundAt, endpointCount: Object.keys(spec.paths).length, tried }
      : { docs: false, message: 'No API description found at the usual places.', tried }
  }
  if (!spec) return { docs: false, message: 'No API description found at the usual places. Try ?docs=find and ?docs=probe.', tried }
  if (mode === 'paths') {
    const lines = []
    for (const [path, item] of Object.entries(spec.paths || {})) {
      for (const [method, op] of Object.entries(item)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          lines.push(`${method.toUpperCase()} ${path}${op && op.summary ? ' - ' + op.summary : ''}`)
        }
      }
    }
    return { docs: true, foundAt, count: lines.length, endpoints: lines }
  }
  return { docs: true, foundAt, ...trimSpec(spec) }
}

// Harmless "list" addresses to try for the basic check, in order.
const CHECKS = ['/v1/orders', '/v1/drops']

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  const token = process.env.CREATIVEHUB_API_KEY || process.env.CREATIVEHUB_API_TOKEN
  const base = (process.env.CREATIVEHUB_API_BASE || 'https://api.creativehub.io').replace(/\/+$/, '')

  const docsMode = req && req.query && req.query.docs
  if (['find', 'paths', 'orders', 'probe', 'shape'].includes(docsMode)) {
    if (!token) {
      return res.status(200).json({ connected: false, reason: 'no_token', message: 'CREATIVEHUB_API_KEY is not set on this deployment.' })
    }
    try {
      return res.status(200).json(await runDocs(docsMode, base, token))
    } catch (error) {
      return res.status(200).json({ docs: false, message: 'Could not read from Creative Hub. ' + (error && error.name === 'TimeoutError' ? 'It took too long.' : '') })
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
    }
    return res.status(200).json({
      connected: false,
      reason: 'addresses_not_recognised',
      tried,
      message: 'Creative Hub did not recognise the addresses this check uses. The token may still be fine.',
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
