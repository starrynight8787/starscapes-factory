// @vitest-environment node
// The story round link stays hidden (SFW-269): it is not linked from anywhere, not in the sitemap, and the admin console is only for the owner.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(path.join(dir, d.name)) : [path.join(dir, d.name)]))
const read = (p) => fs.readFileSync(p, 'utf8')

describe('the hidden link', () => {
  it('is mentioned only in the route, the page and the owner\'s console (never in a menu, room, door list or share page)', () => {
    const users = files('src').filter((f) => /\.(jsx?|css)$/.test(f) && read(f).includes('story-round')).map((f) => f.replace(/\\/g, '/'))
    expect(users.sort()).toEqual(['src/App.jsx', 'src/admin/AdminStoryRounds.jsx', 'src/admin/adminTools.js', 'src/admin/adminstoryrounds.css', 'src/admin/storyRoundsAdminApi.js', 'src/admin/storyRoundsAdminRules.js', 'src/data/pageMeta.js', 'src/stories/round/StoryRoundPage.jsx'].sort())
  })
  it('is not in the sitemap or the share pages, and the build does not know about it', () => {
    for (const f of ['scripts/make-share-pages.mjs', 'scripts/shareHead.mjs', 'scripts/dynamicPages.mjs', 'public/robots.txt']) expect(read(f)).not.toMatch(/\/story-round\/|story_round/)
  })
  it('lists the owner\'s console in the page table as not for search results, and the member page has no entry (so it is never in the sitemap)', () => {
    expect(read('src/data/pageMeta.js')).toMatch(/'\/admin\/story-rounds': \{[^}]*index: false/)
  })
  it('tells search engines to ignore the page itself (not through robots.txt, so they can read it)', () => {
    expect(read('src/stories/round/StoryRoundPage.jsx')).toMatch(/robots[\s\S]{0,80}noindex, nofollow/)
  })
  it('uses a long random code per round (64 letters and digits), made by the database', () => {
    const rules = read('src/stories/round/storyRoundRules.js'); expect(rules).toMatch(/TOKEN_RE = \/\^\[0-9a-f\]\{64\}\$\//)
  })
})
describe('the owner\'s console', () => {
  it('is a tool in the admin list, behind the owner check on the page and on the server', () => {
    expect(read('src/admin/adminTools.js')).toMatch(/Story rounds', to: '\/admin\/story-rounds'/); expect(read('src/admin/AdminStoryRounds.jsx')).toMatch(/useOwnerCheck/); expect(read('lib/storyRounds.js')).toMatch(/requireOwner\(req\)/)
  })
})
