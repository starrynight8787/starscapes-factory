import { Link, useParams } from 'react-router-dom'
import { accessibilityGaps, resolvePage } from '../data/staticPages'
import { ACCESSIBILITY_STATEMENT } from '../data/accessibilityStatement'
import { CONTACT_EMAIL } from '../data/contact'
import LegalPage from './LegalPage'
import AccessibilityStatement from './AccessibilityStatement'
import { countGaps, renderMarkdown } from './simpleMarkdown'
import '../rooms/roompages.css'
import '../styles/pages.css'
import './staticpage.css'

// A page at /page/<name>: a text page, a legal page (with its contents list and numbered sections), or the accessibility statement.
// A page whose real words are not written yet (ready is not true) is never shown to a visitor: no placeholder text reaches anyone else. The OWNER, signed in, sees it
// under a "draft" banner that says how many gaps in [square brackets] are left, so the whole site can be walked through.
const GAP_WORDS = { lastReviewed: '[date]', notYetRight: '[To be filled in after testing.]', complaint: '[To be confirmed: where a person can take a complaint further.]' }

function DraftBanner({ gaps }) {
  return (
    <div className="txp__draftwrap">
      <div className="txp__draft" role="note">
        <strong>Draft: only you can see this page.</strong>{' '}
        {gaps > 0 ? `${gaps} ${gaps === 1 ? 'gap' : 'gaps'} in [square brackets] still to fill. ` : 'No gaps are left in [square brackets]. '}
        Visitors see &ldquo;not ready yet&rdquo; until you switch it on.
      </div>
    </div>
  )
}

export default function StaticPage({ owner = false }) {
  const { slug } = useParams()
  const page = resolvePage(slug)
  const back = <p className="rp-back"><Link to="/">&larr; Back home</Link></p>

  if (!page) return <main className="pg pg-text">{back}<h1>Page not found</h1></main>

  if (!page.ready && !owner) {
    return (
      <main className="pg pg-text">
        {back}
        <h1>{page.title}</h1>
        <p>This page is not ready yet. Please check back soon.</p>
      </main>
    )
  }

  if (page.kind === 'legal') {
    const l = page.legal
    const gaps = page.ready ? 0 : countGaps([l.updated, ...l.sections.flatMap((s) => [s.title, ...s.paragraphs])].join('\n\n'))
    return <>{!page.ready && <DraftBanner gaps={gaps} />}<LegalPage page={l} /></>
  }

  if (page.kind === 'accessibility') {
    const gaps = page.ready ? 0 : accessibilityGaps().length
    const statement = page.ready ? ACCESSIBILITY_STATEMENT : Object.fromEntries(Object.entries(GAP_WORDS).map(([k, v]) => [k, ACCESSIBILITY_STATEMENT[k] || v]))
    return <>{!page.ready && <DraftBanner gaps={gaps} />}<AccessibilityStatement statement={statement} /></>
  }

  const t = page.text
  const { nodes } = renderMarkdown(t.content)
  const gaps = page.ready ? 0 : countGaps(t.content)
  return (
    <main className="pg pg-text txp">
      {back}
      {!page.ready && <DraftBanner gaps={gaps} />}
      <h1>{t.title}</h1>
      <div className="txp__body">{nodes}</div>
      {t.showEmail && CONTACT_EMAIL && (
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      )}
    </main>
  )
}
