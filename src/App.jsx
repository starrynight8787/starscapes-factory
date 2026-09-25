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
import EditPost from './pages/EditPost'
import ChannelDirectory from './pages/ChannelDirectory'
import ChannelPage from './pages/ChannelPage'
import StaticPage from './pages/StaticPage'
import Footer from './components/Footer'
import ProductGallery from './pages/ProductGallery'
import ProductPage from './pages/ProductPage'
import NewProduct from './pages/NewProduct'

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
         <Route path="/" element={<ChannelDirectory />} /> 
<Route path="/blog" element={<Home />} /> 
<Route path="/channel/:slug" element={<ChannelPage />} />
<Route path="/page/:slug" element={<StaticPage />} /> 
<Route path="/products" element={<ProductGallery />} /> 
<Route path="/products/:id" element={<ProductPage />} /> 
<Route path="/new-product" element={ <ProtectedRoute session={session}> <NewProduct session={session} /> </ProtectedRoute> } />
          <Route
            path="/new"
            element={
              <ProtectedRoute session={session}>
                <NewPost session={session} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit/:id"
            element={
              <ProtectedRoute session={session}>
                <EditPost session={session} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
<Footer /> 
    </>
  )
}
