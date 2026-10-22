// @vitest-environment node
// The plain rules for the owner's list of every post (src/admin/postsAdminRules.js): which pages of each room list posts, where a post appears, and how the list is filtered.
import { describe, it, expect } from 'vitest'
import { roomName, pagesOfRoom, pagesFor, whereIs, filterPosts, countByRoom } from '../src/admin/postsAdminRules'
import { channels } from '../src/data/channels'

const post = (id, channel, tags, published = true, title = `Post ${id}`) => ({ id, title, channel, tags, published, created_at: '2026-10-01T10:00:00Z' })
const names = (slug) => pagesOfRoom(slug).map((p) => p.name)

describe('the name of a room', () => {
  it('is the name people see, for each of the eight rooms, and the plain name for anything else', () => {
    expect(channels.map((c) => roomName(c.slug))).toEqual(channels.map((c) => c.name)); expect(roomName('drafting-desk')).toBe('The Drafting Desk'); expect(roomName('mystery')).toBe('mystery'); expect(roomName('')).toBe(''); expect(roomName(null)).toBe('')
  })
})

describe('which pages of a room list posts, and how a post gets on them', () => {
  it('the Idea Hatchery: Stop Motion by tag, and Come Study With Me behind its door; not the story page (it has its own design), not the old gallery kept for old links, and no longer Writing Prompts (moved to the Drafting Desk)', () => {
    expect(pagesOfRoom('idea-hatchery')).toEqual([
      { name: 'Stop Motion', to: '/idea-hatchery/stop-motion', tags: ['stop-motion'] },
      { name: 'Come Study With Me', to: '/idea-hatchery/come-study-with-me', tags: ['come-study-with-me'] },
    ])
    expect(names('idea-hatchery')).not.toContain('Writing Prompts')
    expect(names('idea-hatchery')).not.toContain('Let\u2019s write a story'); expect(names('idea-hatchery')).not.toContain('Short Stories')
  })
  it('the Leadership Lounge: Leading from the Middle by tag, and the Blog, which shows every post in the room', () => {
    expect(pagesOfRoom('leadership-lounge').map((p) => [p.name, p.tags])).toEqual([['Leading from the Middle', ['leading-from-the-middle']], ['Leadership Blog', null]])
  })
  it('Explorer\u2019s Bay: Writing in Transit and Lessons from the road, by tag (the old Photography address is kept for links but no longer lists posts)', () => {
    expect(pagesOfRoom('explorers-bay').map((p) => [p.name, p.tags])).toEqual([['Writing in Transit', ['writing-in-transit']], ['Lessons from the road', ['lessons-from-the-road']]])
  })
  it('the Drafting Desk: Archive Entries, the Author\u2019s Notebook, Writing Prompts and Poems, each by its accepted tags', () => {
    expect(pagesOfRoom('drafting-desk')).toEqual([
      { name: 'Archive Entries', to: '/drafting-desk/archive-entries', tags: ['archive-entries', 'archive-entry'] },
      { name: 'Author\u2019s Notebook', to: '/drafting-desk/authors-notebook', tags: ['authors-notebook', 'notebook'] },
      { name: 'Writing Prompts', to: '/drafting-desk/writing-prompts', tags: ['writing-prompts', 'writing-prompt'] },
      { name: 'Poems', to: '/drafting-desk/poems', tags: ['poems', 'poem', 'poetry'] },
    ])
  })
  it('the Factory Floor: every post in the room is a note on the floor', () => {
    expect(pagesOfRoom('factory-floor')).toEqual([{ name: 'The Factory Floor', to: '/factory-floor', tags: null }])
  })
  it('the Knowledge Nook and Sarah Jr.\u2019s Den: the pages behind their doors, by the door\u2019s name as a tag, and the Book Club\u2019s reviews; not the pages with their own design', () => {
    expect(names('knowledge-nook')).toEqual(expect.arrayContaining(['Research', 'Book to Screen', 'Book Club (reviews and conversations)', 'Story Ledger (audits)'])); expect(names('knowledge-nook')).not.toContain('Story Ledger'); expect(names('knowledge-nook')).not.toContain('Come Read With Me'); expect(names('knowledge-nook')).not.toContain('Book Club')
    expect(pagesOfRoom('knowledge-nook').find((p) => p.name.startsWith('Story Ledger')).tags).toEqual(['story-ledger'])
    expect(pagesOfRoom('knowledge-nook').find((p) => p.name === 'Research').tags).toEqual(['research']); expect(pagesOfRoom('knowledge-nook').find((p) => p.name.startsWith('Book Club')).tags).toEqual(['book-club'])
    expect(names('sarah-jrs-den')).toEqual(expect.arrayContaining(['Blog', "Daryl's Adventures", 'Books'])); expect(names('sarah-jrs-den')).not.toContain('YouTube Series')
  })
  it('a room that lists no posts, or one that does not exist, has no pages', () => {
    expect(pagesOfRoom('art-loft')).toEqual([]); expect(pagesOfRoom('mystery')).toEqual([]); expect(pagesOfRoom(undefined)).toEqual([])
  })
})

describe('where a post appears', () => {
  it('on the page whose tag it carries, and always on the blog page', () => {
    const p = post('a', 'idea-hatchery', ['Stop Motion', 'clay'])
    expect(pagesFor(p).map((x) => x.name)).toEqual(['Stop Motion']); expect(whereIs(p)).toBe('Appears on: Stop Motion, and the blog page (which lists every post from every room).')
  })
  it('does not mind capitals, spaces or apostrophes in a tag, and a post can be on two pages', () => {
    expect(pagesFor(post('a', 'explorers-bay', ['WRITING IN TRANSIT', 'Lessons from the road'])).map((x) => x.name)).toEqual(['Writing in Transit', 'Lessons from the road']); expect(pagesFor(post('b', 'drafting-desk', ['Archive Entries'])).map((x) => x.name)).toEqual(['Archive Entries']); expect(pagesFor(post('c', 'drafting-desk', ['notebook'])).map((x) => x.name)).toEqual(['Author\u2019s Notebook'])
  })
  it('the Story Ledger\u2019s audits (tagged story-ledger) and the Book Club\u2019s reviews (tagged book-club) appear on their pages, not as missing', () => {
    expect(whereIs(post('a', 'knowledge-nook', ['story-ledger']))).toBe('Appears on: Story Ledger (audits), and the blog page (which lists every post from every room).'); expect(whereIs(post('b', 'knowledge-nook', ['Book Club', 'fiction']))).toContain('Appears on: Book Club (reviews and conversations)')
    expect(whereIs(post('c', 'knowledge-nook', ['random']))).toMatch(/^Not on a page of Knowledge Nook yet/)
  })
  it('on a page that shows every post in the room, whatever its tags', () => {
    expect(pagesFor(post('a', 'leadership-lounge', [])).map((x) => x.name)).toEqual(['Leadership Blog']); expect(pagesFor(post('b', 'factory-floor', null)).map((x) => x.name)).toEqual(['The Factory Floor'])
  })
  it('says which tags would put a post on a page when none of its tags does (the missing-test-post case)', () => {
    const text = whereIs(post('a', 'idea-hatchery', ['random', 'test']))
    expect(text).toMatch(/^Not on a page of The Idea Hatchery yet, because none of its tags is one that room's pages use\./); expect(text).toContain('It appears on the blog page'); expect(text).toContain('stop-motion (Stop Motion)'); expect(text).toContain('come-study-with-me (Come Study With Me)'); expect(text).not.toContain('writing-prompts')
    expect(whereIs(post('b', 'drafting-desk', null))).toContain('archive-entries (Archive Entries)')
  })
  it('says a draft appears nowhere, even if its tags would match', () => {
    expect(whereIs(post('a', 'idea-hatchery', ['stop-motion'], false))).toBe('Not published, so it does not appear anywhere yet.'); expect(pagesFor(post('a', 'idea-hatchery', ['stop-motion'], false))).toEqual([])
  })
  it('says so for a post with no room, and for a room with no pages that list posts', () => {
    expect(whereIs(post('a', null, ['x']))).toBe('It has no room, so it appears only on the blog page (which lists every post from every room).'); expect(whereIs(post('b', 'art-loft', []))).toBe('No page in The Art Loft lists posts. It appears only on the blog page (which lists every post from every room).')
    expect(whereIs(null)).toBe(''); expect(pagesFor(null)).toEqual([])
  })
})

describe('filtering the list', () => {
  const posts = [post('1', 'idea-hatchery', ['stop-motion'], true, 'A tiny world in clay'), post('2', 'idea-hatchery', [], false, 'Draft idea'), post('3', 'explorers-bay', ['photography'], true, 'Sunrise'), post('4', null, [], true, 'Lost post'), post('5', 'leadership-lounge', ['x'], true, 'Leading well'), null]
  it('shows only published posts to start with, only drafts if asked, or everything', () => {
    expect(filterPosts(posts).map((p) => p.id)).toEqual(['1', '3', '4', '5']); expect(filterPosts(posts, { show: 'unpublished' }).map((p) => p.id)).toEqual(['2']); expect(filterPosts(posts, { show: 'all' }).map((p) => p.id)).toEqual(['1', '2', '3', '4', '5'])
  })
  it('narrows to one room, or to posts with no room', () => {
    expect(filterPosts(posts, { room: 'idea-hatchery', show: 'all' }).map((p) => p.id)).toEqual(['1', '2']); expect(filterPosts(posts, { room: 'none' }).map((p) => p.id)).toEqual(['4']); expect(filterPosts(posts, { room: 'art-loft' })).toEqual([])
  })
  it('searches the titles, ignoring capitals and a gap at either end', () => {
    expect(filterPosts(posts, { search: '  CLAY ' }).map((p) => p.id)).toEqual(['1']); expect(filterPosts(posts, { search: 'zzz' })).toEqual([]); expect(filterPosts(posts, { search: '' }).length).toBe(4)
  })
  it('combines the three, and copes with a list that is not a list', () => {
    expect(filterPosts(posts, { room: 'idea-hatchery', show: 'all', search: 'draft' }).map((p) => p.id)).toEqual(['2']); expect(filterPosts(null)).toEqual([]); expect(filterPosts(undefined, {})).toEqual([])
  })
  it('counts the posts in each room under the chosen published choice, with posts that have no room counted separately', () => {
    expect(countByRoom(posts)).toEqual({ all: 4, none: 1, rooms: { 'idea-hatchery': 1, 'explorers-bay': 1, 'leadership-lounge': 1 } }); expect(countByRoom(posts, 'all')).toEqual({ all: 5, none: 1, rooms: { 'idea-hatchery': 2, 'explorers-bay': 1, 'leadership-lounge': 1 } }); expect(countByRoom(posts, 'unpublished')).toEqual({ all: 1, none: 0, rooms: { 'idea-hatchery': 1 } })
  })
})
