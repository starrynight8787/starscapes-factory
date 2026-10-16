import { useEffect, useMemo, useState } from 'react'
import HomeLink from '../components/HomeLink'
import { Link } from 'react-router-dom'
import './artloft.css'
import useTitle from './useTitle'
import { fetchPrints, fetchOriginals } from './artLoftApi'
import { originalsIn } from './originals'
import { ART_LOFT, COLLECTIONS, TYPES, SCENE, WALL, PLAQUE_Y, UNDER_CONSTRUCTION, pct, coverFor, printsIn, hangFrames, starPath } from './artLoftData'

// "2 prints", "2 prints and 1 original", or just "1 original" for a collection that holds only originals
const countLabel = (prints, originals = 0) => {
  const p = prints === 1 ? '1 print' : `${prints} prints`
  if (!originals) return p
  const o = originals === 1 ? '1 original' : `${originals} originals`
  return prints ? `${p} and ${o}` : o
}
const r2 = (n) => Math.round(n * 100) / 100

// One hanging frame, drawn to the shape it is given: a wire to a hook, a frame, and a mat for the picture to sit on
function Frame({ slug, frame, tilt }) {
  const [x, y, w, h] = frame
  const m = WALL.mat
  const cx = x + w / 2
  const cy = y + h / 2
  const hook = y - WALL.wire
  return (
    <g data-canvas={slug} transform={`rotate(${tilt} ${r2(cx)} ${r2(cy)})`} fill="none" stroke="#14306A" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${r2(x + 18)} ${r2(y + 2)} L${r2(cx)} ${r2(hook)} L${r2(x + w - 18)} ${r2(y + 2)}`} strokeWidth="4" />
      <circle cx={r2(cx)} cy={r2(hook)} r="7" fill="#14306A" />
      <rect x={x} y={y} width={w} height={h} rx="6" fill="#fff" strokeWidth="9" />
      <rect x={r2(x + m)} y={r2(y + m)} width={r2(w - 2 * m)} height={r2(h - 2 * m)} rx="2" fill="#F6F8FC" strokeWidth="3.5" />
      <path d={starPath(cx, cy)} fill="#14306A" fillOpacity="0.25" stroke="none" />
    </g>
  )
}

export default function ArtLoftScene() {
  useTitle(ART_LOFT.name)
  const [prints, setPrints] = useState([])
  const [originals, setOriginals] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    let alive = true
    // The originals are an extra: if they cannot be loaded, the prints still show
    Promise.all([fetchPrints(), fetchOriginals().catch(() => [])])
      .then(([data, extra]) => {
        if (alive) {
          setPrints(data)
          setOriginals(extra)
          setStatus('ready')
        }
      })
      .catch(() => alive && setStatus('error'))
    return () => {
      alive = false
    }
  }, [])

  // The shape (width divided by height) of each cover picture, once it has loaded. Each frame is drawn to fit its picture.
  const [aspects, setAspects] = useState({})
  const measure = (slug, img) => {
    if (!img || !(img.naturalWidth > 0) || !(img.naturalHeight > 0)) return
    const a = img.naturalWidth / img.naturalHeight
    setAspects((prev) => (Math.abs((prev[slug] || 0) - a) < 0.001 ? prev : { ...prev, [slug]: a }))
  }

  const canvases = useMemo(
    () =>
      COLLECTIONS.map((c) => ({
        ...c,
        count: printsIn(c.name, prints).length,
        originals: originalsIn(c.name, originals).length,
        cover: coverFor(c, prints),
      })),
    [prints, originals]
  )

  const frames = hangFrames(canvases.map((c) => aspects[c.slug]))
  const hung = canvases.map((c, i) => ({ ...c, frame: frames[i] }))

  return (
    <main className="al">
      <HomeLink className="al-home" />
      <header className="al-head">
        <h1>{ART_LOFT.name}</h1>
        <p className="al-tagline">{ART_LOFT.tagline}</p>
        <p className="al-blurb">{ART_LOFT.blurb}</p>
      </header>

      {status === 'error' && <p className="al-note" role="alert">The prints could not load just now. Please try again in a moment.</p>}

      {/* The scene: a drawing, with a real link laid over each object */}
      <div className="al-stage" aria-busy={status === 'loading'}>
        <img className="al-art" src="/scenes/art-loft.svg" alt="" />

        {/* the frames, each drawn to the shape of its picture */}
        <svg className="al-frames" viewBox={`0 0 ${SCENE.width} ${SCENE.height}`} aria-hidden="true" focusable="false">
          {hung.map((c) => (
            <Frame key={c.slug} slug={c.slug} frame={c.frame} tilt={c.tilt} />
          ))}
        </svg>

        {hung.map((c) => {
          const [x, y, w, h] = c.frame
          const m = WALL.mat
          const style = {
            left: pct(x + m, SCENE.width),
            top: pct(y + m, SCENE.height),
            width: pct(w - 2 * m, SCENE.width),
            height: pct(h - 2 * m, SCENE.height),
            '--rot': `${c.tilt}deg`,
          }
          const plaque = {
            left: pct(x + w / 2, SCENE.width),
            top: pct(PLAQUE_Y, SCENE.height),
            maxWidth: pct(Math.min(190, Math.max(150, w)), SCENE.width),
          }
          const open = c.count + c.originals > 0
          return (
            <div key={c.slug} className="al-slot">
              {open ? (
                <Link
                  className="al-spot al-canvas"
                  style={style}
                  to={`/art-loft/collections/${c.slug}`}
                  aria-label={`${c.name}, ${countLabel(c.count, c.originals)}`}
                >
                  {c.cover && (
                    <img
                      key={c.cover}
                      src={c.cover}
                      alt=""
                      onLoad={(e) => measure(c.slug, e.currentTarget)}
                      ref={(el) => el && el.complete && measure(c.slug, el)}
                    />
                  )}
                </Link>
              ) : (
                <div className="al-spot al-canvas is-soon" style={style} tabIndex={0} role="group" aria-label={`${c.name}, coming soon`} />
              )}
              <span className="al-plaque al-plaque--wall" style={plaque}>
                <strong>{c.name}</strong>
                <small>{open ? countLabel(c.count, c.originals) : 'Coming soon'}</small>
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
              {c.count + c.originals > 0 ? (
                <Link to={`/art-loft/collections/${c.slug}`}>
                  <span className="al-list__thumb">{c.cover && <img src={c.cover} alt="" loading="lazy" />}</span>
                  <span>
                    <strong>{c.name}</strong>
                    <small>{countLabel(c.count, c.originals)}</small>
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
