import { Link, useParams } from 'react-router-dom'
import { staticPages } from '../data/staticPages'

export default function StaticPage() {
  const { slug } = useParams()
  const page = staticPages.find((p) => p.slug === slug)

  if (!page) {
    return (
      <div>
        <p>
          <Link to="/">&larr; Back home</Link>
        </p>
        <p>Page not found.</p>
      </div>
    )
  }

  return (
    <div>
      <p>
        <Link to="/">&larr; Back home</Link>
      </p>
      <h1>{page.title}</h1>
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, maxWidth: 640 }}>
        {page.content}
      </div>
    </div>
  )
}