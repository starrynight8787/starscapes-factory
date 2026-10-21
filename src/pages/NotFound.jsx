import { Link } from 'react-router-dom'
import { channels } from '../data/channels'
import { roomPath } from '../data/roomImages'
import RoomIcon from '../components/RoomIcon'
import PageBanner from '../components/PageBanner'
import useTitle from './useTitle'
import './systempages.css'

// Shown for any address the site does not have. It points the visitor home, or into any of the rooms.
export default function NotFound() {
  useTitle('Page not found')
  return (
    <main className="sp">
      <PageBanner art="plain" room="explorers-bay" chip="404" title="That room isn't on the plan." />
      <div className="sp-boat"><RoomIcon room="explorers-bay" size={96} /></div>
      <p className="sp-lead">We can't find that page. It may have moved, or the address may have a typo.</p>
      <div className="sp-actions">
        <Link className="sp-btn sp-btn--solid" to="/">
          Back to the homepage
        </Link>
      </div>
      <p className="sp-or">Or walk into a room:</p>
      <ul className="sp-rooms">
        {channels.map((c) => (
          <li key={c.slug}>
            <Link to={roomPath(c.slug)}>
              <RoomIcon room={c.slug} size={48} />
              <span>{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
