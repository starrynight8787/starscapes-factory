import { NavLink } from 'react-router-dom'
import './atlas.css'

// The two tabs under the "My account" heading: My passes (/membership/passes) and Star Atlas (/membership/atlas). Figma: Star Atlas A1, the two pills under the title.
export default function AccountTabs() {
  return (
    <nav className="at__tabs" aria-label="My account">
      <NavLink to="/membership/passes" end className={({ isActive }) => `at__tab${isActive ? ' is-on' : ''}`}>
        My passes
      </NavLink>
      <NavLink to="/membership/atlas" end className={({ isActive }) => `at__tab${isActive ? ' is-on' : ''}`}>
        <span aria-hidden="true">★ </span>Star Atlas
      </NavLink>
    </nav>
  )
}
