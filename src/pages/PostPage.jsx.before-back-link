import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function PostPage({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function fetchPost() {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, image_url, created_at, author_id, tags')
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

  return (
    <div className="post-detail">
      <p>
        <Link to="/">&larr; Back to all posts</Link>
      </p>
      <h1>{post.title}</h1>
      <p className="muted">{new Date(post.created_at).toLocaleDateString()}</p>
      {post.image_url && <img src={post.image_url} alt={post.title} />}
      <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>

      {post.tags && post.tags.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {post.tags.map((tag) => (
            <Link
              key={tag}
              to={`/?tag=${tag}`}
              style={{
                display: 'inline-block',
                marginRight: 6,
                marginBottom: 6,
                background: '#eee',
                color: '#333',
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 999,
                textDecoration: 'none',
              }}
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      {isAuthor && (
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <Link to={`/edit/${post.id}`}>
            <button>Edit</button>
          </Link>
          <button onClick={handleDelete} disabled={deleting} style={{ background: '#c0392b' }}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  )
}