import { Link, useParams } from 'react-router-dom'
import { staticPages } from '../data/staticPages'
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

  return (
    <main className="pg pg-text">
      <p className="rp-back">
        <Link to="/">&larr; Back home</Link>
      </p>
      <h1>{page.title}</h1>
      <div className="pg-text__body">{page.content}</div>
    </main>
  )
}
