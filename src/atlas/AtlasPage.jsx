import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useTitle from '../pages/useTitle'
import PageBanner from '../components/PageBanner'
import PageLoading from '../components/PageLoading'
import AccountTabs from './AccountTabs'
import GalaxyArt from './GalaxyArt'
import Planet from './Planet'
import { fetchMyAtlas, claimStarterStamp, saveCountry } from './atlasApi'
import { ATLAS_ROOMS, STARTER_STAMPS, WORDS, allStarterEarned, countryOptions, galaxyPercent, litStars, stampsLine } from './atlasRules'
import '../membership/membership.css'
import './atlas.css'

// "Star Atlas" (at /membership/atlas): the second tab on the account page, beside My passes. Figma: Star Atlas, Style 1, A1 Atlas home (desktop and phone) and A4 Free account.
// Foundations only: the galaxy bar, the eight room planets, the three starter stamps and the country picker. Spending stardust, the monthly check-in, constellations, badges and the taste week come later.
// Everything shown comes from get_my_atlas(). A signed-in person sees only their own; nothing here reads a name, an email or a reading list.

function Stars({ count, total }) {
  const lit = litStars(count, total)
  return (
    <span className="at__stars" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < lit ? 'at__star is-lit' : 'at__star'}>
          {i < lit ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}

function RoomCard({ room, count }) {
  return (
    <li className="at__room" style={{ '--room': room.colour }}>
      <span className="at__roomhead">
        <Planet colour={room.colour} count={count} total={room.total} />
        <span className="at__roomname">{room.name}</span>
      </span>
      <Stars count={count} total={room.total} />
      <span className="at__roomline">{stampsLine(count, room.total)}</span>
    </li>
  )
}

function StarterStrip({ starter }) {
  return (
    <section className="at__starter" aria-label="Your starter stamps">
      <ul className="at__starterlist">
        {STARTER_STAMPS.map((s) => {
          const earned = starter.includes(s.key)
          return (
            <li key={s.key} className={earned ? 'at__st is-earned' : 'at__st'}>
              <span className="at__stamp" style={{ color: earned ? s.colour : '#8791bd' }} aria-hidden="true">{earned ? '★' : '☆'}</span>
              <span className="at__sttext">
                <span className="at__stname">{s.label}</span>
                <span className="at__stnote">{earned ? 'Earned' : 'Not yet'}</span>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="at__stline">3 starter stamps, free for every account</p>
    </section>
  )
}

// "Where are you from?": saves a country code and earns the First country stamp.
function CountryPicker({ onSaved }) {
  const options = useMemo(() => countryOptions(), [])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  async function save(e) {
    e.preventDefault()
    if (!code) {
      setProblem('Please choose a country from the list.')
      return
    }
    setBusy(true)
    setProblem('')
    try {
      await saveCountry(code)
      await onSaved()
    } catch (err) {
      setProblem(err.message)
      setBusy(false)
    }
  }

  return (
    <form className="at__card at__country" onSubmit={save}>
      <h2 className="at__h3" id="at-country-title">Where are you from?</h2>
      <p className="at__small">Choose a country to earn your First country stamp. We keep only the country, never an address.</p>
      <div className="at__row">
        <label className="at__label" htmlFor="at-country">Country</label>
        <select id="at-country" className="at__select" value={code} onChange={(e) => { setCode(e.target.value); setProblem('') }} aria-describedby={problem ? 'at-country-problem' : undefined}>
          <option value="">Choose a country</option>
          {options.map((o) => (
            <option key={o.code} value={o.code}>{o.name}</option>
          ))}
        </select>
        <button type="submit" className="at__btn" disabled={busy}>{busy ? 'Saving…' : 'Save my country'}</button>
      </div>
      {problem && <p id="at-country-problem" className="at__problem" role="alert">{problem}</p>}
    </form>
  )
}

export default function AtlasPage() {
  const [state, setState] = useState({ phase: 'loading', atlas: null })
  useTitle('Star Atlas')

  // Loads the atlas. On the first visit it earns the Joined stamp (and the First country stamp if a country was saved but the stamp did not land), then loads again.
  const load = useCallback(async (isStopped = () => false) => {
    try {
      let atlas = await fetchMyAtlas()
      const needJoined = !atlas.starter.includes('joined')
      const needCountry = atlas.hasCountry && !atlas.starter.includes('first-country')
      if (needJoined || needCountry) {
        if (needJoined) await claimStarterStamp('joined')
        if (needCountry) await claimStarterStamp('first-country')
        atlas = await fetchMyAtlas()
      }
      if (!isStopped()) setState({ phase: 'ready', atlas })
    } catch (e) {
      if (!isStopped()) setState({ phase: 'error', atlas: null })
    }
  }, [])

  useEffect(() => {
    let stopped = false
    load(() => stopped)
    return () => {
      stopped = true
    }
  }, [load])

  const atlas = state.atlas
  const free = atlas ? !atlas.isPaid : false

  return (
    <main className="mb mb--account at">
      <PageBanner art="plain" room="factory-floor" chip="Your account" title="My account" subtitle={atlas ? (free ? WORDS.freeIntro : WORDS.paidIntro) : WORDS.paidIntro} />
      <div className="at__wrap">
        <AccountTabs />
        {state.phase === 'loading' && <PageLoading label="Finding your stars…" />}
        {state.phase === 'error' && (
          <section className="at__card" role="alert">
            <h2 className="at__h3">We could not load your Star Atlas</h2>
            <p className="at__small">Please try again in a moment.</p>
            <button type="button" className="at__btn" onClick={() => { setState({ phase: 'loading', atlas: null }); load() }}>Try again</button>
          </section>
        )}
        {state.phase === 'ready' && (
          <>
            <section className="at__card at__galaxycard" aria-label="Your galaxy">
              <div className="at__art">
                <GalaxyArt percent={galaxyPercent(atlas.earned, atlas.needed)} ghost={free} />
              </div>
              <div className="at__galaxytext">
                <p className="at__kicker">{`${atlas.year} · Your galaxy`}</p>
                <h2 className="at__galaxyname">{atlas.galaxy}</h2>
                <div className="at__bar" role="progressbar" aria-label="Stardust earned this year" aria-valuemin={0} aria-valuemax={atlas.needed} aria-valuenow={Math.min(atlas.earned, atlas.needed)}>
                  <span className="at__barfill" style={{ width: `${galaxyPercent(atlas.earned, atlas.needed)}%` }} />
                </div>
                <p className="at__small at__earned">{`${atlas.earned} of ${atlas.needed} stardust earned this year`}</p>
                {free ? (
                  <>
                    <p className="at__small">{WORDS.freeGalaxyLine}</p>
                    <div className="at__pitch">
                      <p>{WORDS.freeBox}</p>
                      <Link className="at__btn" to="/membership">See passes</Link>
                    </div>
                  </>
                ) : (
                  <p className="at__small">Spending stardust never lowers your galaxy or your stars.</p>
                )}
              </div>
            </section>

            <h2 className="at__h2">Stamps by room</h2>
            <p className="at__small at__intro">Each room has its own colour. Light all of a room&rsquo;s stamps to light its planet.</p>
            {(free || !allStarterEarned(atlas.starter)) && <StarterStrip starter={atlas.starter} />}
            {!atlas.hasCountry && <CountryPicker onSaved={() => load()} />}
            <ul className="at__rooms">
              {ATLAS_ROOMS.map((room) => (
                <RoomCard key={room.room} room={room} count={atlas.rooms[room.room]} />
              ))}
            </ul>

            <div className="at__pair">
              <section className="at__card at__tile" aria-labelledby="at-badges-title">
                <h2 className="at__h3" id="at-badges-title">Constellations earned</h2>
                <p className="at__small">{free ? WORDS.badgesFree : WORDS.badgesPaid}</p>
              </section>
              <section className="at__card at__tile" aria-labelledby="at-galaxies-title">
                <h2 className="at__h3" id="at-galaxies-title">Galaxies by year</h2>
                <p className="at__small">{WORDS.galaxiesNote(atlas.year)}</p>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
