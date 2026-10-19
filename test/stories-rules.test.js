// @vitest-environment node
// The plain rules for "Let's write a story" (src/stories/storiesRules.js).
import { describe, it, expect } from 'vitest'
import { FREE_CHAPTERS, LIMITS, chapterTag, slugFrom, cleanStory, cleanChapter, currentStory, completedStories, buildChapters } from '../src/stories/storiesRules'

const STORY = '11111111-2222-4333-8444-555555555555'
const POST = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

describe('which chapters are free', () => {
  it('are chapters 1 to 3, and chapter 4 onwards are for members', () => {
    expect(FREE_CHAPTERS).toBe(3)
    for (const n of [1, 2, 3, '2']) expect(chapterTag(n), String(n)).toEqual({ text: 'Free to read', tone: 'green' })
    for (const n of [4, 5, 10, 200, '4']) expect(chapterTag(n), String(n)).toEqual({ text: 'Members only', tone: 'blue' })
  })
})

describe('a story\u2019s address name', () => {
  it('is lower case letters, numbers and single dashes, made from the title', () => {
    expect(slugFrom('The Lantern & the Fox!')).toBe('the-lantern-and-the-fox'); expect(slugFrom('  Hello,   World  ')).toBe('hello-world'); expect(slugFrom('---')).toBe(''); expect(slugFrom(null)).toBe('')
    expect(slugFrom('a'.repeat(100)).length).toBeLessThanOrEqual(60); expect(slugFrom('Chapter 1: Begin')).toBe('chapter-1-begin')
  })
})

describe('checking a story before it is saved', () => {
  const good = { title: 'The Lantern', slug: '', teaser: 'It began with a light.', picture: '', status: 'running', finished: '' }
  it('accepts a good story, making the address name from the title, and tidies the words', () => {
    expect(cleanStory(good)).toEqual({ ok: true, value: { slug: 'the-lantern', title: 'The Lantern', teaser: 'It began with a light.', picture_url: null, status: 'running', finished_on: null } })
    expect(cleanStory({ ...good, title: '  The   Lantern ', teaser: '  ' }).value).toMatchObject({ title: 'The Lantern', teaser: null })
  })
  it('asks for a title, and not too long a one', () => {
    expect(cleanStory({ ...good, title: '  ' }).errors.title).toMatch(/title/); expect(cleanStory({ ...good, title: 'x'.repeat(LIMITS.title + 1) }).errors.title).toMatch(/120/)
  })
  it('refuses an address name with odd characters, and accepts a proper one in any case', () => {
    expect(cleanStory({ ...good, slug: 'Has Spaces' }).errors.slug).toBeTruthy(); expect(cleanStory({ ...good, slug: 'a/b' }).errors.slug).toBeTruthy(); expect(cleanStory({ ...good, slug: 'x'.repeat(61) }).errors.slug).toBeTruthy()
    expect(cleanStory({ ...good, slug: 'My-Story-2' }).value.slug).toBe('my-story-2')
  })
  it('keeps the first lines to 300 letters', () => {
    expect(cleanStory({ ...good, teaser: 'x'.repeat(301) }).errors.teaser).toMatch(/300/); expect(cleanStory({ ...good, teaser: 'x'.repeat(300) }).ok).toBe(true)
  })
  it('only takes a picture address that is a safe https picture', () => {
    expect(cleanStory({ ...good, picture: 'https://img.example.com/a.jpg' }).value.picture_url).toBe('https://img.example.com/a.jpg')
    for (const bad of ['http://img.example.com/a.jpg', 'javascript:alert(1)', 'https://x.com/a.pdf', 'https://x.com/a b.jpg']) expect(cleanStory({ ...good, picture: bad }).errors.picture, bad).toBeTruthy()
  })
  it('needs a finishing date for a finished story, a real one, and ignores a date for a story still being written', () => {
    expect(cleanStory({ ...good, status: 'completed' }).errors.finished).toMatch(/finished/); expect(cleanStory({ ...good, status: 'completed', finished: '2026-02-30' }).errors.finished).toMatch(/date/)
    expect(cleanStory({ ...good, status: 'completed', finished: '2026-10-31' }).value).toMatchObject({ status: 'completed', finished_on: '2026-10-31' })
    expect(cleanStory({ ...good, status: 'running', finished: '2026-10-31' }).value.finished_on).toBeNull(); expect(cleanStory({ ...good, status: 'nonsense' }).value.status).toBe('running')
  })
  it('gives all the problems at once, in plain words', () => {
    expect(Object.keys(cleanStory({ title: '', picture: 'nope', status: 'completed' }).errors).sort()).toEqual(['finished', 'picture', 'title'])
  })
})

describe('checking a chapter before it is saved', () => {
  it('accepts a chapter given as the post\u2019s code or its whole address, and gives back the story, the number and the post', () => {
    expect(cleanChapter({ story: STORY, number: '3', post: POST })).toEqual({ ok: true, value: { story_id: STORY, number: 3, post_id: POST } })
    expect(cleanChapter({ story: STORY, number: 1, post: `https://starscapesfactory.com/post/${POST}` }).value.post_id).toBe(POST)
    expect(cleanChapter({ story: STORY, number: 1, post: POST.toUpperCase() }).value.post_id).toBe(POST)
  })
  it('needs a story that is a real one, a whole number from 1 to 200, and a post address', () => {
    expect(cleanChapter({ story: '', number: 1, post: POST }).errors.story).toBeTruthy(); expect(cleanChapter({ story: 'not-an-id', number: 1, post: POST }).errors.story).toBeTruthy()
    for (const n of ['', '0', '-1', '1.5', '201', 'abc']) expect(cleanChapter({ story: STORY, number: n, post: POST }).errors.number, String(n)).toBeTruthy()
    for (const p of ['', 'hello', '123', 'https://example.com/other/page', `${POST}x`]) expect(cleanChapter({ story: STORY, number: 1, post: p }).errors.post, String(p)).toBeTruthy()
  })
})

describe('putting the page\u2019s lists together', () => {
  const s = (id, status, created, finished = null) => ({ id, status, created_at: created, finished_on: finished })
  it('picks the newest story that is still running as the one the page is about', () => {
    expect(currentStory([s('a', 'running', '2026-01-01'), s('b', 'running', '2026-06-01'), s('c', 'completed', '2026-09-01', '2026-09-30')]).id).toBe('b')
    expect(currentStory([s('c', 'completed', '2026-09-01', '2026-09-30')])).toBeNull(); expect(currentStory([])).toBeNull(); expect(currentStory(null)).toBeNull()
  })
  it('lists finished stories, the most recently finished first', () => {
    expect(completedStories([s('a', 'completed', '2026-01-01', '2026-02-01'), s('b', 'running', '2026-03-01'), s('c', 'completed', '2026-01-02', '2026-08-01')]).map((x) => x.id)).toEqual(['c', 'a']); expect(completedStories(undefined)).toEqual([])
  })
  it('gives a story\u2019s chapters in order, each with its post\u2019s title, picture and date; leaving out a chapter whose post cannot be seen', () => {
    const rows = [{ number: 3, post_id: 'p3' }, { number: 1, post_id: 'p1' }, { number: 2, post_id: 'gone' }, { number: 4, post_id: 'p4' }]
    const posts = [{ id: 'p1', title: 'One', image_url: 'https://x.com/a.jpg', created_at: '2026-10-01' }, { id: 'p3', title: 'Three', image_url: 'javascript:1', created_at: '2026-10-03' }, { id: 'p4', title: '', image_url: null, created_at: '2026-10-04' }]
    expect(buildChapters(rows, posts)).toEqual([
      { number: 1, postId: 'p1', title: 'One', image: 'https://x.com/a.jpg', createdAt: '2026-10-01' },
      { number: 3, postId: 'p3', title: 'Three', image: '', createdAt: '2026-10-03' },
      { number: 4, postId: 'p4', title: 'Chapter 4', image: '', createdAt: '2026-10-04' },
    ])
    expect(buildChapters(null, null)).toEqual([])
  })
})
