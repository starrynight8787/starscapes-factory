// @vitest-environment node
// Two code files in the same folder whose names match when capitals are ignored (for example beforeYouPay.js and BeforeYouPay.jsx) work on a Linux machine, but BREAK on a Mac or Windows computer, whose file systems
// ignore capitals: `./BeforeYouPay` finds the wrong file. That is exactly what stopped the checkout terms package building on Gill's Mac (22 October 2026). Nothing built on a Linux machine can see it, so this test looks for it.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const CODE = /\.(jsx?|mjs|cjs|tsx?)$/
// pure, so it can be tried on made-up lists: groups of code files in the SAME folder that share a name once capitals and the ending are ignored
export function findClashes(files) {
  const groups = new Map()
  for (const f of files.filter((x) => CODE.test(x))) {
    const key = `${path.dirname(f)}/${path.basename(f).replace(CODE, '').toLowerCase()}`
    groups.set(key, [...(groups.get(key) || []), f])
  }
  return [...groups.values()].filter((g) => g.length > 1)
}
const listFiles = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).map(String).map((f) => path.join(dir, f)).filter((f) => !/node_modules|fixtures/.test(f) && fs.statSync(f).isFile()) : [])

describe('the scan itself', () => {
  it('catches the pair that broke the build, and the plain case-only pair', () => {
    expect(findClashes(['src/cart/beforeYouPay.js', 'src/cart/BeforeYouPay.jsx'])).toEqual([['src/cart/beforeYouPay.js', 'src/cart/BeforeYouPay.jsx']])
    expect(findClashes(['src/a/Foo.js', 'src/a/foo.js'])).toHaveLength(1)
  })
  it('does not complain about things that are fine: other folders, or a stylesheet with the same name', () => {
    expect(findClashes(['src/a/Foo.jsx', 'src/b/foo.js'])).toEqual([]); expect(findClashes(['src/a/Foo.jsx', 'src/a/Foo.css', 'src/a/FooBar.jsx'])).toEqual([])
  })
})

describe('the real code', () => {
  it('has no two code files in one folder that differ only by capitals or by .js against .jsx', () => {
    const files = ['src', 'lib', 'api', 'scripts', 'tools'].flatMap(listFiles)
    expect(files.length).toBeGreaterThan(100) // the scan really looked at the code
    expect(findClashes(files)).toEqual([])
  })
})
