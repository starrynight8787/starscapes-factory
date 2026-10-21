// Vercel serverless function: the public side of the newsletter (sign up, confirm, unsubscribe). It is also how people get the free ebook: the ebook page signs them up to the same list (source 'ebook').
// It keeps its old name because the free Vercel plan allows only 12 functions and its address is already in the unsubscribe links of every email.
import { handleNewsletter } from '../lib/newsletter.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.query && req.query.newsletter) return handleNewsletter(req, res)
  return res.status(404).json({ ok: false, message: 'Not found.' })
}
