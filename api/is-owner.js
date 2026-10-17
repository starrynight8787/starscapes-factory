// Vercel serverless function: is the person who is signed in the shop's owner? The answer is only ever yes or no.
// The menu uses it to decide whether to show the Admin button. It uses the same check as every private tool (lib/ownerGuard.js),
// and it says nothing about why: a stranger, someone signed out and a broken sign-in all get the same plain no,
// and the owner's email is never sent back.
import { requireOwner } from '../lib/ownerGuard.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') return res.status(405).json({ owner: false })
  try {
    const who = await requireOwner(req)
    return res.status(200).json({ owner: Boolean(who && who.ok) })
  } catch (e) {
    return res.status(200).json({ owner: false })
  }
}
