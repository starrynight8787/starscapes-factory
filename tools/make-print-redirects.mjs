// Writes the permanent redirects for the prints' old long addresses into vercel.json. Run it ONCE, after sql/print-slugs.sql has been run in Supabase, then look at
// `git diff vercel.json`, and commit it with the release. Run it again whenever you like: it only ever replaces the print redirects.
//
//   node tools/make-print-redirects.mjs
//
// It reads the published prints and their readable addresses with the same public (anon) key a visitor has, from VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.
// It reads nothing about customers, orders or members.
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'
import { printRedirects, applyRedirects, redirectProblems } from '../scripts/printRedirects.mjs'

const root = process.cwd()
const env = { ...loadEnv('production', root, ''), ...process.env }
const url = String(env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim().replace(/\/+$/, '')
const key = String(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim()
if (!/^https?:\/\//.test(url) || !key) { console.error('STOPPED: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not in .env.local, so the prints cannot be read. Nothing was changed.'); process.exit(1) }

const response = await fetch(`${url}/rest/v1/products?select=id,slug&fulfilment=eq.creativehub&published=eq.true&slug=not.is.null&limit=1000`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } })
if (!response.ok) { console.error(`STOPPED: the database answered ${response.status}. If it says the slug column does not exist, run sql/print-slugs.sql in Supabase first. Nothing was changed.`); process.exit(1) }
const rows = await response.json()
const redirects = printRedirects(rows)
if (!redirects.length) { console.error('STOPPED: no published print has a readable address yet. Run sql/print-slugs.sql in Supabase first. Nothing was changed.'); process.exit(1) }
const problems = redirectProblems(redirects)
if (problems.length) { console.error(`STOPPED: ${problems.join('; ')}. Nothing was changed.`); process.exit(1) }

const file = path.join(root, 'vercel.json')
const before = JSON.parse(fs.readFileSync(file, 'utf8'))
const after = applyRedirects(before, redirects)
fs.writeFileSync(file, `${JSON.stringify(after, null, 2)}\n`)
console.log(`Wrote ${redirects.length} permanent redirect${redirects.length === 1 ? '' : 's'} into vercel.json (${rows.length} published print${rows.length === 1 ? '' : 's'} have a readable address).`)
console.log('Next: git diff vercel.json   (it should show only added redirects), then commit it with the release.')
