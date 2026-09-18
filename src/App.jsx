import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import PostPage from './pages/PostPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import NewPost from './pages/NewPost'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return <div className="container">Loading...</div>

  return (
    <>
      <Navbar session={session} />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/post/:id" element={<PostPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/new"
            element={
              <ProtectedRoute session={session}>
                <NewPost session={session} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </>
  )
}
