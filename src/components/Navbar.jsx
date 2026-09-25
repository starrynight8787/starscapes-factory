import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Navbar({ session }) {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <nav>
      <div>
        <Link to="/">Home</Link>
<Link to="/blog">Blog</Link>
<Link to="/page/about">About</Link>
        {session && <Link to="/new">New Post</Link>}
      </div>
      <div>
        {session ? (
          <>
            <span className="muted" style={{ marginRight: 12 }}>
              {session.user.email}
            </span>
            <button onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/signup">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  )
}
