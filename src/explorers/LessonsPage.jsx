import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import PageBanner from '../components/PageBanner'
import { formatDate } from '../rooms/postRules'
import { fetchTravelPosts } from './travelApi'
import { byCountry, countryName, isLesson, travelOf, cleanCountry } from './travelRules'
import '../rooms/roompages.css'
import '../rooms/roomblog.css'
import './explorers.css'

// Lessons from the road: the published lessons, newest first, that can be narrowed to one country. (Figma E6.)
export default function LessonsPage() {
  useTitle('Lessons from the road')
  const here = useLocation()
  const [params, setParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const chosen = cleanCountry(params.get('country') || '')

  useEffect(() => {
    let alive = true
    fetchTravelPosts()
      .then((data) => alive && (setPosts(data.filter(isLesson)), setStatus('ready')))
      .catch(() => alive && setStatus('error'))
    return () => { alive = false }
  }, [])

  const countries = useMemo(() => Object.values(byCountry(posts)).sort((a, b) => a.name.localeCompare(b.name, 'en-GB')), [posts])
  const shown = chosen ? posts.filter((p) => travelOf(p).country === chosen) : posts

  return (
    <main className="rp rp--room rp--explorers-bay">
      <p className="rp-back"><Link to="/explorers-bay">← Back to Explorer&apos;s Bay</Link></p>
      <PageBanner chip="Explorer's Bay" title="Lessons from the road" subtitle="What each place taught me, what to look out for, and where to find the official travel advice." art="transit" room="explorers-bay" />
      {status === 'error' && <p className="rp-note" role="alert">The lessons could not load just now. Please try again in a moment.</p>}
      {status === 'loading' && <p className="rp-note">Loading…</p>}
      {status === 'ready' && posts.length === 0 && <p className="rp-note">Nothing here yet. Check back soon.</p>}
      {countries.length > 1 && (
        <nav className="xb-filter" aria-label="Choose a country">
          <button type="button" className="pg-chip" aria-pressed={!chosen} onClick={() => setParams({})}>All countries</button>
          {countries.map((c) => (
            <button key={c.code} type="button" className="pg-chip" aria-pressed={chosen === c.code} onClick={() => setParams({ country: c.code })}>{c.name}</button>
          ))}
        </nav>
      )}
      <ul className="rp-list" style={{ listStyle: 'none', padding: 0 }}>
        {shown.map((p) => {
          const t = travelOf(p)
          return (
            <li key={p.id}>
              <Link className="rp-entry" to={`/post/${p.id}`} state={{ from: here.pathname + here.search }}>
                <span className="rp-entry__title">{p.title}</span>
                <span className="rp-entry__date">{[t.country && countryName(t.country), t.year, formatDate(p.created_at)].filter(Boolean).join(' · ')}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
