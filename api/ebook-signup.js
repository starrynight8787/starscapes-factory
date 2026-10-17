// Vercel serverless function: sign up for the free ebook. POST { email, consent: true }. Answers { ok, file, emailed } or { ok: false, errors }.
import { handleSignup } from '../lib/ebookSignup.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ ok: false })
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch (e) { body = null } }
  if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, errors: { email: 'Enter your email address.' } })
  const result = await handleSignup(body)
  return res.status(result.status).json(result.body)
}
