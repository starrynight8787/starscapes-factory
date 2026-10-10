import { Link } from 'react-router-dom'
import Logo from './Logo'
import '../styles/site.css'

const links = [
  ['About', '/page/about'],
  ['Contact', '/page/contact'],
  ['Terms & Conditions', '/page/terms'],
  ['Privacy Policy', '/page/privacy'],
  ['AI Policy', '/page/ai-policy'],
]

export default function Footer() {
  return (
    <footer className="sf-footer">
      <div className="sf-footer__inner">
        <div className="sf-footer__top">
          <Logo dark />
          <div className="sf-footer__links">
            {links.map(([label, to]) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
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
