// @vitest-environment node
// The free Vercel plan allows only 12 serverless functions per site, and EVERY file in api/ is one. A 13th makes Vercel refuse to build the whole site (it kept serving the old
// version while every new deployment failed). This found out the hard way, on 19 October 2026, when the account package added a 13th. Shared code goes in lib/, not api/.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
// Vercel treats a .js, .mjs, .cjs or .ts file in api/ as a function, unless its name starts with an underscore
const functions = walk('api').filter((f) => /\.(js|mjs|cjs|ts)$/.test(f) && !path.basename(f).startsWith('_'))

describe('the number of serverless functions', () => {
  it('is no more than 12 (the free plan\u2019s limit), so the site can always be built', () => {
    expect(functions.length, `${functions.length} functions: ${functions.join(', ')}. Move shared code into lib/ instead of adding a function.`).toBeLessThanOrEqual(12)
  })
  it('has all the membership account actions inside the membership checkout function, not as a function of their own', () => {
    expect(fs.existsSync('api/membership-account.js')).toBe(false)
    expect(fs.existsSync('lib/membershipAccount.js')).toBe(true)
  })
})
