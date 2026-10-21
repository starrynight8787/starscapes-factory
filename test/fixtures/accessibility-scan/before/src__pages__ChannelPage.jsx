import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { channels } from '../data/channels'
import { supabase } from '../supabaseClient'
import PostCard from '../components/PostCard'

export default function ChannelPage() {
  const { slug } = useParams()
  const channel = channels.find((c) => c.slug === slug)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPosts() {
      if (!channel) {
        setLoading(false)
        return
      }
      setLoading(true)
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, image_url, tags, created_at')
        .eq('published', true)
        .eq('channel', channel.slug)
        .order('created_at', { ascending: false })

      if (!error) setPosts(data)
      setLoading(false)
    }

    fetchPosts()
  }, [slug])

  if (!channel) {
    return (
      <div>
        <p>
          <Link to="/">&larr; Back home</Link>
        </p>
        <p>Channel not found.</p>
      </div>
    )
  }

  const [featuredPost, ...restPosts] = posts

  return (
    <div>
      <p>
        <Link to="/">&larr; Back to all channels</Link>
      </p>
      <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 32 }}>
        <div style={{ fontSize: 48 }}>{channel.emoji}</div>
        <h1 style={{ marginBottom: 4 }}>{channel.name}</h1>
        <p className="muted" style={{ fontStyle: 'italic' }}>
          {channel.tagline}
        </p>
        <p style={{ maxWidth: 500, margin: '24px auto', lineHeight: 1.6 }}>{channel.blurb}</p>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && posts.length === 0 && (
        <p className="muted" style={{ textAlign: 'center' }}>
          No posts yet. Check back soon!
        </p>
      )}

      {!loading && posts.length > 0 && channel.layout === 'gallery' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
          }}
        >
          {posts.map((post) => (
            <PostCard key={post.id} post={post} variant="gallery" />
          ))}
        </div>
      )}

      {!loading && posts.length > 0 && channel.layout === 'post-feed' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} variant="feed" />
          ))}
        </div>
      )}

      {!loading && posts.length > 0 && channel.layout === 'featured' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {featuredPost && <PostCard post={featuredPost} variant="featured" />}
          {restPosts.map((post) => (
            <PostCard key={post.id} post={post} variant="feed" />
          ))}
        </div>
      )}
    </div>
  )
}