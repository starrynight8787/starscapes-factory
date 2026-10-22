import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import PageBanner from '../components/PageBanner'
import RoomEntry from '../rooms/RoomEntry'
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
      {countries.length > 0 && (
        <div className="xb-filter">
          <label htmlFor="xb-country" className="xb-filter__label">Find lessons by country</label>
          <select id="xb-country" className="xb-input xb-select" value={chosen} onChange={(e) => (e.target.value ? setParams({ country: e.target.value }) : setParams({}))}>
            <option value="">All countries ({posts.length})</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name} ({c.lessons.length})</option>
            ))}
          </select>
          {chosen && <button type="button" className="pg-chip" onClick={() => setParams({})}>Show all countries</button>}
        </div>
      )}
      {status === 'ready' && chosen && shown.length === 0 && <p className="rp-note">No lessons for that country yet.</p>}
      <ul className="rp-entries">
        {shown.map((p) => {
          const t = travelOf(p)
          return (
            <li key={p.id}>
              <RoomEntry post={p} from={here.pathname + here.search} meta={[t.country && countryName(t.country), t.year].filter(Boolean).join(' · ')} />
            </li>
          )
        })}
      </ul>
    </main>
  )
}
