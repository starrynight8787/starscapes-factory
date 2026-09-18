import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, image_url, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setPosts(data)
      }
      setLoading(false)
    }

    fetchPosts()
  }, [])

  if (loading) return <p>Loading posts...</p>
  if (error) return <p className="error">{error}</p>
  if (posts.length === 0) return <p className="muted">No posts yet. Check back soon!</p>

  return (
    <div>
      <h1>Latest Posts</h1>
      {posts.map((post) => (
        <div className="post-card" key={post.id}>
          {post.image_url && <img src={post.image_url} alt={post.title} />}
          <h2>
            <Link to={`/post/${post.id}`}>{post.title}</Link>
          </h2>
          <p className="muted">{new Date(post.created_at).toLocaleDateString()}</p>
          <p>{post.content.slice(0, 160)}...</p>
        </div>
      ))}
    </div>
  )
}
