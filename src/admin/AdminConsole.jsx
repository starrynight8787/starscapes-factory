import { Link } from 'react-router-dom'
import PageLoading from '../components/PageLoading'
import useTitle from '../pages/useTitle'
import { useOwnerCheck } from './useIsOwner'
import { ADMIN_GROUPS, ADMIN_TOOLS } from './adminTools'
import './admin.css'

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

  return (
    <main className="ad">
      <h1>Admin</h1>
      <p className="ad-note">Every private tool in one place. Only you can see this page.</p>
      {ADMIN_GROUPS.map((group) => {
        const tools = ADMIN_TOOLS.filter((t) => t.group === group)
        if (tools.length === 0) return null
        return (
          <section key={group} className="ad-group" aria-labelledby={`ad-${group}`}>
            <h2 id={`ad-${group}`}>{group}</h2>
            <ul className="ad-tools">
              {tools.map((tool) => (
                <li key={tool.name}>
                  {tool.to ? (
                    <Link className="ad-tool" to={tool.to}>
                      <span className="ad-tool__name">{tool.name}</span>
                      <span className="ad-tool__blurb">{tool.blurb}</span>
                    </Link>
                  ) : (
                    <div className="ad-tool ad-tool--soon">
                      <span className="ad-tool__name">{tool.name}</span>
                      <span className="ad-tool__blurb">{tool.blurb}</span>
                      <span className="ad-tool__soon">Coming soon</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </main>
  )
}
