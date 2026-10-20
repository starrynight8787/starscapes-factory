// Vercel serverless function: sign up for the free ebook. POST { email, consent: true }. Answers { ok, file, emailed } or { ok: false, errors }.
import { handleSignup } from '../lib/ebookSignup.js'
import { handleNewsletter } from '../lib/newsletter.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  // The newsletter (sign up, confirm, unsubscribe) is handled in lib/newsletter.js: this is the only public function it can use, because the free Vercel plan allows 12
  if (req.query && req.query.newsletter) return handleNewsletter(req, res)
  if (req.method !== 'POST') return res.status(405).json({ ok: false })
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch (e) { body = null } }
  if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, errors: { email: 'Enter your email address.' } })
  const result = await handleSignup(body)
  return res.status(result.status).json(result.body)
}
