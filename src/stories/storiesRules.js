// The plain rules for "Let's write a story": which chapters are free, how a story and a chapter are checked before they are saved, and how the page's lists are put together.
// Nothing here talks to the database.
import { postIdFrom, safeCover } from '../bookclub/bookRules'

export const FREE_CHAPTERS = 3 // chapters 1 to 3 of every story are free to read; chapter 4 and on need the Come Write With Me pass
export const LIMITS = { title: 120, teaser: 300, slug: 60, maxChapter: 200 }
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLUG = /^[a-z0-9-]{1,60}$/

const tidy = (v) => String(v === null || v === undefined ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v

// The tag on a chapter's card: free for the first three, members only after that
export const chapterTag = (number) => (Number(number) <= FREE_CHAPTERS ? { text: 'Free to read', tone: 'green' } : { text: 'Members only', tone: 'blue' })

// A story's address name from its title: lower case letters, numbers and dashes
export const slugFrom = (title) => String(title || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, LIMITS.slug).replace(/-+$/, '')

// Checks one story before it is saved. Returns { ok: true, value } or { ok: false, errors } with plain words for each problem.
export function cleanStory(input) {
  const i = input || {}
  const errors = {}
  const title = tidy(i.title)
  if (!title) errors.title = 'Give the story a title.'
  else if (title.length > LIMITS.title) errors.title = `Keep the title to ${LIMITS.title} letters or fewer.`
  const slug = tidy(i.slug).toLowerCase() || slugFrom(title)
  if (title && !SLUG.test(slug)) errors.slug = 'Use only lower case letters, numbers and dashes, up to 60 of them.'
  const teaser = tidy(i.teaser)
  if (teaser.length > LIMITS.teaser) errors.teaser = `Keep the first lines to ${LIMITS.teaser} letters or fewer.`
  const pictureText = tidy(i.picture)
  const picture = pictureText ? safeCover(pictureText) : ''
  if (pictureText && !picture) errors.picture = 'Use a web address starting https:// and ending .jpg, .png or .webp.'
  const status = i.status === 'completed' ? 'completed' : 'running'
  const finished = tidy(i.finished)
  if (status === 'completed' && !finished) errors.finished = 'Say when the story was finished.'
  else if (finished && !isDate(finished)) errors.finished = 'Use a date such as 2026-10-31.'
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { slug, title, teaser: teaser || null, picture_url: picture || null, status, finished_on: status === 'completed' ? finished : null } }
}

// Checks one chapter (which post is chapter which number of which story). The post is what Gill pastes: its address, or the code at the end of it.
export function cleanChapter(input) {
  const i = input || {}
  const errors = {}
  const storyId = tidy(i.story)
  if (!UUID.test(storyId)) errors.story = 'Choose the story this chapter belongs to.'
  const n = Number(tidy(i.number))
  if (!Number.isInteger(n) || n < 1 || n > LIMITS.maxChapter) errors.number = `Give the chapter a number from 1 to ${LIMITS.maxChapter}.`
  const postId = postIdFrom(i.post)
  if (!postId || !UUID.test(postId)) errors.post = 'Paste the address of the post (it ends with /post/ and a long code), or just that code.'
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { story_id: storyId, number: n, post_id: postId.toLowerCase() } }
}

// The story the page is about: the newest one that is still running
export const currentStory = (stories) => (Array.isArray(stories) ? stories.filter((s) => s && s.status === 'running').sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null : null)

// The finished stories, the most recently finished first
export const completedStories = (stories) => (Array.isArray(stories) ? stories.filter((s) => s && s.status === 'completed').sort((a, b) => String(b.finished_on).localeCompare(String(a.finished_on)) || String(b.created_at).localeCompare(String(a.created_at))) : [])

// One story's chapters, in order, each with its post's title, picture and date. A chapter whose post cannot be seen (not published, or gone) is left out, and so is one with no number.
export function buildChapters(rows, posts) {
  const byId = new Map((Array.isArray(posts) ? posts : []).filter((p) => p && p.id).map((p) => [p.id, p]))
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => r && Number.isInteger(r.number) && byId.has(r.post_id))
    .map((r) => { const p = byId.get(r.post_id); return { number: r.number, postId: r.post_id, title: p.title || `Chapter ${r.number}`, image: safeCover(p.image_url), createdAt: p.created_at } })
    .sort((a, b) => a.number - b.number)
}
