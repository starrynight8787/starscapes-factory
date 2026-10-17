import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Navbar from './components/Navbar'
import SkipLink from './components/SkipLink'
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
import AdminConsole from './admin/AdminConsole'
import OpenDoors from './admin/OpenDoors'
import ArtLoftRoutes from './artloft/ArtLoftRoutes'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import FactoryFloorRoutes from './factoryfloor/FactoryFloorRoutes'
import CartPage from './cart/CartPage'
import CheckoutSuccess from './cart/CheckoutSuccess'
import DraftingDeskRoutes from './draftingdesk/DraftingDeskRoutes'
import RoomRoutes from './rooms/RoomRoutes'
import NotFound from './pages/NotFound'
import PageLoading from './components/PageLoading'
import ErrorBoundary from './components/ErrorBoundary'

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

  if (loading) return <div className="container"><PageLoading /></div>

  return (
    <>
      <SkipLink />
      <Navbar session={session} />
      <div className="container" id="main-content" tabIndex={-1}>
        <ErrorBoundary>
        <Routes>
         <Route path="/" element={<ChannelDirectory />} /> 
<Route path="/blog" element={<Home />} /> 
<Route path="/channel/:slug" element={<ChannelPage />} />
<Route path="/post/:id" element={<PostPage session={session} />} />
<Route path="/page/:slug" element={<StaticPage />} /> 
<Route path="/products" element={<ProductGallery />} /> 
<Route path="/products/:id" element={<ProductPage />} /> 
<Route path="/new-product" element={ <ProtectedRoute session={session}> <NewProduct session={session} /> </ProtectedRoute> } />
<Route path="/admin" element={ <ProtectedRoute session={session}> <AdminConsole session={session} /> </ProtectedRoute> } />
<Route path="/admin/doors" element={ <ProtectedRoute session={session}> <OpenDoors session={session} /> </ProtectedRoute> } />
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
          <Route path="/art-loft/*" element={<ArtLoftRoutes />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/factory-floor/*" element={<FactoryFloorRoutes />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/drafting-desk/*" element={<DraftingDeskRoutes />} />
          <Route path="/idea-hatchery/*" element={<RoomRoutes room="idea-hatchery" />} />
          <Route path="/leadership-lounge/*" element={<RoomRoutes room="leadership-lounge" />} />
          <Route path="/explorers-bay/*" element={<RoomRoutes room="explorers-bay" />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/knowledge-nook/*" element={<RoomRoutes room="knowledge-nook" />} />
          <Route path="/sarah-jrs-den/*" element={<RoomRoutes room="sarah-jrs-den" />} />
        </Routes>
        </ErrorBoundary>
      </div>
<Footer /> 
    </>
  )
}
