import { Link } from 'react-router-dom'
import Logo from './Logo'
import { channels } from '../data/channels'
import { roomPath } from '../data/roomImages'
import { social as socialLinks } from '../data/social'
import { pageExists, pageIsReady } from '../data/staticPages'
import { companyLine, printerLine } from '../data/company'
import '../styles/site.css'
import './footer.css'

// The footer from the Figma design: the logo and the line under it, four columns (Rooms, Shop and help, Legal, Follow), and the company details.
// A page link shows once that page is ready. The OWNER also sees the pages that are not ready yet, marked "draft", so the whole site can be walked through.
const HELP = [['Art Loft prints', '/art-loft'], ['Cart', '/cart'], ['Delivery and returns', '/page/delivery'], ['Contact', '/page/contact']]
const LEGAL = [['Terms and conditions', '/page/terms'], ['Privacy policy', '/page/privacy'], ['Cookie policy', '/page/cookies'], ['Returns and refunds', '/page/returns'], ['AI policy', '/page/ai-policy'], ['Accessibility', '/page/accessibility']]

// `social` can be passed in (the tests do), and otherwise comes from src/data/social.js
export default function Footer({ social = socialLinks, owner = false }) {
  const follow = social.filter((s) => s.url && s.url.trim())
  const shown = (links) => links.map(([label, to]) => {
    if (!to.startsWith('/page/')) return { label, to, draft: false }
    const slug = to.replace('/page/', '')
    if (pageIsReady(slug)) return { label, to, draft: false }
    return owner && pageExists(slug) ? { label, to, draft: true } : null
  }).filter(Boolean)
  const column = (title, links) => links.length === 0 ? null : (
    <nav className="ft__col" aria-label={title}>
      <h2 className="ft__head">{title}</h2>
      <ul>
        {links.map(({ label, to, draft }) => (
          <li key={to}>
            <Link to={to}>{label}</Link>
            {draft && <span className="ft__draft"> (draft)</span>}
          </li>
        ))}
      </ul>
    </nav>
  )
  return (
    <footer className="sf-footer ft">
      <div className="sf-footer__inner">
        <div className="ft__top">
          <div className="ft__brand">
            <Logo dark />
            <p className="ft__script">You're only limited by your own imagination.</p>
          </div>
          <div className="ft__cols">
            {column('Rooms', channels.map((c) => ({ label: c.name, to: roomPath(c.slug), draft: false })))}
            {column('Shop and help', shown(HELP))}
            {column('Legal', shown(LEGAL))}
            {follow.length > 0 && (
              <nav className="ft__col" aria-label="Follow us">
                <h2 className="ft__head">Follow</h2>
                <ul>
                  {follow.map((s) => (
                    <li key={s.name}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`${s.name} (opens in a new tab)`}>{s.name} ↗</a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </div>
        <hr />
        <div className="ft__company">
          <p>{companyLine()}</p>
          <p>{printerLine()}</p>
        </div>
      </div>
    </footer>
  )
}
