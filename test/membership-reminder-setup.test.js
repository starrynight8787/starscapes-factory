// @vitest-environment node
// How the reminders are scheduled (vercel.json) and recorded (sql/membership-notices.sql), and that nothing else about the site's settings changed.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')

describe('the schedule (vercel.json)', () => {
  const config = JSON.parse(read('vercel.json'))
  it('asks for the reminder job once a day, through the existing payment function, and for the newsletter tidy-up once a day, through the existing ebook sign-up function (a 13th function is not allowed on the free plan)', () => {
    expect(config.crons).toEqual([{ path: '/api/membership-checkout?reminders=1', schedule: '0 8 * * *' }, { path: '/api/ebook-signup?newsletter=tidy', schedule: '30 8 * * *' }]) // the reminders are unchanged; the second job is the newsletter's tidy-up
    const functions = readdirSync(join(process.cwd(), 'api')).filter((f) => f.endsWith('.js')); expect(functions.length).toBeLessThanOrEqual(12)
  })
  it('runs no more than once a day each (the free plan allows no more, and no more than two jobs): minute and hour are fixed numbers, day, month and weekday are stars', () => {
    expect(config.crons.length).toBeLessThanOrEqual(2)
    for (const cron of config.crons) { const [minute, hour, dom, month, dow] = cron.schedule.split(' '); expect(/^\d+$/.test(minute)).toBe(true); expect(/^\d+$/.test(hour)).toBe(true); expect([dom, month, dow]).toEqual(['*', '*', '*']) }
  })
  it('still sends every page except the API to the site (the rewrite is unchanged)', () => {
    expect(config.rewrites).toEqual([{ source: '/((?!api/.*).*)', destination: '/index.html' }])
  })
})

describe('the table that records what was sent (sql/membership-notices.sql)', () => {
  const sql = read('sql/membership-notices.sql'); const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
  it('holds one note for each member and renewal date, so a member can never be reminded twice for the same date', () => {
    expect(code).toMatch(/unique \(user_id, period_end\)/); expect(code).toMatch(/user_id uuid not null references auth\.users \(id\) on delete cascade/); expect(code).toMatch(/period_end timestamptz not null/)
  })
  it('allows exactly the two kinds and three states the job uses', () => {
    expect(code).toMatch(/kind text not null check \(kind in \('renewal', 'price-change'\)\)/); expect(code).toMatch(/status text not null default 'sending' check \(status in \('sending', 'sent', 'failed'\)\)/)
  })
  it('holds no email address', () => {
    expect(code).not.toMatch(/\bemail\b/i)
  })
  it('is for the server only: row level security on, no policy for anyone, and permission granted to the server alone', () => {
    expect(code).toMatch(/alter table public\.membership_notices enable row level security;/); expect(code).not.toMatch(/create policy/i)
    expect(code).toMatch(/^grant select, insert, update, delete on public\.membership_notices to service_role;$/m); expect(code).not.toMatch(/\b(anon|authenticated)\b/)
  })
  it('is safe to run twice, and says how to undo it', () => {
    expect(code).toMatch(/create table if not exists public\.membership_notices/); expect(sql).toMatch(/safe to run more than once/); expect(sql).toMatch(/drop table if exists public\.membership_notices;/)
  })
})
