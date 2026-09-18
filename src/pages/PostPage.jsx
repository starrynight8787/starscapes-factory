import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function PostPage() {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchPost() {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, image_url, created_at')
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

  if (loading) return <p>Loading...</p>
  if (error) return <p className="error">{error}</p>
  if (!post) return <p>Post not found.</p>

  return (
    <div className="post-detail">
      <p>
        <Link to="/">&larr; Back to all posts</Link>
      </p>
      <h1>{post.title}</h1>
      <p className="muted">{new Date(post.created_at).toLocaleDateString()}</p>
      {post.image_url && <img src={post.image_url} alt={post.title} />}
      <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
    </div>
  )
}
