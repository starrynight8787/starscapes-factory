import { useEffect, useState } from 'react'
import { recordRead } from '../entries/readsApi'
import { claimFirstChaptersIfChapter } from '../atlas/atlasApi'
import { WORDS as PUBLISH_WORDS, isPublished, setPublished } from './postPublish'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import BackToPosts from '../components/BackToPosts'
import { channels } from '../data/channels'
import { safeImage } from '../rooms/postRules'
import useTitle from './useTitle'
import PostGate from '../membership/PostGate'
import { cleanPass, hasPassColumn, loadLockedBody } from '../membership/lockedPosts'
import '../styles/articles.css'
import '../rooms/roompages.css'
import '../styles/pages.css'
import '../components/pagebanner.css'
import './postv2.css'

// The picture on the banner changes with the room the post belongs to, so a reader can tell which room they are in.

export default function PostPage({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishNote, setPublishNote] = useState(null) // { ok, text }: what happened when the author published or took the post down
  const [body, setBody] = useState(null) // the words of a locked post, if this person may read them
  const [gated, setGated] = useState(false) // a locked post this person may not read
  useTitle(post ? post.title : 'Post') // the tab, and a search result, say which post this is

  useEffect(() => {
    async function fetchPost() {
      const columns = 'id, title, content, image_url, created_at, author_id, tags, channel, published'
      // the database may not have been given the pass column yet: carry on without it, and every post is free
      let { data, error } = await supabase.from('posts').select(columns + ', pass').eq('id', id).single()
      if (error && /\bpass\b/i.test(String(error.message || ''))) ({ data, error } = await supabase.from('posts').select(columns).eq('id', id).single())

      if (error) {
        setError(error.message)
      } else {
        setPost(data)
        recordRead(id)
        if (session) claimFirstChaptersIfChapter(id) // chapter 3 of a story earns the First three chapters stamp in the Star Atlas (quiet: it never gets in the way)
        // A post that belongs to a pass keeps its words in a separate table that the database only opens for the right people
        if (hasPassColumn(data) && cleanPass(data.pass)) {
          try {
            const words = await loadLockedBody(id)
            if (words === null) setGated(true)
            else setBody(words)
          } catch (e) {
            setError('We could not load this post just now. Please try again in a moment.')
          }
        }
      }
      setLoading(false)
    }

    fetchPost()
  }, [id])

  async function handleDelete() {
    const confirmed = window.confirm('Delete this post? This cannot be undone.')
    if (!confirmed) return

    setDeleting(true)
    const { error } = await supabase.from('posts').delete().eq('id', id)
    setDeleting(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate('/')
  }

  // The author publishes a draft, or takes a post down (it becomes a draft: nothing is deleted). Taking one down asks first.
  async function handleTogglePublished() {
    const next = !isPublished(post)
    if (!next && !window.confirm(PUBLISH_WORDS.askUnpublish)) return
    setPublishing(true)
    setPublishNote(null)
    try {
      await setPublished(post.id, next)
      setPost((p) => ({ ...p, published: next }))
      setPublishNote({ ok: true, text: next ? PUBLISH_WORDS.nowPublished : PUBLISH_WORDS.nowDraft })
    } catch (e) {
      setPublishNote({ ok: false, text: e.message })
    } finally {
      setPublishing(false)
    }
  }

  if (loading) return <p>Loading...</p>
  if (error) return <p className="error">{error}</p>
  if (!post) return <p>Post not found.</p>

  const isAuthor = session && session.user.id === post.author_id
  const room = channels.find((c) => c.slug === post.channel)
  const picture = safeImage(post.image_url)
  const when = new Date(post.created_at)
  const date = Number.isNaN(when.getTime()) ? '' : when.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <main className={`pg pg-post pg-post--v2 pg-post--${post.channel || 'room'}`}>
      <p className="rp-back">
        <BackToPosts />
      </p>
      <div className="pb--starry pg-post__hero">
      <header className="pb pb--starry pb--post">
        <div className="pb__text">
          <div className="pg-post__meta">
            {room && <span className="pg-chip">{room.name}</span>}
            {date && <time className="pg-post__date" dateTime={when.toISOString()}>{date}</time>}
          </div>
          <h1 className="sf-article-title pb__title">{post.title}</h1>
        </div>
      </header>
      <article className="pg-post__card">
        {picture && (
          <img
            className="pg-post__image"
            src={picture}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = 'none' // a picture that will not load leaves the page tidy, not broken
            }}
          />
        )}
      {gated ? <PostGate pass={cleanPass(post.pass)} signedIn={Boolean(session)} /> : <div className="pg-post__body">{body !== null ? body : post.content}</div>}
      </article>
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className="pg-tags">
          {post.tags.map((tag) => (
            <Link key={tag} to={`/blog?tag=${encodeURIComponent(tag)}`} className="pg-chip">
              {tag}
            </Link>
          ))}
        </div>
      )}

      {isAuthor && !isPublished(post) && <p className="pg-draftnote">{PUBLISH_WORDS.draftNote}</p>}
      {isAuthor && (
        <div className="pg-actions">
          <Link to={`/edit/${post.id}`}>
            <button className="pg-btn">Edit</button>
          </Link>
          <button className="pg-btn" onClick={handleTogglePublished} disabled={publishing}>
            {publishing ? 'Saving...' : isPublished(post) ? 'Unpublish' : 'Publish'}
          </button>
          <button className="pg-btn pg-btn--danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}
      {isAuthor && publishNote && <p className={`pg-draftnote${publishNote.ok ? '' : ' pg-draftnote--bad'}`} role={publishNote.ok ? 'status' : 'alert'}>{publishNote.text}</p>}
    </main>
  )
}
