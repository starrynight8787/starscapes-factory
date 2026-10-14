import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './artloft.css'
import useTitle from './useTitle'
import { fetchPrints } from './artLoftApi'
import { ART_LOFT, COLLECTIONS, TYPES, SCENE, UNDER_CONSTRUCTION, pct, coverFor, printsIn } from './artLoftData'

const countLabel = (n) => (n === 1 ? '1 print' : `${n} prints`)

export default function ArtLoftScene() {
  useTitle(ART_LOFT.name)
  const [prints, setPrints] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    let alive = true
    fetchPrints()
      .then((data) => {
        if (alive) {
          setPrints(data)
          setStatus('ready')
        }
      })
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [])

  const canvases = useMemo(
    () =>
      COLLECTIONS.map((c) => ({
        ...c,
        count: printsIn(c.name, prints).length,
        cover: coverFor(c, prints),
      })),
    [prints]
  )

  return (
    <main className="al">
      <header className="al-head">
        <h1>{ART_LOFT.name}</h1>
        <p className="al-tagline">{ART_LOFT.tagline}</p>
        <p className="al-blurb">{ART_LOFT.blurb}</p>
      </header>

      {status === 'error' && <p className="al-note" role="alert">The prints could not load just now. Please try again in a moment.</p>}

      {/* The scene: a drawing, with a real link laid over each object */}
      <div className="al-stage" aria-busy={status === 'loading'}>
        <img className="al-art" src="/scenes/art-loft.svg" alt="" />

        {canvases.map((c) => {
          const [x, y, w, h, rot] = c.frame
          const style = {
            left: pct(x + 14, SCENE.width),
            top: pct(y + 14, SCENE.height),
            width: pct(w - 28, SCENE.width),
            height: pct(h - 28, SCENE.height),
            '--rot': `${rot}deg`,
          }
          const plaque = {
            left: pct(x, SCENE.width),
            top: pct(y + h + 18, SCENE.height),
            maxWidth: pct(Math.max(w, 170), SCENE.width),
          }
          const open = c.count > 0
          return (
            <div key={c.slug} className="al-slot">
              {open ? (
                <Link
                  className="al-spot al-canvas"
                  style={style}
                  to={`/art-loft/collections/${c.slug}`}
                  aria-label={`${c.name}, ${countLabel(c.count)}`}
                >
                  {c.cover && <img src={c.cover} alt="" loading="lazy" />}
                </Link>
              ) : (
                <div className="al-spot al-canvas is-soon" style={style} tabIndex={0} role="group" aria-label={`${c.name}, coming soon`} />
              )}
              <span className="al-plaque" style={plaque}>
                <strong>{c.name}</strong>
                <small>{open ? countLabel(c.count) : 'Coming soon'}</small>
              </span>
            </div>
          )
        })}

        {TYPES.map((t) => {
          const [x, y, w, h] = t.box
          const style = { left: pct(x, SCENE.width), top: pct(y, SCENE.height), width: pct(w, SCENE.width), height: pct(h, SCENE.height) }
          const name = { left: pct(x + w / 2, SCENE.width), top: pct(742, SCENE.height) }
          const tip = (
            <span className="al-tip">
              <strong>{t.name}</strong>
              <small>{t.blurb}</small>
            </span>
          )
          let thing
          if (t.kind === 'soon') {
            thing = (
              <div className="al-spot al-object is-soon" style={style} tabIndex={0} role="group" aria-label={`${t.name}, ${UNDER_CONSTRUCTION.toLowerCase()}`}>
                <span className="al-sign">{UNDER_CONSTRUCTION}</span>
              </div>
            )
          } else if (t.kind === 'external') {
            thing = (
              <a className="al-spot al-object" style={style} href={t.href} target="_blank" rel="noopener noreferrer" aria-label={`${t.name} (opens in a new tab)`}>
                {tip}
              </a>
            )
          } else {
            thing = (
              <Link className="al-spot al-object" style={style} to={t.to} aria-label={t.name}>
                {tip}
              </Link>
            )
          }
          return (
            <div key={t.id} className="al-slot">
              {thing}
              <span className={`al-plaque al-plaque--floor${t.kind === 'soon' ? ' is-soon' : ''}`} style={name}>
                <strong>{t.name}</strong>
                <small>{t.sub}</small>
              </span>
            </div>
          )
        })}
      </div>

      {/* The same doors as a plain list: this is what phones see, and it is always there for screen readers */}
      <div className="al-list" role="navigation" aria-label="Ways to browse the Art Loft">
        <h2>Browse by collection</h2>
        <ul>
          {canvases.map((c) => (
            <li key={c.slug}>
              {c.count > 0 ? (
                <Link to={`/art-loft/collections/${c.slug}`}>
                  <span className="al-list__thumb">{c.cover && <img src={c.cover} alt="" loading="lazy" />}</span>
                  <span>
                    <strong>{c.name}</strong>
                    <small>{countLabel(c.count)}</small>
                  </span>
                </Link>
              ) : (
                <span className="is-soon">
                  <span className="al-list__thumb" />
                  <span>
                    <strong>{c.name}</strong>
                    <small>Coming soon</small>
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
        <h2>Browse by type</h2>
        <ul>
          {TYPES.map((t) => (
            <li key={t.id}>
              {t.kind === 'link' && (
                <Link to={t.to}>
                  <span>
                    <strong>{t.name}</strong>
                    <small>{t.blurb}</small>
                  </span>
                </Link>
              )}
              {t.kind === 'external' && (
                <a href={t.href} target="_blank" rel="noopener noreferrer">
                  <span>
                    <strong>{t.name} (opens in a new tab)</strong>
                    <small>{t.blurb}</small>
                  </span>
                </a>
              )}
              {t.kind === 'soon' && (
                <span className="is-soon">
                  <span>
                    <strong>{t.name}</strong>
                    <small>{UNDER_CONSTRUCTION}</small>
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
