import { useState } from 'react'
import { Link } from 'react-router-dom'
import useTitle from '../rooms/useTitle'
import PageBanner from '../components/PageBanner'
import NebulaBox from '../entries/NebulaBox'
import { UDEMY_URL, AUDIOBOOK_URL } from '../rooms/roomsData'
import { INTRO, QUOTE, PHOTO, COURSE_WEEKS, OUTCOMES, CIRCLE_CENTRE, CIRCLE } from './leadingMiddleData'
import '../rooms/roompages.css'
import '../styles/pages.css'
import '../styles/forms.css'
import './leadingmiddle.css'

// The page that explains Leading from the Middle (at /leadership-lounge/leading-from-the-middle). Its words are in leadingMiddleData.js.
// The picture of people helping each other up the mountain is part of the brand, and the five ideas in the diagram are drawn here as text
// (not as a picture) so they stay sharp, work with a screen reader and fit a phone.

// The circle of five ideas: each sits on an oval and a two-headed arrow joins it to the next one.
const W = 780, H = 460, CX = 390, CY = 230, RX = 300, RY = 168, PAD = 25
const at = (deg) => [CX + RX * Math.sin((deg * Math.PI) / 180), CY - RY * Math.cos((deg * Math.PI) / 180)]
const arc = (a, b) => {
  const [x1, y1] = at(a + PAD)
  const [x2, y2] = at(b - PAD)
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${RX} ${RY} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

function Circle() {
  const names = CIRCLE.map((c) => c.label).join(', ')
  return (
    <>
      <svg className="lm__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${CIRCLE_CENTRE} is made of five ideas that each connect to the next: ${names}.`}>
        <defs>
          <marker id="lm-head" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M1 1L8 5L1 9" fill="none" stroke="#14306a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        {CIRCLE.map((c, i) => <path key={c.label} d={arc(i * 72, (i + 1) * 72)} fill="none" stroke="#14306a" strokeWidth="2.2" markerStart="url(#lm-head)" markerEnd="url(#lm-head)" />)}
        <text x={CX} y={CY - 8} textAnchor="middle" className="lm__centre">{CIRCLE_CENTRE.split(' ').slice(0, 2).join(' ')}</text>
        <text x={CX} y={CY + 24} textAnchor="middle" className="lm__centre">{CIRCLE_CENTRE.split(' ').slice(2).join(' ')}</text>
        {CIRCLE.map((c, i) => {
          const [x, y] = at(i * 72)
          const w = Math.max(150, c.label.length * 12 + 36)
          return (
            <g key={c.label}>
              <rect x={x - w / 2} y={y - 22} width={w} height={44} rx={22} fill="#fff" stroke="#14306a" strokeWidth="2.2" />
              <text x={x} y={y + 6} textAnchor="middle" className="lm__node">{c.label}</text>
            </g>
          )
        })}
      </svg>
      <div className="lm__chain" aria-hidden="true">
        <p className="lm__chainhead">{CIRCLE_CENTRE}</p>
        {CIRCLE.map((c) => <p key={c.label} className="lm__chainitem">{c.label}</p>)}
        <p className="lm__chainnote">Each one feeds the next, and the last feeds the first.</p>
      </div>
    </>
  )
}

export default function LeadingFromTheMiddlePage() {
  useTitle('Leading from the Middle')
  const [photoOk, setPhotoOk] = useState(true)
  return (
    <main className="rp lm">
      <p className="rp-back"><Link to="/leadership-lounge">← Back to Leadership Lounge</Link></p>
      <PageBanner chip="Leadership Lounge" title="Leading from the Middle" subtitle="The idea behind everything in this room." art="mountain" room="leadership-lounge" />

      <section className="lm__intro" aria-label="Introduction">
        <p className="lm__big">{INTRO.big}</p>
        <p className="lm__rest">{INTRO.rest}</p>
      </section>

      <section className="lm__hero" aria-label="The idea in one line">
        {photoOk && (
          <figure className="lm__photo">
            <img src={PHOTO.src} alt={PHOTO.alt} width="750" height="497" loading="eager" onError={() => setPhotoOk(false)} />
          </figure>
        )}
        <blockquote className="lm__quote">
          <p>{'\u201C'}{QUOTE}{'\u201D'}</p>
        </blockquote>
      </section>

      <section className="lm__block" aria-labelledby="lm-circle-title">
        <h2 id="lm-circle-title" className="lm__h">How it fits together</h2>
        <p className="lm__lead">Five ideas sit at the heart of leading from the middle. Each one connects to the next.</p>
        <div className="lm__figure"><Circle /></div>
      </section>

      <section className="lm__block" aria-labelledby="lm-course-title">
        <p className="lm__weeks"><span className="pg-chip">Course duration: {COURSE_WEEKS} weeks</span></p>
        <h2 id="lm-course-title" className="lm__h">What you will learn</h2>
        <ol className="lm__outcomes">
          {OUTCOMES.map((o, i) => (
            <li key={o.title} className="lm__card">
              <p className="lm__num">Learning outcome {i + 1}</p>
              <h3 className="lm__title">{o.title}</h3>
              <p className="lm__text">{o.text}</p>
            </li>
          ))}
        </ol>
        <p className="lm__ways">
          <a className="pg-btn fm-btn--primary" href={UDEMY_URL} target="_blank" rel="noopener noreferrer">Take the course on Udemy</a>
          <a className="pg-btn" href={AUDIOBOOK_URL} target="_blank" rel="noopener noreferrer">Listen on Everand</a>
        </p>
      </section>

      <div className="lm__nebula"><NebulaBox /></div>
    </main>
  )
}
