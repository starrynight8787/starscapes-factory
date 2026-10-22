import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import PageBanner from '../components/PageBanner'
import { fetchTravelPosts } from './travelApi'
import { byCountry, cleanCountry, countryName, yearsLine } from './travelRules'
import '../rooms/roompages.css'
import './explorers.css'

// The Travel map (Figma E8). The map is drawn here, from outlines kept in this project (mapData.json), so no map service is contacted and no cookies are set.
// A country that has something to read is coloured in and can be chosen with a tap, a click or the keyboard; the panel under the map lists its Lessons and its Writing in Transit pieces.
export default function TravelMapPage() {
  useTitle('Travel map')
  const [params, setParams] = useSearchParams()
  const [map, setMap] = useState(null)
  const [posts, setPosts] = useState([])
  const [status, setStatus] = useState('loading')
  const chosen = cleanCountry(params.get('country') || '')

  useEffect(() => {
    let alive = true
    import('./mapData.json').then((m) => alive && setMap(m.default || m)).catch(() => alive && setStatus('error'))
    fetchTravelPosts()
      .then((data) => alive && (setPosts(data), setStatus('ready')))
      .catch(() => alive && setStatus('error'))
    return () => { alive = false }
  }, [])

  const places = useMemo(() => byCountry(posts), [posts])
  const count = Object.keys(places).length
  const pick = (code) => setParams(code === chosen ? {} : { country: code }, { replace: true })
  const here = chosen ? places[chosen] : null

  return (
    <main className="rp rp--room rp--explorers-bay xb-map-page">
      <p className="rp-back"><Link to="/explorers-bay">← Back to Explorer&apos;s Bay</Link></p>
      <PageBanner chip="Explorer's Bay" title="Travel map" subtitle="Where I have been. Choose a country to see what I have written about it." art="transit" room="explorers-bay" />
      {status === 'error' && <p className="rp-note" role="alert">The map could not load just now. Please try again in a moment.</p>}
      {status === 'loading' && <p className="rp-note">Loading…</p>}
      {map && (
        <>
          <p className="xb-map__count" role="status">{count === 0 ? 'Nothing is on the map yet.' : `${count} ${count === 1 ? 'country' : 'countries'} with something to read.`}</p>
          <svg className="xb-map" viewBox={`0 0 ${map.w} ${map.h}`} role="group" aria-label="Map of the world. Countries with something to read can be chosen.">
            {map.countries.map((c) => {
              const has = Boolean(places[c.c])
              const label = has ? `${countryName(c.c) || c.c}, ${places[c.c].lessons.length + places[c.c].writing.length} to read` : undefined
              const on = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(c.c) } }
              return (
                <g key={c.c} className={`xb-map__country${has ? ' is-visited' : ''}${chosen === c.c ? ' is-chosen' : ''}`}
                  {...(has ? { role: 'button', tabIndex: 0, 'aria-label': label, 'aria-pressed': chosen === c.c, onClick: () => pick(c.c), onKeyDown: on } : { 'aria-hidden': true })}>
                  <path d={c.d} />
                  {c.p && has && <circle cx={c.p[0]} cy={c.p[1]} r="5" />}
                </g>
              )
            })}
          </svg>
          <section className="xb-panel" aria-live="polite">
            {here ? (
              <>
                <h2>{here.name}</h2>
                {yearsLine(here.years) && <p className="xb-panel__years">{yearsLine(here.years)}</p>}
                {here.lessons.length > 0 && (
                  <>
                    <h3>Lessons from the road</h3>
                    <ul>{here.lessons.map((p) => <li key={p.id}><Link to={`/post/${p.id}`}>{p.title}</Link></li>)}</ul>
                  </>
                )}
                {here.writing.length > 0 && (
                  <>
                    <h3>Writing in Transit</h3>
                    <ul>{here.writing.map((p) => <li key={p.id}><Link to={`/post/${p.id}`}>{p.title}</Link></li>)}</ul>
                  </>
                )}
              </>
            ) : (
              <p>{count > 0 ? 'Choose a coloured country to see what I have written about it.' : 'Check back soon.'}</p>
            )}
          </section>
        </>
      )}
    </main>
  )
}
