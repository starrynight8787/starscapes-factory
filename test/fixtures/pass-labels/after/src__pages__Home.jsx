import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { formatDate } from '../rooms/postRules'
import '../rooms/roompages.css'
import '../styles/pages.css'
import '../styles/articles.css'
import PassChip from '../membership/PassChip'

// Every published post from every room, newest first, at /blog. The tags found on the posts become the filter above the list.
// The rows are the same cards as on the room pages (roompages.css), with the whole row a link.
export default function Home() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTag = searchParams.get('tag')
  const here = useLocation() // remembered, so a post's Back link can return to this exact list

  useEffect(() => {
    let alive = true
    async function fetchPosts() {
      const { data, error: problem } = await supabase
        .from('posts')
        .select('id, title, tags, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
      if (!alive) return
      if (problem) setError(true)
      else setPosts(data || [])
      setLoading(false)
    }
    fetchPosts()
    return () => {
      alive = false
    }
  }, [])

  const allTags = useMemo(() => [...new Set(posts.flatMap((p) => (Array.isArray(p.tags) ? p.tags : [])))].sort((a, b) => a.localeCompare(b)), [posts])
  const shown = activeTag ? posts.filter((p) => Array.isArray(p.tags) && p.tags.includes(activeTag)) : posts

  if (loading) return <p className="rp-note">Loading posts…</p>
  if (error) return <p className="rp-note" role="alert">The posts could not load just now. Please try again in a moment.</p>

  return (
    <main className="pg pg--list">
      <header className="rp-head">
        <h1>All posts</h1>
        <p className="rp-blurb">Every post from every room, newest first.</p>
      </header>

      {allTags.length > 0 && (
        <div className="pg-filter" role="group" aria-label="Filter by tag">
          <button type="button" className="pg-chip" aria-pressed={!activeTag} onClick={() => setSearchParams({})}>
            All
          </button>
          {allTags.map((tag) => (
            <button key={tag} type="button" className="pg-chip" aria-pressed={activeTag === tag} onClick={() => setSearchParams({ tag })}>
              {tag}
            </button>
          ))}
        </div>
      )}

      {posts.length === 0 && <p className="rp-note">No posts yet. Check back soon!</p>}
      {posts.length > 0 && shown.length === 0 && <p className="rp-note">No posts have that tag.</p>}

      <ul className="rp-entries">
        {shown.map((post) => {
          const date = formatDate(post.created_at)
          return (
            <li key={post.id}>
              <article className="rp-entry pg-row">
                <h2 className="sf-article-title rp-entry__title">
                  <Link to={`/post/${post.id}`} state={{ from: here.pathname + here.search }}>
                    {post.title}
                  </Link>
                </h2>
                <PassChip postId={post.id} />
                {date && <span className="rp-entry__date">{date}</span>}
              </article>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
