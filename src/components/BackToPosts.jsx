import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { targetFromPath, targetFromPost } from './backTarget'

// The "Back" link at the top of a post.
//  - If you came from a list on this site, it takes you back to that exact list (filters and all).
//  - Otherwise (a direct link, a search engine) it takes you to the room the post belongs to.
export default function BackToPosts() {
  const { id } = useParams()
  const location = useLocation()
  const fromState = targetFromPath(location.state && location.state.from)
  const [fetched, setFetched] = useState(null)
  const known = fromState ? fromState.to : null

  useEffect(() => {
    if (known) return undefined
    let alive = true
    Promise.resolve(supabase.from('posts').select('title, tags, channel').eq('id', id).maybeSingle())
      .then((res) => {
        if (alive && res && res.data) setFetched(targetFromPost(res.data))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [id, known])

  const target = fromState || fetched || { to: '/blog', label: 'all posts' }
  return (
    <Link to={target.to} className="back-to-posts">
      &larr; Back to {target.label}
    </Link>
  )
}
