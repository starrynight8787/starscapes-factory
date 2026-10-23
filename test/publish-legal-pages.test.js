// @vitest-environment node
// The one-command publisher for the five legal pages (SFW-186): tools/publish-legal-pages.py. Tried on COPIES of the real files, turned back into drafts first, so it is tested properly whichever state the real pages are in.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const REAL = { legal: 'src/data/legalPages.js', rail: 'src/cart/beforeYouPay.js', script: 'tools/publish-legal-pages.py' }
const FLAG = 'export const LEGAL_PAGES_PUBLISHED'
const toDraft = (legal, rail) => ({
  legal: legal.replace(/"ready": true/g, '"ready": false').replace(/"updated": "[^"]*"/g, '"updated": "[date]"'),
  rail: rail.replace(`${FLAG} = true`, `${FLAG} = false`),
})
function project({ edit } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-')); const real = Object.fromEntries(Object.entries(REAL).map(([k, p]) => [k, fs.readFileSync(p, 'utf8')]))
  const draft = toDraft(real.legal, real.rail); const files = edit ? edit(draft) : draft
  for (const [rel, text] of [[REAL.legal, files.legal], [REAL.rail, files.rail], [REAL.script, real.script]]) { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text) }
  return { dir, draft: files }
}
const run = (dir, ...args) => { const r = spawnSync('python3', [path.join(dir, REAL.script), ...args], { cwd: dir, encoding: 'utf8' }); return { code: r.status, out: `${r.stdout}${r.stderr}` } }
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8')
const DATE = '23 October 2026'

describe('--check (changes nothing)', () => {
  it('reports the five pages as drafts, says what date it would use, and writes nothing', () => {
    const { dir, draft } = project(); const r = run(dir, '--check')
    expect(r.code, r.out).toBe(0); expect(r.out).toContain('terms, privacy, returns, ai-policy, cookies'); expect(r.out).toContain('NOT PUBLISHED'); expect(r.out).toContain('would be dated')
    expect(read(dir, REAL.legal)).toBe(draft.legal); expect(read(dir, REAL.rail)).toBe(draft.rail)
  })
})

describe('publishing', () => {
  it('turns all five pages ready, puts the date on all five, opens the checkout rail, and changes NOTHING else (undoing those changes gives back the original files)', () => {
    const { dir, draft } = project(); const r = run(dir, DATE); expect(r.code, r.out).toBe(0); expect(r.out).toContain(`Published, dated ${DATE}`)
    const legal = read(dir, REAL.legal), rail = read(dir, REAL.rail)
    expect(legal.match(/"ready": true/g)).toHaveLength(5); expect(legal).not.toMatch(/"ready": false/); expect(legal.match(new RegExp(`"updated": "${DATE}"`, 'g'))).toHaveLength(5); expect(legal).not.toMatch(/"updated": "\[date\]"/)
    expect(rail).toContain(`${FLAG} = true`); expect(rail).not.toContain(`${FLAG} = false`)
    expect(legal.replace(/"ready": true/g, '"ready": false').replaceAll(`"updated": "${DATE}"`, '"updated": "[date]"')).toBe(draft.legal); expect(rail.replace(`${FLAG} = true`, `${FLAG} = false`)).toBe(draft.rail)
  })
  it('with no date it uses today\'s date, written the way the site shows dates', () => {
    const { dir } = project(); const r = run(dir); expect(r.code, r.out).toBe(0)
    const d = new Date(); const today = `${d.getDate()} ${d.toLocaleString('en-GB', { month: 'long' })} ${d.getFullYear()}`
    expect(read(dir, REAL.legal)).toContain(`"updated": "${today}"`)
  })
  it('is safe to run twice: the second time it says it is already published and changes nothing; --check then says PUBLISHED', () => {
    const { dir } = project(); run(dir, DATE); const after = [read(dir, REAL.legal), read(dir, REAL.rail)]
    const again = run(dir); expect(again.code).toBe(0); expect(again.out).toContain('Already published'); expect([read(dir, REAL.legal), read(dir, REAL.rail)]).toEqual(after)
    expect(run(dir, '--check').out).toContain('STATE: PUBLISHED')
  })
})

describe('it refuses, and writes nothing, when something is not as expected', () => {
  const refuses = (dir, snapshot, r) => { expect(r.code).not.toBe(0); expect(r.out).toContain('NOTHING WAS CHANGED'); expect([read(dir, REAL.legal), read(dir, REAL.rail)]).toEqual(snapshot) }
  it.each(['tomorrow', '2026-10-23', '23 Oct 2026', '31st October 2026', '23 October'])('a date that is not like "24 October 2026" (%s)', (bad) => {
    const { dir } = project(); const snap = [read(dir, REAL.legal), read(dir, REAL.rail)]; refuses(dir, snap, run(dir, bad))
  })
  it('two arguments', () => { const { dir } = project(); const snap = [read(dir, REAL.legal), read(dir, REAL.rail)]; refuses(dir, snap, run(dir, DATE, 'extra')) })
  it('one page already ready and the rest not (half-way)', () => {
    const { dir } = project({ edit: (d) => ({ ...d, legal: d.legal.replace('"ready": false', '"ready": true') }) }); const snap = [read(dir, REAL.legal), read(dir, REAL.rail)]; refuses(dir, snap, run(dir, DATE))
  })
  it('the checkout rail already open while the pages are drafts', () => {
    const { dir } = project({ edit: (d) => ({ ...d, rail: d.rail.replace(`${FLAG} = false`, `${FLAG} = true`) }) }); const snap = [read(dir, REAL.legal), read(dir, REAL.rail)]; refuses(dir, snap, run(dir, DATE))
  })
  it('a page missing (only four found)', () => {
    const { dir } = project({ edit: (d) => ({ ...d, legal: d.legal.replace('"slug": "cookies"', '"slug": "cookies-gone"').replace(/"ready": false(?![\s\S]*"ready": false)/, '"ready": true') }) }); const snap = [read(dir, REAL.legal), read(dir, REAL.rail)]; refuses(dir, snap, run(dir, DATE))
  })
  it('run from a folder without the project files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-empty-')); fs.mkdirSync(path.join(dir, 'tools')); fs.writeFileSync(path.join(dir, REAL.script), fs.readFileSync(REAL.script))
    const r = run(dir, DATE); expect(r.code).not.toBe(0); expect(r.out).toContain('NOTHING WAS CHANGED'); expect(r.out).toContain('missing')
  })
})
