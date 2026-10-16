import { Link } from 'react-router-dom'
import './homelink.css'

// The small "← Home" link at the top of every room's front page. The arrow is only decoration, so a screen reader just hears "Home".
export default function HomeLink({ className = '' }) {
  return (
    <Link className={`sf-home-link ${className}`.trim()} to="/">
      <span aria-hidden="true">{'\u2190'}</span> Home
    </Link>
  )
}
