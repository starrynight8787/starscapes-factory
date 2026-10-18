import { Link, useParams } from 'react-router-dom'
import { staticPages } from '../data/staticPages'
import { CONTACT_EMAIL } from '../data/contact'
import '../rooms/roompages.css'
import '../styles/pages.css'

export default function StaticPage() {
  const { slug } = useParams()
  const page = staticPages.find((p) => p.slug === slug)

  if (!page) {
    return (
      <main className="pg pg-text">
        <p className="rp-back">
          <Link to="/">&larr; Back home</Link>
        </p>
        <h1>Page not found</h1>
      </main>
    )
  }

  // A page whose real words are not written yet is never shown: no placeholder text reaches a visitor
  if (page.ready !== true) {
    return (
      <main className="pg pg-text">
        <p className="rp-back">
          <Link to="/">&larr; Back home</Link>
        </p>
        <h1>{page.title}</h1>
        <p>This page is not ready yet. Please check back soon.</p>
      </main>
    )
  }

  return (
    <main className="pg pg-text">
      <p className="rp-back">
        <Link to="/">&larr; Back home</Link>
      </p>
      <h1>{page.title}</h1>
      <div className="pg-text__body">{page.content}</div>
      {page.showEmail && CONTACT_EMAIL && (
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      )}
    </main>
  )
}
