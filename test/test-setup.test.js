// @vitest-environment node
// The test setup itself (added 20 October 2026). Until then the project had no test tools in it, so none of the tests could run on Gill's computer. This keeps it that way round: it fails if the tools or the safety rules go missing.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8')
const pkg = JSON.parse(read('package.json'))

describe('the test tools are part of the project', () => {
  it('has an npm test command that runs every test once', () => {
    expect(pkg.scripts.test).toBe('vitest run')
  })
  it('lists the tools as development tools only (they never go into the live site)', () => {
    for (const name of ['vitest', 'jsdom', '@testing-library/react', '@testing-library/dom', '@testing-library/user-event', '@testing-library/jest-dom']) {
      expect(pkg.devDependencies[name], name).toBeTruthy()
      expect(pkg.dependencies && pkg.dependencies[name], `${name} must not be a live dependency`).toBeUndefined()
    }
  })
  it('keeps vitest on a version that works with the site\u2019s version of Vite (5)', () => {
    expect(pkg.devDependencies.vitest).toMatch(/^\^2\./)
    expect(pkg.devDependencies.vite).toMatch(/^\^5\./)
  })
})

describe('the tests can never reach the real Supabase', () => {
  const config = read('vitest.config.js')
  it('give the tests a fake address and key, whatever is in the .env files', () => {
    expect(config).toMatch(/VITE_SUPABASE_URL: 'https:\/\/fake-project\.supabase\.co'/)
    expect(config).toMatch(/VITE_SUPABASE_ANON_KEY: 'fake-anon-key'/)
  })
  it('see those fake values at run time (this test runs under that setup)', () => {
    expect(import.meta.env.VITE_SUPABASE_URL).toBe('https://fake-project.supabase.co')
    expect(import.meta.env.VITE_SUPABASE_ANON_KEY).toBe('fake-anon-key')
  })
  it('run in a pretend browser with the usual extra checks switched on, set up in one file', () => {
    expect(config).toMatch(/environment: 'jsdom'/)
    expect(config).toMatch(/globals: true/)
    expect(read('vitest.setup.js')).toContain("@testing-library/jest-dom/vitest")
  })
  it('leave the real site\u2019s own settings alone (vite.config.js has no test section)', () => {
    expect(read('vite.config.js')).not.toMatch(/\btest\s*:/)
  })
})
