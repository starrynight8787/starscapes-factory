import { Link } from 'react-router-dom'
import Logo from './Logo'
import { social as socialLinks } from '../data/social'
import '../styles/site.css'

const links = [
  ['About', '/page/about'],
  ['Contact', '/page/contact'],
  ['Terms & Conditions', '/page/terms'],
  ['Privacy Policy', '/page/privacy'],
  ['AI Policy', '/page/ai-policy'],
]

// `social` can be passed in (the tests do), and otherwise comes from src/data/social.js
export default function Footer({ social = socialLinks }) {
  const follow = social.filter((s) => s.url && s.url.trim())
  return (
    <footer className="sf-footer">
      <div className="sf-footer__inner">
        <div className="sf-footer__top">
          <Logo dark />
          <div>
            <nav className="sf-footer__links" aria-label="Footer">
              {links.map(([label, to]) => (
                <Link key={to} to={to}>
                  {label}
                </Link>
              ))}
            </nav>
            {follow.length > 0 && (
              <nav className="sf-footer__follow" aria-label="Follow us">
                <span className="sf-footer__follow-label">Follow</span>
                {follow.map((s) => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${s.name} (opens in a new tab)`}
                  >
                    {s.name} ↗
                  </a>
                ))}
              </nav>
            )}
          </div>
        </div>
        <hr />
        <div className="sf-footer__bottom">
          <span className="sf-footer__copy">© {new Date().getFullYear()} Starscapes Factory</span>
          <span className="sf-footer__script">You're only limited by your own imagination.</span>
        </div>
      </div>
    </footer>
  )
}
