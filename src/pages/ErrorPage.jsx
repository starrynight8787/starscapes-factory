import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CONTACT_EMAIL } from '../data/contact'
import useTitle from './useTitle'
import './systempages.css'

// Shown when something breaks. It says plainly that it is not the visitor's fault, offers to try again, and (once there is an address) a way to tell us.
// Focus moves to the heading so a screen reader reads it straight away.
export default function ErrorPage({ onRetry }) {
  useTitle('Something went wrong')
  const heading = useRef(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])
  const retry = onRetry || (() => window.location.reload())
  return (
    <main className="sp">
      <p className="sp-eyebrow sp-eyebrow--error">Something went wrong</p>
      <h1 ref={heading} tabIndex={-1}>
        Something went wrong on our side.
      </h1>
      <p className="sp-lead">It is not you. Please try again in a moment. If it keeps happening, tell us and we will sort it out.</p>
      <div className="sp-actions">
        <button type="button" className="sp-btn sp-btn--solid" onClick={retry}>
          Try again
        </button>
        <Link className="sp-btn" to="/">
          Back to the homepage
        </Link>
      </div>
      {CONTACT_EMAIL && (
        <p className="sp-note">
          Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      )}
    </main>
  )
}
