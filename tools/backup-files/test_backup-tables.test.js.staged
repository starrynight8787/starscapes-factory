// @vitest-environment node
// The tables that go into the owner's backup (22 October 2026). Every table in the database is either SAVED or LEFT OUT WITH A REASON, so the backup cannot quietly fall behind the site,
// and nothing secret can be in it.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { BACKUP_TABLES, LEFT_OUT, BACKUP_TABLE_NAMES } from '../lib/backupTables.js'

// The database's tables as they stood on 22 October 2026. When a table is added to the database, add it here AND decide whether it is saved or left out (lib/backupTables.js).
const DATABASE_TABLES_22_OCT = ['atlas_stamps', 'atlas_years', 'book_comments', 'books', 'doors', 'email_requests', 'events', 'instagram_token', 'member_country', 'member_profiles', 'membership_notices', 'memberships', 'newsletter_issues', 'newsletter_sends', 'newsletter_subscribers', 'orders', 'post_bodies', 'post_reads', 'posts', 'product_variants', 'products', 'reading_goals', 'site_settings', 'stories', 'story_ballots', 'story_chapters', 'story_vote_options', 'story_votes', 'suggestion_spaces', 'suggestion_votes', 'suggestions']
const LEFT_OUT_NAMES = LEFT_OUT.map((t) => t.name)
// Tables an old file in sql/ still creates, but that are gone from the live database and that no code uses. They are not saved, because there is nothing to save.
const RETIRED = { ebook_signups: 'The first ebook sign-up table. It was empty, and was replaced by the one newsletter list (newsletter_subscribers).' }

describe('the list is well formed', () => {
  it('every table has a name, a plain-English label, and the column(s) it is read in; none is listed twice', () => {
    for (const t of BACKUP_TABLES) {
      expect(t.name, JSON.stringify(t)).toMatch(/^[a-z][a-z0-9_]*$/)
      expect(t.label.length, t.name).toBeGreaterThan(3)
      expect(Array.isArray(t.order) && t.order.length > 0 && t.order.every((c) => /^[a-z][a-z0-9_]*$/.test(c)), t.name).toBe(true)
    }
    expect(new Set(BACKUP_TABLE_NAMES).size).toBe(BACKUP_TABLE_NAMES.length)
    expect(new Set(BACKUP_TABLES.map((t) => t.label)).size).toBe(BACKUP_TABLES.length)
  })
  it('a table is either saved or left out, never both; every table left out says why', () => {
    for (const name of LEFT_OUT_NAMES) expect(BACKUP_TABLE_NAMES, name).not.toContain(name)
    for (const t of LEFT_OUT) expect(t.why.length, t.name).toBeGreaterThan(20)
  })
})

describe('nothing is forgotten', () => {
  it('saved plus left out is exactly every table in the database', () => {
    expect([...BACKUP_TABLE_NAMES, ...LEFT_OUT_NAMES].sort()).toEqual([...DATABASE_TABLES_22_OCT].sort())
  })
  it('a table the code creates (in sql/) is always one of them, so a new table cannot be missed', () => {
    const dir = 'sql'
    const made = new Set()
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql'))) {
      const text = fs.readFileSync(path.join(dir, f), 'utf8').replace(/--[^\n]*/g, '')
      for (const m of text.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi)) made.add(m[1].toLowerCase())
    }
    const known = new Set([...BACKUP_TABLE_NAMES, ...LEFT_OUT_NAMES, ...Object.keys(RETIRED)])
    expect([...made].filter((n) => !known.has(n)), 'a table made in sql/ that is neither saved, left out, nor retired').toEqual([])
  })
  it('a retired table is really gone: it is not in the database list, and no code mentions it', () => {
    for (const name of Object.keys(RETIRED)) {
      expect(DATABASE_TABLES_22_OCT, name).not.toContain(name)
      const files = []
      for (const dir of ['src', 'api', 'lib']) for (const f of fs.readdirSync(dir, { recursive: true })) { const full = path.join(dir, String(f)); if (/\.(jsx?|mjs)$/.test(full) && fs.readFileSync(full, 'utf8').includes(name)) files.push(full) }
      expect(files, `code that still uses the retired table ${name}`).toEqual([])
    }
  })
})

describe('nothing secret goes into a backup file', () => {
  it('the Instagram token and the email-request log are left out, with their reasons', () => {
    expect(LEFT_OUT_NAMES).toEqual(expect.arrayContaining(['instagram_token', 'email_requests']))
    expect(LEFT_OUT.find((t) => t.name === 'instagram_token').why).toMatch(/secret/i)
  })
  it('no saved table has a name that suggests a secret (token, secret, key, password, credential)', () => {
    for (const n of BACKUP_TABLE_NAMES) expect(n, n).not.toMatch(/token|secret|password|credential|api_key|_key$/)
  })
  it('the tables the owner most needs are saved: orders, memberships, posts, products, subscribers', () => {
    expect(BACKUP_TABLE_NAMES).toEqual(expect.arrayContaining(['orders', 'memberships', 'member_profiles', 'posts', 'post_bodies', 'products', 'product_variants', 'newsletter_subscribers']))
  })
})
