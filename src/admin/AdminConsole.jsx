import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import useTitle from '../pages/useTitle'
import { useOwnerCheck } from './useIsOwner'
import { ADMIN_GROUPS, ADMIN_TOOLS } from './adminTools'
import AdminBanner from './AdminBanner'
import './admin.css'
import './adminv2.css'

// Small line icons for the tool tiles. They are decoration, so they are hidden from screen readers.
const ICON_PATHS = {
  post: <><path d="M4 20h4l11-11-4-4L4 16z" /><path d="M13 7l4 4" /></>,
  newsletter: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  product: <><path d="M5 8h14l-1 12H6z" /><path d="M9 8a3 3 0 0 1 6 0" /></>,
  hub: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>,
  originals: <><rect x="4" y="4" width="16" height="13" rx="1.5" /><path d="M6 20l3-3M18 20l-3-3M4 14l4-4 4 4 3-3 5 5" /></>,
  comments: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
  passes: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  promo: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.2" /></>,
  door: <><path d="M6 21V4h12v17M4 21h16" /><circle cx="15" cy="13" r=".8" /></>,
  home: <><path d="M3 11l9-8 9 8M5 10v10h14V10" /></>,
  books: <><path d="M5 4h5a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5zM19 4h-5a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h5z" /></>,
  posts: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  stories: <><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" /><path d="M8 8h6" /></>,
  ideas: <><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" /></>,
}
function ToolIcon({ name }) {
  return (
    <span className="ad-tool__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICON_PATHS[name] || ICON_PATHS.post}</svg>
    </span>
  )
}

// Two columns, so every tool shows at once on a laptop screen without scrolling: Write, Shop and Members on the left, Rooms on the right.
const COLUMNS = [['Write', 'Shop', 'Members'], ['Rooms']]

// The owner's admin console, at /admin: one place that holds every private tool. Anyone else who finds the address is told it is for the owner.
export default function AdminConsole({ session }) {
  useTitle('Admin')
  const { checking, owner } = useOwnerCheck(session)

  if (checking) return <PageLoading label="Checking who you are…" />

  if (!owner) {
    return (
      <main className="ad">
        <h1>Admin</h1>
        <p className="ad-note">This area is for the site owner.</p>
        <p>
          <Link to="/">Back to the homepage</Link>
        </p>
      </main>
    )
  }

  const groups = ADMIN_GROUPS.filter((g) => ADMIN_TOOLS.some((t) => t.group === g))
  const columns = COLUMNS.map((col) => col.filter((g) => groups.includes(g)))
  // Any group not placed above still shows, at the end of the last column.
  const placed = columns.flat()
  groups.filter((g) => !placed.includes(g)).forEach((g) => columns[columns.length - 1].push(g))

  return (
    <main className="ad ad--wide">
      <AdminBanner chip="Owner only" title="Admin" subtitle="Every private tool in one place. Only you can see this page." icon="console" back={false} />
      <div className="ad-cols">
        {columns.map((col, i) => (
          <div className="ad-col" key={i}>
            {col.map((group) => {
              const tools = ADMIN_TOOLS.filter((t) => t.group === group)
              return (
                <section key={group} className="ad-group" aria-labelledby={`ad-${group}`}>
                  <h2 id={`ad-${group}`}>{group}</h2>
                  <ul className="ad-tools">
                    {tools.map((tool) => (
                      <li key={tool.name}>
                        {tool.to ? (
                          <Link className="ad-tool" to={tool.to}>
                            <ToolIcon name={tool.icon} />
                            <span className="ad-tool__body">
                              <span className="ad-tool__name">{tool.name}</span>
                              <span className="ad-tool__blurb">{tool.blurb}</span>
                            </span>
                          </Link>
                        ) : (
                          <div className="ad-tool ad-tool--soon">
                            <ToolIcon name={tool.icon} />
                            <span className="ad-tool__body">
                              <span className="ad-tool__name">{tool.name}</span>
                              <span className="ad-tool__blurb">{tool.blurb}</span>
                              <span className="ad-tool__soon">Coming soon</span>
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        ))}
      </div>
    </main>
  )
}
