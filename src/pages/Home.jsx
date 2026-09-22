import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTag = searchParams.get('tag')

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true)

      let query = supabase
        .from('posts')
        .select('id, title, content, image_url, tags, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })

      if (activeTag) {
        query = query.contains('tags', [activeTag])
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
      } else {
        setPosts(data)
      }
      setLoading(false)
    }

    fetchPosts()
  }, [activeTag])

  function handleTagClick(tag) {
    setSearchParams({ tag })
  }

  function clearFilter() {
    setSearchParams({})
  }

  if (loading) return <p>Loading posts...</p>
  if (error) return <p className="error">{error}</p>

  return (
    <div>
      <h1>Latest Posts</h1>

      {activeTag && (
        <p className="muted">
          Filtering by tag: <strong>{activeTag}</strong>{' '}
          <button onClick={clearFilter} style={{ marginLeft: 8 }}>
            Clear
          </button>
        </p>
      )}

      {posts.length === 0 && <p className="muted">No posts yet. Check back soon!</p>}

      {posts.map((post) => (
        <div className="post-card" key={post.id}>
          {post.image_url && <img src={post.image_url} alt={post.title} />}
          <h2>
            <Link to={`/post/${post.id}`}>{post.title}</Link>
          </h2>
          <p className="muted">{new Date(post.created_at).toLocaleDateString()}</p>
          <p>{post.content.slice(0, 160)}...</p>
          {post.tags && post.tags.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {post.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  style={{
                    marginRight: 6,
                    marginBottom: 6,
                    background: '#eee',
                    color: '#333',
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 999,
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}