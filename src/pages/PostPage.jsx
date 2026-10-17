import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import BackToPosts from '../components/BackToPosts'
import { channels } from '../data/channels'
import { safeImage } from '../rooms/postRules'
import useTitle from './useTitle'
import '../styles/articles.css'
import '../rooms/roompages.css'
import '../styles/pages.css'

export default function PostPage({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  useTitle(post ? post.title : 'Post') // the tab, and a search result, say which post this is

  useEffect(() => {
    async function fetchPost() {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, image_url, created_at, author_id, tags, channel')
        .eq('id', id)
        .single()

      if (error) {
        setError(error.message)
      } else {
        setPost(data)
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

  if (loading) return <p>Loading...</p>
  if (error) return <p className="error">{error}</p>
  if (!post) return <p>Post not found.</p>

  const isAuthor = session && session.user.id === post.author_id
  const room = channels.find((c) => c.slug === post.channel)
  const picture = safeImage(post.image_url)
  const when = new Date(post.created_at)
  const date = Number.isNaN(when.getTime()) ? '' : when.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <main className="pg pg-post">
      <p className="rp-back">
        <BackToPosts />
      </p>
      <div className="pg-post__meta">
        {room && <span className="pg-chip">{room.name}</span>}
        {date && <time className="pg-post__date" dateTime={when.toISOString()}>{date}</time>}
      </div>
      <h1 className="sf-article-title">{post.title}</h1>
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
      <div className="pg-post__body">{post.content}</div>

      {post.tags && post.tags.length > 0 && (
        <div className="pg-tags">
          {post.tags.map((tag) => (
            <Link key={tag} to={`/blog?tag=${encodeURIComponent(tag)}`} className="pg-chip">
              {tag}
            </Link>
          ))}
        </div>
      )}

      {isAuthor && (
        <div className="pg-actions">
          <Link to={`/edit/${post.id}`}>
            <button className="pg-btn">Edit</button>
          </Link>
          <button className="pg-btn pg-btn--danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}
    </main>
  )
}
