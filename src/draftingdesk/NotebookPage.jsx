import { Link } from 'react-router-dom'
import './draftingdesk.css'
import PageBanner from '../components/PageBanner'
import useTitle from './useTitle'
import { AREAS } from './draftingData'

// The Author's Notebook is for paid members. Paid memberships are not built yet, so this page says so, and shows nothing from the Notebook:
// its entries are never listed here until there is a way to check who has paid.
export default function NotebookPage() {
  const info = AREAS['authors-notebook']
  useTitle(info.name)
  return (
    <main className="dd">
      <p className="dd-back"><Link to="/drafting-desk">← Back to the Drafting Desk</Link></p>
      <PageBanner chip="Pass holders" title={info.name} subtitle={info.blurb} art="notebook" />
      <section className="dd-locked" aria-label="Members only">
        <svg className="dd-locked__icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <g fill="none" stroke="#14306A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="12" y="28" width="40" height="30" rx="5" fill="#fff" />
            <path d="M20 28 V20 a12 12 0 0 1 24 0 V28" />
            <circle cx="32" cy="43" r="4" fill="#14306A" stroke="none" />
          </g>
        </svg>
        <h2>Paid members only</h2>
        <p>The Author's Notebook is for paid members. Paid memberships are on their way. Check back soon.</p>
      </section>
    </main>
  )
}
