import { supabase } from '../supabaseClient'
import { resetPassIndex } from '../membership/passIndex'

// Publishing a post, and taking one down (SFW-251). A draft is a post whose "published" choice is off: only the person who wrote it can see it, and nothing is deleted. Publishing it, or taking it
// down again, only ever changes that one choice. The same words are used on the New post, Edit post, All posts and post pages.
export const WORDS = {
  askUnpublish: 'Take this post down? Visitors will no longer be able to read it. Nothing is deleted, and you can publish it again at any time.',
  nowPublished: 'Published. Visitors can read it now.',
  nowDraft: 'Taken down. It is a draft now: only you can see it.',
  draftNote: 'This post is a draft. Only you can see it. Visitors cannot.',
  switchOn: 'Visitors can read this post. Switch it off to take it down and keep it as a draft: only you can see it, and nothing is deleted.',
  switchOff: 'This post is a draft: only you can see it. Switch it on to publish it.',
  notChanged: 'Nothing changed. A post can only be changed by the account that wrote it, so please check you are signed in with that account.',
  failed: 'The post could not be changed just now. Please try again in a moment.',
}

// A post with no choice recorded counts as published, so nothing is ever taken down by a guess.
export const isPublished = (post) => !post || post.published !== false

// Changes ONLY the published choice of one post. The database lets only the post's author change it, and when it refuses it does so by changing nothing and saying nothing, so a change of no rows is
// reported as a failure (never as "done"). A problem comes back in plain words, with none of the database's own.
export async function setPublished(id, published) {
  let response
  try {
    response = await supabase.from('posts').update({ published: Boolean(published) }).eq('id', id).select('id')
  } catch (e) {
    throw new Error(WORDS.failed)
  }
  const { data, error } = response || {}
  if (error) throw new Error(WORDS.failed)
  if (!Array.isArray(data) || data.length === 0) throw new Error(WORDS.notChanged)
  resetPassIndex()
  return Boolean(published)
}
